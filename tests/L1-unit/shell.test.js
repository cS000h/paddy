// L1 外壳里不依赖浏览器的部分：输入意图、外壳状态、寻路和“点一下该做什么”。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createIntents } from '../../src/shell/intents.js';
import { createShellState } from '../../src/shell/state.js';
import {
  findPath,
  standBeside,
  fieldTool,
  facing,
  dirTo,
  tileOf,
  skyTint,
} from '../../src/world/logic.js';
import { MAPS, walkable } from '../../src/content/maps/index.js';
import { newGame, must } from '../helpers.js';

test('外壳状态和输入意图：一个听众出错，别的照常收到；没人接错时通知完再抛出', () => {
  const errors = [];
  const shell = createShellState({ onError: (e, where) => errors.push([e.message, where]) });
  const seen = [];
  shell.subscribe(() => {
    throw new Error('面板坏了');
  });
  shell.subscribe(state => seen.push(state.tool));
  shell.set({ tool: 'can' });
  assert.deepEqual(seen, ['can']);
  assert.deepEqual(errors, [['面板坏了', 'shell']]);

  const intents = createIntents({ onError: (e, where) => errors.push([e.message, where]) });
  const acted = [];
  intents.on('act', () => {
    throw new Error('世界坏了');
  });
  intents.on('act', () => acted.push(1));
  intents.emit('act');
  assert.deepEqual(acted, [1]);
  assert.deepEqual(errors.at(-1), ['世界坏了', 'intent:act']);

  const loud = createShellState();
  const after = [];
  loud.subscribe(() => {
    throw new Error('没人接');
  });
  loud.subscribe(() => after.push(1));
  assert.throws(() => loud.set({ tool: 'can' }), /没人接/);
  assert.deepEqual(after, [1], '抛出之前，别的听众已经收到了');
});

test('意图：几个设备同时报方向，取最用力的那个；长度不超过 1', () => {
  const intents = createIntents();
  assert.deepEqual(intents.move(), { x: 0, y: 0 });
  intents.setMove('keys', 1, 0);
  intents.setMove('stick', 0.3, 0.2);
  assert.deepEqual(intents.move(), { x: 1, y: 0 });
  intents.setMove('keys', 1, 1);
  assert.ok(Math.abs(Math.hypot(intents.move().x, intents.move().y) - 1) < 1e-9);
  intents.setMove('keys', 0, 0);
  assert.deepEqual(intents.move(), { x: 0.3, y: 0.2 });
  intents.release();
  assert.deepEqual(intents.move(), { x: 0, y: 0 });
});

test('意图：一次性的意图可以订阅和取消，不认识的意图会报错', () => {
  const intents = createIntents();
  const seen = [];
  const off = intents.on('tap', p => seen.push(p));
  intents.emit('tap', { x: 3, y: 4 });
  off();
  intents.emit('tap', { x: 5, y: 6 });
  assert.deepEqual(seen, [{ x: 3, y: 4 }]);
  assert.throws(() => intents.emit('jump'), /不认识的意图/);
});

test('外壳状态：有变化才通知；有小窗就算暂停；工具可以循环切换', () => {
  const shell = createShellState();
  let calls = 0;
  shell.subscribe(() => calls++);
  shell.set({ tool: 'hoe' });
  assert.equal(calls, 0, '没变化不通知');
  shell.set({ tool: 'can' });
  assert.equal(calls, 1);
  assert.equal(shell.paused(), false);
  shell.set({ modal: { kind: 'sleep' } });
  assert.equal(shell.paused(), true);
  shell.stepTool(1);
  assert.equal(shell.get().tool, 'hand');
  shell.stepTool(1);
  assert.equal(shell.get().tool, 'hoe');
  shell.stepTool(-1);
  assert.equal(shell.get().tool, 'hand');
});

test('寻路：绕开挡路的东西；走不到返回 null；起点就是终点返回空', () => {
  const map = MAPS.yard;
  const walk = (x, y) => walkable(map, x, y);
  const path = findPath(walk, { x: 8, y: 11 }, { x: 8, y: 18 });
  assert.ok(path.length >= 7);
  assert.deepEqual(path.at(-1), { x: 8, y: 18 });
  assert.ok(
    path.every(p => walk(p.x, p.y)),
    '路上每一格都能走',
  );
  path.reduce((a, b) => (assert.equal(Math.abs(a.x - b.x) + Math.abs(a.y - b.y), 1), b), {
    x: 8,
    y: 11,
  });
  assert.deepEqual(findPath(walk, { x: 8, y: 11 }, { x: 8, y: 11 }), []);
  assert.equal(findPath(walk, { x: 8, y: 11 }, { x: 40, y: 3 }), null, '水里走不到');
});

