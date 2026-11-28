// 测试里搭场景用的小工具。规则测试一律通过端口发命令，不直接改世界的数据。
import assert from 'node:assert/strict';
import { createGame } from '../src/port/game.js';
import { bestLog } from '../src/sim/cook-fire.js';
import { LEVELS } from '../src/content/growth.js';
import { MAPS, walkable } from '../src/content/maps/index.js';

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

/**
 * 填落脚单。没给的几项用一户「看守老院」的人家：旧镰（农桑庄户）、家里老辈行船（沉稳）、自己热络、
 * 跟桂嫂有旧。缘由换成别的时，旧交情跟着缘由走（没锁死的给桂嫂）。
 */
export function settle(game, sheet = {}) {
  const reason = sheet.reason ?? 'keeper';
  const friend = { oldfriend: 'shi', rest: 'yun' }[reason] ?? 'gui';
  return must(game, 'origin.settle', {
    reason,
    keepsake: 'sickle',
    family: 'boat',
    own: 'gregarious',
    friend,
    ...sheet,
  });
}

/** 亲自掌火、样样按在正当时的记录：先问这一锅的节拍，再照着按（炒三拍、炖守火、烤翻面全中）。 */
export const bestFire = (game, input) =>
  bestLog(game.ask('cook.preview', { ...input, log: null }).plan);

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

/**
 * 照名字找地图上那件东西跟前能站的一格（先下面、再左右、再上面），面朝它。
 * match 是工位名（station: 'wood'）或物件种类（'stove'），工位名先认。地图挪了东西，测试不用跟着改坐标。
 */
export function near(mapId, match) {
  const map = MAPS[mapId];
  const row =
    map.objects.find(([, , , o]) => o?.station === match) || map.objects.find(([k]) => k === match);
  assert.ok(row, `${mapId} 上没有 ${match}`);
  const [, x, y] = row;
  for (const [dx, dy, dir] of [
    [0, 1, 'up'],
    [-1, 0, 'right'],
    [1, 0, 'left'],
    [0, -1, 'down'],
  ])
    if (walkable(map, x + dx, y + dy)) return Object.freeze({ x: x + dx, y: y + dy, dir });
  assert.fail(`${mapId} 的 ${match} 跟前站不了人`);
}

/** 地图上一个有名字的位置（作息、开局用的那些），照 near 的样子给 {x, y, dir}。 */
export function spotOf(mapId, name) {
  const [x, y, dir] = MAPS[mapId].spots[name];
  return Object.freeze({ x, y, dir });
}

/** 站在自家院子里（橱柜、灶台都在这儿）：开局站的那一格。 */
export const HOME = spotOf('yard', 'start');
/** 院里的灶、水缸、木墩、鸡窝，林边的枯木，屋里的橱柜、衣镜跟前。 */
export const STOVE = near('yard', 'stove');
export const VAT = near('yard', 'vat');
export const WORKBENCH = near('yard', 'workbench');
export const COOP = near('yard', 'coop');
/** 桃树下的长凳：歇脚、看天色。 */
export const BENCH = near('yard', 'rest');
export const WOOD = near('yard', 'wood');
export const CUPBOARD = near('cottage', 'cupboard');
export const MIRROR = near('cottage', 'dresser');

/** 顺着路牌走到相邻的一张地图（要和当前地图直接相连）。 */
export function travel(game, to) {
  const map = MAPS[game.ask('hero').map];
  const row = map.objects.find(o => o[3]?.to === to);
  assert.ok(row, `${map.id}没有去${to}的出口`);
  const [, x, y] = row;
  const [dx, dy] = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ].find(([dx, dy]) => walkable(map, x + dx, y + dy));
  must(game, 'travel', { x, y, at: { x: x + dx, y: y + dy, dir: 'up' } });
  assert.equal(game.ask('hero').map, to);
}

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

/**
 * 存档里把主角某门本事的经验改到离第 level 级只差 1 点（off 给 0 就是刚到这一级），读回来一局新的：升级曲线拉长以后，
 * 测「到了几级有什么好处」不必真的干上几十天活。只经过存档，不碰世界的数据结构。
 */
export function nearLevel(game, skill, level, off = -1) {
  const saved = JSON.parse(JSON.stringify(game.save()));
  const hero = saved.state.world.player?.controls ?? 'hero';
  saved.state.world.growth[hero].xp[skill] = LEVELS[level] + off;
  return createGame({ saved, debug: true });
}

/** 存档里往家里添些东西，读回来一局新的（测吃喝时不必先种、先买）。只经过存档。 */
export function stocked(game, items) {
  const saved = JSON.parse(JSON.stringify(game.save()));
  const home = saved.state.world.households.home.items;
  for (const [k, n] of Object.entries(items)) home[k] = (home[k] || 0) + n;
  return createGame({ saved, debug: true });
}

/** 去溪边竹林砍一回竹子再回院里（院外北林的竹林挪走以后，竹篾得上溪边拿）。 */
export function fetchBamboo(game) {
  travel(game, 'creek');
  must(game, 'gather', { id: 'bamboo', at: near('creek', 'bamboo') });
  travel(game, 'yard');
}
