export type MigrationProbe =
  | { type: "table"; name: string }
  | { type: "column"; table: string; column: string }
  | { type: "rpc"; name: string; args?: Record<string, unknown> };

export type SqlMigrationGroup = "core" | "branches" | "pos" | "hr" | "saas";

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

export const SQL_MIGRATION_GROUPS: Record<SqlMigrationGroup, { labelAr: string; labelEn: string }> =
  {
    core: { labelAr: "الأساسيات", labelEn: "Core" },
    saas: { labelAr: "SaaS والاشتراك", labelEn: "SaaS & subscription" },
    branches: { labelAr: "الفروع والنقل", labelEn: "Branches & transfers" },
    pos: { labelAr: "نقطة البيع", labelEn: "Point of sale" },
    hr: { labelAr: "الموظفين والحضور", labelEn: "HR & attendance" },
  };

/** Recommended run order — newest features at the bottom. */
export const SQL_MIGRATIONS: SqlMigrationDefinition[] = [
  {
    id: "base-schema",
    file: "run-in-sql-editor.sql",
    group: "core",
    titleAr: "الجداول الأساسية والأعمدة",
    titleEn: "Base tables & columns",
    noteAr: "نقطة البداية لأي مشروع جديد أو بعد schema.sql",
    noteEn: "Starting point for new projects or after schema.sql",
    probe: { type: "table", name: "medicines" },
  },
  {
    id: "organizations",
    file: "multi-branch-organizations.sql",
    group: "core",
    titleAr: "مجموعات الفروع (organizations)",
    titleEn: "Branch organizations",
    noteAr: "بعد multi-tenant-saas.sql",
    noteEn: "Run after multi-tenant-saas.sql",
    probe: { type: "table", name: "organizations" },
  },
  {
    id: "branch-limit",
    file: "organization-branch-limit.sql",
    group: "saas",
    titleAr: "حد أقصى للفروع",
    titleEn: "Organization branch limit",
    probe: { type: "column", table: "pharmacies", column: "max_branches" },
  },
  {
    id: "branch-limit-rpc",
    file: "organization-branch-limit.sql",
    group: "saas",
    titleAr: "دالة set_organization_max_branches",
    titleEn: "set_organization_max_branches RPC",
    probe: { type: "rpc", name: "set_organization_max_branches", args: {} },
  },
  {
    id: "subscription-tiers",
    file: "subscription-tiers.sql",
    group: "saas",
    titleAr: "باقات الاشتراك",
    titleEn: "Subscription tiers",
    noteAr: "بعد organization-branch-limit.sql",
    noteEn: "Run after organization-branch-limit.sql",
    probe: { type: "column", table: "pharmacies", column: "subscription_tier" },
  },
  {
    id: "subscription-requests",
    file: "subscription-requests.sql",
    group: "saas",
    titleAr: "طلبات تجديد الاشتراك",
    titleEn: "Subscription requests",
    probe: { type: "table", name: "subscription_requests" },
  },
  {
    id: "trial-signup",
    file: "trial-signup.sql",
    group: "saas",
    titleAr: "تسجيل تجريبي 14 يوم",
    titleEn: "14-day trial signup",
    probe: { type: "rpc", name: "provision_trial_pharmacy", args: { p_pharmacy_name: "" } },
  },
  {
    id: "complete-sale-rpc",
    file: "complete-sale-rpc.sql",
    group: "pos",
    titleAr: "بيع مع خصم المخزون (RPC)",
    titleEn: "Sale with stock deduction (RPC)",
    probe: { type: "rpc", name: "complete_sale_with_stock_deduction", args: {} },
  },
  {
    id: "complete-purchase-rpc",
    file: "complete-purchase-rpc.sql",
    group: "pos",
    titleAr: "توريد مع إضافة المخزون (RPC)",
    titleEn: "Purchase with stock addition (RPC)",
    probe: { type: "rpc", name: "complete_purchase_with_stock_addition", args: {} },
  },
  {
    id: "branch-transfers",
    file: "branch-stock-transfers.sql",
    group: "branches",
    titleAr: "نقل مخزون بين الفروع",
    titleEn: "Branch stock transfers",
    probe: { type: "table", name: "branch_stock_transfers" },
  },
  {
    id: "branch-transfer-batch-rpc",
    file: "branch-transfer-batch-rpc.sql",
    group: "branches",
    titleAr: "دفعة نقل مخزون (RPC)",
    titleEn: "Branch transfer batch (RPC)",
    probe: { type: "rpc", name: "execute_branch_stock_transfer_batch", args: {} },
  },
  {
    id: "cashier-shifts",
    file: "cashier-shifts.sql",
    group: "pos",
    titleAr: "ورديات الكاشير",
    titleEn: "Cashier shifts",
    noteAr: "بعد complete-sale-rpc.sql",
    noteEn: "Run after complete-sale-rpc.sql",
    probe: { type: "table", name: "cashier_shifts" },
  },
  {
    id: "held-invoices",
    file: "held-invoices-and-instant-return.sql",
    group: "pos",
    titleAr: "الفواتير المعلقة والمرتجع السريع",
    titleEn: "Held invoices & quick return",
    probe: { type: "table", name: "held_invoices" },
  },
  {
    id: "pharmacy-costs",
    file: "add-pharmacy-costs.sql",
    group: "core",
    titleAr: "تكاليف الصيدلية",
    titleEn: "Pharmacy costs",
    probe: { type: "table", name: "pharmacy_costs" },
  },
  {
    id: "login-accounts",
    file: "pharmacy-login-accounts.sql",
    group: "saas",
    titleAr: "حسابات دخول الصيدلية",
    titleEn: "Pharmacy login accounts",
    probe: { type: "table", name: "pharmacy_login_accounts" },
  },
  {
    id: "employees",
    file: "employees-users-migration.sql",
    group: "hr",
    titleAr: "جدول الموظفين",
    titleEn: "Employees table",
    probe: { type: "table", name: "employees" },
  },
  {
    id: "attendance",
    file: "attendance-payroll.sql",
    group: "hr",
    titleAr: "الحضور والمرتبات",
    titleEn: "Attendance & payroll",
    probe: { type: "table", name: "attendance_records" },
  },
  {
    id: "session-revoke",
    file: "user-session-revocation.sql",
    group: "saas",
    titleAr: "إلغاء جلسة المستخدم",
    titleEn: "User session revocation",
    probe: { type: "rpc", name: "revoke_user_app_access", args: {} },
  },
  {
    id: "expiry-notify",
    file: "expiry-notify.sql",
    group: "core",
    titleAr: "تنبيهات انتهاء الصلاحية",
    titleEn: "Expiry notifications",
    probe: { type: "column", table: "pharmacies", column: "expiry_notify_enabled" },
  },
  {
    id: "custom-roles",
    file: "pharmacy-custom-roles.sql",
    group: "hr",
    titleAr: "أدوار مخصصة للصيدلية",
    titleEn: "Pharmacy custom roles",
    probe: { type: "table", name: "pharmacy_custom_roles" },
  },
  {
    id: "role-configs",
    file: "pharmacy-role-configs.sql",
    group: "hr",
    titleAr: "تخصيص صلاحيات الأدوار",
    titleEn: "Role permission overrides",
    probe: { type: "table", name: "pharmacy_role_configs" },
  },
];
