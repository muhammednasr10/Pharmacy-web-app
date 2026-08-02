import type { Page } from "../types";
import { getTierPageLabel, TIER_CONFIGURABLE_PAGES, sanitizeTierEnabledPagesSelection } from "../config/subscriptionTierPages";

export type TierPackageCopyInput = {
  maxBranches: number;
  maxUsers: number;
  enabledPages: Page[];
};

export type TierPackageCopy = {
  summaryAr: string;
  summaryEn: string;
  featuresAr: string[];
  featuresEn: string[];
};

function formatBranchLimit(maxBranches: number, isArabic: boolean): string {
  const n = Math.max(1, Math.floor(maxBranches));
  if (isArabic) {
    return n === 1 ? "مخزن واحد" : `حتى ${n} مخازن`;
  }
  return n === 1 ? "1 warehouse" : `Up to ${n} warehouses`;
}

function formatUserLimit(maxUsers: number, isArabic: boolean): string {
  const n = Math.max(1, Math.floor(maxUsers));
  if (isArabic) {
    return n === 1 ? "مستخدم واحد" : `حتى ${n} مستخدمين`;
  }
  return n === 1 ? "1 user" : `Up to ${n} users`;
}

function orderedEnabledPages(enabledPages: Page[]): Page[] {
  const selected = new Set(sanitizeTierEnabledPagesSelection(enabledPages));
  return TIER_CONFIGURABLE_PAGES.filter((page) => selected.has(page));
}

export function formatWarehouseQuota(maxBranches: number, isArabic: boolean): string {
  return formatBranchLimit(maxBranches, isArabic);
}

export function buildTierPackageCopy(input: TierPackageCopyInput): TierPackageCopy {
  const maxBranches = Math.max(1, Math.floor(input.maxBranches));
  const maxUsers = Math.max(1, Math.floor(input.maxUsers));
  const pages = orderedEnabledPages(input.enabledPages);

  const branchAr = formatBranchLimit(maxBranches, true);
  const branchEn = formatBranchLimit(maxBranches, false);
  const userAr = formatUserLimit(maxUsers, true);
  const userEn = formatUserLimit(maxUsers, false);

  const pageLabelsAr = pages.map((page) => getTierPageLabel(page, true));
  const pageLabelsEn = pages.map((page) => getTierPageLabel(page, false));

  return {
    summaryAr: `${branchAr} — ${userAr}`,
    summaryEn: `${branchEn} — ${userEn}`,
    featuresAr: [branchAr, userAr, ...pageLabelsAr],
    featuresEn: [branchEn, userEn, ...pageLabelsEn],
  };
}

export function tierPackageCopyToFormFields(copy: TierPackageCopy) {
  return {
    summaryAr: copy.summaryAr,
    summaryEn: copy.summaryEn,
    featuresAr: copy.featuresAr.join("\n"),
    featuresEn: copy.featuresEn.join("\n"),
  };
}

export function mergeTierEditAutoCopy<
  T extends {
    maxBranches: string;
    maxUsers: string;
    enabledPages: Page[];
  },
>(form: T): T & ReturnType<typeof tierPackageCopyToFormFields> {
  const copy = buildTierPackageCopy({
    maxBranches: Number(form.maxBranches),
    maxUsers: Number(form.maxUsers),
    enabledPages: form.enabledPages,
  });
  return {
    ...form,
    ...tierPackageCopyToFormFields(copy),
  };
}
