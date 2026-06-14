import type { Dispatch, SetStateAction } from "react";
import GlobalSearchModal from "./GlobalSearchModal";
import HeldInvoicesModal from "./HeldInvoicesModal";
import InstantReturnModal from "./InstantReturnModal";
import InvoiceModal from "./InvoiceModal";
import ReturnModal from "./ReturnModal";
import type { AppTranslation } from "../i18n/appTranslations";
import type { GlobalSearchResult } from "../utils/globalSearch";
import type {
  AppUser,
  CartItem,
  CustomerDebt,
  HeldInvoice,
  Invoice,
  InvoiceItem,
  Medicine,
  Page,
  PharmacySettings,
  ReturnRecord,
} from "../types";

type AvailabilityModalState = {
  medicine: Medicine;
  rows: Array<{ pharmacyId: string; qty: number; expiry?: string; price?: number }>;
};

export type AppModalsProps = {
  isArabic: boolean;
  t: AppTranslation;
  appUser: AppUser | null;
  user: { uid: string; email?: string; name?: string } | null;
  branches: PharmacySettings[];
  activeBranchId: string | null;
  lowStockThreshold: number;
  allowedPages: Page[];
  medicines: Medicine[];
  invoices: Invoice[];
  customerDebts: CustomerDebt[];
  cart: CartItem[];
  availabilityModal: AvailabilityModalState | null;
  availabilityLoading: boolean;
  onCloseAvailability: () => void;
  selectedReturn: ReturnRecord | null;
  onCloseReturn: () => void;
  openInvoiceByNumber: (invoiceNumber: string) => void;
  handleDeleteReturn: (record: ReturnRecord) => void | Promise<void>;
  canDeleteReturn: boolean;
  deletingReturnId: number | string | null;
  selectedInvoice: Invoice | null;
  onCloseInvoice: () => void;
  printSavedInvoice: (invoice: Invoice) => void | Promise<void>;
  getPaymentLabel: (method: string) => string;
  safeNumber: (value: unknown) => number;
  getReturnTypeLabel: (record: ReturnRecord) => string;
  getRefundMethodLabel: (record: ReturnRecord) => string;
  returnInvoice: Invoice | null;
  onCloseReturnInvoice: () => void;
  returnQuantities: Record<number, number>;
  setReturnQuantities: Dispatch<SetStateAction<Record<number, number>>>;
  getReturnedQtyForInvoice: (invoiceNumber: string, medicineId: number) => number;
  getAvailableReturnQty: (invoice: Invoice, item: InvoiceItem) => number;
  completeReturn: () => void;
  isReturning: boolean;
  showHeldInvoicesModal: boolean;
  onCloseHeldInvoices: () => void;
  heldInvoices: HeldInvoice[];
  isHeldInvoiceProcessing: boolean;
  handleResumeHeldInvoice: (held: HeldInvoice) => void | Promise<void>;
  handleDeleteHeldInvoice: (held: HeldInvoice) => void | Promise<void>;
  showInstantReturnModal: boolean;
  onCloseInstantReturn: () => void;
  handleInstantReturnSuccess: (result: {
    returnTotal: number;
    refundMethod: "cash" | "deduct_from_cart";
    returnNumber: string;
    invoiceNumber: string;
  }) => void | Promise<void>;
  getAvailableReturnQtyForInstant: (invoice: Invoice, item: InvoiceItem) => number;
  globalSearchOpen: boolean;
  onCloseGlobalSearch: () => void;
  onGlobalSearchSelect: (result: GlobalSearchResult) => void;
};

