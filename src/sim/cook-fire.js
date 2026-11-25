// 掌火的节拍和判法：炒三拍、炖守火、烤翻面。数在 content/cook-fire.js。
// 纯函数：这一锅的节拍由「固定的随机」定（世界的种子、这户第几回烧火），不动存档里的随机数，
// 所以画面先问到的节拍和出锅时规则判的是同一份。按的记录 log 是 [[毫秒, 键], ...]，键见 FIRE_KEYS。
// 画面每一帧问 fireAt(plan, log, t) 看此刻是什么样子、刚按的那一下早了还是晚了；出锅时 judge(plan, log) 定火候，
// twistOf 看砸了有没有点意思（G-11：浓汤半碗、锅巴脆底、焦香脆壳、脆生爽口）。
import { FIRE, FIRE_KEYS, FIRE_TWISTS } from '../content/cook-fire.js';
import { noise } from './noise.js';

/** 这一锅的节拍。seed、fires 定随机；bonus 是厨艺、极品料这些让正当时宽几截（可以是负的）。 */
export function planFor(method, seed, fires, bonus = 0) {
  let salt = 0;
  const r = () => noise(seed, fires, method.length, 77, salt++);
  /** @param {readonly number[]} range */
  const between = range => Math.round(range[0] + (range[1] - range[0]) * r());
  const wide = ms => Math.max(FIRE.min, Math.round(ms + bonus * FIRE.widen));
  if (method === 'fry') {
    const f = FIRE.fry;
    const flares = [];
    let at = between(f.flareFirst);
    const n = between(f.flares);
    for (let k = 0; k < n; k++) {
      flares.push(at);
      at += between(f.flareGap);
    }
    return {
      method,
      smoke: between(f.smoke),
      smokeLong: wide(f.smokeLong),
      flares,
      flareLong: wide(f.flareLong),
      color: flares.at(-1) + between(f.color),
      colorLong: wide(f.colorLong),
    };
  }
  if (method === 'stew') {
    const s = FIRE.stew;
    const dips = Array.from({ length: between(s.dips) }, () => between([3000, 12000])).sort(
      (a, b) => a - b,
    );
    // 本事好，小火那一段宽一点（上下各宽半截）
    const pad = Math.round((bonus * FIRE.widen) / 25);
    return {
      method,
      fall: s.fall[0] + (s.fall[1] - s.fall[0]) * r(),
      dips,
      band: [s.band[0] - pad, s.band[1] + pad],
      over: s.over + pad * 2,
    };
  }
  if (method === 'roast') {
    const f = FIRE.roast;
    const sides = between(f.sides);
    return {
      method,
      brown: Array.from({ length: sides }, () => between(f.brown)),
      brownLong: wide(f.brownLong),
    };
  }
  return null;
}

/** 按的记录干不干净：时刻不往回走、键是这种做法收的、不太长。 */
export const goodLog = (method, log) =>
  Array.isArray(log) &&
  log.length <= FIRE.presses &&
  log.every(
    (e, k) =>
      Array.isArray(e) &&
      e.length === 2 &&
      Number.isInteger(e[0]) &&
      e[0] >= 0 &&
      e[0] <= 60000 &&
      FIRE_KEYS[method]?.includes(e[1]) &&
      (k === 0 || e[0] >= log[k - 1][0]),
  );

/** 按的时刻和正当时 [from, from + long] 比：right 正好，near 差一点，early / late 差得多，way 差得远。 */
function verdict(t, from, long) {
  if (t === null || t === undefined) return { v: 'missed', d: 1 };
  if (t >= from && t <= from + long) return { v: 'right', d: 0 };
  const off = t < from ? t - from : t - from - long;
  const side = off < 0 ? 'early' : 'late';
  if (Math.abs(off) <= FIRE.near) return { v: 'near', d: Math.sign(off) };
  if (Math.abs(off) <= FIRE.near + long * 2) return { v: side, d: 2 * Math.sign(off) };
  return { v: side, d: 3 * Math.sign(off), way: true };
}

