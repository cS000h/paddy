// L2 规则：饭桌（第 5 步）。热菜端在手上、摆上屋里饭桌、坐下按整桌吃；在外头不能吃，能送人、
// 端给过客、院门口分尝；能随手吃的照旧进行囊；旧档行囊里的热饭照旧能吃。一锅拨几份，碗盘吃完要洗，
// 剩菜照出锅那天算两天馊。一律通过端口发命令。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newGame,
  must,
  refused,
  stocked,
  travel,
  dine,
  bestFire,
  wares,
  STOVE,
  TABLE,
  VAT,
} from '../helpers.js';
import { createGame } from '../../src/port/game.js';
import { RECIPES } from '../../src/content/recipes.js';
import { HANDHELD, TABLE_LINES } from '../../src/content/table.js';

const at = STOVE;
const OUT = { x: 20, y: 15 };
const eaten = out => out.facts.find(f => f.type === 'meal.eaten').data;
const reload = g => createGame({ saved: JSON.parse(JSON.stringify(g.save())), debug: true });

test('第一天不买东西：用开局的米和柴煮一碗白粥，端进屋摆上桌坐下吃；吃完还能再煮一碗', () => {
  const g = newGame();
  must(g, 'cook', { items: ['rice'], method: 'stew', at });
  const id = g.ask('kitchen', at).dishes[0].id;
  assert.equal(refused(g, 'dish.eat', { id, at }), TABLE_LINES.outside.soup);
  must(g, 'dish.carry', { id, at });
  assert.equal(g.ask('kitchen', at).dishes.length, 0);
  assert.deepEqual(
    g.ask('table').hands.map(d => d.id),
    [id],
  );
  travel(g, 'cottage');
  assert.equal(refused(g, 'dish.set', { at: { x: 8, y: 11, dir: 'up' } }), TABLE_LINES.where);
  assert.equal(refused(g, 'dish.eat', { id, at: TABLE }), TABLE_LINES.where, '屋里也得先放桌上');
  const set = g.dispatch('dish.set', { at: TABLE });
  assert.equal(set.facts.find(f => f.type === 'dish.set').data.line, TABLE_LINES.set[0]);
  assert.equal(refused(g, 'dish.set', { at: TABLE }), TABLE_LINES.nothing);
  const hunger = g.ask('body').hunger;
  const meal = eaten(g.dispatch('table.eat', { at: TABLE }));
  assert.equal(meal.line, TABLE_LINES.meal.one);
  assert.equal(meal.courses.length, 1);
  assert.ok(g.ask('body').hunger > hunger);
  assert.equal(refused(g, 'table.eat', { at: TABLE }), TABLE_LINES.empty);
  // 只有一只海碗：吃完的脏着搁在桌上，再煮一碗盛不走；收碗、到水缸边洗了才行
  assert.deepEqual(g.ask('table').ware.dirty, { bowl: 1, plate: 0 });
  travel(g, 'yard');
  must(g, 'cook', { items: ['rice'], method: 'stew', at });
  const second = g.ask('kitchen', at).dishes[0].id;
  assert.equal(refused(g, 'dish.carry', { id: second, at }), TABLE_LINES.noWare.bowl);
  assert.equal(refused(g, 'dish.wash', { at: VAT }), TABLE_LINES.noStack);
  travel(g, 'cottage');
  const cleared = g.dispatch('dish.clear', { at: TABLE });
  assert.equal(cleared.facts.find(f => f.type === 'dish.cleared').data.bowl, 1);
  assert.equal(refused(g, 'dish.clear', { at: TABLE }), TABLE_LINES.noDirty);
  travel(g, 'yard');
  assert.equal(refused(g, 'dish.carry', { id: second, at }), TABLE_LINES.stack, '抱着脏碗腾不出手');
  const washed = g.dispatch('dish.wash', { at: VAT });
  assert.ok(Object.values(TABLE_LINES.wash).includes(washed.facts.at(-1).data.line));
  assert.equal(g.ask('table').ware.clean.bowl, 1);
  dine(g, [second]);
});

