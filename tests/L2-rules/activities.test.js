import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, must, wait, stored, carried, growOne, FIELD } from '../helpers.js';
import { createGame } from '../../src/port/game.js';
const at = { x: 35, y: 17 };
const bench = { x: 5, y: 12 };
test('溪边采集每天两次，远处拒绝，拿来的食材能煮成饭', () => {
  const g = newGame();
  assert.equal(g.dispatch('gather', { id: 'forage' }).ok, false);
  must(g, 'gather', { id: 'forage', at });
  must(g, 'gather', { id: 'forage', at });
  const before = g.save();
  assert.match(g.dispatch('gather', { id: 'forage', at }).reason, /今天/);
  assert.deepEqual(g.save(), before);
  const ingredient = g.ask('pack').items.find(i => i.cook).id;
  must(g, 'cook', { items: [ingredient], method: 'stew', at: { x: 10, y: 11 } });
  must(g, 'dish.eat', {
    id: g.ask('kitchen', { x: 10, y: 11 }).dishes[0].id,
    at: { x: 10, y: 11 },
  });
  must(g, 'sleep');
  assert.equal(g.ask('outings', 'forage', at).options[0].left, 2);
});
test('林边捡柴、砍木回家劈柴；竹篾编篮；鸡窝按户喂养产蛋', () => {
  const g = newGame();
  must(g, 'gather', { id: 'sticks', at: { x: 17, y: 7 } });
  must(g, 'gather', { id: 'logs', at: { x: 17, y: 7 } });
  must(g, 'homestead', { id: 'split', at: bench });
  assert.equal(carried(g, 'wood'), 5);
  // 回家放下再出门，给竹篾留空间。
  for (const i of g.ask('pack').items)
    if (i.id !== 'seed.qingcai') must(g, 'pack.take', { item: i.id, n: 'all', at: bench });
  must(g, 'gather', { id: 'bamboo', at: { x: 16, y: 9 } });
  must(g, 'homestead', { id: 'weave', at: bench });
  assert.equal(carried(g, 'basket'), 1);
  const coop = { x: 12, y: 11 };
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
test('钓鱼下竿计次且存档保留结果，反复读档不能重抽；收竿不能重复领鱼', () => {
  const g = newGame(17),
    spot = { x: 37, y: 20 };
  must(g, 'fish.cast', { at: spot });
  const saved = JSON.parse(JSON.stringify(g.save()));
  const replay = createGame({ saved, debug: true });
  const a = g.dispatch('fish.reel', { at: spot, value: 60 }),
    b = replay.dispatch('fish.reel', { at: spot, value: 60 });
  assert.equal(a.ok, true);
  assert.deepEqual(a, b);
  assert.deepEqual(g.save(), replay.save());
  assert.equal(g.dispatch('fish.reel', { at: spot, value: 60 }).ok, false);
  must(g, 'fish.cast', { at: spot });
  must(g, 'fish.reel', { at: spot, value: 0 });
  must(g, 'fish.cast', { at: spot });
  must(g, 'fish.reel', { at: spot, value: 0 });
  assert.equal(g.dispatch('fish.cast', { at: spot }).ok, false);
});
test('时令与雨后限制显示在同一份提示里；背篓、夜晚不能重复领取', () => {
  const g = newGame();
  assert.match(g.ask('outings', 'chestnut', { x: 26, y: 7 }).options[0].reason, /时节/);
  assert.match(g.ask('outings', 'mushroom', { x: 19, y: 8 }).options[0].reason, /雨后/);
  must(g, 'gather', { id: 'bamboo', at: { x: 16, y: 9 } });
  must(g, 'sleep');
  // 找到一个不打雷的日子。
  for (let i = 0; i < 20 && g.ask('weather').tags.includes('storm'); i++) must(g, 'sleep');
  must(g, 'gather', { id: 'bamboo', at: { x: 16, y: 9 } });
  must(g, 'homestead', { id: 'bigbasket', at: bench });
  assert.equal(g.ask('pack').cap, 8);
  assert.equal(g.dispatch('homestead', { id: 'bigbasket', at: bench }).ok, false);
  wait(g, 800);
  must(g, 'homestead', { id: 'stars', at: { x: 5, y: 13 } });
  assert.equal(g.dispatch('homestead', { id: 'stars', at: { x: 5, y: 13 } }).ok, false);
});

test('腌菜确实扣三份菜和一份盐，雨后菌子可采', () => {
  const g = newGame(21);
  growOne(g);
  must(g, 'farm.harvest', FIELD);
  must(g, 'homestead', { id: 'pickle', at: { x: 13, y: 11 } });
  assert.equal(carried(g, 'pickle'), 3);
  assert.equal(stored(g, 'salt'), 3);
  assert.equal(stored(g, 'veg.qingcai') + carried(g, 'veg.qingcai'), 0);
  for (let i = 0; i < 40; i++) {
    const q = g.ask('outings', 'mushroom', { x: 19, y: 8 }).options[0];
    if (!q.reason) {
      must(g, 'gather', { id: 'mushroom', at: { x: 19, y: 8 } });
      assert.ok(carried(g, 'mushroom') >= 2);
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
  const wood = { x: 17, y: 7 };
  assert.match(said('gather', { id: 'sticks', at: wood }, 'forage.finished'), /（柴 ×\d，已收好）/);
  said('gather', { id: 'logs', at: wood }, 'forage.finished');
  assert.match(said('homestead', { id: 'split', at: bench }, 'home.worked'), /咔/);
  assert.match(said('homestead', { id: 'rest', at: { x: 5, y: 13 } }, 'home.worked'), /坐/);
  const spot = { x: 37, y: 20 };
  must(g, 'fish.cast', { at: spot });
  assert.match(
    said('fish.reel', { at: spot, value: 60 }, 'fish.caught', 'fish.missed'),
    /浮漂|钩上/,
  );
  const stove = { x: 10, y: 11 };
  const cook = { items: ['rice'], method: 'stew', at: stove };
  assert.match(said('cook', cook, 'meal.cooked'), /份白粥出锅了。/);
});
