// L3 坏存档：把一份玩过的存档随机弄坏一处，读档只许有两种结果——
// 明确地拒绝（main.js 会因此保护原档、只开临时局），或者读进来以后照常能问、能玩。
// 读进来却一问就出错的，说明某块数据的校验有漏洞：去补那块的 validate。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/port/game.js';
import { createChaos, askEverything } from '../chaos.js';
import { damagedSaves, CLEAN_REFUSAL } from '../damage.js';

test('弄坏的存档：要么说清楚读不了，要么读进来照常能问、能玩', () => {
  const base = createChaos(11, { debug: false }).run(500).game.save();
  const trouble = [];
  let refused = 0;
  for (const { how, path, saved } of damagedSaves(base, 160, 5)) {
    let game;
    try {
      game = createGame({ saved, debug: true });
    } catch (error) {
      if (CLEAN_REFUSAL.test(error.message)) refused++;
      else trouble.push(`${how} @ ${path}：读档时抛出 ${error.message}`);
      continue;
    }
    const failed = askEverything(game);
    if (failed.length) trouble.push(`${how} @ ${path}：读进来了，但 ${failed[0]}`);
    else {
      const c = createChaos(3, { saved }).run(25);
      if (c.errors.length) trouble.push(`${how} @ ${path}：玩起来出错 ${c.errors[0].message}`);
    }
  }
  assert.deepEqual(trouble, []);
  assert.ok(refused > 40, '弄坏的存档几乎都读进来了，弄坏的方式可能失效了');
});

test('每人、每户、每张地图各一份的数据，少了一份或换成别的东西，都读不进来', () => {
  const base = createGame().save();
  const broken = [
    w => delete w.growth.hero,
    w => (w.kitchens = []),
    w => (w.sensations = true),
    w => (w.teaDays = 2.5),
    w => delete w.land.hill,
    w => (w.achievements.stranger = { counts: {}, earned: {} }),
    w => delete w.people.yun,
    w => (w.player.controls = 'shi'),
    w => (w.shops.wares = { market: [] }),
  ];
  for (const breakIt of broken) {
    const saved = JSON.parse(JSON.stringify(base));
    breakIt(saved.state.world);
    assert.throws(() => createGame({ saved }), CLEAN_REFUSAL, String(breakIt));
  }
});
