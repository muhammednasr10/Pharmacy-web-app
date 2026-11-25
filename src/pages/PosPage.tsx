import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AppUser,
  CashierShift,
  Medicine,
  CartItem,
  PaymentMethod,
  PharmacySettings,
  PharmacyWallet,
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
import PosCashierJourneyTips from "../components/PosCashierJourneyTips";
import PosShortcutsModal from "../components/PosShortcutsModal";
import { usePosKeyboardShortcuts } from "../hooks/usePosKeyboardShortcuts";
import { usePosInventorySource } from "../hooks/usePosInventorySource";
import type { PosActionFeedback } from "../hooks/usePosSales";
import * as pharmacyService from "../services/pharmacyService";
import { isPharmacyManager, isSuperAdmin } from "../utils/roles";
import {
  buildPosWalletPaymentOptions,
  pickDefaultPosWallet,
  POS_DELIVERY_PAYMENT_VALUE,
  walletTypeToPaymentMethod,
} from "../utils/posPaymentWallets";

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
  customerPhone?: string;
  customerAddress?: string;
  deliveryEmployeeId?: string;
  deliveryEmployeeName?: string;
  staffPageEnabled?: boolean;
  onDeliveryAssignmentAvailableChange?: (available: boolean) => void;
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
  onCustomerPhoneChange?: (value: string) => void;
  onCustomerAddressChange?: (value: string) => void;
  onDeliveryEmployeeChange?: (employee: { id: string; name: string } | null) => void;
  onCompleteSale: () => void | boolean | Promise<void | boolean>;
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
  cashierShiftSalesTick?: number;
  saleFeedback?: { type: "error" | "success"; text: string } | null;
  onClearSaleFeedback?: () => void;
  pharmacySettings?: PharmacySettings | null;
  workShiftId?: string;
  onCashierShiftChange: (shift: CashierShift | null) => void;
  isOnline?: boolean;
  pendingOfflineSalesCount?: number;
  offlineMedicinesCacheAt?: string | null;
  isSyncingOfflineSales?: boolean;
  /** When true (investment/costs page subscribed), POS payment methods = pharmacy wallets. */
  useInvestmentPaymentWallets?: boolean;
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
  customerPhone = "",
  customerAddress = "",
  deliveryEmployeeId = "",
  deliveryEmployeeName = "",
  staffPageEnabled = false,
  onDeliveryAssignmentAvailableChange,
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
  onCustomerPhoneChange,
  onCustomerAddressChange,
  onDeliveryEmployeeChange,
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
  cashierShiftSalesTick = 0,
  saleFeedback = null,
  onClearSaleFeedback,
  pharmacySettings,
  workShiftId,
  onCashierShiftChange,
  isOnline = true,
  pendingOfflineSalesCount = 0,
  offlineMedicinesCacheAt = null,
  isSyncingOfflineSales = false,
  useInvestmentPaymentWallets = false,
}: PosPageProps) {
  const barcodeInputRef = useRef<PosBarcodeInputHandle>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [manualSaleOpen, setManualSaleOpen] = useState(false);
  const [quickSaleCardOpen, setQuickSaleCardOpen] = useState(false);
  const [quickSaleFullscreen, setQuickSaleFullscreen] = useState(false);
  const [posMainTab, setPosMainTab] = useState<"sell" | "shifts">("sell");
  const [searchScope, setSearchScope] = useState<PosSearchScope>("current");
  const [posActionFeedback, setPosActionFeedback] = useState<PosActionFeedback | null>(null);
  const [posWallets, setPosWallets] = useState<PharmacyWallet[]>([]);
  const [selectedPosWalletId, setSelectedPosWalletId] = useState<string>("");
  const posActionFeedbackTimerRef = useRef<number | null>(null);
  const shiftGateEnabled = usesCashierShiftGate(appUser);
  const shiftReady = !shiftGateEnabled || Boolean(activeCashierShift);
  const shortcutsEnabled = canUsePOS && !isSubscriptionExpired && shiftReady;

  useEffect(() => {
    if (!useInvestmentPaymentWallets || !pharmacyId) {
      setPosWallets([]);
      setSelectedPosWalletId("");
      return;
    }
    let cancelled = false;
    void pharmacyService
      .getPharmacyWallets(pharmacyId)
      .then((rows) => {
        if (cancelled) return;
        const active = rows.filter((item) => item.isActive !== false);
        setPosWallets(active);
        const preferred = pickDefaultPosWallet(active);
        if (preferred) {
          setSelectedPosWalletId(String(preferred.id));
          onPaymentMethodChange(walletTypeToPaymentMethod(preferred.walletType));
        }
      })
      .catch((error) => {
        console.error("POS wallets load failed:", error);
        if (!cancelled) setPosWallets([]);
      });
    return () => {
      cancelled = true;
    };
  }, [useInvestmentPaymentWallets, pharmacyId, onPaymentMethodChange]);

  const walletPaymentOptions = useMemo(
    () =>
      useInvestmentPaymentWallets && posWallets.length > 0
        ? buildPosWalletPaymentOptions(posWallets, isArabic)
        : undefined,
    [useInvestmentPaymentWallets, posWallets, isArabic],
  );

  const handlePosWalletChange = useCallback(
    (walletId: string) => {
      setSelectedPosWalletId(walletId);
      if (walletId === POS_DELIVERY_PAYMENT_VALUE) {
        onPaymentMethodChange("delivery");
        return;
      }
      const wallet = posWallets.find((item) => String(item.id) === walletId);
      if (wallet) {
        onPaymentMethodChange(walletTypeToPaymentMethod(wallet.walletType));
      }
    },
    [posWallets, onPaymentMethodChange],
  );

  const { lookupBarcode, branchSnapshot } = usePosInventorySource({
    pharmacyId,
    enabled: shiftReady,
    isOnline,
    refreshKey: inventoryRefreshKey,
    lowStockThreshold,
    expiringSoonDays,
  });

  const focusBarcode = useCallback(() => {
    barcodeInputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSearchScope("current");
  }, [pharmacyId]);

  // Keep shell menu reachable: collapse quick-sale when the sidebar opens.
  useEffect(() => {
    const onMenuOpened = () => {
      setQuickSaleCardOpen(false);
      setQuickSaleFullscreen(false);
    };
    window.addEventListener("app-menu-opened", onMenuOpened);
    return () => window.removeEventListener("app-menu-opened", onMenuOpened);
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

  useEffect(() => {
    if (!saleFeedback?.text) return;
    showPosActionFeedback({
      text: saleFeedback.text,
      error: saleFeedback.type === "error",
    });
    if (saleFeedback.type === "success") {
      requestAnimationFrame(() => focusBarcode());
    }
    onClearSaleFeedback?.();
  }, [saleFeedback, showPosActionFeedback, focusBarcode, onClearSaleFeedback]);

  const handleCompleteSale = useCallback(async () => {
    const walletId = Number(selectedPosWalletId);
    const result = await onCompleteSale();
    if (result === true) {
      if (
        useInvestmentPaymentWallets &&
        Number.isFinite(walletId) &&
        walletId > 0 &&
        total > 0 &&
        isOnline
      ) {
        try {
          await pharmacyService.creditPharmacyWalletBalance(walletId, total);
          setPosWallets((current) =>
            current.map((wallet) =>
              wallet.id === walletId
                ? { ...wallet, balance: Number(wallet.balance || 0) + total }
                : wallet,
            ),
          );
        } catch (error) {
          console.error("Credit POS wallet failed:", error);
        }
      }
      requestAnimationFrame(() => focusBarcode());
    }
  }, [
    onCompleteSale,
    focusBarcode,
    selectedPosWalletId,
    useInvestmentPaymentWallets,
    total,
    isOnline,
  ]);

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
    onCompleteSale: () => {
      void handleCompleteSale();
    },
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
        userName={appUser?.name}
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
          customerPhone={customerPhone}
          customerAddress={customerAddress}
          deliveryEmployeeId={deliveryEmployeeId}
          deliveryEmployeeName={deliveryEmployeeName}
          staffPageEnabled={staffPageEnabled}
          onDeliveryAssignmentAvailableChange={onDeliveryAssignmentAvailableChange}
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
          onCustomerPhoneChange={onCustomerPhoneChange}
          onCustomerAddressChange={onCustomerAddressChange}
          onDeliveryEmployeeChange={onDeliveryEmployeeChange}
          onCompleteSale={() => void handleCompleteSale()}
          getPaymentLabel={getPaymentLabel}
          heldInvoicesCount={heldInvoicesCount}
          isHolding={isHolding}
          onHoldInvoice={handleHoldInvoice}
          onOpenHeldInvoices={onOpenHeldInvoices}
          onOpenInstantReturn={onOpenInstantReturn}
          isOnline={isOnline}
          paymentOptions={walletPaymentOptions}
          paymentOptionValue={selectedPosWalletId}
          onPaymentOptionChange={handlePosWalletChange}
        />
      </div>
    </div>
  ) : (
    <div className="posLayoutStack">
      {posActionFeedback ? (
        <div className={`posMessage posActionFeedback${posActionFeedback.error ? " error" : ""}`}>
          {posActionFeedback.text}
        </div>
      ) : null}
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
        userName={appUser?.name}
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
          customerPhone={customerPhone}
          customerAddress={customerAddress}
          deliveryEmployeeId={deliveryEmployeeId}
          deliveryEmployeeName={deliveryEmployeeName}
          staffPageEnabled={staffPageEnabled}
          onDeliveryAssignmentAvailableChange={onDeliveryAssignmentAvailableChange}
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
          onCustomerPhoneChange={onCustomerPhoneChange}
          onCustomerAddressChange={onCustomerAddressChange}
          onDeliveryEmployeeChange={onDeliveryEmployeeChange}
          onCompleteSale={() => void handleCompleteSale()}
          getPaymentLabel={getPaymentLabel}
          heldInvoicesCount={heldInvoicesCount}
          isHolding={isHolding}
          onHoldInvoice={handleHoldInvoice}
          onOpenHeldInvoices={onOpenHeldInvoices}
          onOpenInstantReturn={onOpenInstantReturn}
          isOnline={isOnline}
          paymentOptions={walletPaymentOptions}
          paymentOptionValue={selectedPosWalletId}
          onPaymentOptionChange={handlePosWalletChange}
        />
      </div>
    </div>
  );

  const saleWorkspaceShift = (
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
      setPosMainTab("sell");
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
      refreshKey={`${activeCashierShift?.id ?? "none"}-${activeCashierShift?.status ?? "none"}-${cashierShiftSalesTick}`}
      onSelectShift={handleSelectCashierShift}
      onShiftClosed={handleShiftClosedFromTable}
      onBeforeCloseShift={() => setQuickSaleCardOpen(false)}
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

      <PosCashierJourneyTips
        isArabic={isArabic}
        appUser={appUser}
        activeShift={activeCashierShift}
        cartItemsCount={cartItemsCount}
        isOnline={isOnline}
        pendingOfflineSalesCount={pendingOfflineSalesCount}
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
        <nav className="posPageTabs" aria-label={isArabic ? "أقسام نقطة البيع" : "POS sections"}>
          <button
            type="button"
            className={`posPageTabBtn${posMainTab === "sell" ? " active" : ""}`}
            onClick={() => setPosMainTab("sell")}
          >
            {isArabic ? "البيع والوردية" : "Sell & shift"}
          </button>
          <button
            type="button"
            className={`posPageTabBtn${posMainTab === "shifts" ? " active" : ""}`}
            onClick={() => {
              setQuickSaleCardOpen(false);
              setPosMainTab("shifts");
            }}
          >
            {isArabic ? "جدول الورديات" : "Shifts table"}
          </button>
        </nav>
      ) : null}

      {shiftGateEnabled ? (
        posMainTab === "shifts" ? (
          <div className="posShiftsTabPanel">{shiftsTable}</div>
        ) : shiftReady ? (
          <div
            className={`posShiftWorkspace${quickSaleCardOpen ? " posShiftWorkspace--quickSaleOpen" : ""}`}
          >
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
              showQuickSaleButton
              quickSaleOpen={quickSaleCardOpen}
              onOpenQuickSale={() => {
                setQuickSaleCardOpen(true);
                focusBarcode();
              }}
              onCloseQuickSale={() => setQuickSaleCardOpen(false)}
              onShiftOpened={() => {
                setPosMainTab("sell");
                setQuickSaleCardOpen(true);
                focusBarcode();
              }}
              summaryRefreshKey={cashierShiftSalesTick}
            />
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
                setPosMainTab("sell");
                setQuickSaleCardOpen(true);
                focusBarcode();
              }}
              summaryRefreshKey={cashierShiftSalesTick}
            />
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
