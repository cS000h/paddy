// 村里的人碰在一处说两句：乡邻和乡邻、乡邻和站着的外乡过客。你在附近才听得见，话从画面下方冒出来，
// 说话的人转过身、头顶冒个记号。只是画面上的热闹，规则不知道（话在 content/barks.js）。
import { showEmote } from './emotes.js';
import { dirTo } from './logic.js';
import { PEOPLE } from '../content/people.js';
import {
  CHAT_RULES as R,
  OPEN,
  REPLY,
  PAIRS,
  TO_STRANGER,
  STRANGER_REPLY,
  GOSSIP,
} from '../content/barks.js';

const pick = list => list[Math.floor(Math.random() * list.length)];
const rand = ([a, b]) => a + Math.random() * (b - a);
const apart = (a, b) => Math.max(Math.abs(a.tile.x - b.tile.x), Math.abs(a.tile.y - b.tile.y));
const fillT = (s, t) => s.replace('{t}', t);

/**
 * @param {Phaser.Scene} scene 村庄场景
 * @param {() => object[]} strangers 这张图上站着的过客小人（有 visitor.title、visitor.name）
 */
export function createChatter(scene, strangers) {
  let wait = rand(R.every) / 2; // 刚到一张图，早一点听见有人说话
  const lastPair = new Map(); // 'a|b' → 说过的时刻（秒）
  let clock = 0;

  // 站在原地、没在赶路的乡邻
  const idle = () =>
    scene.villagers.filter(
      v => v.present && !v.commuting && !v.path.length && v !== scene.approaching,
    );

  function say(actor, name, text, emote) {
    showEmote(scene, actor, emote);
    scene.deps.shell.toast(`${name}：“${text}”`);
  }

  function face(a, b) {
    if (a.turnTo) {
      a.turnTo(b);
      a.work.wait = Math.max(a.work.wait || 0, R.reply + 2.5);
    } else a.face(dirTo(a.tile, b.tile));
  }

  /** 挑一对能说上话的：先找乡邻和乡邻，再找乡邻和过客；都在你听得见的地方，最近没说过。 */
  function choose() {
    const me = scene.player;
    const fresh = (a, b) => clock - (lastPair.get(a.id + '|' + b.id) ?? -1e9) > R.rest;
    const people = idle().filter(v => apart(v, me) <= R.hear);
    const pairs = [];
    for (const a of people)
      for (const b of people)
        if (a !== b && apart(a, b) <= R.near && fresh(a, b)) pairs.push([a, b]);
    for (const b of strangers())
      if (apart(b, me) <= R.hear)
        for (const a of people) if (apart(a, b) <= R.near && fresh(a, b)) pairs.push([a, b]);
    return pairs.length ? pick(pairs) : null;
  }

  /** 两句话：先说的一句、接的一句（说话人的名字由 say 加）。 */
  function lines(a, b) {
    if (b.visitor) {
      const t = b.visitor.title || b.visitor.name;
      return [fillT(pick(TO_STRANGER[a.id]), t), pick(STRANGER_REPLY), b.visitor.name];
    }
    const known = PAIRS[a.id + '.' + b.id];
    if (known && Math.random() < 0.6) return [...pick(known), PEOPLE[b.id].name];
    const guest = strangers()[0];
    if (guest && Math.random() < 0.4) {
      const t = guest.visitor.title || guest.visitor.name;
      return [fillT(pick(GOSSIP.open), t), pick(GOSSIP.reply), PEOPLE[b.id].name];
    }
    return [pick(OPEN[a.id]), pick(REPLY[b.id]), PEOPLE[b.id].name];
  }

  function talk([a, b]) {
    lastPair.set(a.id + '|' + b.id, clock);
    lastPair.set(b.id + '|' + a.id, clock);
    face(a, b);
    face(b, a);
    const [first, second, bName] = lines(a, b);
    say(a, PEOPLE[a.id].name, first, 'note');
    scene.time.delayedCall(R.reply * 1000, () =>
      scene.guard(() => {
        if (!b.sprite?.active || !b.sprite.visible) return;
        say(b, bName, second, b.visitor ? 'dots' : 'note');
      }),
    );
  }

  return {
    frame(delta) {
      const dt = delta / 1000;
      clock += dt;
      if (scene.map.indoor || scene.deps.shell.paused()) return;
      wait -= dt;
      if (wait > 0) return;
      wait = rand(R.every);
      const pair = choose();
      if (pair) talk(pair);
    },
  };
}
