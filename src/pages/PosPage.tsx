import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AppUser,
  CashierShift,
  Medicine,
  CartItem,
  PaymentMethod,
  PharmacySettings,
} from "../types";
import PosBarcodeInput, { type PosBarcodeInputHandle } from "../components/PosBarcodeInput";
import PosCart from "../components/PosCart";
import PosManualSalePanel from "../components/PosManualSalePanel";
import PosQuickSaleCard from "../components/PosQuickSaleCard";
import CashierShiftPanel from "../components/CashierShiftPanel";
import PosShiftsTable from "../components/PosShiftsTable";
import OfflinePosBanner from "../components/OfflinePosBanner";
import PosShortcutsModal from "../components/PosShortcutsModal";
import { usePosKeyboardShortcuts } from "../hooks/usePosKeyboardShortcuts";
import { usePosInventorySource } from "../hooks/usePosInventorySource";
import { isPharmacyManager, isSuperAdmin } from "../utils/roles";

function usesCashierShiftGate(appUser: AppUser | null) {
  if (!appUser) return false;
  return appUser.role === "cashier" || isPharmacyManager(appUser) || isSuperAdmin(appUser);
}

type PosPageProps = {
  medicines: Medicine[];
  t: Record<string, string>;
  isArabic: boolean;
  currency: string;
  canUsePOS: boolean;
  canManageInventory: boolean;
  canDeleteMedicine: boolean;
  canViewPosCostProfit: boolean;
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
  subscriptionBlocksSale?: boolean;
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
  branchLabel?: string;
  inventoryRefreshKey?: string | number;
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
  t,
  isArabic,
  currency,
  canUsePOS,
  canManageInventory,
  canDeleteMedicine,
  canViewPosCostProfit,
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
  subscriptionBlocksSale = false,
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
  branchLabel,
  inventoryRefreshKey = 0,
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
  const [manualSaleOpen, setManualSaleOpen] = useState(false);
  const [quickSaleCardOpen, setQuickSaleCardOpen] = useState(false);
  const shiftGateEnabled = usesCashierShiftGate(appUser);
  const shiftReady = !shiftGateEnabled || Boolean(activeCashierShift);
  const shortcutsEnabled = canUsePOS && !isSubscriptionExpired && shiftReady;

  const { lookupBarcode, branchSnapshot } = usePosInventorySource({
    pharmacyId,
    enabled: isOnline && shiftReady,
    refreshKey: inventoryRefreshKey,
    lowStockThreshold,
    expiringSoonDays,
  });

  const focusBarcode = useCallback(() => {
    barcodeInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!shiftGateEnabled) return;
    if (!activeCashierShift) {
      setQuickSaleCardOpen(false);
      return;
    }
    setQuickSaleCardOpen(true);
    requestAnimationFrame(() => focusBarcode());
  }, [activeCashierShift?.id, shiftGateEnabled, focusBarcode]);

  useEffect(() => {
    if (shiftReady && activeCashierShift && quickSaleCardOpen) {
      requestAnimationFrame(() => focusBarcode());
    }
  }, [quickSaleCardOpen, shiftReady, activeCashierShift, focusBarcode]);

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

  const inventoryMedicines = branchSnapshot.length > 0 ? branchSnapshot : medicines;
  const offlineInventoryCount = inventoryMedicines.length;
  const inputsDisabled =
    !shiftReady ||
    !canUsePOS ||
    isSubscriptionExpired ||
    (!isOnline && offlineInventoryCount === 0);

  const saleWorkspaceContent = (
    <div className="posLayoutStack">
      <PosBarcodeInput
        ref={barcodeInputRef}
        medicines={inventoryMedicines}
        isArabic={isArabic}
        onAddToCart={onAddToCart}
        disabled={inputsDisabled}
        lookupBarcode={lookupBarcode}
      />
      <PosManualSalePanel
        isArabic={isArabic}
        isOnline={isOnline}
        open={manualSaleOpen}
        onToggle={() => setManualSaleOpen((current) => !current)}
        pharmacyId={pharmacyId}
        medicines={medicines}
        inventoryRefreshKey={inventoryRefreshKey}
        lowStockThreshold={lowStockThreshold}
        expiringSoonDays={expiringSoonDays}
        t={t}
        currency={currency}
        canUsePOS={canUsePOS && shiftReady}
        canManageInventory={canManageInventory}
        canDeleteMedicine={canDeleteMedicine}
        canViewPosCostProfit={canViewPosCostProfit}
        onAddToCart={onAddToCart}
        onEditMedicine={onEditMedicine}
        onDeleteMedicine={onDeleteMedicine}
      />
      <div className="posCartSection">
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
          subscriptionBlocksSale={subscriptionBlocksSale}
          shiftSaleBlocked={shiftGateEnabled && !shiftReady}
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
    </div>
  );

  const saleWorkspaceShift = (
    <>
      <PosQuickSaleCard
        open={quickSaleCardOpen}
        isArabic={isArabic}
        activeShift={activeCashierShift}
        branchLabel={branchLabel}
        onClose={() => setQuickSaleCardOpen(false)}
      >
        {saleWorkspaceContent}
      </PosQuickSaleCard>

      {!quickSaleCardOpen ? (
        <div className="posQuickSaleCollapsed">
          <button
            type="button"
            className="primaryBtn posQuickSaleReopenBtn"
            onClick={() => setQuickSaleCardOpen(true)}
          >
            {isArabic ? "فتح البيع السريع (باركود + سلة)" : "Open quick sale (barcode + cart)"}
          </button>
        </div>
      ) : null}
    </>
  );

  const saleWorkspaceInline = (
    <div className="posQuickSaleWorkspace">
      <div className="posQuickSaleHeading">
        <h3>{isArabic ? "بيع سريع — باركود" : "Quick sale — barcode"}</h3>
      </div>
      {saleWorkspaceContent}
    </div>
  );

  const shiftsTable = shiftGateEnabled ? (
    <PosShiftsTable
      isArabic={isArabic}
      currency={currency}
      pharmacyId={pharmacyId}
      appUser={appUser}
      pharmacySettings={pharmacySettings}
      getPaymentLabel={getPaymentLabel}
      activeShiftId={activeCashierShift?.id}
      refreshKey={`${activeCashierShift?.id ?? "none"}-${activeCashierShift?.status ?? "none"}`}
    />
  ) : null;

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
        <div>
          <h2>{t.pos}</h2>
          {branchLabel ? (
            <p className="mutedText posWarehouseSource">
              {isArabic ? `مصدر الأدوية: مخزن ${branchLabel}` : `Medicine source: ${branchLabel} warehouse`}
            </p>
          ) : null}
        </div>
        <div className="posPageHeaderActions">
          {workShiftLabel && <span className="posShiftBadge">{workShiftLabel}</span>}
          {shiftReady ? (
            <button
              type="button"
              className="posShortcutsBtn"
              onClick={() => setShortcutsOpen(true)}
              title={isArabic ? "اختصارات لوحة المفاتيح (F1)" : "Keyboard shortcuts (F1)"}
            >
              {isArabic ? "اختصارات F1" : "Shortcuts F1"}
            </button>
          ) : null}
        </div>
      </div>

      {shiftGateEnabled ? (
        shiftReady ? (
          <div className="posShiftWorkspace">
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
              onShiftOpened={() => {
                setQuickSaleCardOpen(true);
                focusBarcode();
              }}
            />
            {shiftsTable}
            {saleWorkspaceShift}
          </div>
        ) : (
          <div className="posShiftGate">
            <div className="posShiftGateIntro">
              <h3>{isArabic ? "ابدأ وردية للبيع" : "Start a shift to sell"}</h3>
              <p className="mutedText">
                {isArabic
                  ? "افتح الوردية أولاً — بعدها يظهر البيع السريع بالباركود والسلة"
                  : "Open your shift first — then quick barcode sale and cart will appear"}
              </p>
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
              onShiftOpened={() => {
                setQuickSaleCardOpen(true);
                focusBarcode();
              }}
            />
            {shiftsTable}
          </div>
        )
      ) : (
        saleWorkspaceInline
      )}

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
