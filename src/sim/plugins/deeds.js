// 村民自己做事：每段时辰（清晨、午前、午后、傍晚，见 content/people.js 的 ROUTINE_DAY）打一轮分。
// 同一处的乡邻，每人把能做的动作对每个在场的人打一遍分（sim/deeds.js），挑最高的那件，过了门槛才做；
// 一段时辰一人最多做一件。待在哪儿本身也算做法（田里算干农活，后山算独处），心烦跟着涨落；
// 心烦高、带着毛病的，用毛病解一回闷。做了的事留一条见闻，在场的人都知道。
// 起伏用「固定的随机」（sim/noise.js）：同一个种子、同一串命令，谁对谁做了什么都一样。
//   事实 deed.done {who, to, id, name, map, place, line}
//   查询 deeds → 动作登记表：每个动作叫什么、贴哪些做法标签、对谁做（给画面和 A-03 用）
import { is } from '../../kernel/schema.js';
import { noise } from '../noise.js';
import { ON_MAP, ROUTINE_DAY } from '../../content/people.js';
import { DEEDS, DEED_ROLL } from '../../content/deeds.js';
import { PLACE_TAGS, DAY_TAGS, STRESS } from '../../content/stress.js';
import { isFairDay } from '../../content/calendar.js';
import { DEED_RULES, aiOf, scoreOf, rested } from '../deeds.js';
import { witnessLine } from './witness.js';

const DEED_IDS = Object.keys(DEEDS);
const doneOk = (/** @type {any} */ d) =>
  is.obj(d) &&
  Object.entries(d).every(
    ([k, n]) =>
      ON_MAP.includes(k.split(':')[0]) && DEED_IDS.includes(k.split(':')[1]) && is.int(n, 1, 9),
  );

export const deeds = {
  id: 'sim.deeds',
  provides: ['deeds'],
  requires: [
    'schema',
    'queries',
    'reactions',
    'weather',
    'persona',
    'residents',
    'opinion',
    'stress',
    'witness',
    'purse',
  ],
  writes: ['deeds'],
  install(ctx) {
    const { schema, queries, reactions, weather, persona, residents, opinion, stress, witness } =
      ctx.services;
    const { purse } = ctx.services;
    const api = { opinion, stress, purse };

    // at：最近打过分的是哪一天的第几段（天 × 4 + 段），免得同一段打两回；done：今天谁做了几回什么
    schema.slice('deeds', {
      initial: () => ({ at: 0, day: 0, done: {} }),
      validate: d =>
        (is.obj(d) && is.int(d.at, 0) && is.int(d.day, 0) && doneOk(d.done)) || 'deeds',
    });

    /** 一个人在这一段里最想做的那件：{id, to, score}，没有过门槛的就是 null。 */
    function best(w, a, here, slot) {
      const p = persona.get(w, a),
        ai = aiOf(p),
        d = w.deeds;
      const ai_ = ON_MAP.indexOf(a);
      let top = null;
      DEED_IDS.forEach((id, di) => {
        const def = DEEDS[id];
        if ((d.done[`${a}:${id}`] || 0) >= def.daily) return;
        const targets = def.target === 'self' ? [null] : here.filter(b => b !== a);
        for (const b of targets) {
          if (!rested(w, id, a, b) || DEED_RULES[id].can(w, a, b, api) !== true) continue;
          const roll = noise(
            w.meta.seed,
            w.clock.day,
            slot,
            ai_,
            di,
            b ? ON_MAP.indexOf(b) + 1 : 0,
          );
          const at = { opinion: b ? opinion.of(w, a, b).value : 0, stress: p.stress, roll };
          const score = scoreOf(def, ai, at, DEED_ROLL.jitter);
          if (score >= DEED_ROLL.threshold && (!top || score > top.score))
            top = { id, to: b, score };
        }
      });
      return top;
    }

    function round(w, slot, emit) {
      const d = w.deeds;
      const at = w.clock.day * 4 + slot;
      if (d.at >= at) return;
      d.at = at;
      if (d.day !== w.clock.day) Object.assign(d, { day: w.clock.day, done: {} });
      const out = residents.positions(w).filter(p => p.visible && !p.atDoor && p.place);
      const placeOf = Object.fromEntries(out.map(p => [p.id, p]));
      const acted = new Set();
      const kinds = [
        isFairDay(w.clock.day) && 'fair',
        weather.has(w, 'wet') && 'wet',
        weather.has(w, 'heavy') && 'heavy',
      ].filter(Boolean);
      for (const p of out) {
        const a = p.id,
          me = persona.get(w, a);
        const extra = kinds.flatMap(k => DAY_TAGS[k][p.place] || []);
        stress.apply(w, a, [...(PLACE_TAGS[p.place] || []), ...extra]);
        if (me.stress >= STRESS.villagerCope && me.coping.length) {
          const coping = me.coping[0];
          if (stress.relieve(w, a, coping))
            witness.record(w, { who: a, act: 'cope', map: p.map, place: p.place, coping });
        }
        if (acted.has(a)) continue;
        const here = out.filter(x => x.place === p.place && x.map === p.map).map(x => x.id);
        const pick = best(w, a, here, slot);
        if (!pick) continue;
        acted.add(a);
        const key = `${a}:${pick.id}`;
        d.done[key] = (d.done[key] || 0) + 1;
        DEED_RULES[pick.id].perform(w, a, pick.to, api);
        stress.apply(w, a, DEEDS[pick.id].tags);
        const seen = witness.record(w, {
          who: a,
          to: pick.to,
          act: pick.id,
          map: p.map,
          place: p.place,
        });
        emit('deed.done', {
          who: a,
          to: pick.to,
          id: pick.id,
          name: DEEDS[pick.id].name,
          map: placeOf[a].map,
          place: p.place,
          line: witnessLine(seen),
        });
      }
    }

    const slotAt = minute => (minute >= ROUTINE_DAY.home ? null : residents.slotOf(minute));
    reactions.on('day.started', (s, e, emit) => round(s.world, 0, emit), { priority: 70 });
    reactions.on(
      'time.passed',
      (s, e, emit) => {
        const slot = slotAt(e.data.minute);
        if (slot !== null && slot !== slotAt(e.data.from)) round(s.world, slot, emit);
      },
      { priority: 70 },
    );

    queries.define('deeds', () =>
      DEED_IDS.map(id => ({
        id,
        name: DEEDS[id].name,
        tags: [...DEEDS[id].tags],
        target: DEEDS[id].target,
      })),
    );

    ctx.provide('deeds', Object.freeze({ best }));
  },
};
