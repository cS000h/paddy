// L3 端口契约：外壳能用的东西就这些。这里的清单变了，说明端口变了——要有意为之，
// 并且同步检查 world / panels 里用到它们的地方。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, MALFORMED_REASON } from '../../src/port/game.js';
import { newGame, must, FIELD } from '../helpers.js';

const COMMANDS = [
  'basket.order',
  'basket.put',
  'clock.advance',
  'cook',
  'dish.eat',
  'dish.pack',
  'dish.store',
  'drink',
  'eat',
  'farm.care',
  'farm.harvest',
  'farm.refill',
  'farm.sow',
  'farm.till',
  'farm.water',
  'fish.cast',
  'fish.hook',
  'fish.land',
  'fish.quit',
  'gather',
  'gift',
  'homestead',
  'origin.choose',
  'pack.put',
  'pack.take',
  'person.place',
  'search',
  'sip',
  'sky.look',
  'sleep',
  'talk',
  'travel',
  'travel.to',
  'market.visit',
  'market.buy',
  'market.sell',
  'tea.do',
  'invite',
  'visit.meet',
  'visit.cancel',
  'event.choose',
  'visitor.talk',
  'visitor.fulfill',
  'wardrobe.wear',
  'wardrobe.buy',
];
const QUERIES = [
  'persona',
  'opinion',
  'resident.greeting',
  'interaction.options',
  'residents',
  'market',
  'tea',
  'achievements',
  'action.cost',
  'basket',
  'body',
  'bonds',
  'catalog',
  'comfort',
  'clock',
  'cook.fire',
  'cook.preview',
  'drink.why',
  'farm.detail',
  'farm.plots',
  'farm.why',
  'fishing',
  'fish.fight',
  'fish.mood',
  'goods',
  'search',
  'search.spots',
  'search.why',
  'growth',
  'guide',
  'hero',
  'home',
  'homestead',
  'outings',
  'weather',
  'kitchen',
  'ledger',
  'notes',
  'pack',
  'visits',
  'modifiers',
  'events',
  'visitors',
  'wardrobe',
];

test('端口对外只有这几样', () => {
  const g = createGame();
  assert.deepEqual(Object.keys(g).sort(), [
    'ask',
    'commands',
    'dispatch',
    'on',
    'onCommit',
    'queries',
    'revision',
    'save',
    'stop',
  ]);
});

test('命令清单和查询清单', () => {
  const g = createGame();
  assert.deepEqual(g.commands(), [...COMMANDS].sort());
  assert.deepEqual(g.queries(), [...QUERIES].sort());
});

test('每个查询开局就能回答，答案是纯数据', () => {
  const g = newGame();
  const args = {
    'action.cost': ['hoe'],
    'drink.why': [18, 18, { x: 17, y: 18, dir: 'right' }],
    'farm.plots': ['yard'],
    'farm.why': ['hoe', 6, 19, FIELD.at],
  };
  for (const name of QUERIES) {
    const answer = g.ask(name, ...(args[name] || []));
    assert.deepEqual(
      JSON.parse(JSON.stringify(answer ?? null)),
      answer ?? null,
      `${name} 的答案不是纯数据`,
    );
  }
  const hero = g.ask('hero');
  assert.deepEqual(
    [hero.id, hero.name, hero.energy, hero.energyMax, hero.map],
    ['hero', '你', 100, 100, 'yard'],
  );
  assert.deepEqual(Object.keys(g.ask('clock')).sort(), [
    'clock',
    'day',
    'dayOfSeason',
    'hour',
    'late',
    'minute',
    'period',
    'season',
    'seasonName',
    'stopped',
    'year',
  ]);
});

test('命令的结果只有两种形状', () => {
  const g = newGame();
  const ok = g.dispatch('farm.till', FIELD);
  assert.deepEqual(Object.keys(ok), ['ok', 'facts']);
  assert.ok(ok.facts.every(f => typeof f.type === 'string' && typeof f.data === 'object'));
  assert.deepEqual(g.dispatch('farm.till', FIELD), { ok: false, reason: '这一格已经锄过了' });
  assert.deepEqual(g.dispatch('no.such.command'), { ok: false, reason: 'Unknown command' });
});

test('每条成功的命令通知一次；被拒绝的不通知；可以只听一种事实', () => {
  const g = newGame();
  const commits = [];
  const tilled = [];
  // 锄地有时翻出蚯蚓（看这一格、这一刻），那条事实不算在这里
  const off = g.onCommit(facts =>
    commits.push(facts.map(f => f.type).filter(t => t !== 'worm.found')),
  );
  g.on('plot.tilled', f => tilled.push(f.data));
  must(g, 'farm.till', FIELD);
  g.dispatch('farm.till', FIELD);
  assert.deepEqual(commits, [
    ['action.performed', 'plot.tilled', 'achievement.earned', 'guide.done'],
  ]);
  assert.deepEqual(tilled, [{ map: 'yard', x: 6, y: 19 }]);
  off();
  must(g, 'farm.sow', FIELD);
  assert.equal(commits.length, 1);
});

test('一个听众出错，别的听众照常听到，错交给 onError；没给 onError 时命令做完再抛出来', () => {
  const heard = [];
  const g = createGame({ seed: 1, onError: (error, info) => heard.push([error.message, info]) });
  const after = [];
  g.onCommit(() => {
    throw new Error('面板坏了');
  });
  g.onCommit(facts => after.push(facts.length)); // 比如自动存档
  g.on('plot.tilled', () => {
    throw new Error('画面坏了');
  });
  must(g, 'farm.till', FIELD);
  assert.equal(after.length, 1, '前一个听众出错，后一个照样听到');
  assert.deepEqual(heard, [
    ['画面坏了', { listener: 'plot.tilled' }],
    ['面板坏了', { listener: 'commit' }],
  ]);
  const quiet = newGame();
  quiet.onCommit(() => {
    throw new Error('没人接的错');
  });
  assert.throws(() => quiet.dispatch('farm.till', FIELD), /没人接的错/);
  assert.equal(quiet.revision(), 1, '世界照常往前走了，只是错没有被吞掉');
});

test('命令的输入要是干净的数据：原型链上的名字、不是普通对象的值，挡在门口', () => {
  const g = newGame();
  for (const input of [
    { item: 'constructor' },
    { item: '__proto__' },
    { at: { toString: 1 } },
    { items: ['rice', 'hasOwnProperty'] },
    { at: new Map() },
  ]) {
    const out = g.dispatch('eat', input);
    assert.equal(out.ok, false, JSON.stringify(input));
    assert.equal(out.reason, MALFORMED_REASON);
  }
  assert.equal(g.revision(), 0);
});

test('事实和存档都是冻结的，外壳改不了规则里的数据', () => {
  const g = newGame();
  const out = g.dispatch('farm.till', FIELD);
  assert.throws(() => (out.facts[0].data.n = 0), TypeError);
  assert.throws(() => (g.save().state.world.clock.day = 9), TypeError);
});
