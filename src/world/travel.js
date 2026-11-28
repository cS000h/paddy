// 走到路口就上路：不用对准路牌那一格，路口那一截路（路牌所在的一排，加上两边各一格）都算，
// 只要手上还在往地图外头推（摇杆或方向键）。门（look 是 door）还是只认门口那一格。
// 刚到一张地图时可能就站在路口边上，要先离开路口那一截，再走回来才算。
import { actAt } from '../content/maps/index.js';

const exitCache = new WeakMap();

/** 路牌朝地图哪一边出去：离哪条边最近就是哪边。 */
function sideOf(map, x, y) {
  const d = { west: x, east: map.width - 1 - x, north: y, south: map.height - 1 - y };
  return Object.keys(d).reduce((a, b) => (d[b] < d[a] ? b : a));
}
const OUT = { west: [-1, 0], east: [1, 0], north: [0, -1], south: [0, 1] };

/** 这张地图上的出口：[{x, y, door, out: [dx, dy], wide}]。 */
export function exitsOf(map) {
  if (!exitCache.has(map)) {
    const list = [];
    for (const [, x, y] of map.objects) {
      const door = actAt(map, x, y);
      if (!door?.to || door.act !== 'travel') continue;
      const wide = door.look !== 'door' && !map.indoor;
      list.push({ x, y, door, out: OUT[sideOf(map, x, y)], wide });
    }
    exitCache.set(map, list);
  }
  return exitCache.get(map);
}

/** 站在 tile 上算不算到了某个路口：路牌那格，或者横着路的左右各一格、往里一格。 */
export function exitAt(map, tile) {
  for (const e of exitsOf(map)) {
    if (tile.x === e.x && tile.y === e.y) return e;
    if (!e.wide) continue;
    const [ox, oy] = e.out;
    const along = (tile.x - e.x) * ox + (tile.y - e.y) * oy; // 往外为正
    const across = Math.abs((tile.x - e.x) * oy) + Math.abs((tile.y - e.y) * ox);
    if (along >= -1 && along <= 0 && across <= 1) return e;
  }
  return null;
}

/** 每一帧调用。move：这一帧摇杆或方向键的方向（没在走就是 0）。 */
export function leaveByRoad(scene, move) {
  const exit = exitAt(scene.map, scene.player.tile);
  if (!exit) {
    scene.roadArmed = true;
    return;
  }
  if (!move || (!move.x && !move.y) || !scene.roadArmed || scene.busy) return;
  // 站在路牌那一格：往哪推都走（和原来一样）；站在旁边那几格：得往地图外头推
  const onSign = scene.player.tile.x === exit.x && scene.player.tile.y === exit.y;
  if (!onSign && move.x * exit.out[0] + move.y * exit.out[1] < 0.3) return;
  scene.roadArmed = false;
  scene.player.face(scene.player.dir);
  scene.send('travel', exit.door);
}
