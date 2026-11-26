// 人物档案：每个人的性情、出身线和级、根骨天资、解闷毛病、心烦，和由这些合算出来的六项。
// 主角和村民存在存档里；过客照编号和身份推出来（同一个人再来还是那副性子），等过客也要攒心烦时再存。
// 主角的性情可以不满三个：开局草案二里，性情是头半个月做出来的（见执行方案 M10）。
//   服务 persona.get(w, id)、persona.hasOld(w, id, 旧特质)、persona.settle(w, id, 性情, 出身线, 经验)、
//        persona.attrs(w, id?) → { values, detail }、persona.visible(w, id) → 玩家看得出他哪几个性情
//   查询 persona(id?) → 给画面看的档案，六项带明细。别人的档案只给看你知道的（见 seen）
import { is } from '../../kernel/schema.js';
import {
  ATTRS,
  TEMPERS,
  TEMPER_DESC,
  PAIRS,
  LINES_OF_ORIGIN,
  LINE_BONUS,
  LINE_UP_AT,
  INNATE,
  COPING,
  OLD_TRAITS,
} from '../../content/traits.js';
import { PEOPLE, PERSONA } from '../../content/people.js';
import { VISITOR_LINES } from '../../content/visitors.js';
import { LEVELS } from '../../content/growth.js';
import { tierOf } from '../../content/talk.js';

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

