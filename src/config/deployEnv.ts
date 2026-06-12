/** Injected at build time from VERCEL_ENV (production | preview | development). */
export const deployEnv = (
  import.meta.env.VITE_DEPLOY_ENV ||
  import.meta.env.MODE ||
  ""
).toLowerCase();

export const isPreviewDeploy = deployEnv === "preview";
