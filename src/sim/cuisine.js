// 做饭预览和出锅共用这一条计算路径，避免面板承诺与实际结果不一致。
// 火候：亲自掌火时 log 是按的记录（见 sim/cook-fire.js），照这一锅的节拍判；没有 log 是「稳稳做」，火候家常。
// 这一锅的节拍由世界的种子和这户第几回烧火（fires）定，所以面板先问到的和出锅时判的是同一份。
import { ITEMS, seasonal, inSeason, kindOf } from '../content/pantry.js';
import { FINE_HEAT } from '../content/quality.js';
import { METHODS, QUALITY, HEAT, CUTS } from '../content/recipes.js';
import { BUFFS, buffUses } from '../content/body.js';
import { dateOf } from '../content/calendar.js';
import { dishName } from './cuisine-name.js';
import { planFor, judge, goodLog } from './cook-fire.js';
import { buffOf, tasteOf } from './cuisine-taste.js';
import { refuse } from '../kernel/dispatch.js';
export function previewMeal(w, input, compute, who, fires = 0) {
  const { items: picked = [], method = 'stew', spices = [], log = null, cut = null } = input;
  // 极品照原来那样配菜名、算味道，各种鱼都算「鱼」；用了几样极品，火候就宽几截
  const items = Array.isArray(picked) ? picked.map(kindOf) : [];
  if (
    !Array.isArray(picked) ||
    items.length < 1 ||
    items.length > 3 ||
    new Set(items).size !== items.length ||
    !picked.every(k => ITEMS[k]?.cook) ||
    !METHODS[method]
  )
    refuse('选1到3种不同的食材，再选一种做法');
  if (
    !Array.isArray(spices) ||
    spices.length > 2 ||
    !spices.every(k => ITEMS[k]?.kind === 'spice' && k !== 'salt')
  )
    refuse('调料最多两勺，盐留着腌菜');
  if (method === 'mix' && !items.every(k => ITEMS[k].tags.includes('raw')))
    refuse('这些食材不能生拌，得下锅');
  if (log !== null && method !== 'mix' && !goodLog(method, log)) refuse('火候没看清');
  if (cut !== null && !Object.hasOwn(CUTS, cut)) refuse('没有这种切法');
  const I = k => ITEMS[k];
  const si = dateOf(w.clock.day).season;
  const season = items.some(k => seasonal(k, si)) && items.every(k => inSeason(k, si));
  const meat = items.filter(k => I(k).tags.includes('meat')).length;
  const name = dishName(items, method, I, spices);
  const buff = buffOf(items, method, I, spices);
  const taste = tasteOf(items, method, I, spices);
  let full = Math.min(
    56,
    items.reduce((n, k) => n + I(k).full, 0),
  );
  if (season) full = Math.round(full * 1.1);
  const cutBonus = cut ? (CUTS[cut].fit.includes(method) ? 3 : -3) : 0;
  if (cutBonus > 0) full += 2;
  if (
    cut &&
    !name.named &&
    items.filter(k => !['rice', 'egg'].includes(k)).length === 1 &&
    !/[丝片块]$|粥|饭|汤|羹|煲/.test(name.name)
  )
    name.name += CUTS[cut].word;
  const wineBonus =
    spices.includes('wine') && items.some(k => I(k).tags.some(t => ['meat', 'fishy'].includes(t)))
      ? 3
      : 0;
  const r = compute.run(
    'meal.preview',
    { w, who, items, method },
    {
      name: name.name,
      base: name.name,
      named: name.named,
      ingredients: [...items],
      spices: [...spices],
      method,
      cut,
      full,
      energy: { stew: 12, fry: 8, roast: 8, mix: 6 }[method] + meat * 4,
      buff: buff.type,
      why: buff.why,
      seasonal: season,
      meat,
      servings: items.length >= 2 ? 2 : 1,
      water: taste.water,
      taste: taste.words,
      tasteMood: taste.mood,
      notes: [...taste.notes],
    },
  );
  if (cut)
    r.notes.push(
      cutBonus > 0
        ? `${CUTS[cut].name}：和${METHODS[method]}正对路，火候好拿捏，更入味`
        : `${CUTS[cut].name}：${CUTS[cut].tip}，火候更难拿捏`,
    );
  if (wineBonus) r.notes.push('黄酒去腥：火候好拿捏些');
  const fine = picked.filter(k => ITEMS[k].fine);
  if (fine.length) r.notes.push(`${fine.map(k => ITEMS[k].name).join('、')}：火候好拿捏些`);
  if (cut === 'shred') r.notes.push('切丝费些工夫：体力多用一点，厨艺经验多一点');
  const bonus =
    compute.run('cook.heat', { w, who }, { value: 0, parts: [] }).value +
    cutBonus +
    wineBonus +
    fine.length * FINE_HEAT;
  const plan = method === 'mix' ? null : planFor(method, w.meta.seed, fires, bonus);
  const verdict = plan && log ? judge(plan, log) : null;
  const q = verdict ? verdict.quality : 'plain';
  r.fire = method === 'mix' ? null : { word: HEAT[method].word, bonus };
  r.plan = plan;
  r.perfect = !!verdict?.perfect;
  r.beats = verdict?.beats || null;
  r.quality = q;
  r.full = Math.round(r.full * QUALITY[q].full);
  r.name = QUALITY[q].prefix + r.base;
  r.uses = buffUses(
    r.buff,
    Math.max(
      1,
      BUFFS[r.buff].base +
        QUALITY[q].uses +
        compute.run('buff.uses', { w, who }, { value: 0, parts: [] }).value,
    ),
  );
  r.buffName = BUFFS[r.buff].name;
  r.buffText = BUFFS[r.buff].text(r.uses);
  if (season) r.notes.push('正当季：饱腹多一成，吃了心情更好');
  return r;
}
