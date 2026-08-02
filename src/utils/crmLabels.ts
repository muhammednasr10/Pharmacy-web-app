import type { CustomerActivityStatus, CustomerActivityType, CustomerSegment } from "../types";

export function getCustomerSegmentLabel(segment: CustomerSegment, isArabic: boolean): string {
  const map: Record<CustomerSegment, [string, string]> = {
    regular: ["عادي", "Regular"],
    vip: ["VIP", "VIP"],
    chronic: ["مزمن", "Chronic"],
    wholesale: ["جملة", "Wholesale"],
  };
  const entry = map[segment] || map.regular;
  return isArabic ? entry[0] : entry[1];
}

export const CUSTOMER_SEGMENTS: CustomerSegment[] = ["regular", "vip", "chronic", "wholesale"];

export function getCustomerActivityTypeLabel(type: CustomerActivityType, isArabic: boolean): string {
  const map: Record<CustomerActivityType, [string, string]> = {
    note: ["ملاحظة", "Note"],
    call: ["مكالمة", "Call"],
    follow_up: ["متابعة", "Follow-up"],
    visit: ["زيارة", "Visit"],
    whatsapp: ["واتساب", "WhatsApp"],
  };
  const entry = map[type] || map.note;
  return isArabic ? entry[0] : entry[1];
}

export const CUSTOMER_ACTIVITY_TYPES: CustomerActivityType[] = [
  "note",
  "call",
  "follow_up",
  "visit",
  "whatsapp",
];

export function getCustomerActivityStatusLabel(status: CustomerActivityStatus, isArabic: boolean): string {
  const map: Record<CustomerActivityStatus, [string, string]> = {
    open: ["مفتوحة", "Open"],
    done: ["منجزة", "Done"],
    cancelled: ["ملغاة", "Cancelled"],
  };
  const entry = map[status] || map.open;
  return isArabic ? entry[0] : entry[1];
}
