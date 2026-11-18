// L1 内核单元测试：不装任何游戏规则，只验证内核自己的承诺。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEvents } from '../../src/kernel/events.js';
import { createSchema, is, check } from '../../src/kernel/schema.js';
import { createReactions } from '../../src/kernel/reactions.js';
import { createCompute, part } from '../../src/kernel/compute.js';
import { createQueries } from '../../src/kernel/queries.js';
import { createGuard } from '../../src/kernel/guard.js';
import { createDispatcher, refuse } from '../../src/kernel/dispatch.js';
import { createPluginHost } from '../../src/kernel/plugin-host.js';

// 一个最小的内核：一格计数器，方便各条测试复用。
function tiny({ guard = createGuard(), plugins = [] } = {}) {
  const events = createEvents();
  const schema = createSchema();
  const reactions = createReactions({ guard });
  const compute = createCompute({ guard });
  const queries = createQueries({ guard });
  const commits = [];
  const dispatcher = createDispatcher({
    initialState: { revision: 0, world: null },
    problems: s => schema.problems(s.world),
    events,
    reactions,
    guard,
    onCommit: outcome => commits.push(outcome),
  });
  const host = createPluginHost({
    services: { schema, reactions, compute, queries, commands: dispatcher.commands },
    events,
    guard,
  });
  const counter = {
    id: 'counter',
    provides: ['counter'],
    requires: ['schema', 'commands'],
    writes: ['count'],
    install(ctx) {
      ctx.services.schema.slice('count', {
        initial: () => ({ n: 0 }),
        validate: c => is.int(c.n, 0, 5) || 'n out of range',
      });
      ctx.services.commands.register('add', ({ draft, input, fact }) => {
        if (input.n === 0) return { ok: false, reason: 'nothing to add' };
        draft.world.count.n += input.n ?? 1;
        fact('added', { n: draft.world.count.n });
      });
      ctx.provide('counter', { bump: ctx.own(w => (w.count.n += 1)) });
    },
  };
  host.start([counter, ...plugins]);
  dispatcher.adopt({ revision: 0, world: schema.initial({}) });
  const send = (type, input = {}) =>
    dispatcher.dispatch({ ...input, type, revision: dispatcher.snapshot().revision });
  return { dispatcher, events, schema, reactions, compute, queries, host, commits, send };
}

test('命令成功：版本号加一，事实在提交之后发布，onCommit 只调用一次', () => {
  const k = tiny();
  const seen = [];
  k.events.on('added', f => seen.push([f.data.n, k.dispatcher.snapshot().world.count.n]));
  const out = k.send('add');
  assert.equal(out.ok, true);
  assert.equal(k.dispatcher.snapshot().revision, 1);
  assert.deepEqual(seen, [[1, 1]], '监听者看到的已经是提交后的世界');
  assert.equal(k.commits.length, 1);
});

test('命令被拒绝或出错：世界原样不动', () => {
  const k = tiny();
  assert.equal(k.send('add', { n: 0 }).reason, 'nothing to add');
  assert.match(k.send('add', { n: 9 }).reason, /State invariant failed: count/);
  assert.equal(k.send('nope').reason, 'Unknown command');
  assert.equal(k.dispatcher.dispatch({ type: 'add', revision: 99 }).reason, 'Stale command');
  assert.deepEqual(k.dispatcher.snapshot(), { revision: 0, world: { count: { n: 0 } } });
  assert.equal(k.commits.length, 0);
});

test('快照是冻结的，外面改不了', () => {
  const k = tiny();
  assert.throws(() => (k.dispatcher.snapshot().world.count.n = 3), TypeError);
});

test('规则事件：按优先级执行，可以接着发事件；链条太长会整条回滚', () => {
  const order = [];
  const chain = {
    id: 'chain',
    requires: ['reactions'],
    writes: [],
    install(ctx) {
      const R = ctx.services.reactions;
      R.on('added', () => order.push('late'), { priority: 90 });
      R.on('added', (s, e, emit) => (order.push('early'), emit('echo', {})), { priority: 10 });
      R.on('echo', () => order.push('echo'));
    },
  };
  const k = tiny({ plugins: [chain] });
  const out = k.send('add');
  assert.deepEqual(order, ['early', 'late', 'echo']);
  assert.deepEqual(
    out.facts.map(f => f.type),
    ['added', 'echo'],
  );

  const loop = {
    id: 'loop',
    requires: ['reactions'],
    writes: [],
    install: ctx => ctx.services.reactions.on('added', (s, e, emit) => emit('added', {})),
  };
  const k2 = tiny({ plugins: [loop] });
  assert.match(k2.send('add').reason, /Event chain exceeded limit/);
  assert.equal(k2.dispatcher.snapshot().world.count.n, 0);
});

test('计算管道：每一处加减都留下说明', () => {
  const compute = createCompute();
  compute.tap('cost', r => part(r, 'rain', '雨天', 2), { priority: 20 });
  compute.tap('cost', r => part(r, 'skill', '熟手', -1), { priority: 10 });
  const result = compute.run('cost', {}, { value: 4, parts: [] });
  assert.equal(result.value, 5);
  assert.deepEqual(
    result.parts.map(p => p.id),
    ['skill', 'rain'],
  );
});

