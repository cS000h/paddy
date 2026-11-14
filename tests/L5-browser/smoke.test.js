// L5 浏览器冒烟：把游戏真的构建出来，用本机的 Chrome（无界面）打开，走一遍最基本的流程。
// 它不比较画面好不好看，只回答“还跑得起来吗”：能启动、点地能种、键盘能走、能过夜、触屏有摇杆、没有报错。
// 截图留在 .cache/ 里，方便人工看一眼。本机没有 Chrome 时自动跳过。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dist = path.join(root, 'dist');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

async function launch() {
  try {
    const { chromium } = await import('playwright-core');
    return await chromium.launch({ channel: 'chrome', headless: true });
  } catch {
    return null;
  }
}

function serve() {
  const server = createServer(async (req, res) => {
    const name = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.join(dist, name === '/' ? 'index.html' : name);
    try {
      const body = await readFile(file);
      res.writeHead(200, {
        'content-type': TYPES[path.extname(file)] || 'application/octet-stream',
      });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// 不等真实时间：直接让引擎走 n 帧（每帧 1/60 秒）。
const frames = (page, n) =>
  page.evaluate(count => {
    const game = window.__dao.world.scene().game;
    let t = performance.now();
    for (let i = 0; i < count; i++) game.step((t += 16.67), 16.67);
  }, n);
const tap = (page, x, y) =>
  page.evaluate(
    ([tx, ty]) => window.__dao.intents.emit('tap', { x: tx * 16 + 8, y: ty * 16 + 8 }),
    [x, y],
  );
const plot = (page, x, y) =>
  page.evaluate(
    ([px, py]) => window.__dao.game.ask('farm.plots', 'yard').find(p => p.x === px && p.y === py),
    [x, y],
  );

async function open(browser, port, options) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => message.type() === 'error' && errors.push(message.text()));
  await page.goto(`http://127.0.0.1:${port}/?debug`);
  await page.waitForFunction(() => window.__dao?.world.scene()?.player, null, { timeout: 15000 });
  return { page, errors, context };
}

test('构建出来的游戏在浏览器里能启动、种菜、走路、过夜；触屏有摇杆；全程没有报错', async t => {
  const built = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(built.status, 0, built.stdout + built.stderr);
  const browser = await launch();
  if (!browser) return t.skip('本机没有可用的 Chrome');
  const server = await serve();
  const port = server.address().port;
  await mkdir(path.join(root, '.cache'), { recursive: true });
  try {
    // —— 桌面：键鼠 ——
    const desk = await open(browser, port, { viewport: { width: 1280, height: 720 } });
    const page = desk.page;
    assert.equal(await page.locator('.stick').isVisible(), false, '键鼠设备上不该出现摇杆');

    await tap(page, 8, 20); // 点一下菜地：走过去，锄地
    await frames(page, 600);
    assert.deepEqual(await plot(page, 8, 20), {
      x: 8,
      y: 20,
      wet: false,
      crop: null,
      stage: -1,
      ripe: false,
    });
    await tap(page, 8, 20); // 再点：自动换成菜种
    await frames(page, 40);
    await tap(page, 8, 20); // 再点：自动换成水壶
    await frames(page, 40);
    const planted = await plot(page, 8, 20);
    assert.deepEqual([planted.crop, planted.wet], ['qingcai', true]);

    const before = await page.evaluate(() => window.__dao.world.scene().player.px);
    await page.evaluate(() => window.__dao.intents.setMove('test', 1, 0)); // 往右走一秒
    await frames(page, 60);
    await page.evaluate(() => window.__dao.intents.setMove('test', 0, 0));
    assert.ok(
      (await page.evaluate(() => window.__dao.world.scene().player.px)) > before + 40,
      '应该往右走了',
    );

    await page.evaluate(() => window.__dao.shell.set({ modal: { kind: 'sleep' } })); // 回屋歇息
    await page.locator('button[data-do="sleep"]').click();
    await page.waitForFunction(() => window.__dao.game.ask('clock').day === 2, null, {
      timeout: 8000,
    });
    await page.waitForFunction(() => window.__dao.shell.get().veil === 0);
    assert.match(await page.locator('.date b').textContent(), /第 2 日/);
    assert.equal((await plot(page, 8, 20)).stage, 1, '浇过水的菜过了一夜长了一截');
    await frames(page, 30);
    await page.waitForTimeout(900); // 等过夜的幕完全揭开再截图
    await page.screenshot({ path: path.join(root, '.cache', 'smoke-desktop.png') });
    assert.deepEqual(desk.errors, []);

    // —— 手机：触屏、竖屏 ——
    const phone = await open(browser, port, {
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    assert.equal(await phone.page.locator('.stick').isVisible(), true, '触屏上要有摇杆');
    assert.equal(await phone.page.locator('.journal').isVisible(), false, '窄屏上手记默认收起');
    const bar = await phone.page.locator('.toolbar').boundingBox();
    assert.ok(
      bar.x >= 0 && bar.x + bar.width <= 390 && bar.y + bar.height <= 844,
      '工具栏要完整地在屏幕里',
    );
    await phone.page.locator('.do').tap(); // “做”按钮能用（面前没东西时什么都不发生，也不报错）
    await tap(phone.page, 8, 20);
    await frames(phone.page, 600);
    assert.ok(await plot(phone.page, 8, 20), '手指点地也能锄');
    await phone.page.screenshot({ path: path.join(root, '.cache', 'smoke-phone.png') });
    assert.deepEqual(phone.errors, []);
  } finally {
    await browser.close();
    server.close();
  }
});
