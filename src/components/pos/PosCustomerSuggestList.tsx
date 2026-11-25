import type { CrmCustomer } from "../../types";
import { getCustomerSegmentLabel } from "../../utils/crmLabels";

type Props = {
  isArabic: boolean;
  suggestions: CrmCustomer[];
  highlightIndex: number;
  onPick: (customer: CrmCustomer) => void;
};

export default function PosCustomerSuggestList({
  isArabic,
  suggestions,
  highlightIndex,
  onPick,
}: Props) {
  if (suggestions.length === 0) return null;

  return (
    <div className="posCustomerSuggestList" role="listbox">
      {suggestions.map((customer, index) => (
        <button
          key={customer.id}
          type="button"
          role="option"
          aria-selected={index === highlightIndex}
          className={`posCustomerSuggestOption${index === highlightIndex ? " is-active" : ""}`}
          onMouseDown={(event) => {
            event.preventDefault();
            onPick(customer);
          }}
        >
          <strong className="posCustomerSuggestName">{customer.name}</strong>
          <span className="posCustomerSuggestMeta" dir="ltr">
            {customer.phone || "—"}
            {customer.address ? ` · ${customer.address}` : ""}
          </span>
          <span className="posCustomerSuggestType">
            {getCustomerSegmentLabel(customer.segment, isArabic)}
          </span>
        </button>
      ))}
    </div>
  );
}
