import { useEffect, useMemo, useState } from "react";
import type { BranchStockTransfer, NewMedicineForm, Medicine } from "../types";
import MedicineForm from "../components/MedicineForm";
import MedicineTable from "../components/MedicineTable";
import MedicineStockDetailModal from "../components/MedicineStockDetailModal";
import BranchTransferModal from "../components/BranchTransferModal";
import ReorderSuggestionsModal from "../components/ReorderSuggestionsModal";
import StockCountModal from "../components/StockCountModal";
import MedicineCatalogImportModal from "../components/MedicineCatalogImportModal";
import TierUpgradeNotice from "../components/TierUpgradeNotice";
import { saveReorderPurchaseDraft, type ReorderPurchaseDraft } from "../utils/reorderSuggestions";
import type { PharmacySettings } from "../types";
import type { StockCountSession } from "../utils/stockCount";

type InventoryPageProps = {
  medicines: Medicine[];
  branches: PharmacySettings[];
  newMedicine: NewMedicineForm;
  editingMedicineId: number | null;
  isArabic: boolean;
  t: Record<string, string>;
  currency: string;
  showBranchColumn?: boolean;
  getBranchLabel?: (branchId: string | undefined) => string;
  canTransferStock?: boolean;
  transferUpgradeNotice?: string | null;
  onOpenSubscriptionSettings?: () => void;
  onTransferComplete?: () => void | Promise<void>;
  onPrintTransfer?: (records: BranchStockTransfer[]) => void;
  onApplyStockCount?: (session: StockCountSession) => Promise<void>;
  onOpenPurchasesWithReorder?: () => void;
  userId?: string;
  userName?: string;
  onFormChange: (value: NewMedicineForm) => void;
  onSave: () => boolean | Promise<boolean>;
  onCancel: () => void;
  onOpenAdd: () => void;
  disabled: boolean;
  exportInventoryCSV: () => void;
  isSubscriptionExpired: boolean;
  canManageInventory: boolean;
  canDeleteMedicine: boolean;
  onEditMedicine: (medicine: Medicine) => void;
  onDeleteMedicine: (medicine: Medicine) => void;
  pharmacyId: string;
  onReloadMedicines?: () => void | Promise<void>;
  lowStockThreshold: number;
  expiringSoonDays: number;
  branchAwareAlerts?: boolean;
  fallbackSettings?: PharmacySettings | null;
};

