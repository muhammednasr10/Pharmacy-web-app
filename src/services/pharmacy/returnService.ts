import { supabase } from "../supabaseClient";
import type { InstantSaleReturnInput, ReturnRecord, StockMovement } from "../../types";
import { toCamelCase } from "./mappers";
import { applyPharmacyFilter, stampPharmacy } from "./scope";
import {
  getMedicines,
  updateMedicineStock,
  addStockMovement,
} from "./medicineService";
import { createManagedRealtimeChannel, disposeManagedRealtimeChannel } from "./dbHelpers";

function resolveMedicineIdValue(raw: unknown): number | string {
  if (raw === null || raw === undefined || raw === "") {
    return 0;
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return 0;
    const asNumber = Number(trimmed);
    if (!Number.isNaN(asNumber) && String(asNumber) === trimmed) {
      return asNumber;
    }
    return trimmed;
  }

  const asNumber = Number(raw);
  return Number.isNaN(asNumber) ? 0 : asNumber;
}

function hasValidMedicineId(medicineId: number | string): boolean {
  if (typeof medicineId === "string") {
    return medicineId.length > 0;
  }
  return medicineId > 0;
}

function normalizeReturnItems(items: unknown): ReturnRecord["items"] {
  let parsed = items;

  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) {
    if (parsed && typeof parsed === "object") {
      parsed = Object.values(parsed as Record<string, unknown>);
    } else {
      return [];
    }
  }

  return (parsed as Record<string, unknown>[])
    .map((raw) => {
      const medicineId = resolveMedicineIdValue(
        raw.medicineId ?? raw.medicine_id ?? raw.medicineID ?? raw.id ?? 0,
      );
      const quantity = Number(raw.quantity ?? raw.qty ?? raw.return_qty ?? raw.returnQuantity ?? 0);
      const unitPrice = Number(raw.unitPrice ?? raw.unit_price ?? 0);
      const lineTotal = Number(raw.lineTotal ?? raw.line_total ?? unitPrice * quantity);

      return {
        medicineId,
        name_ar: String(raw.name_ar ?? raw.nameAr ?? raw.medicine_name ?? ""),
        name_en: String(raw.name_en ?? raw.nameEn ?? ""),
        barcode: String(raw.barcode ?? ""),
        quantity,
        unitPrice: unitPrice || (quantity > 0 ? lineTotal / quantity : 0),
        lineTotal,
        buyPrice: Number(raw.buyPrice ?? raw.buy_price ?? 0),
        costTotal: Number(raw.costTotal ?? raw.cost_total ?? 0),
        profit: Number(raw.profit ?? 0),
      };
    })
    .filter(
      (item) =>
        item.quantity > 0 &&
        (hasValidMedicineId(item.medicineId) || Boolean(item.name_ar) || Boolean(item.name_en)),
    );
}

function rebuildReturnItemsFromMovements(
  returnRecord: ReturnRecord,
  movements: StockMovement[],
): ReturnRecord["items"] {
  const related = movements.filter(
    (movement) =>
      movement.returnNumber === returnRecord.returnNumber &&
      (movement.type === "return" || movement.type === "sale_return"),
  );

  if (related.length === 0) {
    return [];
  }

  const recordTotal = Number(returnRecord.total ?? 0);
  const totalQty = related.reduce(
    (sum, movement) => sum + Math.abs(Number(movement.quantityChange ?? 0)),
    0,
  );

  return related.map((movement) => {
    const movementRow = movement as StockMovement & { name_ar?: string; name_en?: string };
    const quantity = Math.abs(Number(movement.quantityChange ?? 0));
    const unitPrice =
      quantity > 0 && related.length === 1 && recordTotal > 0 ? recordTotal / quantity : 0;

    return {
      medicineId: Number(movement.medicineId ?? 0),
      name_ar: movement.medicineName_ar || movementRow.name_ar || "",
      name_en: movement.medicineName_en || movementRow.name_en || "",
      barcode: movement.barcode || "",
      quantity,
      unitPrice,
      lineTotal: unitPrice > 0 ? unitPrice * quantity : 0,
      buyPrice: 0,
      costTotal: 0,
      profit: 0,
    };
  });
}

