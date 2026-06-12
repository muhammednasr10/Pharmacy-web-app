/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_DEPLOY_ENV: string;
  readonly VITE_SUBSCRIPTION_NOTIFY_WEBHOOK_URL?: string;
  readonly VITE_SUPER_ADMIN_EMAIL?: string;
  readonly VITE_EXPIRY_NOTIFY_WEBHOOK_URL?: string;
  readonly VITE_AUTO_OPEN_ADMIN_WHATSAPP?: string;
  readonly VITE_AUTO_OPEN_EXPIRY_WHATSAPP?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
