import { createEphemeralSupabase, supabase } from "../supabaseClient";
import {
  isAccountant,
  isOrgPharmacyAdmin,
  isPharmacyManager,
  isSuperAdmin,
  normalizeAppUser,
  normalizeRole,
} from "../../utils/roles";
import { ALL_BRANCHES_ID } from "../../constants/branches";
import { notifySuperAdminOfSubscriptionRequest } from "../../utils/superAdminNotify";
import { isActiveSubscriptionStatus, TRIAL_SUBSCRIPTION_DAYS } from "../../config/subscription";
import {
  getSubscriptionTier,
  parseSubscriptionTier,
  type SubscriptionTier,
} from "../../config/subscriptionTiers";
import type {
  ActivityLog,
  AppUser,
  SubscriptionRequest,
  SubscriptionRequestStatus,
  LoginAccountRequest,
  PharmacyLoginAccount,
  CartItem,
  CreatePharmacyInput,
  CreatePharmacyUserInput,
  CustomerPayment,
  HeldInvoice,
  InstantSaleReturnInput,
  Invoice,
  InvoiceItem,
  Medicine,
  PharmacySettings,
  PharmacyCost,
  PurchaseRecord,
  ReturnRecord,
  StockMovement,
  BranchStockTransfer,
  SystemUser,
  UserRole,
  EmployeeProfile,
  AttendanceRecord,
  AttendanceStatus,
  PayrollRecord,
  Employee,
  WorkBreak,
  ShiftId,
  PharmacyShift,
  EmployeeRequest,
  EmployeeRequestStatus,
  EmployeeRequestType,
  CashierShift,
  CashierShiftSummary,
} from "../../types";
import {
  WORK_SCHEDULE_DEFAULTS,
  DEFAULT_PHARMACY_SHIFTS,
  DEFAULT_ALLOWED_LATE_MINUTES,
  clonePharmacyShifts,
  computeWorkHoursFromSchedule,
  inferShiftIdFromTime,
  isCheckInLate,
  normalizeTimeValue,
  parsePharmacyShifts,
  parseWorkBreaks,
  resolveWorkSchedule,
  type WorkSchedule,
} from "../../utils/workSchedule";
import { extractCopyableBranchSettings } from "../../utils/copyBranchSettings";
import {
  computeCashierCommissionFromInvoices,
  currentMonthPeriodBounds,
} from "../../utils/cashierCommission";

import { toCamelCase, toSnakeCase } from "./mappers";
import {
  setActivePharmacy,
  getActivePharmacy,
  setOrganizationBranchIds,
  getOrganizationBranchIds,
  setCurrentAppUser,
  getCurrentAppUser,
  applyPharmacyFilter,
  applyPharmacyScopeFilter,
  stampPharmacy,
  resolveStampPharmacyId,
  resolveHeldInvoicesPharmacyId,
  prepareMedicinePayload,
  prepareMedicinePayloadForPharmacy,
  shouldQueryAllOrganizationBranches,
} from "./scope";
import { prepareInvoicePayload, prepareInvoiceItemPayload } from "./payloads";
import { getRows, subscribeTable } from "./dbHelpers";

import { getEmployees, syncPharmacyLoginAccountToUser, linkUserToEmployee } from "./hrService";

export function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

/** Resolve username or email to the Auth email address */
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
  const email = await resolveLoginEmail(identifier);
  if (!email) {
    return {
      data: { user: null, session: null },
      error: { message: "invalid_login_identifier" } as Error,
    };
  }
  return signInWithPassword(email, password);
}

function getAuthRedirectUrl() {
  const base = import.meta.env.BASE_URL || "/";
  const path = base.endsWith("/") ? base : `${base}/`;
  return `${window.location.origin}${path}`;
}

export function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getAuthRedirectUrl(),
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });
}

export function getAuthProvider(user: {
  app_metadata?: Record<string, unknown>;
  identities?: Array<{ provider?: string }>;
}): string | undefined {
  const fromMeta = user.app_metadata?.provider;
  if (typeof fromMeta === "string") return fromMeta;
  return user.identities?.[0]?.provider;
}

export async function ensureGoogleAppUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): Promise<AppUser | null> {
  return getAppUserByUid(user.id);
}

export function signOutUser() {
  return supabase.auth.signOut();
}

export function getAuthSession() {
  return supabase.auth.getSession();
}

export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback);
}

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
    return null;
  }

  if (!data) {
    console.warn("getAppUserByUid returned no row", { uid });
    return null;
  }

  return normalizeAppUser(toCamelCase<AppUser>(data));
}

export async function getCurrentPharmacy(pharmacyId: string): Promise<PharmacySettings | null> {
  return getPharmacySettings(pharmacyId);
}

function isSubscriptionEndDatePassed(endDate?: string | null) {
  if (!endDate) return false;
  const end = new Date(`${endDate}T23:59:59`);
  return !Number.isNaN(end.getTime()) && end.getTime() < Date.now();
}

export async function isPharmacyAccessAllowed(pharmacyId: string): Promise<boolean> {
  const pharmacy = await getPharmacySettings(pharmacyId);
  if (!pharmacy) return false;
  if (pharmacy.isActive === false) return false;
  if (!isActiveSubscriptionStatus(pharmacy.subscriptionStatus)) return false;
  if (isSubscriptionEndDatePassed(pharmacy.subscriptionEndDate || pharmacy.subscriptionEndsAt)) {
    return false;
  }
  return true;
}

export type TrialProvisionResult = {
  pharmacyId: string;
  organizationId: string;
  subscriptionEndDate: string;
  trialDays: number;
};

