import type { UserRole } from "../../../types";
import { getRoleLabel } from "../../../utils/roles";
import type { EmployeesUsersPageState } from "../useEmployeesUsersPageState";

type Props = { state: EmployeesUsersPageState };

export default function StaffLoginAccountFormModal({ state }: Props) {
  const {
    isArabic,
    accountModal,
    setAccountModal,
    catalogForm,
    setCatalogForm,
    canRequestLoginAccounts,
    loginAccountRoleSelectOptions,
    onCatalogFormRoleChange,
    busy,
    savePasswordChangeRequest,
    saveCatalogAccount,
  } = state;

  if (!accountModal) return null;

  return (
    <div className="modalOverlay">
      <div
        className="invoiceModal userModal loginRequestModal"
        onClick={(e) => e.stopPropagation()}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="modalHeader catalogAccountModalHeader">
          <div className="catalogAccountModalTitle">
            <h2>
              {accountModal === "password-request"
                ? isArabic
                  ? "طلب تغيير كلمة المرور"
                  : "Request password change"
                : accountModal === "add"
                  ? canRequestLoginAccounts
                    ? isArabic
                      ? "طلب حساب دخول جديد"
                      : "Request new login account"
                    : isArabic
                      ? "إضافة حساب دخول"
                      : "Add login account"
                  : isArabic
                    ? "تعديل حساب الدخول"
                    : "Edit login account"}
            </h2>
            {accountModal !== "password-request" && (
              <span className="catalogRoleBadge">{getRoleLabel(catalogForm.role, isArabic)}</span>
            )}
          </div>
          <button type="button" className="deleteSmallBtn" onClick={() => setAccountModal(null)}>
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>
        <div className="catalogAccountFormFields">
          {accountModal === "password-request" && (
            <>
              <div className="settingsField settingsFieldFull">
                <label>{isArabic ? "الحساب" : "Account"}</label>
                <input type="email" dir="ltr" value={catalogForm.email} readOnly disabled />
              </div>
              <div className="settingsField settingsFieldFull">
                <label>{isArabic ? "الدور" : "Role"}</label>
                <input
                  type="text"
                  value={getRoleLabel(catalogForm.role, isArabic)}
                  readOnly
                  disabled
                />
              </div>
            </>
          )}
          {accountModal === "add" && (
            <div className="settingsField settingsFieldFull">
              <label htmlFor="catalog-account-role">{isArabic ? "الدور" : "Role"} *</label>
              <select
                id="catalog-account-role"
                className="tableSelect catalogAccountRoleSelect"
                value={catalogForm.role}
                onChange={(e) => onCatalogFormRoleChange(e.target.value as UserRole)}
              >
                {loginAccountRoleSelectOptions.map((roleKey) => (
                  <option key={roleKey} value={roleKey}>
                    {getRoleLabel(roleKey, isArabic)}
                  </option>
                ))}
              </select>
              <p className="catalogLinkToolbarHint">
                {loginAccountRoleSelectOptions.length === 0
                  ? isArabic
                    ? "لا توجد أدوار — أضفها من إدارة الصيدليات أولاً"
                    : "No roles — add them from Pharmacy Tenants first"
                  : isArabic
                    ? "يمكنك اختيار نفس الدور أكثر من مرة — سيُقترح إيميل جديد تلقائياً."
                    : "You can pick the same role again — a new email will be suggested automatically."}
              </p>
            </div>
          )}
          {accountModal !== "password-request" && (
            <div className="settingsField settingsFieldFull">
              <label htmlFor="catalog-account-email">
                {isArabic ? "البريد الإلكتروني" : "Email"} *
              </label>
              <input
                id="catalog-account-email"
                type="email"
                dir="ltr"
                value={catalogForm.email}
                onChange={(e) => setCatalogForm({ ...catalogForm, email: e.target.value })}
                autoFocus
              />
            </div>
          )}
          <div className="settingsField settingsFieldFull">
            <label htmlFor="catalog-account-password">
              {accountModal === "password-request"
                ? isArabic
                  ? "كلمة المرور الجديدة"
                  : "New password"
                : isArabic
                  ? "كلمة المرور"
                  : "Password"}{" "}
              *
            </label>
            <input
              id="catalog-account-password"
              type="text"
              dir="ltr"
              value={catalogForm.password}
              onChange={(e) => setCatalogForm({ ...catalogForm, password: e.target.value })}
              autoFocus={accountModal === "password-request"}
            />
          </div>
          {canRequestLoginAccounts && accountModal === "add" && (
            <p className="catalogLinkToolbarHint">
              {isArabic
                ? "سيُرسل الطلب لمالك النظام. بعد الاعتماد يُنشأ المستخدم في Supabase Auth."
                : "The request goes to the system owner. After approval, the user is created in Supabase Auth."}
            </p>
          )}
        </div>
        <div className="modalActions catalogAccountModalActions">
          <button
            type="button"
            className="completeBtn"
            disabled={!!busy}
            onClick={() =>
              void (accountModal === "password-request"
                ? savePasswordChangeRequest()
                : saveCatalogAccount())
            }
          >
            {busy === "save-catalog"
              ? isArabic
                ? "جاري الإرسال..."
                : "Sending..."
              : accountModal === "password-request"
                ? isArabic
                  ? "إرسال الطلب"
                  : "Send request"
                : canRequestLoginAccounts && accountModal === "add"
                  ? isArabic
                    ? "إرسال الطلب"
                    : "Send request"
                  : isArabic
                    ? "حفظ"
                    : "Save"}
          </button>
          <button type="button" className="editBtn" onClick={() => setAccountModal(null)}>
            {isArabic ? "إلغاء" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
