import type { PharmacySettings } from "../../types";
import type { BranchFormState } from "./types";

export const emptyBranchForm: BranchFormState = {
  id: "",
  name: "",
  name_en: "",
  phone: "",
  address: "",
  currency: "ج.م",
  isActive: true,
  latitude: "",
  longitude: "",
  geofenceRadiusM: "30",
};

export function formatBranchTransferActionError(message: string, isArabic: boolean) {
  const map: Record<string, [string, string]> = {
    transfer_not_found: ["طلب النقل غير موجود", "Transfer request not found"],
    not_pending: ["هذا الطلب ليس بانتظار الاعتماد", "This request is not pending approval"],
    medicine_not_found: ["الدواء غير موجود في الفرع المصدر", "Medicine not found in source branch"],
    insufficient_stock: [
      "الكمية غير متوفرة في الفرع المصدر",
      "Insufficient stock in source branch",
    ],
    target_medicine_missing: [
      "تعذر إنشاء الدواء في الفرع الهدف",
      "Could not create medicine in target branch",
    ],
  };
  const entry = map[message];
  if (entry) return isArabic ? entry[0] : entry[1];
  return message;
}

export function parseBranchGeoField(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function makeBranchId(
  branchForm: Pick<BranchFormState, "name" | "name_en">,
  branches: PharmacySettings[],
): string {
  const base =
    (branchForm.name_en || branchForm.name || "branch")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "branch";
  const existing = new Set(branches.map((branch) => branch.id));
  if (!existing.has(base)) return base;
  let index = 2;
  while (existing.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}
