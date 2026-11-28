import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newGame,
  must,
  wait,
  stored,
  carried,
  growOne,
  fishOnce,
  FIELD,
  BENCH,
  STOVE,
  WORKBENCH,
  COOP,
  WOOD,
  near,
  travel,
  fetchBamboo,
} from '../helpers.js';
import { createGame } from '../../src/port/game.js';
const at = { x: 35, y: 17 };
const bench = WORKBENCH;
test('溪边采集每天两次，远处拒绝，拿来的食材能煮成饭', () => {
  const g = newGame();
  assert.equal(g.dispatch('gather', { id: 'forage' }).ok, false);
  must(g, 'gather', { id: 'forage', at });
  must(g, 'gather', { id: 'forage', at });
  const before = g.save();
  assert.match(g.dispatch('gather', { id: 'forage', at }).reason, /今天/);
  assert.deepEqual(g.save(), before);
  const ingredient = g.ask('pack').items.find(i => i.cook).id;
  must(g, 'cook', { items: [ingredient], method: 'stew', at: STOVE });
  must(g, 'dish.eat', {
    id: g.ask('kitchen', STOVE).dishes[0].id,
    at: STOVE,
  });
  must(g, 'sleep');
  assert.equal(g.ask('outings', 'forage', at).options[0].left, 2);
});
test('林边捡柴、砍木回家劈柴；竹篾编篮；鸡窝按户喂养产蛋', () => {
  const g = newGame();
  must(g, 'gather', { id: 'sticks', at: WOOD });
  must(g, 'gather', { id: 'logs', at: WOOD });
  must(g, 'homestead', { id: 'split', at: bench });
  assert.equal(carried(g, 'wood'), 5);
  // 回家放下再出门，给竹篾留空间。
  for (const i of g.ask('pack').items)
    if (i.id !== 'seed.qingcai') must(g, 'pack.take', { item: i.id, n: 'all', at: bench });
  fetchBamboo(g);
  must(g, 'homestead', { id: 'weave', at: bench });
  assert.equal(carried(g, 'basket'), 1);
  const coop = COOP;
  must(g, 'homestead', { id: 'buildCoop', at: coop });
  must(g, 'homestead', { id: 'buyHen', at: coop });
  must(g, 'homestead', { id: 'feedHens', at: coop });
  assert.match(g.dispatch('homestead', { id: 'feedHens', at: coop }).reason, /喂过/);
  for (let i = 0; i < 8; i++) {
    must(g, 'sleep');
    if (g.ask('homestead', 'coop').eggs) break;
  }
  assert.ok(g.ask('homestead', 'coop').eggs > 0);
  must(g, 'homestead', { id: 'eggs', at: coop });
  assert.equal(g.ask('homestead', 'coop').eggs, 0);
});
test('时令与雨后限制显示在同一份提示里；背篓、夜晚不能重复领取', () => {
  const g = newGame();
  travel(g, 'creek');
  travel(g, 'hill');
  assert.match(g.ask('outings', 'chestnut', near('hill', 'chestnut')).options[0].reason, /时节/);
  assert.match(g.ask('outings', 'mushroom', near('hill', 'mushroom')).options[0].reason, /雨后/);
  travel(g, 'creek');
  must(g, 'gather', { id: 'bamboo', at: near('creek', 'bamboo') });
  travel(g, 'yard');
  must(g, 'sleep');
  // 找到一个不打雷的日子。
  for (let i = 0; i < 20 && g.ask('weather').tags.includes('storm'); i++) must(g, 'sleep');
  fetchBamboo(g);
  must(g, 'homestead', { id: 'bigbasket', at: bench });
  assert.equal(g.ask('pack').cap, 8);
  assert.equal(g.dispatch('homestead', { id: 'bigbasket', at: bench }).ok, false);
  wait(g, 800);
  must(g, 'homestead', { id: 'stars', at: BENCH });
  assert.equal(g.dispatch('homestead', { id: 'stars', at: BENCH }).ok, false);
});

test('腌菜确实扣三份菜和一份盐，雨后菌子可采', () => {
  const g = newGame(22);
  growOne(g);
  must(g, 'farm.harvest', FIELD);
  must(g, 'homestead', { id: 'pickle', at: near('yard', 'pickle') });
  assert.equal(carried(g, 'pickle'), 3);
  assert.equal(stored(g, 'salt'), 3);
  assert.equal(stored(g, 'veg.qingcai') + carried(g, 'veg.qingcai'), 0);
  travel(g, 'creek');
  travel(g, 'hill');
  const shrooms = near('hill', 'mushroom');
  for (let i = 0; i < 40; i++) {
    const q = g.ask('outings', 'mushroom', shrooms).options[0];
    if (!q.reason) {
      must(g, 'gather', { id: 'mushroom', at: shrooms });
      assert.ok(
        carried(g, 'mushroom') + carried(g, 'mushroom.fine') >= 2,
        '采到的菌子（可能是极品）',
      );
      return;
    }
    must(g, 'sleep');
  }
  assert.fail('40天内应该有能采菌子的雨后');
});

test('做完的事带着给玩家看的那段话：找到什么、劈柴、歇脚、钓没钓到、出锅', () => {
  const g = newGame();
  // 发一条必须成功的命令，拿它某一种事实里的那段话。
  const said = (type, input, ...facts) => {
    const out = g.dispatch(type, input);
    assert.equal(out.ok, true, `${type} 应该成功：${out.reason}`);
    return out.facts.find(f => facts.includes(f.type)).data.line;
  };
  assert.match(said('gather', { id: 'forage', at }, 'forage.finished'), /已收好）$/);
  const wood = WOOD;
  assert.match(said('gather', { id: 'sticks', at: wood }, 'forage.finished'), /（柴 ×\d，已收好）/);
  said('gather', { id: 'logs', at: wood }, 'forage.finished');
  assert.match(said('homestead', { id: 'split', at: bench }, 'home.worked'), /咔/);
  assert.match(said('homestead', { id: 'rest', at: BENCH }, 'home.worked'), /坐/);
  // 钓鱼：钓没钓上，那段话都在事实里（细的在 L2 钓鱼那一组）
  const out = fishOnce(g);
  const fished = out.facts.find(f => f.type.startsWith('fish.')).data.line;
  assert.match(fished, /鱼|浮漂|钩|饵/);
  const cook = { items: ['rice'], method: 'stew', at: STOVE };
  assert.match(said('cook', cook, 'meal.cooked'), /份白粥出锅了。/);
});
test('清早便条多三样：夜里刚熟的菜、鸡窝里的蛋、清早哪儿鱼口好', () => {
  const g = newGame(3);
  growOne(g);
  const text = () =>
    g
      .ask('notes')
      .filter(n => n.title === '院里院外')
      .map(n => n.text)
      .join('');
  assert.match(text(), /熟了1畦/);
  assert.match(text(), /鱼口好/);
  const coop = COOP;
  fetchBamboo(g);
  must(g, 'homestead', { id: 'buildCoop', at: coop });
  must(g, 'homestead', { id: 'buyHen', at: coop });
  for (let i = 0; i < 8 && !g.ask('homestead', 'coop').eggs; i++) must(g, 'sleep');
  assert.match(text(), /鸡窝里有\d+个蛋/);
});
