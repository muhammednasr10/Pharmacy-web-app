import { supabase } from "../supabaseClient";
import { getStoredLoginProfile } from "../appAuthSession";
import { appUserFromStoredProfile, isBrowserOffline } from "../../utils/offlineAuth";
import { normalizeAppUser } from "../../utils/roles";
import type { AppUser } from "../../types";
import { removeRealtimeChannelByName, disposeManagedRealtimeChannel } from "./dbHelpers";
import { toCamelCase } from "./mappers";

export async function getCurrentAppUserByUid(uid: string): Promise<AppUser | null> {
  return getAppUserByUid(uid);
}

export async function getAppUserByUid(uid: string): Promise<AppUser | null> {
  if (!uid) {
    console.warn("getAppUserByUid called with empty uid");
    return null;
  }

  const { data, error } = await supabase.from("users").select("*").eq("uid", uid).maybeSingle();

  if (error) {
    console.error("getAppUserByUid error", {
      uid,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    if (isBrowserOffline()) {
      return appUserFromStoredProfile(uid);
    }
  }

  if (data) {
    return normalizeAppUser(toCamelCase<AppUser>(data));
  }

  const cached = getStoredLoginProfile();
  if (cached?.uid === uid) {
    return normalizeAppUser({
      uid: cached.uid,
      email: cached.email,
      name: cached.name,
      role: cached.role as AppUser["role"],
      pharmacyId: cached.pharmacyId,
      isActive: cached.isActive,
    });
  }

  console.warn("getAppUserByUid returned no row", { uid });
  return null;
}

export function subscribeUserAccessRevocation(uid: string, onRevoked: () => void) {
  const channelName = `user-access-revoke-${uid}`;
  removeRealtimeChannelByName(channelName);

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "user_session_revocations",
        filter: `uid=eq.${uid}`,
      },
      () => onRevoked(),
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "users",
        filter: `uid=eq.${uid}`,
      },
      () => onRevoked(),
    );

  void channel.subscribe();

  return () => {
    disposeManagedRealtimeChannel(channel);
  };
}

export async function isAppUserStillActive(uid: string): Promise<boolean> {
  const user = await getAppUserByUid(uid);
  return Boolean(user?.isActive);
}
