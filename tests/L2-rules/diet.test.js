import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, must, settle, stocked, STOVE, dine } from '../helpers.js';
import { DIET_LINES, DRY_GONE, GIFT_TASTE } from '../../src/content/diet.js';

const at = STOVE;
const states = g => g.ask('diet').states.map(s => s.name);
const eat = (g, item) => must(g, 'eat', { item, at });

test('膳食结构：四类都沾到气色好；一类连着四天没沾出小毛病（开局头几天不算）；嘴燥吃个果子就消', () => {
  let g = newGame();
  settle(g);
  g = stocked(g, { cake: 20, wildPeach: 20, cucumber: 20, tofu: 20 });
  const changed = [];
  g.on('diet.changed', e => changed.push(...e.data.got.map(x => x.id)));
  for (const item of ['cake', 'wildPeach', 'cucumber', 'tofu']) eat(g, item);
  assert.deepEqual(g.ask('diet').days.at(-1), { day: 1, grain: 1, veg: 1, meat: 1, fruit: 1 });
  must(g, 'sleep');
  assert.deepEqual(states(g), ['气色好']);
  assert.deepEqual(changed, ['diet_well']);
  assert.ok(g.ask('modifiers').list.some(m => m.id === 'diet_well'));
  // 往后只吃谷、荤：第 5 天清早还不算缺（头 4 天），第 6 天清早上火、嘴燥
  for (let day = 2; day <= 5; day++) {
    eat(g, 'cake');
    eat(g, 'tofu');
    must(g, 'sleep');
    if (day === 4) assert.ok(!states(g).includes('上火'), '开局头几天不算缺');
  }
  assert.ok(states(g).includes('上火') && states(g).includes('嘴燥'), states(g).join());
  assert.ok(!states(g).includes('气色好'));
  assert.ok(changed.includes('diet_fire') && changed.includes('diet_dry'));
  assert.ok(DIET_LINES.diet_fire);
  const lines = [];
  g.on('diet.ate', e => lines.push(e.data.line));
  eat(g, 'wildPeach');
  assert.ok(!states(g).includes('嘴燥'), '吃到果就消');
  assert.ok(lines.some(l => l.includes(DRY_GONE)));
});

test('口味：主角的口味照性情和出身线来，吃到合口心情好；送饭送到忌口，对方不领情', () => {
  let g = newGame();
  // 家里老辈行船（沉稳：清淡），自己热络（嗜辣），旧镰（农桑庄户：重口）
  settle(g);
  assert.deepEqual(g.ask('diet').palate, { likes: ['清淡', '嗜辣', '重口'], dislikes: [] });
  g = stocked(g, { tofu: 2, fish: 1, wood: 2 });
  const ate = [];
  g.on('diet.ate', e => ate.push(e.data));
  const mood = g.ask('body').mood;
  eat(g, 'tofu');
  assert.ok(ate[0].liked.includes('清淡'));
  assert.ok(g.ask('body').mood > mood);
  // 桂嫂怕腥：没放姜、黄酒的鱼汤送过去
  must(g, 'cook', { items: ['fish'], method: 'stew', at });
  const dish = g.ask('kitchen', at).dishes[0];
  const out = g.dispatch('gift', { to: 'gui', dish: dish.id, at });
  assert.ok(out.ok, out.reason);
  const gift = out.facts.find(f => f.type === 'gift.given');
  assert.equal(gift.data.liked, false);
  assert.ok(out.facts.some(f => f.data?.line === GIFT_TASTE.gui.dislike));
});

test('头一回吃到一道菜有一句；合口的菜腻得慢一点', () => {
  let g = newGame();
  settle(g); // 沉稳：清淡，白粥合口
  g = stocked(g, { rice: 3, wood: 3 });
  const ate = [],
    tired = [];
  g.on('diet.ate', e => ate.push(e.data));
  g.on('meal.eaten', e => tired.push(e.data.tired));
  // 一天煮一碗吃一碗（剩菜放过两天就馊了）
  for (let i = 0; i < 3; i++) {
    must(g, 'cook', { items: ['rice'], method: 'stew', at });
    dine(g, [g.ask('kitchen', at).dishes[0].id]);
    must(g, 'sleep');
  }
  assert.equal(ate[0].fresh, true);
  assert.equal(ate[1].fresh, false);
  assert.deepEqual(tired, ['', '', '又是这个'], '合口的晚一顿才腻');
});

test('菜名：没有菜谱的组合按主料配料起名，不再是「鱼炒蛋」', () => {
  const g = newGame();
  const name = (items, method) => g.ask('cook.preview', { items, method }).base;
  assert.equal(name(['fish', 'egg'], 'fry'), '鱼片滑蛋');
  assert.equal(name(['potato', 'tomato'], 'fry'), '番茄烧土豆');
  assert.equal(name(['chestnut', 'fish'], 'roast'), '栗子煨烤鱼');
  assert.equal(name(['chicken', 'radish'], 'stew'), '萝卜炖鸡');
  assert.equal(name(['pork', 'tomato'], 'fry'), '番茄炒肉');
  assert.equal(name(['shoot', 'pork', 'mushroom'], 'stew'), '山菌鲜笋炖肉');
  assert.equal(name(['berry', 'tomato'], 'mix'), '野莓酸甜番茄');
  // 补进来的菜谱
  assert.equal(
    g.ask('cook.preview', { items: ['bacon', 'shoot', 'pork'], method: 'stew', spices: ['wine'] })
      .base,
    '腌笃鲜',
  );
});
