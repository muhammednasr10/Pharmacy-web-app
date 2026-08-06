import { useCallback, useEffect, useMemo, useState } from "react";
import * as pharmacyService from "../services/pharmacyService";
import type { Invoice, InvoiceItem } from "../types";
import { playBarcodeBeep } from "../utils/barcodeBeep";
import { normalizeMedicineIdKey, sameMedicineId } from "../utils/returnHelpers";
import InstantReturnBarcodeInput from "./InstantReturnBarcodeInput";

type InstantReturnModalProps = {
  isArabic: boolean;
  currency: string;
  hasOpenCart: boolean;
  userId?: string;
  userName?: string;
  getAvailableReturnQty: (invoice: Invoice, item: InvoiceItem) => number;
  onClose: () => void;
  onSuccess: (result: {
    returnTotal: number;
    refundMethod: "cash" | "deduct_from_cart";
    returnNumber: string;
    invoiceNumber: string;
  }) => void;
};

export default function InstantReturnModal({
  isArabic,
  currency,
  hasOpenCart,
  userId,
  userName,
  getAvailableReturnQty,
  onClose,
  onSuccess,
}: InstantReturnModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedMedicineId, setSelectedMedicineId] = useState<string | null>(null);
  const [returnQty, setReturnQty] = useState(1);
  const [reason, setReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<"cash" | "deduct_from_cart">("cash");
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [barcodeHint, setBarcodeHint] = useState("");

  const applyBarcodeSelection = useCallback(
    (invoice: Invoice, item: InvoiceItem) => {
      const available = getAvailableReturnQty(invoice, item);
      if (available <= 0) {
        playBarcodeBeep(false);
        setSearchError(
          isArabic
            ? "لا توجد كمية متاحة للمرتجع لهذا الصنف في الفاتورة"
            : "No returnable quantity for this item on the invoice",
        );
        return false;
      }

      setSelectedInvoice(invoice);
      setSelectedMedicineId(normalizeMedicineIdKey(item.medicineId));
      setReturnQty(1);
      setSearchQuery(String(item.barcode || "").trim());
      setSearchResults([]);
      setSearchError("");
      setBarcodeHint(
        isArabic
          ? `تم اختيار ${item.name_ar} من فاتورة ${invoice.invoiceNumber}`
          : `Selected ${item.name_en || item.name_ar} from invoice ${invoice.invoiceNumber}`,
      );
      playBarcodeBeep(true);
      return true;
    },
    [getAvailableReturnQty, isArabic],
  );

  const handleBarcodeScan = useCallback(
    async (code: string) => {
      setIsSearching(true);
      setSearchError("");
      setBarcodeHint("");

      try {
        const results = await pharmacyService.searchInvoicesForReturnByBarcode(code);
        if (results.length === 0) {
          playBarcodeBeep(false);
          setSearchError(
            isArabic
              ? "لا توجد فاتورة تحتوي على هذا الباركود"
              : "No invoice found with this barcode",
          );
          return;
        }

        const clean = code.trim();
        const invoiceMatches = results
          .map((invoice) => ({
            invoice,
            items: (invoice.items || []).filter(
              (item) => String(item.barcode ?? "").trim() === clean,
            ),
          }))
          .filter((entry) => entry.items.length > 0);

        if (invoiceMatches.length === 1) {
          const { invoice, items } = invoiceMatches[0];
          const returnableItem =
            items.find((item) => getAvailableReturnQty(invoice, item) > 0) || items[0];
          if (applyBarcodeSelection(invoice, returnableItem)) {
            return;
          }
        }

        setSearchQuery(clean);
        setSearchResults(results);
        setSelectedInvoice(null);
        setSelectedMedicineId(null);
        playBarcodeBeep(true);
        setBarcodeHint(
          isArabic
            ? "وُجدت أكثر من فاتورة — اختر الفاتورة المناسبة"
            : "Multiple invoices found — pick the correct invoice",
        );
      } catch {
        playBarcodeBeep(false);
        setSearchError(isArabic ? "تعذر البحث بالباركود" : "Could not search by barcode");
      } finally {
        setIsSearching(false);
      }
    },
    [applyBarcodeSelection, getAvailableReturnQty, isArabic],
  );

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchError("");
      return;
    }

    const timer = window.setTimeout(() => {
      setIsSearching(true);
      void pharmacyService
        .searchInvoiceForReturn(searchQuery)
        .then((results) => {
          setSearchResults(results);
          setSearchError(
            results.length === 0
              ? isArabic
                ? "لم يتم العثور على فواتير مطابقة"
                : "No matching invoices found"
              : "",
          );
        })
        .catch(() => {
          setSearchResults([]);
          setSearchError(isArabic ? "تعذر البحث عن الفواتير" : "Could not search invoices");
        })
        .finally(() => setIsSearching(false));
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchQuery, isArabic]);

  const selectedItem = useMemo(() => {
    if (!selectedInvoice || selectedMedicineId === null) return null;
    return selectedInvoice.items?.find((item) => sameMedicineId(item.medicineId, selectedMedicineId)) || null;
  }, [selectedInvoice, selectedMedicineId]);

  const availableQty =
    selectedItem && selectedInvoice ? getAvailableReturnQty(selectedInvoice, selectedItem) : 0;

  function selectInvoice(invoice: Invoice) {
    setSelectedInvoice(invoice);
    setSelectedMedicineId(null);
    setReturnQty(1);
    setSearchError("");

    const barcode = searchQuery.trim();
    if (barcode) {
      const matchingItems = (invoice.items || []).filter(
        (item) => String(item.barcode ?? "").trim() === barcode,
      );
      const returnable = matchingItems.find((item) => getAvailableReturnQty(invoice, item) > 0);
      if (returnable) {
        setSelectedMedicineId(normalizeMedicineIdKey(returnable.medicineId));
      }
    }
  }

  function selectItem(item: InvoiceItem) {
    setSelectedMedicineId(normalizeMedicineIdKey(item.medicineId));
    const available = selectedInvoice ? getAvailableReturnQty(selectedInvoice, item) : 0;
    setReturnQty(available > 0 ? 1 : 0);
  }

  async function handleSubmit() {
    if (!selectedInvoice || !selectedItem) {
      alert(isArabic ? "اختر الفاتورة والصنف أولاً" : "Select invoice and item first");
      return;
    }

    if (returnQty <= 0) {
      alert(
        isArabic
          ? "كمية المرتجع يجب أن تكون أكبر من صفر"
          : "Return quantity must be greater than zero",
      );
      return;
    }

    if (returnQty > availableQty) {
      alert(
        isArabic
          ? `الكمية المتاحة للمرتجع: ${availableQty}`
          : `Available return quantity: ${availableQty}`,
      );
      return;
    }

    if (!reason.trim()) {
      alert(isArabic ? "من فضلك أدخل سبب المرتجع" : "Please enter return reason");
      return;
    }

    if (refundMethod === "deduct_from_cart" && !hasOpenCart) {
      alert(
        isArabic
          ? "لا توجد سلة مفتوحة لخصم قيمة المرتجع منها"
          : "No open cart to deduct return amount from",
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const { returnRecord, returnTotal } = await pharmacyService.createInstantSaleReturn({
        invoice: selectedInvoice,
        items: [
          {
            medicineId: selectedItem.medicineId as number,
            quantity: returnQty,
            unitPrice: selectedItem.unitPrice,
            buyPrice: selectedItem.buyPrice,
            name_ar: selectedItem.name_ar,
            name_en: selectedItem.name_en,
            barcode: selectedItem.barcode,
          },
        ],
        reason: reason.trim(),
        refundMethod,
        userId,
        userName,
      });

      onSuccess({
        returnTotal,
        refundMethod,
        returnNumber: returnRecord.returnNumber,
        invoiceNumber: selectedInvoice.invoiceNumber,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.startsWith("qty_exceeds_available")) {
        const parts = message.split(":");
        const available = parts[2] || "0";
        alert(
          isArabic
            ? `كمية المرتجع أكبر من المتاح. المتاح: ${available}`
            : `Return quantity exceeds available: ${available}`,
        );
      } else if (message === "item_not_in_invoice") {
        alert(isArabic ? "الصنف غير موجود في الفاتورة" : "Item not found in invoice");
      } else if (message === "no_return_items") {
        alert(isArabic ? "اختر كمية مرتجعة أولاً" : "Choose return quantity first");
      } else if (message === "medicine_not_found") {
        alert(isArabic ? "الدواء غير موجود في المخزون" : "Medicine not found in inventory");
      } else {
        alert(
          message ||
            (isArabic ? "حدث خطأ أثناء تنفيذ المرتجع" : "Failed to process instant return"),
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modalOverlay">
      <div className="invoiceModal posModalWide" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div>
            <h2>{isArabic ? "مرتجع بيع لحظي" : "Instant Sale Return"}</h2>
            <p>
              {isArabic
                ? "امسح باركود الصنف أو ابحث عن الفاتورة ثم اختر الكمية"
                : "Scan item barcode or search invoice, then choose quantity"}
            </p>
          </div>
          <button className="closeBtn" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="instantReturnForm">
          <InstantReturnBarcodeInput
            isArabic={isArabic}
            disabled={isSubmitting}
            onBarcodeScan={handleBarcodeScan}
          />

          {barcodeHint && <p className="instantReturnHint">{barcodeHint}</p>}

          <label>{isArabic ? "بحث يدوي" : "Manual search"}</label>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isArabic
                ? "رقم الفاتورة / الباركود / اسم العميل / الهاتف"
                : "Invoice # / barcode / customer / phone"
            }
          />
          {isSearching && (
            <p className="instantReturnHint">{isArabic ? "جاري البحث..." : "Searching..."}</p>
          )}
          {searchError && <p className="instantReturnError">{searchError}</p>}

          {!selectedInvoice && searchResults.length > 0 && (
            <div className="instantReturnResults">
              {searchResults.map((invoice) => (
                <button
                  key={invoice.id}
                  type="button"
                  className="instantReturnResultBtn"
                  onClick={() => selectInvoice(invoice)}
                >
                  <strong>{invoice.invoiceNumber}</strong>
                  <span>
                    {invoice.customerName || (isArabic ? "بدون عميل" : "No customer")} —{" "}
                    {(invoice.total || 0).toFixed(2)} {currency}
                  </span>
                </button>
              ))}
            </div>
          )}

          {selectedInvoice && (
            <>
              <div className="instantReturnSelectedInvoice">
                <span>
                  {isArabic ? "الفاتورة:" : "Invoice:"} {selectedInvoice.invoiceNumber}
                </span>
                <button
                  type="button"
                  className="smallBtn"
                  onClick={() => {
                    setSelectedInvoice(null);
                    setSelectedMedicineId(null);
                  }}
                >
                  {isArabic ? "تغيير" : "Change"}
                </button>
              </div>

              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>{isArabic ? "الصنف" : "Item"}</th>
                      <th>{isArabic ? "المباع" : "Sold"}</th>
                      <th>{isArabic ? "متاح للمرتجع" : "Available"}</th>
                      <th>{isArabic ? "اختيار" : "Select"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedInvoice.items || []).map((item) => {
                      const available = getAvailableReturnQty(selectedInvoice, item);
                      return (
                        <tr key={item.medicineId}>
                          <td>{isArabic ? item.name_ar : item.name_en}</td>
                          <td>{item.quantity}</td>
                          <td>{available}</td>
                          <td>
                            <button
                              type="button"
                              className="editBtn"
                              disabled={available <= 0}
                              onClick={() => selectItem(item)}
                            >
                              {sameMedicineId(selectedMedicineId, item.medicineId)
                                ? isArabic
                                  ? "محدد"
                                  : "Selected"
                                : isArabic
                                  ? "اختيار"
                                  : "Select"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {selectedItem && (
                <>
                  <label>{isArabic ? "كمية المرتجع" : "Return quantity"}</label>
                  <input
                    type="number"
                    min={1}
                    max={availableQty}
                    value={returnQty}
                    onChange={(e) => setReturnQty(Number(e.target.value))}
                  />
                  <p className="instantReturnHint">
                    {isArabic ? "الكمية المتاحة:" : "Available:"} {availableQty}
                  </p>

                  <label>{isArabic ? "سبب المرتجع" : "Return reason"}</label>
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={isArabic ? "مثال: خطأ في الصنف" : "e.g. wrong item"}
                  />

                  <label>{isArabic ? "طريقة الرد" : "Refund method"}</label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value as "cash" | "deduct_from_cart")}
                  >
                    <option value="cash">
                      {isArabic ? "رد نقدي للعميل" : "Cash refund to customer"}
                    </option>
                    <option value="deduct_from_cart" disabled={!hasOpenCart}>
                      {isArabic ? "خصم من السلة الحالية" : "Deduct from current cart"}
                    </option>
                  </select>
                  {!hasOpenCart && (
                    <p className="instantReturnHint">
                      {isArabic
                        ? "خصم من السلة متاح فقط عند وجود أصناف في السلة"
                        : "Cart deduction requires an open cart"}
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <div className="modalActions">
          <button
            className="completeBtn"
            type="button"
            disabled={isSubmitting || !selectedItem}
            onClick={() => void handleSubmit()}
          >
            {isSubmitting
              ? isArabic
                ? "جاري تنفيذ المرتجع..."
                : "Processing return..."
              : isArabic
                ? "تنفيذ المرتجع"
                : "Process Return"}
          </button>
        </div>
      </div>
    </div>
  );
}
