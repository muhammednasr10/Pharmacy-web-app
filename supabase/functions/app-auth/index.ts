import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as jose from "npm:jose@5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOKEN_TTL = "7d";

async function signAccessToken(uid: string): Promise<string> {
  const secret = Deno.env.get("SUPABASE_JWT_SECRET");
  if (!secret) {
    throw new Error("jwt_secret_missing");
  }
  const key = new TextEncoder().encode(secret);
  return await new jose.SignJWT({ role: "authenticated" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(uid)
    .setAudience("authenticated")
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(key);
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.pathname.split("/").filter(Boolean).pop() || "login";

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    if (action === "login" && req.method === "POST") {
      const { email, password } = await req.json();
      if (!email || !password) {
        return jsonResponse({ error: "invalid_credentials" }, 400);
      }

      const { data, error } = await supabaseAdmin.rpc("verify_app_login", {
        p_email: String(email),
        p_password: String(password),
      });

      if (error) {
        const msg = error.message.includes("invalid_credentials")
          ? "invalid_credentials"
          : error.message.includes("user_inactive")
            ? "user_inactive"
            : error.message;
        return jsonResponse({ error: msg }, 401);
      }

      const user = data as Record<string, unknown>;
      const uid = String(user.uid || "");
      if (!uid) {
        return jsonResponse({ error: "invalid_credentials" }, 401);
      }

      const access_token = await signAccessToken(uid);
      return jsonResponse({ access_token, user });
    }

    return jsonResponse({ error: "not_found" }, 404);
  } catch (error) {
    console.error(error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "server_error" },
      500,
    );
  }
});
