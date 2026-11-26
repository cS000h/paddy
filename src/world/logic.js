import { daylight } from '../art/daylight.js';
// 世界里不依赖画面的算法：寻路、面前是哪一格、点一下该做什么。
// 这个文件不引用 Phaser，也不碰浏览器，所以能在 Node 里直接测试。
import { TOOLS, SOIL, isRipe } from '../content/items.js';
import { routeTo, walkable, groundAt } from '../content/maps/index.js';

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
export function findPath(walk, from, to, limit = 4000, toll = null) {
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
      const g = current.g + 1 + (toll ? toll(x, y) : 0);
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
 * 村民寻路时锄过、种上的地记多少步：能绕就绕，老农不会从人家刚种的菜畦上踩过去（G-14 图 07）；
 * 实在没别的路才踩。只看眼前这张图（别的图上的地画面里也没有）；没有地是 null。
 */
export function plotToll(scene, map) {
  const plots = scene.map === map ? scene.plots : null;
  return plots?.size ? (x, y) => (plots.has(x + ',' + y) ? 8 : 0) : null;
}

/**
 * 侧着身对着 target 做活，站哪一格：它左边或右边能走的那格，离人近的优先。
 * 返回 {x, y, face, path}；两边都站不了就原地，朝着它那一侧。
 */
export function sideSpot(walk, from, target, toll = null) {
  let best = null;
  for (const [dx, face] of [
    [-1, 'right'],
    [1, 'left'],
  ]) {
    const spot = { x: target.x + dx, y: target.y };
    if (!walk(spot.x, spot.y)) continue;
    const path = findPath(walk, from, spot, 4000, toll);
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

/**
 * 镜头放大几倍、能在世界里走到哪一块。一屏横着至少看 22 格、竖着至少 13 格，进到一个地方
 * 一眼看得出它的样子（以前 17×10，屋外只看得见人周围一小圈，地图显得空）。
 * 屋外的地图不让镜头看出地图的边，不够就放大一档；屋里小，看得比屋子大时屋子摆在正中，四周留白。
 * @param {number} width 画面宽（像素）
 * @param {number} height 画面高
 * @param {{width: number, height: number, indoor?: boolean}} map
 * @returns {{zoom: number, bounds: [number, number, number, number]}} bounds 是镜头的边界 x, y, w, h
 */
export function fitView(width, height, map) {
  const fits = Math.floor(Math.min(width / (22 * TILE), height / (13 * TILE)));
  let zoom = Math.max(2, Math.min(6, fits));
  const mw = map.width * TILE;
  const mh = map.height * TILE;
  if (!map.indoor) zoom = Math.max(zoom, Math.ceil(width / mw), Math.ceil(height / mh));
  const vw = Math.ceil(width / zoom);
  const vh = Math.ceil(height / zoom);
  const x = Math.min(0, Math.floor((mw - vw) / 2));
  const y = Math.min(0, Math.floor((mh - vh) / 2));
  return { zoom, bounds: [x, y, Math.max(mw, vw), Math.max(mh, vh)] };
}

export const skyTint = minute => daylight(minute).tint;

/**
 * 村民离开这张图时往哪儿走（从别处来时反过来，从这儿走进来）：
 * 去得到的地方，走到路上第一块路牌或门口；回家（to 为 null），有自家的门就走到门口，
 * 没有就走到离 near 最近的路牌。这张图上一个出口都没有时是 null。
 * @param {{id: string, objects: any[]}} map
 * @param {string|null} to 要去（或来自）哪张图
 * @param {string} who 这个人的 id，找自家的门用
 * @param {{x: number, y: number}} near
 */
export function exitToward(map, to, who, near) {
  const legs = to && to !== map.id ? routeTo(map.id, to) : null;
  if (legs?.length) return { x: legs[0].door.x, y: legs[0].door.y };
  let best = null;
  for (const [kind, x, y, data] of map.objects) {
    if (kind === 'house.' + who) return { x, y: y + 1 };
    if (kind !== 'route' || !data?.to) continue;
    const d = Math.abs(x - near.x) + Math.abs(y - near.y);
    if (!best || d < best.d) best = { x, y, d };
  }
  return best && { x: best.x, y: best.y };
}

// 钓竿侧面帧的浮漂离脚底约三格。只有这一端确实落在水里的岸位才可下竿。
export function bankSpot(map, from, station) {
  const walk = (x, y) => walkable(map, x, y);
  let best = null;
  for (const [dx, dy] of Object.values(STEP)) {
    const spot = { x: station.x + dx, y: station.y + dy };
    if (!walk(spot.x, spot.y)) continue;
    for (const sign of [-1, 1]) {
      const water = { x: spot.x + sign * 3, y: spot.y };
      if (groundAt(map, water.x, water.y).id !== 'water') continue;
      const path = findPath(walk, from, spot);
      if (path && (!best || path.length < best.path.length))
        best = { ...spot, path, water, face: sign < 0 ? 'left' : 'right' };
    }
  }
  return best;
}
