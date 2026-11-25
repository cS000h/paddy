import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { createGame } from '../../src/port/game.js';
import { daylight } from '../../src/art/daylight.js';
import { KEY } from '../../src/platform/storage.js';
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
    // 出锅了那一张：火候那句照做法说（炒的家常）
    assert.match(await page.locator('.sheet').textContent(), /家常炒菜/);
    assert.equal(
      await page.evaluate(
        () => window.__dao.game.ask('kitchen', window.__dao.world.heroAt()).dishes[0].cut,
      ),
      'shred',
    );
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(root, '.cache/offline-kitchen-phone.png') });
    await page.locator('[data-do="cookedBack"]').tap();
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

test('离线小屋读档即呈雨夜，早雾散去时室内曝光逐步改变', async () => {
  const game = createGame({ seed: 1 });
  game.dispatch('origin.choose', { route: 'later', reply: 'quiet' });
  assert.ok(game.dispatch('travel', { x: 8, y: 9, at: { x: 8, y: 10, dir: 'up' } }).ok);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const [minute, weather] of [
      [1320, 'rain'],
      [530, 'fog'],
    ]) {
      const saved = structuredClone(game.save());
      saved.state.world.clock.minute = minute;
      saved.state.world.weather.now = weather;
      const ctx = await browser.newContext({
        viewport: { width: 844, height: 390 },
        offline: true,
      });
      await ctx.addInitScript(
        ([key, data]) => localStorage.setItem(key, JSON.stringify(data)),
        [KEY, saved],
      );
      const p = await ctx.newPage();
      await p.goto(url);
      await ready(p);
      const view = await p.evaluate(() => {
        const d = window.__dao,
          scene = d.world.scene();
        const tex = scene.textures.get('light:exposure:cottage');
        const sample = () => {
          const [r, g, b] = tex.context.getImageData(0, 0, 1, 1).data;
          return (r << 16) + (g << 8) + b;
        };
        const colors = [sample()];
        // 从实际渲染帧取样，慢机器上也不依赖固定毫秒的截图时机。
        scene.game.events.on('postrender', () => {
          const c = sample();
          if (c !== colors.at(-1)) colors.push(c);
        });
        window.roomSamples = colors;
        return {
          map: scene.map.id,
          tint: colors[0],
          flame: scene.children.list.find(o => o.texture?.key === 'lamp:flame').alpha,
        };
      });
      const model = daylight(minute, weather, true);
      assert.equal(view.map, 'cottage');
      assert.equal(view.tint, parseInt(model.tint.slice(1), 16));
      assert.equal(view.flame, model.lamp);
      if (weather === 'fog') {
        const code = await p.evaluate(() => {
          const g = window.__dao.game;
          g.dispatch('clock.advance', { minutes: 10 });
          return g.ask('weather').code;
        });
        assert.equal(code, 'sunny');
        const end = parseInt(daylight(540, code, true).tint.slice(1), 16);
        await p.waitForFunction(rgb => window.roomSamples.at(-1) === rgb, end);
        const colors = await p.evaluate(() => window.roomSamples);
        assert.ok(
          colors.some(c => c > view.tint && c < end),
          '窗外放晴时屋里要经过中间亮度',
        );
      }
      assert.deepEqual(await p.evaluate(() => window.__dao.problems.list()), []);
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
});