test('一锅拨几份：大铁锅拨二到四份，整锅饱腹体力不多不少按整数分；增益只跟着头一份', () => {
  const g = stocked(newGame(), { rice: 4, pork: 2, wood: 4 });
  const pot = { items: ['rice', 'pork', 'egg'], method: 'stew' };
  const total = n => {
    const p = g.ask('cook.preview', { ...pot, servings: n });
    return [p.shares.reduce((a, s) => a + s.full, 0), p.shares.reduce((a, s) => a + s.energy, 0)];
  };
  const base = total(undefined);
  for (const n of [1, 2, 3, 4]) {
    const p = g.ask('cook.preview', { ...pot, servings: n });
    assert.equal(p.shares.length, n);
    if (n > 1) assert.deepEqual(total(n), base, `拨 ${n} 份，一锅的总数不变`);
    const fulls = p.shares.map(s => s.full);
    assert.ok(Math.max(...fulls) - Math.min(...fulls) <= 1, '余数从头一份起各多一点');
  }
  assert.match(
    g.ask('cook.preview', { items: ['egg'], method: 'stew', servings: 4 }).reason,
    /拨不出/,
  );
  const out = g.dispatch('cook', { ...pot, servings: 3, at });
  const cooked = out.facts.find(f => f.type === 'meal.cooked').data;
  assert.equal(cooked.portions, 3);
  assert.equal(cooked.servings, 2, '「做满 30 份」照粮食算，拨小份不多算');
  const [a, b] = g.ask('kitchen', at).dishes;
  assert.equal(dine(g, [a.id]).buff, a.buff, '头一份带着这一锅的增益');
  assert.equal(dine(g, [b.id]).buff, null, '同一锅的第二份不再给一回');
});

test('剩菜照出锅那天算：第二天还能吃，第三天清早馊掉倒了，盛着的碗盘脏着', () => {
  const g = stocked(newGame(), { rice: 2, wood: 2 });
  must(g, 'cook', { items: ['rice'], method: 'stew', at });
  must(g, 'cook', { items: ['rice'], method: 'fry', at });
  const [soup, fried] = g.ask('kitchen', at).dishes;
  must(g, 'dish.carry', { id: fried.id, at });
  travel(g, 'cottage');
  must(g, 'dish.set', { at: TABLE });
  must(g, 'sleep');
  assert.equal(g.ask('table').dishes.length, 1, '隔夜的还在桌上');
  travel(g, 'yard');
  assert.equal(g.ask('kitchen', at).dishes.length, 1, '隔夜的还在锅里');
  const spoiled = [];
  g.on('dish.spoiled', e => spoiled.push(...e.data.names));
  must(g, 'sleep');
  assert.deepEqual(spoiled.sort(), [soup.name, fried.name].sort());
  assert.equal(g.ask('kitchen', at).dishes.length, 0);
  assert.equal(g.ask('table').dishes.length, 0);
  assert.deepEqual(g.ask('table').ware.dirty, { bowl: 0, plate: 1 }, '桌上那只盘子脏着');
  assert.deepEqual(reload(g).save(), g.save());
});

test('一桌几样：手上一次端一样，桌上摆四样；坐下按一顿算，几样各记头一回吃到，旁白看搭配', () => {
  // 摆满一桌四碗粥，得多添几只海碗
  const g = wares(stocked(newGame(), { pork: 1, 'veg.qingcai': 1, rice: 3, wood: 4 }), { bowl: 4 });
  const cook = items => must(g, 'cook', { ...items, at }) && g.ask('kitchen', at).dishes.at(-1).id;
  const soup = cook({ items: ['pork'], method: 'stew' });
  const egg = cook({ items: ['egg'], method: 'fry' });
  const veg = cook({ items: ['veg.qingcai'], method: 'fry' });
  must(g, 'dish.carry', { id: soup, at });
  assert.equal(refused(g, 'dish.carry', { id: egg, at }), TABLE_LINES.hands);
  must(g, 'dish.store', { id: soup, at });

  const meals = [];
  const fresh = [];
  g.on('meal.eaten', e => meals.push(e.data));
  g.on('diet.ate', e => fresh.push(e.data.fresh));
  const meal = dine(g, [soup, egg, veg]);
  assert.equal(meals.length, 1, '一桌三样只算一顿');
  assert.equal(meal.line, TABLE_LINES.meal.full, '有荤有素有汤');
  assert.deepEqual(
    meal.courses.map(c => c.base),
    ['肉片汤', '炒鸡蛋', '清炒时蔬'],
  );
  assert.ok(meal.items.includes('pork') && meal.items.includes('veg.qingcai'));
  assert.deepEqual(fresh, [true]);

  // 摆满四样，第五样放不下；桌上的能端回手上
  for (let i = 0; i < 5; i++) cook({ items: ['rice'], method: 'stew' });
  const five = g.ask('kitchen', at).dishes.map(d => d.id);
  for (const id of five.slice(0, 4)) {
    must(g, 'dish.carry', { id, at });
    travel(g, 'cottage');
    must(g, 'dish.set', { at: TABLE });
    travel(g, 'yard');
  }
  must(g, 'dish.carry', { id: five[4], at });
  travel(g, 'cottage');
  assert.equal(refused(g, 'dish.set', { at: TABLE }), TABLE_LINES.full);
  assert.match(refused(g, 'dish.store', { id: five[4], at: TABLE }), /灶/, '灶台在院里');
  assert.equal(refused(g, 'dish.lift', { id: five[0], at: TABLE }), TABLE_LINES.hands);
});

