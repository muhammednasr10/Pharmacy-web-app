import type { PricingCalculatorConfig } from "../../../config/pricingCalculator";

type Props = {
  isArabic: boolean;
  config: PricingCalculatorConfig;
  draftBranches: number;
  draftUsers: number;
  draftStaffAddon: boolean;
  draftCustomersAddon: boolean;
  draftInvestmentAddon: boolean;
  onBranchesChange: (value: number) => void;
  onUsersChange: (value: number) => void;
  onStaffAddonChange: (value: boolean) => void;
  onCustomersAddonChange: (value: boolean) => void;
  onInvestmentAddonChange: (value: boolean) => void;
};

export default function SubscriptionPackageEditForm({
  isArabic,
  config,
  draftBranches,
  draftUsers,
  draftStaffAddon,
  draftCustomersAddon,
  draftInvestmentAddon,
  onBranchesChange,
  onUsersChange,
  onStaffAddonChange,
  onCustomersAddonChange,
  onInvestmentAddonChange,
}: Props) {
  return (
    <div className="subscriptionPackageEditGrid">
      <label className="settingsField settingsField--sm">
        <span>{isArabic ? "عدد الفروع" : "Branches"}</span>
        <input
          type="number"
          min={1}
          max={50}
          value={draftBranches}
          onChange={(e) => onBranchesChange(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
        />
      </label>
      <label className="settingsField settingsField--sm">
        <span>{isArabic ? "عدد المستخدمين" : "Users"}</span>
        <input
          type="number"
          min={1}
          max={200}
          value={draftUsers}
          onChange={(e) => onUsersChange(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
        />
      </label>
      {config.staffAddonEnabled ? (
        <label className="subscriptionPackageAddonCheck">
          <input
            type="checkbox"
            checked={draftStaffAddon}
            onChange={(e) => onStaffAddonChange(e.target.checked)}
          />
          <span>{isArabic ? config.staffAddonTitleAr : config.staffAddonTitleEn}</span>
        </label>
      ) : null}
      {config.customersAddonEnabled ? (
        <label className="subscriptionPackageAddonCheck">
          <input
            type="checkbox"
            checked={draftCustomersAddon}
            onChange={(e) => onCustomersAddonChange(e.target.checked)}
          />
          <span>{isArabic ? config.customersAddonTitleAr : config.customersAddonTitleEn}</span>
        </label>
      ) : null}
      {config.investmentAddonEnabled ? (
        <label className="subscriptionPackageAddonCheck">
          <input
            type="checkbox"
            checked={draftInvestmentAddon}
            onChange={(e) => onInvestmentAddonChange(e.target.checked)}
          />
          <span>{isArabic ? config.investmentAddonTitleAr : config.investmentAddonTitleEn}</span>
        </label>
      ) : null}
    </div>
  );
}
