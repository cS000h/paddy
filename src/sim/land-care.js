import { CROPS, isRipe } from '../content/items.js';
import { dateOf } from '../content/calendar.js';
import { near } from './plugins/people.js';
import { refuse } from '../kernel/dispatch.js';
// 仍由land插件拥有并写入田地，拆文件只为让单个文件保持短小。
export function installLandCare(ctx, plotAt) {
  const { reactions, queries, commands, core, weather, compute, people, store } = ctx.services;
  const careWhy = (w, p, kind) => {
    if (!p) return '先锄松一格地';
    if (kind === 'weed') return p.weeds ? null : '没有杂草';
    if (kind === 'bugs')
      return !p.bugs ? '没有菜虫' : w.clock.minute < 1140 ? '晚上打着灯再捉' : null;
    if (kind === 'drain') return p.drained ? '已经挖过沟了' : null;
    if (kind === 'manure')
      return p.fed === w.clock.day
        ? '今天施过肥了'
        : p.fert >= 10
          ? '地力足了'
          : !store.count(w, 'ash') && !store.count(w, 'compost')
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
      plot.water = Math.min(24, plot.water);
    }
    if (input.kind === 'manure') {
      const item = store.count(w, 'compost') ? 'compost' : 'ash';
      store.take(w, item, 1, '给菜地施肥');
      plot.fert = Math.min(10, plot.fert + (item === 'compost' ? 3 : 2));
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
      name: c?.name || '空地',
      days: c?.days || 0,
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
      if (p.fert >= 7) compute.part(r, 'field.fert', '地力足', 1);
      if (p.fert <= 2) compute.part(r, 'field.poor', '地乏了', -1);
      if (p.bugs) compute.part(r, 'field.bugs', '虫子啃了', -1);
      r.value = Math.max(1, r.value);
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
          p.water = Math.max(0, Math.min(p.drained ? 24 : 30, p.water + delta));
          p.wet = p.water >= 8;
          if (!p.crop) continue;
          const c = CROPS[p.crop];
          const flooded = !p.drained && t.tags.includes('heavy') && p.water >= 28;
          const slow =
            (si === 3 && c.hardy && w.clock.day % 2 === 0) ||
            ((p.weeds || p.fert === 0) && w.clock.day % 2 === 0);
          if (
            !flooded &&
            !slow &&
            c.seasons.includes(si) &&
            p.water >= (c.thirsty ? 14 : 8) &&
            p.water <= 26 &&
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
          p.water = Math.min(p.drained ? 24 : 30, p.water + 3);
          p.wet = p.water >= 8;
        }
    },
    { priority: 20 },
  );
}
