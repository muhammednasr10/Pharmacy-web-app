import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import * as pharmacyService from "../services/pharmacyService";
import type { AppUser, PharmacySettings, SystemUser, UserRole } from "../types";
import type { SubscriptionTier } from "../config/subscriptionTiers";
import { isSuperAdmin } from "../utils/roles";
import { formatUserCreationError } from "../utils/userCreationErrors";
import { formatBranchLimitError } from "../utils/orgAdminErrors";
import { formatCreatePharmacyError } from "../utils/createPharmacyErrors";
import {
  resolveOrganizationId,
  resolveOrganizationPrimaryPharmacy,
} from "../utils/branchLimits";
import { countOrganizationUsers } from "../utils/userLimits";

export type TenantFormState = {
  id: string;
  name: string;
  name_en: string;
  phone: string;
  address: string;
  packageChoice: SubscriptionTier | "custom";
  subscriptionTier: SubscriptionTier;
  maxBranches: number;
  maxUsers: number;
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
      packageChoice: "basic",
      subscriptionTier: "basic",
      maxBranches: 1,
      maxUsers: 5,
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
    if (tenantForm.maxBranches < 1 || tenantForm.maxUsers < 1) {
      alert(
        isArabic
          ? "حدود الفروع والمستخدمين يجب أن تكون أكبر من صفر"
          : "Branch and user limits must be greater than zero",
      );
      return false;
    }
    setCreatingTenant(true);
    try {
      const subscriptionTier =
        tenantForm.packageChoice === "custom" ? "premium" : tenantForm.subscriptionTier;
      await pharmacyService.createPharmacy({
        id,
        name,
        name_en: tenantForm.name_en.trim() || name,
        phone: tenantForm.phone.trim(),
        address: tenantForm.address.trim(),
        subscriptionTier,
        subscriptionPlan: "monthly",
        subscriptionStatus: "active",
        maxBranches: tenantForm.maxBranches,
        maxUsers: tenantForm.maxUsers,
      });
      setBranches(await pharmacyService.getPharmacies());
      setSelectedTenantId(id);
      resetTenantForm();
      alert(isArabic ? "تم إنشاء الصيدلية بنجاح" : "Pharmacy created successfully");
      return true;
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? formatCreatePharmacyError(error.message, isArabic)
          : isArabic
            ? "تعذر إنشاء الصيدلية"
            : "Could not create pharmacy";
      alert(message);
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

  const handleUpdateOrganizationMaxUsers = useCallback(
    async (organizationId: string, maxUsers: number): Promise<boolean> => {
      if (!isSuperAdmin(appUser)) return false;
      const orgPharmacyIds = branches
        .filter((branch) => (branch.organizationId || `org-${branch.id}`) === organizationId)
        .map((branch) => branch.id);
      const used = countOrganizationUsers(
        (await pharmacyService.getAllSystemUsers()).filter((user) =>
          orgPharmacyIds.includes(user.pharmacyId || ""),
        ),
        branches,
        organizationId,
      );
      if (maxUsers < used) {
        alert(
          isArabic
            ? `لا يمكن تقليل الحد عن المستخدمين الحاليين (${used})`
            : `Cannot set limit below current users (${used})`,
        );
        return false;
      }
      try {
        await pharmacyService.updateOrganizationMaxUsers(organizationId, maxUsers, appUser);
        setBranches(await pharmacyService.getPharmacies());
        alert(isArabic ? "تم تحديث حد المستخدمين" : "User limit updated");
        return true;
      } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : "";
        alert(
          formatBranchLimitError(message, isArabic) ||
            (isArabic ? "تعذر تحديث حد المستخدمين" : "Could not update user limit"),
        );
        return false;
      }
    },
    [appUser, branches, isArabic, setBranches],
  );

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

  const handleUpdateOrganizationFreeTrial = useCallback(
    async (
      organizationId: string,
      params: { enabled: boolean; endDate: string },
    ): Promise<boolean> => {
      if (!isSuperAdmin(appUser)) return false;
      try {
        await pharmacyService.updateOrganizationFreeTrial(organizationId, params, appUser);
        setBranches(await pharmacyService.getPharmacies());
        alert(
          params.enabled
            ? isArabic
              ? "تم تفعيل النسخة المجانية"
              : "Free trial enabled"
            : isArabic
              ? "تم إيقاف النسخة المجانية"
              : "Free trial disabled",
        );
        return true;
      } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : "";
        const trialError =
          message === "trial_end_date_required"
            ? isArabic
              ? "حدد تاريخ انتهاء النسخة المجانية"
              : "Set a free trial end date"
            : message === "trial_end_date_past"
              ? isArabic
                ? "تاريخ الانتهاء يجب أن يكون اليوم أو بعده"
                : "End date must be today or later"
              : message === "invalid_end_date"
                ? isArabic
                  ? "تاريخ غير صالح"
                  : "Invalid date"
                : "";
        alert(trialError || (isArabic ? "تعذر تحديث النسخة المجانية" : "Could not update free trial"));
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

  const handleOpenTenantUsers = useCallback(
    (pharmacyId: string) => {
      if (!isSuperAdmin(appUser)) return;
      setActiveBranchId(pharmacyId);
      setSelectedTenantId(pharmacyId);
      pharmacyService.setActivePharmacy(pharmacyId);
      setActivePage("users");
    },
    [appUser, setActiveBranchId, setActivePage, setSelectedTenantId],
  );

  const handleUpdateOrganizationBranch = useCallback(
    async (
      branchId: string,
      branch: { name: string; name_en?: string; phone?: string; address?: string },
    ): Promise<boolean> => {
      if (!isSuperAdmin(appUser)) return false;
      const name = branch.name.trim();
      if (!name) {
        alert(isArabic ? "أدخل اسم الفرع" : "Enter branch name");
        return false;
      }
      try {
        await pharmacyService.updatePharmacySettings(branchId, {
          name,
          name_en: branch.name_en?.trim() || name,
          phone: branch.phone?.trim() || "",
          address: branch.address?.trim() || "",
        });
        setBranches(await pharmacyService.getPharmacies());
        alert(isArabic ? "تم تحديث الفرع" : "Branch updated");
        return true;
      } catch (error) {
        console.error(error);
        alert(isArabic ? "تعذر تحديث الفرع" : "Could not update branch");
        return false;
      }
    },
    [appUser, isArabic, setBranches],
  );

  const handleDeleteOrganization = useCallback(
    async (organizationId: string): Promise<boolean> => {
      if (!isSuperAdmin(appUser)) return false;
      const orgBranches = branches.filter(
        (branch) => resolveOrganizationId(branch) === organizationId,
      );
      if (orgBranches.length === 0) return false;

      try {
        await pharmacyService.deleteOrganization(organizationId);
        const deletedIds = new Set(orgBranches.map((branch) => branch.id));
        if (deletedIds.has(selectedTenantId)) {
          const remaining = branches.filter((branch) => !deletedIds.has(branch.id));
          setSelectedTenantId(remaining[0]?.id || "");
        }
        if (activeBranchId && deletedIds.has(activeBranchId)) {
          setActiveBranchId(appUser?.pharmacyId || null);
        }
        setSystemUsers(await pharmacyService.getAllSystemUsers());
        setBranches(await pharmacyService.getPharmacies());
        alert(
          isArabic
            ? "تم حذف الصيدلية وجميع فروعها"
            : "Pharmacy and all branches were deleted",
        );
        return true;
      } catch (error) {
        console.error(error);
        setBranches(await pharmacyService.getPharmacies());
        const message = error instanceof Error ? error.message : "";
        const needsCascadeSql =
          message === "delete_organization_cascade_missing" ||
          message.includes("delete_organization_cascade") ||
          message.includes("delete_pharmacy_cascade") ||
          message.includes("could not find the function") ||
          /foreign key|violates foreign key|23503/i.test(message);
        alert(
          needsCascadeSql
            ? isArabic
              ? "شغّل ملف delete-pharmacy-cascade.sql في Supabase SQL Editor ثم أعد المحاولة"
              : "Run delete-pharmacy-cascade.sql in Supabase SQL Editor, then try again"
            : message.toLowerCase().includes("forbidden")
              ? isArabic
                ? "غير مسموح — لازم تكون Super Admin ومسجّل دخول بصلاحية كاملة"
                : "Forbidden — you must be signed in as Super Admin"
              : isArabic
                ? `تعذر الحذف${message ? `: ${message}` : ""}`
                : `Could not delete${message ? `: ${message}` : ""}`,
        );
        return false;
      }
    },
    [
      activeBranchId,
      appUser,
      branches,
      isArabic,
      selectedTenantId,
      setActiveBranchId,
      setBranches,
      setSelectedTenantId,
      setSystemUsers,
    ],
  );

  const handleDeleteOrganizationBranch = useCallback(
    async (branchId: string, organizationId: string): Promise<boolean> => {
      if (!isSuperAdmin(appUser)) return false;
      const used = branches.filter(
        (branch) => resolveOrganizationId(branch) === organizationId,
      ).length;
      if (used <= 1) {
        alert(
          isArabic ? "لا يمكن حذف آخر فرع في الصيدلية" : "Cannot delete the last branch in this pharmacy",
        );
        return false;
      }
      try {
        await pharmacyService.deletePharmacy(branchId);
        setBranches(await pharmacyService.getPharmacies());
        alert(isArabic ? "تم حذف الفرع" : "Branch deleted");
        return true;
      } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : "";
        alert(
          message.includes("delete_pharmacy_cascade") ||
            message.includes("could not find the function")
            ? isArabic
              ? "شغّل ملف delete-pharmacy-cascade.sql في Supabase ثم أعد المحاولة"
              : "Run delete-pharmacy-cascade.sql in Supabase, then try again"
            : isArabic
              ? "تعذر حذف الفرع — قد يكون مرتبطاً ببيانات (أدوية أو فواتير)"
              : "Could not delete branch — it may still contain medicines or invoices",
        );
        return false;
      }
    },
    [appUser, branches, isArabic, setBranches],
  );

  const handleCreateOrganizationBranch = useCallback(
    async (
      anchorPharmacyId: string,
      branch: { id: string; name: string; name_en?: string; phone?: string; address?: string },
    ): Promise<boolean> => {
      if (!isSuperAdmin(appUser)) return false;
      try {
        await pharmacyService.createPharmacyBranchForAnchor(anchorPharmacyId, branch);
        setBranches(await pharmacyService.getPharmacies());
        alert(isArabic ? "تم إضافة الفرع بنجاح" : "Branch added successfully");
        return true;
      } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : "";
        alert(
          formatBranchLimitError(message, isArabic) ||
            (isArabic ? "تعذر إضافة الفرع" : "Could not add branch"),
        );
        return false;
      }
    },
    [appUser, isArabic, setBranches],
  );

  const handleDeleteTenantStaff = useCallback(
    async (target: { uid?: string; employeeId?: string }): Promise<boolean> => {
      if (!isSuperAdmin(appUser) || !appUser) return false;
      if (!target.employeeId && !target.uid) return false;
      try {
        if (target.employeeId) {
          await pharmacyService.deletePharmacyEmployeeCascade(target.employeeId, {
            revokedBy: appUser.uid,
            actingUser: appUser,
          });
        } else if (target.uid) {
          await pharmacyService.deletePharmacyUserCascade(target.uid, {
            revokedBy: appUser.uid,
            actingUser: appUser,
          });
        }
        setSystemUsers(await pharmacyService.getAllSystemUsers());
        alert(isArabic ? "تم الحذف من الصيدلية" : "Removed from pharmacy");
        return true;
      } catch (error) {
        console.error(error);
        const message = error instanceof Error ? error.message : "";
        alert(
          message === "cannot_delete_super_admin"
            ? isArabic
              ? "لا يمكن حذف مالك النظام"
              : "Cannot delete system owner"
            : message || (isArabic ? "تعذر الحذف" : "Could not delete"),
        );
        return false;
      }
    },
    [appUser, isArabic, setSystemUsers],
  );

  const refreshPharmacies = useCallback(async () => {
    setBranches(await pharmacyService.getPharmacies());
  }, [setBranches]);

  return {
    resetTenantForm,
    resetTenantUserForm,
    handleCreateTenant,
    handleCreateTenantUser,
    handleCreateOrganizationBranch,
    handleUpdateOrganizationBranch,
    handleDeleteOrganization,
    handleDeleteOrganizationBranch,
    handleDeleteTenantStaff,
    handleUpdateSubscriptionTier,
    handleUpdateOrganizationFreeTrial,
    handleUpdateOrganizationMaxBranches,
    handleUpdateOrganizationMaxUsers,
    handleUpdateTenantStatus,
    handleSwitchTenantView,
    handleOpenTenantUsers,
    refreshPharmacies,
  };
}
