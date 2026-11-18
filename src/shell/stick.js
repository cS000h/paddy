// 触屏摇杆的手感：手指拖出去的位移 → 走路的方向和快慢。纯运算，不碰浏览器，测试里能直接算。
//
// 原来的摇杆按 x、y 各自去掉一小段（各 0.25），斜着推时一个方向会突然归零，人走得一顿一顿；
// 推得浅走得慢，又要推满才走得快。现在：
//   - 只看拖出去多远（不分 x、y），离按下的点不到 DEAD 当作没推，方向不会乱跳；
//   - 推到 FULL 就是全速，不用推满；中间平滑过渡；
//   - 手指拖出圈外时，圈跟着手指挪（FOLLOW），往回一拉马上就能转向。

export const STICK = Object.freeze({
  radius: 56, // 圈的半径（画面上的像素）
  dead: 0.14, // 推不到这么远（按半径算）当作没推
  full: 0.62, // 推到这么远就是全速
});

/**
 * 摇杆这一刻的状态。
 * @param {{x: number, y: number}} origin 圈心（画面坐标）
 * @param {{x: number, y: number}} finger 手指（画面坐标）
 * @returns {{move: {x: number, y: number}, origin: {x: number, y: number}, knob: {x: number, y: number}}}
 *   move 是走路的方向向量（长度 0–1）；origin 是挪过之后的圈心；knob 是钮相对圈心的位移。
 */
export function stickState(origin, finger, { radius, dead, full } = STICK) {
  let dx = finger.x - origin.x;
  let dy = finger.y - origin.y;
  let length = Math.hypot(dx, dy);
  let center = origin;
  if (length > radius) {
    // 拖出圈外：圈心朝手指挪，让手指正好在圈边上
    const over = length - radius;
    center = { x: origin.x + (dx / length) * over, y: origin.y + (dy / length) * over };
    dx = finger.x - center.x;
    dy = finger.y - center.y;
    length = radius;
  }
  const push = length / radius;
  const knob = { x: dx, y: dy };
  if (push < dead) return { move: { x: 0, y: 0 }, origin: center, knob };
  // 一推就走（起步三成半的速度），越推越快，到 full 是全速；中间用平滑的曲线，不会一下子窜出去
  const t = Math.min(1, (push - dead) / (full - dead));
  const speed = 0.35 + 0.65 * t * t * (3 - 2 * t);
  return { move: { x: (dx / length) * speed, y: (dy / length) * speed }, origin: center, knob };
}
