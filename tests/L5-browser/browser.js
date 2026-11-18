// L5 浏览器测试共用的几样：本机 Chrome、伺服 dist/ 的小服务器、让引擎走几帧、用意图点一格。
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dist = path.join(root, 'dist');
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.webmanifest': 'application/manifest+json',
};

export async function launch() {
  try {
    const { chromium } = await import('playwright-core');
    return await chromium.launch({ channel: 'chrome', headless: true });
  } catch {
    return null;
  }
}

/** 伺服一个构建目录（默认 dist/；并行的测试各自构建到别处，免得互相覆盖）。 */
export function serve(dir = dist) {
  const server = createServer(async (req, res) => {
    const name = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.join(dir, name === '/' ? 'index.html' : name);
    try {
      const body = await readFile(file);
      const type = TYPES[path.extname(file)] || 'application/octet-stream';
      res.writeHead(200, { 'content-type': type });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// 不等真实时间：直接让引擎走 n 帧（每帧 1/60 秒）。
export const frames = (page, n) =>
  page.evaluate(count => {
    const game = window.__dao.world.scene().game;
    let t = performance.now();
    for (let i = 0; i < count; i++) game.step((t += 16.67), 16.67);
  }, n);
// 用意图“点”一格（不经过真实的鼠标或手指）。
export const tap = (page, x, y) =>
  page.evaluate(
    ([tx, ty]) => window.__dao.intents.emit('tap', { x: tx * 16 + 8, y: ty * 16 + 8 }),
    [x, y],
  );
export const plot = (page, x, y) =>
  page.evaluate(
    ([px, py]) => window.__dao.game.ask('farm.plots', 'yard').find(p => p.x === px && p.y === py),
    [x, y],
  );
// 世界里的一格，此刻在屏幕上的哪个位置（画面转过来的时候也算对）。
export const onScreen = (page, x, y) =>
  page.evaluate(
    ([tx, ty]) => {
      const camera = window.__dao.world.scene().cameras.main;
      const lx = (tx * 16 + 8 - camera.worldView.x) * camera.zoom;
      const ly = (ty * 16 + 8 - camera.worldView.y) * camera.zoom;
      return window.__dao.platform.viewport.size().rotated
        ? { x: window.innerWidth - ly, y: lx }
        : { x: lx, y: ly };
    },
    [x, y],
  );

export async function open(browser, port, options) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => message.type() === 'error' && errors.push(message.text()));
  await page.goto(`http://127.0.0.1:${port}/?debug`);
  await page.waitForFunction(() => window.__dao?.world.scene()?.player, null, { timeout: 15000 });
  await page.locator('[data-do="originPick"][data-id="later"]').click();
  await page.locator('[data-do="originPick"][data-id="quiet"]').click();
  return { page, errors };
}

/** 等世界里正在演的那件活演完（最多 15 秒）。 */
export const performed = page =>
  page.waitForFunction(() => !window.__dao.world.scene()?.performer?.active, null, {
    timeout: 15000,
  });

export const shot = (page, name) => page.screenshot({ path: path.join(root, '.cache', name) });
