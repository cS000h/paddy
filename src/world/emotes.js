import { DEPTH } from './depth.js';
// 人头顶冒的小记号（贴图见 art/emotes.js）：不同心情配不同动法，弹出来、停一会儿、淡掉。
const HOLD = 1400;

const FLOAT_UP = new Set(['heart', 'flower', 'star', 'coin', 'note', 'tea', 'zzz']);
const SHAKE = new Set(['exclaim', 'anger']);

/** 在 actor 头顶冒一个记号；同一个人头上一次只冒一个。 */
export function showEmote(scene, actor, kind) {
  if (!kind || !scene.textures.exists('emote:' + kind)) return;
  actor.emote?.destroy();
  const bx = Math.round(actor.px);
  const by = Math.round(actor.py) - 31;
  const image = scene.add
    .image(bx, by, 'emote:' + kind)
    .setOrigin(0.5, 1)
    .setDepth(DEPTH.emote)
    .setScale(0.3);
  actor.emote = image;
  scene.tweens.add({ targets: image, scale: 1, duration: 170, ease: 'Back.easeOut' });
  if (FLOAT_UP.has(kind)) {
    scene.tweens.add({
      targets: image,
      y: by - 5,
      duration: HOLD,
      ease: 'Sine.easeOut',
    });
  } else if (SHAKE.has(kind)) {
    scene.tweens.add({
      targets: image,
      x: bx + 2,
      duration: 60,
      yoyo: true,
      repeat: 3,
    });
  } else if (kind === 'sweat') {
    scene.tweens.add({
      targets: image,
      y: by + 3,
      duration: HOLD,
      ease: 'Sine.easeIn',
    });
  }
  scene.tweens.add({
    targets: image,
    alpha: 0,
    delay: HOLD,
    duration: 280,
    onComplete: () => {
      if (actor.emote === image) actor.emote = null;
      image.destroy();
    },
  });
}
