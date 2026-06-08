import { useMemo, useState } from "react";
import type { PharmacyCost } from "../types";
import * as pharmacyService from "../services/pharmacyService";
import { COST_CATEGORIES, getCostCategoryLabel } from "../utils/costCategories";
import { formatDateInput } from "../utils/date";

const PAYMENT_METHODS = [
  { value: "cash", ar: "نقدي", en: "Cash" },
  { value: "visa", ar: "فيزا", en: "Visa" },
  { value: "wallet", ar: "محفظة", en: "Wallet" },
  { value: "transfer", ar: "تحويل", en: "Transfer" },
] as const;

const emptyCostForm = {
  title: "",
  category: "other",
  amount: 0,
  paymentMethod: "cash",
  notes: "",
};

type CostsPageProps = {
  costs: PharmacyCost[];
  isArabic: boolean;
  t: Record<string, string>;
  currency: string;
  pharmacyId: string;
  canManageCosts: boolean;
  isSubscriptionExpired: boolean;
  userId?: string;
  userName?: string;
  onActivityLog: (data: {
    type: string;
    title: string;
    description: string;
    referenceType?: string;
    referenceId?: string;
  }) => Promise<void>;
  safeNumber: (value: unknown) => number;
  downloadCSV: (filename: string, rows: string[][]) => void;
  onRefreshCosts: () => Promise<void>;
};

function getPaymentLabel(value: string, isArabic: boolean) {
  const entry = PAYMENT_METHODS.find((item) => item.value === value);
  if (!entry) return value || "-";
  return isArabic ? entry.ar : entry.en;
}

