import { useCallback, useEffect, useMemo, useState } from "react";
import * as pharmacyService from "../services/pharmacyService";
import { ensureQaTestStock, isQaTestBranch, QA_TEST_BARCODE } from "../utils/qaTestStock";
import {
  isGettingStartedDismissed,
  setGettingStartedDismissed,
} from "../utils/gettingStartedGuide";
import { requestUiSpotlight } from "../utils/uiSpotlight";

type GettingStartedGuideProps = {
  isArabic: boolean;
  pharmacyId?: string | null;
  totalMedicinesCount: number;
  hasOpenShift: boolean;
  hasCompletedSale: boolean;
  hasLogo: boolean;
  hasAttendanceLocation: boolean;
  canAccessInventory: boolean;
  canAccessPos: boolean;
  canAccessSettings: boolean;
  canAccessUsers: boolean;
  canAccessCosts: boolean;
  onOpenInventory: () => void;
  onOpenPOS: () => void;
  onOpenSettingsPharmacy: () => void;
  onOpenSettingsEmployees: () => void;
  onOpenUsers: () => void;
  onOpenInvestment: () => void;
  onQaStockReady?: () => void | Promise<void>;
};

type GuideStep = {
  key: string;
  done: boolean;
  title: string;
  hint: string;
  actionLabel: string;
  onClick: () => void;
  enabled: boolean;
};

