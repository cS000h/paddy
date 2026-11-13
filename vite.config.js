import { defineConfig } from 'vite';

// 浏览器优先。base 用相对路径，这样 dist/ 放到任何静态站点的子目录里都能跑。
export default defineConfig({
  base: './',
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  build: { target: 'es2022', chunkSizeWarningLimit: 2500 },
});
