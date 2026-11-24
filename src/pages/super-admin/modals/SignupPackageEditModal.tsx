import { useEffect, useMemo, useState } from "react";
import type { PharmacySettings, PharmacySignupRequest } from "../../../types";
import { parseSubscriptionTier } from "../../../config/subscriptionTiers";
import { formatDateInput } from "../../../utils/date";
import {
  buildSubscriptionPageAccessRows,
  resolvePharmacyAddonFlags,
} from "../../../utils/subscriptionLimitChange";
import { resolveMaxBranches } from "../../../utils/branchLimits";
import { resolveMaxUsers } from "../../../utils/userLimits";
import { getPharmacySubscriptionDisplayStatus } from "../helpers";

export type SignupPackageEditDraft = {
  endDate: string;
  maxBranches: number;
  maxUsers: number;
  staffAddon: boolean;
  customersAddon: boolean;
  investmentAddon: boolean;
  status: "active" | "suspended";
};

type Props = {
  isArabic: boolean;
  pharmacy: PharmacySettings;
  signupRequest: PharmacySignupRequest;
  saving?: boolean;
  onClose: () => void;
  onSave: (draft: SignupPackageEditDraft) => Promise<void> | void;
};

function buildDraft(pharmacy: PharmacySettings): SignupPackageEditDraft {
  const tier = parseSubscriptionTier(pharmacy.subscriptionTier || pharmacy.subscriptionPlan);
  const addons = resolvePharmacyAddonFlags(pharmacy, tier);
  const endRaw = pharmacy.subscriptionEndDate || pharmacy.subscriptionEndsAt || "";
  const endDate = endRaw.includes("T") ? endRaw.slice(0, 10) : endRaw || formatDateInput(new Date());
  const display = getPharmacySubscriptionDisplayStatus(pharmacy);
  return {
    endDate,
    maxBranches: resolveMaxBranches(pharmacy),
    maxUsers: resolveMaxUsers(pharmacy),
    staffAddon: addons.staffAddon,
    customersAddon: addons.customersAddon,
    investmentAddon: addons.investmentAddon,
    status: display === "suspended" ? "suspended" : "active",
  };
}

export default function SignupPackageEditModal({
  isArabic,
  pharmacy,
  signupRequest,
  saving = false,
  onClose,
  onSave,
}: Props) {
  const [draft, setDraft] = useState<SignupPackageEditDraft>(() => buildDraft(pharmacy));

  useEffect(() => {
    setDraft(buildDraft(pharmacy));
  }, [pharmacy.id, pharmacy.subscriptionEndDate, pharmacy.maxBranches, pharmacy.maxUsers]);

  const pageRows = useMemo(() => {
    const tier = parseSubscriptionTier(pharmacy.subscriptionTier || pharmacy.subscriptionPlan);
    return buildSubscriptionPageAccessRows({
      isArabic,
      tier,
      staffAddon: draft.staffAddon,
      customersAddon: draft.customersAddon,
      investmentAddon: draft.investmentAddon,
    });
  }, [isArabic, pharmacy.subscriptionTier, pharmacy.subscriptionPlan, draft.staffAddon, draft.customersAddon, draft.investmentAddon]);

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div
        className="invoiceModal saasModal saasModalWide signupPackageEditModal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modalHeader">
          <div>
            <h2>{isArabic ? "تعديل حالة الاشتراك" : "Edit subscription status"}</h2>
            <p>
              {signupRequest.pharmacyName} · {signupRequest.adminName}
              <br />
              <code dir="ltr">{pharmacy.id}</code>
            </p>
          </div>
          <button type="button" className="closeBtn" disabled={saving} onClick={onClose}>
            ×
          </button>
        </div>

        <div className="signupPackageEditGrid">
          <label className="settingsField">
            <span>{isArabic ? "تاريخ انتهاء الاشتراك" : "Subscription end date"}</span>
            <input
              type="date"
              dir="ltr"
              min={formatDateInput(new Date())}
              value={draft.endDate}
              disabled={saving}
              onChange={(e) => setDraft((prev) => ({ ...prev, endDate: e.target.value }))}
            />
          </label>

          <label className="settingsField">
            <span>{isArabic ? "حد الفروع" : "Branch limit"}</span>
            <input
              type="number"
              min={1}
              max={50}
              value={draft.maxBranches}
              disabled={saving}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  maxBranches: Math.max(1, Math.floor(Number(e.target.value) || 1)),
                }))
              }
            />
          </label>

          <label className="settingsField">
            <span>{isArabic ? "حد المستخدمين" : "User limit"}</span>
            <input
              type="number"
              min={1}
              max={200}
              value={draft.maxUsers}
              disabled={saving}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  maxUsers: Math.max(1, Math.floor(Number(e.target.value) || 1)),
                }))
              }
            />
          </label>

          <label className="settingsField">
            <span>{isArabic ? "حالة الاشتراك" : "Subscription status"}</span>
            <select
              className="tableSelect"
              value={draft.status}
              disabled={saving}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  status: e.target.value === "suspended" ? "suspended" : "active",
                }))
              }
            >
              <option value="active">{isArabic ? "مفعّل" : "Active"}</option>
              <option value="suspended">{isArabic ? "موقوف" : "Suspended"}</option>
            </select>
          </label>
        </div>

        <div className="signupPackagePagesBlock">
          <h4>{isArabic ? "الصفحات المشترك فيها" : "Subscribed pages"}</h4>
          <p className="pageHint">
            {isArabic
              ? "فعّل أو أوقف الإضافات الاختيارية. باقي الصفحات حسب الباقة الافتراضية."
              : "Toggle optional add-ons. Other pages follow the default package."}
          </p>
          <ul className="subscriptionPagesAccessList signupPackagePagesList">
            {pageRows.map((row) => {
              const editable =
                row.key === "users" ||
                row.key === "employeePortal" ||
                row.key === "customers" ||
                row.key === "costs";
              return (
                <li
                  key={row.key}
                  className={
                    row.included
                      ? "subscriptionPageAccessRow is-included"
                      : "subscriptionPageAccessRow is-excluded"
                  }
                >
                  {editable ? (
                    <label className="signupPackagePageCheck">
                      <input
                        type="checkbox"
                        disabled={saving || row.key === "employeePortal"}
                        checked={
                          row.key === "users" || row.key === "employeePortal"
                            ? draft.staffAddon
                            : row.key === "customers"
                              ? draft.customersAddon
                              : draft.investmentAddon
                        }
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setDraft((prev) => {
                            if (row.key === "users" || row.key === "employeePortal") {
                              return { ...prev, staffAddon: checked };
                            }
                            if (row.key === "customers") {
                              return { ...prev, customersAddon: checked };
                            }
                            return { ...prev, investmentAddon: checked };
                          });
                        }}
                      />
                      <span>{row.label}</span>
                    </label>
                  ) : (
                    <span>{row.label}</span>
                  )}
                  <strong>
                    {row.included
                      ? isArabic
                        ? "مشترك"
                        : "Included"
                      : isArabic
                        ? "غير مشترك"
                        : "Not included"}
                  </strong>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="modalActions saasModalActions">
          <button type="button" className="deleteSmallBtn" disabled={saving} onClick={onClose}>
            {isArabic ? "إلغاء" : "Cancel"}
          </button>
          <button
            type="button"
            className="smallBtn"
            disabled={saving || !draft.endDate}
            onClick={() => void onSave(draft)}
          >
            {saving
              ? isArabic
                ? "جاري الحفظ..."
                : "Saving..."
              : isArabic
                ? "حفظ التعديلات"
                : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