test('站位：要对一格做事，站到它旁边最近的能走的格子，面朝它', () => {
  const walk = (x, y) => walkable(MAPS.yard, x, y);
  const well = standBeside(walk, { x: 20, y: 17 }, { x: 18, y: 18 });
  assert.ok(well && walk(well.x, well.y));
  assert.deepEqual(facing(well.x, well.y, well.dir), { x: 18, y: 18 });
});

test('自动农具：先锄、润土、下种、看地，成熟时优先采收', () => {
  const g = newGame();
  const spot = { x: 6, y: 19, at: { x: 6, y: 18, dir: 'down' } };
  const tool = () => fieldTool(g.ask('farm.detail', spot.x, spot.y));
  assert.equal(tool(), 'hoe');
  must(g, 'farm.till', spot);
  assert.equal(tool(), 'can');
  must(g, 'farm.water', spot);
  assert.equal(tool(), 'seed');
  must(g, 'farm.sow', spot);
  assert.equal(tool(), null);
  assert.equal(fieldTool({ crop: 'qingcai', water: 0, age: 3 }), 'hand');
});

test('小工具：格子换算、朝向、天色', () => {
  assert.deepEqual(tileOf(40, 31), { x: 2, y: 1 });
  assert.equal(dirTo({ x: 1, y: 1 }, { x: 4, y: 2 }), 'right');
  assert.equal(dirTo({ x: 1, y: 1 }, { x: 1, y: 0 }), 'up');
  assert.equal(skyTint(12 * 60), '#ffffff');
  assert.notEqual(skyTint(6 * 60), '#ffffff');
  assert.match(skyTint(23 * 60), /^#[0-9a-f]{6}$/);
});

test('外壳共用的话：体力价钱、地里要不要照料、按设备说怎么做', async () => {
  const { costText, careNote, doWord } = await import('../../src/shell/words.js');
  assert.equal(costText({ value: 4, parts: [] }), '体力 4');
  const parts = [
    { label: '饿着', delta: 1 },
    { label: '清早', delta: -1 },
  ];
  assert.equal(costText({ value: 4, parts }), '体力 4（饿着+1、清早−1）');
  assert.equal(careNote(null), '');
  assert.equal(careNote({ weeds: false, bugs: false }), '');
  assert.equal(careNote({ weeds: true, bugs: false }), '长了草');
  assert.equal(careNote({ weeds: true, bugs: true }), '长了草，也生了虫');
  assert.notEqual(doWord(true), doWord(false));
});

test('摇杆手感：死区里不动；一推就走、推到六成是全速；方向不跳；拖出圈外圈跟着走', async () => {
  const { stickState, STICK } = await import('../../src/shell/stick.js');
  const o = { x: 100, y: 100 };
  const speed = s => Math.hypot(s.move.x, s.move.y);
  assert.equal(speed(stickState(o, { x: 105, y: 100 })), 0, '离按下的地方很近：当作没推');
  const slight = stickState(o, { x: 100 + STICK.radius * 0.2, y: 100 });
  assert.ok(speed(slight) >= 0.35 && speed(slight) < 0.5, '推一点就开始走');
  assert.ok(Math.abs(speed(stickState(o, { x: 100, y: 100 + STICK.radius * 0.7 })) - 1) < 1e-9);
  // 斜着推一点点：两个方向都还在（原来按 x、y 各去一段，斜推时一个方向会突然归零）
  const diag = stickState(o, { x: 100 + 14, y: 100 + 9 });
  assert.ok(diag.move.x > 0 && diag.move.y > 0);
  // 拖出圈外：圈心挪过去，手指正好在圈边上；往回一拉立刻转向
  const far = stickState(o, { x: 100 + STICK.radius * 3, y: 100 });
  assert.equal(far.origin.x, 100 + STICK.radius * 2);
  assert.ok(stickState(far.origin, { x: far.origin.x - 30, y: 100 }).move.x < 0);
});