export async function provisionTrialPharmacy(pharmacyName: string): Promise<TrialProvisionResult> {
  const name = pharmacyName.trim();
  if (name.length < 2) {
    throw new Error("pharmacy_name_required");
  }

  const { data, error } = await supabase.rpc("provision_trial_pharmacy", {
    p_pharmacy_name: name,
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = (data || {}) as Record<string, unknown>;
  return {
    pharmacyId: String(row.pharmacy_id || ""),
    organizationId: String(row.organization_id || ""),
    subscriptionEndDate: String(row.subscription_end_date || ""),
    trialDays: Number(row.trial_days) || TRIAL_SUBSCRIPTION_DAYS,
  };
}

export async function ensureTrialPharmacyFromAuth(authUser: {
  id: string;
  user_metadata?: Record<string, unknown>;
}): Promise<boolean> {
  const meta = authUser.user_metadata || {};
  if (meta.signup_type !== "trial_pharmacy") return false;

  const pharmacyName = String(meta.pharmacy_name || "").trim();
  if (!pharmacyName) return false;

  const existing = await getAppUserByUid(authUser.id);
  if (existing?.pharmacyId && existing.pharmacyId !== "main") {
    return false;
  }

  await provisionTrialPharmacy(pharmacyName);
  return true;
}

export async function getPharmacySettings(pharmacyId: string): Promise<PharmacySettings | null> {
  const { data, error } = await supabase
    .from("pharmacies")
    .select("*")
    .eq("id", pharmacyId)
    .maybeSingle();

  if (error) {
    console.error("getPharmacySettings error:", error.message);
    return null;
  }

  return data ? toCamelCase<PharmacySettings>(data) : null;
}

export async function updatePharmacySettings(
  pharmacyId: string,
  updates: Partial<PharmacySettings>,
) {
  const payload = toSnakeCase(updates);
  delete payload.id;

  const { error } = await supabase.from("pharmacies").update(payload).eq("id", pharmacyId);

  if (error) {
    throw new Error(error.message);
  }
}

async function attachOrganizationBranchLimits(
  pharmacies: PharmacySettings[],
): Promise<PharmacySettings[]> {
  const organizationIds = [
    ...new Set(pharmacies.map((pharmacy) => pharmacy.organizationId).filter(Boolean)),
  ] as string[];

  if (organizationIds.length === 0) {
    return pharmacies.map((pharmacy) => ({ ...pharmacy, maxBranches: pharmacy.maxBranches ?? 1 }));
  }

  const { data: organizations, error } = await supabase
    .from("organizations")
    .select("id, max_branches")
    .in("id", organizationIds);

  if (error) {
    console.error("attachOrganizationBranchLimits error:", error.message);
    return pharmacies;
  }

  const maxByOrg = new Map(
    (organizations || []).map((row) => [String(row.id), Number(row.max_branches) || 1]),
  );

  return pharmacies.map((pharmacy) => {
    const fromPharmacy = Number(pharmacy.maxBranches);
    const fromOrg = pharmacy.organizationId ? maxByOrg.get(pharmacy.organizationId) : undefined;
    const tierDefault = getSubscriptionTier(
      pharmacy.subscriptionTier || pharmacy.subscriptionPlan,
    ).maxBranches;
    const resolved =
      Number.isFinite(fromPharmacy) && fromPharmacy > 0 ? fromPharmacy : (fromOrg ?? tierDefault);
    const subscriptionTier = parseSubscriptionTier(
      pharmacy.subscriptionTier || pharmacy.subscriptionPlan,
    );
    return { ...pharmacy, subscriptionTier, maxBranches: resolved };
  });
}

export async function getPharmacies(): Promise<PharmacySettings[]> {
  const { data, error } = await supabase
    .from("pharmacies")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("getPharmacies error:", error.message);
    return [];
  }

  const pharmacies = (data || []).map((row) => toCamelCase<PharmacySettings>(row));
  return attachOrganizationBranchLimits(pharmacies);
}

export async function updateOrganizationMaxBranches(
  organizationId: string,
  maxBranches: number,
  actingUser: AppUser | null = getCurrentAppUser(),
): Promise<void> {
  if (!isSuperAdmin(actingUser)) {
    throw new Error("forbidden");
  }

  const normalized = Math.max(1, Math.floor(Number(maxBranches)));
  const { error: rpcError } = await supabase.rpc("set_organization_max_branches", {
    target_organization_id: organizationId,
    new_max_branches: normalized,
  });

  if (!rpcError) {
    return;
  }

  const rpcMessage = rpcError.message || "";
  const rpcMissing =
    rpcMessage.includes("set_organization_max_branches") &&
    (rpcMessage.includes("does not exist") || rpcMessage.includes("Could not find"));

  if (!rpcMissing && !rpcMessage.includes("forbidden")) {
    throw new Error(rpcMessage);
  }

  const { data: updatedPharmacies, error: pharmacyError } = await supabase
    .from("pharmacies")
    .update({ max_branches: normalized })
    .eq("organization_id", organizationId)
    .select("id");

  if (pharmacyError) {
    if (
      pharmacyError.message.includes("max_branches") &&
      pharmacyError.message.includes("does not exist")
    ) {
      throw new Error("sql_migration_required");
    }
    throw new Error(pharmacyError.message);
  }

  if (!updatedPharmacies || updatedPharmacies.length === 0) {
    throw new Error("organization_not_found");
  }

  await supabase
    .from("organizations")
    .update({ max_branches: normalized })
    .eq("id", organizationId);
}

export async function updateOrganizationSubscriptionTier(
  organizationId: string,
  tier: SubscriptionTier,
  actingUser: AppUser | null = getCurrentAppUser(),
): Promise<void> {
  if (!isSuperAdmin(actingUser)) {
    throw new Error("forbidden");
  }

  const tierConfig = getSubscriptionTier(tier);
  const maxBranches = tierConfig.maxBranches;

  const { data: orgPharmacies, error: fetchError } = await supabase
    .from("pharmacies")
    .select("id")
    .eq("organization_id", organizationId);

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (!orgPharmacies || orgPharmacies.length === 0) {
    throw new Error("organization_not_found");
  }

  if (orgPharmacies.length > maxBranches) {
    throw new Error("below_current_branches");
  }

  const { error: pharmacyError } = await supabase
    .from("pharmacies")
    .update({
      subscription_tier: tier,
      max_branches: maxBranches,
    })
    .eq("organization_id", organizationId);

  if (pharmacyError) {
    if (
      pharmacyError.message.includes("subscription_tier") &&
      pharmacyError.message.includes("does not exist")
    ) {
      throw new Error("sql_migration_required");
    }
    throw new Error(pharmacyError.message);
  }

  await supabase
    .from("organizations")
    .update({
      subscription_tier: tier,
      max_branches: maxBranches,
    })
    .eq("id", organizationId);
}

export function subscribePharmacies(callback: (rows: PharmacySettings[]) => void) {
  const channel = supabase
    .channel("realtime-pharmacies-all")
    .on("postgres_changes", { event: "*", schema: "public", table: "pharmacies" }, () => {
      void getPharmacies().then(callback);
    });

  void channel.subscribe();

  return () => {
    void channel.unsubscribe();
  };
}

function buildSubscriptionRequestNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `SUB-${stamp}-${random}`;
}

