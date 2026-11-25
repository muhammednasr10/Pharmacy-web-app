import { useState } from "react";
import type { PaymentMethod } from "../types";
import { hasPosCustomerData, needsPosCustomerData } from "../utils/posCustomerRequired";
import PosCustomerDataModal from "./pos/PosCustomerDataModal";
import PosCustomerDataOpenButton from "./pos/PosCustomerDataOpenButton";
import PosDeliveryEmployeeTriggerButton from "./pos/PosDeliveryEmployeeTriggerButton";
import PosPaymentMethodSelect from "./pos/PosPaymentMethodSelect";
import type { PaymentOption } from "./pos/paymentTypes";

export type { PaymentOption };

type PaymentBoxProps = {
  discount: number;
  paymentMethod: PaymentMethod;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  isArabic: boolean;
  t: Record<string, string>;
  onDiscountChange: (value: number) => void;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onCustomerNameChange: (value: string) => void;
  onCustomerPhoneChange?: (value: string) => void;
  onCustomerAddressChange?: (value: string) => void;
  getPaymentLabel: (method: string) => string;
  disableCredit?: boolean;
  /** When set, dropdown shows these options (e.g. investment wallets) instead of classic methods. */
  paymentOptions?: PaymentOption[];
  paymentOptionValue?: string;
  onPaymentOptionChange?: (value: string) => void;
  canAssignDeliveryEmployee?: boolean;
  deliveryEmployeeName?: string;
  onOpenDeliveryEmployeePicker?: () => void;
};

export default function PaymentBox({
  discount,
  paymentMethod,
  customerName,
  customerPhone = "",
  customerAddress = "",
  isArabic,
  t,
  onDiscountChange,
  onPaymentMethodChange,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onCustomerAddressChange,
  getPaymentLabel,
  disableCredit = false,
  paymentOptions,
  paymentOptionValue,
  onPaymentOptionChange,
  canAssignDeliveryEmployee = false,
  deliveryEmployeeName = "",
  onOpenDeliveryEmployeePicker,
}: PaymentBoxProps) {
  const useCustomOptions = Boolean(paymentOptions && paymentOptions.length > 0);
  const needsCustomer = needsPosCustomerData(paymentMethod, useCustomOptions);
  const hasCustomerData = hasPosCustomerData(customerName, customerPhone, customerAddress);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);

  return (
    <div className="paymentBox">
      <label>{t.discount}</label>
      <input
        type="number"
        min="0"
        value={discount}
        onChange={(e) => onDiscountChange(Number(e.target.value))}
        placeholder={isArabic ? "قيمة الخصم" : "Discount amount"}
      />
      <label>{t.paymentMethod}</label>
      <div className="paymentMethodRow">
        <PosPaymentMethodSelect
          paymentMethod={paymentMethod}
          isArabic={isArabic}
          getPaymentLabel={getPaymentLabel}
          disableCredit={disableCredit}
          paymentOptions={paymentOptions}
          paymentOptionValue={paymentOptionValue}
          onPaymentMethodChange={onPaymentMethodChange}
          onPaymentOptionChange={onPaymentOptionChange}
        />
        <PosCustomerDataOpenButton
          isArabic={isArabic}
          hasData={hasCustomerData}
          open={customerModalOpen}
          onOpen={() => setCustomerModalOpen(true)}
        />
      </div>
      {!useCustomOptions && disableCredit && (
        <p className="mutedText paymentOfflineHint">
          {isArabic ? "البيع الآجل غير متاح بدون اتصال" : "Credit sales are unavailable offline"}
        </p>
      )}
      {canAssignDeliveryEmployee ? (
        <PosDeliveryEmployeeTriggerButton
          variant="checkout"
          isArabic={isArabic}
          employeeName={deliveryEmployeeName}
          onClick={() => onOpenDeliveryEmployeePicker?.()}
        />
      ) : null}

      <PosCustomerDataModal
        open={customerModalOpen}
        isArabic={isArabic}
        customerName={customerName}
        customerPhone={customerPhone}
        customerAddress={customerAddress}
        required={needsCustomer}
        onClose={() => setCustomerModalOpen(false)}
        onCustomerNameChange={onCustomerNameChange}
        onCustomerPhoneChange={onCustomerPhoneChange}
        onCustomerAddressChange={onCustomerAddressChange}
      />
    </div>
  );
}