export default function AppModals({
  isArabic,
  t,
  appUser,
  user,
  branches,
  activeBranchId,
  lowStockThreshold,
  allowedPages,
  medicines,
  invoices,
  customerDebts,
  cart,
  availabilityModal,
  availabilityLoading,
  onCloseAvailability,
  selectedReturn,
  onCloseReturn,
  openInvoiceByNumber,
  handleDeleteReturn,
  canDeleteReturn,
  deletingReturnId,
  selectedInvoice,
  onCloseInvoice,
  printSavedInvoice,
  getPaymentLabel,
  safeNumber,
  getReturnTypeLabel,
  getRefundMethodLabel,
  returnInvoice,
  onCloseReturnInvoice,
  returnQuantities,
  setReturnQuantities,
  getReturnedQtyForInvoice,
  getAvailableReturnQty,
  completeReturn,
  isReturning,
  showHeldInvoicesModal,
  onCloseHeldInvoices,
  heldInvoices,
  isHeldInvoiceProcessing,
  handleResumeHeldInvoice,
  handleDeleteHeldInvoice,
  showInstantReturnModal,
  onCloseInstantReturn,
  handleInstantReturnSuccess,
  getAvailableReturnQtyForInstant,
  globalSearchOpen,
  onCloseGlobalSearch,
  onGlobalSearchSelect,
}: AppModalsProps) {
  return (
    <>
      {availabilityModal && (
        <div className="modalOverlay">
          <div className="availabilityModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <h2>{isArabic ? "توافر الدواء في الفروع" : "Availability across branches"}</h2>
                <p>
                  {(isArabic
                    ? availabilityModal.medicine.name_ar
                    : availabilityModal.medicine.name_en) || availabilityModal.medicine.name_ar}
                </p>
              </div>
              <button className="closeBtn" type="button" onClick={onCloseAvailability}>
                ×
              </button>
            </div>

            {availabilityLoading ? (
              <p className="empty">{isArabic ? "جارٍ التحميل..." : "Loading..."}</p>
            ) : (
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>{isArabic ? "الفرع" : "Branch"}</th>
                      <th>{isArabic ? "المتوفر" : "Available"}</th>
                      <th>{isArabic ? "أقرب صلاحية" : "Expiry"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branches.map((branch) => {
                      const row = availabilityModal.rows.find((r) => r.pharmacyId === branch.id);
                      const qty = row?.qty ?? 0;
                      const isCurrent = branch.id === (activeBranchId || appUser?.pharmacyId);
                      return (
                        <tr key={branch.id} className={isCurrent ? "branchActiveRow" : ""}>
                          <td>
                            <strong>
                              {(isArabic ? branch.name : branch.name_en) || branch.name}
                            </strong>
                            {isCurrent && (
                              <span className="badge ok branchCurrentTag">
                                {isArabic ? "فرعك" : "Yours"}
                              </span>
                            )}
                          </td>
                          <td>
                            <span
                              className={
                                qty <= 0
                                  ? "badge danger"
                                  : qty <= lowStockThreshold
                                    ? "badge warn"
                                    : "badge ok"
                              }
                            >
                              {qty}
                            </span>
                          </td>
                          <td>{row?.expiry || "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <p className="hintText">
              {isArabic
                ? "الأرقام تعكس مخزون كل فرع لنفس الدواء (بالباركود أو الاسم)."
                : "Quantities reflect each branch's stock for the same medicine (matched by barcode or name)."}
            </p>
          </div>
        </div>
      )}

      {selectedReturn && (
        <ReturnModal
          selectedReturn={selectedReturn}
          onClose={onCloseReturn}
          onViewOriginalInvoice={openInvoiceByNumber}
          onDelete={(record) => void handleDeleteReturn(record)}
          canDelete={canDeleteReturn}
          isDeleting={deletingReturnId === selectedReturn.id}
          isArabic={isArabic}
          t={t}
          currency={t.currency}
          safeNumber={safeNumber}
          getReturnTypeLabel={getReturnTypeLabel}
          getRefundMethodLabel={getRefundMethodLabel}
        />
      )}

      {selectedInvoice && (
        <InvoiceModal
          selectedInvoice={selectedInvoice}
          onClose={onCloseInvoice}
          onPrint={printSavedInvoice}
          isArabic={isArabic}
          t={t}
          currency={t.currency}
          getPaymentLabel={getPaymentLabel}
          safeNumber={safeNumber}
        />
      )}

      {returnInvoice && (
        <div className="modalOverlay">
          <div className="invoiceModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <h2>{isArabic ? "تسجيل مرتجع" : "Create Return"}</h2>
                <p>{returnInvoice.invoiceNumber}</p>
              </div>

              <button className="closeBtn" onClick={onCloseReturnInvoice}>
                ×
              </button>
            </div>

            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>{t.item}</th>
                    <th>{isArabic ? "الكمية المباعة" : "Sold Qty"}</th>
                    <th>{isArabic ? "كمية المرتجع" : "Return Qty"}</th>
                    <th>{t.unitPrice}</th>
                    <th>{t.total}</th>
                  </tr>
                </thead>

                <tbody>
                  {returnInvoice.items?.map((item) => {
                    const returnQty = returnQuantities[item.medicineId] || 0;
                    const alreadyReturnedQty = getReturnedQtyForInvoice(
                      returnInvoice.invoiceNumber,
                      item.medicineId,
                    );
                    const availableQty = getAvailableReturnQty(returnInvoice, item);

                    return (
                      <tr key={item.medicineId}>
                        <td>{isArabic ? item.name_ar : item.name_en}</td>
                        <td>
                          <div className="returnQtyCell">
                            <strong>{item.quantity}</strong>
                            {alreadyReturnedQty > 0 && (
                              <small className="returnQtyReturned">
                                {isArabic
                                  ? `تم إرجاع: ${alreadyReturnedQty}`
                                  : `Returned: ${alreadyReturnedQty}`}
                              </small>
                            )}
                            <small className="returnQtyRemaining">
                              {isArabic
                                ? `متبقي للمرتجع: ${availableQty}`
                                : `Remaining: ${availableQty}`}
                            </small>
                          </div>
                        </td>
                        <td>
                          <input
                            className="tableInput"
                            type="number"
                            min="0"
                            max={availableQty}
                            disabled={availableQty <= 0}
                            value={returnQty}
                            onChange={(e) => {
                              const value = Math.min(
                                Math.max(Number(e.target.value), 0),
                                availableQty,
                              );

                              setReturnQuantities({
                                ...returnQuantities,
                                [item.medicineId]: value,
                              });
                            }}
                          />
                        </td>
                        <td>
                          {(item.unitPrice || 0).toFixed(2)} {t.currency}
                        </td>
                        <td>
                          {((item.unitPrice || 0) * returnQty).toFixed(2)} {t.currency}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="modalActions">
              <button className="printFullBtn" onClick={completeReturn} disabled={isReturning}>
                {isReturning
                  ? isArabic
                    ? "جاري تسجيل المرتجع..."
                    : "Creating return..."
                  : isArabic
                    ? "تسجيل المرتجع"
                    : "Create Return"}
              </button>

              <button className="completeBtn" onClick={onCloseReturnInvoice}>
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {showHeldInvoicesModal && (
        <HeldInvoicesModal
          heldInvoices={heldInvoices}
          isArabic={isArabic}
          currency={t.currency}
          isProcessing={isHeldInvoiceProcessing}
          onClose={onCloseHeldInvoices}
          onResume={(held) => void handleResumeHeldInvoice(held)}
          onDelete={(held) => void handleDeleteHeldInvoice(held)}
        />
      )}

      {showInstantReturnModal && (
        <InstantReturnModal
          isArabic={isArabic}
          currency={t.currency}
          hasOpenCart={cart.length > 0}
          userId={user?.uid}
          userName={appUser?.name}
          getAvailableReturnQty={getAvailableReturnQtyForInstant}
          onClose={onCloseInstantReturn}
          onSuccess={(result) => void handleInstantReturnSuccess(result)}
        />
      )}

      {globalSearchOpen && (
        <GlobalSearchModal
          isArabic={isArabic}
          t={t}
          allowedPages={allowedPages}
          medicines={medicines}
          invoices={invoices}
          customerDebts={customerDebts}
          canSearchMedicines={allowedPages.includes("inventory") || allowedPages.includes("pos")}
          canSearchInvoices={allowedPages.includes("invoices")}
          canSearchCustomers={allowedPages.includes("customers")}
          onClose={onCloseGlobalSearch}
          onSelect={onGlobalSearchSelect}
        />
      )}
    </>
  );
}