export async function getAllSubscriptionRequests(): Promise<SubscriptionRequest[]> {
  const { data, error } = await supabase
    .from("subscription_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("getAllSubscriptionRequests error:", error.message);
    return [];
  }

  return (data || []).map((row) => toCamelCase<SubscriptionRequest>(row));
}

export async function getPharmacySubscriptionRequests(
  pharmacyId: string,
): Promise<SubscriptionRequest[]> {
  const { data, error } = await supabase
    .from("subscription_requests")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("getPharmacySubscriptionRequests error:", error.message);
    return [];
  }

  return (data || []).map((row) => toCamelCase<SubscriptionRequest>(row));
}

export function subscribeSubscriptionRequests(callback: (rows: SubscriptionRequest[]) => void) {
  const channel = supabase
    .channel("realtime-subscription-requests")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "subscription_requests" },
      () => {
        void getAllSubscriptionRequests().then(callback);
      },
    );

  void channel.subscribe();

  return () => {
    void channel.unsubscribe();
  };
}

export async function createSubscriptionRequest(input: {
  pharmacyId: string;
  pharmacyName: string;
  plan: string;
  days: number;
  amount: number;
  currency?: string;
  requestedBy?: string;
  requestedByName?: string;
}): Promise<SubscriptionRequest> {
  const payload = toSnakeCase({
    requestNumber: buildSubscriptionRequestNumber(),
    pharmacyId: input.pharmacyId,
    pharmacyName: input.pharmacyName,
    plan: input.plan,
    days: input.days,
    amount: input.amount,
    currency: input.currency || "EGP",
    status: "pending" as SubscriptionRequestStatus,
    requestedBy: input.requestedBy,
    requestedByName: input.requestedByName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const { data, error } = await supabase
    .from("subscription_requests")
    .insert([payload])
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const created = toCamelCase<SubscriptionRequest>(data);
  void notifySuperAdminOfSubscriptionRequest(created).catch((notifyError) => {
    console.error("notifySuperAdminOfSubscriptionRequest:", notifyError);
  });

  return created;
}

export async function updateSubscriptionRequestStatus(
  requestId: number,
  updates: {
    status: SubscriptionRequestStatus;
    reviewedBy?: string;
    reviewedByName?: string;
    reviewNote?: string;
  },
) {
  const payload = toSnakeCase({
    status: updates.status,
    reviewedBy: updates.reviewedBy,
    reviewedByName: updates.reviewedByName,
    reviewNote: updates.reviewNote,
    reviewedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const { error } = await supabase
    .from("subscription_requests")
    .update(payload)
    .eq("id", requestId);

  if (error) {
    throw new Error(error.message);
  }
}

function buildLoginAccountRequestNumber() {
  return `ACC-${Date.now()}`;
}

export async function getAllLoginAccountRequests(options?: {
  includePendingPasswords?: boolean;
}): Promise<LoginAccountRequest[]> {
  const { data, error } = await supabase
    .from("login_account_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getAllLoginAccountRequests error:", error.message, error.code);
    return [];
  }

  return (data || []).map((row) => {
    const req = toCamelCase<LoginAccountRequest>(row);
    if (!options?.includePendingPasswords || req.status !== "pending") {
      delete req.password;
    }
    return req;
  });
}

export async function getPharmacyLoginAccountRequests(
  pharmacyId: string,
): Promise<LoginAccountRequest[]> {
  const { data, error } = await supabase
    .from("login_account_requests")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getPharmacyLoginAccountRequests error:", error.message);
    return [];
  }

  return (data || []).map((row) => {
    const req = toCamelCase<LoginAccountRequest>(row);
    delete req.password;
    return req;
  });
}

export async function getLoginAccountRequestById(id: number): Promise<LoginAccountRequest | null> {
  const { data, error } = await supabase
    .from("login_account_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return toCamelCase<LoginAccountRequest>(data);
}

export async function getPendingLoginAccountRequestForEmployee(
  employeeId: string,
): Promise<LoginAccountRequest | null> {
  const { data, error } = await supabase
    .from("login_account_requests")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("status", "pending")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const req = toCamelCase<LoginAccountRequest>(data);
  delete req.password;
  return req;
}

export async function getPendingLoginAccountRequestForEmail(
  pharmacyId: string,
  email: string,
): Promise<LoginAccountRequest | null> {
  const { data, error } = await supabase
    .from("login_account_requests")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .eq("email", email.trim().toLowerCase())
    .eq("status", "pending")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const req = toCamelCase<LoginAccountRequest>(data);
  delete req.password;
  return req;
}

export function subscribeLoginAccountRequests(
  callback: (rows: LoginAccountRequest[]) => void,
  options?: { includePendingPasswords?: boolean },
) {
  const channel = supabase
    .channel("realtime-login-account-requests")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "login_account_requests" },
      () => {
        void getAllLoginAccountRequests(options).then(callback);
      },
    );

  void channel.subscribe();
  return () => {
    void channel.unsubscribe();
  };
}

export async function createLoginAccountRequest(input: {
  pharmacyId: string;
  pharmacyName: string;
  employeeId?: string;
  employeeName?: string;
  email: string;
  username?: string;
  password: string;
  role: UserRole;
  requestedBy?: string;
  requestedByName?: string;
}): Promise<LoginAccountRequest> {
  const email = input.email.trim().toLowerCase();
  const existingEmail = await getPendingLoginAccountRequestForEmail(input.pharmacyId, email);
  if (existingEmail) {
    throw new Error("pending_login_request_exists");
  }
  if (input.employeeId) {
    const existingEmployee = await getPendingLoginAccountRequestForEmployee(input.employeeId);
    if (existingEmployee) {
      throw new Error("pending_login_request_exists");
    }
  }

  const payload = toSnakeCase({
    requestNumber: buildLoginAccountRequestNumber(),
    pharmacyId: input.pharmacyId,
    pharmacyName: input.pharmacyName,
    employeeId: input.employeeId || null,
    employeeName: input.employeeName || null,
    email,
    username: (input.username || email.split("@")[0] || email).trim(),
    password: input.password,
    role: normalizeRole(input.role),
    status: "pending" as SubscriptionRequestStatus,
    requestedBy: input.requestedBy,
    requestedByName: input.requestedByName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const { data, error } = await supabase
    .from("login_account_requests")
    .insert([payload])
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const created = toCamelCase<LoginAccountRequest>(data);
  delete created.password;
  return created;
}

export async function updateLoginAccountRequestStatus(
  requestId: number,
  updates: {
    status: SubscriptionRequestStatus;
    reviewedBy?: string;
    reviewedByName?: string;
    reviewNote?: string;
    clearPassword?: boolean;
  },
) {
  const payload: Record<string, unknown> = {
    status: updates.status,
    reviewed_by: updates.reviewedBy,
    reviewed_by_name: updates.reviewedByName,
    review_note: updates.reviewNote,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (updates.clearPassword) {
    // Column may still be NOT NULL on older DBs — empty string satisfies the constraint.
    payload.password = "";
  }

  const { error } = await supabase
    .from("login_account_requests")
    .update(payload)
    .eq("id", requestId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getPharmacyLoginAccounts(
  pharmacyId: string,
): Promise<PharmacyLoginAccount[]> {
  const { data, error } = await supabase
    .from("pharmacy_login_accounts")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .order("email", { ascending: true });

  if (error) {
    console.error("getPharmacyLoginAccounts error:", error.message);
    return [];
  }

  return (data || []).map((row) =>
    normalizePharmacyLoginAccount(toCamelCase<PharmacyLoginAccount>(row)),
  );
}

export async function getPharmacyLoginAccountsForPharmacies(
  pharmacyIds: string[],
): Promise<PharmacyLoginAccount[]> {
  const ids = [...new Set(pharmacyIds.filter(Boolean))];
  if (ids.length === 0) return [];
  if (ids.length === 1) return getPharmacyLoginAccounts(ids[0]);

  const { data, error } = await supabase
    .from("pharmacy_login_accounts")
    .select("*")
    .in("pharmacy_id", ids)
    .order("pharmacy_id", { ascending: true })
    .order("email", { ascending: true })
    .limit(500);

  if (error) {
    console.error("getPharmacyLoginAccountsForPharmacies error:", error.message);
    return [];
  }

  return (data || []).map((row) =>
    normalizePharmacyLoginAccount(toCamelCase<PharmacyLoginAccount>(row)),
  );
}

function normalizePharmacyLoginAccount(row: PharmacyLoginAccount): PharmacyLoginAccount {
  return {
    ...row,
    role: normalizeRole(row.role),
    email: row.email.trim().toLowerCase(),
    status: row.status || "approved",
    editPending: Boolean(row.editPending),
    linkRequestPending: Boolean(row.linkRequestPending),
    pendingEmail: row.pendingEmail?.trim().toLowerCase(),
    pendingRole: row.pendingRole ? normalizeRole(row.pendingRole) : undefined,
  };
}

export async function getAllPharmacyLoginAccounts(options?: {
  status?: PharmacyLoginAccount["status"];
  pendingApproval?: boolean;
}): Promise<PharmacyLoginAccount[]> {
  let query = supabase.from("pharmacy_login_accounts").select("*").order("created_at", {
    ascending: false,
  });
  if (options?.pendingApproval) {
    query = query.or("status.eq.pending,edit_pending.eq.true,link_request_pending.eq.true");
  } else if (options?.status) {
    query = query.eq("status", options.status);
  }
  const { data, error } = await query;
  if (error) {
    console.error("getAllPharmacyLoginAccounts error:", error.message);
    return [];
  }
  return (data || []).map((row) =>
    normalizePharmacyLoginAccount(toCamelCase<PharmacyLoginAccount>(row)),
  );
}

export async function getPharmacyLoginAccountById(
  id: string,
): Promise<PharmacyLoginAccount | null> {
  const { data, error } = await supabase
    .from("pharmacy_login_accounts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return normalizePharmacyLoginAccount(toCamelCase<PharmacyLoginAccount>(data));
}

export async function createPharmacyLoginAccount(input: {
  pharmacyId: string;
  email: string;
  password: string;
  role: UserRole;
  employeeId?: string;
  status?: PharmacyLoginAccount["status"];
  requestedBy?: string;
  requestedByName?: string;
}): Promise<PharmacyLoginAccount> {
  const status = input.status ?? (isSuperAdmin(getCurrentAppUser()) ? "approved" : "pending");

  const payload = stampPharmacy(
    toSnakeCase({
      id: crypto.randomUUID(),
      pharmacyId: input.pharmacyId,
      email: input.email.trim().toLowerCase(),
      password: input.password,
      role: normalizeRole(input.role),
      employeeId: input.employeeId || null,
      isActive: true,
      status,
      requestedBy: input.requestedBy,
      requestedByName: input.requestedByName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  );

  const { data, error } = await supabase
    .from("pharmacy_login_accounts")
    .insert([payload])
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizePharmacyLoginAccount(toCamelCase<PharmacyLoginAccount>(data));
}

export async function superAdminApprovePharmacyLoginAccountCatalog(
  id: string,
  reviewedBy?: string,
  reviewedByName?: string,
): Promise<PharmacyLoginAccount | null> {
  const account = await getPharmacyLoginAccountById(id);
  if (!account) {
    throw new Error("login_account_not_found");
  }
  if (account.status === "approved") {
    throw new Error("account_already_approved");
  }
  if (account.editPending) {
    throw new Error("edit_pending");
  }

  const { data, error } = await supabase
    .from("pharmacy_login_accounts")
    .update({
      status: "approved",
      reviewed_by: reviewedBy,
      reviewed_by_name: reviewedByName,
      review_note: null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .in("status", ["pending", "rejected"])
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const approved = normalizePharmacyLoginAccount(toCamelCase<PharmacyLoginAccount>(data));
  const employees = await getEmployees();
  const employee = approved.employeeId
    ? employees.find((item) => item.id === approved.employeeId)
    : undefined;
  await syncPharmacyLoginAccountToUser(approved, { name: employee?.name });

  return approved;
}

export async function approvePharmacyLoginAccount(
  id: string,
  reviewedBy?: string,
  reviewedByName?: string,
): Promise<PharmacyLoginAccount | null> {
  const account = await getPharmacyLoginAccountById(id);
  if (!account || account.status !== "pending") {
    throw new Error("account_not_pending");
  }

  const { data, error } = await supabase
    .from("pharmacy_login_accounts")
    .update({
      status: "approved",
      reviewed_by: reviewedBy,
      reviewed_by_name: reviewedByName,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const approved = normalizePharmacyLoginAccount(toCamelCase<PharmacyLoginAccount>(data));

  await syncPharmacyLoginAccountToUser(approved);

  return approved;
}

export async function rejectPharmacyLoginAccount(
  id: string,
  reviewedBy?: string,
  reviewedByName?: string,
  reviewNote?: string,
) {
  const { error } = await supabase
    .from("pharmacy_login_accounts")
    .update({
      status: "rejected",
      reviewed_by: reviewedBy,
      reviewed_by_name: reviewedByName,
      review_note: reviewNote || null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      employee_id: null,
    })
    .eq("id", id)
    .eq("status", "pending");

  if (error) {
    throw new Error(error.message);
  }
}

export async function submitPharmacyLoginAccountEditRequest(
  id: string,
  changes: { email: string; password: string; role: UserRole },
  requestedBy?: string,
  requestedByName?: string,
) {
  const account = await getPharmacyLoginAccountById(id);
  if (!account) {
    throw new Error("login_account_not_found");
  }
  if (account.status !== "approved") {
    throw new Error("account_not_approved");
  }

  const { error } = await supabase
    .from("pharmacy_login_accounts")
    .update({
      pending_email: changes.email.trim().toLowerCase(),
      pending_password: changes.password,
      pending_role: normalizeRole(changes.role),
      edit_pending: true,
      edit_requested_by: requestedBy || null,
      edit_requested_by_name: requestedByName || null,
      edit_requested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function approvePharmacyLoginAccountEdit(
  id: string,
  reviewedBy?: string,
  reviewedByName?: string,
): Promise<PharmacyLoginAccount | null> {
  const account = await getPharmacyLoginAccountById(id);
  if (!account || !account.editPending) {
    throw new Error("account_edit_not_pending");
  }

  const email = (account.pendingEmail || account.email).trim().toLowerCase();
  const password = account.pendingPassword ?? account.password ?? "";
  const role = account.pendingRole ? normalizeRole(account.pendingRole) : account.role;

  const { data, error } = await supabase
    .from("pharmacy_login_accounts")
    .update({
      email,
      password,
      role,
      pending_email: null,
      pending_password: null,
      pending_role: null,
      edit_pending: false,
      edit_requested_by: null,
      edit_requested_by_name: null,
      edit_requested_at: null,
      reviewed_by: reviewedBy,
      reviewed_by_name: reviewedByName,
      review_note: null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const approved = normalizePharmacyLoginAccount(toCamelCase<PharmacyLoginAccount>(data));

  const employees = await getEmployees();
  const employee = approved.employeeId
    ? employees.find((item) => item.id === approved.employeeId)
    : undefined;
  await syncPharmacyLoginAccountToUser(approved, { name: employee?.name });

  return approved;
}

export async function rejectPharmacyLoginAccountEdit(
  id: string,
  reviewedBy?: string,
  reviewedByName?: string,
  reviewNote?: string,
) {
  const { error } = await supabase
    .from("pharmacy_login_accounts")
    .update({
      pending_email: null,
      pending_password: null,
      pending_role: null,
      edit_pending: false,
      edit_requested_by: null,
      edit_requested_by_name: null,
      edit_requested_at: null,
      reviewed_by: reviewedBy,
      reviewed_by_name: reviewedByName,
      review_note: reviewNote || null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("edit_pending", true);

  if (error) {
    throw new Error(error.message);
  }
}

export async function submitPharmacyLoginAccountLinkRequest(
  id: string,
  requestedBy?: string,
  requestedByName?: string,
) {
  const account = await getPharmacyLoginAccountById(id);
  if (!account) {
    throw new Error("login_account_not_found");
  }
  if (account.status !== "approved") {
    throw new Error("account_not_approved");
  }
  if (account.editPending) {
    throw new Error("edit_pending");
  }
  if (account.linkRequestPending) {
    throw new Error("link_request_already_pending");
  }

  const { error } = await supabase
    .from("pharmacy_login_accounts")
    .update({
      link_request_pending: true,
      link_requested_by: requestedBy || null,
      link_requested_by_name: requestedByName || null,
      link_requested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function approvePharmacyLoginAccountLink(
  id: string,
  reviewedBy?: string,
  reviewedByName?: string,
): Promise<PharmacyLoginAccount | null> {
  const account = await getPharmacyLoginAccountById(id);
  if (!account || !account.linkRequestPending) {
    throw new Error("link_request_not_pending");
  }
  if (account.status !== "approved") {
    throw new Error("account_not_approved");
  }

  const employees = await getEmployees();
  const employee = account.employeeId
    ? employees.find((item) => item.id === account.employeeId)
    : undefined;

  await syncPharmacyLoginAccountToUser(account, { name: employee?.name });

  const { data, error } = await supabase
    .from("pharmacy_login_accounts")
    .update({
      link_request_pending: false,
      link_requested_by: null,
      link_requested_by_name: null,
      link_requested_at: null,
      reviewed_by: reviewedBy,
      reviewed_by_name: reviewedByName,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizePharmacyLoginAccount(toCamelCase<PharmacyLoginAccount>(data));
}

export async function rejectPharmacyLoginAccountLink(
  id: string,
  reviewedBy?: string,
  reviewedByName?: string,
  reviewNote?: string,
) {
  const { error } = await supabase
    .from("pharmacy_login_accounts")
    .update({
      link_request_pending: false,
      link_requested_by: null,
      link_requested_by_name: null,
      link_requested_at: null,
      reviewed_by: reviewedBy,
      reviewed_by_name: reviewedByName,
      review_note: reviewNote || null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("link_request_pending", true);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updatePharmacyLoginAccount(
  id: string,
  updates: Partial<
    Pick<PharmacyLoginAccount, "email" | "password" | "role" | "employeeId" | "isActive" | "status">
  >,
) {
  const payload = toSnakeCase({
    ...updates,
    email: updates.email?.trim().toLowerCase(),
    role: updates.role ? normalizeRole(updates.role) : undefined,
    updatedAt: new Date().toISOString(),
  });
  if (updates.role === undefined) {
    delete payload.role;
  }

  const { error } = await supabase.from("pharmacy_login_accounts").update(payload).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function deletePharmacyLoginAccount(id: string) {
  const { error } = await supabase.from("pharmacy_login_accounts").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function assignPharmacyLoginAccountToEmployee(
  accountId: string | null,
  employeeId: string | null,
  pharmacyId: string,
) {
  if (employeeId) {
    await supabase
      .from("pharmacy_login_accounts")
      .update({ employee_id: null, updated_at: new Date().toISOString() })
      .eq("pharmacy_id", pharmacyId)
      .eq("employee_id", employeeId);
  }

  if (!accountId) return;

  const { data: account, error: loadError } = await supabase
    .from("pharmacy_login_accounts")
    .select("*")
    .eq("id", accountId)
    .maybeSingle();

  if (loadError || !account) {
    throw new Error("login_account_not_found");
  }

  const catalogAccount = normalizePharmacyLoginAccount(toCamelCase<PharmacyLoginAccount>(account));
  if (catalogAccount.status !== "approved") {
    throw new Error("login_account_not_approved");
  }

  const { error } = await supabase
    .from("pharmacy_login_accounts")
    .update({
      employee_id: employeeId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", accountId);

  if (error) {
    throw new Error(error.message);
  }

  if (employeeId) {
    const employees = await getEmployees();
    const employee = employees.find((item) => item.id === employeeId);
    await syncPharmacyLoginAccountToUser(
      { ...catalogAccount, employeeId },
      { name: employee?.name },
    );
  } else {
    await syncPharmacyLoginAccountToUser(catalogAccount);
  }
}

export async function createPharmacyLoginAccountFromRequest(
  request: LoginAccountRequest,
  password?: string,
): Promise<PharmacyLoginAccount> {
  const existing = await supabase
    .from("pharmacy_login_accounts")
    .select("id")
    .eq("pharmacy_id", request.pharmacyId)
    .eq("email", request.email.trim().toLowerCase())
    .maybeSingle();

  if (existing.data?.id) {
    const { data } = await supabase
      .from("pharmacy_login_accounts")
      .select("*")
      .eq("id", existing.data.id)
      .single();
    return normalizePharmacyLoginAccount(toCamelCase<PharmacyLoginAccount>(data));
  }

  return createPharmacyLoginAccount({
    pharmacyId: request.pharmacyId,
    email: request.email,
    password: password || request.password || "",
    role: request.role,
    employeeId: request.employeeId,
  });
}

export async function createPharmacy(data: CreatePharmacyInput) {
  const organizationId = data.organizationId || `org-${data.id}`;
  const orgName = data.name || data.id;
  const subscriptionTier = parseSubscriptionTier(data.subscriptionTier);
  const tierConfig = getSubscriptionTier(subscriptionTier);
  const maxBranches = Math.max(1, Math.floor(Number(data.maxBranches) || tierConfig.maxBranches));

  await supabase.from("organizations").upsert(
    {
      id: organizationId,
      name: orgName,
      max_branches: maxBranches,
      subscription_tier: subscriptionTier,
    },
    { onConflict: "id" },
  );

  const payload = toSnakeCase({
    id: data.id,
    name: data.name,
    name_en: data.name_en || data.name,
    phone: data.phone || "",
    address: data.address || "",
    currency: data.currency || "ج.م",
    isActive: true,
    organizationId,
    maxBranches,
    subscriptionTier,
    subscriptionPlan: data.subscriptionPlan || "monthly",
    subscriptionStatus: data.subscriptionStatus || "active",
  });
  const { error } = await supabase.from("pharmacies").insert([payload]);
  if (error) {
    throw new Error(error.message);
  }
}

async function resolveOrganizationIdForScope(pharmacyId: string): Promise<string> {
  const { data, error } = await supabase
    .from("pharmacies")
    .select("organization_id")
    .eq("id", pharmacyId)
    .maybeSingle();

  if (error || !data?.organization_id) {
    return `org-${pharmacyId}`;
  }
  return String(data.organization_id);
}

/** @deprecated use createPharmacy — kept for branch UI compatibility */
export async function createPharmacyBranch(branch: Partial<PharmacySettings> & { id: string }) {
  const scopeId = resolveStampPharmacyId();
  const organizationId = await resolveOrganizationIdForScope(scopeId);
  const pharmacies = await getPharmacies();
  const branchCount = pharmacies.filter((row) => row.organizationId === organizationId).length;
  const maxBranches =
    pharmacies.find((row) => row.organizationId === organizationId)?.maxBranches ?? 1;
  if (branchCount >= maxBranches) {
    throw new Error("branch_limit_reached");
  }
  return createPharmacy({
    id: branch.id,
    name: branch.name || branch.id,
    name_en: branch.name_en,
    phone: branch.phone,
    address: branch.address,
    currency: branch.currency,
    organizationId,
  });
}

export async function copyPharmacySettingsFromBranch(
  sourceBranchId: string,
  targetBranchId: string,
) {
  if (!sourceBranchId || sourceBranchId === targetBranchId) return;

  const source = await getPharmacySettings(sourceBranchId);
  if (!source) {
    throw new Error("source_branch_not_found");
  }

  await updatePharmacySettings(targetBranchId, extractCopyableBranchSettings(source));
}

export async function updatePharmacyStatus(
  pharmacyId: string,
  status: { isActive?: boolean; subscriptionStatus?: string; subscriptionPlan?: string },
) {
  const payload = toSnakeCase({ id: pharmacyId, ...status });
  const { error } = await supabase.from("pharmacies").update(payload).eq("id", pharmacyId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function linkPharmacyUser(params: {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  pharmacyId: string;
}) {
  const { error } = await supabase.from("users").insert([
    {
      uid: params.uid,
      name: params.name.trim(),
      email: params.email.trim().toLowerCase(),
      role: params.role,
      pharmacy_id: params.pharmacyId,
      is_active: true,
    },
  ]);
  if (error && !error.message.toLowerCase().includes("duplicate")) {
    throw new Error(error.message);
  }
}

export async function createPharmacyUser(params: CreatePharmacyUserInput): Promise<string> {
  if (params.uid) {
    await linkPharmacyUser({
      uid: params.uid,
      name: params.name,
      email: params.email,
      role: params.role,
      pharmacyId: params.pharmacyId,
    });
    return params.uid;
  }
  if (!params.password) {
    throw new Error("password_required");
  }
  return createSystemUser({
    email: params.email,
    password: params.password,
    name: params.name,
    role: params.role,
    pharmacyId: params.pharmacyId,
  });
}

export async function deletePharmacy(id: string) {
  const { error } = await supabase.from("pharmacies").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function getAllSystemUsers(): Promise<SystemUser[]> {
  if (!isSuperAdmin(getCurrentAppUser())) {
    return [];
  }
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("email", { ascending: true });
  if (error) {
    console.error("getAllSystemUsers error:", error.message);
    return [];
  }
  return (data || []).map((row) => normalizeAppUser(toCamelCase<AppUser>(row)));
}

export async function getSystemUsers(pharmacyId: string): Promise<SystemUser[]> {
  const rows = await getRows<SystemUser>("users", "uid", false, 100, {
    column: "pharmacy_id",
    value: pharmacyId,
  });
  return rows.map((row) => normalizeAppUser(row));
}

export async function getSystemUsersForPharmacies(pharmacyIds: string[]): Promise<SystemUser[]> {
  const ids = [...new Set(pharmacyIds.filter(Boolean))];
  if (ids.length === 0) return [];
  if (ids.length === 1) return getSystemUsers(ids[0]);

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .in("pharmacy_id", ids)
    .order("uid", { ascending: true })
    .limit(500);

  if (error) {
    console.error("getSystemUsersForPharmacies error:", error.message);
    return [];
  }

  return (data || []).map((row) => normalizeAppUser(toCamelCase<AppUser>(row)));
}

export function subscribeUsers(pharmacyId: string, callback: (users: SystemUser[]) => void) {
  return subscribeTable<SystemUser>(
    "users",
    (rows) => callback(rows.map((row) => normalizeAppUser(row))),
    "uid",
    false,
    100,
    {
      column: "pharmacy_id",
      value: pharmacyId,
    },
  );
}

export async function updateSystemUser(uid: string, updates: Partial<SystemUser>) {
  const payload = toSnakeCase(updates);
  const { error } = await supabase.from("users").update(payload).eq("uid", uid);
  if (error) {
    throw new Error(error.message);
  }
}

export function validateNewUserEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized)) {
    return "invalid_format";
  }
  return null;
}

export async function createSystemUser(params: {
  email: string;
  password: string;
  name: string;
  role: AppUser["role"];
  pharmacyId: string;
  employeeId?: string;
  username?: string;
}): Promise<string> {
  const email = params.email.trim().toLowerCase();
  const role = normalizeRole(params.role);

  const emailIssue = validateNewUserEmail(email);
  if (emailIssue === "invalid_format") {
    throw new Error("email_address_invalid_format");
  }

  const ephemeral = createEphemeralSupabase();

  const { data: authData, error: authError } = await ephemeral.auth.signUp({
    email,
    password: params.password,
    options: {
      data: {
        name: params.name.trim(),
        role,
        pharmacy_id: params.pharmacyId,
      },
    },
  });

  if (authError) {
    const code = (authError as { code?: string }).code || "";
    if (code === "email_address_invalid") {
      throw new Error("email_domain_rejected");
    }
    if (code === "email_address_not_authorized") {
      throw new Error("email_not_authorized");
    }
    if (code === "over_email_send_rate_limit") {
      throw new Error("over_email_send_rate_limit");
    }
    throw new Error(authError.message);
  }

  const uid = authData.user?.id;
  if (!uid) {
    throw new Error("auth_pending_confirmation");
  }

  const { error: insertError } = await supabase.from("users").insert([
    {
      uid,
      employee_id: params.employeeId || null,
      username: params.username?.trim() || null,
      name: params.name.trim(),
      email,
      role,
      pharmacy_id: params.pharmacyId,
      is_active: true,
    },
  ]);

  if (insertError && !insertError.message.toLowerCase().includes("duplicate")) {
    throw new Error(insertError.message);
  }

  if (insertError?.message.toLowerCase().includes("duplicate") && params.employeeId) {
    await linkUserToEmployee(uid, params.employeeId);
  }

  return uid;
}

export async function registerPublicUser(params: {
  email: string;
  password: string;
  name: string;
  pharmacyName: string;
}): Promise<{ needsEmailConfirmation: boolean }> {
  const email = params.email.trim().toLowerCase();
  const name = params.name.trim();
  const pharmacyName = params.pharmacyName.trim();
  const password = params.password;

  const emailIssue = validateNewUserEmail(email);
  if (emailIssue === "invalid_format") {
    throw new Error("email_address_invalid_format");
  }

  if (!name) {
    throw new Error("name_required");
  }

  if (pharmacyName.length < 2) {
    throw new Error("pharmacy_name_required");
  }

  if (!password || password.length < 6) {
    throw new Error("password_too_short");
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role: "pharmacy_admin",
        signup_type: "trial_pharmacy",
        pharmacy_name: pharmacyName,
      },
    },
  });

  if (authError) {
    const code = (authError as { code?: string }).code || "";
    if (code === "email_address_invalid") {
      throw new Error("email_domain_rejected");
    }
    if (code === "email_address_not_authorized") {
      throw new Error("email_not_authorized");
    }
    if (code === "over_email_send_rate_limit") {
      throw new Error("over_email_send_rate_limit");
    }
    throw new Error(authError.message);
  }

  if (!authData.user?.id) {
    throw new Error("auth_pending_confirmation");
  }

  if (authData.session) {
    await provisionTrialPharmacy(pharmacyName);
    return { needsEmailConfirmation: false };
  }

  return { needsEmailConfirmation: true };
}

export async function sendPasswordResetEmail(email: string) {
  const base = import.meta.env.BASE_URL || "/";
  const redirectTo = `${window.location.origin}${base}`;
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteSystemUser(uid: string) {
  const { error } = await supabase.from("users").delete().eq("uid", uid);
  if (error) {
    throw new Error(error.message);
  }
}

export async function unlinkLoginAccountFromSystem(
  uid: string,
  accountId?: string,
  revokedBy?: string,
) {
  const { error } = await supabase.rpc("revoke_user_app_access", {
    p_uid: uid,
    p_account_id: accountId || null,
    p_revoked_by: revokedBy || null,
    p_reason: "unlink",
  });

  if (error) {
    if (
      error.message.includes("revoke_user_app_access") &&
      error.message.includes("does not exist")
    ) {
      throw new Error("revoke_rpc_not_configured");
    }
    throw new Error(error.message);
  }
}

export function subscribeUserAccessRevocation(uid: string, onRevoked: () => void) {
  const channel = supabase
    .channel(`user-access-revoke-${uid}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "user_session_revocations",
        filter: `uid=eq.${uid}`,
      },
      () => onRevoked(),
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
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
    void supabase.removeChannel(channel);
  };
}

export async function isAppUserStillActive(uid: string): Promise<boolean> {
  const user = await getAppUserByUid(uid);
  return Boolean(user?.isActive);
}
