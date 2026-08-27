import { useEffect, useMemo, useState } from "react";
import * as pharmacyService from "../services/pharmacyService";
import type { MedicineCatalogMergeFields } from "../services/pharmacy/medicineCatalogService";
import {
  downloadMedicineCatalogExcelTemplate,
  parseMedicineCatalogUpload,
  type MedicineCatalogImportRow,
} from "../utils/medicineCatalogImport";

type MedicineCatalogImportModalProps = {
  isArabic: boolean;
  open: boolean;
  pharmacyId: string;
  currentMedicineCount: number;
  onClose: () => void;
  onComplete: () => void | Promise<void>;
};

const DEFAULT_MERGE_FIELDS: MedicineCatalogMergeFields = {
  price: true,
  buyPrice: true,
  qty: true,
  expiry: true,
  barcode: false,
};

function formatCatalogImportError(message: string, isArabic: boolean) {
  if (message === "catalog_reference_sql_required") {
    return isArabic
      ? "قاعدة بيانات Victory غير جاهزة للاستيراد — تواصل مع الدعم الفني"
      : "Victory database is not ready for import — contact support";
  }
  if (message === "catalog_reference_empty") {
    return isArabic
      ? "الكتالوج في قاعدة Victory فارغ — تواصل مع الدعم الفني"
      : "Victory medicine catalog is empty — contact support";
  }
  if (message === "sql_migration_required") {
    return isArabic
      ? "ميزة استيراد الأدوية غير مفعّلة — تواصل مع الدعم الفني"
      : "Medicine import is not enabled — contact support";
  }
  if (/statement timeout|canceling statement/i.test(message)) {
    return isArabic
      ? "الاستيراد استغرق وقتاً أطول من المتوقع — أعد المحاولة (الاستيراد يعمل على دفعات الآن)"
      : "Import took too long — try again (import now runs in smaller batches)";
  }
  if (message === "empty_or_unrecognized_csv" || message === "empty_file") {
    return isArabic
      ? "الملف فاضي أو الأعمدة مش متعرّفة. حمّل قالب Excel، املأه، وارفع ملف .xlsx مباشرة بدون تحويله لـ CSV"
      : "File is empty or columns are unrecognized. Download the Excel template, fill it, and upload the .xlsx file directly (do not convert to CSV)";
  }
  return message || (isArabic ? "تعذر الاستيراد" : "Import failed");
}

