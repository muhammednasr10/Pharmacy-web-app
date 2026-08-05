import runOrder from "./sqlMigrationRunOrder.json";
import type { SqlMigrationRunEntry } from "./sqlMigrationTypes";

export const SQL_MIGRATION_RUN_ORDER = runOrder as SqlMigrationRunEntry[];

export function getSqlMigrationRunOrderFiles(): string[] {
  return SQL_MIGRATION_RUN_ORDER.map((entry) => entry.file);
}
