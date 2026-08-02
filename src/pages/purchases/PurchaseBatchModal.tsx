import BranchScopeSelect from "../../components/BranchScopeSelect";
import MedicineEntryGrid from "../../components/MedicineEntryGrid";
import type { PurchasesPageState } from "./usePurchasesPageState";

type Props = { state: PurchasesPageState };

export default function PurchaseBatchModal({ state }: Props) {
  const {
    isArabic,
    t,
    isSubscriptionExpired,
    branchOptions,
    showPurchaseModal,
    setShowPurchaseModal,
    purchaseNumber,
    targetBranchId,
    setTargetBranchId,
    supplierName,
    setSupplierName,
    notes,
    setNotes,
    itemForm,
    setItemForm,
    draftItems,
    setDraftItems,
    branchMedicines,
    saving,
    isEditMode,
    editingDraftKey,
    itemLookupResetKey,
    addDraftItem,
    editDraftItem,
    cancelDraftItemEdit,
    savePurchaseBatch,
  } = state;

  if (!showPurchaseModal) return null;

  return (
    <div className="modalOverlay">
      <div className="invoiceModal purchaseModal" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div>
            <h2>
              {isEditMode
                ? isArabic
                  ? "تعديل توريد"
                  : "Edit Purchase"
                : isArabic
                  ? "تسجيل توريد جديد"
                  : "New Purchase"}
            </h2>
            <p>
              {isEditMode
                ? isArabic
                  ? "عدّل المورد والملاحظات والأصناف ثم احفظ"
                  : "Edit supplier, notes, and items then save"
                : isArabic
                  ? "حدد الفرع وأضف الأصناف تحت نفس رقم التوريد"
                  : "Select branch and add items under one purchase number"}
            </p>
          </div>
          <button
            type="button"
            className="closeBtn"
            onClick={() => !saving && setShowPurchaseModal(false)}
          >
            ×
          </button>
        </div>

        <div className="purchaseMetaGrid">
          <div className="purchaseMetaField">
            <label>{isArabic ? "رقم التوريد" : "Purchase No."}</label>
            <input value={purchaseNumber} readOnly className="purchaseNumberReadonly" />
          </div>
          <div className="purchaseMetaField">
            <label>{isArabic ? "الفرع المستهدف" : "Target branch"}</label>
            <BranchScopeSelect
              pharmacies={branchOptions}
              value={targetBranchId}
              onChange={setTargetBranchId}
              isArabic={isArabic}
              disabled={saving || isEditMode}
            />
          </div>
          <div className="purchaseMetaField">
            <label>{isArabic ? "اسم المورد" : "Supplier"}</label>
            <input
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder={isArabic ? "اسم المورد" : "Supplier name"}
              disabled={saving}
            />
          </div>
          <div className="purchaseMetaField purchaseMetaFieldWide">
            <label>{isArabic ? "ملاحظات" : "Notes"}</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isArabic ? "ملاحظات اختيارية" : "Optional notes"}
              disabled={saving}
            />
          </div>
        </div>

        <div className="purchaseItemsSection">
          <h3>
            {editingDraftKey
              ? isArabic
                ? "تعديل صنف في التوريد"
                : "Edit purchase item"
              : isArabic
                ? "إضافة صنف للتوريد"
                : "Add item to purchase"}
          </h3>
          <div className="medicineForm purchaseModalForm">
            <p className="returnsSectionHint purchaseScannerHint">
              {isArabic
                ? "يمكنك مسح الباركود بالماسح الضوئي أو الكاميرا أثناء إدخال الأصناف"
                : "Scan barcodes with a hardware scanner or camera while adding items"}
            </p>
            <MedicineEntryGrid
              medicines={branchMedicines}
              value={itemForm}
              onChange={setItemForm}
              isArabic={isArabic}
              t={t}
              disabled={saving}
              qtyPlaceholder={isArabic ? "كمية التوريد" : "Purchase quantity"}
              resetKey={`${itemLookupResetKey}-${editingDraftKey || "new"}`}
              enableHardwareScanner
            />
          </div>
          <div className="purchaseAddItemActions">
            <button
              type="button"
              className={editingDraftKey ? "editBtn" : "printBtn purchaseAddItemBtn"}
              onClick={addDraftItem}
              disabled={saving}
            >
              {editingDraftKey
                ? isArabic
                  ? "حفظ تعديل الصنف"
                  : "Save item changes"
                : isArabic
                  ? "+ إضافة للتوريد"
                  : "+ Add to purchase"}
            </button>
            {editingDraftKey && (
              <button
                type="button"
                className="completeBtn"
                onClick={cancelDraftItemEdit}
                disabled={saving}
              >
                {isArabic ? "إلغاء التعديل" : "Cancel edit"}
              </button>
            )}
          </div>
        </div>

        {draftItems.length > 0 && (
          <div className="purchaseDraftTableWrap">
            <h3>
              {isArabic
                ? `أصناف التوريد (${draftItems.length})`
                : `Purchase items (${draftItems.length})`}
            </h3>
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>{t.medicine}</th>
                    <th>{t.barcode}</th>
                    <th>{t.qty}</th>
                    <th>{isArabic ? "شراء" : "Buy"}</th>
                    <th>{isArabic ? "بيع" : "Sell"}</th>
                    <th>{t.expiry}</th>
                    <th>{t.action}</th>
                  </tr>
                </thead>
                <tbody>
                  {draftItems.map((item) => (
                    <tr key={item.key}>
                      <td>{isArabic ? item.name_ar : item.name_en}</td>
                      <td>{item.barcode}</td>
                      <td>{item.qty}</td>
                      <td>{item.buyPrice.toFixed(2)}</td>
                      <td>{item.price.toFixed(2)}</td>
                      <td>{item.expiry}</td>
                      <td>
                        <div className="actionButtons purchaseRowActions">
                          <button
                            type="button"
                            className="editBtn"
                            onClick={() => editDraftItem(item)}
                            disabled={saving}
                          >
                            {t.edit}
                          </button>
                          <button
                            type="button"
                            className="deleteSmallBtn"
                            onClick={() => {
                              if (editingDraftKey === item.key) {
                                cancelDraftItemEdit();
                              }
                              setDraftItems((prev) => prev.filter((row) => row.key !== item.key));
                            }}
                            disabled={saving}
                          >
                            {t.remove}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="modalActions">
          <button
            type="button"
            className="addMedicineBtn"
            onClick={() => void savePurchaseBatch()}
            disabled={isSubscriptionExpired || saving || draftItems.length === 0}
          >
            {saving
              ? isArabic
                ? "جاري الحفظ..."
                : "Saving..."
              : isEditMode
                ? isArabic
                  ? "حفظ التعديل"
                  : "Save Changes"
                : isArabic
                  ? "حفظ التوريد"
                  : "Save Purchase"}
          </button>
          <button
            type="button"
            className="completeBtn"
            onClick={() => !saving && setShowPurchaseModal(false)}
            disabled={saving}
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}
