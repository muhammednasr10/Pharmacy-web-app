import { PosPage } from "../../pages/lazyPages";
import { filterMedicinesForPharmacy } from "../../utils/medicineLookup";
import type { AppPageRouterProps } from "./types";

export type AppPosRouteProps = Pick<
  AppPageRouterProps,
  | "medicines"
  | "t"
  | "isArabic"
  | "getPharmacyId"
  | "allowedPages"
  | "canUsePOS"
  | "canManageInventory"
  | "canDeleteMedicine"
  | "canViewPosCostProfit"
  | "cart"
  | "cartItemsCount"
  | "cartTotalQty"
  | "subtotal"
  | "total"
  | "discount"
  | "paymentMethod"
  | "customerName"
  | "customerPhone"
  | "isSelling"
  | "isSubscriptionExpired"
  | "addToCart"
  | "startEditMedicine"
  | "deleteMedicine"
  | "changeQty"
  | "removeItem"
  | "clearCart"
  | "setDiscount"
  | "setPaymentMethod"
  | "setCustomerName"
  | "setCustomerPhone"
  | "completeSale"
  | "getPaymentLabel"
  | "heldInvoices"
  | "isHolding"
  | "handleHoldInvoice"
  | "openHeldInvoicesModal"
  | "setShowInstantReturnModal"
  | "lowStockThreshold"
  | "expiringSoonDays"
  | "currentWorkShiftLabel"
  | "resolveBranchLabel"
  | "activeBranchId"
  | "branches"
  | "appUser"
  | "activeCashierShift"
  | "cashierShiftSalesTick"
  | "saleFeedback"
  | "setSaleFeedback"
  | "pharmacySettings"
  | "currentWorkShiftId"
  | "setActiveCashierShift"
  | "isOnline"
  | "pendingOfflineSalesCount"
  | "offlineMedicinesCacheAt"
  | "isSyncingOfflineSales"
> & {
  subscriptionBlocksWrite: boolean;
};

export default function AppPosRoute({
  medicines,
  t,
  isArabic,
  getPharmacyId,
  allowedPages,
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
  customerPhone,
  isSelling,
  isSubscriptionExpired,
  addToCart,
  startEditMedicine,
  deleteMedicine,
  changeQty,
  removeItem,
  clearCart,
  setDiscount,
  setPaymentMethod,
  setCustomerName,
  setCustomerPhone,
  completeSale,
  getPaymentLabel,
  heldInvoices,
  isHolding,
  handleHoldInvoice,
  openHeldInvoicesModal,
  setShowInstantReturnModal,
  lowStockThreshold,
  expiringSoonDays,
  currentWorkShiftLabel,
  resolveBranchLabel,
  activeBranchId,
  branches,
  appUser,
  activeCashierShift,
  cashierShiftSalesTick = 0,
  saleFeedback = null,
  setSaleFeedback,
  pharmacySettings,
  currentWorkShiftId,
  setActiveCashierShift,
  isOnline,
  pendingOfflineSalesCount,
  offlineMedicinesCacheAt,
  isSyncingOfflineSales,
  subscriptionBlocksWrite,
}: AppPosRouteProps) {
  if (!canUsePOS()) return null;

  return (
    <PosPage
      medicines={filterMedicinesForPharmacy(medicines, getPharmacyId())}
      t={t}
      isArabic={isArabic}
      currency={t.currency}
      canUsePOS={canUsePOS()}
      canManageInventory={canManageInventory()}
      canDeleteMedicine={canDeleteMedicine()}
      canViewPosCostProfit={canViewPosCostProfit}
      cart={cart}
      cartItemsCount={cartItemsCount}
      cartTotalQty={cartTotalQty}
      subtotal={subtotal}
      total={total}
      discount={discount}
      paymentMethod={paymentMethod}
      customerName={customerName}
      customerPhone={customerPhone}
      isSelling={isSelling}
      isSubscriptionExpired={isSubscriptionExpired}
      subscriptionBlocksSale={subscriptionBlocksWrite}
      onAddToCart={addToCart}
      onEditMedicine={startEditMedicine}
      onDeleteMedicine={deleteMedicine}
      onDecreaseQty={(id) => changeQty(id, -1)}
      onIncreaseQty={(id) => changeQty(id, 1)}
      onRemoveItem={removeItem}
      onClearCart={clearCart}
      onDiscountChange={setDiscount}
      onPaymentMethodChange={(value) => setPaymentMethod(value)}
      onCustomerNameChange={setCustomerName}
      onCustomerPhoneChange={setCustomerPhone}
      onCompleteSale={completeSale}
      getPaymentLabel={getPaymentLabel}
      heldInvoicesCount={heldInvoices.length}
      isHolding={isHolding}
      onHoldInvoice={handleHoldInvoice}
      onOpenHeldInvoices={() => void openHeldInvoicesModal()}
      onOpenInstantReturn={() => setShowInstantReturnModal(true)}
      lowStockThreshold={lowStockThreshold}
      expiringSoonDays={expiringSoonDays}
      workShiftLabel={currentWorkShiftLabel}
      pharmacyId={getPharmacyId()}
      branchLabel={resolveBranchLabel(getPharmacyId())}
      branches={branches}
      getBranchLabel={resolveBranchLabel}
      inventoryRefreshKey={`${getPharmacyId()}-${medicines.length}-${activeBranchId || ""}`}
      appUser={appUser}
      activeCashierShift={activeCashierShift}
      cashierShiftSalesTick={cashierShiftSalesTick}
      saleFeedback={saleFeedback}
      onClearSaleFeedback={() => setSaleFeedback?.(null)}
      pharmacySettings={pharmacySettings}
      workShiftId={currentWorkShiftId}
      onCashierShiftChange={setActiveCashierShift}
      isOnline={isOnline}
      pendingOfflineSalesCount={pendingOfflineSalesCount}
      offlineMedicinesCacheAt={offlineMedicinesCacheAt}
      isSyncingOfflineSales={isSyncingOfflineSales}
      useInvestmentPaymentWallets={allowedPages.includes("costs")}
    />
  );
}
