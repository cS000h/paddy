// L5 浏览器冒烟：把游戏真的构建出来，用本机的 Chrome（无界面）打开，走一遍最基本的流程。
// 它不比较画面好不好看，只回答“还跑得起来吗”：能启动、点地能种、键盘能走、能过夜、
// 手机上是横屏而且手指点得准、没有报错。截图留在 .cache/ 里，方便人工看一眼。
// 本机没有 Chrome 时自动跳过。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import {
  root,
  launch,
  serve,
  frames,
  tap,
  plot,
  onScreen,
  open,
  shot,
  performed,
} from './browser.js';

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
    for (const touch of [false, true]) {
      const held = await open(browser, port, {
        viewport: { width: 844, height: 390 },
        hasTouch: true,
      });
      const h = held.page;
      await h.evaluate(() => {
        const { game, world, shell } = window.__dao;
        for (const x of [8, 9, 10]) {
          const result = game.dispatch('farm.till', {
            x,
            y: 21,
            at: { x: x - 1, y: 21, dir: 'right' },
          });
          if (!result.ok) throw Error(result.reason);
        }
        const actor = world.scene().player;
        actor.px = 7 * 16 + 8;
        actor.py = 21 * 16 + 13;
        actor.face('right');
        actor.sync();
        shell.set({ manualTool: true, tool: 'can' });
      });
      await frames(h, 4);
      if (touch) await shot(h, 'a03b-water-before.png');
      const client = await h.context().newCDPSession(h);
      const fingers = (type, touchPoints) =>
        client.send('Input.dispatchTouchEvent', { type, touchPoints });
      if (touch) {
        const stamp = await h.locator('button.do').boundingBox();
        const right = { id: 2, x: stamp.x + stamp.width / 2, y: stamp.y + stamp.height / 2 };
        const left = { id: 1, x: 150, y: 230 };
        await fingers('touchStart', [left]);
        await fingers('touchStart', [left, right]);
        await fingers('touchMove', [{ ...left, x: left.x + 45 }, right]);
      } else {
        await h.keyboard.down('e');
        await h.keyboard.down('ArrowRight');
      }
      await h.waitForFunction(() =>
        [8, 9, 10].every(x => window.__dao.game.ask('farm.detail', x, 21)?.wet),
      );
      if (touch) await fingers('touchEnd', []);
      else {
        await h.keyboard.up('ArrowRight');
        await h.keyboard.up('e');
      }
      await frames(h, 30);
      if (touch) await shot(h, 'a03b-water-after.png');
      await h.evaluate(() => {
        const actor = window.__dao.world.scene().player;
        actor.px = 17 * 16 + 8;
        actor.py = 18 * 16 + 13;
        actor.face('right');
        actor.sync();
      });
      await h.keyboard.press('j');
      assert.equal(await h.evaluate(() => window.__dao.shell.get().modal), null);
      const home = await h.evaluate(() => window.__dao.game.ask('home'));
      assert.equal(home.can, home.canMax);
      assert.deepEqual(held.errors, []);
      await h.context().close();
    }
    // —— 桌面：键鼠 ——
    const desk = await open(browser, port, { viewport: { width: 1280, height: 720 } });
    const page = desk.page;
    assert.equal(await page.locator('.stick').isVisible(), false, '键鼠设备上不该出现摇杆');
    assert.equal(await page.evaluate(() => window.__dao.platform.viewport.size().rotated), false);

    await frames(page, 20);
    await shot(page, 'a03b-hud-desktop.png');
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
    await tap(page, 8, 20); // 先润土
    await frames(page, 40);
    await tap(page, 8, 20); // 湿润的空地上播种
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
    assert.equal(await mobile.locator('.do').textContent(), '浇水');
    await mobile.locator('.toolbar [data-tool="hoe"]').tap();
    await frames(mobile, 3);
    assert.equal(await mobile.locator('.do').textContent(), '锄地');
    await mobile.locator('.do').tap();
    assert.equal((await plot(mobile, 8, 20)).wet, false, '手选工具时不能自动浇水');
    await mobile.locator('.toolbar [data-tool="hoe"]').tap();
    await frames(mobile, 3);
    await mobile.locator('.do').tap();
    await frames(mobile, 30);
    await shot(mobile, 'smoke-phone-portrait.png');
    assert.deepEqual(phone.errors, []);

    assert.equal((await plot(mobile, 8, 20)).wet, true);
    assert.equal(await mobile.locator('.do').textContent(), '播种');
    await tap(mobile, 8, 20);
    await frames(mobile, 90);
    // 石伯从自己的田走过来，在刚播种的格旁弯腰；走路时点他也仍与本人说话。
    const tending = await mobile.evaluate(() => {
      const scene = window.__dao.world.scene();
      const shi = scene.villagers.find(v => v.id === 'shi');
      for (let i = 0; i < 900; i++) {
        scene.game.step(performance.now() + i * 16.67, 16.67);
        if (shi.work.image?.visible && shi.tile.y === 20 && Math.abs(shi.tile.x - 8) === 1)
          return true;
      }
      return false;
    });
    assert.equal(tending, true);
    const visit = await mobile.evaluate(() => {
      const s = window.__dao.world.scene();
      const shi = s.villagers.find(v => v.id === 'shi');
      const tiles = new Set();
      let working = false;
      for (let i = 0; i < 480; i++) {
        s.game.step(performance.now() + i * 16.67, 16.67);
        tiles.add(shi.tile.y);
        working ||= Boolean(shi.work.image?.visible);
      }
      s.tap(shi.px, shi.py - 12);
      return { worked: working, walked: tiles.size > 1 };
    });
    assert.deepEqual(visit, { worked: true, walked: true });
    await frames(mobile, 230);
    const talk = await mobile.evaluate(() => window.__dao.shell.get().modal);
    assert.equal(talk?.who, 'shi');
    assert.match(talk.line, /水吃进土/);
    await mobile.locator('.sheet button[data-do="close"]').last().click();
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
    await shot(wide.page, 'a03b-hud-phone.png');
    await shot(wide.page, 'smoke-phone-landscape.png');
    // 新来的人：手记收着时左上角有“下一步”，用这台设备的说法讲怎么做
    assert.match(await wide.page.locator('.next').textContent(), /锄松一格地.*菜地.*点右下印章/);
    assert.equal(await desk.page.locator('.journal').isVisible(), false);
    await desk.page.evaluate(() => window.__dao.shell.set({ modal: null }));
    assert.match(await desk.page.locator('.next').textContent(), /下一步.*按空格/);
    await desk.page.locator('.vitals [data-do="journal"]').click();
    assert.equal(await desk.page.locator('[data-do="journalTab"][data-tab="people"]').count(), 0);
    await desk.page.locator('[data-do="journalTab"][data-tab="pack"]').click();
    assert.match(await desk.page.locator('.journal section').textContent(), /格/);
    await desk.page.locator('.journal header button').click();
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
      await tap(p, 8, 9);
      await frames(p, 1300);
      await p.waitForFunction(() => window.__dao.world.scene().map.id === 'cottage');
      await tap(p, 12, 6);
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
      await tap(p, 9, 14);
      await frames(p, 900);
      await p.waitForFunction(() => window.__dao.world.scene().map.id === 'yard');
      await tap(p, 12, 10);
      await frames(p, 300);
      // 喝上了：小窗合上，人在水缸边舀一瓢（演完才能接着做别的）
      const can = await p.evaluate(() => window.__dao.game.ask('home'));
      assert.equal(can.can, can.canMax);
      assert.equal(await p.evaluate(() => window.__dao.game.ask('body').thirst), 100);
      assert.equal(await p.evaluate(() => window.__dao.shell.get().modal), null);
      await performed(p);
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
      // 亲自掌火炒一锅：先下料（桌面上空格就是按主键），再出锅
      assert.match(await p.locator('.sheet h2').textContent(), /掌火 · 炒/);
      if (session === desk) await p.keyboard.press('Space');
      else await p.locator('[data-do="firePress"]').tap();
      if (session === desk) await p.locator('[data-do="cookFinish"]').click();
      else await p.locator('[data-do="cookFinish"]').tap();
      // 出锅了那一张：端走，回到灶台
      await p.waitForSelector('[data-do="cookedPack"]');
      assert.match(await p.locator('.sheet h2').textContent(), /出锅了/);
      await p.locator('[data-do="cookedPack"]').click();
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
      // 挑了活，小窗合上，人在竹林边抡起柴刀；演到一半点一下能快进
      assert.ok(await p.evaluate(() => window.__dao.world.scene().performer.active));
      await performed(p);
      await tap(p, 4, 12);
      await frames(p, 1200);
      await p.locator('[data-do="activity"][data-id="weave"]').click();
      assert.ok(
        await p.evaluate(() =>
          window.__dao.game.ask('goods', window.__dao.world.heroAt()).some(i => i.id === 'basket'),
        ),
      );
      await shot(p, session === desk ? 'm3-weave-desktop.png' : 'm3-weave-phone.png');
      await p.evaluate(() => window.__dao.intents.emit('act'));
      await performed(p);
      await tap(p, 38, 20);
      await frames(p, 1600);
      // 钓点开钓鱼的小窗：下竿 → 看漂，等到浮漂沉下去那一刻提竿 → 钩上了就收竿
      await p.locator('[data-do="fishCast"].main').click();
      await p.waitForTimeout(250);
      await shot(p, session === desk ? 'm3-fish-desktop.png' : 'm3-fish-phone.png');
      const left = await p.evaluate(() => {
        const m = window.__dao.shell.get().modal;
        const bite = m.events.find(e => e.kind === 'bite');
        return bite ? bite.at + 60 - (performance.now() - m.started) : -1;
      });
      if (left >= 0) {
        await p.waitForTimeout(Math.max(0, left));
        if (session === desk) await p.keyboard.press('Space');
        else await p.locator('[data-do="fishHook"]').tap();
        await p.waitForTimeout(150);
      }
      // 还在看漂、遛鱼就收竿；已经有了结果（拉上来、跑了、没钓着），小窗换成结果页，按「收竿」关上
      const phase = await p.evaluate(() => window.__dao.shell.get().modal?.phase ?? null);
      if (phase === 'float' || phase === 'fight') await p.locator('[data-do="fishQuit"]').click();
      else if (phase) {
        await shot(p, session === desk ? 'm3-fish-result-desktop.png' : 'm3-fish-result-phone.png');
        await p.locator('[data-do="close"]').first().click();
      }
      await performed(p);
      assert.equal(await p.evaluate(() => window.__dao.game.ask('fishing').bout), null);
      assert.equal(await p.evaluate(() => window.__dao.shell.get().modal), null);
      // 路边翻一翻：点院里的一丛野花，走过去就翻；行囊满了、太累了只说一句，不出错
      await tap(p, 13, 13);
      await frames(p, 1200);
      const why = await p.evaluate(() =>
        window.__dao.game.ask('search.why', { x: 13, y: 13 }, window.__dao.world.heroAt()),
      );
      assert.ok(['今天翻过了', '行囊满了，腾个地方再翻', '太累了，先歇歇'].includes(why), why);
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
      await p.locator('.date .seal').click();
      assert.equal(await p.locator('.folio-stat').count(), 6);
      const household = p.locator('[data-attr="chijia"]');
      await household.click();
      assert.match(await p.locator('.folio-detail').textContent(), /底子/);
      if (session === desk) await shot(p, 'a03a-person-desktop.png');
      await household.click();
      assert.equal(await p.locator('.folio-detail').count(), 0);
      if (session === wide) await shot(p, 'a03a-person-phone.png');
      await p.locator('.folio-picker summary').click();
      await p.locator('[data-do="bookWho"][data-who="shi"]').click();
      assert.match(await p.locator('.folio-traits').textContent(), /还看不出/);
      assert.equal(await p.locator('.folio-stress').count(), 0);
      if (session === desk) await shot(p, 'a03a-shi.png');
      await p.locator('[data-tab="ledger"]').click();
      await p.locator('[data-do="ledgerWho"][data-who="shi"]').click();
      assert.match(await p.locator('.folio-score').textContent(), /好感/);
      const visitor = await p.evaluate(() => window.__dao.game.ask('visitors').active[0]);
      await p.locator(`[data-do="ledgerWho"][data-who="${visitor.id}"]`).click();
      if (session === wide) {
        await p.waitForTimeout(3500);
        await shot(p, 'a03b-ledger-phone.png');
      }
      await p.getByRole('button', { name: '看人', exact: true }).click();
      assert.equal(await p.locator('.folio-identity h2').textContent(), visitor.name);
      await p.locator('[data-do="bookTab"][data-tab="traits"]').click();
      assert.match(await p.locator('.sheet').textContent(), /慢热/);
      await p.locator('[data-do="bookTab"][data-tab="achievements"]').click();
      assert.ok((await p.locator('.achievement-mark.earned').count()) > 0);
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
      if (session === wide) {
        // 手机这一局还没锄过 (8,20)：先拿起锄头把它锄松，下面才有地可看、可开沟
        await p.locator('.toolbar [data-tool="hoe"]').tap();
        await tap(p, 8, 20);
        await frames(p, 1600);
        assert.ok(await plot(p, 8, 20), '手机这一局锄过了 (8,20)');
        await p.locator('[data-do="menu"]').click();
      }
      await p.locator('[data-do="seeds"]:visible').click();
      assert.equal(await p.locator('[data-do="seedChoose"]').count(), 7);
      await p.locator('[data-do="seedChoose"][data-seed="seed.qingcai"]').click();
      // 沿用已种好的田；点击种植完的地会走近，朝向该格。
      await tap(p, 8, 20);
      await frames(p, 1600);
      if (session === wide) await p.locator('[data-do="menu"]').click();
      await p.locator('[data-do="field"]:visible').click();
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
      await tap(p, 8, 4);
      await frames(p, 400);
      // 可穿的衣服直接可选，未取得的衣服另列出处。
      await p.locator('[data-do="fittingMissing"]').click();
      assert.match(await p.locator('.fitting-hints').textContent(), /青竹采茶衫.*后山采茶/);
      await p.locator('[data-do="fittingMissing"]').click();
      await p.locator('[data-do="fittingPick"][data-id="field"]').click();
      await p.locator('[data-do="fittingTab"][data-tab="hair"]').click();
      await p.locator('[data-do="fittingPick"][data-id="loose"]').click();
      await shot(p, session === desk ? 'wardrobe-desktop.png' : 'wardrobe-phone.png');
      await p.locator('[data-do="fittingWear"]').click();
      assert.equal(
        await p.evaluate(() => window.__dao.world.scene().player.look),
        'hero/field/loose/3',
      );
      // 走向工位时腿要持续迈步；中途用方向打断，当帧归还人物和路径。
      const handoff = await p.evaluate(() => {
        const { world, intents } = window.__dao;
        const s = world.scene();
        world.perform('rest', { target: { x: 9, y: 9 } });
        let walked = false;
        for (let i = 0; i < 16; i++) {
          s.game.step(performance.now() + i * 16.67, 16.67);
          walked ||= s.player.moving && s.player.sprite.anims.isPlaying;
        }
        intents.setMove('cut-in', -1, 0);
        s.game.step(performance.now() + 280, 16.67);
        intents.setMove('cut-in', 0, 0);
        return [walked, s.performer.active, s.player.path.length, s.player.sprite.alpha];
      });
      assert.deepEqual(handoff, [true, false, 0, 1]);
      await tap(p, 15, 7);
      await frames(p, 400);
      await p.locator('[data-do="bookTab"]').first().waitFor();
      await p.locator('[data-do="close"]').click();
      await tap(p, 9, 9);
      await frames(p, 400);
      assert.match(await p.locator('.sheet').textContent(), /窗下饭桌/);
      assert.equal(await p.locator('[data-do="activity"][data-id="stars"]').count(), 0);
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
      await performed(p);
      await tap(p, 19, 10);
      await frames(p, 450);
      await p.locator('[data-do="clothTab"][data-tab="hair"]').click();
      const coins = await p.evaluate(() => window.__dao.game.ask('home').coins);
      const pony = p.locator('[data-do="clothBuy"][data-id="pony"]');
      await pony.click();
      assert.equal(await p.evaluate(() => window.__dao.game.ask('home').coins), coins - 12);
      assert.ok(await pony.isDisabled());
      await p.locator('.award').filter({ hasText: '高马尾' }).waitFor();
      await p.waitForTimeout(350);
      const slip = await p.locator('.award').boundingBox();
      const paper = await p.locator('.frame[data-kind="cloth"]').boundingBox();
      assert.ok(slip.x >= 0 && slip.x + slip.width <= paper.x, '纸条留在布摊旁边的空处');
      await shot(p, session === desk ? 'cloth-desktop.png' : 'cloth-phone.png');
      await p.locator('[data-do="close"]').click();
      await performed(p);
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
      await tap(p, 8, 4);
      await frames(p, 400);
      await p.locator('[data-do="fittingTab"][data-tab="hair"]').click();
      await p.locator('[data-do="fittingPick"][data-id="pony"]').click();
      await p.locator('[data-do="fittingWear"]').click();
      // 新标签页自己的自动存档；重载应还在屋里，没有覆盖用户浏览器进度。
      await p.waitForTimeout(500);
      await p.reload();
      await p.waitForFunction(() => window.__dao?.world.scene()?.player);
      assert.equal(await p.evaluate(() => window.__dao.game.ask('hero').map), 'cottage');
      assert.equal(
        await p.evaluate(() => window.__dao.world.scene().player.look),
        'hero/field/pony/3',
      );
      assert.deepEqual(session.errors, []);
    }
    assert.deepEqual(wide.errors, []);
  } finally {
    await browser.close();
    server.close();
  }
});
