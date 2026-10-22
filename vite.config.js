// Vite configuration with Yahoo Finance market proxy
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api/market': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/market/, '/v8/finance/chart'),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      }
    }
  }
});

