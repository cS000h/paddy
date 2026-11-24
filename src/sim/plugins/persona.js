// 人物档案：每个人的性情、出身线和级、根骨天资、解闷毛病、心烦。
// 主角和村民存在存档里；过客照编号和身份推出来（同一个人再来还是那副性子），等过客也要攒心烦时再存。
// 主角的性情可以不满三个：开局草案二里，性情是头半个月做出来的（见执行方案 M10）。
//   服务 persona.get(w, id)、persona.hasOld(w, id, 旧特质)、persona.fromOrigin(w, id, 旧特质们)
//   查询 persona(id?) → 给画面看的档案
import { is } from '../../kernel/schema.js';
import {
  TEMPERS,
  PAIRS,
  LINES_OF_ORIGIN,
  LINE_UP_AT,
  INNATE,
  COPING,
  OLD_TRAITS,
  DEFAULT_LINE,
} from '../../content/traits.js';
import { PEOPLE, PERSONA } from '../../content/people.js';
import { VISITOR_LINES } from '../../content/visitors.js';
import { LEVELS } from '../../content/growth.js';

const blank = () => ({ tempers: [], line: null, innate: [], coping: [], stress: 0 });
const fromContent = (/** @type {any} */ p) => ({
  tempers: [...p.tempers],
  line: { id: p.line[0], lv: p.line[1] },
  innate: [...p.innate],
  coping: [],
  stress: 0,
});
/** 本事练到第几级，出身线就是第几级：开局一级，到 LINE_UP_AT 那几级各升一级。 */
export const lineLevel = (/** @type {number} */ skillLevel) =>
  1 + LINE_UP_AT.filter(n => skillLevel >= n).length;
const skillLevel = (/** @type {number} */ xp) => LEVELS.filter(n => xp >= n).length - 1;

function recordOk(/** @type {any} */ r) {
  if (!is.obj(r) || !is.arr(r.tempers, 3) || !is.arr(r.innate, 4) || !is.arr(r.coping, 6))
    return false;
  const pairs = r.tempers.map((/** @type {string} */ t) => TEMPERS[t]?.pair);
  const lines = r.innate.map((/** @type {string} */ i) => INNATE[i]?.line).filter(Boolean);
  return (
    r.tempers.every((/** @type {string} */ t) => Object.hasOwn(TEMPERS, t)) &&
    new Set(pairs).size === pairs.length &&
    (r.line === null ||
      (is.obj(r.line) && Object.hasOwn(LINES_OF_ORIGIN, r.line.id) && is.int(r.line.lv, 1, 4))) &&
    r.innate.every((/** @type {string} */ i) => Object.hasOwn(INNATE, i)) &&
    new Set(lines).size === lines.length &&
    r.coping.every((/** @type {string} */ c) => Object.hasOwn(COPING, c)) &&
    new Set(r.coping).size === r.coping.length &&
    is.int(r.stress, 0, 100)
  );
}

// 过客的档案：编号算一个数，从八对里挑三对，每对挑一边；出身线看身份。不用随机数，查一次和查十次一样。
const hash = (/** @type {string} */ s) =>
  [...s].reduce((h, c) => (h * 31 + (c.codePointAt(0) || 0)) >>> 0, 7);
function visitorPersona(/** @type {any} */ w, /** @type {string} */ id) {
  const v =
    w.visitors?.active.find((/** @type {any} */ x) => x.id === id) ||
    w.visitors?.book.find((/** @type {any} */ x) => x.id === id);
  if (!v) return null;
  const h = hash(v.id),
    pairs = Object.keys(PAIRS);
  const tempers = [0, 3, 5].map(
    (step, i) => PAIRS[pairs[(h + step) % pairs.length]][(h >> (i + 3)) & 1],
  );
  const line = VISITOR_LINES[v.role];
  return { ...blank(), tempers, line: line ? { id: line[0], lv: line[1] } : null };
}

export const persona = {
  id: 'sim.persona',
  provides: ['persona'],
  requires: ['schema', 'queries', 'reactions', 'people'],
  writes: ['persona'],
  install(ctx) {
    const { schema, queries, reactions, people } = ctx.services;
    schema.slice('persona', {
      initial: () =>
        Object.fromEntries(
          Object.keys(PEOPLE).map(id => [id, PERSONA[id] ? fromContent(PERSONA[id]) : blank()]),
        ),
      validate: all =>
        (is.keyedBy(all, Object.keys(PEOPLE)) && Object.values(all).every(recordOk)) || 'persona',
    });

    const get = (w, id) => w.persona[id] || visitorPersona(w, id);

    /** 旧特质（开局两选的六个）问到这里：换成了哪个性情或哪条出身线，有就算有。 */
    function hasOld(w, id, trait) {
      const p = get(w, id),
        to = OLD_TRAITS[trait];
      if (!p || !to) return false;
      return to.temper ? p.tempers.includes(to.temper) : p.line?.id === to.line;
    }

    /** 开局两选定下的旧特质换成性情和出身线；同一对里只留先来的那个，不硬凑满三个。 */
    function fromOrigin(w, id, traits, skillXp) {
      const p = w.persona[id];
      for (const t of traits) {
        const to = OLD_TRAITS[t];
        if (!to) continue;
        if (to.line) p.line = { id: to.line, lv: 1 };
        else if (!p.tempers.some(x => TEMPERS[x].pair === TEMPERS[to.temper].pair))
          p.tempers.push(to.temper);
      }
      p.line ??= { id: DEFAULT_LINE, lv: 1 };
      p.line.lv = lineLevel(skillLevel(skillXp[LINES_OF_ORIGIN[p.line.id].skill] || 0));
    }

    // 主角的对口本事升了级，出身线跟着看要不要升（只升不降）。
    reactions.on('skill.leveled', (s, e) => {
      const p = s.world.persona[e.data.who];
      if (!p?.line || LINES_OF_ORIGIN[p.line.id].skill !== e.data.skill) return;
      p.line.lv = Math.max(p.line.lv, lineLevel(e.data.level));
    });

    queries.define('persona', (w, id) => {
      const who = id ?? people.who(w),
        p = get(w, who);
      if (!p) return null;
      const line = p.line && LINES_OF_ORIGIN[p.line.id];
      return {
        id: who,
        tempers: p.tempers.map(t => {
          const opposite = PAIRS[TEMPERS[t].pair].find(x => x !== t);
          return { id: t, name: TEMPERS[t].name, opposite, oppositeName: TEMPERS[opposite].name };
        }),
        line: line && {
          id: p.line.id,
          lv: p.line.lv,
          name: line.name,
          title: line.titles[p.line.lv - 1],
        },
        innate: p.innate.map(i => ({ id: i, name: INNATE[i].name })),
        coping: p.coping.map(c => ({ id: c, name: COPING[c].name })),
        stress: p.stress,
      };
    });

    ctx.provide('persona', Object.freeze({ get, hasOld, fromOrigin: ctx.own(fromOrigin) }));
  },
};
