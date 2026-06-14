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
      registerType: "prompt",
      includeAssets: ["victory-logo.png", "victory-logo-transparent.png", "icon.svg"],
      manifest: {
        name: "Victory Management Systems",
        short_name: "Victory",
        description: "نظام نقطة بيع وإدارة الصيدلية — Victory",
        theme_color: "#001f3f",
        background_color: "#f4f7f5",
        display: "standalone",
        orientation: "any",
        lang: "ar",
        dir: "rtl",
        start_url: "/",
        icons: [
          {
            src: "victory-logo.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "victory-logo.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "/index.html",
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        skipWaiting: false,
        clientsClaim: false,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  base: "/",
}));
