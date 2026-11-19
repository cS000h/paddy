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

// 玩家演出和乡邻做活共用这一处换帧。位置、朝向和脚底排序在交出人物的同一帧确定。
export function playBody(sprite, info, actor, dir, times = 1) {
  return placeAction(sprite, info, dir)
    .setPosition(Math.round(actor.px), Math.round(actor.py))
    .setDepth(actor.py)
    .setVisible(true)
    .play(times > 1 ? { key: info.key, repeat: times - 1 } : info.key);
}
export function supportedAct(map, tile, act) {
  if (act !== 'sit' && act !== 'sip') return act;
  if (map.objects.some(([kind, x, y]) => kind === 'stool' && x === tile.x && y === tile.y))
    return act;
  return act === 'sit' ? 'shadeEyes' : 'standSip';
}
