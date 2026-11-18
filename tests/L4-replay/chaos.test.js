// L4 乱玩全部命令（玩家见 tests/chaos.js）。replay.test.js 守的是“行为有没有在不知情时变了”，
// 这里守的是韧性：
//   1. 像外壳那样拼输入，程序一次都不出错，查询随时都答得上，随时都睡得下（日子不会卡住）；
//   2. 存了读回来接着玩，和一直玩下去逐字节相同（没有不进存档的状态）；
//   3. 乱填的输入被挡在门口：被拒绝时世界不变，程序也不出错。
// “每条命令都真的做成过”放在慢的长局里查（long.test.js）：短局里少见的命令走不走得到，
// 随数值调整而变，放在这里会误报。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/port/game.js';
import { createChaos, askEverything } from '../chaos.js';

const SEEDS = [1, 2, 3];
const STEPS = 700;

/** 错误列成几行，失败时一眼看出是哪条命令、什么输入、哪一行。 */
const show = errors =>
  errors
    .slice(0, 5)
    .map(e => `${e.type}: ${e.message}\n    ${e.command}\n    ${e.stack}`)
    .join('\n');

test('乱玩全部命令：程序没出错，查询答得上，随时睡得下', () => {
  for (const seed of SEEDS) {
    const c = createChaos(seed);
    for (let i = 0; i < STEPS; i += 100) {
      c.run(100);
      assert.deepEqual(askEverything(c.game), [], `第 ${seed} 局有查询答不上来`);
      const copy = createGame({ saved: c.game.save() });
      const night = copy.dispatch('sleep', {});
      assert.ok(night.ok, `第 ${seed} 局第 ${i + 100} 步之后睡不下：${night.reason}`);
    }
    assert.deepEqual(c.errors, [], '程序出错了：\n' + show(c.errors));
    const tried = Object.keys(c.tally).length;
    assert.ok(tried >= 25, `第 ${seed} 局只试了 ${tried} 种命令，乱玩的人可能走不动了`);
  }
});

test('存了读回来接着玩，和一直玩下去逐字节相同', () => {
  for (const seed of SEEDS) {
    const c = createChaos(seed).run(300);
    const saved = JSON.parse(JSON.stringify(c.game.save()));
    const mark = c.log.length;
    c.run(300);
    const twin = createGame({ saved, debug: true });
    for (const [type, input] of c.log.slice(mark)) twin.dispatch(type, input);
    assert.equal(JSON.stringify(twin.save()), JSON.stringify(c.game.save()), `第 ${seed} 局`);
  }
});

test('乱填的输入挡在门口：被拒绝时世界不变，程序不出错', () => {
  for (const seed of [4, 5]) {
    const c = createChaos(seed, { hostile: 0.4 }).run(600);
    const { hostileErrors, unchangedOnRefusal } = c.stats();
    assert.equal(hostileErrors, 0, '乱填的输入让程序出错了：\n' + show(c.errors));
    assert.deepEqual(c.errors, [], show(c.errors));
    assert.ok(unchangedOnRefusal, '有被拒绝的命令改动了世界');
  }
  const g = createGame({ debug: true });
  for (const item of ['constructor', '__proto__', 'toString'])
    assert.equal(g.dispatch('eat', { item }).ok, false);
  assert.equal(g.dispatch('eat', { item: 'rice', extra: { constructor: 1 } }).ok, false);
  assert.equal(g.revision(), 0);
});
