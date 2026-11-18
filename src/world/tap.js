// 点了世界里的一个位置（鼠标、手指轻点）：走过去；那儿有人、有物件、有地、有水，就做该做的事。
import { walkable, farmable, waterSource, actAt } from '../content/maps/index.js';
import { careNote } from '../shell/words.js';
import { tileOf, findPath, standBeside, bestTool } from './logic.js';

export function tapAt(scene, wx, wy) {
  const { game, shell, platform } = scene.deps;
  if (scene.busy || shell.paused()) return;
  platform.audio.unlock();
  const walk = (x, y) => walkable(scene.map, x, y);
  const from = scene.player.tile;
  const person = scene.villagers.find(
    v => v.sprite.visible && Math.abs(v.px - wx) < 9 && wy < v.py + 3 && wy > v.py - 28,
  );
  const tile = person ? person.tile : tileOf(wx, wy);
  const thing = !person && actAt(scene.map, tile.x, tile.y);
  const farm = !person && !thing && farmable(scene.map, tile.x, tile.y);
  const water = !person && !thing && waterSource(scene.map, tile.x, tile.y);
  if (!person && !thing && !farm && !water) {
    const path = findPath(walk, from, tile);
    if (path) scene.player.walk(path);
    return;
  }
  const stand = standBeside(walk, from, tile);
  if (!stand) return;
  scene.player.walk(stand.path, () => {
    scene.player.face(stand.dir);
    if (farm) {
      // 手指点地：当前工具不合适就自动换成合适的那一件；哪件都用不上而地里有草有虫，就打开田地照料
      const at = scene.at();
      const why = (tool, x, y) => game.ask('farm.why', tool, x, y, at, shell.get().seed);
      if (why(shell.get().tool, tile.x, tile.y)) {
        const better = bestTool(why, tile.x, tile.y);
        if (better) shell.set({ tool: better });
        else if (careNote(game.ask('farm.detail', tile.x, tile.y)))
          return shell.set({ modal: { kind: 'field', x: tile.x, y: tile.y } });
      }
    } else if (water && shell.get().tool !== 'can') shell.set({ tool: 'can' });
    scene.hintKey = '';
    scene.act();
  });
}
