import { supabase } from "../supabaseClient";
import { isSuperAdmin } from "../../utils/roles";
import { ALL_BRANCHES_ID } from "../../constants/branches";
import type { BranchStockTransfer, Medicine } from "../../types";
import { toCamelCase, toSnakeCase } from "./mappers";
import {
  getActivePharmacy,
  getCurrentAppUser,
  getOrganizationBranchIds,
  shouldQueryAllOrganizationBranches,
} from "./scope";

function buildBranchTransferNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `TR-${stamp}-${random}`;
}

function parseBranchTransferRpcError(message: string): string {
  const known = [
    "branch_required",
    "same_branch",
    "empty_items",
    "medicine_not_found",
    "insufficient_stock",
    "transfer_not_found",
    "not_pending",
    "not_authorized",
    "invalid_quantity",
    "transfer_number_required",
  ];
  for (const code of known) {
    if (message.includes(code)) return code;
  }
  return message;
}

function normalizeBranchTransferRpcRows(data: unknown): BranchStockTransfer[] {
  if (!data) return [];
  const rows = Array.isArray(data) ? data : [];
  return rows.map((row) => toCamelCase<BranchStockTransfer>(row as Record<string, unknown>));
}

async function getBranchStockTransferLines(transferNumber: string): Promise<BranchStockTransfer[]> {
  const { data, error } = await supabase
    .from("branch_stock_transfers")
    .select("*")
    .eq("transfer_number", transferNumber)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row) => toCamelCase<BranchStockTransfer>(row));
}

// Cross-branch availability: looks up the same medicine across ALL branches,
// intentionally ignoring the active-branch filter. Matches by barcode when
// available, otherwise by name.
export async function getBranchAvailability(
  medicine: Partial<Medicine>,
): Promise<Array<{ pharmacyId: string; qty: number; expiry?: string; price?: number }>> {
  let query = supabase.from("medicines").select("pharmacy_id, qty, expiry, price");

  if (isSuperAdmin(getCurrentAppUser())) {
    if (getActivePharmacy() && getActivePharmacy() !== ALL_BRANCHES_ID) {
      query = query.eq("pharmacy_id", getActivePharmacy());
    }
  } else if (shouldQueryAllOrganizationBranches(getCurrentAppUser())) {
    if (getOrganizationBranchIds().length === 1) {
      query = query.eq("pharmacy_id", getOrganizationBranchIds()[0]);
    } else if (getOrganizationBranchIds().length > 1 && query.in) {
      query = query.in("pharmacy_id", getOrganizationBranchIds());
    }
  } else {
    const scopeId = getActivePharmacy() || getCurrentAppUser()?.pharmacyId;
    if (scopeId && scopeId !== ALL_BRANCHES_ID) {
      query = query.eq("pharmacy_id", scopeId);
    }
  }

  const barcode = (medicine.barcode || "").trim();
  if (barcode) {
    query = query.eq("barcode", barcode);
  } else {
    const orParts: string[] = [];
    if (medicine.name_ar) orParts.push(`name_ar.eq.${medicine.name_ar}`);
    if (medicine.name_en) orParts.push(`name_en.eq.${medicine.name_en}`);
    if (orParts.length === 0) return [];
    query = query.or(orParts.join(","));
  }

  const { data, error } = await query;

  if (error) {
    console.error("getBranchAvailability error:", error.message);
    return [];
  }

  const totals = new Map<
    string,
    { pharmacyId: string; qty: number; expiry?: string; price?: number }
  >();
  for (const row of data || []) {
    const pharmacyId = (row as any).pharmacy_id || "main";
    const existing = totals.get(pharmacyId);
    if (existing) {
      existing.qty += Number((row as any).qty) || 0;
    } else {
      totals.set(pharmacyId, {
        pharmacyId,
        qty: Number((row as any).qty) || 0,
        expiry: (row as any).expiry || undefined,
        price: Number((row as any).price) || undefined,
      });
    }
  }

  return Array.from(totals.values());
}

