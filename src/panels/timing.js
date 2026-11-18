import { timingValue } from '../shell/timing.js';
// 掌火、钓鱼的刻度条。小游戏的时钟只改变外壳指针；确认时才把刻度交给规则结算。
export function animateTiming(root, shell) {
  let live = true;
  function frame(now) {
    if (!live) return;
    const m = shell.get().modal,
      needle = root.querySelector('[data-timing]');
    if (needle && m?.started !== undefined) {
      const value = timingValue(now - m.started);
      needle.style.left = value + '%';
      if (m.kind === 'heat') {
        const art = root.querySelector('[data-cook-heat]');
        const pose = String(Math.round((value * 7) / 100));
        if (art && art.style.getPropertyValue('--pose') !== pose)
          art.style.setProperty('--pose', pose);
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return () => {
    live = false;
  };
}

/** 刻度条：指针走到青色一段（center ± half）时收手。 */
export const timingBar = (center, half) =>
  `<div class="timing"><span class="zone" style="left:${center - half}%;width:${half * 2}%"></span>` +
  '<i data-timing></i></div>';