/** 出锅的时机定生熟：d 是离正当时多远（负的早，正的晚）。 */
const doneness = d =>
  d === 0
    ? 'good'
    : Math.abs(d) === 1
      ? 'plain'
      : d === -2
        ? 'under'
        : d === 2
          ? 'over'
          : d < 0
            ? 'raw'
            : 'burnt';

const firstOf = (log, key) => log.find(e => e[1] === key)?.[0] ?? null;

/** 炒：此刻到了哪一拍、正当时没有。 */
function fryAt(plan, log, t) {
  const add = firstOf(log, 'add');
  if (add === null) {
    const now = t >= plan.smoke && t <= plan.smoke + plan.smokeLong;
    const cue = !now && t >= plan.smoke - FIRE.fry.cue && t < plan.smoke;
    const late = t > plan.smoke + plan.smokeLong;
    const warm = Math.min(1.4, t / (plan.smoke + plan.smokeLong / 2));
    return { beat: 'heat', now, cue, late, warm };
  }
  const since = t - add;
  const flare = plan.flares.findIndex(f => since >= f && since <= f + plan.flareLong);
  const rising = plan.flares.some(f => since >= f - FIRE.fry.flareCue && since < f);
  const color = since >= plan.color && since <= plan.color + plan.colorLong;
  return {
    beat: flare >= 0 || rising ? 'toss' : 'serve',
    now: flare >= 0 || color,
    flare: flare >= 0,
    rising,
    cue: rising || (!color && since >= plan.color - FIRE.fry.cue && since < plan.color),
    late: since > plan.color + plan.colorLong,
    cooked: Math.max(0, Math.min(1.4, since / (plan.color + plan.colorLong / 2))),
    tossed: tossHits(plan, log, add),
    flares: plan.flares.length,
  };
}

/** 翻锅翻中了几回火头（每回火头只算一下）。 */
const tossHits = (plan, log, add) =>
  plan.flares.filter(f =>
    log.some(e => e[1] === 'toss' && e[0] - add >= f && e[0] - add <= f + plan.flareLong),
  ).length;

/** 早了、晚了还是正好（差一点也照早晚说）。 */
const sideOf = x => (x.v === 'right' ? 'right' : x.d < 0 ? 'early' : 'late');

/**
 * 最近按的那一下：哪一句（FIRE_SAY 的键）、早了正好还是晚了、第几毫秒按的。画面照着冒一句、响一声。
 * 炒的下料、烤的翻面照正当时说；翻锅看有没有赶上火头；添柴看按之前的火：太旺早了，快灭晚了。
 */
function saidOf(plan, log) {
  const last = log.at(-1);
  if (!last || last[1] === 'serve') return null;
  const [at, key] = last;
  const said = (/** @type {string} */ k, /** @type {string} */ v) => ({ key: k, v, at });
  if (key === 'add') return said('add', sideOf(verdict(at, plan.smoke, plan.smokeLong)));
  if (key === 'toss') {
    const since = at - (firstOf(log, 'add') ?? 0);
    if (plan.flares.some(f => since >= f && since <= f + plan.flareLong))
      return said('toss', 'right');
    const missed = plan.flares.some(
      f => since > f + plan.flareLong && since <= f + plan.flareLong + 700,
    );
    return said('toss', missed ? 'late' : 'early');
  }
  if (key === 'stoke') {
    const fire = stewAt(plan, log.slice(0, -1), at).fire;
    const v =
      fire > plan.band[1] - FIRE.stew.stoke / 2 ? 'early' : fire < plan.band[0] ? 'late' : 'right';
    return said('stoke', v);
  }
  const flips = log.filter(e => e[1] === 'flip').map(e => e[0]);
  const side = flips.length - 1;
  if (side >= plan.brown.length - 1) return null;
  const from = side ? flips[side - 1] : 0;
  const v = sideOf(verdict(at - from, plan.brown[side], plan.brownLong));
  return said(side ? 'flipMore' : 'flip', v);
}

