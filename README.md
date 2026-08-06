# Pharmacy Web App (Victory)

React + Vite + TypeScript + Supabase — pharmacy SaaS (POS, inventory, HR, multi-branch).

## Run locally

```bash
npm install
cp .env.example .env   # fill Supabase URL + anon key
npm run dev
```

## Quality checks (before pilot / deploy)

```bash
npm test              # unit tests (sales, auth, inventory, purchases, returns, shifts)
npm run typecheck     # TypeScript (local — strict check, some legacy errors remain)
npm run test:e2e      # Playwright E2E (login → POS → invoice → return)
npm run qa:checklist  # manual pilot QA checklist
npm run build         # production build
```

### CI (GitHub Actions)

Every push/PR to `main` runs [`.github/workflows/ci.yml`](.github/workflows/ci.yml):

| Job | Steps |
|-----|--------|
| **quality** | `sql:audit` → `npm test` → `npm run build` |
| **e2e** | Playwright (optional — see below) |

**Optional E2E in CI** — enable only when a staging Supabase + test account exist:

1. Repo → **Settings → Secrets and variables → Actions**
2. Add secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `E2E_LOGIN_EMAIL`, `E2E_LOGIN_PASSWORD`, `E2E_TEST_BARCODE`
3. Variables → New variable: `E2E_CI_ENABLED` = `true`

Without `E2E_CI_ENABLED`, E2E stays local-only; unit tests + build still gate merges.

### E2E tests (Playwright)

1. Copy `.env.e2e.example` → `.env.e2e` and fill test account + barcode.
2. Install browser: `npm run test:e2e:install`
3. Run: `npm run test:e2e`

The flow covers: login → open POS shift → barcode sale → verify invoice → create return.

Additional E2E:
- `e2e/pos-held-invoice.spec.ts` — hold cart → resume → complete sale
- `e2e/purchase-batch.spec.ts` — receive purchase batch → verify in purchases history
- `e2e/crm-customer-followup.spec.ts` — add CRM customer → follow-up → verify in follow-ups tab
- `e2e/inventory-management.spec.ts` — search stock, browse movements/stock-count tabs, pagination
- `e2e/hr-attendance.spec.ts` — open attendance tab, verify table, record check-in
- `e2e/branches-page.spec.ts` — branches list, branch switcher (if multi-branch)
- `e2e/subscription-settings.spec.ts` — subscription tab, tier comparison panel

Use `E2E_SKIP_WEBSERVER=1` if the dev server is already running.

## URL routes (React Router)

Each page has a shareable URL. Examples:

| Page | Path |
|------|------|
| Dashboard | `/dashboard` |
| Inventory | `/inventory` |
| Stock movements | `/inventory/movements` |
| POS | `/pos` |
| Sales | `/invoices` |
| Returns | `/returns` |
| Purchases | `/purchases` |
| Customers (CRM) | `/customers` |
| Reports | `/reports` |
| Investment costs | `/reports/investment` |
| Staff / HR | `/staff` |
| Branches | `/branches` |
| Settings | `/settings` |
| My profile | `/employee-portal` |
| Super admin | `/admin/tenants` |

Browser back/forward and refresh keep the current page. Vercel SPA rewrites are already configured in `vercel.json`.

## Supabase setup

1. Create a Supabase project.
2. Run migrations from `supabase/` (see in-app **SQL migrations** page for order).
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` (local) or Vercel env vars.

### Sentry (optional)

1. Create a project at [sentry.io](https://sentry.io).
2. Copy the **DSN** from Settings → Client Keys.
3. Add to Vercel / `.env`:
   - `VITE_SENTRY_DSN=your-dsn`
   - `VITE_APP_VERSION=1.0.0` (optional, for release tracking)
4. Redeploy. Errors in production are sent automatically with user role and pharmacy context.

For local Sentry testing: `VITE_SENTRY_DEV=true` in `.env`.

## Deploy

- **Vercel**: connect repo, add Supabase env vars, deploy.
- **GitHub Pages**: `npm run deploy` (uses `/Pharmacy-web-app/` base path).

## Pilot launch

Before onboarding a real pharmacy:

1. Run `npm run qa:checklist` and complete every item manually.
2. Run `npm test` and `npm run build`.
3. Confirm subscription tier and RLS on production Supabase.

See **User Guide → Pre-launch pilot checklist** in the app.