export default function CostsPage({
  costs,
  isArabic,
  t,
  currency,
  pharmacyId,
  canManageCosts,
  isSubscriptionExpired,
  userId,
  userName,
  onActivityLog,
  safeNumber,
  downloadCSV,
  onRefreshCosts,
}: CostsPageProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCost, setEditingCost] = useState<PharmacyCost | null>(null);
  const [form, setForm] = useState(emptyCostForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const filteredCosts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return costs.filter((cost) => {
      const matchesSearch =
        !query ||
        String(cost.costNumber ?? "")
          .toLowerCase()
          .includes(query) ||
        String(cost.title ?? "")
          .toLowerCase()
          .includes(query) ||
        String(cost.notes || "")
          .toLowerCase()
          .includes(query) ||
        (cost.userName || "").toLowerCase().includes(query);

      const matchesCategory = categoryFilter === "all" || cost.category === categoryFilter;

      const costDate = new Date(cost.createdAt || cost.date || 0);
      const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
      const to = toDate ? new Date(`${toDate}T23:59:59`) : null;
      const matchesFrom = !from || costDate >= from;
      const matchesTo = !to || costDate <= to;

      return matchesSearch && matchesCategory && matchesFrom && matchesTo;
    });
  }, [costs, search, categoryFilter, fromDate, toDate]);

  const totalFilteredAmount = useMemo(
    () => filteredCosts.reduce((sum, cost) => sum + safeNumber(cost.amount), 0),
    [filteredCosts, safeNumber]
  );

  const monthTotal = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return costs
      .filter((cost) => {
        const date = new Date(cost.createdAt || cost.date || 0);
        return date >= monthStart;
      })
      .reduce((sum, cost) => sum + safeNumber(cost.amount), 0);
  }, [costs, safeNumber]);

  function openAddModal() {
    setEditingCost(null);
    setForm(emptyCostForm);
    setShowModal(true);
  }

  function openEditModal(cost: PharmacyCost) {
    setEditingCost(cost);
    setForm({
      title: cost.title,
      category: cost.category || "other",
      amount: safeNumber(cost.amount),
      paymentMethod: String(cost.paymentMethod || "cash"),
      notes: cost.notes || "",
    });
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;
    setShowModal(false);
    setEditingCost(null);
    setForm(emptyCostForm);
  }

  async function handleSave() {
    if (!canManageCosts || isSubscriptionExpired || saving) return;

    if (!form.title.trim() || form.amount <= 0) {
      alert(
        isArabic
          ? "أدخل عنوان التكلفة ومبلغاً أكبر من صفر"
          : "Enter a title and amount greater than zero"
      );
      return;
    }

    setSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const displayDate = new Date().toLocaleString();

      if (editingCost) {
        await pharmacyService.updatePharmacyCost(editingCost.id, {
          title: form.title.trim(),
          category: form.category,
          amount: Number(form.amount),
          paymentMethod: form.paymentMethod,
          notes: form.notes.trim(),
        });

        await onActivityLog({
          type: "cost_update",
          title: isArabic ? "تعديل تكلفة" : "Cost Updated",
          description: isArabic
            ? `تم تعديل تكلفة ${form.title.trim()} بمبلغ ${Number(form.amount).toFixed(2)} ${currency}`
            : `Updated cost ${form.title.trim()} for ${Number(form.amount).toFixed(2)} ${currency}`,
          referenceType: "cost",
          referenceId: editingCost.costNumber,
        });
      } else {
        const costId = Date.now();
        const costNumber = `COST-${costId}`;
        const record: PharmacyCost = {
          id: costId,
          costNumber,
          title: form.title.trim(),
          category: form.category,
          amount: Number(form.amount),
          paymentMethod: form.paymentMethod,
          notes: form.notes.trim(),
          pharmacyId,
          userId,
          userName,
          date: displayDate,
          createdAt: nowIso,
        };

        await pharmacyService.savePharmacyCost(record);

        await onActivityLog({
          type: "cost_create",
          title: isArabic ? "تسجيل تكلفة" : "Cost Recorded",
          description: isArabic
            ? `تم تسجيل تكلفة ${record.title} بمبلغ ${record.amount.toFixed(2)} ${currency}`
            : `Recorded cost ${record.title} for ${record.amount.toFixed(2)} ${currency}`,
          referenceType: "cost",
          referenceId: costNumber,
        });
      }

      await onRefreshCosts();
      closeModal();
      alert(
        editingCost
          ? isArabic
            ? "تم تعديل التكلفة بنجاح"
            : "Cost updated successfully"
          : isArabic
            ? "تم تسجيل التكلفة بنجاح"
            : "Cost saved successfully"
      );
    } catch (error) {
      console.error("Save cost error:", error);
      alert(
        error instanceof Error
          ? error.message
          : isArabic
            ? "تعذر حفظ التكلفة"
            : "Could not save cost"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cost: PharmacyCost) {
    if (!canManageCosts || isSubscriptionExpired) return;

    const confirmed = window.confirm(
      isArabic
        ? `حذف تكلفة "${cost.title}"؟`
        : `Delete cost "${cost.title}"?`
    );
    if (!confirmed) return;

    setDeletingId(cost.id);
    try {
      await pharmacyService.deletePharmacyCost(cost.id);
      await onActivityLog({
        type: "cost_delete",
        title: isArabic ? "حذف تكلفة" : "Cost Deleted",
        description: isArabic
          ? `تم حذف تكلفة ${cost.title} بمبلغ ${safeNumber(cost.amount).toFixed(2)} ${currency}`
          : `Deleted cost ${cost.title} for ${safeNumber(cost.amount).toFixed(2)} ${currency}`,
        referenceType: "cost",
        referenceId: cost.costNumber,
      });
      await onRefreshCosts();
    } catch (error) {
      console.error("Delete cost error:", error);
      alert(
        error instanceof Error
          ? error.message
          : isArabic
            ? "تعذر حذف التكلفة"
            : "Could not delete cost"
      );
    } finally {
      setDeletingId(null);
    }
  }

  function exportCostsCSV() {
    const rows = [
      [
        isArabic ? "رقم التكلفة" : "Cost No.",
        isArabic ? "العنوان" : "Title",
        isArabic ? "التصنيف" : "Category",
        isArabic ? "المبلغ" : "Amount",
        isArabic ? "طريقة الدفع" : "Payment",
        isArabic ? "ملاحظات" : "Notes",
        isArabic ? "المستخدم" : "User",
        isArabic ? "التاريخ" : "Date",
      ],
      ...filteredCosts.map((cost) => [
        cost.costNumber,
        cost.title,
        getCostCategoryLabel(cost.category, isArabic),
        safeNumber(cost.amount).toFixed(2),
        getPaymentLabel(String(cost.paymentMethod), isArabic),
        cost.notes || "-",
        cost.userName || "-",
        cost.date || cost.createdAt || "-",
      ]),
    ];

    downloadCSV(`costs-${formatDateInput(new Date())}.csv`, rows);
  }

  return (
    <section className="card costsPage">
      <div className="cardHeader returnsPageActions">
        <div>
          <h2>{isArabic ? "التكاليف" : "Costs"}</h2>
          <p className="returnsSectionHint">
            {isArabic
              ? "تسجيل ومتابعة مصروفات الصيدلية التشغيلية"
              : "Record and track pharmacy operating expenses"}
          </p>
        </div>
        {canManageCosts && (
          <div className="returnsHeaderBtns">
            <button
              type="button"
              className="printFullBtn"
              onClick={openAddModal}
              disabled={isSubscriptionExpired}
            >
              {isArabic ? "+ تسجيل تكلفة" : "+ New Cost"}
            </button>
          </div>
        )}
      </div>

      <div className="costsSummaryGrid">
        <div className="costsSummaryCard">
          <span>{isArabic ? "تكاليف الشهر الحالي" : "This month"}</span>
          <strong>
            {monthTotal.toFixed(2)} {currency}
          </strong>
        </div>
        <div className="costsSummaryCard">
          <span>{isArabic ? "إجمالي النتائج المعروضة" : "Filtered total"}</span>
          <strong>
            {totalFilteredAmount.toFixed(2)} {currency}
          </strong>
        </div>
        <div className="costsSummaryCard">
          <span>{isArabic ? "عدد السجلات" : "Records"}</span>
          <strong>{filteredCosts.length}</strong>
        </div>
      </div>

      <div className="cardHeader purchasesHistoryHeader">
        <h2>{isArabic ? "سجل التكاليف" : "Costs History"}</h2>
        <button type="button" className="printBtn" onClick={exportCostsCSV}>
          <span aria-hidden="true">⬇️</span>
          <span>{isArabic ? "تصدير Excel" : "Export Excel"}</span>
        </button>
      </div>

      <div className="filtersBar purchaseFiltersBar">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            isArabic ? "بحث بالعنوان أو الرقم أو المستخدم" : "Search title, number, or user"
          }
        />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">{isArabic ? "كل التصنيفات" : "All categories"}</option>
          {COST_CATEGORIES.map((category) => (
            <option key={category.value} value={category.value}>
              {isArabic ? category.ar : category.en}
            </option>
          ))}
        </select>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        <button
          type="button"
          className="clearCartBtn"
          onClick={() => {
            setSearch("");
            setCategoryFilter("all");
            setFromDate("");
            setToDate("");
          }}
        >
          {isArabic ? "مسح الفلاتر" : "Clear filters"}
        </button>
      </div>

      {filteredCosts.length === 0 ? (
        <p className="empty">
          {isArabic ? "لا توجد تكاليف مسجلة حتى الآن" : "No costs recorded yet"}
        </p>
      ) : (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>{isArabic ? "رقم التكلفة" : "Cost No."}</th>
                <th>{isArabic ? "العنوان" : "Title"}</th>
                <th>{isArabic ? "التصنيف" : "Category"}</th>
                <th>{isArabic ? "المبلغ" : "Amount"}</th>
                <th>{isArabic ? "طريقة الدفع" : "Payment"}</th>
                <th>{isArabic ? "المستخدم" : "User"}</th>
                <th>{t.date}</th>
                {canManageCosts && <th>{t.action}</th>}
              </tr>
            </thead>
            <tbody>
              {filteredCosts.map((cost) => (
                <tr key={cost.id}>
                  <td>
                    <strong className="purchaseNumberTag">{cost.costNumber}</strong>
                  </td>
                  <td>{cost.title}</td>
                  <td>{getCostCategoryLabel(cost.category, isArabic)}</td>
                  <td>
                    {safeNumber(cost.amount).toFixed(2)} {currency}
                  </td>
                  <td>{getPaymentLabel(String(cost.paymentMethod), isArabic)}</td>
                  <td>{cost.userName || "-"}</td>
                  <td>{cost.date || cost.createdAt || "-"}</td>
                  {canManageCosts && (
                    <td>
                      <div className="actionButtons purchaseRowActions">
                        <button
                          type="button"
                          className="editBtn"
                          disabled={isSubscriptionExpired || saving}
                          onClick={() => openEditModal(cost)}
                        >
                          {t.edit}
                        </button>
                        <button
                          type="button"
                          className="deleteSmallBtn"
                          disabled={
                            isSubscriptionExpired || deletingId === cost.id
                          }
                          onClick={() => void handleDelete(cost)}
                        >
                          {deletingId === cost.id ? "..." : t.delete}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modalOverlay" onClick={closeModal}>
          <div className="invoiceModal costModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <h2>
                  {editingCost
                    ? isArabic
                      ? "تعديل تكلفة"
                      : "Edit Cost"
                    : isArabic
                      ? "تسجيل تكلفة جديدة"
                      : "New Cost"}
                </h2>
              </div>
              <button type="button" className="closeBtn" onClick={closeModal}>
                ×
              </button>
            </div>

            <div className="purchaseMetaGrid">
              <div className="purchaseMetaField purchaseMetaFieldWide">
                <label>{isArabic ? "عنوان التكلفة" : "Cost title"}</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder={isArabic ? "مثال: فاتورة كهرباء مارس" : "e.g. March electricity bill"}
                  disabled={saving}
                />
              </div>
              <div className="purchaseMetaField">
                <label>{isArabic ? "التصنيف" : "Category"}</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  disabled={saving}
                >
                  {COST_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {isArabic ? category.ar : category.en}
                    </option>
                  ))}
                </select>
              </div>
              <div className="purchaseMetaField">
                <label>{isArabic ? "المبلغ" : "Amount"}</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.amount || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      amount: e.target.value === "" ? 0 : Number(e.target.value),
                    })
                  }
                  disabled={saving}
                />
              </div>
              <div className="purchaseMetaField">
                <label>{isArabic ? "طريقة الدفع" : "Payment method"}</label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                  disabled={saving}
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method.value} value={method.value}>
                      {isArabic ? method.ar : method.en}
                    </option>
                  ))}
                </select>
              </div>
              <div className="purchaseMetaField purchaseMetaFieldWide">
                <label>{isArabic ? "ملاحظات" : "Notes"}</label>
                <input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder={isArabic ? "ملاحظات اختيارية" : "Optional notes"}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="modalActions">
              <button
                type="button"
                className="addMedicineBtn"
                onClick={() => void handleSave()}
                disabled={isSubscriptionExpired || saving}
              >
                {saving
                  ? isArabic
                    ? "جاري الحفظ..."
                    : "Saving..."
                  : editingCost
                    ? isArabic
                      ? "حفظ التعديل"
                      : "Save Changes"
                    : isArabic
                      ? "حفظ التكلفة"
                      : "Save Cost"}
              </button>
              <button type="button" className="completeBtn" onClick={closeModal} disabled={saving}>
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
