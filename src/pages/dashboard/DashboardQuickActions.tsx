import type { QuickAction } from "./types";

type DashboardQuickActionsProps = {
  quickActions: QuickAction[];
};

export default function DashboardQuickActions({ quickActions }: DashboardQuickActionsProps) {
  if (quickActions.length === 0) return null;

  return (
    <section className="quickActionsGrid">
      {quickActions.map((action) => (
        <button
          key={action.key}
          type="button"
          className={action.danger ? "quickActionBtn danger" : "quickActionBtn"}
          onClick={action.onClick}
        >
          <strong>{action.title}</strong>
          <span>{action.hint}</span>
        </button>
      ))}
    </section>
  );
}
