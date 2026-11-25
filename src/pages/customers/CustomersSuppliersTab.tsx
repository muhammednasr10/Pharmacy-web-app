import type { CustomersPageState } from "./useCustomersPageState";

type Props = { state: CustomersPageState };

export default function CustomersSuppliersTab({ state }: Props) {
  const {
    isArabic,
    activeTab,
    filteredSuppliers,
    supplierSearch,
    setSupplierSearch,
    setSupplierFormInitial,
    setSupplierFormOpen,
    deleteSupplier,
  } = state;

  if (activeTab !== "suppliers") return null;

  return (
    <div className="crmCustomersPanel">
      <div className="crmPanelToolbar">
        <button
          type="button"
          className="printFullBtn"
          onClick={() => {
            setSupplierFormInitial({ id: Date.now() });
            setSupplierFormOpen(true);
          }}
        >
          + {isArabic ? "إضافة مورد" : "Add supplier"}
        </button>
      </div>

      <div className="filtersBar">
        <input
          value={supplierSearch}
          onChange={(e) => setSupplierSearch(e.target.value)}
          placeholder={isArabic ? "بحث بالاسم أو الهاتف أو الشركة" : "Search name, phone, or company"}
        />
        <button type="button" className="clearCartBtn" onClick={() => setSupplierSearch("")}>
          {isArabic ? "مسح البحث" : "Clear search"}
        </button>
      </div>

      {filteredSuppliers.length === 0 ? (
        <p className="empty">{isArabic ? "لا يوجد موردين مسجلين" : "No suppliers registered"}</p>
      ) : (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>{isArabic ? "المورد" : "Supplier"}</th>
                <th>{isArabic ? "الشركة" : "Company"}</th>
                <th>{isArabic ? "الهاتف" : "Phone"}</th>
                <th>{isArabic ? "البريد" : "Email"}</th>
                <th>{isArabic ? "العنوان" : "Address"}</th>
                <th>{isArabic ? "الحالة" : "Status"}</th>
                <th>{isArabic ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td>
                    <strong>{supplier.name}</strong>
                    {supplier.notes ? (
                      <div className="crmMutedNote">{supplier.notes}</div>
                    ) : null}
                  </td>
                  <td>{supplier.company || "—"}</td>
                  <td dir="ltr">{supplier.phone || "—"}</td>
                  <td dir="ltr">{supplier.email || "—"}</td>
                  <td>{supplier.address || "—"}</td>
                  <td>
                    {supplier.isActive === false
                      ? isArabic
                        ? "موقوف"
                        : "Inactive"
                      : isArabic
                        ? "نشط"
                        : "Active"}
                  </td>
                  <td>
                    <div className="crmRowActions">
                      <button
                        type="button"
                        className="printBtn"
                        onClick={() => {
                          setSupplierFormInitial(supplier);
                          setSupplierFormOpen(true);
                        }}
                      >
                        {isArabic ? "تعديل" : "Edit"}
                      </button>
                      <button
                        type="button"
                        className="clearCartBtn"
                        onClick={() => void deleteSupplier(supplier.id, supplier.name)}
                      >
                        {isArabic ? "حذف" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
