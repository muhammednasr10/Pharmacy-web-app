import { supabase, supabaseAnonKey, supabaseUrl } from "../supabaseClient";
import {
  buildAppAuthSession,
  clearAppAuthSession,
  loginWithAppAuth,
  subscribeAppAuth,
  type AppAuthSession,
} from "../appAuthSession";

export function signInWithPassword(email: string, password: string) {
  return signInWithUsernameOrEmail(email, password);
}

/** Resolve username or email to the login email address */
export async function resolveLoginEmail(identifier: string): Promise<string | null> {
  const trimmed = identifier.trim();
  if (!trimmed) return null;

  if (trimmed.includes("@")) {
    return trimmed.toLowerCase();
  }

  const { data, error } = await supabase.rpc("resolve_login_email", {
    login_identifier: trimmed,
  });

  if (error) {
    if (
      error.message.includes("resolve_login_email") &&
      (error.message.includes("does not exist") || error.code === "42883")
    ) {
      throw new Error("username_login_not_configured");
    }
    console.error("resolveLoginEmail error:", error.message);
    return null;
  }

  return typeof data === "string" && data ? data : null;
}

export async function signInWithUsernameOrEmail(identifier: string, password: string) {
  try {
    const email = await resolveLoginEmail(identifier);
    if (!email) {
      return {
        data: { user: null, session: null },
        error: { message: "invalid_login_identifier" } as Error,
      };
    }

    const { session, error } = await loginWithAppAuth(supabaseUrl, supabaseAnonKey, email, password);
    if (error || !session) {
      return {
        data: { user: null, session: null },
        error: { message: error || "invalid_credentials" } as Error,
      };
    }

    return {
      data: {
        user: { id: session.user.id, email: session.user.email },
        session: { access_token: session.access_token, user: { id: session.user.id } },
      },
      error: null,
    };
  } catch (error) {
    return {
      data: { user: null, session: null },
      error: error instanceof Error ? error : new Error("invalid_credentials"),
    };
  }
}

export async function signOutUser() {
  clearAppAuthSession();
  return { error: null };
}

export async function getAuthSession() {
  const session = buildAppAuthSession();
  if (!session) {
    return { data: { session: null }, error: null };
  }
  return {
    data: {
      session: {
        access_token: session.access_token,
        user: { id: session.user.id, email: session.user.email },
      },
    },
    error: null,
  };
}

export function onAuthStateChange(
  callback: (event: string, session: AppAuthSession | { user?: { id: string } } | null) => void,
) {
  const subscription = subscribeAppAuth((event, session) => {
    callback(event, session);
  });

  const existing = buildAppAuthSession();
  if (existing) {
    queueMicrotask(() => callback("INITIAL_SESSION", existing));
  } else {
    queueMicrotask(() => callback("INITIAL_SESSION", null));
  }

  return {
    data: {
      subscription: {
        unsubscribe: () => subscription.unsubscribe(),
      },
    },
  };
}
