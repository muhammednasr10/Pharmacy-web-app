import { useDeliveryEmployeePickerEmployees } from "./useDeliveryEmployeePickerEmployees";

type PosDeliveryEmployeePickerProps = {
  isArabic: boolean;
  open: boolean;
  selectedEmployeeId?: string;
  onClose: () => void;
  onSelect: (employee: { id: string; name: string } | null) => void;
};

export default function PosDeliveryEmployeePicker({
  isArabic,
  open,
  selectedEmployeeId = "",
  onClose,
  onSelect,
}: PosDeliveryEmployeePickerProps) {
  const { filtered, loading, search, setSearch, error } = useDeliveryEmployeePickerEmployees(
    open,
    isArabic,
  );

  if (!open) return null;

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div
        className="invoiceModal purchaseModal crmFormModal posDeliveryPickerModal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modalHeader">
          <div>
            <h2>{isArabic ? "اختيار الدليفري" : "Select delivery person"}</h2>
            <p>
              {isArabic
                ? "يظهر هنا الموظفون بدور دليفري فقط"
                : "Only employees with a delivery role appear here"}
            </p>
          </div>
          <button type="button" className="closeBtn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="filtersBar">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={isArabic ? "بحث بالاسم أو الهاتف أو الوظيفة" : "Search name, phone, or job"}
            autoFocus
          />
        </div>

        {loading ? (
          <p className="empty">{isArabic ? "جاري التحميل..." : "Loading..."}</p>
        ) : error ? (
          <p className="empty">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="empty">
            {isArabic
              ? "لا يوجد موظفين بدور دليفري. عيّن الدور من صفحة الموظفين أولاً."
              : "No delivery-role employees. Assign the delivery role on the Staff page first."}
          </p>
        ) : (
          <div className="posDeliveryEmployeeList">
            {filtered.map((employee) => {
              const selected = employee.id === selectedEmployeeId;
              return (
                <button
                  key={employee.id}
                  type="button"
                  className={`posDeliveryEmployeeOption${selected ? " is-selected" : ""}`}
                  onClick={() => {
                    onSelect({ id: employee.id, name: employee.name });
                    onClose();
                  }}
                >
                  <strong>{employee.name}</strong>
                  <span className="posDeliveryEmployeeMeta">
                    {[employee.jobTitle, employee.phone, employee.employeeCode]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="modalActions">
          {selectedEmployeeId ? (
            <button
              type="button"
              className="clearCartBtn"
              onClick={() => {
                onSelect(null);
                onClose();
              }}
            >
              {isArabic ? "إلغاء الاختيار" : "Clear selection"}
            </button>
          ) : null}
          <button type="button" className="completeBtn" onClick={onClose}>
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
