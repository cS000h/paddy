// 食为天：记每人每天吃了哪几类，清早照前几天定气色好或小毛病；吃到合口、忌口、头一回吃的菜有反应。
//   meal.eaten → 记账；合口、忌口、头一回、嘴燥 → diet.ate {who, line, liked, disliked, fresh}
//   day.started（清早，在睡醒回体力之前）→ 挂上一天的 diet_* 修正；头一回得上的 → diet.changed {who, got}
//   计算管道：'meal.tired' 合口的腻得慢，'gift.taste' 送饭合不合对方口味，'chill.chance' 气色好不容易着凉
//   查询 diet：近几天四类各吃了几回、眼下的状态、自己的口味、熟了的村民的口味（饮食页用）
// 分类、数和话在 content/diet.js；口味怎么判在 sim/taste.js。
import { is } from '../../kernel/schema.js';
import { MODIFIERS } from '../../content/modifiers.js';
import { PEOPLE } from '../../content/people.js';
import { kindOf } from '../../content/pantry.js';
import {
  GROUPS,
  GROUP_OF,
  SEASONING,
  ALSO,
  DIET,
  DIET_LINES,
  DRY_GONE,
  TIRED_LINES,
  NEW_DISH_LINES,
  TASTES,
  TASTE_LINES,
} from '../../content/diet.js';
import { palateOf, verdict } from '../taste.js';

const KEYS = Object.keys(GROUPS);
const MODS = [DIET.wellMod, ...Object.values(DIET.lackMod)];
const blank = () => ({ log: [], tasted: [], seen: [] });
const entryOk = e => is.obj(e) && is.int(e.day, 1) && KEYS.every(k => is.int(e[k], 0, 999));
const recordOk = r =>
  is.obj(r) &&
  is.arr(r.log, DIET.log + 1) &&
  r.log.every(entryOk) &&
  is.arr(r.tasted, DIET.tasted) &&
  r.tasted.every(n => is.str(n, 40)) &&
  is.arr(r.seen, MODS.length) &&
  r.seen.every(m => MODS.includes(m));

/** 这一顿沾了哪几类：佐料不算，肉包子谷荤都算。 */
export const groupsOf = items => {
  const out = new Set();
  for (const raw of items) {
    const k = kindOf(raw);
    if (SEASONING.includes(k)) continue;
    if (GROUP_OF[k]) out.add(GROUP_OF[k]);
    for (const g of ALSO[k] || []) out.add(g);
  }
  return [...out];
};
// 同一天、同一样东西挑同一句，不用随机数
const pick = (list, day, salt) =>
  list.length ? list[[...salt].reduce((n, c) => n + c.charCodeAt(0), day) % list.length] : '';

