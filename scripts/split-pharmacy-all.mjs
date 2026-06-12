import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const servicePath = join(root, "src/services/pharmacyService.ts");
const lines = readFileSync(servicePath, "utf8").split("\n");

/** 1-indexed start, 1-indexed exclusive end */
const slice = (start, endExclusive) => lines.slice(start - 1, endExclusive - 1).join("\n");

function fixImportPaths(source) {
  return source
    .replace(/from "\.\/supabaseClient"/g, 'from "../supabaseClient"')
    .replace(/from "\.\.\/utils\//g, 'from "../../utils/')
    .replace(/from "\.\.\/constants\//g, 'from "../../constants/')
    .replace(/from "\.\.\/config\//g, 'from "../../config/')
    .replace(/from "\.\.\/types"/g, 'from "../../types"');
}

const findLine = (predicate, label) => {
  const idx = lines.findIndex(predicate);
  if (idx < 0) throw new Error(`Anchor not found: ${label}`);
  return idx + 1;
};

const camelStart = findLine((l) => l.startsWith("const camelKeyMap"), "camelKeyMap");
const medicinePayloadStart = findLine(
  (l) => l.startsWith("function prepareMedicinePayload("),
  "prepareMedicinePayload",
);
const invoicePayloadStart = findLine(
  (l) => l.startsWith("function prepareInvoicePayload"),
  "prepareInvoicePayload",
);
const scopeStart = findLine((l) => l.startsWith("// Active tenant scope"), "scope");
const getRowsStart = findLine((l) => l.startsWith("async function getRows"), "getRows");
const authStart = findLine(
  (l) => l.startsWith("export function signInWithPassword"),
  "signInWithPassword",
);
const payrollStart = findLine(
  (l) => l.startsWith("export const PAYROLL_DEFAULTS"),
  "PAYROLL_DEFAULTS",
);
const medicineStart = findLine(
  (l) => l.startsWith("export async function getMedicines()"),
  "getMedicines",
);
const salesStart = findLine(
  (l) => l.startsWith("export async function getInvoices("),
  "getInvoices",
);
const attachOrgStart = findLine(
  (l) => l.startsWith("async function attachOrganizationBranchLimits"),
  "attachOrganizationBranchLimits",
);
const branchAvailStart = findLine(
  (l) => l.includes("Cross-branch availability") && l.startsWith("//"),
  "getBranchAvailability comment",
);
const salesPart2Start = findLine(
  (l) => l.startsWith("export async function saveCustomerPayment"),
  "saveCustomerPayment",
);
const hrStart = findLine((l) => l.includes("--- HR:"), "HR section");
const fileEnd = lines.length + 1;

const header = fixImportPaths(lines.slice(0, camelStart - 1).join("\n"));

mkdirSync(join(root, "src/services/pharmacy"), { recursive: true });

writeFileSync(
  join(root, "src/services/pharmacy/mappers.ts"),
  `${slice(camelStart, medicinePayloadStart)
    .replace(/^function toCamelCase/m, "export function toCamelCase")
    .replace(/^function toSnakeCase/m, "export function toSnakeCase")}\n`,
);

writeFileSync(
  join(root, "src/services/pharmacy/payloads.ts"),
  `import type { Invoice, InvoiceItem } from "../../types";
import { toSnakeCase } from "./mappers";

${slice(invoicePayloadStart, scopeStart)
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

${slice(scopeStart, getRowsStart)
  .replace(
    /^function shouldQueryAllOrganizationBranches/m,
    "export function shouldQueryAllOrganizationBranches",
  )
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

${slice(medicinePayloadStart, invoicePayloadStart).replace(
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

${slice(getRowsStart, authStart)
  .replace(/^async function getRows/m, "export async function getRows")
  .replace(/^function subscribeTable/m, "export function subscribeTable")}
`,
);

const foundationImports = `
import { toCamelCase, toSnakeCase } from "./mappers";
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
  shouldQueryAllOrganizationBranches,
} from "./scope";
import { prepareInvoicePayload, prepareInvoiceItemPayload } from "./payloads";
import { getRows, subscribeTable } from "./dbHelpers";
`;

function adaptScopeRefs(code) {
  let out = code.replace(/activePharmacyId\s*=\s*([^;]+);/g, "setActivePharmacy($1);");
  out = out.replace(/\bactivePharmacyId\b/g, "getActivePharmacy()");
  out = out.replace(/\borganizationBranchIds\b/g, "getOrganizationBranchIds()");
  out = out.replace(/(?<![.\w])currentAppUser(?![.\w])/g, "getCurrentAppUser()");
  return out;
}

function extractRanges(rangeList) {
  return adaptScopeRefs(
    rangeList
      .map(([start, end]) => lines.slice(start - 1, end - 1).join("\n"))
      .filter(Boolean)
      .join("\n\n"),
  );
}

const systemUsersStart = findLine(
  (l) => l.startsWith("export async function getAllSystemUsers"),
  "getAllSystemUsers",
);

const modules = {
  authService: {
    ranges: [
      [authStart, payrollStart],
      [attachOrgStart, branchAvailStart],
      [systemUsersStart, salesPart2Start],
    ],
    extra: `import { getEmployees, syncPharmacyLoginAccountToUser, linkUserToEmployee } from "./hrService";\n`,
  },
  medicineService: {
    ranges: [
      [medicineStart, salesStart],
      [branchAvailStart, systemUsersStart],
    ],
    extra: "",
  },
  salesService: {
    ranges: [
      [salesStart, attachOrgStart],
      [salesPart2Start, hrStart],
    ],
    extra: `import {
  getMedicines,
  updateMedicineStock,
  addStockMovement,
  addActivityLog,
} from "./medicineService";
import { getAppUserByUid } from "./authService";
`,
  },
  hrService: {
    ranges: [
      [payrollStart, medicineStart],
      [hrStart, fileEnd],
    ],
    extra: `import {
  getPharmacySettings,
  updatePharmacySettings,
  getSystemUsers,
  getPharmacyLoginAccountRequests,
  getPharmacyLoginAccounts,
} from "./authService";
import { getInvoicesForPeriod } from "./salesService";
`,
  },
};

for (const [name, config] of Object.entries(modules)) {
  writeFileSync(
    join(root, `src/services/pharmacy/${name}.ts`),
    `${header}${foundationImports}\n${config.extra}\n${extractRanges(config.ranges)}\n`,
  );
}

writeFileSync(
  join(root, "src/services/pharmacy/index.ts"),
  `export * from "./mappers";
export * from "./scope";
export * from "./payloads";
export * from "./dbHelpers";
export * from "./authService";
export * from "./medicineService";
export * from "./salesService";
export * from "./hrService";
`,
);

writeFileSync(
  servicePath,
  `export * from "./pharmacy/mappers";
export * from "./pharmacy/scope";
export * from "./pharmacy/payloads";
export * from "./pharmacy/dbHelpers";
export * from "./pharmacy/authService";
export * from "./pharmacy/medicineService";
export * from "./pharmacy/salesService";
export * from "./pharmacy/hrService";

export {
  setActivePharmacy,
  getActivePharmacy,
  setOrganizationBranchIds,
  getOrganizationBranchIds,
  setCurrentAppUser,
  getCurrentAppUser,
  applyPharmacyFilter,
  applyPharmacyScopeFilter,
} from "./pharmacy/scope";

export { isSuperAdmin } from "../utils/roles";
`,
);

console.log("Pharmacy split complete:", {
  authStart,
  payrollStart,
  medicineStart,
  salesStart,
  attachOrgStart,
  branchAvailStart,
  systemUsersStart,
  salesPart2Start,
  hrStart,
});
