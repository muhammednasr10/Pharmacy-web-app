export type MigrationProbe =
  | { type: "table"; name: string }
  | { type: "column"; table: string; column: string }
  | { type: "rpc"; name: string; args?: Record<string, unknown> };

export type SqlMigrationGroup = "core" | "branches" | "pos" | "hr" | "saas";

export type SqlMigrationFileKind =
  | "bootstrap"
  | "required"
  | "optional"
  | "destructive"
  | "bundle"
  | "secrets";

export type SqlMigrationDefinition = {
  id: string;
  file: string;
  group: SqlMigrationGroup;
  titleAr: string;
  titleEn: string;
  noteAr?: string;
  noteEn?: string;
  probe: MigrationProbe;
};

export type SqlMigrationRunEntry = {
  file: string;
  kind: SqlMigrationFileKind;
  group: SqlMigrationGroup;
  titleAr: string;
  titleEn: string;
  noteAr?: string;
  noteEn?: string;
};
