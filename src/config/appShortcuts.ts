import { POS_SHORTCUTS, formatShortcutKey, type PosShortcutDef } from "./posShortcuts";

export type AppShortcutDef = {
  id: string;
  keys: string[];
  labelAr: string;
  labelEn: string;
  scopeAr: string;
  scopeEn: string;
};

export const GLOBAL_SHORTCUTS: AppShortcutDef[] = [
  {
    id: "globalSearch",
    keys: ["Ctrl+K"],
    labelAr: "بحث عام في البرنامج",
    labelEn: "Global search",
    scopeAr: "كل الصفحات",
    scopeEn: "All pages",
  },
  {
    id: "closeModal",
    keys: ["Esc"],
    labelAr: "إغلاق النافذة المنبثقة المفتوحة",
    labelEn: "Close open modal",
    scopeAr: "النوافذ المنبثقة",
    scopeEn: "Modals",
  },
];

export function getPosShortcutsForGuide(): PosShortcutDef[] {
  return POS_SHORTCUTS;
}

export { formatShortcutKey };
