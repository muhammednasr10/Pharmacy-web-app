import PosCustomerSuggestList from "./PosCustomerSuggestList";
import { usePosCrmCustomerDirectory } from "./usePosCrmCustomerDirectory";
import { usePosCustomerFieldSuggestions } from "./usePosCustomerFieldSuggestions";

type PosCustomerDataPanelProps = {
  isArabic: boolean;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  required: boolean;
  onCustomerNameChange: (value: string) => void;
  onCustomerPhoneChange?: (value: string) => void;
  onCustomerAddressChange?: (value: string) => void;
};

function requiredPlaceholder(isArabic: boolean, required: boolean) {
  if (required) {
    return isArabic ? "مطلوب للدليفري / الآجل" : "Required for delivery / credit";
  }
  return isArabic
    ? "اختياري — ابحث من عملاء الصيدلية"
    : "Optional — search pharmacy customers";
}

export default function PosCustomerDataPanel({
  isArabic,
  customerName,
  customerPhone,
  customerAddress,
  required,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onCustomerAddressChange,
}: PosCustomerDataPanelProps) {
  const customers = usePosCrmCustomerDirectory();
  const {
    activeField,
    setActiveField,
    highlightIndex,
    suggestions,
    clearBlurTimer,
    scheduleCloseSuggestions,
    applyCustomer,
    handleKeyDown,
  } = usePosCustomerFieldSuggestions({
    customers,
    customerName,
    customerPhone,
    onCustomerNameChange,
    onCustomerPhoneChange,
    onCustomerAddressChange,
  });

  const suggestList =
    activeField === "phone" || activeField === "name" ? (
      <PosCustomerSuggestList
        isArabic={isArabic}
        suggestions={suggestions}
        highlightIndex={highlightIndex}
        onPick={applyCustomer}
      />
    ) : null;

  return (
    <div className="posCustomerDataPanel">
      <label>{isArabic ? "رقم التليفون" : "Phone"}</label>
      <div className="posCustomerSuggestWrap">
        <input
          type="tel"
          inputMode="tel"
          value={customerPhone}
          autoComplete="off"
          onFocus={() => {
            clearBlurTimer();
            setActiveField("phone");
          }}
          onBlur={scheduleCloseSuggestions}
          onKeyDown={(event) => handleKeyDown(event, "phone")}
          onChange={(e) => {
            onCustomerPhoneChange?.(e.target.value);
            setActiveField("phone");
          }}
          placeholder={requiredPlaceholder(isArabic, required)}
        />
        {activeField === "phone" ? suggestList : null}
      </div>

      <label>{isArabic ? "اسم العميل" : "Customer name"}</label>
      <div className="posCustomerSuggestWrap">
        <input
          value={customerName}
          autoComplete="off"
          onFocus={() => {
            clearBlurTimer();
            setActiveField("name");
          }}
          onBlur={scheduleCloseSuggestions}
          onKeyDown={(event) => handleKeyDown(event, "name")}
          onChange={(e) => {
            onCustomerNameChange(e.target.value);
            setActiveField("name");
          }}
          placeholder={requiredPlaceholder(isArabic, required)}
        />
        {activeField === "name" ? suggestList : null}
      </div>

      <label>{isArabic ? "العنوان" : "Address"}</label>
      <input
        value={customerAddress}
        onChange={(e) => onCustomerAddressChange?.(e.target.value)}
        placeholder={isArabic ? "اختياري" : "Optional"}
      />
    </div>
  );
}
