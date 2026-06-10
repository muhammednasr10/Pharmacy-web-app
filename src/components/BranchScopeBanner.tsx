import { getRoleLabel, isBranchManager } from "../utils/roles";
import type { AppUser } from "../types";

type BranchScopeBannerProps = {
  isArabic: boolean;
  appUser: AppUser | null;
  branchLabel?: string;
};

export default function BranchScopeBanner({
  isArabic,
  appUser,
  branchLabel,
}: BranchScopeBannerProps) {
  if (!appUser || !isBranchManager(appUser)) return null;

  const roleLabel = getRoleLabel(appUser.role, isArabic);
  const branch = branchLabel || appUser.pharmacyId || "—";

  return (
    <div className="branchScopeBanner" dir={isArabic ? "rtl" : "ltr"}>
      <strong>{roleLabel}</strong>
      <span>
        {isArabic
          ? `أنت تعمل على فرع: ${branch} — التعديلات والحذف الحساس مقيد على هذا الفرع فقط.`
          : `You are scoped to branch: ${branch} — sensitive edits are limited to this branch.`}
      </span>
    </div>
  );
}
