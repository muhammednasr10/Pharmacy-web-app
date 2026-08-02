import { getYearlyPlanAmount } from "../../config/subscription";
import {
  subscriptionTierOrder,
  subscriptionTiers,
} from "../../config/subscriptionTiers";
import { getTierBadgeClass } from "./helpers";
import type { SuperAdminPageState } from "./useSuperAdminPageState";

type Props = { state: SuperAdminPageState };

export default function SuperAdminPackagesTab({ state }: Props) {
  const {
    isArabic,
    tierConfigVersion,
    openTierEditModal,
  } = state;

  return (
          <section className="saasTierPackages settingsTabPanel">
            <div className="saasPageHeader">
              <div>
                <h3>{isArabic ? "باقات الاشتراك" : "Subscription packages"}</h3>
                <p className="pageHint">
                  {isArabic
                    ? "تحكم في عدد المخازن والمستخدمين والمميزات وسعر الباقة — التعديلات تُطبَّق فوراً على كل العملاء على هذه الباقة"
                    : "Control warehouse count, users, features, and price — changes apply immediately to all customers on this tier"}
                </p>
              </div>
            </div>
            <div className="saasTierGrid" key={tierConfigVersion}>
              {subscriptionTierOrder.map((tierId) => {
                const tier = subscriptionTiers[tierId];
                return (
                  <article key={tierId} className={`saasTierCard ${tierId}`}>
                    <div className="saasTierCardHeader">
                      <strong>{isArabic ? tier.labelAr : tier.labelEn}</strong>
                      <span className={getTierBadgeClass(tierId)}>
                        {isArabic
                          ? `${tier.maxBranches} مخازن · ${tier.maxUsers} مستخدم`
                          : `${tier.maxBranches} warehouses · ${tier.maxUsers} users`}
                      </span>
                    </div>
                    <p>{isArabic ? tier.summaryAr : tier.summaryEn}</p>
                    <p className="saasTierWarehouseLimit">
                      {isArabic
                        ? `عدد المخازن المتاحة: ${tier.maxBranches}`
                        : `Warehouse slots: ${tier.maxBranches}`}
                    </p>
                    {tier.packagePrice > 0 ? (
                      <p className="saasTierPackagePrice">
                        {isArabic
                          ? `سعر الباقة: ${tier.packagePrice} ج.م / شهر`
                          : `Package price: ${tier.packagePrice} EGP / month`}
                      </p>
                    ) : null}
                    {tier.packagePrice > 0 ? (
                      <p className="saasTierPackagePrice saasTierYearlyPrice">
                        {isArabic
                          ? `سنوياً: ${getYearlyPlanAmount(tier.packagePrice)} ج.م (خصم 20%)`
                          : `Yearly: ${getYearlyPlanAmount(tier.packagePrice)} EGP (20% off)`}
                      </p>
                    ) : null}
                    <ul>
                      {(isArabic ? tier.featuresAr : tier.featuresEn).map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                    <div className="saasTierCardActions">
                      <button type="button" className="editBtn" onClick={() => openTierEditModal(tierId)}>
                        {isArabic ? "تعديل الباقة" : "Edit package"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
  );
}