export default function GettingStartedGuide({
  isArabic,
  pharmacyId,
  totalMedicinesCount,
  hasOpenShift,
  hasCompletedSale,
  hasLogo,
  hasAttendanceLocation,
  canAccessInventory,
  canAccessPos,
  canAccessSettings,
  canAccessUsers,
  canAccessCosts,
  onOpenInventory,
  onOpenPOS,
  onOpenSettingsPharmacy,
  onOpenSettingsEmployees,
  onOpenUsers,
  onOpenInvestment,
  onQaStockReady,
}: GettingStartedGuideProps) {
  const [dismissed, setDismissed] = useState(() => isGettingStartedDismissed(pharmacyId));
  const [seedingQa, setSeedingQa] = useState(false);
  const [qaSeedMessage, setQaSeedMessage] = useState("");
  const [employeesCount, setEmployeesCount] = useState(0);
  const [walletsCount, setWalletsCount] = useState(0);

  const refreshSetupProgress = useCallback(async () => {
    if (!pharmacyId) return;
    try {
      const tasks: Promise<void>[] = [];
      if (canAccessUsers) {
        tasks.push(
          pharmacyService.getEmployees().then((rows) => {
            const count = rows.filter(
              (item) => !item.pharmacyId || item.pharmacyId === pharmacyId,
            ).length;
            setEmployeesCount(count);
          }),
        );
      } else {
        setEmployeesCount(0);
      }
      if (canAccessCosts) {
        tasks.push(
          pharmacyService.getPharmacyWallets(pharmacyId).then((rows) => {
            setWalletsCount(rows.filter((item) => item.isActive !== false).length);
          }),
        );
      } else {
        setWalletsCount(0);
      }
      await Promise.all(tasks);
    } catch (error) {
      console.error("Getting started progress load failed:", error);
    }
  }, [pharmacyId, canAccessUsers, canAccessCosts]);

  useEffect(() => {
    void refreshSetupProgress();
  }, [refreshSetupProgress]);

  const showQaSeed = isQaTestBranch(pharmacyId) && totalMedicinesCount === 0 && canAccessInventory;

  const steps = useMemo(() => {
    const next: GuideStep[] = [];

    if (canAccessInventory) {
      next.push({
        key: "stock",
        done: totalMedicinesCount > 0,
        title: isArabic ? "أضف أو استورد أول صنف" : "Add or import your first item",
        hint: isArabic
          ? "افتح المخزون وأضف دواء يدويًا أو استورد من ملف"
          : "Open inventory and add a medicine or import a file",
        actionLabel: isArabic ? "فتح المخزون" : "Open inventory",
        onClick: () => {
          requestUiSpotlight([
            {
              selector: '[data-tour-id="inventory-import-catalog"]',
              labelAr: "استيراد قاعدة بيانات الأدوية",
              labelEn: "Import medicine database",
              durationMs: 3200,
            },
            {
              selector: '[data-tour-id="inventory-add-medicine"]',
              labelAr: "إضافة دواء جديد",
              labelEn: "Add new medicine",
              durationMs: 3200,
            },
          ]);
          onOpenInventory();
        },
        enabled: true,
      });
    }

    if (canAccessPos) {
      next.push({
        key: "shift",
        done: hasOpenShift || hasCompletedSale,
        title: isArabic ? "افتح وردية" : "Open a cashier shift",
        hint: isArabic
          ? "من نقطة البيع افتح وردية قبل البيع"
          : "From POS, open a shift before selling",
        actionLabel: isArabic ? "فتح نقطة البيع" : "Open POS",
        onClick: onOpenPOS,
        enabled: true,
      });
      next.push({
        key: "sale",
        done: hasCompletedSale,
        title: isArabic ? "نفّذ أول بيع" : "Complete your first sale",
        hint: isArabic
          ? "ابحث عن الصنف بالاسم أو الباركود وأتمم البيع"
          : "Search by name or barcode and complete the sale",
        actionLabel: isArabic ? "البيع الآن" : "Sell now",
        onClick: onOpenPOS,
        enabled: totalMedicinesCount > 0,
      });
    }

    if (canAccessSettings) {
      next.push({
        key: "logo",
        done: hasLogo,
        title: isArabic ? "أضف لوجو الصيدلية" : "Add the pharmacy logo",
        hint: isArabic
          ? "من الإعدادات → بيانات الصيدلية ارفع اللوجو"
          : "From Settings → Pharmacy, upload your logo",
        actionLabel: isArabic ? "فتح الإعدادات" : "Open settings",
        onClick: onOpenSettingsPharmacy,
        enabled: true,
      });
    }

    if (canAccessUsers) {
      next.push({
        key: "staff",
        done: employeesCount > 0,
        title: isArabic ? "أضف موظفين" : "Add employees",
        hint: isArabic
          ? "من صفحة الموظفين أضف فريق العمل واربط حسابات الدخول"
          : "From Staff, add your team and link login accounts",
        actionLabel: isArabic ? "فتح الموظفين" : "Open staff",
        onClick: onOpenUsers,
        enabled: true,
      });
    }

    if (canAccessSettings && canAccessUsers) {
      next.push({
        key: "payroll_hours",
        done: hasAttendanceLocation && employeesCount > 0,
        title: isArabic ? "اضبط المرتبات ومواعيد العمل" : "Set payroll and work hours",
        hint: isArabic
          ? "من الإعدادات → إعدادات الموظفين (مرتبات/GPS) ومواعيد العمل (الشيفتات)"
          : "From Settings → Employee Settings (payroll/GPS) and Work Hours (shifts)",
        actionLabel: isArabic ? "فتح إعدادات الموظفين" : "Open employee settings",
        onClick: onOpenSettingsEmployees,
        enabled: true,
      });
    }

    if (canAccessCosts) {
      next.push({
        key: "wallets",
        done: walletsCount > 0,
        title: isArabic ? "أضف المحافظ من الاستثمار" : "Add wallets from Investment",
        hint: isArabic
          ? "من الاستثمار → المحافظ أضف صندوق كاشير أو حساب بنكي"
          : "From Investment → Portfolios, add a cash drawer or bank account",
        actionLabel: isArabic ? "فتح الاستثمار" : "Open investment",
        onClick: onOpenInvestment,
        enabled: true,
      });
    }

    return next;
  }, [
    canAccessInventory,
    canAccessPos,
    canAccessSettings,
    canAccessUsers,
    canAccessCosts,
    totalMedicinesCount,
    hasOpenShift,
    hasCompletedSale,
    hasLogo,
    hasAttendanceLocation,
    employeesCount,
    walletsCount,
    isArabic,
    onOpenInventory,
    onOpenPOS,
    onOpenSettingsPharmacy,
    onOpenSettingsEmployees,
    onOpenUsers,
    onOpenInvestment,
  ]);

  if (dismissed) return null;

  async function handleSeedQaStock() {
    if (!pharmacyId || seedingQa) return;
    setSeedingQa(true);
    setQaSeedMessage("");
    try {
      const result = await ensureQaTestStock(pharmacyId);
      setQaSeedMessage(
        isArabic
          ? `جاهز للبيع — باركود ${QA_TEST_BARCODE} · كمية ${result.qty}`
          : `Ready to sell — barcode ${QA_TEST_BARCODE} · qty ${result.qty}`,
      );
      await onQaStockReady?.();
    } catch (error) {
      console.error("QA seed failed:", error);
      setQaSeedMessage(
        isArabic ? "تعذّر تهيئة صنف الاختبار" : "Could not seed the QA test medicine",
      );
    } finally {
      setSeedingQa(false);
    }
  }

  function handleDismiss() {
    setGettingStartedDismissed(pharmacyId, true);
    setDismissed(true);
  }

  const doneCount = steps.filter((step) => step.done).length;
  const allDone = steps.length > 0 && doneCount === steps.length;

  if (steps.length === 0) return null;

  return (
    <section
      className="card dashboardGettingStarted userGuideGettingStarted"
      aria-label={isArabic ? "خطوات البداية" : "Getting started"}
    >
      <div className="cardHeader">
        <h2>{isArabic ? "ابدأ من هنا" : "Get started"}</h2>
        <div className="userGuideGettingStartedHeaderActions">
          <span className="badge">
            {doneCount}/{steps.length}
          </span>
          <button type="button" className="deleteSmallBtn" onClick={handleDismiss}>
            {isArabic ? "إخفاء التوجيهات" : "Hide guide"}
          </button>
        </div>
      </div>
      <p className="mutedText dashboardGettingStartedIntro">
        {allDone
          ? isArabic
            ? "خلّصت الخطوات الأساسية — تقدر تخفي التوجيهات أو ترجع لها من دليل الاستخدام في أي وقت."
            : "You finished the basics — hide this guide or keep it for reference anytime."
          : isArabic
            ? "تظهر فقط الخطوات المتاحة حسب باقتك — نفّذها بالترتيب."
            : "Only steps available on your plan are shown — complete them in order."}
      </p>

      {showQaSeed ? (
        <div className="dashboardQaSeedBox">
          <p>
            {isArabic
              ? "فرع الاختبار فاضي — اضغط لتهيئة صنف QA القياسي بكمية قابلة للبيع."
              : "QA branch is empty — seed the standard sellable QA medicine."}
          </p>
          <button
            type="button"
            className="completeBtn"
            disabled={seedingQa}
            onClick={() => void handleSeedQaStock()}
          >
            {seedingQa
              ? isArabic
                ? "جاري التهيئة..."
                : "Seeding..."
              : isArabic
                ? "تهيئة صنف اختبار QA"
                : "Seed QA test medicine"}
          </button>
          {qaSeedMessage ? <p className="returnsSectionHint">{qaSeedMessage}</p> : null}
        </div>
      ) : null}

      <ol className="dashboardGettingStartedList">
        {steps.map((step, index) => (
          <li
            key={step.key}
            className={`dashboardGettingStartedStep${step.done ? " is-done" : ""}${
              step.enabled ? " is-clickable" : ""
            }`}
            role={step.enabled ? "button" : undefined}
            tabIndex={step.enabled ? 0 : undefined}
            onClick={() => {
              if (!step.enabled) return;
              step.onClick();
            }}
            onKeyDown={(event) => {
              if (!step.enabled) return;
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              step.onClick();
            }}
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
                onClick={(event) => {
                  event.stopPropagation();
                  step.onClick();
                }}
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
