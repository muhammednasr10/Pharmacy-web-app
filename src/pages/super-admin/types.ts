import type {
  AppUser,
  PharmacyCustomRole,
  PharmacyLoginAccount,
  PharmacySignupRequest,
  PharmacySettings,
  SubscriptionRequest,
  UserRole,
} from "../../types";
import type { SubscriptionTier } from "../../config/subscriptionTiers";

export type TenantPackageChoice = SubscriptionTier | "custom";

export type TenantForm = {
  id: string;
  name: string;
  name_en: string;
  phone: string;
  address: string;
  packageChoice: TenantPackageChoice;
  subscriptionTier: SubscriptionTier;
  maxBranches: number;
  maxUsers: number;
};

export type BranchForm = {
  id: string;
  name: string;
  name_en: string;
  phone: string;
  address: string;
};

export const emptyBranchForm: BranchForm = {
  id: "",
  name: "",
  name_en: "",
  phone: "",
  address: "",
};

export type RoleFormState = {
  id: string;
  roleKey: string;
  kind: "builtin" | "custom";
  nameAr: string;
  nameEn: string;
  baseRole: UserRole;
  pharmacyId: string;
};

export const emptyRoleForm: RoleFormState = {
  id: "",
  roleKey: "",
  kind: "custom",
  nameAr: "",
  nameEn: "",
  baseRole: "cashier",
  pharmacyId: "",
};

export type ProgramRoleRow = {
  id: string;
  roleKey: string;
  label: string;
  kind: "builtin" | "custom";
  customRole?: PharmacyCustomRole;
  isPending: boolean;
};

export type ManageUnifiedRoleRow = {
  id: string;
  roleKey: string;
  label: string;
  pharmacyId: string;
  kind: "builtin" | "custom";
  customRole?: PharmacyCustomRole;
  users: AppUser[];
  isPending: boolean;
};

export type ManageRoleAccountDisplayRow = {
  id: string;
  roleRow: ManageUnifiedRoleRow;
  user: AppUser;
};

export type SaasTab = "overview" | "pharmacies" | "roles" | "customerRequests" | "packages";

export const emptySystemUserForm = {
  pharmacyId: "",
  email: "",
  password: "",
  role: "cashier" as UserRole,
  isActive: true,
};

export type DeleteTarget =
  | {
      kind: "organization";
      organizationId: string;
      pharmacy: PharmacySettings;
      branchCount: number;
    }
  | { kind: "branch"; branch: PharmacySettings; organizationId: string };

export type SuperAdminPageProps = {
  isArabic: boolean;
  operatorUid?: string;
  pharmacies: PharmacySettings[];
  systemUsers: AppUser[];
  selectedPharmacyId: string;
  onSelectPharmacy: (id: string) => void;
  onSwitchTenant: (id: string) => void;
  onOpenTenantUsers: (id: string) => void;
  tenantForm: TenantForm;
  onTenantFormChange: (updates: Partial<TenantForm>) => void;
  onResetTenantForm: () => void;
  onCreateTenant: () => Promise<boolean>;
  creatingTenant: boolean;
  onCreateOrganizationBranch: (
    anchorPharmacyId: string,
    branch: { id: string; name: string; name_en?: string; phone?: string; address?: string },
  ) => Promise<boolean>;
  onUpdateOrganizationBranch: (
    branchId: string,
    branch: { name: string; name_en?: string; phone?: string; address?: string },
  ) => Promise<boolean>;
  onDeleteOrganization: (organizationId: string) => Promise<boolean>;
  onDeleteOrganizationBranch: (branchId: string, organizationId: string) => Promise<boolean>;
  onUpdateTenantStatus: (pharmacyId: string, status: "active" | "suspended") => Promise<boolean>;
  onUpdateMaxBranches: (organizationId: string, maxBranches: number) => Promise<boolean>;
  onUpdateMaxUsers: (organizationId: string, maxUsers: number) => Promise<boolean>;
  onUpdateOrganizationFreeTrial: (
    organizationId: string,
    params: { enabled: boolean; endDate: string },
  ) => Promise<boolean>;
  onUpdateSubscriptionTier: (organizationId: string, tier: SubscriptionTier) => Promise<boolean>;
  subscriptionRequests: SubscriptionRequest[];
  onApproveSubscriptionRequest: (requestId: number) => Promise<boolean>;
  onRejectSubscriptionRequest: (requestId: number, note?: string) => Promise<boolean>;
  pendingPharmacyLoginAccounts: PharmacyLoginAccount[];
  pendingPharmacySignupRequests: PharmacySignupRequest[];
  pendingCustomRoles: PharmacyCustomRole[];
  onApprovePharmacyLoginAccount: (accountId: string) => Promise<boolean>;
  onRejectPharmacyLoginAccount: (accountId: string, note?: string) => Promise<boolean>;
  onApprovePharmacySignupRequest: (
    requestId: string,
    options?: { subscriptionTier?: string; reviewNote?: string },
  ) => Promise<boolean>;
  onRejectPharmacySignupRequest: (requestId: string, note?: string) => Promise<boolean>;
  onRefreshAdminRequests: () => Promise<void>;
  onRefreshSystemUsers: () => Promise<void>;
  onRefreshPharmacies: () => Promise<void>;
};
