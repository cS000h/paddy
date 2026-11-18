// L5 韧性：在真的 Chrome 里故意弄坏几处，看游戏是不是还能玩、进度是不是还在存。
//   - 画面某一帧出错：下一帧照常走，人照样走得动；错记下来了；
//   - 画面一直出错：弹出“出了点岔子”，选“先接着玩”能关掉；
//   - 某个听众（比如面板）每次都出错：自动存档照常；
//   - 同一份进度在两个页面里开着：后存档的那边一存，另一边停止自动存档并说明；
//   - 每天清早另存一份，能从“进度与玩法”退回去；
//   - “正在打开”那一层在游戏起来后消失。
// 自己构建一份到 .cache/ 里伺服：smoke 会重建 dist/，并行跑时不能共用。本机没有 Chrome 时跳过。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { root, launch, serve, frames, open } from './browser.js';

const out = path.join(root, '.cache', 'resilience-dist');
const kinds = page => page.evaluate(() => window.__dao.shell.get().modal?.kind || null);
const savedRevision = page =>
  page.evaluate(() => JSON.parse(localStorage.getItem('dao.save.v1') || 'null')?.state.revision);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

test('画面出错不定住、一直出错会提醒、听众出错照样存档、两个页面不互相覆盖、能退回清早', async t => {
  const built = spawnSync(
    process.execPath,
    ['node_modules/vite/bin/vite.js', 'build', '--outDir', out, '--emptyOutDir'],
    { cwd: root, encoding: 'utf8' },
  );
  assert.equal(built.status, 0, built.stdout + built.stderr);
  const browser = await launch();
  if (!browser) return t.skip('本机没有可用的 Chrome');
  const server = await serve(out);
  const port = server.address().port;
  try {
    const { page } = await open(browser, port, { viewport: { width: 1280, height: 720 } });
    assert.equal(await page.locator('#boot').count(), 0, '“正在打开”那一层该去掉了');

    // —— 画面某一帧出错（场景里，和引擎里各一次）——
    await page.evaluate(() => {
      const scene = window.__dao.world.scene();
      const hint = scene.updateHint;
      let once = true;
      scene.updateHint = function () {
        if (once) {
          once = false;
          throw new Error('测试：场景里出错一次');
        }
        return hint.call(this);
      };
      scene.events.once('postupdate', () => {
        throw new Error('测试：引擎里出错一次');
      });
    });
    await frames(page, 5);
    const x0 = await page.evaluate(() => window.__dao.world.scene().player.px);
    await page.evaluate(() => window.__dao.intents.setMove('test', 1, 0));
    await frames(page, 60);
    await page.evaluate(() => window.__dao.intents.setMove('test', 0, 0));
    const x1 = await page.evaluate(() => window.__dao.world.scene().player.px);
    assert.ok(x1 > x0 + 40, '出过错以后人还得走得动');
    const loop = await page.evaluate(() => window.__dao.world.scene().game.loop.frame);
    await page.waitForFunction(n => window.__dao.world.scene().game.loop.frame > n + 5, loop);
    const where = await page.evaluate(() => window.__dao.problems.list().map(p => p.message));
    assert.ok(where.includes('测试：场景里出错一次') && where.includes('测试：引擎里出错一次'));
    assert.equal(await kinds(page), null, '偶尔出一次错，不打扰玩家');

    // —— 画面一直出错：提醒玩家，进度已经存好 ——
    await page.evaluate(() => {
      const scene = window.__dao.world.scene();
      scene.keepHint = scene.updateHint;
      scene.updateHint = () => {
        throw new Error('测试：一直出错');
      };
    });
    await frames(page, 30);
    assert.equal(await kinds(page), 'trouble');
    await page.evaluate(() => {
      const scene = window.__dao.world.scene();
      scene.updateHint = scene.keepHint;
    });
    await page.locator('[data-do="calm"]').click();
    assert.equal(await kinds(page), null);

    // —— 某个听众每次都出错：自动存档照常 ——
    await page.evaluate(() =>
      window.__dao.game.onCommit(() => {
        throw new Error('测试：听众出错');
      }),
    );
    await page.evaluate(() => window.__dao.game.dispatch('clock.advance', { minutes: 10 }));
    await wait(700);
    assert.equal(
      await savedRevision(page),
      await page.evaluate(() => window.__dao.game.revision()),
    );

    // —— 清早备份：睡两觉，退回到第一觉醒来的那天清早 ——
    await page.evaluate(() => window.__dao.game.dispatch('sleep', {}));
    await page.evaluate(() => window.__dao.game.dispatch('sleep', {}));
    const day = await page.evaluate(() => window.__dao.game.ask('clock').day);
    await page.evaluate(() => window.__dao.shell.set({ modal: null }));
    await page.locator('[data-do="bag"]').click();
    await page.locator('.modal [data-do="saves"]').click();
    const back = page.locator('[data-do="restoreDawn"]');
    assert.deepEqual(await back.allTextContents(), [`第 ${day} 日清早`, `第 ${day - 1} 日清早`]);
    await back.nth(1).click();
    await Promise.all([
      page.waitForEvent('load'),
      page.locator('[data-do="importConfirmed"]').click(),
    ]);
    await page.waitForFunction(() => window.__dao?.world.scene()?.player, null, { timeout: 15000 });
    assert.equal(await page.evaluate(() => window.__dao.game.ask('clock').day), day - 1);
    await page.context().close();

    // —— 两个页面开着同一份进度 ——
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const one = await context.newPage();
    await one.goto(`http://127.0.0.1:${port}/?debug`);
    await one.waitForFunction(() => window.__dao?.world.scene()?.player);
    await one.evaluate(() => window.__dao.game.dispatch('clock.advance', { minutes: 10 }));
    await wait(700);
    const two = await context.newPage();
    await two.goto(`http://127.0.0.1:${port}/?debug`);
    await two.waitForFunction(() => window.__dao?.world.scene()?.player);
    await two.evaluate(() => window.__dao.game.dispatch('clock.advance', { minutes: 30 }));
    await wait(700);
    await one.waitForFunction(() => window.__dao.shell.get().modal?.kind === 'elsewhere');
    const theirs = await savedRevision(one);
    await one.evaluate(() => window.__dao.game.dispatch('clock.advance', { minutes: 10 }));
    await wait(700);
    assert.equal(await savedRevision(one), theirs, '让出去的页面不该再覆盖存档');
    await context.close();
  } finally {
    server.close();
    await browser.close();
  }
});
