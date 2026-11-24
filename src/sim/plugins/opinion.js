// 好感：一个人怎么看另一个人。好感 = 相性（看两人的性情）+ 一条条来由（存在存档里，到日子自己掉）
// + 别的插件接进 compute 'opinion' 的（村民看主角时，乡邻插件加熟悉的层次）。
// 主角做的几件事，村民记一条：送东西、说话、赴约、约了没来、约了又推。村民之间开局就有几条交情。
//   服务 opinion.of(w, 谁, 对谁) → { value, parts }、opinion.note(w, 谁, 对谁, 来由, n?)
//   查询 opinion(谁, 对谁?) → 谁对谁（不写就是对主角）的好感和明细；明细按分量大的在前。
//        相性里牵到玩家还没看出来的性情的，并成一条「莫名投缘」或「莫名别扭」（见 persona.visible）
import { is } from '../../kernel/schema.js';
import { PEOPLE } from '../../content/people.js';
import { TEMPERS, PAIRS } from '../../content/traits.js';
import { COMPAT, OPINION_RANGE, WHY, STANDING } from '../../content/opinion.js';

const MAX_NOTES = 300;
const IDS = Object.keys(PEOPLE);
const standing = () =>
  STANDING.map(([from, to, why]) => ({ from, to, why, n: WHY[why].n, until: null }));

const noteOk = (/** @type {any} */ x) =>
  is.obj(x) &&
  IDS.includes(x.from) &&
  IDS.includes(x.to) &&
  x.from !== x.to &&
  Object.hasOwn(WHY, x.why) &&
  is.int(x.n, -100, 100) &&
  x.n !== 0 &&
  (x.until === null || is.int(x.until, 1));

/** 相性：这个人的每个性情，对方有同一个 +10，有反着的那个 −10。 */
function compat(/** @type {any} */ a, /** @type {any} */ b) {
  const parts = [];
  for (const t of a?.tempers || []) {
    const other = PAIRS[TEMPERS[t].pair].find(x => x !== t);
    if (b?.tempers.includes(t))
      parts.push({ id: 'same.' + t, label: '都' + TEMPERS[t].name, delta: COMPAT.same });
    if (b?.tempers.includes(other)) {
      const label = TEMPERS[t].name + '碰上' + TEMPERS[other].name;
      parts.push({ id: 'clash.' + t, label, delta: COMPAT.clash });
    }
  }
  return parts;
}

export const opinion = {
  id: 'sim.opinion',
  provides: ['opinion'],
  requires: ['schema', 'queries', 'reactions', 'compute', 'people', 'persona'],
  writes: ['opinion'],
  install(ctx) {
    const { schema, queries, reactions, compute, people, persona } = ctx.services;

    schema.slice('opinion', {
      initial: () => ({ notes: standing() }),
      validate: o => (is.obj(o) && is.arr(o.notes, MAX_NOTES) && o.notes.every(noteOk)) || 'notes',
    });

    const live = (w, x) => x.until === null || x.until > w.clock.day;

    /** 谁对谁的好感：相性、来由（同一种并成一条，带还剩几天），再走 compute 'opinion'。 */
    function of(w, from, to) {
      const parts = compat(persona.get(w, from), persona.get(w, to));
      const byWhy = new Map();
      for (const x of w.opinion.notes) {
        if (x.from !== from || x.to !== to || !live(w, x)) continue;
        const p = byWhy.get(x.why) || { id: 'why.' + x.why, label: WHY[x.why].label, delta: 0 };
        p.delta += x.n;
        p.times = (p.times || 0) + 1;
        if (x.until !== null) p.left = Math.max(p.left || 0, x.until - w.clock.day);
        byWhy.set(x.why, p);
      }
      parts.push(...byWhy.values());
      const start = { value: parts.reduce((n, p) => n + p.delta, 0), parts };
      const r = compute.run('opinion', { w, from, to }, start);
      const [lo, hi] = OPINION_RANGE;
      r.parts.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
      return { value: Math.max(lo, Math.min(hi, r.value)), parts: r.parts };
    }

    /** 记一条来由。同一种记满了，只把最快过期的那条换成新的；存档里的条数有上限，满了先丢快过期的。 */
    function note(w, from, to, why, n = WHY[why].n) {
      const def = WHY[why];
      if (!def || from === to || !IDS.includes(from) || !IDS.includes(to)) return false;
      const notes = w.opinion.notes;
      const until = def.days === null ? null : w.clock.day + def.days;
      const soonest = list =>
        list.reduce((a, b) => ((a.until ?? Infinity) <= (b.until ?? Infinity) ? a : b));
      const same = notes.filter(x => x.from === from && x.to === to && x.why === why);
      if (same.length >= def.stack) {
        Object.assign(soonest(same), { n, until });
        return true;
      }
      if (notes.length >= MAX_NOTES) {
        const fading = notes.filter(x => x.until !== null);
        if (!fading.length) return false;
        notes.splice(notes.indexOf(soonest(fading)), 1);
      }
      notes.push({ from, to, why, n, until });
      return true;
    }

    // 清早丢掉过期的来由。
    reactions.on(
      'day.started',
      s => {
        s.world.opinion.notes = s.world.opinion.notes.filter(x => live(s.world, x));
      },
      { priority: 18 },
    );

    // 主角做的事，对方记一条。
    const me = w => people.who(w);
    reactions.on('gift.given', (s, e) => {
      const why = e.data.favorite ? 'favorite' : e.data.liked ? 'liked' : 'gift';
      note(s.world, e.data.to, e.data.who, why);
    });
    reactions.on('person.talked', (s, e) => {
      if (e.data.gained) note(s.world, e.data.to, e.data.who, 'chat');
    });
    reactions.on('appointment.fulfilled', (s, e) => note(s.world, e.data.npc, me(s.world), 'met'));
    reactions.on('appointment.missed', (s, e) => note(s.world, e.data.npc, me(s.world), 'missed'));
    reactions.on('appointment.cancelled', (s, e) =>
      note(s.world, e.data.npc, me(s.world), 'cancelled'),
    );

    queries.define('opinion', (w, from, to = people.who(w)) => {
      if (!persona.get(w, from) || !persona.get(w, to) || from === to) return null;
      const o = of(w, from, to);
      const [a, b] = [persona.visible(w, from), persona.visible(w, to)];
      const hidden = p => {
        const m = /^(same|clash).(.+)$/.exec(p.id);
        if (!m) return false;
        const other = m[1] === 'same' ? m[2] : PAIRS[TEMPERS[m[2]].pair].find(x => x !== m[2]);
        return !a.has(m[2]) || !b.has(other);
      };
      const parts = o.parts.filter(p => !hidden(p));
      const n = o.parts.filter(hidden).reduce((s, p) => s + p.delta, 0);
      if (n) parts.push({ id: 'unseen', label: n > 0 ? '莫名投缘' : '莫名别扭', delta: n });
      parts.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
      return { from, to, value: o.value, parts };
    });

    ctx.provide('opinion', Object.freeze({ of, note: ctx.own(note) }));
  },
};
