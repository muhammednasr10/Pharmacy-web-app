import type { SuperAdminPageState } from "./useSuperAdminPageState";

type Props = { state: SuperAdminPageState };

function formatMoney(value: number | null | undefined, isArabic: boolean) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return Number(value).toLocaleString(isArabic ? "ar-EG" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatChange(
  oldValue: string | number | null | undefined,
  newValue: string | number | null | undefined,
  isArabic: boolean,
  asMoney = false,
) {
  const format = (value: string | number | null | undefined) => {
    if (value == null || value === "") return "—";
    if (asMoney) return formatMoney(Number(value), isArabic);
    return String(value);
  };
  const from = format(oldValue);
  const to = format(newValue);
  if (from === to) return from;
  return `${from} → ${to}`;
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
              ? "تغييرات سعر الشراء أو البيع أو الباركود من الصيدليات — اعتمد لتحديث قاعدة بيانات الأدوية، أو ارفض"
              : "Buy/sell price or barcode changes from pharmacies — approve to update the medicine catalog, or reject"}
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
          <table className="dataTable saasRequestsTable">
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
                  pharmacyNameById[row.pharmacyId] || row.pharmacyId || (isArabic ? "—" : "—");
                return (
                  <tr key={row.id}>
                    <td>{pharmacyName}</td>
                    <td>
                      <strong>{isArabic ? row.medicineName_ar : row.medicineName_en}</strong>
                      <div className="pageHint">
                        {isArabic ? row.medicineName_en : row.medicineName_ar}
                      </div>
                    </td>
                    <td dir="ltr">
                      {formatChange(row.oldBarcode, row.newBarcode, isArabic)}
                    </td>
                    <td dir="ltr">
                      {formatChange(row.oldBuyPrice, row.newBuyPrice, isArabic, true)}
                    </td>
                    <td dir="ltr">
                      {formatChange(row.oldSellPrice, row.newSellPrice, isArabic, true)}
                    </td>
                    <td>{row.requestedByName || "—"}</td>
                    <td>
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleString(isArabic ? "ar-EG" : "en-GB")
                        : "—"}
                    </td>
                    <td>
                      <div className="actionButtons">
                        <button
                          type="button"
                          className="completeBtn"
                          disabled={busy}
                          onClick={() => void handleApproveSuggestion(row.id)}
                        >
                          {busy
                            ? isArabic
                              ? "..."
                              : "..."
                            : isArabic
                              ? "اعتماد"
                              : "Approve"}
                        </button>
                        <button
                          type="button"
                          className="deleteSmallBtn"
                          disabled={busy}
                          onClick={() => void handleRejectSuggestion(row.id)}
                        >
                          {isArabic ? "رفض" : "Reject"}
                        </button>
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
