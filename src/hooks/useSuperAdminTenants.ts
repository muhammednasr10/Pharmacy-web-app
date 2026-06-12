import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import * as pharmacyService from "../services/pharmacyService";
import type { AppUser, PharmacySettings, SystemUser, UserRole } from "../types";
import type { SubscriptionTier } from "../config/subscriptionTiers";
import { isSuperAdmin } from "../utils/roles";
import { formatUserCreationError } from "../utils/userCreationErrors";
import { formatBranchLimitError } from "../utils/orgAdminErrors";

export type TenantFormState = {
  id: string;
  name: string;
  name_en: string;
  phone: string;
  address: string;
  subscriptionTier: SubscriptionTier;
  maxBranches: number;
};

export type TenantUserFormState = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  uid: string;
  pharmacyId: string;
};

type UseSuperAdminTenantsOptions = {
  isArabic: boolean;
  appUser: AppUser | null;
  branches: PharmacySettings[];
  setBranches: Dispatch<SetStateAction<PharmacySettings[]>>;
  setSystemUsers: Dispatch<SetStateAction<SystemUser[]>>;
  selectedTenantId: string;
  setSelectedTenantId: Dispatch<SetStateAction<string>>;
  tenantForm: TenantFormState;
  setTenantForm: Dispatch<SetStateAction<TenantFormState>>;
  tenantUserForm: TenantUserFormState;
  setTenantUserForm: Dispatch<SetStateAction<TenantUserFormState>>;
  setCreatingTenant: Dispatch<SetStateAction<boolean>>;
  setCreatingTenantUser: Dispatch<SetStateAction<boolean>>;
  activeBranchId: string | null;
  setActiveBranchId: Dispatch<SetStateAction<string | null>>;
  setActivePage: Dispatch<SetStateAction<import("../types").Page>>;
};

function defaultPharmacyIdForTenantUser(
  selectedTenantId: string,
  activeBranchId: string | null,
  appUser: AppUser | null,
  branches: PharmacySettings[],
): string {
  return selectedTenantId || activeBranchId || appUser?.pharmacyId || branches[0]?.id || "main";
}

