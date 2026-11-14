import { timingValue } from '../shell/timing.js';
// 小游戏的时钟只改变外壳指针；确认时才把刻度交给规则结算。
export function animateTiming(root, shell) {
  let live = true;
  function frame(now) {
    if (!live) return;
    const m = shell.get().modal,
      needle = root.querySelector('[data-timing]');
    if (needle && m?.started !== undefined) needle.style.left = timingValue(now - m.started) + '%';
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return () => {
    live = false;
  };
}
