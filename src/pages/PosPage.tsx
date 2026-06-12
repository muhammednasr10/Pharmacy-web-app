import { useCallback, useRef, useState } from "react";
import type {
  AppUser,
  CashierShift,
  Medicine,
  CartItem,
  PaymentMethod,
  PharmacySettings,
} from "../types";
import MedicineTable from "../components/MedicineTable";
import PosBarcodeInput, { type PosBarcodeInputHandle } from "../components/PosBarcodeInput";
import PosCart from "../components/PosCart";
import CashierShiftPanel from "../components/CashierShiftPanel";
import OfflinePosBanner from "../components/OfflinePosBanner";
import PosShortcutsModal from "../components/PosShortcutsModal";
import { usePosKeyboardShortcuts } from "../hooks/usePosKeyboardShortcuts";

type PosPageProps = {
  medicines: Medicine[];
  filteredMedicines: Medicine[];
  t: Record<string, string>;
  isArabic: boolean;
  currency: string;
  canUsePOS: boolean;
  canManageInventory: boolean;
  canDeleteMedicine: boolean;
  cart: CartItem[];
  cartItemsCount: number;
  cartTotalQty: number;
  subtotal: number;
  total: number;
  discount: number;
  paymentMethod: PaymentMethod;
  customerName: string;
  isSelling: boolean;
  isSubscriptionExpired: boolean;
  onAddToCart: (medicine: Medicine) => void;
  onEditMedicine: (medicine: Medicine) => void;
  onDeleteMedicine: (medicine: Medicine) => void;
  onDecreaseQty: (id: number) => void;
  onIncreaseQty: (id: number) => void;
  onRemoveItem: (id: number) => void;
  onClearCart: () => void;
  onDiscountChange: (value: number) => void;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onCustomerNameChange: (value: string) => void;
  onCompleteSale: () => void;
  getPaymentLabel: (method: string) => string;
  heldInvoicesCount: number;
  isHolding: boolean;
  onHoldInvoice: () => void;
  onOpenHeldInvoices: () => void;
  onOpenInstantReturn: () => void;
  lowStockThreshold: number;
  expiringSoonDays: number;
  workShiftLabel?: string;
  pharmacyId: string;
  appUser: AppUser | null;
  activeCashierShift: CashierShift | null;
  pharmacySettings?: PharmacySettings | null;
  workShiftId?: string;
  onCashierShiftChange: (shift: CashierShift | null) => void;
  isOnline?: boolean;
  pendingOfflineSalesCount?: number;
  offlineMedicinesCacheAt?: string | null;
  isSyncingOfflineSales?: boolean;
};

