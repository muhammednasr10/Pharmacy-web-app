type DashboardGettingStartedProps = {
  isArabic: boolean;
  totalMedicinesCount: number;
  hasOpenShift: boolean;
  hasCompletedSale: boolean;
  canAccessInventory: boolean;
  canAccessPos: boolean;
  onOpenInventory: () => void;
  onOpenPOS: () => void;
};

export default function DashboardGettingStarted({
  isArabic,
  totalMedicinesCount,
  hasOpenShift,
  hasCompletedSale,
  canAccessInventory,
  canAccessPos,
  onOpenInventory,
  onOpenPOS,
}: DashboardGettingStartedProps) {
  if (totalMedicinesCount > 0 && hasOpenShift && hasCompletedSale) {
    return null;
  }

  // Only guide empty / early pharmacies.
  if (totalMedicinesCount > 0 && hasCompletedSale) {
    return null;
  }

  const steps = [
    {
      key: "stock",
      done: totalMedicinesCount > 0,
      title: isArabic ? "أضف أو استورد أول صنف" : "Add or import your first item",
      hint: isArabic
        ? "افتح المخزون وأضف دواء يدويًا أو استورد من ملف"
        : "Open inventory and add a medicine or import a file",
      actionLabel: isArabic ? "فتح المخزون" : "Open inventory",
      onClick: onOpenInventory,
      enabled: canAccessInventory,
    },
    {
      key: "shift",
      done: hasOpenShift || hasCompletedSale,
      title: isArabic ? "افتح وردية" : "Open a cashier shift",
      hint: isArabic
        ? "من نقطة البيع افتح وردية قبل البيع"
        : "From POS, open a shift before selling",
      actionLabel: isArabic ? "فتح نقطة البيع" : "Open POS",
      onClick: onOpenPOS,
      enabled: canAccessPos,
    },
    {
      key: "sale",
      done: hasCompletedSale,
      title: isArabic ? "نفّذ أول بيع" : "Complete your first sale",
      hint: isArabic
        ? "ابحث عن الصنف بالاسم أو الباركود وأتمم البيع"
        : "Search by name or barcode and complete the sale",
      actionLabel: isArabic ? "البيع الآن" : "Sell now",
      onClick: onOpenPOS,
      enabled: canAccessPos && totalMedicinesCount > 0,
    },
  ];

  return (
    <section className="card dashboardGettingStarted" aria-label={isArabic ? "خطوات البداية" : "Getting started"}>
      <div className="cardHeader">
        <h2>{isArabic ? "ابدأ من هنا" : "Get started"}</h2>
        <span className="badge">
          {steps.filter((step) => step.done).length}/{steps.length}
        </span>
      </div>
      <p className="mutedText dashboardGettingStartedIntro">
        {isArabic
          ? "المخزون لسه فاضي أو لسه ما عملتش أول بيع — نفّذ الخطوات دي بالترتيب"
          : "Stock is empty or you have not made a first sale — complete these steps in order"}
      </p>
      <ol className="dashboardGettingStartedList">
        {steps.map((step, index) => (
          <li
            key={step.key}
            className={`dashboardGettingStartedStep${step.done ? " is-done" : ""}`}
          >
            <div className="dashboardGettingStartedStepMain">
              <span className="dashboardGettingStartedIndex" aria-hidden="true">
                {step.done ? "✓" : index + 1}
              </span>
              <div>
                <strong>{step.title}</strong>
                <p className="mutedText">{step.hint}</p>
              </div>
            </div>
            {step.done ? (
              <span className="dashboardGettingStartedDone">
                {isArabic ? "تم" : "Done"}
              </span>
            ) : (
              <button
                type="button"
                className="smallBtn"
                disabled={!step.enabled}
                onClick={step.onClick}
              >
                {step.actionLabel}
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
