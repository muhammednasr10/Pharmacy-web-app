import { useEffect, useMemo, useState } from "react";
import type { BranchStockTransfer, Medicine, NewMedicineForm, PharmacySettings } from "../../types";
import MedicineForm from "../MedicineForm";
import MedicineTable from "../MedicineTable";
import MedicineStockDetailModal from "../MedicineStockDetailModal";
import BranchTransferModal from "../BranchTransferModal";
import ReorderSuggestionsModal from "../ReorderSuggestionsModal";
import StockCountModal from "../StockCountModal";
import MedicineCatalogImportModal from "../MedicineCatalogImportModal";
import TierUpgradeNotice from "../TierUpgradeNotice";
import FeatureGate from "../FeatureGate";
import { saveReorderPurchaseDraft, type ReorderPurchaseDraft } from "../../utils/reorderSuggestions";
import type { StockCountSession } from "../../utils/stockCount";
import type { StockCatalogFilter } from "../../services/pharmacy/inventoryPaginationService";
import { usePaginatedMedicines } from "../../hooks/usePaginatedMedicines";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { inventoryEmptySearchMessage } from "../../utils/inventorySearchErrors";
import InventoryPaginationBar from "./InventoryPaginationBar";

type InventoryStockPanelProps = {
  medicines: Medicine[];
  branches: PharmacySettings[];
  newMedicine: NewMedicineForm;
  editingMedicineId: number | null;
  isArabic: boolean;
  t: Record<string, string>;
  currency: string;
  enabled: boolean;
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
  canViewInventoryCostProfit: boolean;
  /** When true (14-day trial), hide inventory profit column. */
  isTrialSubscription?: boolean;
  onEditMedicine: (medicine: Medicine) => void;
  onDeleteMedicine: (medicine: Medicine) => void;
  pharmacyId: string;
  onReloadMedicines?: () => void | Promise<void>;
  lowStockThreshold: number;
  expiringSoonDays: number;
  branchAwareAlerts?: boolean;
  fallbackSettings?: PharmacySettings | null;
  refreshKey?: number;
  stockCountLaunchKey?: number;
};

const stockFilterOptions: { value: StockCatalogFilter; ar: string; en: string }[] = [
  { value: "all", ar: "الكل", en: "All" },
  { value: "low", ar: "ناقص", en: "Low stock" },
  { value: "expiring", ar: "قرب الانتهاء", en: "Expiring" },
  { value: "expired", ar: "منتهي", en: "Expired" },
];