test('点阿满预览不涨关系；订种先确认再扣款，成交收据可原地查看', async () => {
  const game = createGame({ seed: 1 });
  game.dispatch('origin.choose', { route: 'later', reply: 'quiet' });
  assert.ok(game.dispatch('basket.put', { item: 'cake', n: 1 }).ok);
  assert.ok(game.dispatch('sleep', {}).ok);
  const saved = game.save();
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const [width, height, hasTouch] of [
      [844, 390, true],
      [1280, 720, false],
    ]) {
      const ctx = await browser.newContext({
        viewport: { width, height },
        hasTouch,
        isMobile: hasTouch,
        offline: true,
      });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await ctx.addInitScript(
        ([key, save]) => localStorage.setItem(key, JSON.stringify(save)),
        [KEY, saved],
      );
      await page.goto(url);
      await ready(page);
      await page.evaluate(() => {
        const s = window.__dao.world.scene(),
          p = s.villagers.find(v => v.id === 'aman');
        s.tap(p.px, p.py - 12);
      });
      await frames(page, 900);
      const click = async selector => {
        if (hasTouch) await page.locator(selector).tap();
        else await page.locator(selector).click();
      };
      await click('[data-do="encounterMenu"]');
      assert.equal(
        await page.evaluate(() => window.__dao.game.ask('bonds').find(b => b.id === 'aman').known),
        0,
      );
      await click('[data-key^="bill."]');
      assert.match(await page.locator('.say').textContent(), /米糕.*文/);
      await page.locator('.npc-bubble .unsaid').waitFor({ state: 'detached' });
      await page.screenshot({ path: path.join(root, '.cache', 'npc-receipt-' + width + '.png') });
      await click('[data-group="托他捎货"]');
      await click('[data-key*=".seed.qingcai."]');
      const coins = () => page.evaluate(() => window.__dao.game.ask('home').coins);
      const before = await coins();
      await click('[data-do="encounterMenu"][data-group="托他捎货"]');
      assert.equal(await coins(), before);
      await click('[data-key*=".seed.qingcai."]');
      await click('[data-confirm="yes"]');
      assert.equal(await coins(), before - 2);
      assert.match(await page.locator('.say').textContent(), /明早/);
      assert.deepEqual(errors, []);
      await ctx.close();
    }
    const morning = createGame({ seed: 1 });
    morning.dispatch('origin.choose', { route: 'later', reply: 'quiet' });
    for (const [width, height] of [
      [1280, 720],
      [844, 390],
      [390, 844],
    ]) {
      const touch = width !== 1280;
      const page = await browser.newPage({
        viewport: { width, height },
        hasTouch: touch,
        isMobile: touch,
        offline: true,
      });
      await page.addInitScript(
        ([k, s]) => localStorage.setItem(k, JSON.stringify(s)),
        [KEY, morning.save()],
      );
      await page.goto(url);
      await ready(page);
      await page.evaluate(() => {
        const scene = window.__dao.world.scene();
        const gui = scene.villagers.find(v => v.id === 'gui');
        scene.tap(gui.px, gui.py - 12);
      });
      await frames(page, 900);
      for (const selector of [
        '[data-do="encounterMenu"]',
        '[data-key="talk"]',
        '[data-group="聊聊"]',
        '[data-key="topic.news"]',
      ]) {
        const button = page.locator(selector).first();
        if (touch) await button.tap();
        else await button.click();
      }
      await page.locator('.npc-bubble .unsaid').waitFor({ state: 'detached' });
      await page.evaluate(() => document.fonts.ready.then(() => true));
      assert.match(await page.locator('.npc-bubble .say').textContent(), /小乔/);
      const bubble = await page.locator('.npc-bubble').boundingBox();
      const buttons = await page.locator('.npc-actions').boundingBox();
      assert.ok(
        bubble.x >= 0 &&
          bubble.y >= 0 &&
          bubble.x + bubble.width <= width &&
          bubble.y + bubble.height <= height,
      );
      assert.ok(
        bubble.y + bubble.height <= buttons.y ||
          bubble.x >= buttons.x + buttons.width ||
          bubble.x + bubble.width <= buttons.x,
      );
      await page.screenshot({
        path: path.join(root, '.cache', 'gui-news-' + width + 'x' + height + '.png'),
      });
      await page.context().close();
    }
  } finally {
    await browser.close();
  }
});

