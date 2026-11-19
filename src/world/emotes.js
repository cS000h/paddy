// 人头顶冒的小记号（贴图见 art/emotes.js）：弹出来、停一会儿、淡掉。人走动时记号跟着走（Walker.sync）。
const HOLD = 1400;

/** 在 actor 头顶冒一个记号；同一个人头上一次只冒一个。 */
export function showEmote(scene, actor, kind) {
  if (!kind) return;
  actor.emote?.destroy();
  const image = scene.add
    .image(Math.round(actor.px), Math.round(actor.py) - 31, 'emote:' + kind)
    .setOrigin(0.5, 1)
    .setDepth(9500)
    .setScale(0.3);
  actor.emote = image;
  scene.tweens.add({ targets: image, scale: 1, duration: 170, ease: 'Back.easeOut' });
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
