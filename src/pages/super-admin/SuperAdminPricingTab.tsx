import SuperAdminPricingCalculatorPanel from "./SuperAdminPricingCalculatorPanel";
import type { SuperAdminPageState } from "./useSuperAdminPageState";

type Props = { state: SuperAdminPageState };

export default function SuperAdminPricingTab({ state }: Props) {
  const {
    isArabic,
    pricingCalculatorForm,
    setPricingCalculatorForm,
    savingPricingCalculator,
    savePricingCalculatorConfig,
  } = state;

  return (
    <>
      {pricingCalculatorForm ? (
        <SuperAdminPricingCalculatorPanel
          isArabic={isArabic}
          form={pricingCalculatorForm}
          saving={savingPricingCalculator}
          onChange={setPricingCalculatorForm}
          onSave={() => void savePricingCalculatorConfig()}
        />
      ) : (
        <section className="settingsTabPanel">
          <p className="pageHint">
            {isArabic ? "جاري تحميل حاسبة التسعير..." : "Loading pricing calculator..."}
          </p>
        </section>
      )}

      <section className="settingsTabPanel">
        <div className="saasPageHeader">
          <div>
            <h3>{isArabic ? "كيف يشتغل التسعير" : "How pricing works"}</h3>
            <p className="pageHint">
              {isArabic
                ? "مافيش باقات ثابتة. السعر = (فروع × سعر الفرع) + (مستخدمين × سعر المستخدم) + إضافة الموظفين و/أو العملاء إن وُجدت. الاشتراك السنوي أوفر 20% عن الدفع الشهري 12 شهر."
                : "No fixed packages. Price = (branches × branch price) + (users × user price) + optional staff and/or customers add-ons. Yearly billing is 20% cheaper than paying monthly for 12 months."}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
