const ACCESS_TOKEN_KEY = "pharmacy_app_access_token";
const ACCESS_UID_KEY = "pharmacy_app_uid";
const ACCESS_PROFILE_KEY = "pharmacy_app_user_profile";

type AuthListener = (event: string, session: AppAuthSession | null) => void;

export type AppAuthSession = {
  access_token: string;
  user: { id: string; email?: string };
};

export type StoredLoginProfile = {
  uid: string;
  email: string;
  name: string;
  role: string;
  pharmacyId: string;
  isActive: boolean;
};

let inMemoryAccessToken: string | null = null;
const listeners = new Set<AuthListener>();

function readStoredToken(): string | null {
  if (typeof localStorage === "undefined") return inMemoryAccessToken;
  return localStorage.getItem(ACCESS_TOKEN_KEY) || inMemoryAccessToken;
}

function readStoredUid(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(ACCESS_UID_KEY);
}

export function getAppAccessToken(): string | null {
  return readStoredToken();
}

export function getStoredLoginProfile(): StoredLoginProfile | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(ACCESS_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredLoginProfile;
  } catch {
    return null;
  }
}

function setStoredLoginProfile(profile: StoredLoginProfile | null) {
  if (typeof localStorage === "undefined") return;
  if (profile) {
    localStorage.setItem(ACCESS_PROFILE_KEY, JSON.stringify(profile));
  } else {
    localStorage.removeItem(ACCESS_PROFILE_KEY);
  }
}

export function setAppAccessToken(token: string | null, uid?: string | null) {
  inMemoryAccessToken = token;
  if (typeof localStorage === "undefined") return;
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    if (uid) localStorage.setItem(ACCESS_UID_KEY, uid);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(ACCESS_UID_KEY);
    localStorage.removeItem(ACCESS_PROFILE_KEY);
  }
}

export function buildAppAuthSession(): AppAuthSession | null {
  const access_token = readStoredToken();
  const uid = readStoredUid();
  if (!access_token || !uid) return null;
  return {
    access_token,
    user: { id: uid },
  };
}

export function notifyAppAuthChange(event: string, session: AppAuthSession | null) {
  listeners.forEach((listener) => {
    try {
      listener(event, session);
    } catch (error) {
      console.error("[AppAuth] listener error", error);
    }
  });
}

export function subscribeAppAuth(listener: AuthListener) {
  listeners.add(listener);
  return {
    unsubscribe: () => listeners.delete(listener),
  };
}

export function clearAppAuthSession() {
  setAppAccessToken(null);
  setStoredLoginProfile(null);
  notifyAppAuthChange("SIGNED_OUT", null);
}

function persistLoginSession(
  accessToken: string,
  user: {
    uid?: string;
    email?: string;
    name?: string;
    role?: string;
    pharmacy_id?: string;
    is_active?: boolean;
  },
): AppAuthSession {
  const session: AppAuthSession = {
    access_token: accessToken,
    user: { id: String(user.uid || ""), email: user.email },
  };
  setAppAccessToken(session.access_token, session.user.id);
  if (user.uid) {
    setStoredLoginProfile({
      uid: String(user.uid),
      email: String(user.email || ""),
      name: String(user.name || user.email || ""),
      role: String(user.role || "cashier"),
      pharmacyId: String(user.pharmacy_id || "main"),
      isActive: user.is_active !== false,
    });
  }
  notifyAppAuthChange("SIGNED_IN", session);
  return session;
}

export async function loginWithAppAuth(
  supabaseUrl: string,
  supabaseAnonKey: string,
  email: string,
  password: string,
): Promise<{ session: AppAuthSession | null; error: string | null }> {
  const base = supabaseUrl.replace(/\/$/, "");
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${supabaseAnonKey}`,
    apikey: supabaseAnonKey,
  };
  const credentials = { p_email: email.trim().toLowerCase(), p_password: password };

  const rpcResponse = await fetch(`${base}/rest/v1/rpc/app_client_login`, {
    method: "POST",
    headers,
    body: JSON.stringify(credentials),
  });

  const rpcRaw = await rpcResponse.text();
  let rpcBody: {
    access_token?: string;
    user?: {
      uid?: string;
      email?: string;
      name?: string;
      role?: string;
      pharmacy_id?: string;
      is_active?: boolean;
    };
    message?: string;
    code?: string;
  } | null = null;
  try {
    rpcBody = rpcRaw ? JSON.parse(rpcRaw) : null;
  } catch {
    rpcBody = null;
  }

  if (rpcResponse.ok && rpcBody?.access_token && rpcBody.user?.uid) {
    const session = persistLoginSession(rpcBody.access_token, rpcBody.user);
    return { session, error: null };
  }

  const rpcMessage = rpcBody?.message || "";
  if (
    rpcResponse.status === 404 ||
    rpcMessage.includes("app_client_login") ||
    rpcMessage.includes("Could not find")
  ) {
    return loginWithAppAuthEdge(base, headers, credentials);
  }

  if (rpcMessage.includes("invalid_credentials")) {
    return { session: null, error: "invalid_credentials" };
  }
  if (rpcMessage.includes("user_inactive")) {
    return { session: null, error: "user_inactive" };
  }
  if (rpcMessage.includes("jwt_secret_not_configured")) {
    return { session: null, error: "jwt_secret_not_configured" };
  }

  if (!rpcResponse.ok) {
    return { session: null, error: rpcMessage || `http_${rpcResponse.status}` };
  }

  return loginWithAppAuthEdge(base, headers, credentials);
}

async function loginWithAppAuthEdge(
  base: string,
  headers: Record<string, string>,
  credentials: { p_email: string; p_password: string },
): Promise<{ session: AppAuthSession | null; error: string | null }> {
  const response = await fetch(`${base}/functions/v1/app-auth/login`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email: credentials.p_email, password: credentials.p_password }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    user?: { uid?: string; email?: string };
    error?: string;
    message?: string;
  };

  if (response.status === 404) {
    return { session: null, error: "app_auth_not_deployed" };
  }

  if (!response.ok || !body.access_token || !body.user?.uid) {
    const err =
      body.error ||
      body.message ||
      (response.status === 401 ? "invalid_credentials" : `http_${response.status}`);
    return { session: null, error: err };
  }

  const session = persistLoginSession(body.access_token, body.user);
  return { session, error: null };
}
