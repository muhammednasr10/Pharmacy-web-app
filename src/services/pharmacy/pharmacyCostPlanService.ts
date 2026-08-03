import { supabase } from "../supabaseClient";
import type { PharmacyCostPlan } from "../../types";
import { toCamelCase, toSnakeCase } from "./mappers";
import { createIdAllocator } from "./dbHelpers";
import { stampPharmacy } from "./scope";

function normalizePlan(row: Record<string, unknown>): PharmacyCostPlan {
  const plan = toCamelCase<PharmacyCostPlan>(row as Record<string, unknown>);
  return {
    ...plan,
    id: Number(plan.id) || Date.now(),
    planMonth: String(plan.planMonth ?? ""),
    category: String(plan.category ?? "other"),
    title: String(plan.title ?? "").trim(),
    plannedAmount: Number(plan.plannedAmount ?? 0),
    notes: String(plan.notes ?? ""),
  };
}

export async function getPharmacyCostPlans(
  pharmacyId: string,
  planMonth: string,
): Promise<PharmacyCostPlan[]> {
  if (!pharmacyId || !planMonth) return [];

  const { data, error } = await supabase
    .from("pharmacy_cost_plans")
    .select("*")
    .eq("pharmacy_id", pharmacyId)
    .eq("plan_month", planMonth)
    .order("category", { ascending: true });

  if (error) {
    if (error.message.includes("pharmacy_cost_plans")) {
      console.warn("pharmacy_cost_plans table missing — run supabase/pharmacy-cost-plans.sql");
      return [];
    }
    throw new Error(error.message);
  }

  return (data || []).map((row) => normalizePlan(row));
}

export async function savePharmacyCostPlan(plan: PharmacyCostPlan) {
  const payload = stampPharmacy({
    ...toSnakeCase(plan),
    updated_at: new Date().toISOString(),
  });
  const { error } = await supabase.from("pharmacy_cost_plans").insert([payload]);
  if (error) throw new Error(error.message);
}

export async function updatePharmacyCostPlan(id: number, updates: Partial<PharmacyCostPlan>) {
  const payload = stampPharmacy({
    ...toSnakeCase(updates),
    updated_at: new Date().toISOString(),
  });
  const { error } = await supabase.from("pharmacy_cost_plans").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deletePharmacyCostPlan(id: number) {
  const { error } = await supabase.from("pharmacy_cost_plans").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function seedDefaultPharmacyCostPlans(
  pharmacyId: string,
  planMonth: string,
  categories: Array<{ value: string; ar: string; en: string }>,
  isArabic: boolean,
): Promise<PharmacyCostPlan[]> {
  const existing = await getPharmacyCostPlans(pharmacyId, planMonth);
  if (existing.length > 0) return existing;

  const nextId = await createIdAllocator("pharmacy_cost_plans");
  const now = new Date().toISOString();
  const rows: PharmacyCostPlan[] = categories.map((category) => ({
    id: nextId(),
    pharmacyId,
    planMonth,
    category: category.value,
    title: isArabic ? category.ar : category.en,
    plannedAmount: 0,
    notes: "",
    createdAt: now,
    updatedAt: now,
  }));

  const payload = rows.map((row) =>
    stampPharmacy({
      ...toSnakeCase(row),
      updated_at: now,
    }),
  );

  const { error } = await supabase.from("pharmacy_cost_plans").insert(payload);
  if (error) throw new Error(error.message);
  return rows;
}

export async function applyPlanTemplateToYear(
  pharmacyId: string,
  year: string,
  templatePlans: PharmacyCostPlan[],
  categories: Array<{ value: string; ar: string; en: string }>,
  isArabic: boolean,
  options: { fillEmptyOnly?: boolean } = {},
): Promise<number> {
  const fillEmptyOnly = options.fillEmptyOnly ?? true;
  const yearText = String(year).trim();
  if (!pharmacyId || !yearText) return 0;

  let appliedMonths = 0;
  const nextId = await createIdAllocator("pharmacy_cost_plans");

  for (let month = 1; month <= 12; month += 1) {
    const planMonth = `${yearText}-${String(month).padStart(2, "0")}`;
    const existing = await getPharmacyCostPlans(pharmacyId, planMonth);
    if (existing.length > 0 && fillEmptyOnly) continue;

    if (existing.length > 0) {
      for (const plan of existing) {
        await deletePharmacyCostPlan(plan.id);
      }
    }

    const source =
      templatePlans.length > 0
        ? templatePlans
        : categories.map((category) => ({
            category: category.value,
            title: isArabic ? category.ar : category.en,
            plannedAmount: 0,
            notes: "",
          }));

    const now = new Date().toISOString();
    const rows: PharmacyCostPlan[] = source.map((item) => ({
      id: nextId(),
      pharmacyId,
      planMonth,
      category: item.category,
      title: item.title,
      plannedAmount: Number(item.plannedAmount ?? 0),
      notes: String(item.notes ?? ""),
      createdAt: now,
      updatedAt: now,
    }));

    const payload = rows.map((row) =>
      stampPharmacy({
        ...toSnakeCase(row),
        updated_at: now,
      }),
    );

    const { error } = await supabase.from("pharmacy_cost_plans").insert(payload);
    if (error) throw new Error(error.message);
    appliedMonths += 1;
  }

  return appliedMonths;
}
