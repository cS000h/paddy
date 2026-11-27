// 做饭预览和出锅共用这一条计算路径，避免面板承诺与实际结果不一致。
// 火候：亲自掌火时 log 是按的记录（见 sim/cook-fire.js），照这一锅的节拍判；没有 log 是「稳稳做」，火候家常。
// 这一锅的节拍由世界的种子和这户第几回烧火（fires）定，所以面板先问到的和出锅时判的是同一份。
import { ITEMS, seasonal, inSeason, kindOf } from '../content/pantry.js';
import { FINE_HEAT } from '../content/quality.js';
import { METHODS, QUALITY, HEAT, CUTS, POT, FLAVOR } from '../content/recipes.js';
import { BUFFS, buffUses } from '../content/body.js';
import { dateOf } from '../content/calendar.js';
import { dishName } from './cuisine-name.js';
import { planFor, judge, goodLog, twistOf } from './cook-fire.js';
import { buffOf, tasteOf, flavorOf } from './cuisine-taste.js';
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
  // 饱腹守恒：先算这一锅一共多少，最后才分到几份里
  let full = items.reduce((n, k) => n + I(k).full, 0);
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
      servings: POT.servings[items.length],
      flavorBonus: 0,
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
  // 砸了也有点意思：扑了锅的浓汤、锅巴、焦皮、脆生的青菜，饱腹和名字照它算
  const twist = verdict ? twistOf(method, q, r.ingredients, verdict.beats) : null;
  const counts = QUALITY[twist && 'full' in twist ? twist.full : q];
  r.fire = method === 'mix' ? null : { word: HEAT[method].word, bonus };
  r.plan = plan;
  r.perfect = !!verdict?.perfect;
  r.beats = verdict?.beats || null;
  r.quality = q;
  const pot = r.full * counts.full;
  r.name = (twist ? twist.prefix : QUALITY[q].prefix) + r.base;
  if (twist) {
    r.twist = twist.id;
    r.servings = Math.max(1, r.servings + ('servings' in twist ? twist.servings : 0));
    r.tasteMood = Math.min(3, r.tasteMood + ('mood' in twist ? twist.mood : 0));
  }
  r.full = Math.min(POT.cap, Math.round(pot / r.servings));
  // 滋味：调料、火候、照菜谱、当季管好不好吃；三分的多一点心情、多管一回，一分的少一点
  const flavor = flavorOf(items, method, I, spices, {
    quality: twist ? 'plain' : q, // 砸了也有点意思的，滋味照家常算
    named: name.named,
    seasonal: season,
    recipeSpices: name.spices || [],
    bonus: r.flavorBonus,
  });
  const lift = flavor.stars - 2;
  delete r.flavorBonus;
  r.flavor = flavor.stars;
  r.tasteMood = Math.max(-3, Math.min(3, r.tasteMood + lift));
  r.notes.push(
    `滋味${'★'.repeat(flavor.stars)}${'☆'.repeat(3 - flavor.stars)}${FLAVOR.words[flavor.stars]}` +
      (flavor.why.length ? '：' + flavor.why.join('、') : ''),
  );
  r.uses = buffUses(
    r.buff,
    Math.max(
      1,
      BUFFS[r.buff].base +
        counts.uses +
        lift +
        compute.run('buff.uses', { w, who }, { value: 0, parts: [] }).value,
    ),
  );
  r.buffName = BUFFS[r.buff].name;
  r.buffText = BUFFS[r.buff].text(r.uses);
  if (season) r.notes.push('正当季：饱腹多一成，吃了心情更好');
  return r;
}
