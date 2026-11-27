// 路口的去向牌：走到路口两三格以内，路牌上方浮出一块小牌，写着这条路通到哪儿（地图数据里的 label）。
// 只是画面上的提示，规则不知道。门（进屋那种）不挂牌。
import { exitsOf } from './travel.js';
import { DEPTH } from './depth.js';

const SHOW_WITHIN = 3; // 离路牌几格以内浮出来

export function createSignposts(scene) {
  const labels = exitsOf(scene.map)
    .filter(e => e.wide && e.door.label)
    .map(e => {
      const text = scene.add
        .text(e.x * 16 + 8, e.y * 16 - 10, e.door.label, {
          fontFamily: "'Dao Serif', serif",
          fontSize: '9px',
          color: '#2f2a24',
          backgroundColor: 'rgba(250,247,238,0.86)',
          padding: { x: 3, y: 1 },
        })
        .setOrigin(0.5, 1)
        .setResolution(4)
        .setDepth(DEPTH.emote - 1)
        .setAlpha(0);
      return { e, text };
    });

  function frame() {
    const t = scene.player?.tile;
    if (!t) return;
    for (const { e, text } of labels) {
      const far = Math.max(Math.abs(t.x - e.x), Math.abs(t.y - e.y));
      const want = far <= SHOW_WITHIN ? 1 : 0;
      if (text.alpha !== want) text.setAlpha(text.alpha + Math.sign(want - text.alpha) * 0.1);
      if (Math.abs(text.alpha - want) < 0.05) text.setAlpha(want);
    }
  }

  function destroy() {
    for (const { text } of labels) text.destroy();
  }

  return { frame, destroy };
}
