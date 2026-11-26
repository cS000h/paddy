// 彩头留下的痕迹（G-13）：院里的南瓜王、长凳上的一碟双黄蛋、渡口的红鲤水影、半山凉亭的一碗明前茶。
// 摆在哪、今天在不在都问规则（查询 prize.traces），这里只照着摆；红鲤水影贴着水面、八成透明。
import { prizeTrace } from '../art/index.js';
import { gridToCanvas } from './textures.js';
import { DEPTH } from './depth.js';
import { TILE } from './logic.js';

export function createPrizeTraces(scene) {
  const sprites = new Map();

  function texture(trace) {
    const key = 'trace:' + trace;
    if (!scene.textures.exists(key)) scene.textures.addCanvas(key, gridToCanvas(prizeTrace(trace)));
    return key;
  }

  function sync() {
    const list = scene.map.indoor ? [] : scene.deps.game.ask('prize.traces', scene.map.id);
    const keep = new Set(list.map(t => t.id));
    for (const [id, s] of sprites)
      if (!keep.has(id)) {
        s.destroy();
        sprites.delete(id);
      }
    for (const t of list) {
      if (sprites.has(t.id)) continue;
      const bottom = t.y * TILE + 14;
      const sprite = scene.add
        .image(t.x * TILE + 8, bottom, texture(t.trace))
        .setOrigin(0.5, 1)
        .setDepth(t.faint ? DEPTH.ripple + 1 : bottom + 1)
        .setAlpha(t.faint ? 0.3 : 1);
      sprites.set(t.id, sprite);
    }
  }

  return { sync };
}
