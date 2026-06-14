export const PENDING_GOOGLE_TRIAL_SIGNUP_KEY = "victory_pending_google_trial";

export type PendingGoogleTrialSignup = {
  pharmacyName: string;
  name: string;
};

export function savePendingGoogleTrialSignup(payload: PendingGoogleTrialSignup) {
  sessionStorage.setItem(PENDING_GOOGLE_TRIAL_SIGNUP_KEY, JSON.stringify(payload));
}

export function consumePendingGoogleTrialSignup(): PendingGoogleTrialSignup | null {
  try {
    const raw = sessionStorage.getItem(PENDING_GOOGLE_TRIAL_SIGNUP_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_GOOGLE_TRIAL_SIGNUP_KEY);
    const parsed = JSON.parse(raw) as Partial<PendingGoogleTrialSignup>;
    const pharmacyName = String(parsed.pharmacyName || "").trim();
    const name = String(parsed.name || "").trim();
    if (!pharmacyName || !name) return null;
    return { pharmacyName, name };
  } catch {
    sessionStorage.removeItem(PENDING_GOOGLE_TRIAL_SIGNUP_KEY);
    return null;
  }
}

export function clearPendingGoogleTrialSignup() {
  sessionStorage.removeItem(PENDING_GOOGLE_TRIAL_SIGNUP_KEY);
}
