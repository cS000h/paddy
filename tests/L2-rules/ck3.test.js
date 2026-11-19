// L2 规则：人物五维属性、时限修正池、落到具体地点的小事与村中实景过客。一律通过端口发命令。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, must, refused } from '../helpers.js';

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
  assert.ok(mods.some(m => m.id === 'good_meal' && m.left >= 2), '拿手饭给时限好饭提劲');
  for (let i = 0; i < 3; i++) must(g, 'sleep');
  assert.equal(
    g.ask('modifiers').list.some(m => m.id === 'good_meal'),
    false,
    '到期后清早自动清理',
  );
});

test('小事落在具体地方：不在跟前被拒绝，走过去才能在底部对话条处理', () => {
  const g = newGame(11);
  assert.equal(refused(g, 'event.choose', { choice: 0 }), '眼下没有待处理的小事');
  let active = null;
  for (let i = 0; i < 10 && !active; i++) {
    must(g, 'sleep');
    active = g.ask('events').active;
  }
  assert.ok(active && active.map && Number.isInteger(active.x) && Number.isInteger(active.y));
  assert.ok(active.hint && active.place, '带发生地与自然去处提示');
  // 故意离远或换到别的地图，应被拒绝
  const farMap = active.map === 'tea' ? 'yard' : 'tea';
  must(g, 'travel.to', { to: farMap });
  assert.equal(refused(g, 'event.choose', { choice: 0 }), '走到跟前再处理这件事');
  // 回到发生地并走到跟前，处理成功
  must(g, 'travel.to', { to: active.map });
  const out = g.dispatch('event.choose', {
    choice: 0,
    at: { x: active.x, y: active.y, dir: 'down' },
  });
  assert.equal(out.ok, true);
  assert.ok(out.facts.some(f => f.type === 'pulse.resolved'));
  assert.equal(g.ask('events').active, null);
});

test('流动过客站在村里：不在跟前不能搭话端饭，走到茶摊跟前才能聊和送热饭', () => {
  const g = newGame(5);
  const init = g.ask('visitors');
  assert.equal(init.active.length, 1);
  const v = init.active[0];
  assert.equal(v.map, 'tea');
  assert.ok(v.look.includes('/'), '过客外观由现成衣装发式拼出');

  // 还在小院里，远程聊闲话和送饭都被拒绝
  assert.match(refused(g, 'visitor.talk', { id: v.id }), /走到.*跟前再说话/);
  assert.match(refused(g, 'visitor.fulfill', { id: v.id, dish: 1 }), /走到.*跟前再说话/);

  // 先在院里做份蛋炒饭装进行囊，再去樟树茶摊走到过客跟前
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
  must(g, 'dish.pack', { id: dishId, at: { x: 10, y: 11, dir: 'up' } });

  must(g, 'travel.to', { to: v.map });
  const beside = { x: v.x, y: v.y + 1, dir: 'up' };
  const talked = g.dispatch('visitor.talk', { id: v.id, at: beside });
  assert.equal(talked.ok, true);
  assert.match(refused(g, 'visitor.talk', { id: v.id, at: beside }), /已经和.*聊过了/);

  const coinsBefore = g.ask('home').coins;
  const done = g.dispatch('visitor.fulfill', { id: v.id, dish: dishId, at: beside });
  assert.equal(done.ok, true);
  assert.ok(g.ask('home').coins > coinsBefore, '完成托付获得铜钱谢礼');
  assert.equal(g.ask('visitors').book.length, 1, '满意后记入熟人册');
  assert.match(refused(g, 'visitor.fulfill', { id: v.id, dish: dishId, at: beside }), /已经帮完了/);
});