test('能随手吃的（烤栗子、姜茶……）照旧装进行囊；烤鱼、炒菜、汤得上桌，在外头说一句为什么', () => {
  for (const name of HANDHELD)
    assert.ok(
      RECIPES.some(r => r[0] === name),
      name + ' 是游戏里有的菜',
    );
  const g = stocked(newGame(), { chestnut: 1, fish: 1 });
  must(g, 'cook', { items: ['chestnut'], method: 'roast', at });
  must(g, 'cook', { items: ['fish'], method: 'roast', at });
  const [nut, fish] = g.ask('kitchen', at).dishes;
  assert.equal(nut.base, '烤栗子');
  must(g, 'dish.pack', { id: nut.id, at });
  assert.equal(refused(g, 'dish.pack', { id: fish.id, at }), TABLE_LINES.pack);
  must(g, 'dish.carry', { id: fish.id, at });
  assert.equal(refused(g, 'dish.eat', { id: fish.id, at: OUT }), TABLE_LINES.outside.plate);
  must(g, 'dish.eat', { id: nut.id, at: OUT });
});

test('旧档行囊里本来装着的热饭照旧哪儿都能吃；手上、桌上的菜存读档不变', () => {
  const g = newGame();
  must(g, 'cook', { items: ['rice'], method: 'stew', at });
  must(g, 'cook', { items: ['egg'], method: 'fry', at });
  must(g, 'cook', { items: ['potato'], method: 'stew', at });
  // 存档里把一碗白粥挪进行囊：升级前装进去的热饭就是这样
  const saved = JSON.parse(JSON.stringify(g.save()));
  const w = saved.state.world;
  const old = w.kitchens.home.dishes.shift();
  w.packs.hero.dishes.push(old);
  const h = createGame({ saved, debug: true });
  must(h, 'dish.eat', { id: old.id, at: OUT });

  const [egg, potato] = h.ask('kitchen', at).dishes;
  must(h, 'dish.carry', { id: egg.id, at });
  travel(h, 'cottage');
  must(h, 'dish.set', { at: TABLE });
  travel(h, 'yard');
  must(h, 'dish.carry', { id: potato.id, at });
  const back = reload(h);
  assert.deepEqual(back.save(), h.save());
  assert.deepEqual(
    back.ask('table').dishes.map(d => d.id),
    [egg.id],
  );
  assert.deepEqual(
    back.ask('table').hands.map(d => d.id),
    [potato.id],
  );
});

test('桌上、手上的菜，院门口照样能给闻香来的人盛一碗', () => {
  const saved = JSON.parse(JSON.stringify(newGame(1).save()));
  const items = saved.state.world.packs.hero.items;
  items['egg.fine'] = 1;
  delete items.egg;
  const g = createGame({ saved, debug: true });
  const meal = { items: ['rice', 'egg.fine'], method: 'fry' };
  const out = g.dispatch('cook', { ...meal, log: bestFire(g, meal), at });
  const who = out.facts.find(f => f.type === 'aroma.spread')?.data.who;
  assert.ok(who?.length, '拿手又用了极品料，有人闻香来');
  const id = out.facts.find(f => f.type === 'meal.cooked').data.ids[0];
  must(g, 'dish.carry', { id, at });
  travel(g, 'cottage');
  must(g, 'dish.set', { at: TABLE });
  travel(g, 'yard');
  must(g, 'aroma.serve', { how: 'one', to: who[0], at: { x: 8, y: 14, dir: 'down' } });
  assert.equal(g.ask('table').dishes.length, 0, '从桌上端去门口盛给他了');
});
