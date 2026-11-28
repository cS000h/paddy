// 屋里饭桌上摆着的菜：桌上有几样就画几只碗，排在桌面上，冒一点热气的样子交给碗口那一圈白。
// 只是画面：摆几样、吃不吃由规则说了算（sim/plugins/table.js）。每帧问一回桌上有什么，变了才重摆。
import { bowl } from './held.js';
import { gridToCanvas } from './textures.js';
import { TILE } from './logic.js';

// 桌面上几只碗的位置：相对桌子那一格脚下中点（桌子往右多占半格），左右排开、前后错一点
const SPOTS = [
  [-1, -17],
  [8, -19],
  [17, -17],
  [12, -14],
];

export function createTableDishes(scene) {
  const { game } = scene.deps;
  const table = scene.map.objects.find(([, , , o]) => o?.dining);
  let key = '';
  let sprites = [];
  if (table && !scene.textures.exists('table:bowl'))
    scene.textures.addCanvas('table:bowl', gridToCanvas(bowl()));
  return {
    frame() {
      if (!table) return;
      const ids = game
        .ask('table')
        .dishes.map(d => d.id)
        .join(',');
      if (ids === key) return;
      key = ids;
      for (const s of sprites) s.destroy();
      const [, x, y] = table;
      const cx = (x + 0.5) * TILE,
        foot = (y + 1) * TILE;
      sprites = (ids ? ids.split(',') : []).map((_, i) =>
        scene.add
          .image(cx + SPOTS[i % SPOTS.length][0], foot + SPOTS[i % SPOTS.length][1], 'table:bowl')
          .setOrigin(0.5, 1)
          .setScale(0.75)
          .setDepth(foot + 0.08),
      );
    },
  };
}
