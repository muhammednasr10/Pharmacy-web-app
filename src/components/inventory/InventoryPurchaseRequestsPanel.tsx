import { useCallback, useEffect, useState } from "react";
import * as pharmacyService from "../../services/pharmacyService";
import type { PurchaseRequestItem } from "../../utils/purchaseRequests";
import { subscribePurchaseRequestsChanged } from "../../utils/purchaseRequests";
import { saveReorderPurchaseDraft } from "../../utils/reorderSuggestions";

type InventoryPurchaseRequestsPanelProps = {
  isArabic: boolean;
  pharmacyId: string;
  enabled: boolean;
  canManageInventory: boolean;
  onOpenPurchases?: () => void;
};

export default function InventoryPurchaseRequestsPanel({
  isArabic,
  pharmacyId,
  enabled,
  canManageInventory,
  onOpenPurchases,
}: InventoryPurchaseRequestsPanelProps) {
  const [rows, setRows] = useState<PurchaseRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!pharmacyId || !enabled) return;
    setLoading(true);
    setError("");
    try {
      const list = await pharmacyService.listPurchaseRequests(pharmacyId, "open");
      setRows(list);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, [enabled, pharmacyId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    return subscribePurchaseRequestsChanged((changedPharmacyId) => {
      if (changedPharmacyId === pharmacyId) void reload();
    });
  }, [pharmacyId, reload]);

  async function handleQtyChange(item: PurchaseRequestItem, value: string) {
    const qty = Math.max(1, Number(value) || 1);
    setBusyId(item.id);
    try {
      await pharmacyService.updatePurchaseRequest(pharmacyId, item.id, { requestedQty: qty });
      await reload();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : String(updateError));
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(item: PurchaseRequestItem) {
    setBusyId(item.id);
    try {
      await pharmacyService.deletePurchaseRequest(pharmacyId, item.id);
      await reload();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : String(deleteError));
    } finally {
      setBusyId(null);
    }
  }

  async function handleMarkOrdered(item: PurchaseRequestItem) {
    setBusyId(item.id);
    try {
      await pharmacyService.updatePurchaseRequest(pharmacyId, item.id, { status: "ordered" });
      await reload();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : String(updateError));
    } finally {
      setBusyId(null);
    }
  }

  function handleCreatePurchase() {
    if (rows.length === 0 || !onOpenPurchases) return;
    const draft = pharmacyService.purchaseRequestsToDraft(rows, pharmacyId);
    saveReorderPurchaseDraft(draft);
    onOpenPurchases();
  }

  return (
    <div className="invMgmtPanel" role="tabpanel">
      <div className="invMgmtPanelToolbar">
        <div>
          <h3 className="invMgmtPanelTitle">
            {isArabic ? "طلبات الشراء من نقطة البيع" : "POS purchase requests"}
          </h3>
          <p className="mutedText">
            {isArabic
              ? "الأدوية اللي الكاشير طلب توريدها لما الزبون سأل وهي ناقصة أو صفر."
              : "Medicines cashiers flagged for restock when customers asked and stock was empty/low."}
          </p>
        </div>
        <div className="inventoryHeaderActions">
          <button type="button" className="secondaryBtn" onClick={() => void reload()} disabled={loading}>
            {isArabic ? "تحديث" : "Refresh"}
          </button>
          {canManageInventory && onOpenPurchases ? (
            <button
              type="button"
              className="completeBtn"
              disabled={rows.length === 0}
              onClick={handleCreatePurchase}
            >
              {isArabic ? "إنشاء توريد من الطلبات" : "Create purchase from requests"}
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="invMgmtError">{error}</p> : null}

      {loading && rows.length === 0 ? (
        <p className="empty">{isArabic ? "جاري التحميل..." : "Loading..."}</p>
      ) : rows.length === 0 ? (
        <p className="empty">
          {isArabic
            ? "لا توجد طلبات مفتوحة — من نقطة البيع اضغط أيقونة التوريد بجانب الدواء الناقص."
            : "No open requests — from POS tap the restock icon beside an out-of-stock medicine."}
        </p>
      ) : (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>{isArabic ? "الدواء" : "Medicine"}</th>
                <th>{isArabic ? "الباركود" : "Barcode"}</th>
                <th>{isArabic ? "الكمية الحالية" : "Current qty"}</th>
                <th>{isArabic ? "كمية التوريد" : "Order qty"}</th>
                <th>{isArabic ? "مرات الطلب" : "Times asked"}</th>
                <th>{isArabic ? "بواسطة" : "By"}</th>
                <th>{isArabic ? "الإجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{isArabic ? item.name_ar : item.name_en || item.name_ar}</strong>
                  </td>
                  <td>{item.barcode || "—"}</td>
                  <td>
                    <span className={item.currentQty <= 0 ? "badge danger" : "badge warn"}>
                      {item.currentQty}
                    </span>
                  </td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      className="invMgmtInlineQty"
                      value={item.requestedQty}
                      disabled={busyId === item.id}
                      onChange={(event) => void handleQtyChange(item, event.target.value)}
                    />
                  </td>
                  <td>{item.requestCount}</td>
                  <td>{item.createdByName || "—"}</td>
                  <td>
                    <div className="actionButtons">
                      <button
                        type="button"
                        className="editBtn"
                        disabled={busyId === item.id}
                        onClick={() => void handleMarkOrdered(item)}
                      >
                        {isArabic ? "تم التوريد" : "Mark ordered"}
                      </button>
                      <button
                        type="button"
                        className="deleteSmallBtn"
                        disabled={busyId === item.id}
                        onClick={() => void handleRemove(item)}
                      >
                        {isArabic ? "حذف" : "Remove"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
