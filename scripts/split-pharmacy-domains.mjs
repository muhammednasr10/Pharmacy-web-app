import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const servicePath = join(root, "src/services/pharmacyService.ts");
const lines = readFileSync(servicePath, "utf8").split("\n");

const headerEnd = lines.findIndex((l) => l.startsWith("export function signInWithPassword"));
const footerStart = lines.findIndex(
  (l) => l.startsWith("export {") && l.includes("setActivePharmacy"),
);

const header = lines.slice(0, headerEnd).join("\n");
const footer = lines.slice(footerStart).join("\n");

function extractRanges(rangeList) {
  return rangeList.map(([start, end]) => lines.slice(start - 1, end).join("\n")).join("\n\n");
}

const modules = {
  authService: {
    ranges: [
      [95, 664],
      [1996, 3782],
    ],
    extra: `import { getEmployees } from "./hrService";\n`,
  },
  medicineService: {
    ranges: [
      [666, 1144],
      [3199, 3478],
    ],
    extra: "",
  },
  salesService: {
    ranges: [
      [1145, 1995],
      [3784, 4257],
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
    ranges: [[4258, 5450]],
    extra: `import {
  getAppUserByUid,
  getPharmacySettings,
  loadPayrollSettings,
  resolvePayrollSettings,
  upsertPharmacySettings,
} from "./authService";
`,
  },
};

for (const [name, config] of Object.entries(modules)) {
  const body = extractRanges(config.ranges);
  writeFileSync(
    join(root, `src/services/pharmacy/${name}.ts`),
    `${header}\n${config.extra}\n${body}\n`,
  );
}

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
console.log("Domain split complete.");
