// 点了世界里的一个位置（鼠标、手指轻点）：走过去；那儿有人、有物件、有地、有水，就做该做的事。
import { walkable, farmable, waterSource, actAt } from '../content/maps/index.js';
import { tileOf, findPath, standBeside } from './logic.js';
import { decorAt, poke } from './interactions.js';

export function tapAt(scene, wx, wy) {
  const { shell, platform } = scene.deps;
  // 正在演一件活时点了别处：活早已做完，戏就此收场，接着照这一下去做
  if (scene.performer?.active && !shell.paused()) scene.performer.stop();
  if (scene.busy || shell.paused()) return;
  platform.audio.unlock();
  scene.approaching = null;
  const walk = (x, y) => walkable(scene.map, x, y);
  const from = scene.player.tile;
  const person = scene.villagers.find(
    v => v.sprite.visible && Math.abs(v.px - wx) < 9 && wy < v.py + 3 && wy > v.py - 28,
  );
  const tile = person ? person.tile : tileOf(wx, wy);
  const thing = !person && actAt(scene.map, tile.x, tile.y);
  const farm = !person && !thing && farmable(scene.map, tile.x, tile.y);
  const water = !person && !thing && waterSource(scene.map, tile.x, tile.y);
  const decor = !person && !thing && !farm && !water && decorAt(scene, tile.x, tile.y);
  if (!person && !thing && !farm && !water && !decor) {
    const path = findPath(walk, from, tile);
    if (path) scene.player.walk(path);
    return;
  }
  const stand = standBeside(walk, from, tile);
  if (!stand) return;
  scene.approaching = person || null;
  scene.player.walk(stand.path, () => {
    scene.approaching = null;
    scene.player.face(stand.dir);
    // 赴约、换班可能在路上发生。只跟点中的人说话，不能误碰他原来站着的地。
    if (person) {
      if (person.sprite.visible && person.tile.x === tile.x && person.tile.y === tile.y)
        return scene.talk(person);
      return;
    }
    if (decor) return poke(scene, decor);
    scene.hintKey = '';
    scene.act();
  });
}
