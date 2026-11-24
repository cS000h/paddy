// L2 规则：六项属性、时限修正池、落到具体地点的小事与村中实景过客。一律通过端口发命令。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, must, refused } from '../helpers.js';
import { MAPS, walkable, farmable } from '../../src/content/maps/index.js';
import { ATTRS, TEMPERS, LINES_OF_ORIGIN, OLD_TRAITS } from '../../src/content/traits.js';
import { TRAITS } from '../../src/content/growth.js';
import { EVENTS, checkChance } from '../../src/content/events.js';

const parts = a => a.parts.map(p => [p.label, p.delta]);

test('六项从底子 4 起，加上性情、出身线和身边风物，每项带明细；拿手饭的修正按天过期', () => {
  const g = newGame(7);
  const attr = id => g.ask('persona').attrs.find(a => a.id === id);
  const before = g.ask('persona').attrs;
  assert.deepEqual(
    before.map(a => a.id),
    Object.keys(ATTRS),
  );
  assert.ok(
    before.every(a => a.value === 4 && a.parts.length === 1),
    '开局两选之前只有底子',
  );
  assert.deepEqual(g.ask('modifiers').list, []);
  // 随和换成知足（人情 +1），爱热闹换成热络（人情 +2），出身先给农桑庄户一级（持家 +2）
  must(g, 'origin.choose', { route: 'stay', reply: 'join' });
  assert.deepEqual(parts(attr('renqing')), [
    ['底子', 4],
    ['知足', 1],
    ['热络', 2],
  ]);
  assert.equal(attr('renqing').value, 7);
  assert.deepEqual(parts(attr('chijia')), [
    ['底子', 4],
    ['农桑庄户一级', 2],
  ]);
  assert.equal(attr('danliang').value, 4, '知足 −1、热络 +1 抵平');
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
  assert.ok(
    mods.some(m => m.id === 'good_meal' && m.left >= 2),
    '拿手饭给时限好饭提劲',
  );
  assert.equal(attr('chijia').value, 7, '好饭提劲：持家 +1');
  assert.ok(attr('tige').parts.some(p => p.id === 'mod.good_meal' && p.delta === 1));
  for (let i = 0; i < 3; i++) must(g, 'sleep');
  assert.equal(
    g.ask('modifiers').list.some(m => m.id === 'good_meal'),
    false,
    '到期后清早自动清理',
  );
  assert.ok(!attr('chijia').parts.some(p => p.id === 'mod.good_meal'), '过期了六项也跟着回去');
});

test('村民的六项照档案算：石伯持家 13，阅历只有 2；过客也有六项', () => {
  const g = newGame(7);
  const shi = g.ask('persona', 'shi');
  const attr = id => shi.attrs.find(a => a.id === id);
  assert.deepEqual(parts(attr('chijia')), [
    ['底子', 4],
    ['勤勉', 1],
    ['抠门', 2],
    ['农桑庄户三级', 6],
  ]);
  assert.equal(attr('chijia').value, 13);
  assert.equal(attr('yueli').value, 2, '厚道的人不精明：阅历 −2');
  const v = g.ask('visitors').active[0];
  const va = g.ask('persona', v.id).attrs;
  assert.equal(va.length, 6);
  assert.ok(va.every(a => Number.isInteger(a.value) && a.value >= 0));
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
  // 要检定的选项写着六项里哪一项、现在几点、几成把握，和人物档案算的对得上
  const now = g.ask('persona').attrs;
  assert.ok(
    active.choices.some(x => x.check),
    '每件小事都有一个要检定的做法',
  );
  // 只给某种人的做法：开局的旧特质已经换成性情或出身线，报换过去的名字；做出来的历练照旧
  for (const c of active.choices.filter(x => x.reqTrait)) {
    const to = OLD_TRAITS[c.reqTrait];
    const name = !to
      ? TRAITS[c.reqTrait].name
      : to.temper
        ? TEMPERS[to.temper].name
        : LINES_OF_ORIGIN[to.line].name;
    assert.equal(c.traitName, name);
  }
  for (const c of active.choices.filter(x => x.check)) {
    const a = now.find(x => x.id === c.check.attr);
    assert.equal(c.check.attrName, ATTRS[a.id]);
    assert.equal(c.check.attrValue, a.value);
    assert.equal(c.check.chance, checkChance(a.value, EVENTS[active.id].choices[c.index].check.dc));
  }
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

test('下地时碰上的小事落在主角身边空着的一格，不压在脚下，也不占面前那块地', () => {
  let found = null;
  for (let seed = 1; seed < 40 && !found; seed++) {
    const g = newGame(seed);
    for (let x = 6; x <= 17 && !found; x++) {
      const at = { x, y: 18, dir: 'down' };
      if (!g.dispatch('farm.till', { x, y: 19, at }).ok) break;
      const ev = g.ask('events').active;
      if (ev) found = { ev, at };
    }
  }
  assert.ok(found, '锄了这么多地，总该碰上一回');
  const { ev, at } = found;
  assert.equal(ev.map, 'yard');
  assert.ok(Math.abs(ev.x - at.x) <= 1 && Math.abs(ev.y - at.y) <= 1, '就在身边');
  assert.ok(ev.x !== at.x || ev.y !== at.y, '不压在脚下');
  assert.ok(!(ev.x === at.x && ev.y === at.y + 1), '不占面前要干活的那一格');
  assert.ok(
    walkable(MAPS.yard, ev.x, ev.y) && !farmable(MAPS.yard, ev.x, ev.y),
    '落在能站人的空地上',
  );
});
