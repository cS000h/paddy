// 测试里搭场景用的小工具。规则测试一律通过端口发命令，不直接改世界的数据。
import assert from 'node:assert/strict';
import { createGame } from '../src/port/game.js';

/** 新开一局，写入检查总是开着。 */
export const newGame = (seed = 1) => createGame({ seed, debug: true });

/** 站在菜地左上角那一格的正上方，面朝下。菜地是 x 6–17、y 19–25。 */
export const FIELD = Object.freeze({
  x: 6,
  y: 19,
  at: Object.freeze({ x: 6, y: 18, dir: 'down' }),
});

/** 发一条必须成功的命令，返回它引起的事实类型。 */
export function must(game, type, input = {}) {
  const out = game.dispatch(type, input);
  const why = out.fault ? `${out.reason}（${out.detail}）` : out.reason;
  assert.equal(out.ok, true, `${type} 应该成功，却被拒绝：${why}`);
  return out.facts.map(f => f.type);
}

/** 发一条必须被拒绝的命令，返回拒绝的原因。 */
export function refused(game, type, input = {}) {
  const before = game.revision();
  const out = game.dispatch(type, input);
  assert.equal(out.ok, false, `${type} 应该被拒绝`);
  assert.equal(game.revision(), before, '被拒绝的命令不该改变世界');
  return out.reason;
}

/** 在菜地的一格上锄地、播种、浇水。 */
export function plant(game, spot = FIELD) {
  must(game, 'farm.till', spot);
  must(game, 'farm.sow', spot);
  must(game, 'farm.water', spot);
}

/** 根据土壤湿度照料一棵青菜，雨水也算浇灌。 */
export function growOne(game, spot = FIELD) {
  plant(game, spot);
  for (let day = 0; day < 12 && !plotAt(game, spot.x, spot.y).ripe; day++) {
    const p = game.ask('farm.detail', spot.x, spot.y);
    if (p.water > 26 && !p.drained) must(game, 'farm.care', { ...spot, kind: 'drain' });
    if (p.water < 14) must(game, 'farm.water', spot);
    must(game, 'sleep');
  }
  assert.ok(plotAt(game, spot.x, spot.y).ripe, '照料后的青菜应当成熟');
}

export const plotAt = (game, x, y) =>
  game.ask('farm.plots', 'yard').find(p => p.x === x && p.y === y);

/** 身上带着几份某样东西。 */
export const carried = (game, item) => game.ask('pack').items.find(i => i.id === item)?.n || 0;

/** 家里存着几份某样东西。 */
export const stored = (game, item) => game.ask('home').items.find(i => i.id === item)?.n || 0;

/** 站在自家院子里（橱柜、灶台都在这儿）。 */
export const HOME = Object.freeze({ x: 8, y: 11, dir: 'down' });

/** 站在水井左边，面朝水井。水井在 (18, 18)。 */
export const WELL = Object.freeze({
  x: 18,
  y: 18,
  at: Object.freeze({ x: 17, y: 18, dir: 'right' }),
});

/** 溪湾钓点（小院里）：站在它左边一格。 */
export const FISH_SPOT = Object.freeze({ x: 37, y: 20 });

/**
 * 钓一竿，手上功夫是满分的：看见咬钩就提（early 为真时偏要提早），遛鱼时鱼冲就松、不冲就按。
 * 返回最后一条命令的结果（没钩上就是提竿那一条）。bait 是 'worm' 或 null。
 */
export function fishOnce(game, at = FISH_SPOT, { bait = null, early = false } = {}) {
  must(game, 'fish.cast', { at, bait });
  const events = game.ask('fishing', at).bout.float.events;
  const bite = events.find(e => e.kind === 'bite');
  const t = !bite ? -1 : early ? Math.max(0, bite.at - 100) : bite.at + 20;
  const hook = game.dispatch('fish.hook', { at, t });
  if (!hook.ok || !hook.facts.some(f => f.type === 'fish.hooked')) return hook;
  const log = [];
  let holding = false;
  for (let ms = 0; ms <= 30000; ms += 50) {
    const s = game.ask('fish.fight', log, ms);
    if (s.done) break;
    if (s.running === holding) {
      holding = !s.running;
      log.push([ms, holding ? 1 : 0]);
    }
  }
  return game.dispatch('fish.land', { at, log });
}

/** 让时间过去 minutes 分钟（一次最多走两个钟头）。 */
export function wait(game, minutes) {
  for (let left = minutes; left > 0; left -= 120)
    must(game, 'clock.advance', { minutes: Math.min(120, left) });
}