export function useSuperAdminTenants({
  isArabic,
  appUser,
  branches,
  setBranches,
  setSystemUsers,
  selectedTenantId,
  setSelectedTenantId,
  tenantForm,
  setTenantForm,
  tenantUserForm,
  setTenantUserForm,
  setCreatingTenant,
  setCreatingTenantUser,
  activeBranchId,
  setActiveBranchId,
  setActivePage,
}: UseSuperAdminTenantsOptions) {
  const resetTenantForm = useCallback(() => {
    setTenantForm({
      id: "",
      name: "",
      name_en: "",
      phone: "",
      address: "",
      subscriptionTier: "basic",
      maxBranches: 1,
    });
  }, [setTenantForm]);

  const resetTenantUserForm = useCallback(() => {
    setTenantUserForm({
      name: "",
      email: "",
      password: "",
      role: "pharmacy_admin",
      uid: "",
      pharmacyId: defaultPharmacyIdForTenantUser(
        selectedTenantId,
        activeBranchId,
        appUser,
        branches,
      ),
    });
  }, [activeBranchId, appUser, branches, selectedTenantId, setTenantUserForm]);

  const handleCreateTenant = useCallback(async (): Promise<boolean> => {
    if (!isSuperAdmin(appUser)) return false;
    const id = tenantForm.id
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-");
    const name = tenantForm.name.trim();
    if (!id || !name) {
      alert(isArabic ? "أدخل المعرف واسم الصيدلية" : "Enter pharmacy ID and name");
      return false;
    }
    setCreatingTenant(true);
    try {
      await pharmacyService.createPharmacy({
        id,
        name,
        name_en: tenantForm.name_en.trim() || name,
        phone: tenantForm.phone.trim(),
        address: tenantForm.address.trim(),
        subscriptionTier: tenantForm.subscriptionTier,
        subscriptionPlan: "monthly",
        subscriptionStatus: "active",
        maxBranches: tenantForm.maxBranches,
      });
      setBranches(await pharmacyService.getPharmacies());
      setSelectedTenantId(id);
      resetTenantForm();
      alert(isArabic ? "تم إنشاء الصيدلية بنجاح" : "Pharmacy created successfully");
      return true;
    } catch (error) {
      console.error(error);
      alert(isArabic ? "تعذر إنشاء الصيدلية" : "Could not create pharmacy");
      return false;
    } finally {
      setCreatingTenant(false);
    }
  }, [
    appUser,
    isArabic,
    resetTenantForm,
    setBranches,
    setCreatingTenant,
    setSelectedTenantId,
    tenantForm,
  ]);

  const handleCreateTenantUser = useCallback(async (): Promise<boolean> => {
    const targetPharmacyId = tenantUserForm.pharmacyId || selectedTenantId;
    if (!isSuperAdmin(appUser) || !targetPharmacyId) return false;
    if (!tenantUserForm.name.trim() || !tenantUserForm.email.trim()) {
      alert(isArabic ? "أكمل الاسم والإيميل" : "Fill name and email");
      return false;
    }
    if (!tenantUserForm.uid.trim() && !tenantUserForm.password) {
      alert(
        isArabic
          ? "أدخل UID لمستخدم Auth موجود أو كلمة مرور لحساب جديد"
          : "Enter UID for existing Auth user or password for new account",
      );
      return false;
    }
    setCreatingTenantUser(true);
    try {
      await pharmacyService.createPharmacyUser({
        uid: tenantUserForm.uid.trim() || undefined,
        name: tenantUserForm.name.trim(),
        email: tenantUserForm.email.trim(),
        password: tenantUserForm.password || undefined,
        role: tenantUserForm.role,
        pharmacyId: targetPharmacyId,
      });
      setSystemUsers(await pharmacyService.getAllSystemUsers());
      resetTenantUserForm();
      alert(isArabic ? "تم إضافة المستخدم بنجاح" : "User added successfully");
      return true;
    } catch (error) {
      console.error(error);
      const raw = error instanceof Error ? error.message : "";
      alert(
        formatUserCreationError(raw, isArabic) ||
          (isArabic ? "تعذر إضافة المستخدم" : "Could not add user"),
      );
      return false;
    } finally {
      setCreatingTenantUser(false);
    }
  }, [
    appUser,
    isArabic,
    resetTenantUserForm,
    selectedTenantId,
    setCreatingTenantUser,
    setSystemUsers,
    tenantUserForm,
  ]);

  const handleUpdateSubscriptionTier = useCallback(
    async (organizationId: string, tier: SubscriptionTier): Promise<boolean> => {
      if (!isSuperAdmin(appUser)) return false;
      try {
        await pharmacyService.updateOrganizationSubscriptionTier(organizationId, tier, appUser);
        setBranches(await pharmacyService.getPharmacies());
        alert(isArabic ? "تم تحديث الباقة" : "Package updated");
        return true;
      } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : "";
        alert(
          formatBranchLimitError(message, isArabic) ||
            (isArabic ? "تعذر تحديث الباقة" : "Could not update package"),
        );
        return false;
      }
    },
    [appUser, isArabic, setBranches],
  );

  const handleUpdateOrganizationMaxBranches = useCallback(
    async (organizationId: string, maxBranches: number): Promise<boolean> => {
      if (!isSuperAdmin(appUser)) return false;
      const used = branches.filter(
        (branch) => (branch.organizationId || `org-${branch.id}`) === organizationId,
      ).length;
      if (maxBranches < used) {
        alert(
          isArabic
            ? `لا يمكن تقليل الحد عن الفروع الحالية (${used})`
            : `Cannot set limit below current branches (${used})`,
        );
        return false;
      }
      try {
        await pharmacyService.updateOrganizationMaxBranches(organizationId, maxBranches, appUser);
        setBranches(await pharmacyService.getPharmacies());
        alert(isArabic ? "تم تحديث حد الفروع" : "Branch limit updated");
        return true;
      } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : "";
        alert(
          formatBranchLimitError(message, isArabic) ||
            (isArabic ? "تعذر تحديث حد الفروع" : "Could not update branch limit"),
        );
        return false;
      }
    },
    [appUser, branches, isArabic, setBranches],
  );

  const handleUpdateTenantStatus = useCallback(
    async (pharmacyId: string, status: "active" | "suspended"): Promise<boolean> => {
      if (!isSuperAdmin(appUser)) return false;
      try {
        await pharmacyService.updatePharmacyStatus(pharmacyId, {
          subscriptionStatus: status === "active" ? "active" : "suspended",
          isActive: status === "active",
        });
        setBranches(await pharmacyService.getPharmacies());
        alert(
          status === "active"
            ? isArabic
              ? "تم تفعيل الصيدلية"
              : "Pharmacy activated"
            : isArabic
              ? "تم إيقاف الصيدلية"
              : "Pharmacy suspended",
        );
        return true;
      } catch (error) {
        console.error(error);
        alert(isArabic ? "تعذر تحديث الحالة" : "Could not update status");
        return false;
      }
    },
    [appUser, isArabic, setBranches],
  );

  const handleSwitchTenantView = useCallback(
    (pharmacyId: string) => {
      if (!isSuperAdmin(appUser)) return;
      setActiveBranchId(pharmacyId);
      setSelectedTenantId(pharmacyId);
      pharmacyService.setActivePharmacy(pharmacyId);
      setActivePage("dashboard");
    },
    [appUser, setActiveBranchId, setActivePage, setSelectedTenantId],
  );

  return {
    resetTenantForm,
    resetTenantUserForm,
    handleCreateTenant,
    handleCreateTenantUser,
    handleUpdateSubscriptionTier,
    handleUpdateOrganizationMaxBranches,
    handleUpdateTenantStatus,
    handleSwitchTenantView,
  };
}
