import { FIELD_ADVICE } from '../content/encounters.js';
import { CROPS, SOIL, isRipe } from '../content/items.js';
import { FIELD_ODDS } from '../content/quality.js';
import { CALENDAR, dateOf } from '../content/calendar.js';
import { near } from './plugins/people.js';
import { refuse } from '../kernel/dispatch.js';
// 田地的照料：拔草、捉虫、开沟、施肥，以及每天早上地里的变化（干湿、生长、草和虫）。
// 仍由 land 插件拥有并写入田地，拆文件只为让单个文件保持短小。

/** 这格地的水最多能到多少：开了沟的存不住那么多水。 */
const capOf = p => (p.drained ? SOIL.drainedMax : SOIL.waterMax);
/** 施肥用家里的哪样：堆肥最肥，钓鱼钩上来的水草团和灶膛里的草木灰次之（草木灰还防虫）。 */
const MANURES = ['compost', 'waterweed', 'ash'];
export function fieldAdvice(p) {
  const c = CROPS[p.crop];
  return !c
    ? FIELD_ADVICE.tilled
    : isRipe(p.crop, p.age)
      ? FIELD_ADVICE.ripe
      : p.water > SOIL.soggy
        ? FIELD_ADVICE.soggy
        : p.water < (c.thirsty ? SOIL.moist : SOIL.wet)
          ? FIELD_ADVICE.dry
          : p.bugs
            ? FIELD_ADVICE.bugs
            : p.weeds
              ? FIELD_ADVICE.weeds
              : FIELD_ADVICE.watered;
}

