// 做饭预览和出锅共用这一条计算路径，避免面板承诺与实际结果不一致。
import { ITEMS, seasonal, inSeason } from '../content/pantry.js';
import { METHODS, QUALITY, HEAT } from '../content/recipes.js';
import { BUFFS, buffUses } from '../content/body.js';
import { dateOf } from '../content/calendar.js';
import { dishName, quality } from './cuisine-name.js';
import { buffOf, tasteOf } from './cuisine-taste.js';
import { refuse } from '../kernel/dispatch.js';
export function previewMeal(w, input, compute, who) {
  const { items = [], method = 'stew', spices = [], heat = null } = input;
  if (
    !Array.isArray(items) ||
    items.length < 1 ||
    items.length > 3 ||
    new Set(items).size !== items.length ||
    !items.every(k => ITEMS[k]?.cook) ||
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
  if (heat !== null && (!Number.isFinite(heat) || heat < 0 || heat > 100)) refuse('火候没看清');
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
  const bonus = compute.run('cook.heat', { w, who }, { value: 0, parts: [] }).value;
  r.heat = method === 'mix' ? null : { ...HEAT[method], half: HEAT[method].half + bonus };
  const q = quality(method, heat, bonus);
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
