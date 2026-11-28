// 集场上逛的赶集人：在几个落脚点之间慢慢走，到了站一会儿，面朝摊子；你走近了偶尔有人说一句。
// 只是画面（数据在 content/fair-crowd.js），规则不知道：点不到、不挡路、不进存档，换张图就散了。
import { Walker } from './actors.js';
import { findPath } from './logic.js';
import { walkable } from '../content/maps/index.js';
import { isFairDay } from '../content/calendar.js';
import {
  CROWD_RULES as R,
  CROWD_LOOKS,
  CROWD_STOPS,
  CROWD_LINES,
  CROWD_NAME,
} from '../content/fair-crowd.js';

const rand = ([a, b]) => a + Math.random() * (b - a);
const pick = list => list[Math.floor(Math.random() * list.length)];

export function createFairCrowd(scene) {
  if (scene.map.id !== 'market') return { frame() {}, destroy() {} };
  const { game } = scene.deps;
  const walk = (x, y) => walkable(scene.map, x, y);
  const stops = CROWD_STOPS.filter(([x, y]) => walk(x, y)).map(([x, y]) => ({ x, y }));
  const kind = game.ask('almanac').today
    ? 'feast'
    : isFairDay(game.ask('clock').day)
      ? 'fair'
      : 'normal';
  const night = () => game.ask('clock').minute >= 1140;
  const free = stops.slice().sort(() => Math.random() - 0.5);
  const people = [];
  for (let i = 0; i < Math.min(R.count[kind], free.length); i++) {
    const at = free[i];
    const w = new Walker(scene, CROWD_LOOKS[i % CROWD_LOOKS.length], at.x, at.y, 'up');
    w.speed = 34;
    w.wait = rand(R.linger);
    w.at = at;
    people.push(w);
  }
  let chat = rand(R.every) / 2;

  function wander(w) {
    const taken = new Set(people.map(p => p.at));
    const next = pick(stops.filter(s => !taken.has(s)));
    if (!next) return;
    const path = findPath(walk, w.tile, next, 600);
    if (!path) return;
    w.at = next;
    w.walk(path, () => {
      w.face(next.y >= 17 ? 'up' : pick(['left', 'right', 'down']));
      w.wait = rand(R.linger);
    });
  }

  function frame(delta) {
    const dt = delta / 1000;
    const hide = night();
    for (const w of people) {
      w.setVisible(!hide);
      if (hide) continue;
      if (w.follow(dt)) continue;
      w.wait -= dt;
      if (w.wait <= 0) {
        w.wait = rand(R.linger);
        wander(w);
      }
    }
    if (hide || scene.deps.shell.paused() || !scene.player) return;
    chat -= dt;
    if (chat > 0) return;
    chat = rand(R.every);
    const me = scene.player.tile;
    const near = people.filter(
      w => Math.max(Math.abs(w.tile.x - me.x), Math.abs(w.tile.y - me.y)) <= R.hear,
    );
    if (near.length) scene.deps.shell.toast(`${CROWD_NAME}：“${pick(CROWD_LINES[kind])}”`);
  }

  function destroy() {
    for (const w of people) {
      w.sprite.destroy();
      w.shadow.destroy();
    }
    people.length = 0;
  }

  return { frame, destroy };
}
