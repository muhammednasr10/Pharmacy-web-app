import type { Employee } from "../types";

/** Matches custom_delivery and common Arabic/English delivery job labels. */
export function isDeliveryEmployeeRole(value?: string | null): boolean {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return false;
  if (raw === "delivery" || raw === "custom_delivery") return true;
  if (raw.includes("delivery") || raw.includes("driver") || raw.includes("captain")) return true;
  if (
    raw.includes("دليفري") ||
    raw.includes("دليفرى") ||
    raw.includes("توصيل") ||
    raw.includes("مندوب") ||
    raw.includes("كابتن")
  ) {
    return true;
  }
  return false;
}

export function filterDeliveryEmployees(employees: Employee[]): Employee[] {
  return employees.filter(
    (employee) => employee.isActive !== false && isDeliveryEmployeeRole(employee.jobTitle),
  );
}

export function filterDeliveryEmployeesBySearch(
  employees: Employee[],
  search: string,
): Employee[] {
  const term = search.trim().toLowerCase();
  if (!term) return employees;
  return employees.filter((employee) => {
    const haystack = [employee.name, employee.phone, employee.jobTitle, employee.employeeCode]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(term);
  });
}
