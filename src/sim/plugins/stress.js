// 心烦怎么涨落。心烦的数存在人物档案里（sim.persona），这里管每个人今天各样做法算了几回、
// 几天没跟人说话、憋不住了时给挑的几个毛病。
// 玩家做的事按 content/stress.js 贴做法标签；乡邻做的事由 sim.deeds 调 stress.apply。
// 每个标签：违着自己哪个性情，心烦涨；顺着哪个，降（倍数看性情）。一夜过去降一点；
// 爱扎堆的人闷了几天、家里手头紧、年景很差，每天涨一点。
// 满了：主角弹「憋不住了」，从几个毛病里挑一个（stress.cope）；乡邻照性情自己染上一个。
// 带着毛病的人，做那件事（喝酒、大吃、关门、倒苦水、乱买、发火）一天能解一回闷。
//   命令 stress.cope {coping} → stress.coped {who, coping, name, line}
//   事实 stress.changed {who, tag, delta, value, line, crossed}（只发主角的；crossed 是刚涨过三成、六成、九成）、stress.snapped {who, line, choices}
//   服务 stress.apply(w, 人, 标签们, emit?) → 加减了多少、stress.relieve(w, 人, emit?) → 用毛病解了闷没有
//   查询 stress → 主角的心烦、到了哪一档、是不是憋不住了（给挑的毛病）
import { is } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { noise } from '../noise.js';
import { HERO, ON_MAP } from '../../content/people.js';
import { TEMPERS, TAGS, COPING } from '../../content/traits.js';
import { tierOf } from '../../content/talk.js';
import {
  STRESS,
  FACT_TAGS,
  WORK_TAGS,
  TEA_TAGS,
  SPLURGE,
  SOCIAL_TAGS,
  COPING_LEAN,
} from '../../content/stress.js';
import {
  UP_LINES,
  DOWN_LINES,
  LEVEL_LINES,
  SNAP_LINES,
  COPE_TEXT,
  OUTBURST_REPLY,
  VENT_REPLY,
  VILLAGER_SNAP,
  rotate,
} from '../../content/stress-lines.js';

const IDS = [HERO, ...ON_MAP];
const vexOk = (/** @type {any} */ v) =>
  is.obj(v) &&
  is.int(v.day, 0) &&
  is.obj(v.n) &&
  Object.entries(v.n).every(([k, n]) => Object.hasOwn(TAGS, k) && is.int(n, 1, 99)) &&
  is.int(v.quiet, 0, 999) &&
  is.int(v.coped, 0) &&
  (v.snap === null ||
    (is.arr(v.snap, STRESS.choices) &&
      v.snap.length > 0 &&
      v.snap.every((/** @type {string} */ c) => Object.hasOwn(COPING, c))));
const fresh = () => ({ day: 0, n: {}, quiet: 0, coped: 0, snap: null });

