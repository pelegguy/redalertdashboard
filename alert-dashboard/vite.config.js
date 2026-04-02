import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // base path for GitHub Pages: https://guypeled.github.io/redalertdashboard/
  base: '/redalertdashboard/',
  plugins: [react()],
  server: {
    proxy: {
      // Local dev — proxy Oref to avoid CORS
      '/api/oref': {
        target: 'https://www.oref.org.il',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/api\/oref/, '/warningMessages/alert/alerts.json'),
        headers: {
          'Referer': 'https://www.oref.org.il/',
          'X-Requested-With': 'XMLHttpRequest',
        },
        timeout: 5000,
      },
      // Local dev — proxy Oref history
      '/api/oref-history': {
        target: 'https://alerts-history.oref.org.il',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/api\/oref-history/, '/Shared/Ajax/GetAlarmsHistory.aspx?lang=he&mode=1'),
        timeout: 10000,
      },
    },
  },
});