test('写入检查：没声明的写入会被拦下，经由 ctx.own 的写入算在服务主人头上', () => {
  const sneaky = {
    id: 'sneaky',
    requires: ['reactions'],
    writes: [],
    install: ctx => ctx.services.reactions.on('added', s => (s.world.count.n += 1)),
  };
  assert.match(
    tiny({ plugins: [sneaky] }).send('add').reason,
    /sneaky changed "count" without declaring/,
  );

  const polite = {
    id: 'polite',
    requires: ['reactions', 'counter'],
    writes: [],
    install: ctx => ctx.services.reactions.on('added', s => ctx.services.counter.bump(s.world)),
  };
  const k = tiny({ plugins: [polite] });
  assert.equal(k.send('add').ok, true);
  assert.equal(k.dispatcher.snapshot().world.count.n, 2);
});

test('查询必须只读', () => {
  const k = tiny();
  k.queries.define('peek', w => w.count.n);
  k.queries.define('poke', w => (w.count.n = 4));
  assert.equal(k.queries.run('peek', { count: { n: 3 } }), 3);
  assert.throws(() => k.queries.run('poke', { count: { n: 3 } }), /must be read-only/);
  assert.throws(() => k.queries.run('missing', {}), /Unknown query/);
});

test('插件宿主：按依赖排序，没声明的依赖用不了，重复的服务被拒绝', () => {
  const made = [];
  const a = {
    id: 'a',
    provides: ['x'],
    requires: ['y'],
    install: ctx => (made.push('a'), ctx.provide('x', 1)),
  };
  const b = { id: 'b', provides: ['y'], install: ctx => (made.push('b'), ctx.provide('y', 2)) };
  createPluginHost({ events: createEvents() }).start([a, b]);
  assert.deepEqual(made, ['b', 'a']);

  const nosy = { id: 'nosy', requires: [], install: ctx => ctx.services.y };
  assert.throws(
    () => createPluginHost({ services: { y: 1 }, events: createEvents() }).start([nosy]),
    /Undeclared dependency: y in nosy/,
  );
  const twin = { id: 'twin', provides: ['y'], install: ctx => ctx.provide('y', 3) };
  assert.throws(
    () => createPluginHost({ events: createEvents() }).start([b, twin]),
    /Duplicate service: y/,
  );
});

test('数据切片：谁登记谁负责校验，问题带着切片名', () => {
  const schema = createSchema();
  schema.slice('a', {
    initial: () => ({ n: 1 }),
    validate: a => check([[is.int(a.n, 0, 3), 'n']]),
  });
  assert.deepEqual(schema.problems(schema.initial({})), []);
  assert.deepEqual(schema.problems({ a: { n: 7 }, b: 1 }), ['unknown slice "b"', 'a: n']);
  assert.throws(
    () => schema.slice('a', { initial: () => 0, validate: () => true }),
    /already registered/,
  );
});

test('refuse()：服务里说“做不了”，命令被拒绝、世界不动，而且不算程序出错', () => {
  const events = createEvents();
  const errors = [];
  const dispatcher = createDispatcher({
    initialState: { revision: 0, world: { n: 0 } },
    problems: () => [],
    events,
    reactions: null,
    onError: error => errors.push(error.message),
  });
  const spend = (world, n) => {
    if (n > 3) refuse('太累了');
    world.n += n;
  };
  dispatcher.commands.register('work', ({ draft, input }) => {
    draft.world.n += 1; // 拒绝之前改过的东西也要一起作废
    spend(draft.world, input.n);
  });
  dispatcher.commands.register('crash', () => {
    throw new Error('bug');
  });
  const send = (type, input = {}) =>
    dispatcher.dispatch({ ...input, type, revision: dispatcher.snapshot().revision });
  assert.deepEqual(send('work', { n: 9 }), { ok: false, reason: '太累了' });
  assert.equal(dispatcher.snapshot().world.n, 0);
  assert.deepEqual(errors, [], '拒绝不报给 onError');
  assert.deepEqual(send('crash'), { ok: false, reason: 'bug', fault: true });
  assert.deepEqual(errors, ['bug'], '真出错才报');
  assert.equal(send('work', { n: 2 }).ok, true);
  assert.equal(dispatcher.snapshot().world.n, 3);
});

test('反应里不许拒绝：跟着一件事发生的反应一拒绝，就算程序出错（行囊满了不能连觉都睡不了）', () => {
  const events = createEvents();
  const reactions = createReactions();
  const errors = [];
  const dispatcher = createDispatcher({
    initialState: { revision: 0, world: { day: 1, gifts: 0 } },
    problems: () => [],
    events,
    reactions,
    onError: error => errors.push(error.message),
  });
  dispatcher.commands.register('sleep', ({ draft, fact }) => {
    draft.world.day += 1;
    fact('day.started');
  });
  reactions.on('day.started', () => refuse('行囊满了'), { owner: { id: 'gifts' } });
  const out = dispatcher.dispatch({ type: 'sleep', revision: 0 });
  assert.equal(out.ok, false);
  assert.equal(out.fault, true);
  assert.match(out.reason, /gifts refused while reacting to day\.started: 行囊满了/);
  assert.equal(errors.length, 1);
  assert.equal(dispatcher.snapshot().world.day, 1, '整条命令作废');
});

test('is.keyedBy：每人一份的数据，空对象、数组、true 都不算数，少一份多一份都不行', () => {
  const people = ['hero', 'shi'];
  assert.ok(is.keyedBy({ hero: 1, shi: 2 }, people));
  for (const bad of [{}, [], true, 2.5, null, { hero: 1 }, { hero: 1, shi: 2, gui: 3 }])
    assert.equal(is.keyedBy(bad, people), false, JSON.stringify(bad));
});
