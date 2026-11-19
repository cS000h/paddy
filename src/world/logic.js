// 世界里不依赖画面的算法：寻路、面前是哪一格、点一下该做什么。
// 这个文件不引用 Phaser，也不碰浏览器，所以能在 Node 里直接测试。
import { TOOLS, SOIL, isRipe } from '../content/items.js';

export const TILE = 16;
export const STEP = Object.freeze({
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
});

/** 像素坐标 → 所在的格子。 */
export const tileOf = (px, py) => ({ x: Math.floor(px / TILE), y: Math.floor(py / TILE) });

/** 站在 (x, y)、面朝 dir 时，面前的那一格。 */
export const facing = (x, y, dir) => ({ x: x + STEP[dir][0], y: y + STEP[dir][1] });

/** 从 a 看 b 在哪个方向（取差得多的那一边）。 */
export function dirTo(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy >= 0 ? 'down' : 'up';
}

/**
 * 寻路（四方向 A*）。walk(x, y) 说这一格能不能走。
 * 返回从起点之后到终点的一串格子；起点就是终点返回 []；走不到返回 null。
 */
export function findPath(walk, from, to, limit = 4000) {
  if (from.x === to.x && from.y === to.y) return [];
  if (!walk(to.x, to.y)) return null;
  const key = (x, y) => x + ',' + y;
  const open = [{ x: from.x, y: from.y, g: 0, f: 0 }];
  const came = new Map();
  const cost = new Map([[key(from.x, from.y), 0]]);
  for (let visited = 0; open.length && visited < limit; visited++) {
    let best = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[best].f) best = i;
    const current = open.splice(best, 1)[0];
    if (current.x === to.x && current.y === to.y) {
      const path = [];
      for (let k = key(to.x, to.y); came.has(k); k = came.get(k)) {
        const [x, y] = k.split(',').map(Number);
        path.unshift({ x, y });
      }
      return path;
    }
    for (const [dx, dy] of Object.values(STEP)) {
      const x = current.x + dx;
      const y = current.y + dy;
      if (!walk(x, y)) continue;
      const g = current.g + 1;
      if (g >= (cost.get(key(x, y)) ?? Infinity)) continue;
      cost.set(key(x, y), g);
      came.set(key(x, y), key(current.x, current.y));
      open.push({ x, y, g, f: g + Math.abs(x - to.x) + Math.abs(y - to.y) });
    }
  }
  return null;
}

/**
 * 要对 target 这一格做事，该站到哪儿：它四周能走、离 from 最近的一格。
 * 返回 {x, y, dir, path}（dir 是站好之后要面朝的方向）；四周都站不了返回 null。
 */
export function standBeside(walk, from, target) {
  let best = null;
  for (const [dir, [dx, dy]] of Object.entries(STEP)) {
    const x = target.x - dx;
    const y = target.y - dy;
    if (!walk(x, y)) continue;
    const path = findPath(walk, from, { x, y });
    if (path && (!best || path.length < best.path.length)) best = { x, y, dir, path };
  }
  return best;
}

/**
 * 侧着身对着 target 做活，站哪一格：它左边或右边能走的那格，离人近的优先。
 * 返回 {x, y, face, path}；两边都站不了就原地，朝着它那一侧。
 */
export function sideSpot(walk, from, target) {
  let best = null;
  for (const [dx, face] of [
    [-1, 'right'],
    [1, 'left'],
  ]) {
    const spot = { x: target.x + dx, y: target.y };
    if (!walk(spot.x, spot.y)) continue;
    const path = findPath(walk, from, spot);
    if (path && (!best || path.length < best.path.length)) best = { ...spot, face, path };
  }
  return best || { ...from, face: target.x < from.x ? 'left' : 'right', path: [] };
}

// 自动农具由地块决定，缺水或行囊满时仍能告诉玩家原本想做什么。
export function fieldTool(plot) {
  if (!plot) return 'hoe';
  if (plot.crop && isRipe(plot.crop, plot.age)) return 'hand';
  if (plot.water < SOIL.wet) return 'can';
  if (!plot.crop) return 'seed';
  return plot.water < SOIL.moist ? 'can' : null;
}

/** 工具 → 对应的命令。 */
export const COMMAND_OF = Object.freeze({
  hoe: 'farm.till',
  seed: 'farm.sow',
  can: 'farm.water',
  hand: 'farm.harvest',
});

export const toolName = id => TOOLS.find(t => t.id === id)?.name || id;
export const toolVerb = id => TOOLS.find(t => t.id === id)?.verb || id;

/** 一天里某一分钟的天色（正片叠底盖在画面上）。清晨偏暖，白天不染，傍晚橘，入夜青蓝。 */
export function skyTint(minute) {
  const stops = [
    [0, [150, 165, 205]],
    [330, [150, 165, 205]],
    [390, [255, 232, 214]],
    [480, [255, 255, 255]],
    [990, [255, 255, 255]],
    [1110, [255, 220, 184]],
    [1200, [196, 190, 220]],
    [1320, [150, 165, 205]],
    [1440, [128, 144, 190]],
  ];
  let i = 0;
  while (i < stops.length - 2 && minute >= stops[i + 1][0]) i++;
  const [m0, c0] = stops[i];
  const [m1, c1] = stops[i + 1];
  const t = Math.max(0, Math.min(1, (minute - m0) / (m1 - m0)));
  const hex = c0.map((v, k) =>
    Math.round(v + (c1[k] - v) * t)
      .toString(16)
      .padStart(2, '0'),
  );
  return '#' + hex.join('');
}
