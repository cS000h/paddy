import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright-core';
const root = fileURLToPath(new URL('../../', import.meta.url));
const file = path.join(root, '发布', '稻-手机版.html');
const url = pathToFileURL(file).href + '?debug';
const ready = page => page.waitForFunction(() => window.__dao?.world.scene()?.player);
const frames = (page, n = 1200) =>
  page.evaluate(n => {
    const game = window.__dao.world.scene().game;
    let t = performance.now();
    for (let i = 0; i < n; i++) game.step((t += 16.67), 16.67);
  }, n);
async function openSaves(page) {
  await page.locator('[data-do="bag"]').tap();
  await page.locator('[data-do="saves"]').tap();
}
async function choose(page, file) {
  const chooser = page.waitForEvent('filechooser');
  await page.locator('[data-do="importSave"]').tap();
  await (await chooser).setFiles(file);
}

test('单文件离线运行：手机做饭、导出导入、旧档升级、坏档保护、禁用存储时仍能备份', async () => {
  const built = spawnSync(process.execPath, ['tools/build-offline.mjs'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(built.status, 0, built.stdout + built.stderr);
  const html = await readFile(file, 'utf8');
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+(?:stylesheet|manifest)/);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  await mkdir(path.join(root, '.cache'), { recursive: true });
  const options = {
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
    offline: true,
    acceptDownloads: true,
  };
  try {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    const errors = [],
      requests = [];
    page.on('pageerror', e => errors.push(e.stack || String(e)));
    page.on('request', r => {
      if (/^https?:/.test(r.url())) requests.push(r.url());
    });
    await page.goto(url);
    await ready(page);
    await page.locator('[data-do="originPick"][data-id="later"]').tap();
    await page.locator('[data-do="originPick"][data-id="quiet"]').tap();
    await page.evaluate(() => window.__dao.intents.emit('tap', { x: 10 * 16 + 8, y: 10 * 16 + 8 }));
    await frames(page);
    await page.locator('[data-do="recipes"]').tap();
    await page.locator('[data-do="cookRecipe"][data-name="蛋炒饭"]').tap();
    await page.locator('[data-do="cookCut"][data-cut="shred"]').tap();
    assert.match(await page.locator('.sheet').textContent(), /正对路/);
    await page.locator('[data-do="cookPlain"]').tap();
    assert.match(await page.locator('.sheet').textContent(), /家常的味道/);
    assert.equal(
      await page.evaluate(
        () => window.__dao.game.ask('kitchen', window.__dao.world.heroAt()).dishes[0].cut,
      ),
      'shred',
    );
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(root, '.cache/offline-kitchen-phone.png') });
    await page.locator('[data-do="close"]').tap();
    await openSaves(page);
    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-do="exportSave"]').tap();
    const download = await downloadPromise;
    const exported = path.join(root, '.cache/exported-progress.json');
    await download.saveAs(exported);
    const saved = JSON.parse(await readFile(exported, 'utf8'));
    assert.equal(saved.format, 'dao.save');
    assert.ok(Object.values(saved.state.world.kitchens).some(k => k.dishes.length));
    const before = await page.evaluate(() => JSON.stringify(window.__dao.game.save()));
    await choose(page, {
      name: 'broken.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{oops'),
    });
    await page.waitForFunction(() =>
      document.querySelector('.sheet')?.textContent.includes('当前进度没有改变'),
    );
    assert.equal(await page.evaluate(() => JSON.stringify(window.__dao.game.save())), before);
    const fixture = path.join(root, 'tests/fixtures/save-v1.json');
    const old = JSON.parse(await readFile(fixture, 'utf8'));
    await choose(page, fixture);
    await page.locator('[data-do="importConfirmed"]').tap();
    await page.waitForFunction(
      day => window.__dao?.game.ask('clock').day === day,
      old.state.world.clock.day,
    );
    await ready(page);
    assert.equal(await page.evaluate(() => window.__dao.game.save().version), saved.version);
    if (await page.locator('[data-do="originPick"]').count()) {
      await page.locator('[data-do="originPick"][data-id="later"]').tap();
      await page.locator('[data-do="originPick"][data-id="quiet"]').tap();
    }
    await openSaves(page);
    assert.equal(await page.locator('[data-do="exportBackup"]').count(), 1);
    await choose(page, exported);
    await page.locator('[data-do="importConfirmed"]').tap();
    await page.waitForFunction(() =>
      window.__dao?.game
        .ask('kitchen', window.__dao.world.heroAt())
        .dishes.some(d => d.cut === 'shred'),
    );
    await ready(page);
    await openSaves(page);
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(root, '.cache/offline-save-phone.png') });
    const bounds = await page.locator('.sheet').boundingBox();
    assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.y + bounds.height <= 391);
    await context.close();
    assert.deepEqual(errors, []);
    assert.deepEqual(requests, []);

    // 原始 JSON 损坏和版本无法识别都必须保护，体验局的动作不能覆盖它们。
    for (const bad of ['{坏档', JSON.stringify({ format: 'dao.save', version: 999, state: {} })]) {
      const c = await browser.newContext(options);
      await c.addInitScript(text => localStorage.setItem('dao.save.v1', text), bad);
      const p = await c.newPage();
      await p.goto(url);
      await ready(p);
      assert.match(await p.locator('.sheet').textContent(), /停止自动覆盖/);
      await p.evaluate(() => window.__dao.game.dispatch('sleep'));
      await p.waitForTimeout(600);
      assert.equal(await p.evaluate(() => localStorage.getItem('dao.save.v1')), bad);
      await c.close();
    }
    const denied = await browser.newContext(options);
    await denied.addInitScript(() =>
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('disabled');
        },
      }),
    );
    const p = await denied.newPage();
    await p.goto(url);
    await ready(p);
    await p.locator('[data-do="originPick"][data-id="later"]').tap();
    await p.locator('[data-do="originPick"][data-id="quiet"]').tap();
    await openSaves(p);
    assert.match(await p.locator('.sheet').textContent(), /没有开放|没有写入成功/);
    const downloading = p.waitForEvent('download');
    await p.locator('[data-do="exportSave"]').tap();
    assert.match((await downloading).suggestedFilename(), /进度.json/);
    await denied.close();
  } finally {
    await browser.close();
  }
});
