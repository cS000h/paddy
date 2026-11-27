// 见闻：一件事＝谁、对谁、做了什么、在哪、哪天。当时在场的人知道；有的事当事人不想让人知道（secret）；
// 过些天淡掉。以后传闲话（M9）就是把一条见闻的「谁知道」加上一个人。
// 在场：和做事的人在同一处的乡邻（作息表里的同一个去处），主角在同一张地图上也算。
//   服务 witness.record(w, {who, to?, act, map, place?, coping?, seenBy?}) → 这条见闻；witness.knows(w, 人)
//        witness.tell(w, 谁说, 对谁, 秘密?) → 说出去的那一条（谁说知道、对谁不知道、不是秘密的，挑最新的；
//        秘密为真时只挑不想让人知道的、不是自己做的）或 null
//   查询 heard → 主角知道的事，新的在前：{id, day, act, who, to, line, secret, mine}
//   反应 小事里昧下东西被人看见（pulse.resolved 带 seen）记一条
import { is } from '../../kernel/schema.js';
import { PEOPLE, ON_MAP } from '../../content/people.js';
import { COPING } from '../../content/traits.js';
import { MAPS } from '../../content/maps/index.js';
import { VILLAGER_SNAP } from '../../content/stress-lines.js';
import { DEEDS, OTHER_DOINGS, PLACE_WORDS, COPE_WORDS, WITNESS_KEEP } from '../../content/deeds.js';

const IDS = Object.keys(PEOPLE);
const ACTS = { ...DEEDS, ...OTHER_DOINGS };
const nameOf = (/** @type {string} */ id) => PEOPLE[id]?.name || id;
const itemOk = (/** @type {any} */ x) =>
  is.obj(x) &&
  is.int(x.id, 1) &&
  is.int(x.day, 1) &&
  IDS.includes(x.who) &&
  (x.to === null || (IDS.includes(x.to) && x.to !== x.who)) &&
  Object.hasOwn(ACTS, x.act) &&
  Object.hasOwn(MAPS, x.map) &&
  (x.place === null || Object.hasOwn(PLACE_WORDS, x.place)) &&
  (x.coping === null || Object.hasOwn(COPING, x.coping)) &&
  typeof x.secret === 'boolean' &&
  is.arr(x.knows, IDS.length) &&
  x.knows.every((/** @type {string} */ k) => IDS.includes(k)) &&
  new Set(x.knows).size === x.knows.length &&
  is.int(x.until, 1);

/** 见闻的说法：{a} 做的人，{b} 对着的人，{place} 在哪儿，{coping} 用的哪个毛病。 */
export function witnessLine(/** @type {any} */ x) {
  if (x.act === 'snap' && VILLAGER_SNAP[x.who]) return VILLAGER_SNAP[x.who].aside;
  const place = x.place ? PLACE_WORDS[x.place] : MAPS[x.map].name;
  return ACTS[x.act].line
    .replace('{a}', x.who === 'hero' ? '你' : nameOf(x.who))
    .replace('{b}', x.to === 'hero' ? '你' : nameOf(x.to))
    .replace('{place}', place)
    .replace('{coping}', x.coping ? COPE_WORDS[x.coping] : '');
}

export const witness = {
  id: 'sim.witness',
  provides: ['witness'],
  requires: ['schema', 'queries', 'reactions', 'people', 'residents'],
  writes: ['witness'],
  install(ctx) {
    const { schema, queries, reactions, people, residents } = ctx.services;

    schema.slice('witness', {
      initial: () => ({ seq: 0, list: [] }),
      validate: x =>
        (is.obj(x) &&
          is.int(x.seq, 0) &&
          is.arr(x.list, WITNESS_KEEP) &&
          x.list.every(itemOk) &&
          x.list.every(i => i.id <= x.seq)) ||
        'witness',
    });

    /** 此刻在这张图（和这一处）的人：乡邻按作息，主角看他站在哪张图。 */
    function present(w, map, place) {
      const here = residents
        .positions(w)
        .filter(p => p.visible && !p.atDoor && p.map === map && (!place || p.place === place))
        .map(p => p.id);
      const me = people.who(w);
      if (w.people[me]?.map === map) here.push(me);
      return here;
    }

    // seenBy 给了就只有这几个人看见（小事里昧东西，规则已经算过谁在场）；没给就是此刻在场的人。
    function record(w, { who, to = null, act, map, place = null, coping = null, seenBy = null }) {
      const def = ACTS[act];
      const crowd = seenBy || present(w, map, place);
      const knows = [...new Set([who, ...(to ? [to] : []), ...crowd])]
        .filter(id => IDS.includes(id))
        .slice(0, IDS.length);
      const x = w.witness;
      x.seq += 1;
      const item = {
        id: x.seq,
        day: w.clock.day,
        who,
        to,
        act,
        map,
        place,
        coping,
        secret: def.secret,
        knows,
        until: w.clock.day + def.fade,
      };
      x.list.push(item);
      if (x.list.length > WITNESS_KEEP) x.list.splice(0, x.list.length - WITNESS_KEEP);
      return item;
    }

    const knows = (w, id) => w.witness.list.filter(x => x.knows.includes(id));

    // 顺嘴说一件：说的人知道、听的人还不知道、不是当事人想瞒着的；挑最近的一条
    // secrets 为真：传闲话，专挑当事人不想让人知道的那几件（自己做的不说）
    function tell(w, from, to, secrets = false) {
      const x = w.witness.list.findLast(
        i =>
          (secrets ? i.secret && i.who !== from : !i.secret) &&
          i.knows.includes(from) &&
          !i.knows.includes(to) &&
          i.who !== to,
      );
      if (!x) return null;
      x.knows.push(to);
      return x;
    }

    reactions.on(
      'day.started',
      s => {
        s.world.witness.list = s.world.witness.list.filter(x => x.until > s.world.clock.day);
      },
      { priority: 19 },
    );

    // 小事里昧下东西，有人看在眼里：主角做的，看见的人都知道（不在场的不算）。
    reactions.on('pulse.resolved', (s, e) => {
      const seen = (e.data.seen || []).filter(id => ON_MAP.includes(id));
      if (!seen.length) return;
      record(s.world, { who: e.data.who, act: 'cheat', map: e.data.map, seenBy: seen });
    });

    queries.define('heard', w => {
      const me = people.who(w);
      return knows(w, me)
        .slice()
        .reverse()
        .map(x => ({
          id: x.id,
          day: x.day,
          act: x.act,
          who: x.who,
          to: x.to,
          line: witnessLine(x),
          secret: x.secret,
          mine: x.who === me,
        }));
    });

    ctx.provide('witness', Object.freeze({ record: ctx.own(record), knows, tell: ctx.own(tell) }));
  },
};