export default function InventoryStockPanel({
  medicines,
  branches,
  newMedicine,
  editingMedicineId,
  isArabic,
  t,
  currency,
  enabled,
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
  canViewInventoryCostProfit,
  isTrialSubscription = false,
  onEditMedicine,
  onDeleteMedicine,
  pharmacyId,
  onReloadMedicines,
  lowStockThreshold,
  expiringSoonDays,
  branchAwareAlerts = false,
  fallbackSettings = null,
  refreshKey = 0,
  stockCountLaunchKey = 0,
}: InventoryStockPanelProps) {
  const isOnline = useOnlineStatus();
  const [showMedicineForm, setShowMedicineForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [stockDetailMedicine, setStockDetailMedicine] = useState<Medicine | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showStockCountModal, setShowStockCountModal] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [showCatalogImportModal, setShowCatalogImportModal] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockCatalogFilter>("all");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!stockCountLaunchKey || !canManageInventory || !onApplyStockCount) return;
    setShowStockCountModal(true);
  }, [stockCountLaunchKey, canManageInventory, onApplyStockCount]);

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

  const {
    rows: pageMedicines,
    total,
    page,
    pageSize,
    loading,
    error,
    setPage,
    reload,
    offlineSourceCount,
  } = usePaginatedMedicines({
    enabled,
    isOfflineMode: !isOnline,
    offlineMedicines: branchMedicines,
    pharmacyId,
    isArabic,
    search: debouncedSearch,
    stockFilter,
    lowStockThreshold,
    expiringSoonDays,
    refreshKey,
  });

  useEffect(() => {
    if (editingMedicineId) {
      setShowMedicineForm(true);
    }
  }, [editingMedicineId]);

  useEffect(() => {
    if (!showMedicineForm) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeForm();
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
        await onReloadMedicines?.();
        await reload();
      }
    } catch (saveError) {
      console.error("Save medicine error:", saveError);
      alert(
        saveError instanceof Error
          ? saveError.message
          : isArabic
            ? "حدث خطأ أثناء حفظ الدواء"
            : "Failed to save medicine",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(medicine: Medicine) {
    await onDeleteMedicine(medicine);
    await reload();
  }

  const formTitle = editingMedicineId ? t.editMedicine : t.addMedicine;

  return (
    <div className="invMgmtPanel" role="tabpanel">
      <div className="invMgmtPanelToolbar invMgmtStockToolbar">
        <div className="filtersBar invMgmtFiltersBar">
          <input
            className="invMgmtSearchInput"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={
              isArabic ? "بحث بالاسم أو المادة الفعالة أو الباركود" : "Search name, ingredient, or barcode"
            }
          />
          <div className="invMgmtStockChips" role="group" aria-label={isArabic ? "فلتر المخزون" : "Stock filter"}>
            {stockFilterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`invMgmtStockChip ${stockFilter === option.value ? "is-active" : ""}`}
                onClick={() => setStockFilter(option.value)}
              >
                {isArabic ? option.ar : option.en}
              </button>
            ))}
          </div>
        </div>
        <div className="inventoryHeaderActions">
          {branches.length > 1 && (canTransferStock || transferUpgradeNotice) ? (
            <FeatureGate feature="branchTransfers">
              <button
                type="button"
                className="editBtn"
                onClick={() => {
                  if (canTransferStock) setShowTransferModal(true);
                }}
              >
                {isArabic ? "⇄ نقل بين الفروع" : "⇄ Branch transfer"}
              </button>
            </FeatureGate>
          ) : null}
          {canManageInventory && onOpenPurchasesWithReorder && (
            <button type="button" className="editBtn" onClick={() => setShowReorderModal(true)}>
              {isArabic ? "🛒 اقتراح توريد" : "🛒 Reorder"}
            </button>
          )}
          {canManageInventory && onApplyStockCount && (
            <button type="button" className="editBtn" onClick={() => setShowStockCountModal(true)}>
              {isArabic ? "📋 جرد مخزون" : "📋 Stock count"}
            </button>
          )}
          {canManageInventory && (
            <button type="button" className="editBtn" onClick={() => setShowCatalogImportModal(true)}>
              {isArabic ? "📥 استيراد قاعدة بيانات أدوية" : "📥 Import medicine database"}
            </button>
          )}
          {canManageInventory && (
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

      {error ? (
        <p className="invMgmtError" role="alert">
          {isArabic ? `تعذّر تحميل المخزون: ${error}` : `Failed to load stock: ${error}`}
          <button type="button" className="invMgmtRetryBtn" onClick={() => void reload()}>
            {isArabic ? "إعادة المحاولة" : "Retry"}
          </button>
        </p>
      ) : null}

      {!isOnline ? (
        <p className="invMgmtOfflineHint" role="status">
          {isArabic
            ? "وضع عدم الاتصال — البحث يعمل على النسخة المحفوظة محلياً فقط"
            : "Offline — search uses locally saved items only"}
        </p>
      ) : null}

      <div className={loading ? "invMgmtTableLoading" : ""}>
        <MedicineTable
          medicines={pageMedicines}
          t={t}
          isArabic={isArabic}
          currency={currency}
          showColumnFilters={false}
          showBranchColumn={showBranchColumn}
          getBranchLabel={getBranchLabel}
          showManagementActions
          canUsePOS={false}
          canManageInventory={canManageInventory}
          canDeleteMedicine={canDeleteMedicine}
          showCostProfitColumns={canViewInventoryCostProfit}
          showProfitColumn={canViewInventoryCostProfit && !isTrialSubscription}
          onEditMedicine={handleEditMedicine}
          onDeleteMedicine={handleDelete}
          onViewStockDetail={setStockDetailMedicine}
          lowStockThreshold={lowStockThreshold}
          expiringSoonDays={expiringSoonDays}
          branchAwareAlerts={branchAwareAlerts}
          branches={branches}
          fallbackSettings={fallbackSettings}
          externalPagination={{
            page: page - 1,
            pageSize,
            total,
            loading,
          }}
          emptyMessage={
            error
              ? isArabic
                ? "تعذّر عرض النتائج — اضغط «إعادة المحاولة»"
                : "Could not show results — tap Retry"
              : loading
                ? isArabic
                  ? "جاري تحميل المخزون..."
                  : "Loading stock..."
                : inventoryEmptySearchMessage(
                    isArabic,
                    debouncedSearch,
                    !isOnline,
                    offlineSourceCount > 0,
                  )
          }
        />
      </div>

      <InventoryPaginationBar
        isArabic={isArabic}
        page={page}
        pageSize={pageSize}
        total={total}
        loading={loading}
        onPageChange={setPage}
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
          onApply={async (session) => {
            await onApplyStockCount(session);
            await onReloadMedicines?.();
            await reload();
          }}
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
            await reload();
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
        <div className="modalOverlay">
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
              showBuyPrice={canViewInventoryCostProfit}
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
          await reload();
        }}
      />
    </div>
  );
}
