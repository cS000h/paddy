// 收成出彩：收一样东西时抽一下，看到手的是寻常的还是极品（有哪几样、数多少见 content/quality.js）。
// 机会 = 底子 + 各插件接进 compute 'quality.chance' 的（地里的在 sim/land-care.js，本事和六项在
// growth-perks.js）+ 连着没出极品的回数，落在最少和最多之间。抽中了，连着没出的回数清零。
//   服务 quality.chance(w, 谁, 哪样活, 情形) → { value, parts }   只读：看地照料用它写机会有多大
//        quality.roll(w, 谁, 哪样活, 情形, 东西) → { item, fine, first }
//          item 是实际到手的东西；first 是这人头一回收到极品（画面借这一回讲讲极品有什么用）
import { is } from '../../kernel/schema.js';
import { ITEMS } from '../../content/items.js';
import { FINE_CHANCE, SKILL_ODDS, fineId } from '../../content/quality.js';

const KINDS = Object.keys(SKILL_ODDS);

const valid = q =>
  is.obj(q) &&
  is.obj(q.miss) &&
  Object.entries(q.miss).every(([k, n]) => KINDS.includes(k) && is.int(n, 0, 999)) &&
  is.obj(q.found) &&
  Object.entries(q.found).every(([k, day]) => !!ITEMS[k]?.fine && is.int(day, 1));

export const quality = {
  id: 'sim.quality',
  provides: ['quality'],
  requires: ['schema', 'compute', 'core', 'pack'],
  writes: ['quality'],
  install(ctx) {
    const { schema, compute, core } = ctx.services;

    schema.slice('quality', {
      initial: (env, w) =>
        Object.fromEntries(Object.keys(w.packs).map(id => [id, { miss: {}, found: {} }])),
      validate: (all, w) =>
        (is.keyedBy(all, Object.keys(w.packs)) && Object.values(all).every(valid)) || 'quality',
    });

    /** 这人做这样活，此刻出极品的机会（百分数）和明细。 */
    function chance(w, who, kind, data = {}) {
      const { base, min, max, miss } = FINE_CHANCE;
      const start = { value: base, parts: [{ id: 'base', label: '底子', delta: base }] };
      const r = compute.run('quality.chance', { w, who, kind, ...data }, start);
      const n = w.quality[who]?.miss[kind] || 0;
      compute.part(r, 'miss', `连着${n}回没出`, n * miss);
      return { value: Math.max(min, Math.min(max, r.value)), parts: r.parts };
    }

    /** 收一样东西时抽一下。没有极品的东西不抽，也不算一回。 */
    function roll(w, who, kind, data, item) {
      const q = w.quality[who];
      if (!q || !ITEMS[fineId(item)]) return { item, fine: false, first: false };
      if (core.random(w) * 100 >= chance(w, who, kind, data).value) {
        q.miss[kind] = Math.min(999, (q.miss[kind] || 0) + 1);
        return { item, fine: false, first: false };
      }
      const first = Object.keys(q.found).length === 0;
      q.miss[kind] = 0;
      q.found[fineId(item)] ??= w.clock.day;
      return { item: fineId(item), fine: true, first };
    }

    ctx.provide('quality', Object.freeze({ chance, roll: ctx.own(roll) }));
  },
};
