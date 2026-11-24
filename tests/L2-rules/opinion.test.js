// L2 规则：好感。相性看性情，来由一条条记、到日子自己掉，村民看主角时加上熟到哪一层。一律通过端口发命令。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, must, growOne, FIELD } from '../helpers.js';

const why = (o, id) => o.parts.find(p => p.id === 'why.' + id);
const labels = o => o.parts.map(p => [p.label, p.delta]);

test('相性看性情：同一个 +10、反着的 −10，还没看出来的说不上为什么；村民之间开局记着几条交情', () => {
  const g = newGame();
  // 还不认识石伯和桂嫂：看得出他俩不大对付，说不上为什么
  assert.deepEqual(labels(g.ask('opinion', 'shi', 'gui')), [['莫名别扭', -10]]);
  // 桂嫂和小乔都热络、都要强（还看不出来），又是看着她长大的
  const guiQiao = g.ask('opinion', 'gui', 'qiao');
  assert.equal(guiQiao.value, 28);
  assert.deepEqual(labels(guiQiao), [
    ['莫名投缘', 20],
    ['看着长大的', 8],
  ]);
  assert.deepEqual(labels(g.ask('opinion', 'aman', 'zhou')).sort(), [
    ['常给他送菜', 10],
    ['莫名别扭', -10],
  ]);
  // 跟石伯、桂嫂都处到亲近，看出了他抠门、她大方
  for (let day = 0; day < 6; day++) {
    must(g, 'talk', { to: 'shi' });
    must(g, 'talk', { to: 'gui' });
    must(g, 'sleep');
  }
  const shiGui = g.ask('opinion', 'shi', 'gui');
  assert.deepEqual(labels(shiGui), [['抠门碰上大方', -10]]);
  assert.equal(shiGui.value, -10);
  assert.equal(g.ask('opinion', 'shi', 'shi'), null);
  assert.equal(g.ask('opinion', 'nobody', 'shi'), null);
  // 过客也能问（相性照他的档案算），只是还没有来由
  const v = g.ask('visitors').active[0];
  const seen = g.ask('opinion', v.id, 'hero');
  assert.ok(seen && seen.parts.every(p => !p.id.startsWith('why.')));
});

test('跟村民说话他记一条，天天说最多记五条，十天不说就掉了；熟到哪一层也算进去', () => {
  const g = newGame();
  const fresh = g.ask('opinion', 'shi');
  assert.deepEqual([fresh.from, fresh.to, fresh.value, fresh.parts], ['shi', 'hero', 0, []]);
  must(g, 'talk', { to: 'shi' });
  const o = g.ask('opinion', 'shi');
  assert.deepEqual([why(o, 'chat').delta, why(o, 'chat').left], [2, 10]);
  assert.deepEqual(
    o.parts.find(p => p.id === 'known'),
    { id: 'known', label: '熟悉：点头之交', delta: 4 },
  );
  must(g, 'talk', { to: 'shi' });
  assert.equal(why(g.ask('opinion', 'shi'), 'chat').delta, 2, '同一天再说话不再记');
  for (let day = 0; day < 6; day++) {
    must(g, 'sleep');
    must(g, 'talk', { to: 'shi' });
  }
  const chat = why(g.ask('opinion', 'shi'), 'chat');
  assert.deepEqual([chat.delta, chat.times, chat.left], [10, 5, 10], '记满了只刷新天数');
  for (let day = 0; day < 10; day++) must(g, 'sleep');
  assert.equal(why(g.ask('opinion', 'shi'), 'chat'), undefined);
  assert.equal(g.ask('opinion', 'shi').value, 14, '来由掉光了，熟悉还在（亲近 +14）');
});

test('送东西他记着：寻常东西 +5，记三十天', () => {
  const g = newGame();
  growOne(g);
  must(g, 'farm.harvest', FIELD);
  must(g, 'gift', { to: 'gui', item: 'veg.qingcai' });
  const gift = why(g.ask('opinion', 'gui'), 'gift');
  assert.deepEqual([gift.label, gift.delta, gift.left], ['送过东西', 5, 30]);
});

test('赴了约他记 +8；约了没来记 −12', () => {
  const g = newGame();
  must(g, 'talk', { to: 'shi' });
  must(g, 'invite', { to: 'shi' });
  must(g, 'talk', { to: 'gui' });
  must(g, 'sleep');
  must(g, 'clock.advance', { minutes: 120 });
  must(g, 'clock.advance', { minutes: 70 });
  must(g, 'travel.to', { to: 'tea' });
  const shi = g.ask('residents').find(r => r.id === 'shi');
  must(g, 'visit.meet', { at: { x: shi.x, y: shi.y + 1, dir: 'up' } });
  assert.deepEqual(
    labels(g.ask('opinion', 'shi')).find(([l]) => l === '赴过约'),
    ['赴过约', 8],
  );
  must(g, 'sleep');
  g.dispatch('travel.to', { to: 'yard' });
  must(g, 'invite', { to: 'gui' });
  must(g, 'sleep');
  for (let i = 0; i < 4; i++) must(g, 'clock.advance', { minutes: 120 });
  const missed = why(g.ask('opinion', 'gui'), 'missed');
  assert.deepEqual([missed.label, missed.delta], ['约了没来', -12]);
});