export async function getBranchStockTransfers(limit = 50): Promise<BranchStockTransfer[]> {
  const branchIds = getOrganizationBranchIds().length > 0 ? getOrganizationBranchIds() : [];
  let query = supabase
    .from("branch_stock_transfers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!isSuperAdmin(getCurrentAppUser()) && branchIds.length > 0) {
    query = query.or(
      `from_pharmacy_id.in.(${branchIds.join(",")}),to_pharmacy_id.in.(${branchIds.join(",")})`,
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error("getBranchStockTransfers error:", error.message);
    return [];
  }

  return (data || []).map((row) => toCamelCase<BranchStockTransfer>(row));
}

export async function executeBranchStockTransfer(params: {
  fromPharmacyId: string;
  toPharmacyId: string;
  medicineId: number;
  quantity: number;
  notes?: string;
  userId?: string;
  userName?: string;
}): Promise<BranchStockTransfer> {
  const [record] = await executeBranchStockTransferBatch({
    fromPharmacyId: params.fromPharmacyId,
    toPharmacyId: params.toPharmacyId,
    items: [{ medicineId: params.medicineId, quantity: params.quantity }],
    notes: params.notes,
    userId: params.userId,
    userName: params.userName,
  });
  return record;
}

export async function executeBranchStockTransferBatch(params: {
  fromPharmacyId: string;
  toPharmacyId: string;
  items: Array<{ medicineId: number; quantity: number }>;
  notes?: string;
  userId?: string;
  userName?: string;
  requireApproval?: boolean;
}): Promise<BranchStockTransfer[]> {
  if (!params.fromPharmacyId || !params.toPharmacyId) {
    throw new Error("branch_required");
  }
  if (params.fromPharmacyId === params.toPharmacyId) {
    throw new Error("same_branch");
  }

  const normalizedItems = params.items
    .map((item) => ({
      medicineId: Number(item.medicineId),
      quantity: Math.floor(Number(item.quantity)),
    }))
    .filter((item) => item.medicineId > 0 && item.quantity > 0);

  if (normalizedItems.length === 0) {
    throw new Error("empty_items");
  }

  const mergedByMedicine = new Map<number, number>();
  for (const item of normalizedItems) {
    mergedByMedicine.set(
      item.medicineId,
      (mergedByMedicine.get(item.medicineId) || 0) + item.quantity,
    );
  }
  const items = Array.from(mergedByMedicine.entries()).map(([medicineId, quantity]) => ({
    medicineId,
    quantity,
  }));

  const transferNumber = buildBranchTransferNumber();
  const { data, error } = await supabase.rpc("execute_branch_stock_transfer_batch", {
    p_from_pharmacy_id: params.fromPharmacyId,
    p_to_pharmacy_id: params.toPharmacyId,
    p_items: items.map((item) => ({
      medicine_id: item.medicineId,
      quantity: item.quantity,
    })),
    p_transfer_number: transferNumber,
    p_notes: params.notes?.trim() || null,
    p_user_id: params.userId || null,
    p_user_name: params.userName || null,
    p_require_approval: Boolean(params.requireApproval),
  });

  if (error) {
    throw new Error(parseBranchTransferRpcError(error.message));
  }

  return normalizeBranchTransferRpcRows(data);
}

export async function approveBranchStockTransferBatch(params: {
  transferNumber: string;
  userId?: string;
  userName?: string;
}): Promise<BranchStockTransfer[]> {
  const { data, error } = await supabase.rpc("approve_branch_stock_transfer_batch", {
    p_transfer_number: params.transferNumber,
    p_user_id: params.userId || null,
    p_user_name: params.userName || null,
  });

  if (error) {
    throw new Error(parseBranchTransferRpcError(error.message));
  }

  return normalizeBranchTransferRpcRows(data);
}

export async function rejectBranchStockTransferBatch(params: {
  transferNumber: string;
  userId?: string;
  userName?: string;
  rejectionReason?: string;
}): Promise<BranchStockTransfer[]> {
  const rows = await getBranchStockTransferLines(params.transferNumber);
  if (rows.length === 0) {
    throw new Error("transfer_not_found");
  }
  if (rows.some((row) => row.status !== "pending")) {
    throw new Error("not_pending");
  }

  const { data, error } = await supabase
    .from("branch_stock_transfers")
    .update(
      toSnakeCase({
        status: "rejected",
        reviewedBy: params.userId,
        reviewedByName: params.userName,
        reviewedAt: new Date().toISOString(),
        rejectionReason: params.rejectionReason?.trim() || null,
      }),
    )
    .eq("transfer_number", params.transferNumber)
    .eq("status", "pending")
    .select("*");

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row) => toCamelCase<BranchStockTransfer>(row));
}
