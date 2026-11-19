// 就近对准与人物防穿身挡路：
// 1. 不必死板正对目标：先查面朝那一格，没东西时自动就近吸住周围一圈的村民、过客、小事、物件或菜地。
// 2. 防穿身：玩家走路和寻路都会避开站着的村民和过客，且允许从重叠处往外走，绝不会把人卡死。
import { farmable, waterSource, actAt } from '../content/maps/index.js';
import { facing } from './logic.js';
import { decorAt } from './interactions.js';

const SIDE_ORDER = {
  down: [
    [1, 0],
    [-1, 0],
    [0, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ],
  up: [
    [-1, 0],
    [1, 0],
    [0, 1],
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ],
  left: [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 1],
    [-1, -1],
    [1, 1],
    [1, -1],
  ],
  right: [
    [0, 1],
    [0, -1],
    [-1, 0],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ],
};

const asPulse = pulse => ({ kind: 'pulse', pulse, x: pulse.x, y: pulse.y, rank: 5 });

function inspectTile(scene, x, y) {
  const person = scene.villagers.find(v => v.present && v.tile.x === x && v.tile.y === y);
  if (person) return { kind: 'person', person, x, y, rank: 6 };
  const visitor = scene.extras?.visitorAt(x, y);
  if (visitor) return { kind: 'visitor', visitor, x, y, rank: 6 };
  const pulse = scene.extras?.eventAt(x, y);
  if (pulse) return asPulse(pulse);
  const thing = actAt(scene.map, x, y);
  if (thing) return { kind: 'thing', thing, x, y, rank: 4 };
  if (waterSource(scene.map, x, y)) return { kind: 'water', x, y, rank: 3 };
  const decor = decorAt(scene, x, y);
  if (decor) return { kind: 'decor', decor, x, y, rank: 2 };
  if (farmable(scene.map, x, y)) return { kind: 'plot', x, y, rank: 1 };
  return null;
}

/** 面前有可互动目标优先取面前的；没有则自动在身边一圈挑最顺手的目标。 */
export function smartTarget(scene) {
  const here = scene.player.tile;
  const front = facing(here.x, here.y, scene.player.dir);
  const direct = inspectTile(scene, front.x, front.y);
  if (direct) return direct;

  let best = null;
  for (const [dx, dy] of SIDE_ORDER[scene.player.dir] || SIDE_ORDER.down) {
    const hit = inspectTile(scene, here.x + dx, here.y + dy);
    if (!hit) continue;
    // 只在正对方向没东西时，优先吸附四邻（上下左右），斜角只吸附人物与小事
    const diagonal = dx !== 0 && dy !== 0;
    if (diagonal && hit.rank < 5) continue;
    if (!best || hit.rank > best.rank) best = hit;
  }
  // 踩在小事上：面前、身边没有人时才轮到它。它要是排在面前那格前头，
  // 站在上面锄地、浇水、播种，每按一下都会先打开这件事。
  const under = scene.extras?.eventAt(here.x, here.y);
  if (under && (!best || best.rank < 5)) return asPulse(under);
  return best || { kind: 'plot', ...front };
}

function allActors(scene) {
  const list = scene.villagers.filter(v => v.present);
  const visitors = scene.extras?.allWalkers?.() || [];
  return [...list, ...visitors];
}

/** 玩家走到像素 (px, py) 时会不会和站着的村民或过客穿身；往外退开时始终放行。 */
export function blockedByActor(scene, px, py) {
  const curX = scene.player.px;
  const curY = scene.player.py;
  for (const a of allActors(scene)) {
    const nx = Math.abs(px - a.px);
    const ny = Math.abs(py - a.py);
    if (nx < 10 && ny < 7) {
      const nowDist = Math.hypot(curX - a.px, curY - a.py);
      const nextDist = Math.hypot(px - a.px, py - a.py);
      if (nextDist < nowDist) return true;
    }
  }
  return false;
}

/** 格子 (x, y) 上有没有站着其他村民或过客，寻路和选站位时避开它。 */
export function tileOccupied(scene, x, y, ignore = null) {
  for (const a of allActors(scene)) {
    if (a === ignore) continue;
    if (a.tile.x === x && a.tile.y === y) return true;
  }
  return false;
}
