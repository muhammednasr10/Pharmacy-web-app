import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Important for GitHub Pages:
// If your repo name is Pharmacy-web-app, keep this base exactly.
// If your repo name is different, change '/Pharmacy-web-app/' to '/YOUR_REPO_NAME/'.
export default defineConfig({
  plugins: [react()],
  base: '/Pharmacy-web-app/',
});

