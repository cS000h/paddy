import { actSheet } from '../art/index.js';
import { gridToCanvas } from './textures.js';

/** 一个动作的贴图和动画（第一次用到时才画）；返回 {key, w, h, ax, ay, frames, fps, loop}。 */
export function actionTexture(scene, name, look) {
  const key = `act:${name}:${look}`;
  const known = scene.registry.get(key);
  if (known && scene.textures.exists(key)) return known;
  const s = actSheet(name, look);
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const texture = scene.textures.addCanvas(key, gridToCanvas(s.grid));
  for (let f = 0; f < s.frames; f++) texture.add(f, 0, f * s.w, 0, s.w, s.h);
  if (scene.anims.exists(key)) scene.anims.remove(key);
  scene.anims.create({
    key,
    frames: Array.from({ length: s.frames }, (_, frame) => ({ key, frame })),
    frameRate: s.fps,
    repeat: s.loop ? -1 : 0,
  });
  const info = { key, w: s.w, h: s.h, ax: s.ax, ay: s.ay, frames: s.frames, fps: s.fps };
  scene.registry.set(key, info);
  return info;
}

// 动作条为持物的手留了空白；侧身翻面时，脚底锚点要一起翻过去。
export function placeAction(sprite, sheet, dir) {
  const left = dir === 'left';
  return sprite
    .setTexture(sheet.key, 0)
    .setOrigin(left ? 1 - sheet.ax / sheet.w : sheet.ax / sheet.w, sheet.ay / sheet.h)
    .setFlipX(left);
}