export default function InventoryPage({
  medicines,
  branches,
  newMedicine,
  editingMedicineId,
  isArabic,
  t,
  currency,
  showBranchColumn = false,
  getBranchLabel,
  canTransferStock = false,
  transferUpgradeNotice = null,
  onOpenSubscriptionSettings,
  onTransferComplete,
  onPrintTransfer,
  onApplyStockCount,
  onOpenPurchasesWithReorder,
  userId,
  userName,
  onFormChange,
  onSave,
  onCancel,
  onOpenAdd,
  disabled,
  exportInventoryCSV,
  isSubscriptionExpired,
  canManageInventory,
  canDeleteMedicine,
  onEditMedicine,
  onDeleteMedicine,
  pharmacyId,
  onReloadMedicines,
  lowStockThreshold,
  expiringSoonDays,
  branchAwareAlerts = false,
  fallbackSettings = null,
}: InventoryPageProps) {
  const [showMedicineForm, setShowMedicineForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [stockDetailMedicine, setStockDetailMedicine] = useState<Medicine | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showStockCountModal, setShowStockCountModal] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [showCatalogImportModal, setShowCatalogImportModal] = useState(false);

  const branchMedicines = useMemo(
    () =>
      medicines.filter(
        (medicine) =>
          !pharmacyId ||
          medicine.pharmacyId === pharmacyId ||
          (!medicine.pharmacyId && pharmacyId === "main"),
      ),
    [medicines, pharmacyId],
  );

  useEffect(() => {
    if (editingMedicineId) {
      setShowMedicineForm(true);
    }
  }, [editingMedicineId]);

  useEffect(() => {
    if (!showMedicineForm) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeForm();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showMedicineForm]);

  function openAddForm() {
    onOpenAdd();
    setShowMedicineForm(true);
  }

  function closeForm() {
    onCancel();
    setShowMedicineForm(false);
  }

  function handleEditMedicine(medicine: Medicine) {
    onEditMedicine(medicine);
    setShowMedicineForm(true);
  }

  async function handleSave() {
    if (isSaving) return;

    try {
      setIsSaving(true);
      const saved = await onSave();
      if (saved) {
        setShowMedicineForm(false);
      }
    } catch (error) {
      console.error("Save medicine error:", error);
      alert(
        error instanceof Error
          ? error.message
          : isArabic
            ? "حدث خطأ أثناء حفظ الدواء"
            : "Failed to save medicine",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const formTitle = editingMedicineId ? t.editMedicine : t.addMedicine;

  return (
    <section className="card inventoryOnlyPage">
      <div className="cardHeader">
        <div>
          <h2>{t.inventory}</h2>
          <p className="mutedText">
            {isArabic
              ? `إجمالي الأدوية: ${medicines.length}`
              : `Total medicines: ${medicines.length}`}
          </p>
        </div>
        <div className="inventoryHeaderActions">
          {canTransferStock && branches.length > 1 && (
            <button type="button" className="editBtn" onClick={() => setShowTransferModal(true)}>
              {isArabic ? "⇄ نقل بين الفروع" : "⇄ Branch transfer"}
            </button>
          )}
          {canManageInventory && !isSubscriptionExpired && onOpenPurchasesWithReorder && (
            <button type="button" className="editBtn" onClick={() => setShowReorderModal(true)}>
              {isArabic ? "🛒 اقتراح توريد" : "🛒 Reorder"}
            </button>
          )}
          {canManageInventory && !isSubscriptionExpired && onApplyStockCount && (
            <button type="button" className="editBtn" onClick={() => setShowStockCountModal(true)}>
              {isArabic ? "📋 جرد مخزون" : "📋 Stock count"}
            </button>
          )}
          {canManageInventory && !isSubscriptionExpired && (
            <button type="button" className="editBtn" onClick={() => setShowCatalogImportModal(true)}>
              {isArabic ? "📥 استيراد كتالوج" : "📥 Import catalog"}
            </button>
          )}
          {canManageInventory && !isSubscriptionExpired && (
            <button type="button" className="addMedicineBtn" onClick={openAddForm}>
              {isArabic ? "+ إضافة دواء جديد" : "+ Add New Medicine"}
            </button>
          )}
          <button type="button" className="printBtn" onClick={exportInventoryCSV}>
            <span aria-hidden="true">⬇️</span>
            <span>{isArabic ? "تصدير Excel" : "Export Excel"}</span>
          </button>
        </div>
      </div>

      {transferUpgradeNotice && onOpenSubscriptionSettings && (
        <TierUpgradeNotice
          isArabic={isArabic}
          message={transferUpgradeNotice}
          onAction={onOpenSubscriptionSettings}
        />
      )}

      <MedicineTable
        medicines={medicines}
        t={t}
        isArabic={isArabic}
        currency={currency}
        showColumnFilters
        showBranchColumn={showBranchColumn}
        getBranchLabel={getBranchLabel}
        showManagementActions={true}
        canUsePOS={false}
        canManageInventory={canManageInventory}
        canDeleteMedicine={canDeleteMedicine}
        onEditMedicine={handleEditMedicine}
        onDeleteMedicine={onDeleteMedicine}
        onViewStockDetail={setStockDetailMedicine}
        lowStockThreshold={lowStockThreshold}
        expiringSoonDays={expiringSoonDays}
        branchAwareAlerts={branchAwareAlerts}
        branches={branches}
        fallbackSettings={fallbackSettings}
      />

      {showReorderModal && onOpenPurchasesWithReorder && (
        <ReorderSuggestionsModal
          isArabic={isArabic}
          open={showReorderModal}
          onClose={() => setShowReorderModal(false)}
          medicines={medicines}
          branches={branches}
          defaultBranchId={pharmacyId}
          allowBranchPicker={showBranchColumn && branches.length > 1}
          fallbackSettings={fallbackSettings}
          onApplyDraft={(draft: ReorderPurchaseDraft) => {
            saveReorderPurchaseDraft(draft);
            setShowReorderModal(false);
            onOpenPurchasesWithReorder();
          }}
        />
      )}

      {showStockCountModal && onApplyStockCount && (
        <StockCountModal
          isArabic={isArabic}
          pharmacyId={pharmacyId}
          medicines={branchMedicines}
          userId={userId}
          userName={userName}
          disabled={disabled}
          onClose={() => setShowStockCountModal(false)}
          onApply={onApplyStockCount}
        />
      )}

      {showTransferModal && (
        <BranchTransferModal
          branches={branches}
          defaultFromBranchId={pharmacyId}
          isArabic={isArabic}
          userId={userId}
          userName={userName}
          onClose={() => setShowTransferModal(false)}
          onComplete={async () => {
            if (onTransferComplete) await onTransferComplete();
          }}
          onPrintTransfer={onPrintTransfer}
        />
      )}

      {stockDetailMedicine && (
        <MedicineStockDetailModal
          medicine={stockDetailMedicine}
          pharmacyId={pharmacyId}
          isArabic={isArabic}
          onClose={() => setStockDetailMedicine(null)}
        />
      )}

      {showMedicineForm && canManageInventory && (
        <div className="modalOverlay" onClick={closeForm}>
          <div className="medicineFormModal" onClick={(event) => event.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <h2>{formTitle}</h2>
                <p className="mutedText">
                  {editingMedicineId
                    ? isArabic
                      ? "عدّل بيانات الدواء ثم احفظ أو ألغِ"
                      : "Edit medicine details, then save or cancel"
                    : isArabic
                      ? "أدخل بيانات الدواء الجديد"
                      : "Enter new medicine details"}
                </p>
              </div>
              <button type="button" className="closeBtn" onClick={closeForm} aria-label={t.close}>
                ×
              </button>
            </div>
            <MedicineForm
              newMedicine={newMedicine}
              editingMedicineId={editingMedicineId}
              medicines={medicines}
              isArabic={isArabic}
              t={t}
              onFormChange={onFormChange}
              onSave={handleSave}
              onCancel={closeForm}
              disabled={disabled}
              isSaving={isSaving}
              showCancel
              hideTitle
              lookupResetKey={editingMedicineId ?? "new"}
            />
          </div>
        </div>
      )}

      <MedicineCatalogImportModal
        isArabic={isArabic}
        open={showCatalogImportModal}
        pharmacyId={pharmacyId}
        currentMedicineCount={branchMedicines.length}
        onClose={() => setShowCatalogImportModal(false)}
        onComplete={async () => {
          if (onReloadMedicines) await onReloadMedicines();
        }}
      />
    </section>
  );
}
