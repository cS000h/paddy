// 小屋里的六处摆设：问规则（查询 decor）每处摆的哪样，照着换那副样子（art/furniture.js）。
// 原样就用地图数据里写的那副（饭桌是木方桌，其余是平常的样子）。换样子的办法和摊棚一样（scene.dress）。
import { setLook } from './stalls.js';

export function syncDecor(scene) {
  if (scene.map.id !== 'cottage') return;
  const decor = scene.deps.game.ask('decor');
  for (const d of Object.values(decor)) {
    const s = scene.scenery.find(x => x.kind === d.object);
    if (!s) continue;
    s.base ??= s.look;
    setLook(scene, s, d.on === 'default' ? s.base : d.on);
  }
}

/** 屋里的竹碗架：干净的碗盘晾在上面，没有就空着，一两三只、四只往上各一副样子（只是画面，碗盘归规则管）。 */
export function syncRack(scene) {
  const rack = scene.scenery.find(x => x.kind === 'dishRack');
  if (!rack) return;
  const clean = Object.values(scene.deps.game.ask('table').ware.clean).reduce((a, b) => a + b, 0);
  setLook(scene, rack, clean === 0 ? 'empty' : clean <= 3 ? 'some' : 'full');
}