function normalizeReturnRecord(row: Record<string, any>): ReturnRecord {
  const record = toCamelCase<ReturnRecord>(row);
  record.items = normalizeReturnItems(row.items ?? record.items);
  record.invoiceNumber = record.invoiceNumber || row.invoice_number || "";
  record.returnNumber = record.returnNumber || row.return_number || "";
  record.reason = record.reason || row.reason || "";
  record.refundMethod = record.refundMethod || row.refund_method;
  record.isInstant = Boolean(record.isInstant ?? row.is_instant ?? false);
  record.total = Number(record.total ?? row.total ?? 0);
  return record;
}

function prepareReturnPayload(returnRecord: ReturnRecord): Record<string, any> {
  const returnDate = returnRecord.date || new Date().toLocaleString();
  const normalizedItems = (returnRecord.items || [])
    .map((item) => {
      const medicineId = resolveMedicineIdValue(
        item.medicineId ?? (item as { medicine_id?: number | string }).medicine_id ?? 0,
      );
      const quantity = Number(item.quantity ?? 0);
      const unitPrice = Number(item.unitPrice ?? (item as { unit_price?: number }).unit_price ?? 0);
      const lineTotal = Number(item.lineTotal ?? unitPrice * quantity);

      return {
        medicine_id: medicineId,
        name_ar: item.name_ar || "",
        name_en: item.name_en || "",
        barcode: item.barcode || "",
        quantity,
        unit_price: unitPrice,
        line_total: lineTotal,
        buy_price: Number(item.buyPrice ?? 0),
        cost_total: Number(item.costTotal ?? 0),
        profit: Number(item.profit ?? 0),
      };
    })
    .filter((item) => item.quantity > 0);

  return stampPharmacy({
    id: returnRecord.id ?? Date.now(),
    return_number: returnRecord.returnNumber,
    invoice_number: returnRecord.invoiceNumber,
    original_invoice_id: returnRecord.originalInvoiceId,
    user_id: returnRecord.userId || "",
    user_name: returnRecord.userName || "",
    date: returnDate,
    created_at: returnRecord.createdAt || new Date().toISOString(),
    items: normalizedItems,
    total: returnRecord.total ?? 0,
    reason: returnRecord.reason || null,
    refund_method: returnRecord.refundMethod || null,
    is_instant: Boolean(returnRecord.isInstant),
  });
}

export async function getReturns(): Promise<ReturnRecord[]> {
  let query = supabase.from("returns").select("*");
  query = applyPharmacyFilter(query);
  query = query.order("id", { ascending: false }).limit(100);

  const { data, error } = await query;

  if (error) {
    console.error("getReturns error:", error.message);
    return [];
  }

  const records = (data || []).map((row) => normalizeReturnRecord(row as Record<string, any>));

  const emptyReturnNumbers = records
    .filter((record) => (!record.items || record.items.length === 0) && record.returnNumber)
    .map((record) => record.returnNumber);

  if (emptyReturnNumbers.length === 0) {
    return records;
  }

  let movementQuery = supabase
    .from("stock_movements")
    .select("*")
    .in("return_number", emptyReturnNumbers);

  movementQuery = applyPharmacyFilter(movementQuery);

  const { data: movementRows, error: movementError } = await movementQuery;

  if (movementError) {
    console.error("getReturns stock_movements recovery error:", movementError.message);
    return records;
  }

  const movements = (movementRows || []).map((row) => toCamelCase<StockMovement>(row));

  return records.map((record) => {
    if (record.items && record.items.length > 0) {
      return record;
    }

    const recoveredItems = rebuildReturnItemsFromMovements(record, movements);
    if (recoveredItems.length === 0) {
      return record;
    }

    return {
      ...record,
      items: recoveredItems,
    };
  });
}

export function subscribeReturns(callback: (returnsData: ReturnRecord[]) => void) {
  const channelName = "realtime-returns";
  const channel = createManagedRealtimeChannel(channelName).on(
    "postgres_changes",
    { event: "*", schema: "public", table: "returns" },
    () => {
      void getReturns().then(callback);
    },
  );

  void channel.subscribe();

  return () => {
    disposeManagedRealtimeChannel(channel);
  };
}