// 六项每人从底子 4 起，加档案里的几样；历练和身边风物由 sim.modifiers 接进 compute 'attr'。
const BASE = 4;
const LV = ['一', '二', '三', '四'];
/** 档案自己带的加减：底子、性情、出身线、根骨天资、毛病，一样一条，画面照着列明细。 */
function ownParts(/** @type {any} */ p, /** @type {string} */ k) {
  const parts = [{ id: 'base', label: '底子', delta: BASE }];
  const add = (/** @type {string} */ id, /** @type {string} */ label, /** @type {any} */ n) => {
    if (n) parts.push({ id, label, delta: n });
  };
  if (!p) return parts;
  for (const t of p.tempers) add('temper.' + t, TEMPERS[t].name, TEMPERS[t].attrs[k]);
  if (p.line) {
    const l = LINES_OF_ORIGIN[p.line.id],
      b = LINE_BONUS[l.kind],
      i = p.line.lv - 1;
    const n = l.main === k ? b.main[i] : l.sub === k ? b.sub[i] : 0;
    add('line.' + p.line.id, l.name + LV[i] + '级', n);
  }
  for (const x of p.innate) add('innate.' + x, INNATE[x].name, INNATE[x].attrs?.[k]);
  for (const c of p.coping) add('coping.' + c, COPING[c].name, COPING[c].attrs?.[k]);
  return parts;
}

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
  requires: ['schema', 'queries', 'reactions', 'compute', 'people', 'social'],
  writes: ['persona'],
  install(ctx) {
    const { schema, queries, reactions, compute, people, social } = ctx.services;
    schema.slice('persona', {
      initial: () =>
        Object.fromEntries(
          Object.keys(PEOPLE).map(id => [id, PERSONA[id] ? fromContent(PERSONA[id]) : blank()]),
        ),
      validate: all =>
        (is.keyedBy(all, Object.keys(PEOPLE)) && Object.values(all).every(recordOk)) || 'persona',
    });

    const get = (w, id) => w.persona[id] || visitorPersona(w, id);

    /** 六项：档案里的几样先算好，再走 compute 'attr' 让别的插件接上历练和身边风物。最低是 0。 */
    function attrs(w, id = people.who(w)) {
      const p = get(w, id);
      const values = {},
        detail = {};
      for (const [k, name] of Object.entries(ATTRS)) {
        const own = ownParts(p, k);
        const start = { value: own.reduce((n, x) => n + x.delta, 0), parts: own };
        const r = compute.run('attr', { w, who: id, attr: k }, start);
        values[k] = Math.max(0, r.value);
        detail[k] = { id: k, name, value: values[k], parts: r.parts };
      }
      return { values, detail };
    }

    /** 旧特质（开局两选的六个）问到这里：换成了哪个性情或哪条出身线，有就算有。 */
    function hasOld(w, id, trait) {
      const p = get(w, id),
        to = OLD_TRAITS[trait];
      if (!p || !to) return false;
      return to.temper ? p.tempers.includes(to.temper) : p.line?.id === to.line;
    }

    /** 落脚单定下的性情和出身线（两个性情已查过不在同一对里）；出身线的级照对口本事现在的级算。 */
    function settle(w, id, tempers, lineId, skillXp) {
      const p = w.persona[id];
      p.tempers = [...tempers];
      p.line = {
        id: lineId,
        lv: lineLevel(skillLevel(skillXp[LINES_OF_ORIGIN[lineId].skill] || 0)),
      };
    }

    // 主角的对口本事升了级，出身线跟着看要不要升（只升不降）。
    reactions.on('skill.leveled', (s, e) => {
      const p = s.world.persona[e.data.who];
      if (!p?.line || LINES_OF_ORIGIN[p.line.id].skill !== e.data.skill) return;
      p.line.lv = Math.max(p.line.lv, lineLevel(e.data.level));
    });

    // 别人的档案只给看你知道的：熟到哪一层看得出几个性情（还不认识 0、点头之交 1、熟络 2、亲近起 3），
    // 熟络起看得出根骨天资，亲近起看得出毛病，心烦只看自己的。过客照过面就看得出一个性情。
    // 六项的数照给，明细里没看出来的那几样并成一条「还看不出的」，免得从明细里漏出性情。
    const SEEN = [0, 1, 2, 3, 3];
    function seen(w, who) {
      if (who === people.who(w)) return { tempers: 3, innate: true, coping: true, stress: true };
      const known = social.familiar(w, who);
      const met = w.visitors?.book.some(b => b.id === who);
      const tier = known === null ? (met ? 1 : 0) : tierOf(known);
      return { tempers: SEEN[tier], innate: tier >= 2, coping: tier >= 3, stress: false };
    }
    function maskParts(parts, hidden) {
      const shown = parts.filter(p => !hidden.has(p.id));
      const n = parts.filter(p => hidden.has(p.id)).reduce((s, p) => s + p.delta, 0);
      return n ? [...shown, { id: 'unseen', label: '还看不出的', delta: n }] : shown;
    }

    queries.define('persona', (w, id) => {
      const who = id ?? people.who(w),
        p = get(w, who);
      if (!p) return null;
      const line = p.line && LINES_OF_ORIGIN[p.line.id];
      const see = seen(w, who);
      const hidden = new Set([
        ...p.tempers.slice(see.tempers).map(t => 'temper.' + t),
        ...(see.innate ? [] : p.innate.map(i => 'innate.' + i)),
        ...(see.coping ? [] : p.coping.map(c => 'coping.' + c)),
      ]);
      const six = Object.values(attrs(w, who).detail);
      return {
        id: who,
        unseen: Math.max(0, p.tempers.length - see.tempers),
        tempers: p.tempers.slice(0, see.tempers).map(t => {
          const opposite = PAIRS[TEMPERS[t].pair].find(x => x !== t);
          const name = TEMPERS[t].name;
          return {
            id: t,
            name,
            desc: TEMPER_DESC[t],
            opposite,
            oppositeName: TEMPERS[opposite].name,
          };
        }),
        line: line && {
          id: p.line.id,
          lv: p.line.lv,
          name: line.name,
          title: line.titles[p.line.lv - 1],
        },
        innate: see.innate ? p.innate.map(i => ({ id: i, name: INNATE[i].name })) : null,
        coping: see.coping ? p.coping.map(c => ({ id: c, name: COPING[c].name })) : null,
        stress: see.stress ? p.stress : null,
        attrs: six.map(a => ({ ...a, parts: maskParts(a.parts, hidden) })),
      };
    });

    /** 玩家看得出这个人的哪几个性情（自己的全看得出）。 */
    const visible = (w, id) => new Set((get(w, id)?.tempers || []).slice(0, seen(w, id).tempers));

    ctx.provide('persona', Object.freeze({ get, hasOld, settle: ctx.own(settle), attrs, visible }));
  },
};