export const stress = {
  id: 'sim.stress',
  provides: ['stress'],
  requires: [
    'schema',
    'commands',
    'queries',
    'reactions',
    'people',
    'persona',
    'purse',
    'social',
    'opinion',
    'witness',
  ],
  writes: ['vexes'],
  install(ctx) {
    const { schema, commands, queries, reactions, people, persona, purse, social, opinion } =
      ctx.services;
    const { witness } = ctx.services;

    schema.slice('vexes', {
      initial: () => Object.fromEntries(IDS.map(id => [id, fresh()])),
      validate: all => (is.keyedBy(all, IDS) && Object.values(all).every(vexOk)) || 'vexes',
    });

    const today = (w, id) => {
      const v = w.vexes[id];
      if (v.day !== w.clock.day) Object.assign(v, { day: w.clock.day, n: {} });
      return v;
    };
    const level = n => LEVEL_LINES.filter(([at]) => n >= at).length;
    /** 憋不住了给画面看的：那一段话、几个法子（按钮字、毛病名、代价）。 */
    const snapView = (w, list) => ({
      line: rotate(SNAP_LINES, w.clock.day),
      choices: list.map(c => ({
        id: c,
        name: COPING[c].name,
        note: COPING[c].note,
        button: COPE_TEXT[c].button,
      })),
    });

    /** 憋不住了：主角给挑几个还没有的毛病，乡邻照性情自己染上一个；都没得挑就只泄掉一截。 */
    function snap(w, id, emit) {
      const p = persona.get(w, id),
        v = w.vexes[id];
      const left = Object.keys(COPING).filter(c => !p.coping.includes(c));
      if (id === people.who(w)) {
        if (!left.length) return void persona.vex(w, id, -STRESS.snapDrop);
        const order = left
          .map((c, i) => ({ c, r: noise(w.meta.seed, w.clock.day, 907, i) }))
          .sort((a, b) => a.r - b.r)
          .map(x => x.c);
        v.snap = order.slice(0, STRESS.choices);
        emit?.('stress.snapped', { who: id, ...snapView(w, v.snap) });
        return;
      }
      const lean = [VILLAGER_SNAP[id]?.coping, ...p.tempers.flatMap(t => COPING_LEAN[t] || [])];
      const pick = [...lean, ...left].find(c => left.includes(c));
      if (pick) persona.addCoping(w, id, pick);
      persona.vex(w, id, -STRESS.snapDrop);
      const where = w.people[id];
      if (where) witness.record(w, { who: id, act: 'snap', map: where.map });
    }

    /** 一样做法算一回：违着的性情涨、顺着的降。憋着没挑毛病的时候不再往上涨。 */
    function apply(w, id, tags, emit = null) {
      const p = persona.get(w, id);
      if (!p || !w.vexes[id]) return 0;
      const v = today(w, id);
      let total = 0,
        loud = null;
      for (const tag of tags) {
        if (!Object.hasOwn(TAGS, tag)) continue;
        const n = v.n[tag] || 0;
        v.n[tag] = Math.min(99, n + 1);
        if (n >= STRESS.perTag) continue;
        for (const t of p.tempers) {
          const def = TEMPERS[t];
          let d = 0;
          if (def.dislikes.includes(tag)) d = STRESS.gain * (def.gain || 1);
          else if (def.likes.includes(tag)) d = -STRESS.relief * (def.relief || 1);
          if (!d) continue;
          total += d;
          if (!loud || Math.abs(d) > Math.abs(loud.d)) loud = { d, t, tag };
        }
      }
      if (v.snap && total > 0) total = 0;
      if (!total) return 0;
      const before = p.stress;
      const after = persona.vex(w, id, total);
      if (id === people.who(w) && after !== before) {
        const said =
          total > 0
            ? rotate(UP_LINES[loud.t]?.[loud.tag] || [null], w.clock.day + after)
            : DOWN_LINES[loud.t];
        const cross =
          level(after) > level(before)
            ? rotate(/** @type {string[]} */ (LEVEL_LINES[level(after) - 1][1]), w.clock.day)
            : null;
        emit?.('stress.changed', {
          who: id,
          tag: loud.tag,
          delta: after - before,
          value: after,
          line: cross || said || null,
          crossed: !!cross,
        });
      }
      if (after >= 100 && !v.snap) snap(w, id, emit);
      return after - before;
    }

    /** 带着毛病的人用它解一回闷（一天一回）。 */
    function relieve(w, id, coping, emit = null, reply = null) {
      const p = persona.get(w, id),
        v = w.vexes[id];
      if (!p?.coping.includes(coping) || !v || v.coped === w.clock.day || !p.stress) return false;
      v.coped = w.clock.day;
      const before = p.stress;
      const after = persona.vex(w, id, -STRESS.cope);
      if (id === people.who(w))
        emit?.('stress.changed', {
          who: id,
          tag: null,
          delta: after - before,
          value: after,
          line: rotate(COPE_TEXT[coping].relief, w.clock.day),
          crossed: false,
          reply,
        });
      return true;
    }

    commands.register('stress.cope', ({ draft, input, fact }) => {
      const w = draft.world,
        id = people.who(w),
        v = w.vexes[id];
      if (!v?.snap) refuse('心里还憋得住');
      if (!v.snap.includes(input.coping)) refuse('没有这个法子');
      persona.addCoping(w, id, input.coping);
      persona.vex(w, id, -STRESS.snapDrop);
      v.snap = null;
      v.coped = w.clock.day;
      const c = COPING[input.coping];
      fact('stress.coped', {
        who: id,
        coping: input.coping,
        name: c.name,
        line: COPE_TEXT[input.coping].pick,
        first: COPE_TEXT[input.coping].first,
      });
    });

    // 玩家做的事贴标签。
    const me = (s, e) => (e.data.who ?? people.who(s.world)) === people.who(s.world);
    const tagged = (type, tagsOf) =>
      reactions.on(
        type,
        (s, e, emit) => {
          if (!me(s, e)) return;
          const tags = tagsOf(e.data);
          if (tags.length) apply(s.world, people.who(s.world), tags, emit);
        },
        { priority: 80 },
      );
    for (const [type, tags] of Object.entries(FACT_TAGS)) tagged(type, () => tags);
    tagged('action.performed', d => [
      ...(WORK_TAGS[d.kind] || []),
      ...(d.energy >= WORK_TAGS.heavy ? ['toil'] : []),
    ]);
    tagged('tea.done', d => TEA_TAGS[d.kind] || []);
    tagged('market.bought', d => (d.price >= SPLURGE ? ['splurge'] : []));
    tagged('pulse.resolved', d => (d.seen?.length ? ['cheat'] : []));

    // 带着毛病的主角，做那件事就解一回闷。
    const coped = (type, coping, when, reply = (/** @type {any} */ d) => (d ? null : null)) =>
      reactions.on(
        type,
        (s, e, emit) => {
          if (me(s, e) && when(s.world, e.data))
            relieve(s.world, people.who(s.world), coping, emit, reply(e.data));
        },
        { priority: 81 },
      );
    coped('market.bought', 'drink', (w, d) => d.item === 'wine');
    coped('market.bought', 'spree', (w, d) => d.price >= 10);
    coped('meal.eaten', 'gluttony', () => true);
    coped(
      'person.talked',
      'grumble',
      (w, d) => tierOf(social.familiar(w, d.to) || 0) >= 2,
      d => VENT_REPLY[d.to] || null,
    );
    reactions.on(
      'person.talked',
      (s, e, emit) => {
        const w = s.world,
          id = people.who(w);
        if (!me(s, e) || (persona.get(w, id)?.stress || 0) < STRESS.outburst) return;
        const reply = OUTBURST_REPLY[e.data.to] || null;
        if (relieve(w, id, 'outburst', emit, reply)) opinion.note(w, e.data.to, id, 'outburst');
      },
      { priority: 81 },
    );

    // 一天过完：没跟人打过交道的，算独处一天（闭门谢客的人解一回闷）；爱扎堆的人闷着的天数加一。
    reactions.on(
      'day.ended',
      (s, e, emit) => {
        const w = s.world;
        for (const id of IDS) {
          const v = today(w, id);
          const social = SOCIAL_TAGS.some(t => v.n[t]);
          v.quiet = social ? 0 : Math.min(999, v.quiet + 1);
          if (social || id !== people.who(w)) continue;
          apply(w, id, ['alone'], emit);
          relieve(w, id, 'recluse', emit);
        }
      },
      { priority: 60 },
    );

    // 清早：歇了一夜降一点；闷久了、手头紧、年景很差，涨一点。
    reactions.on(
      'day.started',
      (s, e, emit) => {
        const w = s.world;
        for (const id of IDS) {
          const p = persona.get(w, id);
          if (!p) continue;
          const house = purse.houseOf(id);
          const lonely = p.tempers.some(
            t => TEMPERS[t].lonely && w.vexes[id].quiet >= TEMPERS[t].lonely,
          );
          let d = -STRESS.night;
          if (lonely) d += STRESS.lonely;
          if (house && purse.short(w, house)) d += STRESS.short;
          if (house && purse.fortune(w, house) <= -2) d += STRESS.badYear;
          if (w.vexes[id].snap && d > 0) d = 0;
          const after = persona.vex(w, id, d);
          if (after >= 100 && !w.vexes[id].snap) snap(w, id, emit);
        }
      },
      { priority: 45 },
    );

    queries.define('stress', w => {
      const id = people.who(w),
        p = persona.get(w, id),
        v = w.vexes[id];
      return {
        value: p?.stress ?? 0,
        level: level(p?.stress ?? 0),
        snap: v?.snap ? snapView(w, v.snap) : null,
      };
    });

    ctx.provide('stress', Object.freeze({ apply: ctx.own(apply), relieve: ctx.own(relieve) }));
  },
};
