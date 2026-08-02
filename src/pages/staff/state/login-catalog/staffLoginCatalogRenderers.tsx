import type { PharmacyLoginAccount, SystemUser } from "../../../../types";

export function createStaffLoginCatalogRenderers(isArabic: boolean) {
  function renderLoginAccountLinkStatus(
    acc: PharmacyLoginAccount,
    linkedUser: SystemUser | undefined,
  ) {
    if (acc.status === "pending") {
      return (
        <span className="badge warn">{isArabic ? "بانتظار الاعتماد" : "Pending approval"}</span>
      );
    }
    if (acc.editPending) {
      return (
        <span className="badge warn">{isArabic ? "تعديل بانتظار الاعتماد" : "Edit pending"}</span>
      );
    }
    if (acc.status === "rejected") {
      return <span className="badge danger">{isArabic ? "مرفوض" : "Rejected"}</span>;
    }
    if (linkedUser) {
      return (
        <span className="badge ok">{isArabic ? "مربوط بقاعدة البيانات" : "Linked to database"}</span>
      );
    }
    return (
      <span className="badge warn">{isArabic ? "غير مربوط بقاعدة البيانات" : "Not linked to database"}</span>
    );
  }

  function renderSystemUserStatus(user: SystemUser) {
    if (user.isActive === false) {
      return <span className="badge danger">{isArabic ? "موقوف" : "Inactive"}</span>;
    }
    return <span className="badge ok">{isArabic ? "نشط" : "Active"}</span>;
  }

  return { renderLoginAccountLinkStatus, renderSystemUserStatus };
}