export async function createReturn(returnRecord: ReturnRecord) {
  const payload = prepareReturnPayload(returnRecord);
  const { error } = await supabase.from("returns").insert([payload]);
  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteReturn(id: number | string) {
  const { error } = await supabase.from("returns").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function calculateAvailableReturnQuantity(
  invoiceNumber: string,
  medicineId: number,
  soldQuantity: number,
): Promise<number> {
  const allReturns = await getReturns();
  const alreadyReturned = allReturns
    .filter((r) => r.invoiceNumber === invoiceNumber)
    .flatMap((r) => r.items || [])
    .filter((item) => item.medicineId === medicineId)
    .reduce((sum, item) => sum + (item.quantity || 0), 0);

  return Math.max(0, soldQuantity - alreadyReturned);
}

export async function createInstantSaleReturn(
  input: InstantSaleReturnInput,
): Promise<{ returnRecord: ReturnRecord; returnTotal: number }> {
  const selectedItems = input.items.filter((item) => item.quantity > 0);
  if (selectedItems.length === 0) {
    throw new Error("no_return_items");
  }

  for (const item of selectedItems) {
    const original = input.invoice.items?.find((i) => i.medicineId === item.medicineId);
    if (!original) {
      throw new Error("item_not_in_invoice");
    }
    const available = await calculateAvailableReturnQuantity(
      input.invoice.invoiceNumber,
      item.medicineId,
      original.quantity,
    );
    if (item.quantity > available) {
      throw new Error(`qty_exceeds_available:${item.medicineId}:${available}`);
    }
  }

  const returnId = Date.now();
  const returnNumber = `RET-${returnId}`;
  const returnItems = selectedItems.map((item) => ({
    medicineId: item.medicineId,
    name_ar: item.name_ar,
    name_en: item.name_en,
    barcode: item.barcode,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.unitPrice * item.quantity,
    buyPrice: item.buyPrice || 0,
    costTotal: (item.buyPrice || 0) * item.quantity,
    profit: item.unitPrice * item.quantity - (item.buyPrice || 0) * item.quantity,
  }));

  const returnTotal = returnItems.reduce((sum, item) => sum + item.lineTotal, 0);

  const returnRecord: ReturnRecord = {
    id: returnId,
    returnNumber,
    invoiceNumber: input.invoice.invoiceNumber,
    originalInvoiceId: input.invoice.id,
    pharmacyId: input.invoice.pharmacyId,
    userId: input.userId,
    userName: input.userName,
    date: new Date().toLocaleString(),
    createdAt: new Date().toISOString(),
    items: returnItems,
    total: returnTotal,
    reason: input.reason,
    refundMethod: input.refundMethod,
    isInstant: true,
  };

  const currentMedicines = await getMedicines();

  for (const item of returnItems) {
    const currentMedicine = currentMedicines.find((m) => m.id === item.medicineId);
    if (!currentMedicine) {
      throw new Error("medicine_not_found");
    }
    await updateMedicineStock(item.medicineId, currentMedicine.qty + item.quantity);

    await addStockMovement({
      id: Date.now() + item.medicineId,
      type: "sale_return",
      medicineId: item.medicineId,
      medicineName_ar: item.name_ar,
      medicineName_en: item.name_en,
      barcode: item.barcode,
      quantityChange: item.quantity,
      qtyBefore: currentMedicine.qty,
      qtyAfter: currentMedicine.qty + item.quantity,
      invoiceNumber: input.invoice.invoiceNumber,
      returnNumber,
      pharmacyId: input.invoice.pharmacyId,
      userId: input.userId,
      userName: input.userName,
      notes: input.reason,
      createdAt: new Date().toISOString(),
    });
  }

  await createReturn(returnRecord);

  return { returnRecord, returnTotal };
}

export function applyReturnToCurrentCart(currentDiscount: number, returnAmount: number) {
  return Math.max(0, currentDiscount + returnAmount);
}
