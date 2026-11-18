// 走到路口就上路：站上路牌那一格、手上还在往外推（摇杆或方向键），就沿路去下一张地图，
// 不用再对准路牌点一下。刚到一张地图时可能就站在路口边上，要先离开路口那一格，再走回来才算。
import { actAt } from '../content/maps/index.js';

/** 每一帧调用。pushing：这一帧有没有用摇杆或方向键在走。 */
export function leaveByRoad(scene, pushing) {
  const tile = scene.player.tile;
  const door = actAt(scene.map, tile.x, tile.y);
  if (!door?.to) {
    scene.roadArmed = true;
    return;
  }
  if (!pushing || !scene.roadArmed || scene.busy) return;
  scene.roadArmed = false;
  scene.player.face(scene.player.dir);
  scene.send('travel', door);
}