export default function PosPage({
  medicines,
  filteredMedicines,
  t,
  isArabic,
  currency,
  canUsePOS,
  canManageInventory,
  canDeleteMedicine,
  cart,
  cartItemsCount,
  cartTotalQty,
  subtotal,
  total,
  discount,
  paymentMethod,
  customerName,
  isSelling,
  isSubscriptionExpired,
  onAddToCart,
  onEditMedicine,
  onDeleteMedicine,
  onDecreaseQty,
  onIncreaseQty,
  onRemoveItem,
  onClearCart,
  onDiscountChange,
  onPaymentMethodChange,
  onCustomerNameChange,
  onCompleteSale,
  getPaymentLabel,
  heldInvoicesCount,
  isHolding,
  onHoldInvoice,
  onOpenHeldInvoices,
  onOpenInstantReturn,
  lowStockThreshold,
  expiringSoonDays,
  workShiftLabel,
  pharmacyId,
  appUser,
  activeCashierShift,
  pharmacySettings,
  workShiftId,
  onCashierShiftChange,
  isOnline = true,
  pendingOfflineSalesCount = 0,
  offlineMedicinesCacheAt = null,
  isSyncingOfflineSales = false,
}: PosPageProps) {
  const barcodeInputRef = useRef<PosBarcodeInputHandle>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const shortcutsEnabled = canUsePOS && !isSubscriptionExpired;

  const focusBarcode = useCallback(() => {
    barcodeInputRef.current?.focus();
  }, []);

  usePosKeyboardShortcuts({
    enabled: shortcutsEnabled,
    isArabic,
    isOnline,
    cartLength: cart.length,
    isSelling,
    isHolding,
    onShowHelp: () => setShortcutsOpen(true),
    onFocusBarcode: focusBarcode,
    onPaymentMethodChange,
    onHoldInvoice,
    onOpenHeldInvoices,
    onCompleteSale,
    onClearCart,
  });

  return (
    <section className="card posOnlyPage">
      <OfflinePosBanner
        isArabic={isArabic}
        isOnline={isOnline}
        pendingCount={pendingOfflineSalesCount}
        cacheUpdatedAt={offlineMedicinesCacheAt}
        isSyncing={isSyncingOfflineSales}
      />
      <div className="cardHeader posPageHeader">
        <h2>{t.pos}</h2>
        <div className="posPageHeaderActions">
          {workShiftLabel && <span className="posShiftBadge">{workShiftLabel}</span>}
          <button
            type="button"
            className="posShortcutsBtn"
            onClick={() => setShortcutsOpen(true)}
            title={isArabic ? "اختصارات لوحة المفاتيح (F1)" : "Keyboard shortcuts (F1)"}
          >
            {isArabic ? "اختصارات F1" : "Shortcuts F1"}
          </button>
        </div>
      </div>
      <CashierShiftPanel
        isArabic={isArabic}
        currency={currency}
        pharmacyId={pharmacyId}
        appUser={appUser}
        activeShift={activeCashierShift}
        pharmacySettings={pharmacySettings}
        workShiftId={workShiftId}
        onShiftChange={onCashierShiftChange}
        getPaymentLabel={getPaymentLabel}
      />
      <PosBarcodeInput
        ref={barcodeInputRef}
        medicines={medicines}
        isArabic={isArabic}
        onAddToCart={onAddToCart}
        disabled={!canUsePOS || isSubscriptionExpired || (!isOnline && medicines.length === 0)}
      />

      <div className="posSplit">
        <div>
          <MedicineTable
            medicines={filteredMedicines}
            t={t}
            isArabic={isArabic}
            currency={currency}
            showManagementActions={false}
            canUsePOS={canUsePOS}
            canManageInventory={canManageInventory}
            canDeleteMedicine={canDeleteMedicine}
            onAddToCart={onAddToCart}
            onEditMedicine={onEditMedicine}
            onDeleteMedicine={onDeleteMedicine}
            lowStockThreshold={lowStockThreshold}
            expiringSoonDays={expiringSoonDays}
          />
        </div>
        <PosCart
          cart={cart}
          cartItemsCount={cartItemsCount}
          cartTotalQty={cartTotalQty}
          subtotal={subtotal}
          total={total}
          discount={discount}
          paymentMethod={paymentMethod}
          customerName={customerName}
          isArabic={isArabic}
          t={t}
          currency={currency}
          isSelling={isSelling}
          isSubscriptionExpired={isSubscriptionExpired}
          onDecreaseQty={onDecreaseQty}
          onIncreaseQty={onIncreaseQty}
          onRemoveItem={onRemoveItem}
          onClearCart={onClearCart}
          onDiscountChange={onDiscountChange}
          onPaymentMethodChange={onPaymentMethodChange}
          onCustomerNameChange={onCustomerNameChange}
          onCompleteSale={onCompleteSale}
          getPaymentLabel={getPaymentLabel}
          heldInvoicesCount={heldInvoicesCount}
          isHolding={isHolding}
          onHoldInvoice={onHoldInvoice}
          onOpenHeldInvoices={onOpenHeldInvoices}
          onOpenInstantReturn={onOpenInstantReturn}
          isOnline={isOnline}
        />
      </div>

      {shortcutsOpen && (
        <PosShortcutsModal
          isArabic={isArabic}
          isOnline={isOnline}
          onClose={() => setShortcutsOpen(false)}
        />
      )}
    </section>
  );
}