/** 炖：从开火算到第 t 毫秒，火多大、汤熬到几成、扑过几回锅。 */
function stewAt(plan, log, t) {
  const s = FIRE.stew;
  const step = 50;
  let fire = s.start;
  let soup = 0;
  let hotFor = 0;
  let boils = 0;
  let inBand = 0;
  let i = 0;
  let dip = 0;
  for (let at = 0; at < Math.min(t, s.limit); at += step) {
    while (i < log.length && log[i][0] <= at) {
      if (log[i][1] === 'stoke') fire = Math.min(100, fire + s.stoke);
      i++;
    }
    while (dip < plan.dips.length && plan.dips[dip] <= at) {
      fire = Math.max(0, fire - s.dip);
      dip++;
    }
    fire = Math.max(0, fire - (plan.fall * step) / 1000);
    const zone =
      fire <= s.dying
        ? 'out'
        : fire < plan.band[0]
          ? 'cold'
          : fire <= plan.band[1]
            ? 'band'
            : 'hot';
    if (zone === 'band') inBand += step;
    if (zone !== 'out') soup += (s.rate[zone === 'band' ? 'band' : zone] * step) / 1000;
    hotFor = fire >= s.boil ? hotFor + step : 0;
    if (hotFor >= s.boilAfter) {
      boils++;
      hotFor = 0;
      fire -= 25; // 扑锅浇灭一截火
    }
  }
  return {
    fire,
    soup,
    boils,
    inBand,
    zone:
      fire <= s.dying
        ? 'out'
        : fire < plan.band[0]
          ? 'cold'
          : fire <= plan.band[1]
            ? 'band'
            : 'hot',
  };
}

/** 烤：此刻烤到第几面、这一面烤到几成。 */
function roastAt(plan, log, t) {
  const flips = log.filter(e => e[1] === 'flip').map(e => e[0]);
  const side = Math.min(flips.length, plan.brown.length - 1);
  const from = side ? flips[side - 1] : 0;
  const since = t - from;
  const brown = plan.brown[side];
  return {
    side,
    sides: plan.brown.length,
    last: side === plan.brown.length - 1,
    now: since >= brown && since <= brown + plan.brownLong,
    cue: since >= brown - FIRE.roast.cue && since < brown,
    late: since > brown + plan.brownLong,
    browned: Math.max(0, Math.min(1.5, since / (brown + plan.brownLong / 2))),
  };
}

/** 画面每一帧问的：此刻锅里什么样子，刚按的那一下怎样。 */
export function fireAt(plan, log, t) {
  const said = saidOf(plan, log);
  if (plan.method === 'fry') return { method: 'fry', said, ...fryAt(plan, log, t) };
  if (plan.method === 'stew') {
    const s = stewAt(plan, log, t);
    return {
      method: 'stew',
      said,
      ...s,
      white: s.soup >= FIRE.stew.done && s.soup <= plan.over,
      dry: s.soup > plan.over,
      band: plan.band,
      boil: FIRE.stew.boil,
      done: FIRE.stew.done,
      over: plan.over,
    };
  }
  return { method: 'roast', said, ...roastAt(plan, log, t) };
}

/**
 * 砸了也有点意思：这种做法砸在这一档、锅里有那几样（炖的还得扑过锅），换个说法、少罚一点或另有用处。
 * @param {string} method
 * @param {string} quality
 * @param {string[]} items
 * @param {any} beats
 */
export function twistOf(method, quality, items, beats) {
  for (const [id, t] of Object.entries(FIRE_TWISTS)) {
    if (t.method !== method || t.quality !== quality) continue;
    if ('items' in t && !items.some(k => t.items.includes(k))) continue;
    if ('boiled' in t && !(beats?.boils > 0)) continue;
    return { id, ...t };
  }
  return null;
}

/**
 * 出锅时定火候：七档里的一档，全中没有，每一拍怎样（画面和出锅那句话用）。
 * 出锅的时机定生熟；炒的下料、翻锅，炖的守火、扑锅，烤的每一面，定拿手不拿手。
 */
