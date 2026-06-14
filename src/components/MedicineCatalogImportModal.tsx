import { useMemo, useState } from "react";
import * as pharmacyService from "../services/pharmacyService";
import {
  fetchEgyptianDrugCatalogRows,
  chunkCatalogRows,
  MEDICINE_CATALOG_IMPORT_BATCH_SIZE,
  parseEgyptianDrugCsv,
  parseMedicineCatalogJson,
  type MedicineCatalogImportRow,
} from "../utils/medicineCatalogImport";

type ImportSource = "github" | "file";

type MedicineCatalogImportModalProps = {
  isArabic: boolean;
  open: boolean;
  pharmacyId: string;
  currentMedicineCount: number;
  onClose: () => void;
  onComplete: () => void | Promise<void>;
};

export default function MedicineCatalogImportModal({
  isArabic,
  open,
  pharmacyId,
  currentMedicineCount,
  onClose,
  onComplete,
}: MedicineCatalogImportModalProps) {
  const [source, setSource] = useState<ImportSource>("github");
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [previewRows, setPreviewRows] = useState<MedicineCatalogImportRow[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; phase: "clearing" | "importing" } | null>(
    null,
  );
  const [error, setError] = useState("");

  const previewSample = useMemo(() => previewRows.slice(0, 5), [previewRows]);

  if (!open) return null;

  async function loadGithubPreview() {
    setLoadingPreview(true);
    setError("");
    try {
      const rows = await fetchEgyptianDrugCatalogRows();
      setPreviewRows(rows);
    } catch (loadError) {
      console.error(loadError);
      setError(
        isArabic
          ? "تعذر تحميل قاعدة GitHub — تحقق من الاتصال بالإنترنت"
          : "Could not load GitHub dataset — check your internet connection",
      );
      setPreviewRows([]);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleFileChange(file: File | null) {
    if (!file) return;
    setLoadingPreview(true);
    setError("");
    try {
      const text = await file.text();
      const lowerName = file.name.toLowerCase();
      const rows =
        lowerName.endsWith(".csv") || text.trimStart().startsWith("commercial_name_en")
          ? parseEgyptianDrugCsv(text)
          : parseMedicineCatalogJson(text);
      if (rows.length === 0) {
        throw new Error("empty_file");
      }
      setPreviewRows(rows);
    } catch (loadError) {
      console.error(loadError);
      setError(
        isArabic
          ? "ملف غير صالح — استخدم JSON أو CSV من هيئة الدواء / GitHub"
          : "Invalid file — use JSON or CSV from EDA / GitHub",
      );
      setPreviewRows([]);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function startImport() {
    if (previewRows.length === 0) {
      setError(isArabic ? "حمّل المعاينة أولاً" : "Load a preview first");
      return;
    }

    const confirmed = window.confirm(
      replaceExisting
        ? isArabic
          ? `سيتم حذف ${currentMedicineCount} دواء حالياً في هذا الفرع واستبدالهم بـ ${previewRows.length} دواء من الكatalog.\n\nالفواتير القديمة تبقى محفوظة لكن ارتباطها بالأدوية قد يُزال.\n\nمتابعة؟`
          : `This will delete ${currentMedicineCount} medicines in this branch and replace them with ${previewRows.length} catalog items.\n\nOld invoices stay saved but medicine links may be cleared.\n\nContinue?`
        : isArabic
          ? `سيتم إضافة ${previewRows.length} دواء إلى الفرع الحالي.\n\nمتابعة؟`
          : `This will add ${previewRows.length} medicines to the current branch.\n\nContinue?`,
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
      setError(
        message === "sql_migration_required"
          ? isArabic
            ? "شغّل migration medicine-catalog-import.sql في Supabase أولاً"
            : "Run medicine-catalog-import.sql migration in Supabase first"
          : message || (isArabic ? "تعذر الاستيراد" : "Import failed"),
      );
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
            <h2>{isArabic ? "استيراد كتالوج الأدوية" : "Import medicine catalog"}</h2>
            <p>
              {isArabic
                ? "استبدل قائمة الأدوية الحالية ببيانات محدثة من GitHub (مبنية على سجل هيئة الدواء) أو من ملف JSON/CSV"
                : "Replace the current medicine list with updated data from GitHub (EDA-based registry) or a JSON/CSV file"}
            </p>
          </div>
          <button type="button" className="closeBtn" disabled={importing} onClick={onClose}>
            ×
          </button>
        </div>

        <div className="medicineCatalogImportBody">
          <div className="medicineCatalogImportSources">
            <label className={`medicineCatalogImportSource${source === "github" ? " active" : ""}`}>
              <input
                type="radio"
                name="catalogSource"
                checked={source === "github"}
                disabled={importing}
                onChange={() => setSource("github")}
              />
              <strong>{isArabic ? "GitHub — قاعدة الأدوية المصرية" : "GitHub — Egyptian drug database"}</strong>
              <span>
                {isArabic
                  ? "~25,000 دواء — أسماء تجارية، تركيب، شركة، سعر"
                  : "~25,000 drugs — trade names, composition, manufacturer, price"}
              </span>
            </label>
            <label className={`medicineCatalogImportSource${source === "file" ? " active" : ""}`}>
              <input
                type="radio"
                name="catalogSource"
                checked={source === "file"}
                disabled={importing}
                onChange={() => setSource("file")}
              />
              <strong>{isArabic ? "رفع ملف JSON / CSV" : "Upload JSON / CSV file"}</strong>
              <span>
                {isArabic
                  ? "ملف من GitHub أو تصدير خاص بك"
                  : "File from GitHub or your own export"}
              </span>
            </label>
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
                ? `حذف الأدوية الحالية في الفرع (${currentMedicineCount}) قبل الاستيراد`
                : `Delete current branch medicines (${currentMedicineCount}) before import`}
            </span>
          </label>

          {source === "github" ? (
            <button
              type="button"
              className="editBtn"
              disabled={loadingPreview || importing}
              onClick={() => void loadGithubPreview()}
            >
              {loadingPreview
                ? isArabic
                  ? "جاري التحميل..."
                  : "Loading..."
                : isArabic
                  ? "تحميل المعاينة من GitHub"
                  : "Load preview from GitHub"}
            </button>
          ) : (
            <label className="medicineCatalogImportFilePicker">
              <span>{isArabic ? "اختر ملف JSON أو CSV" : "Choose JSON or CSV file"}</span>
              <input
                type="file"
                accept=".json,.csv,application/json,text/csv"
                disabled={loadingPreview || importing}
                onChange={(event) => void handleFileChange(event.target.files?.[0] || null)}
              />
            </label>
          )}

          {previewRows.length > 0 ? (
            <div className="medicineCatalogImportPreview">
              <p>
                {isArabic
                  ? `جاهز للاستيراد: ${previewRows.length.toLocaleString()} دواء`
                  : `Ready to import: ${previewRows.length.toLocaleString()} medicines`}
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
            {isArabic ? "إلغاء" : "Cancel"}
          </button>
          <button
            type="button"
            className="completeBtn"
            disabled={importing || previewRows.length === 0}
            onClick={() => void startImport()}
          >
            {importing
              ? isArabic
                ? "جاري الاستيراد..."
                : "Importing..."
              : isArabic
                ? "بدء الاستيراد"
                : "Start import"}
          </button>
        </div>
      </div>
    </div>
  );
}
