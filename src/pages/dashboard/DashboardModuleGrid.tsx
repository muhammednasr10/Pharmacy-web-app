import type { ModuleCard } from "./types";

type DashboardModuleGridProps = {
  isArabic: boolean;
  modules: ModuleCard[];
};

export default function DashboardModuleGrid({ isArabic, modules }: DashboardModuleGridProps) {
  if (modules.length === 0) {
    return (
      <section className="card">
        <p className="empty">
          {isArabic ? "لا توجد بطاقات متاحة لدورك الحالي" : "No dashboard cards for your role"}
        </p>
      </section>
    );
  }

  return (
    <section className="moduleGrid">
      {modules.map((mod) => (
        <button
          type="button"
          className={`moduleCard tone-${mod.tone}`}
          key={mod.key}
          onClick={mod.onClick}
        >
          <span className="moduleIcon">{mod.icon}</span>
          <span className="moduleLabel">{mod.label}</span>
          <strong className="moduleValue">{mod.value}</strong>
          {mod.sub && <span className="moduleSub">{mod.sub}</span>}
        </button>
      ))}
    </section>
  );
}
