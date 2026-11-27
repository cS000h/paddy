// 院里修好的那几处（G-25 的图）：画在哪、挂架上挂什么都问规则（查询 yard.fixes），这里只照着摆。
// 图贴在那一格的脚下，32 宽的往右多占一格；挂架上的小图叠在横杆底下。
import { yardFixArt } from '../art/index.js';
import { gridToCanvas } from './textures.js';
import { TILE } from './logic.js';

// 挂架那张图里横杆下面那块空处（左上角，像素）
const HANG_AT = Object.freeze({ x: 21, y: 5 });

export function createYardFixes(scene) {
  const sprites = new Map();

  function texture(name) {
    const key = 'yardfix:' + name;
    if (!scene.textures.exists(key)) scene.textures.addCanvas(key, gridToCanvas(yardFixArt(name)));
    return key;
  }

  function clear(id) {
    for (const s of sprites.get(id) || []) s.destroy();
    sprites.delete(id);
  }

  function sync() {
    const list = scene.map.indoor ? [] : scene.deps.game.ask('yard.fixes', scene.map.id);
    const want = new Map(list.map(f => [f.id, f.art + '|' + (f.hang || '')]));
    for (const id of [...sprites.keys()]) if (sprites.get(id).sig !== want.get(id)) clear(id);
    for (const f of list) {
      if (sprites.has(f.id)) continue;
      const left = f.x * TILE;
      const bottom = (f.y + 1) * TILE;
      const main = scene.add
        .image(left, bottom, texture(f.art))
        .setOrigin(0, 1)
        // 盖过原来那一格上的物件（篱笆、鸡窝）；彩头台垫在彩头底下
        .setDepth(f.id === 'platform' ? bottom - 3 : bottom + 0.2);
      const parts = [main];
      if (f.hang)
        parts.push(
          scene.add
            .image(left + HANG_AT.x, bottom - TILE + HANG_AT.y, texture(f.hang))
            .setOrigin(0, 0)
            .setDepth(bottom + 0.4),
        );
      parts.sig = want.get(f.id);
      sprites.set(f.id, parts);
    }
  }

  function destroy() {
    for (const id of [...sprites.keys()]) clear(id);
  }

  return { sync, destroy };
}
