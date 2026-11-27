import { test } from 'node:test';
import assert from 'node:assert/strict';
import { XP } from '../../src/content/growth.js';
import { newGame, must, bestFire } from '../helpers.js';
import { POT } from '../../src/content/recipes.js';
import { createGame } from '../../src/port/game.js';
import { FIRE } from '../../src/content/cook-fire.js';
const at = { x: 10, y: 11, dir: 'up' };
const meal = { items: ['potato', 'bean'], method: 'stew', at };
test('0.12菜谱对照：蛋炒饭、土豆炖豆子、香草烤土豆的名称与性味', () => {
  const g = newGame();
  for (const [items, method, name, buff] of [
    [['rice', 'egg'], 'fry', '蛋炒饭', 'hearty'],
    [['potato', 'bean'], 'stew', '土豆炖豆子', 'hearty'],
    [['potato', 'herb'], 'roast', '香草烤土豆', 'fresh'],
  ]) {
    const p = g.ask('cook.preview', { items, method });
    assert.equal(p.base, name);
    assert.equal(p.buff, buff);
  }
});
test('预览和实际出锅一致，吃饭恢复饱腹，菜谱留在户里', () => {
  const g = newGame();
  const p = g.ask('cook.preview', meal);
  assert.equal(p.ok, true);
  must(g, 'cook', meal);
  const k = g.ask('kitchen', at);
  assert.equal(k.dishes.length, p.servings);
  const d = k.dishes[0];
  for (const key of ['full', 'energy', 'buff', 'uses', 'name', 'water'])
    assert.equal(d[key], p[key]);
  assert.ok(k.recipes.find(r => r.name === p.base).known);
  const hunger = g.ask('body').hunger;
  must(g, 'dish.eat', { id: d.id, at });
  assert.ok(g.ask('body').hunger > hunger);
  const saved = JSON.parse(JSON.stringify(g.save()));
  assert.deepEqual(createGame({ saved, debug: true }).save(), g.save());
});
test('缺材料、隔空做饭、无柴与生拌鸡蛋拒绝并整笔回滚', () => {
  const g = newGame();
  for (const input of [
    { ...meal, at: { x: 20, y: 15 } },
    { ...meal, items: ['fish'] },
    { ...meal, items: ['egg'], method: 'mix' },
  ]) {
    const before = g.save();
    assert.equal(g.dispatch('cook', input).ok, false);
    assert.deepEqual(g.save(), before);
  }
  must(g, 'pack.put', { item: 'wood', n: 'all', at });
  // 将柴带到田里，家里的人之外不能隔空够到；份数不足也不能扣掉其余材料。
  assert.equal(g.dispatch('cook', { ...meal, items: ['rice', 'rice'] }).ok, false);
});
test('端汤占两格；满了回滚；带出去可吃可送并收到回礼', () => {
  const g = newGame();
  must(g, 'cook', meal);
  const d = g.ask('kitchen', at).dishes[0];
  const used = g.ask('pack').used;
  must(g, 'dish.pack', { id: d.id, at });
  assert.equal(g.ask('pack').used, used + 2);
  must(g, 'dish.store', { id: d.id, at });
  assert.equal(g.ask('pack').used, used);
  must(g, 'dish.pack', { id: d.id, at });
  // 土豆炖豆子正是石伯最爱吃的那一道：熟悉 +4，他说的是那句“炖得好”，也记下了他爱吃这个
  const given = g
    .dispatch('gift', { to: 'shi', dish: d.id, at: { x: 20, y: 15 } })
    .facts.find(f => f.type === 'gift.given').data;
  assert.equal(given.favorite, true);
  assert.match(given.line, /炖得好/);
  assert.equal(g.ask('pack').dishes.length, 0);
  assert.equal(g.ask('bonds').find(b => b.id === 'shi').known, 4);
  assert.equal(g.ask('bonds').find(b => b.id === 'shi').favorite, '土豆炖豆子');
  must(g, 'sleep');
  assert.ok(g.ask('notes').some(n => n.title.includes('回礼')));
});

test('柴用尽不扣食材，汤菜装不下也不从灶台消失', () => {
  const g = newGame();
  for (const item of ['rice', 'egg', 'potato', 'bean'])
    must(g, 'cook', { items: [item], method: 'stew', at });
  const before = g.save();
  assert.match(g.dispatch('cook', { items: ['rice'], method: 'stew', at }).reason, /柴/);
  assert.deepEqual(g.save(), before);
  const dishes = g.ask('kitchen', at).dishes;
  must(g, 'dish.pack', { id: dishes[0].id, at });
  must(g, 'dish.pack', { id: dishes[1].id, at });
  const packed = g.save();
  assert.match(g.dispatch('dish.pack', { id: dishes[2].id, at }).reason, /行囊满/);
  assert.deepEqual(g.save(), packed);
});