test('石伯田间指认：点作物能换畦，旋转手机仍指向正确的地', async () => {
  const g = createGame({ seed: 1 });
  g.dispatch('origin.choose', { route: 'later', reply: 'quiet' });
  for (const x of [6, 7]) {
    const spot = { x, y: 19, at: { x, y: 18, dir: 'down' } };
    for (const type of ['farm.till', 'farm.sow', ...(x === 7 ? ['farm.water'] : [])])
      assert.ok(g.dispatch(type, spot).ok);
  }
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const [width, height] of [
      [844, 390],
      [390, 844],
      [1280, 720],
    ]) {
      const touch = width !== 1280;
      const page = await browser.newPage({
        viewport: { width, height },
        hasTouch: touch,
        isMobile: touch,
        offline: true,
      });
      await page.addInitScript(
        ([k, s]) => localStorage.setItem(k, JSON.stringify(s)),
        [KEY, g.save()],
      );
      await page.goto(url);
      await ready(page);
      await page.evaluate(() => {
        const s = window.__dao.world.scene(),
          p = s.villagers.find(v => v.id === 'shi');
        s.tap(p.px, p.py - 12);
      });
      await frames(page, 900);
      const pick = async selector =>
        touch ? page.locator(selector).tap() : page.locator(selector).click();
      const limit = await page
        .locator('.npc-bubble .say')
        .evaluate(el => parseFloat(getComputedStyle(el).maxHeight));
      assert.ok(Math.abs(limit - Math.min(190, 0.34 * Math.min(width, height))) < 1);
      await pick('[data-do="encounterMenu"]');
      await pick('[data-picker="field"]');
      for (const [x, expected] of [
        [6, /缺水/],
        [7, /水分够/],
      ]) {
        const selector = '[data-key="plot.' + x + '.19"]';
        await page.locator(selector).waitFor();
        const hit = await page.locator(selector).evaluate(el => {
          const d = window.__dao,
            b = el.getBoundingClientRect();
          const p = d.platform.viewport.toLocal(b.x + b.width / 2, b.y + b.height / 2);
          const w = d.world.scene().cameras.main.getWorldPoint(p.x, p.y);
          return [Math.floor(w.x / 16), Math.floor(w.y / 16)];
        });
        assert.deepEqual(hit, [x, 19]);
        await pick(selector);
        assert.match(await page.locator('.field-caption').textContent(), expected);
        assert.equal(await page.locator('[aria-pressed="true"].crop-pick').count(), 1);
      }
      if (width === 844)
        await page.screenshot({ path: path.join(root, '.cache', 'shi-field-review.png') });
      await pick('[data-do="encounterMenu"]');
      assert.equal(await page.locator('.crop-pick').count(), 0);
      await pick('[data-do="close"]');
      await frames(page, 10);
      assert.ok(
        await page.evaluate(() => {
          const s = window.__dao.world.scene();
          return s.cameras.main._follow === s.player.sprite;
        }),
      );
      await page.close();
    }
  } finally {
    await browser.close();
  }
});

test('带着已订的约定读档，在茶摊从接话菜单赴约', async () => {
  const game = createGame({ seed: 1 });
  for (const [name, input] of [
    ['origin.choose', { route: 'later', reply: 'quiet' }],
    ['talk', { to: 'shi' }],
    ['invite', { to: 'shi' }],
    ['sleep', {}],
    ['clock.advance', { minutes: 120 }],
    ['clock.advance', { minutes: 70 }],
    ['travel.to', { to: 'tea' }],
  ])
    assert.ok(game.dispatch(name, input).ok, name);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 844, height: 390 },
      hasTouch: true,
      isMobile: true,
      offline: true,
    });
    await page.addInitScript(
      ([k, s]) => localStorage.setItem(k, JSON.stringify(s)),
      [KEY, game.save()],
    );
    await page.goto(url);
    await ready(page);
    await page.evaluate(() => {
      const s = window.__dao.world.scene(),
        who = s.villagers.find(p => p.id === 'shi');
      s.tap(who.px, who.py - 12);
    });
    await frames(page, 900);
    await page.getByRole('button', { name: '接话', exact: true }).tap();
    await page.getByRole('button', { name: '坐下赴约', exact: true }).tap();
    assert.equal(await page.evaluate(() => window.__dao.game.ask('visits').active), null);
    assert.equal(
      await page.evaluate(() => window.__dao.game.ask('bonds').find(p => p.id === 'shi').known),
      3,
    );
  } finally {
    await browser.close();
  }
});
