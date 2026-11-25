import StaffEmployeeActionButton from "../../components/staff/StaffEmployeeActionButton";
import type { SuperAdminPageState } from "./useSuperAdminPageState";

type Props = { state: SuperAdminPageState };

function formatMoney(value: number | null | undefined, isArabic: boolean) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return Number(value).toLocaleString(isArabic ? "ar-EG" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function valuesEqual(
  oldValue: string | number | null | undefined,
  newValue: string | number | null | undefined,
  asMoney: boolean,
) {
  if (asMoney) {
    const oldNum = oldValue == null || oldValue === "" ? null : Number(oldValue);
    const newNum = newValue == null || newValue === "" ? null : Number(newValue);
    if (oldNum == null && newNum == null) return true;
    if (oldNum == null || newNum == null) return false;
    return Number.isFinite(oldNum) && Number.isFinite(newNum) && oldNum === newNum;
  }
  return String(oldValue ?? "").trim() === String(newValue ?? "").trim();
}

function SuggestionCompareCell({
  isArabic,
  currentValue,
  proposedValue,
  asMoney = false,
}: {
  isArabic: boolean;
  currentValue: string | number | null | undefined;
  proposedValue: string | number | null | undefined;
  asMoney?: boolean;
}) {
  const format = (value: string | number | null | undefined) => {
    if (value == null || value === "") return "—";
    if (asMoney) {
      if (!Number.isFinite(Number(value))) return "—";
      return formatMoney(Number(value), isArabic);
    }
    return String(value);
  };

  const current = format(currentValue);
  const proposed = format(proposedValue);
  const changed = !valuesEqual(currentValue, proposedValue, asMoney);

  if (!changed) {
    return (
      <div className="suggestionCompare suggestionCompare--same" dir="ltr">
        <span className="suggestionCompareValue">{current}</span>
        <span className="suggestionCompareNote">
          {isArabic ? "بدون تغيير" : "No change"}
        </span>
      </div>
    );
  }

  return (
    <div className="suggestionCompare suggestionCompare--changed" dir="ltr">
      <div className="suggestionCompareRow">
        <span className="suggestionCompareLabel">
          {isArabic ? "الحالي (قاعدة الأدوية)" : "Current (catalog)"}
        </span>
        <span className="suggestionCompareValue suggestionCompareValue--old">{current}</span>
      </div>
      <div className="suggestionCompareRow">
        <span className="suggestionCompareLabel">{isArabic ? "المقترح" : "Proposed"}</span>
        <span className="suggestionCompareValue suggestionCompareValue--new">{proposed}</span>
      </div>
    </div>
  );
}

export default function SuperAdminSuggestionsTab({ state }: Props) {
  const {
    isArabic,
    suggestions,
    pendingSuggestionsCount,
    suggestionsLoading,
    suggestionBusyId,
    refreshSuggestions,
    handleApproveSuggestion,
    handleRejectSuggestion,
    pharmacyNameById,
  } = state;

  return (
    <section className="saasRequestsPanel settingsTabPanel">
      <div className="saasPageHeader">
        <div>
          <h3>{isArabic ? "اقتراحات الأدوية" : "Medicine suggestions"}</h3>
          <p className="pageHint">
            {isArabic
              ? "الحالي = قيمة قاعدة الأدوية الآن، والمقترح = تعديل الصيدلية. يظهر هنا فقط لو في اختلاف حقيقي."
              : "Current = catalog value now, Proposed = pharmacy change. Only real differences appear here."}
          </p>
        </div>
        <span className={`saasRequestsCount${pendingSuggestionsCount ? " active" : ""}`}>
          {pendingSuggestionsCount} {isArabic ? "قيد المراجعة" : "pending"}
        </span>
        <button type="button" className="printBtn" onClick={() => void refreshSuggestions()}>
          {isArabic ? "تحديث" : "Refresh"}
        </button>
      </div>

      {suggestionsLoading ? (
        <p className="empty">{isArabic ? "جاري التحميل..." : "Loading..."}</p>
      ) : suggestions.length === 0 ? (
        <p className="empty">
          {isArabic ? "لا توجد اقتراحات قيد المراجعة حالياً" : "No pending suggestions"}
        </p>
      ) : (
        <div className="tableWrap">
          <table className="dataTable saasRequestsTable suggestionCompareTable">
            <thead>
              <tr>
                <th>{isArabic ? "الصيدلية" : "Pharmacy"}</th>
                <th>{isArabic ? "الدواء" : "Medicine"}</th>
                <th>{isArabic ? "الباركود" : "Barcode"}</th>
                <th>{isArabic ? "سعر الشراء" : "Buy price"}</th>
                <th>{isArabic ? "سعر البيع" : "Sell price"}</th>
                <th>{isArabic ? "مقدم الاقتراح" : "Requested by"}</th>
                <th>{isArabic ? "التاريخ" : "Date"}</th>
                <th>{isArabic ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((row) => {
                const busy = suggestionBusyId === row.id;
                const pharmacyName =
                  pharmacyNameById[row.pharmacyId] || row.pharmacyId || "—";
                return (
                  <tr key={row.id}>
                    <td>{pharmacyName}</td>
                    <td>
                      <strong>{isArabic ? row.medicineName_ar : row.medicineName_en}</strong>
                      <div className="pageHint">
                        {isArabic ? row.medicineName_en : row.medicineName_ar}
                      </div>
                    </td>
                    <td>
                      <SuggestionCompareCell
                        isArabic={isArabic}
                        currentValue={row.oldBarcode}
                        proposedValue={row.newBarcode}
                      />
                    </td>
                    <td>
                      <SuggestionCompareCell
                        isArabic={isArabic}
                        currentValue={row.oldBuyPrice}
                        proposedValue={row.newBuyPrice}
                        asMoney
                      />
                    </td>
                    <td>
                      <SuggestionCompareCell
                        isArabic={isArabic}
                        currentValue={row.oldSellPrice}
                        proposedValue={row.newSellPrice}
                        asMoney
                      />
                    </td>
                    <td>{row.requestedByName || "—"}</td>
                    <td>
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleString(isArabic ? "ar-EG" : "en-GB")
                        : "—"}
                    </td>
                    <td>
                      <div className="saasActions">
                        <StaffEmployeeActionButton
                          icon="activate"
                          tone="success"
                          label={busy ? "..." : isArabic ? "اعتماد" : "Approve"}
                          disabled={busy}
                          onClick={() => void handleApproveSuggestion(row.id)}
                        />
                        <StaffEmployeeActionButton
                          icon="delete"
                          tone="delete"
                          label={busy ? "..." : isArabic ? "رفض" : "Reject"}
                          disabled={busy}
                          onClick={() => void handleRejectSuggestion(row.id)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
