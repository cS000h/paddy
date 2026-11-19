// L2 规则：人物五维属性、时限修正池、脉冲随机事件与流动过客。一律通过端口发命令。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, must, refused, HOME } from '../helpers.js';

test('人物五维属性汇总基础值与特质加成，吃拿手热饭获得时限修正并按天过期', () => {
  const g = newGame(7);
  const before = g.ask('modifiers');
  assert.equal(before.stats.length, 5);
  assert.deepEqual(before.list, []);
  const socialBefore = before.stats.find(s => s.id === 'social').value;
  must(g, 'origin.choose', { route: 'stay', reply: 'join' });
  const after = g.ask('modifiers');
  assert.ok(
    after.stats.find(s => s.id === 'social').value >= socialBefore + 4,
    '随和与爱热闹同时提升交际',
  );
  // 灶台做一份蛋炒饭（火候 50 拿手）并吃下，触发 3 天「好饭提劲」
  const cooked = g.dispatch('cook', {
    items: ['rice', 'egg'],
    spices: [],
    method: 'fry',
    cut: null,
    heat: 70,
    at: { x: 10, y: 11, dir: 'up' },
  });
  assert.equal(cooked.ok, true);
  const dishId = cooked.facts.find(f => f.type === 'meal.cooked').data.ids[0];
  must(g, 'dish.eat', { id: dishId, at: { x: 10, y: 11, dir: 'up' } });
  const mods = g.ask('modifiers').list;
  assert.ok(mods.some(m => m.id === 'good_meal' && m.left >= 2), '拿手饭给 3 天好饭提劲');
  // 过三天后自动过期
  for (let i = 0; i < 3; i++) must(g, 'sleep');
  assert.equal(
    g.ask('modifiers').list.some(m => m.id === 'good_meal'),
    false,
    '到期后清早自动清理',
  );
});

test('脉冲随机事件：晨起触发后可选择结算，带检定概率与特质门槛', () => {
  const g = newGame(11);
  assert.equal(refused(g, 'event.choose', { choice: 0 }), '眼下没有待处理的小事');
  let active = null;
  for (let i = 0; i < 10 && !active; i++) {
    must(g, 'sleep');
    active = g.ask('events').active;
  }
  assert.ok(active, '十天内至少触发一次晨起小事');
  assert.ok(active.choices.length >= 2);
  const checked = active.choices.find(c => c.check);
  if (checked) assert.ok(checked.check.chance >= 15 && checked.check.chance <= 95);
  const out = g.dispatch('event.choose', { choice: 0 });
  assert.equal(out.ok, true);
  assert.ok(out.facts.some(f => f.type === 'pulse.resolved'));
  assert.equal(g.ask('events').active, null);
});

test('流动过客：开局茶摊有过客，聊闲话与办好托付后记入熟人册', () => {
  const g = newGame(5);
  const init = g.ask('visitors');
  assert.equal(init.active.length, 1);
  const v = init.active[0];
  const talked = g.dispatch('visitor.talk', { id: v.id });
  assert.equal(talked.ok, true);
  assert.match(refused(g, 'visitor.talk', { id: v.id }), /已经和.*聊过了/);

  // 灶台做份热饭送给初来书生，拿到谢礼并记入熟人册
  const cooked = g.dispatch('cook', {
    items: ['rice', 'egg'],
    spices: [],
    method: 'fry',
    cut: null,
    heat: 70,
    at: { x: 10, y: 11, dir: 'up' },
  });
  assert.equal(cooked.ok, true);
  const dishId = cooked.facts.find(f => f.type === 'meal.cooked').data.ids[0];
  const coinsBefore = g.ask('home').coins;
  const done = g.dispatch('visitor.fulfill', { id: v.id, dish: dishId, at: HOME });
  assert.equal(done.ok, true);
  assert.ok(g.ask('home').coins > coinsBefore, '完成托付获得铜钱谢礼');
  assert.equal(g.ask('visitors').book.length, 1, '满意后记入熟人册');
  assert.match(refused(g, 'visitor.fulfill', { id: v.id, dish: dishId }), /已经帮完了/);
});
