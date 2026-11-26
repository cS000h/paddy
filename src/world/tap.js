// 点了世界里的一个位置（鼠标、手指轻点）：避开旁人走过去；那儿有人、过客、小事、物件、地或水，就做该做的事。
import { walkable, farmable, waterSource, actAt } from '../content/maps/index.js';
import { tileOf, findPath, standBeside, dirTo } from './logic.js';
import { decorAt, decorOnWater, poke } from './interactions.js';
import { tileOccupied } from './target.js';

export function tapAt(scene, wx, wy) {
  const { shell, platform } = scene.deps;
  if (scene.performer?.active && !shell.paused()) scene.performer.stop();
  if (scene.busy || shell.paused()) return;
  platform.audio.unlock();
  scene.approaching = null;
  const from = scene.player.tile;
  const person = scene.villagers.find(
    v => v.present && Math.abs(v.px - wx) < 10 && wy < v.py + 4 && wy > v.py - 28,
  );
  const visitor = !person && scene.extras?.visitorNearPixel(wx, wy);
  const pulse = !person && !visitor && scene.extras?.eventNearPixel(wx, wy);
  const tile = person
    ? person.tile
    : visitor
      ? visitor.tile
      : pulse
        ? { x: pulse.x, y: pulse.y }
        : tileOf(wx, wy);
  const thing = !person && !visitor && !pulse && actAt(scene.map, tile.x, tile.y);
  const farm = !person && !visitor && !pulse && !thing && farmable(scene.map, tile.x, tile.y);
  const lotus = !person && !visitor && !pulse && !thing && decorOnWater(scene, tile.x, tile.y);
  const water =
    !person && !visitor && !pulse && !thing && !lotus && waterSource(scene.map, tile.x, tile.y);
  const decor =
    lotus ||
    (!person && !visitor && !pulse && !thing && !farm && !water && decorAt(scene, tile.x, tile.y));

  const ignore = person || visitor || null;
  const walk = (x, y) =>
    walkable(scene.map, x, y) &&
    ((x === from.x && y === from.y) || !tileOccupied(scene, x, y, ignore));

  if (!person && !visitor && !pulse && !thing && !farm && !water && !decor) {
    if (tileOccupied(scene, tile.x, tile.y)) return;
    const path = findPath(walk, from, tile);
    if (path) {
      scene.effects.mark(tile.x, tile.y);
      scene.player.walk(path);
    }
    return;
  }

  // 已经紧挨着目标时，直接转身互动，不必绕路
  const nearNow = Math.max(Math.abs(from.x - tile.x), Math.abs(from.y - tile.y)) <= 1;
  const finish = dir => {
    scene.approaching = null;
    if (dir) scene.player.face(dir);
    if (person) {
      // 他停下来等你，可点的时候他可能正迈到半步：只要走到了跟前就说话，不扑空
      const here = scene.player.tile;
      const t = person.tile;
      if (person.present && Math.max(Math.abs(here.x - t.x), Math.abs(here.y - t.y)) <= 1) {
        scene.player.face(dirTo(here, t));
        return scene.talk(person);
      }
      return;
    }
    if (visitor) return scene.extras.interactVisitor(visitor);
    if (pulse) return scene.extras.interactEvent(pulse);
    if (decor) return poke(scene, decor);
    scene.hintKey = '';
    scene.act();
  };

  if (nearNow && (person || visitor || pulse)) {
    return finish(from.x === tile.x && from.y === tile.y ? scene.player.dir : dirTo(from, tile));
  }

  const stand = standBeside(walk, from, tile);
  if (!stand) return;
  scene.approaching = person || null;
  scene.player.walk(stand.path, () => finish(stand.dir));
}
