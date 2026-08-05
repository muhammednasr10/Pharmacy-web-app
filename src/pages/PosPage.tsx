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
import PosManualSalePanel, { type PosSearchScope } from "../components/PosManualSalePanel";
import PosQuickSaleCard from "../components/PosQuickSaleCard";
import PosSmartSearch from "../components/PosSmartSearch";
import PosWarehouseScopeBar from "../components/PosWarehouseScopeBar";
import CashierShiftPanel from "../components/CashierShiftPanel";
import PosShiftsTable from "../components/PosShiftsTable";
import OfflinePosBanner from "../components/OfflinePosBanner";
import PosShortcutsModal from "../components/PosShortcutsModal";
import { usePosKeyboardShortcuts } from "../hooks/usePosKeyboardShortcuts";
import { usePosInventorySource } from "../hooks/usePosInventorySource";
import type { PosActionFeedback } from "../hooks/usePosSales";
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
  onHoldInvoice: () => void | Promise<void | PosActionFeedback>;
  onOpenHeldInvoices: () => void;
  onOpenInstantReturn: () => void;
  lowStockThreshold: number;
  expiringSoonDays: number;
  workShiftLabel?: string;
  pharmacyId: string;
  branchLabel?: string;
  branches?: PharmacySettings[];
  getBranchLabel?: (branchId: string | undefined) => string;
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
  branches = [],
  getBranchLabel,
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
  const [quickSaleFullscreen, setQuickSaleFullscreen] = useState(false);
  const [searchScope, setSearchScope] = useState<PosSearchScope>("current");
  const [posActionFeedback, setPosActionFeedback] = useState<PosActionFeedback | null>(null);
  const posActionFeedbackTimerRef = useRef<number | null>(null);
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

  useEffect(() => {
    if (quickSaleFullscreen) {
      setManualSaleOpen(false);
    }
  }, [quickSaleFullscreen]);

  const showPosActionFeedback = useCallback((feedback: PosActionFeedback) => {
    setPosActionFeedback(feedback);
    if (posActionFeedbackTimerRef.current) {
      window.clearTimeout(posActionFeedbackTimerRef.current);
    }
    posActionFeedbackTimerRef.current = window.setTimeout(() => {
      setPosActionFeedback(null);
      posActionFeedbackTimerRef.current = null;
    }, 4000);
  }, []);

  const handleHoldInvoice = useCallback(async () => {
    const result = await onHoldInvoice();
    if (result?.text) {
      showPosActionFeedback(result);
    }
  }, [onHoldInvoice, showPosActionFeedback]);

  useEffect(() => {
    return () => {
      if (posActionFeedbackTimerRef.current) {
        window.clearTimeout(posActionFeedbackTimerRef.current);
      }
    };
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
    onHoldInvoice: handleHoldInvoice,
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

  const useCompactPosLayout = quickSaleCardOpen || quickSaleFullscreen;

  const saleWorkspaceContent = useCompactPosLayout ? (
    <div className={`posLayoutStack${useCompactPosLayout ? " is-compact" : ""}`}>
      {posActionFeedback ? (
        <div className={`posMessage posActionFeedback${posActionFeedback.error ? " error" : ""}`}>
          {posActionFeedback.text}
        </div>
      ) : null}
      <PosWarehouseScopeBar
        isArabic={isArabic}
        pharmacyId={pharmacyId}
        branches={branches}
        searchScope={searchScope}
        getBranchLabel={getBranchLabel}
        onChange={setSearchScope}
      />
      <PosBarcodeInput
        ref={barcodeInputRef}
        medicines={inventoryMedicines}
        isArabic={isArabic}
        onAddToCart={onAddToCart}
        disabled={inputsDisabled}
        lookupBarcode={lookupBarcode}
      />
      <PosSmartSearch
        isArabic={isArabic}
        isOnline={isOnline}
        disabled={inputsDisabled}
        pharmacyId={pharmacyId}
        searchScope={searchScope}
        branches={branches}
        getBranchLabel={getBranchLabel}
        medicines={medicines}
        inventoryRefreshKey={inventoryRefreshKey}
        lowStockThreshold={lowStockThreshold}
        expiringSoonDays={expiringSoonDays}
        onAddToCart={onAddToCart}
      />
      <div className="posCartSection posCartSection--split">
        <PosCart
          layout="split"
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
          onHoldInvoice={handleHoldInvoice}
          onOpenHeldInvoices={onOpenHeldInvoices}
          onOpenInstantReturn={onOpenInstantReturn}
          isOnline={isOnline}
        />
      </div>
    </div>
  ) : (
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
        compact={false}
        onToggle={() => setManualSaleOpen((current) => !current)}
        pharmacyId={pharmacyId}
        branches={branches}
        getBranchLabel={getBranchLabel}
        searchScope={searchScope}
        onSearchScopeChange={setSearchScope}
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
          onHoldInvoice={handleHoldInvoice}
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
        onFullscreenChange={setQuickSaleFullscreen}
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

  const handleSelectCashierShift = useCallback(
    (shift: CashierShift) => {
      if (cart.length > 0) {
        const confirmed = window.confirm(
          isArabic
            ? "تغيير الوردية سيفرغ السلة الحالية. هل تريد المتابعة؟"
            : "Switching shifts will clear the current cart. Continue?",
        );
        if (!confirmed) return;
        onClearCart();
      }
      onCashierShiftChange(shift);
      setQuickSaleCardOpen(true);
      focusBarcode();
    },
    [cart.length, isArabic, onClearCart, onCashierShiftChange, focusBarcode],
  );

  const handleShiftClosedFromTable = useCallback(
    (closed: CashierShift) => {
      if (activeCashierShift?.id === closed.id) {
        onCashierShiftChange(null);
        setQuickSaleCardOpen(false);
      }
    },
    [activeCashierShift?.id, onCashierShiftChange],
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
      onSelectShift={handleSelectCashierShift}
      onShiftClosed={handleShiftClosedFromTable}
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
