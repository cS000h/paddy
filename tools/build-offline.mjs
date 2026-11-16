// 单文件发行：引擎、代码、样式全内联，程序素材仍在本机生成。
import { build } from 'vite';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, '.cache', 'offline-build');
await build({
  configFile: false,
  root,
  publicDir: false,
  build: {
    outDir: output,
    emptyOutDir: true,
    target: 'es2020',
    cssCodeSplit: false,
    assetsInlineLimit: Infinity,
    chunkSizeWarningLimit: 3000,
    lib: {
      entry: path.join(root, 'src/app/main.js'),
      name: 'Dao',
      formats: ['iife'],
      fileName: () => 'game.js',
    },
  },
});
const names = await readdir(output);
if (names.some(n => !['game.js', 'dao.css'].includes(n)))
  throw new Error('发现未内联的构建资源，请检查单文件打包');
const js = await readFile(path.join(output, 'game.js'), 'utf8');
const css = await readFile(path.join(output, 'dao.css'), 'utf8');
let html = await readFile(path.join(root, 'index.html'), 'utf8');
html = html.replace(/\s*<link rel="manifest"[^>]*>/, '');
html = html.replace(
  '</head>',
  () => `<style>${css.replace(/<\/style/gi, '<\\/style')}</style></head>`,
);
html = html.replace(
  /<script type="module"[^>]*><\/script>/,
  () => `<script>${js.replace(/<\/script/gi, '<\\/script')}</script>`,
);
const release = path.join(root, '发布');
await mkdir(release, { recursive: true });
await writeFile(path.join(release, '稻-手机版.html'), html);
console.log(
  `已生成 发布/稻-手机版.html（${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB）`,
);
