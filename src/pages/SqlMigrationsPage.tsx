import { useCallback, useEffect, useMemo, useState } from "react";
import { SQL_MIGRATION_GROUPS, SQL_MIGRATIONS } from "../config/sqlMigrations";
import {
  checkAllSqlMigrations,
  summarizeMigrationChecks,
  type MigrationCheckRow,
} from "../services/sqlMigrationService";

type SqlMigrationsPageProps = {
  isArabic: boolean;
};

function statusLabel(status: MigrationCheckRow["status"], isArabic: boolean) {
  if (status === "ok") return isArabic ? "مُنفَّذ" : "Applied";
  if (status === "missing") return isArabic ? "غير مُنفَّذ" : "Missing";
  return isArabic ? "خطأ فحص" : "Check error";
}

export default function SqlMigrationsPage({ isArabic }: SqlMigrationsPageProps) {
  const [rows, setRows] = useState<MigrationCheckRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "missing" | "ok">("all");
  const [copiedFile, setCopiedFile] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await checkAllSqlMigrations());
    } catch (error) {
      console.error("checkAllSqlMigrations:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const summary = useMemo(() => summarizeMigrationChecks(rows), [rows]);

  const filteredRows = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((row) => row.status === filter);
  }, [rows, filter]);

  const groupedRows = useMemo(() => {
    const order = Object.keys(SQL_MIGRATION_GROUPS) as Array<keyof typeof SQL_MIGRATION_GROUPS>;
    return order
      .map((group) => ({
        group,
        label: isArabic ? SQL_MIGRATION_GROUPS[group].labelAr : SQL_MIGRATION_GROUPS[group].labelEn,
        items: filteredRows.filter((row) => row.group === group),
      }))
      .filter((section) => section.items.length > 0);
  }, [filteredRows, isArabic]);

  async function copyPath(file: string) {
    const path = `supabase/${file}`;
    try {
      await navigator.clipboard.writeText(path);
      setCopiedFile(file);
      window.setTimeout(() => setCopiedFile(""), 2000);
    } catch {
      window.prompt(isArabic ? "انسخ المسار:" : "Copy path:", path);
    }
  }

  return (
    <section className="card sqlMigrationsPage">
      <div className="cardHeader returnsPageActions">
        <div>
          <h2>{isArabic ? "حالة ملفات SQL" : "SQL migration status"}</h2>
          <p className="returnsSectionHint">
            {isArabic
              ? "يفحص الجداول والأعمدة والدوال في Supabase — شغّل الملفات الناقصة من SQL Editor بالترتيب الموصى به."
              : "Probes tables, columns, and RPCs in Supabase — run missing files in SQL Editor in the recommended order."}
          </p>
        </div>
        <button
          type="button"
          className="printBtn"
          onClick={() => void refresh()}
          disabled={loading}
        >
          {loading
            ? isArabic
              ? "جارٍ الفحص..."
              : "Checking..."
            : isArabic
              ? "إعادة الفحص"
              : "Re-check"}
        </button>
      </div>

      <div className="summaryGrid reportSummary sqlMigrationSummary">
        <div>
          <span>{isArabic ? "إجمالي الفحوصات" : "Total checks"}</span>
          <strong>{summary.total}</strong>
        </div>
        <div>
          <span>{isArabic ? "مُنفَّذ" : "Applied"}</span>
          <strong className="sqlMigrationOk">{summary.ok}</strong>
        </div>
        <div>
          <span>{isArabic ? "ناقص" : "Missing"}</span>
          <strong className="sqlMigrationMissing">{summary.missing}</strong>
        </div>
        <div>
          <span>{isArabic ? "أخطاء فحص" : "Check errors"}</span>
          <strong>{summary.errors}</strong>
        </div>
      </div>

      {summary.missing > 0 && (
        <div className="sqlMigrationAlert">
          {isArabic
            ? `يوجد ${summary.missing} عنصر غير مُنفَّذ. افتح Supabase → SQL Editor وشغّل الملفات من مجلد supabase/`
            : `${summary.missing} item(s) are missing. Open Supabase → SQL Editor and run files from the supabase/ folder.`}
        </div>
      )}

      <div className="filtersBar">
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
          <option value="all">{isArabic ? "الكل" : "All"}</option>
          <option value="missing">{isArabic ? "غير مُنفَّذ فقط" : "Missing only"}</option>
          <option value="ok">{isArabic ? "مُنفَّذ فقط" : "Applied only"}</option>
        </select>
        <span className="mutedText">
          {isArabic
            ? `${SQL_MIGRATIONS.length} ملف/فحص في القائمة المرجعية`
            : `${SQL_MIGRATIONS.length} reference checks in catalog`}
        </span>
      </div>

      {loading && rows.length === 0 ? (
        <p className="empty">{isArabic ? "جارٍ فحص قاعدة البيانات..." : "Checking database..."}</p>
      ) : groupedRows.length === 0 ? (
        <p className="empty">{isArabic ? "لا توجد نتائج للفلتر" : "No results for this filter"}</p>
      ) : (
        groupedRows.map((section) => (
          <div key={section.group} className="sqlMigrationGroup">
            <h3 className="sqlMigrationGroupTitle">{section.label}</h3>
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>{isArabic ? "الحالة" : "Status"}</th>
                    <th>{isArabic ? "الميزة" : "Feature"}</th>
                    <th>{isArabic ? "ملف SQL" : "SQL file"}</th>
                    <th>{isArabic ? "ملاحظة" : "Note"}</th>
                    <th>{isArabic ? "إجراء" : "Action"}</th>
                  </tr>
                </thead>
                <tbody>
                  {section.items.map((row) => (
                    <tr
                      key={row.id}
                      className={row.status === "missing" ? "sqlMigrationRowMissing" : ""}
                    >
                      <td>
                        <span
                          className={`badge ${row.status === "ok" ? "ok" : row.status === "missing" ? "danger" : "warn"}`}
                        >
                          {statusLabel(row.status, isArabic)}
                        </span>
                      </td>
                      <td>{isArabic ? row.titleAr : row.titleEn}</td>
                      <td>
                        <code className="sqlMigrationFile">supabase/{row.file}</code>
                      </td>
                      <td className="sqlMigrationNote">
                        {row.status === "error" && row.detail
                          ? row.detail
                          : isArabic
                            ? row.noteAr || "—"
                            : row.noteEn || "—"}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="smallBtn"
                          onClick={() => void copyPath(row.file)}
                        >
                          {copiedFile === row.file
                            ? isArabic
                              ? "تم النسخ"
                              : "Copied"
                            : isArabic
                              ? "نسخ المسار"
                              : "Copy path"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </section>
  );
}
