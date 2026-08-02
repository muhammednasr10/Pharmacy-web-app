import { normalizeRole } from "../../utils/roles";
import type { PharmacyLoginAccount } from "../../types";

export function normalizePharmacyLoginAccount(row: PharmacyLoginAccount): PharmacyLoginAccount {
  return {
    ...row,
    role: normalizeRole(row.role),
    email: row.email.trim().toLowerCase(),
    status: row.status || "approved",
    editPending: Boolean(row.editPending),
    linkRequestPending: Boolean(row.linkRequestPending),
    pendingEmail: row.pendingEmail?.trim().toLowerCase(),
    pendingRole: row.pendingRole ? normalizeRole(row.pendingRole) : undefined,
  };
}
