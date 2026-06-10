import { SQL_MIGRATIONS, type MigrationProbe, type SqlMigrationDefinition } from "../config/sqlMigrations";
import { supabase } from "./supabaseClient";

export type MigrationCheckStatus = "ok" | "missing" | "error";

export type MigrationCheckRow = SqlMigrationDefinition & {
  status: MigrationCheckStatus;
  detail?: string;
};

function isMissingSchemaError(message: string, target?: string) {
  const msg = message.toLowerCase();
  const name = (target || "").toLowerCase();
  if (msg.includes("does not exist")) return true;
  if (msg.includes("could not find")) return true;
  if (msg.includes("schema cache") && name && msg.includes(name)) return true;
  return false;
}

async function probeTable(table: string): Promise<MigrationCheckStatus> {
  const { error } = await supabase.from(table).select("*", { head: true, count: "exact" });
  if (!error) return "ok";
  if (error.code === "PGRST205" || isMissingSchemaError(error.message, table)) {
    return "missing";
  }
  return "ok";
}

async function probeColumn(table: string, column: string): Promise<MigrationCheckStatus> {
  const { error } = await supabase.from(table).select(column).limit(0);
  if (!error) return "ok";
  if (error.code === "PGRST204" || error.code === "PGRST205") {
    return "missing";
  }
  if (isMissingSchemaError(error.message, column) || isMissingSchemaError(error.message, table)) {
    return "missing";
  }
  return "ok";
}

async function probeRpc(name: string, args: Record<string, unknown> = {}): Promise<MigrationCheckStatus> {
  const { error } = await supabase.rpc(name, args);
  if (!error) return "ok";
  const msg = error.message || "";
  if (isMissingSchemaError(msg, name)) return "missing";
  if (msg.toLowerCase().includes("could not find the function")) return "missing";
  return "ok";
}

async function runProbe(probe: MigrationProbe): Promise<MigrationCheckStatus> {
  if (probe.type === "table") return probeTable(probe.name);
  if (probe.type === "column") return probeColumn(probe.table, probe.column);
  return probeRpc(probe.name, probe.args);
}

export async function checkSqlMigration(definition: SqlMigrationDefinition): Promise<MigrationCheckRow> {
  try {
    const status = await runProbe(definition.probe);
    return { ...definition, status };
  } catch (error) {
    return {
      ...definition,
      status: "error",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function checkAllSqlMigrations(): Promise<MigrationCheckRow[]> {
  return Promise.all(SQL_MIGRATIONS.map((definition) => checkSqlMigration(definition)));
}

export function summarizeMigrationChecks(rows: MigrationCheckRow[]) {
  const total = rows.length;
  const ok = rows.filter((row) => row.status === "ok").length;
  const missing = rows.filter((row) => row.status === "missing").length;
  const errors = rows.filter((row) => row.status === "error").length;
  return { total, ok, missing, errors };
}
