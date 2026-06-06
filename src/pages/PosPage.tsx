import type { Medicine, CartItem, PaymentMethod } from "../types";
import MedicineTable from "../components/MedicineTable";
import PosCart from "../components/PosCart";

type PosPageProps = {
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
};

export default function PosPage({
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
}: PosPageProps) {
  return (
    <section className="card posOnlyPage">
      <div className="cardHeader posPageHeader">
        <h2>{t.pos}</h2>
        {workShiftLabel && (
          <span className="posShiftBadge">{workShiftLabel}</span>
        )}
      </div>
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
        />
      </div>
    </section>
  );
}
