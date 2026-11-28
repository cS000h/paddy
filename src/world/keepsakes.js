// 院里的成就摆件和稻穗纪念（G-31）：摆哪几件、在哪儿都问规则（查询 yard.keepsakes），这里只照着摆。
// 挂在正屋上的压在房子前面（房子的脚下在门那一格），放在地上的按脚下和人、物件前后遮挡。
import { keepsakeArt } from '../art/index.js';
import { gridToCanvas } from './textures.js';
import { TILE } from './logic.js';

// 正屋门那一格的脚下（content/maps/yard.js 的 house.hero 在第 9 行）
const HOUSE_FOOT = 10 * TILE;

export function createKeepsakes(scene) {
  const sprites = new Map();

  function texture(name) {
    const key = 'keepsake:' + name;
    if (!scene.textures.exists(key)) scene.textures.addCanvas(key, gridToCanvas(keepsakeArt(name)));
    return key;
  }

  function sync() {
    const list = scene.map.indoor ? [] : scene.deps.game.ask('yard.keepsakes', scene.map.id);
    const want = new Set(list.map(k => k.id));
    for (const [id, s] of sprites)
      if (!want.has(id)) {
        s.destroy();
        sprites.delete(id);
      }
    for (const k of list) {
      if (sprites.has(k.id)) continue;
      const s = scene.add
        .image(k.x, k.y, texture(k.art))
        .setOrigin(0, 1)
        .setDepth(k.wall ? HOUSE_FOOT + 0.3 : k.y + 0.2);
      sprites.set(k.id, s);
    }
  }

  function destroy() {
    for (const s of sprites.values()) s.destroy();
    sprites.clear();
  }

  return { sync, destroy };
}