test('刀工与黄酒沿用0.12：匹配切法饱腹加二、火候放宽，切丝多耗体力并长厨艺', () => {
  const g = newGame();
  const base = g.ask('cook.preview', { items: ['potato'], method: 'fry' });
  const shred = g.ask('cook.preview', { items: ['potato'], method: 'fry', cut: 'shred' });
  const chunk = g.ask('cook.preview', { items: ['potato'], method: 'fry', cut: 'chunk' });
  assert.equal(shred.full, base.full + 2);
  assert.equal(shred.fire.bonus, base.fire.bonus + 3);
  assert.equal(chunk.fire.bonus, base.fire.bonus - 3);
  // 放宽落在这一锅的节拍上：下料那一段宽三截，切块窄三截
  assert.equal(shred.plan.smokeLong, base.plan.smokeLong + 3 * FIRE.widen);
  assert.equal(chunk.plan.smokeLong, base.plan.smokeLong - 3 * FIRE.widen);
  const fish = g.ask('cook.preview', { items: ['fish'], method: 'stew' });
  const wine = g.ask('cook.preview', { items: ['fish'], method: 'stew', spices: ['wine'] });
  assert.equal(wine.fire.bonus, fish.fire.bonus + 3);
  assert.ok(wine.plan.band[1] - wine.plan.band[0] > fish.plan.band[1] - fish.plan.band[0]);
  const plain = newGame();
  must(plain, 'cook', { items: ['potato'], method: 'fry', at });
  must(g, 'cook', { items: ['potato'], method: 'fry', cut: 'shred', at });
  assert.equal(g.ask('hero').energy, plain.ask('hero').energy - 1);
  const skill = game => game.ask('growth').skills.find(s => s.id === 'cook');
  assert.equal(skill(g).xp, skill(plain).xp + XP.cook.shred * XP.rate.cook);
  assert.equal(g.ask('kitchen', at).dishes[0].cut, 'shred');
  const saved = JSON.parse(JSON.stringify(g.save()));
  assert.deepEqual(createGame({ saved, debug: true }).save(), g.save());
  const before = g.save();
  assert.equal(g.dispatch('cook', { ...meal, cut: '不存在' }).ok, false);
  assert.deepEqual(g.save(), before);
});

test('饱腹守恒：一锅的饱腹是下锅食材加起来再分份，多放几样不会凭空多出粮食；每份有上限', () => {
  const g = newGame();
  const one = g.ask('cook.preview', { items: ['potato'], method: 'stew' });
  const two = g.ask('cook.preview', { items: ['potato', 'bean'], method: 'stew' });
  const three = g.ask('cook.preview', { items: ['potato', 'bean', 'rice'], method: 'stew' });
  assert.deepEqual([one.servings, two.servings, three.servings], [1, 1, 2]);
  // 土豆 14、豆子、米 16：三样一锅的总饱腹不超过三样各自做的加起来
  const solo = ['bean', 'rice'].map(
    k => g.ask('cook.preview', { items: [k], method: 'stew' }).full,
  );
  // 当季多一成是整锅算的（土豆当季，三样一锅都沾光）
  assert.ok(three.full * three.servings <= Math.ceil((one.full + solo[0] + solo[1]) * 1.1));
  assert.ok(three.full <= POT.cap);
});

test('调料管滋味：照菜谱、对路的调料加分，不对路的扣分；三分的菜多管一回、心情好', () => {
  const g = newGame();
  const stars = p => p.notes.find(n => n.startsWith('滋味'));
  const plain = g.ask('cook.preview', { items: ['potato'], method: 'fry' });
  const sour = g.ask('cook.preview', {
    items: ['potato'],
    method: 'fry',
    spices: ['vinegar', 'chili'],
  });
  const wine = g.ask('cook.preview', { items: ['potato'], method: 'fry', spices: ['wine'] });
  assert.equal(sour.base, '酸辣土豆丝');
  assert.ok(sour.flavor > plain.flavor, stars(sour));
  assert.ok(wine.flavor <= plain.flavor, '黄酒炒土豆不对路');
  assert.match(stars(wine), /黄酒放得不对路/);
  assert.equal(plain.full, sour.full, '调料不加分量');
  assert.equal(sour.flavor, 3);
  assert.ok(sour.uses > plain.uses, '三分的菜增益多管一回');
});

test('吃腻了：最近几顿同一道菜吃得越多，饱腹越打折、心情越差；换着吃不亏', () => {
  const g = newGame();
  const eaten = [];
  g.on('meal.eaten', e => eaten.push(e.data.tired));
  for (let i = 0; i < 3; i++) must(g, 'cook', { items: ['rice'], method: 'stew', at });
  must(g, 'cook', { items: ['veg.qingcai'], method: 'stew', at });
  const gains = [];
  for (const d of [...g.ask('kitchen', at).dishes]) {
    const hungry = g.ask('body').hunger;
    must(g, 'dish.eat', { id: d.id, at });
    gains.push(g.ask('body').hunger - hungry);
    must(g, 'sleep');
  }
  assert.deepEqual(eaten, ['', '又是这个', '有点吃腻了', ''], '换一道菜就不腻');
  assert.ok(gains[0] > gains[1] && gains[1] > gains[2], gains.join(','));
});
