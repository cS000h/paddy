// 收到彩头（Gemini G-13）：大的五样举过头顶，照他的四帧：蓄力（往下一沉）、起身、定格 750 毫秒、收回；
// 四周只点几粒淡墨，不加金光。小的捧在胸前看一眼：东西在人跟前冒一下就收。
// 跟前（六格内）有村民的，他头顶冒个惊叹、底下说一句（content/prizes.js 的 say）；没人就只有收到时那句。
import { ITEMS } from '../content/items.js';
import { PRIZES } from '../content/prizes.js';
import { PEOPLE } from '../content/people.js';
import { prizeIcon } from '../art/index.js';
import { P } from '../art/palette.js';
import { gridToCanvas } from './textures.js';
import { showEmote } from './emotes.js';
import { DEPTH } from './depth.js';

const NEAR = 6 * 16;
const HOLD = 750;

function texture(scene, id) {
  const key = 'prize:' + id;
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, gridToCanvas(prizeIcon(id)));
  return key;
}

/** 几粒淡墨从东西四周溅开、淡掉。 */
function inkDots(scene, x, y) {
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const dot = scene.add.rectangle(x, y, 2, 2, P.ink3 & 0xffffff).setDepth(DEPTH.emote - 1);
    scene.tweens.add({
      targets: dot,
      x: x + Math.cos(a) * 14,
      y: y + Math.sin(a) * 10,
      alpha: 0,
      duration: 620,
      ease: 'Cubic.easeOut',
      onComplete: () => dot.destroy(),
    });
  }
}

/** 跟前最近的、对这样彩头有话说的村民。 */
function witness(scene, def) {
  const me = scene.player;
  let best = null;
  for (const v of scene.villagers) {
    if (!v.present || !def.say[v.id]) continue;
    const d = Math.hypot(v.px - me.px, v.py - me.py);
    if (d <= NEAR && (!best || d < best.d)) best = { v, d };
  }
  return best?.v || null;
}

export function showPrize(scene, item) {
  const id = ITEMS[item]?.prize;
  const def = PRIZES[id];
  if (!def) return;
  const me = scene.player;
  const { platform, shell } = scene.deps;
  const later = (ms, fn) => scene.time.delayedCall(ms, () => scene.guard(fn));
  const x = Math.round(me.px);
  const foot = Math.round(me.py);
  const thing = scene.add
    .image(x, foot + 2, texture(scene, id))
    .setDepth(DEPTH.emote - 1)
    .setAlpha(0);

  if (def.lift) {
    // 蓄力：人往下一沉；起身：抬手，东西升到头顶；定格；收回
    scene.tweens.add({ targets: me.sprite, scaleY: 0.92, duration: 160, yoyo: true });
    later(160, () => {
      me.setPose('raise');
      thing.setAlpha(1);
      scene.tweens.add({ targets: thing, y: foot - 32, duration: 200, ease: 'Back.easeOut' });
    });
    later(380, () => {
      inkDots(scene, x, foot - 32);
      platform.audio.play('fine');
    });
    later(360 + HOLD, () => {
      scene.tweens.add({ targets: thing, y: foot - 24, alpha: 0, duration: 260 });
      me.setPose(null);
    });
  } else {
    scene.tweens.add({
      targets: thing,
      alpha: 1,
      y: foot - 2,
      duration: 200,
      ease: 'Back.easeOut',
    });
    later(200 + HOLD, () => scene.tweens.add({ targets: thing, alpha: 0, duration: 260 }));
  }
  later(1600, () => thing.destroy());

  const v = witness(scene, def);
  if (!v) return;
  later(400, () => showEmote(scene, v, 'exclaim'));
  later(900, () => shell.toast(`${PEOPLE[v.id].name}：“${def.say[v.id]}”`, true));
}
