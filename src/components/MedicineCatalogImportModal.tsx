import { useEffect, useMemo, useState } from "react";
import * as pharmacyService from "../services/pharmacyService";
import {
  chunkCatalogRows,
  MEDICINE_CATALOG_IMPORT_BATCH_SIZE,
  parseMedicineCatalogFile,
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
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [previewRows, setPreviewRows] = useState<MedicineCatalogImportRow[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; phase: "clearing" | "importing" } | null>(
    null,
  );
  const [error, setError] = useState("");
  const [catalogTotal, setCatalogTotal] = useState<number | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const previewSample = useMemo(() => previewRows.slice(0, 5), [previewRows]);
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

  if (!open) return null;

  async function handleFileChange(file: File | null) {
    if (!file) return;
    setLoadingPreview(true);
    setError("");
    try {
      const text = await file.text();
      const rows = parseMedicineCatalogFile(text, file.name);
      if (rows.length === 0) {
        throw new Error("empty_file");
      }
      setPreviewRows(rows);
    } catch (loadError) {
      console.error(loadError);
      setError(isArabic ? "ملف CSV غير صالح" : "Invalid CSV file");
      setPreviewRows([]);
    } finally {
      setLoadingPreview(false);
    }
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
    setProgress({ done: 0, total: 1, phase: "importing" });

    try {
      const result = await pharmacyService.syncPharmacyFromCatalogReference(pharmacyId);
      setProgress({
        done: result.updated + result.inserted,
        total: result.updated + result.inserted,
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
    setProgress({ done: 0, total: 1, phase: "clearing" });

    try {
      const result = await pharmacyService.seedPharmacyFromCatalogReference(pharmacyId);
      setProgress({ done: result.inserted, total: result.inserted, phase: "importing" });
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

    const confirmed = window.confirm(
      replaceExisting
        ? isArabic
          ? `سيتم حذف ${currentMedicineCount.toLocaleString()} دواء حالياً في هذا الفرع واستبدالهم بـ ${previewRows.length.toLocaleString()} دواء من الملف.\n\nمتابعة؟`
          : `This will delete ${currentMedicineCount.toLocaleString()} medicines in this branch and replace them with ${previewRows.length.toLocaleString()} items from the file.\n\nContinue?`
        : isArabic
          ? `سيتم إضافة ${previewRows.length.toLocaleString()} دواء إلى الفرع الحالي.\n\nمتابعة؟`
          : `This will add ${previewRows.length.toLocaleString()} medicines to the current branch.\n\nContinue?`,
    );
    if (!confirmed) return;

    setImporting(true);
    setError("");
    setProgress({ done: 0, total: previewRows.length, phase: "clearing" });

    try {
      if (replaceExisting) {
        await pharmacyService.replacePharmacyMedicineCatalog(pharmacyId, previewRows, setProgress);
      } else {
        const chunks = chunkCatalogRows(previewRows, MEDICINE_CATALOG_IMPORT_BATCH_SIZE);
        let done = 0;
        for (const chunk of chunks) {
          await pharmacyService.importMedicineCatalogBatch(pharmacyId, chunk);
          done += chunk.length;
          setProgress({ done, total: previewRows.length, phase: "importing" });
        }
      }

      await onComplete();
      onClose();
      alert(
        isArabic
          ? `تم استيراد ${previewRows.length.toLocaleString()} دواء بنجاح`
          : `Successfully imported ${previewRows.length.toLocaleString()} medicines`,
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

  const progressPercent =
    progress && progress.total > 0 ? Math.min(100, Math.round((progress.done / progress.total) * 100)) : 0;

  return (
    <div className="modalOverlay">
      <div className="invoiceModal saasModal saasModalWide medicineCatalogImportModal" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div>
            <h2>{isArabic ? "استيراد أدوية من قاعدة Victory" : "Import medicines from Victory database"}</h2>
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
              <strong>{isArabic ? "أو رفع ملف CSV" : "Or upload a CSV file"}</strong>
              <span>
                {isArabic
                  ? "بديل — استيراد من ملف على جهازك"
                  : "Alternative — import from a file on your device"}
              </span>
              <label className="medicineCatalogImportFilePicker">
                <span>{isArabic ? "اختر ملف CSV" : "Choose CSV file"}</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
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
              <div className="tableWrap">
                <table className="dataTable">
                  <thead>
                    <tr>
                      <th>{isArabic ? "الاسم (عربي)" : "Name (AR)"}</th>
                      <th>{isArabic ? "الاسم (EN)" : "Name (EN)"}</th>
                      <th>{isArabic ? "السعر" : "Price"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewSample.map((row) => (
                      <tr key={`${row.barcode}-${row.name_en}`}>
                        <td>{row.name_ar}</td>
                        <td dir="ltr">{row.name_en}</td>
                        <td>{row.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                className="editBtn"
                disabled={importing}
                onClick={() => void startFileImport()}
              >
                {isArabic ? "استيراد من الملف" : "Import from file"}
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
