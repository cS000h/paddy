// L5 浏览器冒烟：把游戏真的构建出来，用本机的 Chrome（无界面）打开，走一遍最基本的流程。
// 它不比较画面好不好看，只回答“还跑得起来吗”：能启动、点地能种、键盘能走、能过夜、
// 手机上是横屏而且手指点得准、没有报错。截图留在 .cache/ 里，方便人工看一眼。
// 本机没有 Chrome 时自动跳过。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dist = path.join(root, 'dist');
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.webmanifest': 'application/manifest+json',
};

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
const frames = (page, n) =>
  page.evaluate(count => {
    const game = window.__dao.world.scene().game;
    let t = performance.now();
    for (let i = 0; i < count; i++) game.step((t += 16.67), 16.67);
  }, n);
// 用意图“点”一格（不经过真实的鼠标或手指）。
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
// 世界里的一格，此刻在屏幕上的哪个位置（画面转过来的时候也算对）。
const onScreen = (page, x, y) =>
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

async function open(browser, port, options) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => message.type() === 'error' && errors.push(message.text()));
  await page.goto(`http://127.0.0.1:${port}/?debug`);
  await page.waitForFunction(() => window.__dao?.world.scene()?.player, null, { timeout: 15000 });
  return { page, errors };
}

const shot = (page, name) => page.screenshot({ path: path.join(root, '.cache', name) });

test('构建出来的游戏：桌面能种菜走路过夜；手机强制横屏、手指点得准；全程没有报错', async t => {
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
    assert.equal(await page.evaluate(() => window.__dao.platform.viewport.size().rotated), false);

    await tap(page, 8, 18); // 先走到菜地边上
    await frames(page, 500);
    const click = await onScreen(page, 8, 20);
    await page.mouse.click(click.x, click.y); // 真的用鼠标点一下菜地：锄地
    await frames(page, 120);
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
    const after = await page.evaluate(() => window.__dao.world.scene().player.px);
    assert.ok(after > before + 40, '应该往右走了');

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
    await shot(page, 'smoke-desktop.png');
    assert.deepEqual(desk.errors, []);

    // —— 手机竖着拿：画面要转成横屏 ——
    const phone = await open(browser, port, {
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const mobile = phone.page;
    assert.deepEqual(await mobile.evaluate(() => window.__dao.platform.viewport.size()), {
      width: 844,
      height: 390,
      rotated: true,
    });
    const canvas = await mobile.evaluate(() => {
      const c = window.__dao.world.scene().game.canvas;
      return [c.width, c.height];
    });
    assert.deepEqual(canvas, [844, 390], '画布按横屏的大小建');
    assert.equal(await mobile.locator('.stick').isVisible(), true, '触屏上要有摇杆');
    assert.equal(await mobile.locator('.journal').isVisible(), false, '手机上手记默认收起');
    for (const selector of ['.toolbar', '.date', '.vitals', '.stick', '.do']) {
      const box = await mobile.locator(selector).boundingBox();
      const inside =
        box.x >= 0 && box.y >= 0 && box.x + box.width <= 390 && box.y + box.height <= 844;
      assert.ok(inside, `${selector} 要完整地在屏幕里`);
    }
    // 竖着拿的时候，手指往屏幕下方划 = 游戏里往右走
    const swipe = await mobile.evaluate(() => window.__dao.platform.viewport.toLocalDelta(0, 10));
    assert.deepEqual(swipe, { x: 10, y: 0 });

    await tap(mobile, 8, 18);
    await frames(mobile, 500);
    const finger = await onScreen(mobile, 8, 20);
    await mobile.touchscreen.tap(finger.x, finger.y); // 真的用手指点一下：位置要换算得对
    await frames(mobile, 120);
    assert.ok(await plot(mobile, 8, 20), '转过来的画面上，手指点哪一格就锄哪一格');
    await mobile.locator('.do').tap(); // “做”按钮：面前这格已经锄过，只会提示，不报错
    await frames(mobile, 30);
    await shot(mobile, 'smoke-phone-portrait.png');
    assert.deepEqual(phone.errors, []);

    // —— 手机横着拿：不用转，布局收紧 ——
    const wide = await open(browser, port, {
      viewport: { width: 844, height: 390 },
      hasTouch: true,
      isMobile: true,
    });
    assert.equal(
      await wide.page.evaluate(() => window.__dao.platform.viewport.size().rotated),
      false,
    );
    assert.equal(await wide.page.locator('#app.compact .stick').isVisible(), true);
    await frames(wide.page, 30);
    await shot(wide.page, 'smoke-phone-landscape.png');
    assert.deepEqual(wide.errors, []);
  } finally {
    await browser.close();
    server.close();
  }
});