export default function MedicineCatalogImportModal({
  isArabic,
  open,
  pharmacyId,
  currentMedicineCount,
  onClose,
  onComplete,
}: MedicineCatalogImportModalProps) {
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [previewRows, setPreviewRows] = useState<MedicineCatalogImportRow[]>([]);
  const [matchedBarcodeCount, setMatchedBarcodeCount] = useState(0);
  const [scanningMatches, setScanningMatches] = useState(false);
  const [mergeFields, setMergeFields] = useState<MedicineCatalogMergeFields>(DEFAULT_MERGE_FIELDS);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
    phase: "clearing" | "importing";
  } | null>(null);
  const [error, setError] = useState("");
  const [catalogTotal, setCatalogTotal] = useState<number | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const previewSample = useMemo(() => previewRows.slice(0, 5), [previewRows]);
  const newRowCount = Math.max(0, previewRows.length - matchedBarcodeCount);
  const selectedMergeFieldCount = Object.values(mergeFields).filter(Boolean).length;
  const catalogLabel =
    catalogTotal != null
      ? catalogTotal.toLocaleString()
      : isArabic
        ? "~25,000"
        : "~25,000";

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setCatalogLoading(true);

    void pharmacyService
      .fetchMedicineCatalogReferenceStats()
      .then((stats) => {
        if (!cancelled) setCatalogTotal(stats.total);
      })
      .catch((loadError) => {
        console.warn("Catalog stats unavailable:", loadError);
        if (!cancelled) setCatalogTotal(null);
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setPreviewRows([]);
      setMatchedBarcodeCount(0);
      setMergeFields(DEFAULT_MERGE_FIELDS);
      setError("");
      setProgress(null);
    }
  }, [open]);

  if (!open) return null;

  async function refreshMatchCount(rows: MedicineCatalogImportRow[]) {
    const barcodes = rows.map((row) => row.barcode).filter(Boolean);
    if (barcodes.length === 0 || currentMedicineCount === 0) {
      setMatchedBarcodeCount(0);
      return;
    }
    setScanningMatches(true);
    try {
      const matched = await pharmacyService.countPharmacyMedicinesByBarcodes(pharmacyId, barcodes);
      setMatchedBarcodeCount(matched);
    } catch (scanError) {
      console.warn("Barcode match scan failed:", scanError);
      setMatchedBarcodeCount(0);
    } finally {
      setScanningMatches(false);
    }
  }

  async function handleFileChange(file: File | null) {
    if (!file) return;
    setLoadingPreview(true);
    setError("");
    setMatchedBarcodeCount(0);
    try {
      const rows = await parseMedicineCatalogUpload(file);
      if (rows.length === 0) {
        throw new Error("empty_or_unrecognized_csv");
      }
      setPreviewRows(rows);
      await refreshMatchCount(rows);
    } catch (loadError) {
      console.error(loadError);
      const message = loadError instanceof Error ? loadError.message : String(loadError);
      setError(formatCatalogImportError(message, isArabic));
      setPreviewRows([]);
      setMatchedBarcodeCount(0);
    } finally {
      setLoadingPreview(false);
    }
  }

  function toggleMergeField(key: keyof MedicineCatalogMergeFields) {
    setMergeFields((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function selectAllMergeFields() {
    setMergeFields({
      price: true,
      buyPrice: true,
      qty: true,
      expiry: true,
      barcode: true,
    });
  }

  async function syncFromVictoryCatalog() {
    const confirmed = window.confirm(
      isArabic
        ? "سيتم تحديث أسماء وأسعار الأدوية من قاعدة Victory وإضافة أي أدوية جديدة.\n\nالكميات وسعر الشراء وتاريخ الصلاحية الحالية ستبقى كما هي.\n\nمتابعة؟"
        : "Medicine names and prices will be updated from the Victory database and any new drugs will be added.\n\nCurrent quantities, purchase prices, and expiry dates will be kept.\n\nContinue?",
    );
    if (!confirmed) return;

    setImporting(true);
    setError("");
    setProgress({ done: 0, total: catalogTotal || 1, phase: "importing" });

    try {
      const result = await pharmacyService.syncPharmacyFromCatalogReference(pharmacyId, setProgress);
      setProgress({
        done: result.updated + result.inserted,
        total: Math.max(1, result.updated + result.inserted),
        phase: "importing",
      });
      await onComplete();
      onClose();
      alert(
        isArabic
          ? `تم تحديث ${result.updated.toLocaleString()} دواء وإضافة ${result.inserted.toLocaleString()} جديد — الكميات محفوظة`
          : `Updated ${result.updated.toLocaleString()} medicines and added ${result.inserted.toLocaleString()} new — stock preserved`,
      );
    } catch (importError) {
      console.error(importError);
      const message = importError instanceof Error ? importError.message : String(importError);
      setError(formatCatalogImportError(message, isArabic));
    } finally {
      setImporting(false);
      setProgress(null);
    }
  }

  async function importFromVictoryCatalog() {
    const confirmed = window.confirm(
      isArabic
        ? `سيتم حذف ${currentMedicineCount.toLocaleString()} دواء في هذا الفرع واستبدالهم بـ ${catalogLabel} دواء من قاعدة بيانات Victory.\n\nمتابعة؟`
        : `This will delete ${currentMedicineCount.toLocaleString()} medicines in this branch and replace them with ${catalogLabel} drugs from the Victory database.\n\nContinue?`,
    );
    if (!confirmed) return;

    setImporting(true);
    setError("");
    setProgress({ done: 0, total: catalogTotal || 1, phase: "clearing" });

    try {
      const result = await pharmacyService.seedPharmacyFromCatalogReference(pharmacyId, setProgress);
      setProgress({ done: result.inserted, total: Math.max(1, result.inserted), phase: "importing" });
      await onComplete();
      onClose();
      alert(
        isArabic
          ? `تم استيراد ${result.inserted.toLocaleString()} دواء من قاعدة Victory`
          : `Imported ${result.inserted.toLocaleString()} medicines from Victory database`,
      );
    } catch (importError) {
      console.error(importError);
      const message = importError instanceof Error ? importError.message : String(importError);
      setError(formatCatalogImportError(message, isArabic));
    } finally {
      setImporting(false);
      setProgress(null);
    }
  }

  async function startFileImport() {
    if (previewRows.length === 0) {
      setError(isArabic ? "اختر ملف CSV أولاً" : "Choose a CSV file first");
      return;
    }

    if (!replaceExisting && matchedBarcodeCount > 0 && selectedMergeFieldCount === 0) {
      setError(
        isArabic
          ? "اختر حقل واحد على الأقل للتحديث، أو فعّل حذف الأدوية الحالية"
          : "Select at least one field to update, or enable deleting current medicines",
      );
      return;
    }

    const confirmed = window.confirm(
      replaceExisting
        ? isArabic
          ? `سيتم حذف ${currentMedicineCount.toLocaleString()} دواء حالياً في هذا الفرع واستبدالهم بـ ${previewRows.length.toLocaleString()} دواء من الملف.\n\nمتابعة؟`
          : `This will delete ${currentMedicineCount.toLocaleString()} medicines in this branch and replace them with ${previewRows.length.toLocaleString()} items from the file.\n\nContinue?`
        : matchedBarcodeCount > 0
          ? isArabic
            ? `سيتم تحديث ${matchedBarcodeCount.toLocaleString()} دواء موجود بنفس الباركود حسب اختيارك، وإضافة ${newRowCount.toLocaleString()} دواء جديد.\n\nمتابعة؟`
            : `This will update ${matchedBarcodeCount.toLocaleString()} existing medicines with matching barcodes using your selected fields, and add ${newRowCount.toLocaleString()} new medicines.\n\nContinue?`
          : isArabic
            ? `سيتم إضافة ${previewRows.length.toLocaleString()} دواء إلى الفرع الحالي.\n\nمتابعة؟`
            : `This will add ${previewRows.length.toLocaleString()} medicines to the current branch.\n\nContinue?`,
    );
    if (!confirmed) return;

    setImporting(true);
    setError("");
    setProgress({
      done: 0,
      total: previewRows.length,
      phase: replaceExisting ? "clearing" : "importing",
    });

    try {
      if (replaceExisting) {
        await pharmacyService.replacePharmacyMedicineCatalog(pharmacyId, previewRows, setProgress);
        await onComplete();
        onClose();
        alert(
          isArabic
            ? `تم استيراد ${previewRows.length.toLocaleString()} دواء بنجاح`
            : `Successfully imported ${previewRows.length.toLocaleString()} medicines`,
        );
      } else {
        const result = await pharmacyService.mergePharmacyMedicineCatalog(
          pharmacyId,
          previewRows,
          mergeFields,
          setProgress,
        );
        await onComplete();
        onClose();
        alert(
          isArabic
            ? `تم تحديث ${result.updated.toLocaleString()} دواء وإضافة ${result.inserted.toLocaleString()} جديد`
            : `Updated ${result.updated.toLocaleString()} medicines and added ${result.inserted.toLocaleString()} new`,
        );
      }
    } catch (importError) {
      console.error(importError);
      const message = importError instanceof Error ? importError.message : String(importError);
      setError(formatCatalogImportError(message, isArabic));
    } finally {
      setImporting(false);
      setProgress(null);
    }
  }

  const progressPercent =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.done / progress.total) * 100))
      : 0;

  const mergeFieldOptions: Array<{ key: keyof MedicineCatalogMergeFields; ar: string; en: string }> =
    [
      { key: "buyPrice", ar: "سعر الشراء", en: "Purchase price" },
      { key: "price", ar: "سعر البيع", en: "Sell price" },
      { key: "barcode", ar: "الباركود", en: "Barcode" },
      { key: "qty", ar: "الكمية", en: "Quantity" },
      { key: "expiry", ar: "تاريخ انتهاء الصلاحية", en: "Expiry date" },
    ];

  return (
    <div className="modalOverlay">
      <div
        className="invoiceModal saasModal saasModalWide medicineCatalogImportModal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modalHeader">
          <div>
            <h2>
              {isArabic
                ? "استيراد أدوية من قاعدة Victory"
                : "Import medicines from Victory database"}
            </h2>
            <p>
              {isArabic
                ? `حمّل قائمة ${catalogLabel} دواء مصرية (أسماء، مواد فعالة، أسعار) إلى فرعك — الكميات تُسجّل لاحقاً من المشتريات أو الجرد`
                : `Load ${catalogLabel} Egyptian medicines (names, active ingredients, prices) into your branch — record quantities later via purchases or stock count`}
            </p>
            {catalogLoading ? (
              <small>{isArabic ? "جاري التحقق من الكتالوج..." : "Checking catalog availability..."}</small>
            ) : catalogTotal === 0 ? (
              <small className="medicineCatalogImportError">
                {isArabic
                  ? "الكتالوج المركزي فارغ حالياً — تواصل مع الدعم أو استخدم ملف CSV"
                  : "Central catalog is empty — contact support or use a CSV file"}
              </small>
            ) : catalogTotal != null ? (
              <small>
                {isArabic
                  ? `${catalogTotal.toLocaleString()} دواء متاح للاستيراد من Supabase`
                  : `${catalogTotal.toLocaleString()} medicines available to import from Supabase`}
              </small>
            ) : null}
          </div>
          <button type="button" className="closeBtn" disabled={importing} onClick={onClose}>
            ×
          </button>
        </div>

        <div className="medicineCatalogImportBody">
          <div className="medicineCatalogImportSources">
            <div className="medicineCatalogImportSource active">
              <strong>{isArabic ? "قاعدة بيانات Victory" : "Victory database"}</strong>
              {currentMedicineCount > 0 ? (
                <>
                  <span>
                    {isArabic
                      ? "تحديث الأسماء والأسعار — يحافظ على الكميات وسعر الشراء وتاريخ الصلاحية"
                      : "Update names and prices — keeps quantities, purchase prices, and expiry dates"}
                  </span>
                  <button
                    type="button"
                    className="completeBtn"
                    disabled={importing || catalogTotal === 0}
                    onClick={() => void syncFromVictoryCatalog()}
                  >
                    {importing
                      ? isArabic
                        ? "جاري التحديث..."
                        : "Updating..."
                      : isArabic
                        ? `تحديث الكتالوج (${catalogLabel} دواء)`
                        : `Update catalog (${catalogLabel} medicines)`}
                  </button>
                  <button
                    type="button"
                    className="printBtn medicineCatalogImportDangerBtn"
                    disabled={importing || catalogTotal === 0}
                    onClick={() => void importFromVictoryCatalog()}
                  >
                    {isArabic ? "استيراد من الصفر (يحذف الكميات)" : "Fresh import (deletes stock)"}
                  </button>
                </>
              ) : (
                <>
                  <span>
                    {isArabic
                      ? "الطريقة الموصى بها — استيراد سريع من الكتالوج المركزي"
                      : "Recommended — fast import from the central catalog"}
                  </span>
                  <button
                    type="button"
                    className="completeBtn"
                    disabled={importing || catalogTotal === 0}
                    onClick={() => void importFromVictoryCatalog()}
                  >
                    {importing
                      ? isArabic
                        ? "جاري الاستيراد..."
                        : "Importing..."
                      : isArabic
                        ? `استيراد ${catalogLabel} دواء`
                        : `Import ${catalogLabel} medicines`}
                  </button>
                </>
              )}
            </div>

            <div className="medicineCatalogImportSource">
              <strong>{isArabic ? "أو رفع ملف Excel / CSV" : "Or upload an Excel / CSV file"}</strong>
              <span>
                {isArabic
                  ? "بديل — استيراد من ملف على جهازك (مع الكميات). استخدم Excel مباشرة عشان العربي ما يتكسرش"
                  : "Alternative — import from a file on your device (with quantities). Prefer Excel so Arabic stays intact"}
              </span>
              <button
                type="button"
                className="editBtn medicineCatalogImportTemplateBtn"
                disabled={importing}
                onClick={() => void downloadMedicineCatalogExcelTemplate()}
              >
                {isArabic ? "تحميل قالب Excel جاهز" : "Download Excel template"}
              </button>
              <p className="medicineCatalogImportTemplateHint">
                {isArabic
                  ? "افتح القالب في Excel، املأ الأدوية والكميات، واحفظه كملف Excel (.xlsx) ثم ارفعه من الزر التالي — متتحوّلوش لـ CSV."
                  : "Open the template in Excel, fill medicines and quantities, save as Excel (.xlsx), then upload below — do not convert to CSV."}
              </p>
              <label className="medicineCatalogImportFilePicker">
                <span>{isArabic ? "اختر ملف Excel أو CSV" : "Choose Excel or CSV file"}</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                  disabled={loadingPreview || importing}
                  onChange={(event) => void handleFileChange(event.target.files?.[0] || null)}
                />
              </label>
            </div>
          </div>

          <label className="medicineCatalogImportReplace">
            <input
              type="checkbox"
              checked={replaceExisting}
              disabled={importing}
              onChange={(event) => setReplaceExisting(event.target.checked)}
            />
            <span>
              {isArabic
                ? `حذف الأدوية الحالية في الفرع (${currentMedicineCount.toLocaleString()}) قبل استيراد الملف`
                : `Delete current branch medicines (${currentMedicineCount.toLocaleString()}) before file import`}
            </span>
          </label>

          {previewRows.length > 0 ? (
            <div className="medicineCatalogImportPreview">
              <p>
                {isArabic
                  ? `جاهز للاستيراد من الملف: ${previewRows.length.toLocaleString()} دواء`
                  : `Ready from file: ${previewRows.length.toLocaleString()} medicines`}
              </p>

              {!replaceExisting ? (
                <div className="medicineCatalogImportMatchBox">
                  {scanningMatches ? (
                    <p className="medicineCatalogImportMatchSummary">
                      {isArabic ? "جاري البحث عن باركودات مطابقة..." : "Scanning matching barcodes..."}
                    </p>
                  ) : matchedBarcodeCount > 0 ? (
                    <>
                      <p className="medicineCatalogImportMatchSummary">
                        {isArabic
                          ? `لقينا ${matchedBarcodeCount.toLocaleString()} دواء في البرنامج بنفس الباركود، و ${newRowCount.toLocaleString()} دواء جديد هيتضاف.`
                          : `Found ${matchedBarcodeCount.toLocaleString()} medicines already in the app with the same barcode, and ${newRowCount.toLocaleString()} new medicines will be added.`}
                      </p>
                      <p className="medicineCatalogImportMatchHint">
                        {isArabic
                          ? "اختار إيه اللي عايز تحدّثه من الملف للأدوية الموجودة (تقدر تختار الكل أو واحد بس):"
                          : "Choose which fields to update from the file for matching medicines (select all or only some):"}
                      </p>
                      <div className="medicineCatalogImportMatchActions">
                        <button
                          type="button"
                          className="smallBtn editBtn"
                          disabled={importing}
                          onClick={selectAllMergeFields}
                        >
                          {isArabic ? "اختيار الكل" : "Select all"}
                        </button>
                      </div>
                      <div className="medicineCatalogImportFieldGrid">
                        {mergeFieldOptions.map((option) => (
                          <label key={option.key} className="medicineCatalogImportFieldOption">
                            <input
                              type="checkbox"
                              checked={mergeFields[option.key]}
                              disabled={importing}
                              onChange={() => toggleMergeField(option.key)}
                            />
                            <span>{isArabic ? option.ar : option.en}</span>
                          </label>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="medicineCatalogImportMatchSummary">
                      {isArabic
                        ? "مفيش باركودات مطابقة — كل أدوية الملف هتتضاف كأدوية جديدة."
                        : "No matching barcodes — all file medicines will be added as new."}
                    </p>
                  )}
                </div>
              ) : null}

              <div className="tableWrap">
                <table className="dataTable">
                  <thead>
                    <tr>
                      <th>{isArabic ? "الاسم (عربي)" : "Name (AR)"}</th>
                      <th>{isArabic ? "الاسم (EN)" : "Name (EN)"}</th>
                      <th>{isArabic ? "الكمية" : "Qty"}</th>
                      <th>{isArabic ? "السعر" : "Price"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewSample.map((row) => (
                      <tr key={`${row.barcode}-${row.name_en}`}>
                        <td>{row.name_ar}</td>
                        <td dir="ltr">{row.name_en}</td>
                        <td>{row.qty}</td>
                        <td>{row.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                className="completeBtn"
                disabled={importing || scanningMatches}
                onClick={() => void startFileImport()}
              >
                {replaceExisting
                  ? isArabic
                    ? "استيراد من الملف (استبدال)"
                    : "Import from file (replace)"
                  : matchedBarcodeCount > 0
                    ? isArabic
                      ? "تحديث وإضافة من الملف"
                      : "Update & add from file"
                    : isArabic
                      ? "استيراد من الملف"
                      : "Import from file"}
              </button>
            </div>
          ) : null}

          {progress ? (
            <div className="medicineCatalogImportProgress">
              <div className="medicineCatalogImportProgressBar">
                <span style={{ width: `${progressPercent}%` }} />
              </div>
              <small>
                {progress.phase === "clearing"
                  ? isArabic
                    ? "جاري حذف الأدوية الحالية..."
                    : "Clearing current medicines..."
                  : isArabic
                    ? `جاري الاستيراد ${progress.done.toLocaleString()} / ${progress.total.toLocaleString()}`
                    : `Importing ${progress.done.toLocaleString()} / ${progress.total.toLocaleString()}`}
              </small>
            </div>
          ) : null}

          {error ? <p className="medicineCatalogImportError">{error}</p> : null}
        </div>

        <div className="saasModalActions">
          <button type="button" className="printBtn" disabled={importing} onClick={onClose}>
            {isArabic ? "إغلاق" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
