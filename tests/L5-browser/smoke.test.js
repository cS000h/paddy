// L5 浏览器冒烟：把游戏真的构建出来，用本机的 Chrome（无界面）打开，走一遍最基本的流程。
// 它不比较画面好不好看，只回答“还跑得起来吗”：能启动、点地能种、键盘能走、能过夜、
// 手机上是横屏而且手指点得准、没有报错。截图留在 .cache/ 里，方便人工看一眼。
// 本机没有 Chrome 时自动跳过。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { root, launch, serve, frames, tap, plot, onScreen, open, shot } from './browser.js';

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
      weeds: false,
      bugs: false,
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
    // 新来的人：手记收着时左上角有“下一步”，用这台设备的说法讲怎么做
    assert.match(await wide.page.locator('.next').textContent(), /锄松一格地.*菜地.*点「做」/);
    assert.equal(await desk.page.locator('.next').isVisible(), false, '手记开着就不重复');
    await desk.page.evaluate(() => window.__dao.shell.set({ modal: null })); // 收起清早的便条
    await desk.page.locator('.vitals [data-do="journal"]').click();
    assert.match(await desk.page.locator('.next').textContent(), /下一步.*按空格/);
    await desk.page.locator('.vitals [data-do="journal"]').click();
    // 矮屏上长的小窗：最底下那排按钮不用滚动就够得着；点纸外面的空白处也能关掉
    await wide.page.locator('[data-do="bag"]').tap();
    await wide.page.locator('[data-do="saves"]').tap();
    const closeBox = await wide.page.locator('[data-do="close"]').boundingBox();
    assert.ok(closeBox.y + closeBox.height <= 390, '“回去”要在屏幕里');
    await wide.page.touchscreen.tap(12, 200);
    assert.equal(await wide.page.evaluate(() => window.__dao.shell.get().modal), null);
    // M1：从世界走到橱柜，真的点按钮存取、吃米糕，再去水缸喝水。
    for (const session of [desk, wide]) {
      const p = session.page;
      await p.evaluate(() => window.__dao.shell.set({ modal: null }));
      await tap(p, 6, 10);
      await frames(p, 900);
      await p.waitForSelector('button[data-do="packPut"][data-item="rice"]');
      const before = await p.evaluate(() => window.__dao.game.ask('body').hunger);
      await p.locator('button[data-do="packPut"][data-item="rice"][data-n="1"]').click();
      await p.locator('button[data-do="eat"][data-item="cake"]').last().click();
      assert.ok((await p.evaluate(() => window.__dao.game.ask('body').hunger)) > before);
      await p.waitForTimeout(250);
      await p.waitForTimeout(250);
      const box = await p.locator('.sheet').boundingBox();
      assert.ok(box.y >= 0 && box.y + box.height <= p.viewportSize().height);
      await shot(p, session === desk ? 'm1-store-desktop.png' : 'm1-store-phone.png');
      await p.locator('button[data-do="close"]').click();
      await tap(p, 12, 10);
      await frames(p, 300);
      await p.locator('button[data-do="drink"]').click();
      assert.equal(await p.evaluate(() => window.__dao.game.ask('body').thirst), 100);
      await p.locator('button[data-do="close"]').click();
      await p.locator('button[data-do="bag"]').click();
      assert.match(await p.locator('.sheet h2').textContent(), /行囊/);
      await p.locator('button[data-do="close"]').click();
      assert.deepEqual(session.errors, []);
    }
    // M2：从灶台选食材，键盘/手指收火，端走和吃饭，翻菜谱。
    for (const session of [desk, wide]) {
      const p = session.page;
      await tap(p, 10, 10);
      await frames(p, 500);
      await p.locator('[data-do="cookPick"][data-item="rice"]').click();
      await p.locator('[data-do="cookPick"][data-item="egg"]').click();
      await p.locator('[data-do="cookMethod"][data-method="fry"]').click();
      assert.match(await p.locator('.sheet').textContent(), /蛋炒饭/);
      await p.waitForTimeout(250);
      await shot(p, session === desk ? 'm2-kitchen-desktop.png' : 'm2-kitchen-phone.png');
      await p.locator('[data-do="cookHeat"]').click();
      if (session === desk) await p.keyboard.press('Space');
      else await p.locator('[data-do="cookFinish"]').tap();
      await p.waitForSelector('[data-do="dishPack"]');
      await p.locator('[data-do="dishPack"]').first().click();
      assert.equal(await p.evaluate(() => window.__dao.game.ask('pack').dishes.length), 1);
      await p.locator('[data-do="dishEat"]').first().click();
      await p.locator('[data-do="recipes"]').click();
      assert.match(await p.locator('h2').last().textContent(), /做过 1/);
      await p.locator('[data-do="recipePage"]').last().click();
      await p.locator('[data-do="backKitchen"]').click();
      await p.locator('[data-do="close"]').click();
      assert.deepEqual(session.errors, []);
    }
    // M3：走到竹林、工作台和钓点，在两种设备上操作。
    for (const session of [desk, wide]) {
      const p = session.page;
      await tap(p, 16, 8);
      await frames(p, 1200);
      await p.locator('[data-do="activity"][data-id="bamboo"]').click();
      assert.ok(
        await p.evaluate(() => window.__dao.game.ask('pack').items.some(i => i.id === 'strip')),
      );
      await p.locator('[data-do="close"]').click();
      await tap(p, 4, 12);
      await frames(p, 1200);
      await p.locator('[data-do="activity"][data-id="weave"]').click();
      assert.ok(
        await p.evaluate(() =>
          window.__dao.game.ask('goods', window.__dao.world.heroAt()).some(i => i.id === 'basket'),
        ),
      );
      await p.locator('[data-do="close"]').click();
      await tap(p, 38, 20);
      await frames(p, 1600);
      await p.locator('[data-do="activity"][data-id="fish"]').click();
      await p.waitForTimeout(250);
      await shot(p, session === desk ? 'm3-fish-desktop.png' : 'm3-fish-phone.png');
      if (session === desk) await p.keyboard.press('Space');
      else await p.locator('[data-do="fishReel"]').tap();
      await p.waitForSelector('[data-do="activity"][data-id="fish"]');
      assert.equal(await p.evaluate(() => window.__dao.game.ask('outings', 'fish').pending), false);
      assert.equal(
        await p.evaluate(() => window.__dao.game.ask('outings', 'fish').options[0].left),
        2,
      );
      await p.locator('[data-do="close"]').click();
      assert.deepEqual(session.errors, []);
    }
    // M4：开局选择已在open里点击；册子的三个分页能翻，成就随行动落印。
    for (const session of [desk, wide]) {
      const p = session.page;
      assert.equal(
        await p.evaluate(
          () => window.__dao.game.ask('growth').traits.filter(t => t.owned).length >= 2,
        ),
        true,
      );
      await p.locator('[data-do="book"]').click();
      await p.locator('[data-do="bookTab"][data-tab="traits"]').click();
      assert.match(await p.locator('.sheet').textContent(), /慢热/);
      await p.locator('[data-do="bookTab"][data-tab="achievements"]').click();
      assert.ok((await p.locator('.achievement-seal.earned').count()) > 0);
      await p.waitForTimeout(250);
      await shot(p, session === desk ? 'm4-book-desktop.png' : 'm4-book-phone.png');
      await p.locator('[data-do="bookPage"]').last().click();
      await p.locator('[data-do="close"]').click();
      assert.deepEqual(session.errors, []);
    }
    // M5：实际点击预报、选种、田地护理，并确认矮屏可以滚动到操作按钮。
    for (const session of [desk, wide]) {
      const p = session.page;
      await p.locator('[data-do="weather"]').click();
      await p.locator('[data-do="skyLook"]').click();
      assert.equal(await p.evaluate(() => window.__dao.game.ask('weather').looked), true);
      await p.waitForTimeout(250);
      await shot(p, session === desk ? 'm5-weather-desktop.png' : 'm5-weather-phone.png');
      await p.locator('[data-do="close"]').click();
      await p.locator('[data-do="seeds"]').click();
      assert.equal(await p.locator('[data-do="seedChoose"]').count(), 7);
      await p.locator('[data-do="seedChoose"][data-seed="seed.qingcai"]').click();
      // 沿用已种好的田；点击种植完的地会走近，朝向该格。
      await tap(p, 8, 20);
      await frames(p, 1600);
      await p.locator('[data-do="field"]').click();
      await p.locator('[data-do="fieldCare"][data-kind="drain"]').click();
      assert.equal(
        await p.evaluate(() => window.__dao.game.ask('farm.detail', 8, 20).drained),
        true,
      );
      await p.waitForTimeout(250);
      const box = await p.locator('.sheet').boundingBox();
      assert.ok(box.y >= 0 && box.y + box.height <= p.viewportSize().height);
      await shot(p, session === desk ? 'm5-field-desktop.png' : 'm5-field-phone.png');
      await p.locator('[data-do="close"]').click();
      assert.deepEqual(session.errors, []);
    }
    // M6与小屋：不通过传送调试接口，沿真实路口走过每张地图。
    for (const session of [desk, wide]) {
      const p = session.page;
      const go = async (x, y, id) => {
        await tap(p, x, y);
        await frames(p, 1600);
        await p.waitForFunction(id => window.__dao.world.scene().map.id === id, id);
        await frames(p, 30);
        assert.equal(await p.evaluate(() => window.__dao.game.ask('hero').map), id);
      };
      await go(8, 9, 'cottage');
      await shot(p, session === desk ? 'cottage-desktop.png' : 'cottage-phone.png');
      await tap(p, 15, 7);
      await frames(p, 400);
      await p.locator('[data-do="cookPick"][data-item="potato"]').click();
      await p.locator('[data-do="cookPlain"]').click();
      assert.match(await p.locator('.sheet').textContent(), /土豆/);
      await p.locator('[data-do="close"]').click();
      await go(9, 14, 'yard');
      await go(2, 14, 'market');
      await tap(p, 14, 10);
      await frames(p, 400);
      await p.locator('[data-do="marketBuy"][data-item="rice"]').click();
      assert.ok(
        await p.evaluate(() => window.__dao.game.ask('pack').items.some(i => i.id === 'rice')),
      );
      await p.waitForTimeout(250);
      await shot(p, session === desk ? 'market-desktop.png' : 'market-phone.png');
      await p.locator('[data-do="close"]').click();
      await go(26, 14, 'tea');
      await tap(p, 17, 10);
      await frames(p, 400);
      await p.locator('[data-do="teaDo"][data-kind="listen"]').click();
      assert.match(await p.locator('.sheet').textContent(), /听邻桌东一句西一句/);
      await p.locator('[data-do="close"]').click();
      await go(26, 14, 'river');
      await shot(p, session === desk ? 'river-desktop.png' : 'river-phone.png');
      await go(12, 4, 'creek');
      await go(12, 3, 'hill');
      assert.ok(
        await p.evaluate(() =>
          window.__dao.world.scene().villagers.some(v => v.id === 'yun' && v.sprite.visible),
        ),
      );
      await shot(p, session === desk ? 'hill-desktop.png' : 'hill-phone.png');
      await go(12, 20, 'creek');
      await go(1, 14, 'yard');
      await go(8, 9, 'cottage');
      // 新标签页自己的自动存档；重载应还在屋里，没有覆盖用户浏览器进度。
      await p.waitForTimeout(500);
      await p.reload();
      await p.waitForFunction(() => window.__dao?.world.scene()?.player);
      assert.equal(await p.evaluate(() => window.__dao.game.ask('hero').map), 'cottage');
      assert.deepEqual(session.errors, []);
    }
    assert.deepEqual(wide.errors, []);
  } finally {
    await browser.close();
    server.close();
  }
});