export function installLandCare(ctx, plotAt) {
  const { reactions, queries, commands, core, weather, compute, people, store, quality } =
    ctx.services;
  const careWhy = (w, p, kind) => {
    if (!p) return '先锄松一格地';
    if (kind === 'weed') return p.weeds ? null : '没有杂草';
    if (kind === 'bugs')
      return !p.bugs ? '没有菜虫' : w.clock.minute < CALENDAR.dark ? '晚上打着灯再捉' : null;
    if (kind === 'drain') return p.drained ? '已经挖过沟了' : null;
    if (kind === 'manure')
      return p.fed === w.clock.day
        ? '今天施过肥了'
        : p.fert >= SOIL.fertMax
          ? '地力足了'
          : !MANURES.some(k => store.count(w, k))
            ? '灶膛里还没有灰，再烧几回火'
            : null;
    return '没有这件农活';
  };
  commands.register('farm.care', ({ draft, input, fact }) => {
    const w = draft.world,
      p = people.place(w, input.at),
      plot = plotAt(w, p.map, input.x, input.y);
    if (!near(p, input)) refuse('够不着，走近一点');
    const reason = careWhy(w, plot, input.kind);
    if (reason) refuse(reason);
    people.spend(w, draft, input.kind, fact);
    if (input.kind === 'weed') plot.weeds = false;
    if (input.kind === 'bugs') plot.bugs = false;
    if (input.kind === 'drain') {
      plot.drained = true;
      plot.water = Math.min(SOIL.drainedMax, plot.water);
    }
    if (input.kind === 'manure') {
      const item = MANURES.find(k => store.count(w, k));
      store.take(w, item, 1, '给菜地施肥');
      plot.fert = Math.min(SOIL.fertMax, plot.fert + (item === 'compost' ? 3 : 2));
      plot.fed = w.clock.day;
      if (item === 'ash') plot.bugs = false;
    }
    fact('plot.cared', { who: people.who(w), kind: input.kind, x: input.x, y: input.y });
  });
  queries.define('farm.detail', (w, x, y) => {
    const p = plotAt(w, people.me(w).map, x, y);
    if (!p) return null;
    const c = p.crop ? CROPS[p.crop] : null;
    return {
      ...p,
      advice: fieldAdvice(p),
      name: c?.name || '空地',
      days: c?.days || 0,
      // 照现在的样子收，出极品的机会多大、哪几样加减的
      odds: c ? quality.chance(w, people.who(w), 'farm', { plot: p }) : null,
      options: ['weed', 'bugs', 'drain', 'manure'].map(kind => ({
        kind,
        reason: careWhy(w, p, kind),
        cost: people.quote(w, kind),
      })),
    };
  });
  compute.tap(
    'action.yield',
    (r, { action }) => {
      const p = action.plot;
      if (!p || action.id !== 'harvest') return;
      if (p.fert >= SOIL.fertRich) compute.part(r, 'field.fert', '地力足', 1);
      if (p.fert <= SOIL.fertPoor) compute.part(r, 'field.poor', '地乏了', -1);
      if (p.bugs) compute.part(r, 'field.bugs', '虫子啃了', -1);
      r.value = Math.max(1, r.value);
    },
    { priority: 30 },
  );
  // 出极品的机会：地力比 5 高多少、土润不润、有没有草和虫（数在 content/quality.js）
  compute.tap(
    'quality.chance',
    (r, { kind, plot: p }) => {
      if (kind !== 'farm' || !p) return;
      const { fert, moist, dry, weeds, bugs } = FIELD_ODDS;
      compute.part(r, 'field.fert', '地力' + p.fert, (p.fert - 5) * fert);
      if (p.water >= SOIL.moist && p.water <= SOIL.soggy)
        compute.part(r, 'field.moist', '土润着', moist);
      if (p.water < SOIL.wet) compute.part(r, 'field.dry', '土干了', dry);
      if (p.weeds) compute.part(r, 'field.weeds', '长了草', weeds);
      if (p.bugs) compute.part(r, 'field.bugs', '生了虫', bugs);
    },
    { priority: 30 },
  );
  reactions.on(
    'day.started',
    (s, e, emit) => {
      const w = s.world,
        si = dateOf(w.clock.day).season,
        t = weather.view(w);
      for (const [map, m] of Object.entries(w.land))
        for (const [key, p] of Object.entries(m.plots)) {
          const delta = t.water - (t.code === 'sunny' && si === 1 ? 2 : 0);
          p.water = Math.max(0, Math.min(capOf(p), p.water + delta));
          p.wet = p.water >= SOIL.wet;
          if (!p.crop) continue;
          const c = CROPS[p.crop];
          const flooded = !p.drained && t.tags.includes('heavy') && p.water >= SOIL.flooded;
          const slow =
            (si === 3 && c.hardy && w.clock.day % 2 === 0) ||
            ((p.weeds || p.fert === 0) && w.clock.day % 2 === 0);
          if (
            !flooded &&
            !slow &&
            c.seasons.includes(si) &&
            p.water >= (c.thirsty ? SOIL.moist : SOIL.wet) &&
            p.water <= SOIL.soggy &&
            !isRipe(p.crop, p.age)
          ) {
            p.age++;
            const [x, y] = key.split(',').map(Number);
            emit('crop.grew', { map, x, y, crop: p.crop, age: p.age, ripe: isRipe(p.crop, p.age) });
          }
          // 收过第一茬以后才让玩家开始留心草虫，保留原版循序教农事的节奏。
          if (w.guide.done.harvest && p.age > 0) {
            if (!p.weeds && core.random(w) < (t.tags.includes('wet') ? 0.35 : 0.2)) p.weeds = true;
            if (!p.bugs && [1, 2].includes(si) && core.random(w) < 0.18) p.bugs = true;
          }
        }
    },
    { priority: 30 },
  );
  reactions.on(
    'weather.changed',
    (s, e) => {
      if (e.data.cause !== 'shift' || !weather.has(s.world, 'wet')) return;
      for (const m of Object.values(s.world.land))
        for (const p of Object.values(m.plots)) {
          p.water = Math.min(capOf(p), p.water + 3);
          p.wet = p.water >= SOIL.wet;
        }
    },
    { priority: 20 },
  );
}
