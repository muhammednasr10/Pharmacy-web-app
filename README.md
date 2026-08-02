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
npm test              # unit tests (roles, POS errors, permissions)
npm run qa:checklist  # manual pilot QA checklist
npm run build         # production build
```

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
