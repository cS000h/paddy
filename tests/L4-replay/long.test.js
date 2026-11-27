// L4 长局（慢）：一局玩一年多。日子长了才会露头的毛病——数到上限、列表越攒越长、
// 某个季节才走到的分支出错、存档越来越大——在这里抓。快测试里的乱玩只玩到开春几天。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/port/game.js';
import { createChaos, askEverything } from '../chaos.js';
import { bestFire } from '../helpers.js';

const show = errors =>
  errors
    .slice(0, 5)
    .map(e => `${e.type}: ${e.message}`)
    .join('\n');

test('玩过一年多：不出错、不卡住，存档不走样，也不会越存越大；每条命令都做成过', () => {
  const done = {};
  for (const seed of [21, 22]) {
    const c = createChaos(seed, { debug: false });
    const seasons = new Set();
    let biggest = 0;
    for (let i = 0; i < 6000; i += 500) {
      c.run(500);
      seasons.add(c.game.ask('clock').season);
      assert.deepEqual(askEverything(c.game), [], `第 ${seed} 局第 ${i + 500} 步`);
      const text = JSON.stringify(c.game.save());
      biggest = Math.max(biggest, text.length);
      const back = createGame({ saved: JSON.parse(text) });
      assert.equal(JSON.stringify(back.save()), text, '存档往返走样了');
      assert.ok(back.dispatch('sleep', {}).ok, `第 ${seed} 局第 ${i + 500} 步之后睡不下`);
    }
    assert.deepEqual(c.errors, [], show(c.errors));
    assert.ok(c.game.ask('clock').day > 100, '一局应该玩过一百天');
    assert.equal(seasons.size, 4, '四个季节都该走到');
    // 灶台最多 40 份饭、菜地格数有限，存档该有个顶；超过这个数，多半是哪里只进不出
    assert.ok(biggest < 60000, `存档长到了 ${biggest} 字`);
    for (const [type, t] of Object.entries(c.tally)) done[type] = (done[type] || 0) + t.ok;
  }
  // 能摆、能放生的彩头太稀罕，一年也未必碰上一样：从行囊和家里都放着几样的存档接着乱玩一阵
  // （乱玩的人见了就卖、就送、就往篮里放，只放一个转眼就没了）
  // 比完鱼第二天钓客上门、院门口聚着闻香来的人也难碰上：睡到第二天清早，昨天算比过一场，
  // 再在灶上做一锅拿手的极品蛋炒饭
  const first = structuredClone(createGame({ seed: 24 }).save());
  Object.assign(first.state.world.people.hero, { map: 'yard', x: 10, y: 11, dir: 'up' });
  first.state.world.packs.hero.items['egg.fine'] = 1;
  const cook = createGame({ saved: first });
  assert.ok(cook.dispatch('sleep', {}).ok);
  const meal = { items: ['rice', 'egg.fine'], method: 'fry' };
  const at = { x: 10, y: 11, dir: 'up' };
  assert.ok(cook.dispatch('cook', { ...meal, log: bestFire(cook, meal), at }).ok);
  const save = structuredClone(cook.save());
  save.state.world.match.echo = {
    day: 1,
    host: 'he',
    result: 'win',
    seen: [],
    rumor: null,
    how: null,
  };
  const prizes = { 'prize.pumpkinKing': 5, 'prize.doubleYolkEgg': 5, 'prize.goldenRedCarp': 5 };
  Object.assign(save.state.world.packs.hero.items, prizes);
  Object.assign(save.state.world.households.home.items, prizes);
  // 修院子的材料也难攒齐：家里放够修院角彩头台的（不用检定）
  Object.assign(save.state.world.households.home.items, { pebble: 4, straw: 8 });
  // 心烦满了、憋着没挑毛病的样子也难碰上：一并放进去
  save.state.world.persona.hero.stress = 100;
  save.state.world.vexes.hero.snap = ['drink', 'spree', 'recluse'];
  // 大成的称号也要玩上大半年：放一个已经挣到的
  save.state.world.achievements.hero.earned['book.grades'] = 1;
  const lucky = createChaos(24, { debug: false, saved: save }).run(1500);
  assert.deepEqual(lucky.errors, [], show(lucky.errors));
  for (const [type, t] of Object.entries(lucky.tally)) done[type] = (done[type] || 0) + t.ok;
  // 以后加了命令，乱玩的人不会用，这里就提醒去 tests/chaos.js 里教它
  const never = createGame()
    .commands()
    .filter(type => !done[type]);
  assert.deepEqual(never, [], '这些命令乱玩时一次都没做成，在 tests/chaos.js 里教它怎么做');
});

test('开着写入检查玩到中期：没有哪个插件改了没登记的数据', () => {
  const c = createChaos(23).run(2500);
  assert.deepEqual(c.errors, [], show(c.errors));
  assert.ok(c.game.ask('clock').day > 30);
});
