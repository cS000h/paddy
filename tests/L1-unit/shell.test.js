// L1 外壳里不依赖浏览器的部分：输入意图、外壳状态、寻路和“点一下该做什么”。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createIntents } from '../../src/shell/intents.js';
import { createShellState } from '../../src/shell/state.js';
import {
  findPath,
  standBeside,
  bestTool,
  facing,
  dirTo,
  tileOf,
  skyTint,
} from '../../src/world/logic.js';
import { MAPS, walkable } from '../../src/content/maps/index.js';
import { newGame, must } from '../helpers.js';

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

test('点一下菜地该用哪件工具：空地锄、锄过的下种、种上的浇水、熟了的收', () => {
  const g = newGame();
  const at = { x: 6, y: 18, dir: 'down' };
  const why = (tool, x, y) => g.ask('farm.why', tool, x, y, at);
  const spot = { x: 6, y: 19, at };
  assert.equal(bestTool(why, 6, 19), 'hoe');
  must(g, 'farm.till', spot);
  assert.equal(bestTool(why, 6, 19), 'seed');
  must(g, 'farm.sow', spot);
  assert.equal(bestTool(why, 6, 19), 'can');
  must(g, 'farm.water', spot);
  assert.equal(bestTool(why, 6, 19), null, '今天没事可做了');
  for (let day = 0; day < 3; day++) {
    must(g, 'sleep');
    if (day < 2 && !g.ask('farm.why', 'can', spot.x, spot.y, spot.at)) must(g, 'farm.water', spot);
  }
  assert.equal(bestTool(why, 6, 19), 'hand');
});

test('小工具：格子换算、朝向、天色', () => {
  assert.deepEqual(tileOf(40, 31), { x: 2, y: 1 });
  assert.equal(dirTo({ x: 1, y: 1 }, { x: 4, y: 2 }), 'right');
  assert.equal(dirTo({ x: 1, y: 1 }, { x: 1, y: 0 }), 'up');
  assert.equal(skyTint(12 * 60), '#ffffff');
  assert.notEqual(skyTint(6 * 60), '#ffffff');
  assert.match(skyTint(23 * 60), /^#[0-9a-f]{6}$/);
});
