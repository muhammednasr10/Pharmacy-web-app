import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const servicePath = join(root, "src/services/pharmacyService.ts");
const lines = readFileSync(servicePath, "utf8").split("\n");

const slice = (start, end) => lines.slice(start - 1, end).join("\n");

const camelStart = lines.findIndex((l) => l.startsWith("const camelKeyMap"));
const medicinePayloadStart = lines.findIndex((l) =>
  l.startsWith("function prepareMedicinePayload("),
);
const invoicePayloadStart = lines.findIndex((l) => l.startsWith("function prepareInvoicePayload"));
const scopeStart = lines.findIndex((l) => l.startsWith("// Active tenant scope"));
const getRowsStart = lines.findIndex((l) => l.startsWith("async function getRows"));
const authStart = lines.findIndex((l) => l.startsWith("export function signInWithPassword"));

if (
  [camelStart, medicinePayloadStart, invoicePayloadStart, scopeStart, getRowsStart, authStart].some(
    (i) => i < 0,
  )
) {
  throw new Error("Could not locate pharmacyService foundation anchors");
}

mkdirSync(join(root, "src/services/pharmacy"), { recursive: true });

writeFileSync(
  join(root, "src/services/pharmacy/mappers.ts"),
  `${slice(camelStart + 1, medicinePayloadStart)
    .replace(/^function toCamelCase/m, "export function toCamelCase")
    .replace(/^function toSnakeCase/m, "export function toSnakeCase")}\n`,
);

writeFileSync(
  join(root, "src/services/pharmacy/payloads.ts"),
  `import type { Invoice, InvoiceItem } from "../../types";
import { toSnakeCase } from "./mappers";

${slice(invoicePayloadStart + 1, scopeStart)
  .replace(/^function prepareInvoicePayload/m, "export function prepareInvoicePayload")
  .replace(/^function prepareInvoiceItemPayload/m, "export function prepareInvoiceItemPayload")}
`,
);

writeFileSync(
  join(root, "src/services/pharmacy/scope.ts"),
  `import { ALL_BRANCHES_ID } from "../../constants/branches";
import {
  isAccountant,
  isOrgPharmacyAdmin,
  isSuperAdmin,
  normalizeAppUser,
} from "../../utils/roles";
import type { AppUser, Medicine } from "../../types";
import { toSnakeCase } from "./mappers";

${slice(scopeStart + 1, getRowsStart)
  .replace(/^function applyPharmacyScopeFilter/m, "export function applyPharmacyScopeFilter")
  .replace(/^function resolveStampPharmacyId/m, "export function resolveStampPharmacyId")
  .replace(
    /^function resolveHeldInvoicesPharmacyId/m,
    "export function resolveHeldInvoicesPharmacyId",
  )
  .replace(/^function stampPharmacy/m, "export function stampPharmacy")
  .replace(
    /^function prepareMedicinePayloadForPharmacy/m,
    "export function prepareMedicinePayloadForPharmacy",
  )}

${slice(medicinePayloadStart + 1, invoicePayloadStart).replace(
  /^function prepareMedicinePayload/m,
  "export function prepareMedicinePayload",
)}
`,
);

writeFileSync(
  join(root, "src/services/pharmacy/dbHelpers.ts"),
  `import { supabase } from "../supabaseClient";
import { toCamelCase } from "./mappers";
import { applyPharmacyFilter } from "./scope";

${slice(getRowsStart + 1, authStart)
  .replace(/^async function getRows/m, "export async function getRows")
  .replace(/^function subscribeTable/m, "export function subscribeTable")}
`,
);

const header = lines.slice(0, camelStart).join("\n");
const tail = lines.slice(authStart).join("\n");

const foundationImports = `
import { toCamelCase, toSnakeCase } from "./pharmacy/mappers";
import {
  setActivePharmacy,
  getActivePharmacy,
  setOrganizationBranchIds,
  getOrganizationBranchIds,
  setCurrentAppUser,
  getCurrentAppUser,
  applyPharmacyFilter,
  applyPharmacyScopeFilter,
  stampPharmacy,
  resolveStampPharmacyId,
  resolveHeldInvoicesPharmacyId,
  prepareMedicinePayload,
  prepareMedicinePayloadForPharmacy,
} from "./pharmacy/scope";
import { prepareInvoicePayload, prepareInvoiceItemPayload } from "./pharmacy/payloads";
import { getRows, subscribeTable } from "./pharmacy/dbHelpers";
`;

writeFileSync(servicePath, `${header}${foundationImports}\n${tail}`);
console.log("Foundation split complete.");
