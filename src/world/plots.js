import { DEPTH } from './depth.js';
// 把规则里的田地画出来：翻过的土（干湿、和邻格拼成一片）、作物的阶段、长的草和生的虫。
import { TILE } from './logic.js';

/** 一格地四邻里哪几边也是翻过的地：上 1、右 2、下 4、左 8。 */
const maskOf = (has, x, y) =>
  (has.has(`${x},${y - 1}`) ? 1 : 0) |
  (has.has(`${x + 1},${y}`) ? 2 : 0) |
  (has.has(`${x},${y + 1}`) ? 4 : 0) |
  (has.has(`${x - 1},${y}`) ? 8 : 0);

function create(scene, p) {
  const bottom = (p.y + 1) * TILE;
  const at = (key, depth) =>
    scene.add
      .image(p.x * TILE, p.y * TILE, key)
      .setOrigin(0)
      .setDepth(depth)
      .setVisible(false);
  return {
    soil: at('soil:dry.0', DEPTH.soil).setVisible(true),
    // 草贴着土长，人走过去会盖住它；虫趴在叶子上，画在作物上面
    weeds: at('mark:weeds', DEPTH.weeds),
    crop: scene.add
      .image(p.x * TILE + 8, bottom - 2, 'crop:0')
      .setOrigin(0.5, 1)
      .setDepth(bottom - 3),
    bugs: at('mark:bugs', bottom - 2),
    stage: -2,
  };
}

export function refreshPlots(scene) {
  const list = scene.deps.game.ask('farm.plots', scene.map.id);
  const has = new Set(list.map(p => p.x + ',' + p.y));
  for (const [key, sprites] of scene.plots) {
    if (has.has(key)) continue;
    for (const part of ['soil', 'weeds', 'crop', 'bugs']) sprites[part].destroy();
    scene.plots.delete(key);
  }
  for (const p of list) {
    const key = p.x + ',' + p.y;
    if (!scene.plots.has(key)) scene.plots.set(key, create(scene, p));
    const sprites = scene.plots.get(key);
    sprites.soil.setTexture(`soil:${p.wet ? 'wet' : 'dry'}.${maskOf(has, p.x, p.y)}`);
    sprites.weeds.setVisible(p.weeds);
    sprites.bugs.setVisible(p.bugs);
    sprites.crop.setVisible(p.stage >= 0);
    if (p.stage >= 0) sprites.crop.setTexture('crop:' + p.crop + ':' + p.stage);
    if (p.stage > sprites.stage && sprites.stage !== -2) scene.effects.pop(sprites.crop);
    sprites.stage = p.stage;
  }
}
