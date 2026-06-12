import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Default base is "/" (Vercel + local). GitHub Pages uses: npm run build:gh-pages
export default defineConfig(({ mode }) => ({
  define: {
    "import.meta.env.VITE_DEPLOY_ENV": JSON.stringify((process.env.VERCEL_ENV || mode).trim()),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Victory",
        short_name: "Victory",
        description: "نظام نقطة بيع وإدارة الصيدلية",
        theme_color: "#0d9488",
        background_color: "#f4f7f5",
        display: "standalone",
        orientation: "any",
        lang: "ar",
        dir: "rtl",
        start_url: "/",
        icons: [
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "icon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
        navigateFallback: "/index.html",
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  base: "/",
}));
