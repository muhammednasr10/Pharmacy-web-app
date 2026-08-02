import { createClient } from "@supabase/supabase-js";
import { getAppAccessToken } from "./appAuthSession";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();

function buildConfigError(): string | null {
  const missing: string[] = [];
  if (!supabaseUrl) missing.push("VITE_SUPABASE_URL");
  if (!supabaseAnonKey) missing.push("VITE_SUPABASE_ANON_KEY");

  if (missing.length > 0) {
    return `متغيرات البيئة ناقصة: ${missing.join("، ")}. أضفها في Vercel → Settings → Environment Variables ثم Redeploy.`;
  }

  if (/aBcDe/i.test(supabaseUrl)) {
    return "رابط Supabase لا يزال placeholder (aBcDe.supabase.co). ضع Project URL الحقيقي من Supabase → Settings → API.";
  }

  if (/service_role/i.test(supabaseAnonKey)) {
    return "مفتاح service_role غير مسموح في المتصفح. استخدم anon / publishable key فقط.";
  }

  return null;
}

export const supabaseConfigError = buildConfigError();

if (supabaseConfigError) {
  console.error("[Pharmacy App] Supabase configuration error:", supabaseConfigError);
}

export { supabaseUrl, supabaseAnonKey };

function createAuthedFetch() {
  return (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    const token = getAppAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return fetch(input, { ...init, headers });
  };
}

export const supabase = createClient(
  supabaseConfigError ? "http://invalid.local" : supabaseUrl,
  supabaseConfigError ? "invalid" : supabaseAnonKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: createAuthedFetch(),
    },
  },
);

/** Legacy helper — no longer creates Supabase Auth sessions. */
export function createEphemeralSupabase() {
  if (supabaseConfigError) {
    throw new Error(supabaseConfigError);
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: createAuthedFetch(),
    },
  });
}
