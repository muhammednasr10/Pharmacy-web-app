import { getRoleLabel, isBranchManager } from "../utils/roles";
import type { AppUser } from "../types";
import type { BranchDisplayInfo } from "../utils/branchDisplay";

type BranchScopeBannerProps = {
  isArabic: boolean;
  appUser: AppUser | null;
  branchDisplay?: BranchDisplayInfo | null;
};

export default function BranchScopeBanner({
  isArabic,
  appUser,
  branchDisplay,
}: BranchScopeBannerProps) {
  if (!appUser || !isBranchManager(appUser)) return null;

  const roleLabel = getRoleLabel(appUser.role, isArabic);
  const pharmacyName = branchDisplay?.organizationName || "—";
  const branchName = branchDisplay?.branchSiteName || appUser.pharmacyId || "—";

  return (
    <div className="branchScopeBanner" dir={isArabic ? "rtl" : "ltr"}>
      <strong>{roleLabel}</strong>
      <span>
        {isArabic
          ? `الصيدلية: ${pharmacyName} — الفرع: ${branchName} — التعديلات والحذف الحساس مقيد على هذا الفرع فقط.`
          : `Pharmacy: ${pharmacyName} — Branch: ${branchName} — sensitive edits are limited to this branch.`}
      </span>
    </div>
  );
}