export const diet = {
  id: 'sim.diet',
  provides: ['diet'],
  requires: [
    'schema',
    'reactions',
    'queries',
    'compute',
    'core',
    'people',
    'body',
    'persona',
    'modifiers',
  ],
  writes: ['diet'],
  install(ctx) {
    const { schema, reactions, queries, compute, core, people, body, persona, modifiers } =
      ctx.services;
    schema.slice('diet', {
      initial: (env, w) => Object.fromEntries(Object.keys(w.packs).map(id => [id, blank()])),
      validate: (all, w) =>
        (is.keyedBy(all, Object.keys(w.packs)) && Object.values(all).every(recordOk)) || 'diet',
    });
    const palate = (w, id) => palateOf(id, persona.get(w, id));
    const day = (r, d) => {
      let e = r.log.find(x => x.day === d);
      if (!e) {
        e = { day: d, ...Object.fromEntries(KEYS.map(k => [k, 0])) };
        r.log = [...r.log, e].slice(-(DIET.log + 1));
      }
      return e;
    };
    /** 前 n 天（不算今天）每一类各吃了几回。 */
    const lastDays = (r, today, n) => {
      const sum = Object.fromEntries(KEYS.map(k => [k, 0]));
      for (const e of r.log)
        if (e.day < today && e.day >= today - n) for (const k of KEYS) sum[k] += e[k];
      return sum;
    };

    reactions.on(
      'meal.eaten',
      (s, e, emit) => {
        const w = s.world,
          d = e.data,
          r = w.diet[d.who];
        if (!r || !Array.isArray(d.items)) return;
        const got = groupsOf(d.items),
          today = day(r, w.clock.day);
        for (const g of got) today[g] += 1;
        const lines = [];
        // 嘴燥：吃到果就消，没吃到这一顿少一点心情
        if (modifiers.has(w, DIET.lackMod.fruit, d.who)) {
          if (got.includes('fruit')) {
            modifiers.drop(w, d.who, DIET.lackMod.fruit);
            lines.push(DRY_GONE);
          } else body.mood(w, d.who, DIET.dryMood, MODIFIERS.diet_dry.name);
        }
        const fresh = !d.snack && !r.tasted.includes(d.base);
        if (fresh) {
          r.tasted = [...r.tasted, d.base].slice(-DIET.tasted);
          body.mood(w, d.who, DIET.newMood, '头一回吃到' + d.dish);
          lines.unshift(pick(NEW_DISH_LINES, w.clock.day, d.base));
        } else if (d.times) lines.unshift(pick(TIRED_LINES[d.times], w.clock.day, d.base));
        const v = verdict(palate(w, d.who), d.items, d.spices || []);
        if (v.liked.length) {
          body.mood(w, d.who, DIET.tasteMood, '合口：' + TASTES[v.liked[0]]);
          lines.push(pick(TASTE_LINES.like, w.clock.day, d.dish));
        }
        if (v.disliked.length) {
          body.mood(w, d.who, -DIET.tasteMood, '忌口：' + TASTES[v.disliked[0]]);
          lines.push(pick(TASTE_LINES.dislike, w.clock.day, d.dish));
        }
        if (lines.length)
          emit('diet.ate', {
            who: d.who,
            line: lines.join(''),
            liked: v.liked.map(k => TASTES[k]),
            disliked: v.disliked.map(k => TASTES[k]),
            fresh,
          });
      },
      { priority: 50 },
    );

    // 清早定一回，排在睡醒回体力（people，10）之前，好让气色好、发虚当天早上就算上
    reactions.on(
      'day.started',
      (s, e, emit) => {
        const w = s.world,
          id = people.who(w),
          r = w.diet[id],
          d = w.clock.day;
        if (!r) return;
        const on = [];
        const well = lastDays(r, d, DIET.well);
        if (KEYS.every(k => well[k] > 0)) on.push(DIET.wellMod);
        // 开局头几天不算缺
        if (d > DIET.lack + 1) {
          const lack = lastDays(r, d, DIET.lack);
          for (const k of KEYS) if (!lack[k]) on.push(DIET.lackMod[k]);
        }
        for (const m of on) modifiers.add(w, id, m, 1, '饭食');
        if (on.includes(DIET.lackMod.veg))
          body.mood(w, id, DIET.fireMood, MODIFIERS.diet_fire.name);
        const first = on.filter(m => !r.seen.includes(m));
        if (!first.length) return;
        r.seen = [...r.seen, ...first];
        const got = first.map(m => ({ id: m, name: MODIFIERS[m].name, line: DIET_LINES[m] }));
        core.post(w, { title: '饭食', text: got.map(g => `「${g.name}」${g.line}`).join('') });
        emit('diet.changed', { who: id, got });
      },
      { priority: 5 },
    );

    compute.tap(
      'meal.tired',
      (r, { w, who, items, spices }) => {
        if (verdict(palate(w, who), items, spices).liked.length && r.value > 0) {
          compute.part(r, 'diet.liked', '合口', -1);
        }
      },
      { priority: 50 },
    );
    compute.tap(
      'gift.taste',
      (r, { w, to, dish }) => {
        const v = verdict(palate(w, to), dish.ingredients, dish.spices);
        const n = (v.liked.length ? 1 : 0) - (v.disliked.length ? 1 : 0);
        if (n) compute.part(r, 'diet.taste', n > 0 ? '合口' : '忌口', n);
      },
      { priority: 50 },
    );
    compute.tap(
      'chill.chance',
      (r, { w, who }) => {
        if (modifiers.has(w, DIET.wellMod, who)) r.value *= DIET.chill;
      },
      { priority: 45 },
    );

    queries.define('diet', w => {
      const id = people.who(w),
        r = w.diet[id],
        d = w.clock.day;
      const mine = palate(w, id);
      const names = list => list.map(k => TASTES[k]);
      return {
        groups: KEYS.map(k => ({ id: k, ...GROUPS[k] })),
        days: [d - 2, d - 1, d].map(x => ({
          day: x,
          ...Object.fromEntries(KEYS.map(k => [k, r.log.find(e => e.day === x)?.[k] || 0])),
        })),
        states: MODS.filter(m => modifiers.has(w, m, id)).map(m => ({
          id: m,
          name: MODIFIERS[m].name,
          kind: MODIFIERS[m].kind,
          desc: MODIFIERS[m].desc,
        })),
        tasted: r.tasted.length,
        palate: { likes: names(mine.likes), dislikes: names(mine.dislikes) },
        // 熟络（熟悉 3）以后才看得出别人爱吃什么
        villagers: Object.keys(PEOPLE)
          .filter(v => v !== id && PEOPLE[v].favorite)
          .map(v => {
            const known = (w.bonds?.known?.[v] || 0) >= 3,
              p = palate(w, v);
            return {
              id: v,
              name: PEOPLE[v].name,
              known,
              likes: known ? names(p.likes) : [],
              dislikes: known ? names(p.dislikes) : [],
            };
          }),
      };
    });
    ctx.provide('diet', Object.freeze({ groupsOf }));
  },
};
