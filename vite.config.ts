import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Default base is "/" (Vercel + local). GitHub Pages uses: npm run build:gh-pages
export default defineConfig({
  plugins: [react()],
  base: '/',
});
