type Props = {
  variant: "header" | "checkout";
  isArabic: boolean;
  employeeName?: string;
  onClick: () => void;
};

export default function PosDeliveryEmployeeTriggerButton({
  variant,
  isArabic,
  employeeName = "",
  onClick,
}: Props) {
  const hasData = Boolean(employeeName.trim());
  const emptyLabel =
    variant === "checkout"
      ? isArabic
        ? "اختر موظف الدليفري"
        : "Select delivery person"
      : isArabic
        ? "دليفري"
        : "Delivery";

  return (
    <button
      type="button"
      className={`posDeliveryEmployeeBtn${variant === "checkout" ? " posDeliveryEmployeeBtn--checkout" : ""}${
        hasData ? " has-data" : ""
      }`}
      onClick={onClick}
      title={
        hasData
          ? employeeName
          : isArabic
            ? "اختيار الدليفري"
            : "Select delivery person"
      }
      aria-label={
        hasData
          ? isArabic
            ? `الدليفري: ${employeeName}`
            : `Delivery: ${employeeName}`
          : isArabic
            ? "اختيار موظف الدليفري"
            : "Select delivery employee"
      }
    >
      <span aria-hidden="true">🛵</span>
      <span className="posDeliveryEmployeeBtnLabel">{hasData ? employeeName : emptyLabel}</span>
      {hasData ? <span className="posCustomerDataDot" aria-hidden="true" /> : null}
    </button>
  );
}