export function judge(plan, log) {
  const serveAt = firstOf(log, 'serve');
  if (plan.method === 'fry') {
    const add = firstOf(log, 'add');
    const heat = verdict(add, plan.smoke, plan.smokeLong);
    const tosses = log.filter(e => e[1] === 'toss').map(e => e[0] - (add ?? 0));
    const hits = plan.flares.filter(f =>
      tosses.some(x => x >= f && x <= f + plan.flareLong),
    ).length;
    const serve =
      add === null || serveAt === null
        ? { v: 'missed', d: add === null ? -3 : 3 }
        : verdict(serveAt - add, plan.color, plan.colorLong);
    let q = doneness(serve.d);
    // 下料时油不热，炒出来水汽重；油冒黑烟才下，带一股焦味
    if (q === 'good' && heat.v === 'right' && hits >= plan.flares.length - 1) q = 'great';
    if (q === 'good' && heat.d !== 0 && Math.abs(heat.d) >= 2) q = 'plain';
    const perfect = q === 'great' && heat.v === 'right' && hits === plan.flares.length;
    return {
      quality: q,
      perfect,
      beats: { heat: heat.v, toss: `${hits}/${plan.flares.length}`, serve: serve.v },
    };
  }
  if (plan.method === 'stew') {
    const end = serveAt ?? FIRE.stew.limit;
    const s = stewAt(plan, log, end);
    const { done } = FIRE.stew;
    let q;
    if (s.soup < done * 0.5) q = 'raw';
    else if (s.soup < done * 0.85) q = 'under';
    else if (s.soup < done) q = 'plain';
    else if (s.soup <= plan.over) q = 'good';
    else if (s.soup <= plan.over + 30) q = 'over';
    else q = 'burnt';
    const steady = end > 0 ? s.inBand / end : 0;
    if (q === 'good' && !s.boils && steady >= 0.6) q = 'great';
    if (q === 'good' && s.boils >= 2) q = 'over';
    const perfect = q === 'great' && steady >= 0.8;
    return {
      quality: q,
      perfect,
      beats: { steady: Math.round(steady * 100), boils: s.boils, soup: Math.round(s.soup) },
    };
  }
  // 烤：每一面按翻面（最后一面按出锅）的时刻判
  const presses = log.filter(e => e[1] === 'flip').map(e => e[0]);
  const sides = [];
  let from = 0;
  for (let k = 0; k < plan.brown.length; k++) {
    const last = k === plan.brown.length - 1;
    const at = last ? serveAt : (presses[k] ?? null);
    const v =
      at === null
        ? { v: 'missed', d: last ? 3 : -3 }
        : verdict(at - from, plan.brown[k], plan.brownLong);
    sides.push(v);
    if (at === null) break;
    from = at;
  }
  while (sides.length < plan.brown.length) sides.push({ v: 'missed', d: -3 });
  const worst = sides.reduce((a, b) => (Math.abs(b.d) > Math.abs(a.d) ? b : a));
  let q = doneness(worst.d);
  if (q === 'good' && sides.every(x => x.v === 'right')) q = 'great';
  const perfect = q === 'great';
  return { quality: q, perfect, beats: { sides: sides.map(x => x.v) } };
}

/** 照这份节拍样样都按在正当时的记录（测试和「乱玩的人」用）。 */
export function bestLog(plan) {
  if (plan.method === 'fry') {
    const add = plan.smoke + Math.round(plan.smokeLong / 2);
    return [
      [add, 'add'],
      ...plan.flares.map(f => [add + f + Math.round(plan.flareLong / 2), 'toss']),
      [add + plan.color + Math.round(plan.colorLong / 2), 'serve'],
    ];
  }
  if (plan.method === 'stew') {
    // 火一落到小火那一段的中间就添一回柴，汤熬白了就起锅
    const log = [];
    const mid = (plan.band[0] + plan.band[1]) / 2;
    for (let t = 0; t < FIRE.stew.limit; t += 50) {
      const s = stewAt(plan, log, t);
      if (s.soup >= FIRE.stew.done + 4) return [...log, [t, 'serve']];
      if (s.fire + FIRE.stew.stoke <= plan.band[1] && s.fire < mid) log.push([t, 'stoke']);
    }
    return [...log, [FIRE.stew.limit, 'serve']];
  }
  const log = [];
  let at = 0;
  plan.brown.forEach((b, k) => {
    at += b + Math.round(plan.brownLong / 2);
    log.push([at, k === plan.brown.length - 1 ? 'serve' : 'flip']);
  });
  return log;
}
