// 院里院外的家务：劈柴、编竹器、腌菜、养鸡，和坐下歇歇、看看星星。
// 鸡窝归户，背篓归人；家务材料统一从可够到的物品扣除。
//   homestead {id, at} → home.worked {id, label, line}；捡蛋另发 eggs.collected {n, fine}
//   一窝蛋里抽一下有没有一枚极品（见 quality 插件）
import { is } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { HOMEWORK, GREENS } from '../../content/activities.js';
import { ITEMS } from '../../content/items.js';
import { CALENDAR } from '../../content/calendar.js';
import { ACTIVITY_TEXT, REST_TEXT, RAINY_NIGHT } from '../../content/life-text.js';
import { fill } from '../../content/text.js';
import { FIRST_FINE, fineId } from '../../content/quality.js';
import { atStation } from '../stations.js';

// 做完一件家务的一段话（沿用 0.12）：歇脚看在哪儿歇，下雨的夜里看不见星星。
function choreLine(id, map, wet, eggs) {
  if (id === 'rest') return REST_TEXT[map] || REST_TEXT.yard;
  if (id === 'stars' && wet) return RAINY_NIGHT;
  return fill(ACTIVITY_TEXT[id] || '', { n: eggs });
}

export const homestead = {
  id: 'sim.homestead',
  requires: [
    'schema',
    'commands',
    'queries',
    'reactions',
    'core',
    'people',
    'store',
    'pack',
    'body',
    'compute',
    'outings',
    'clock',
    'weather',
    'quality',
  ],
  writes: ['homesteads'],
  install(ctx) {
    const {
      schema,
      commands,
      queries,
      reactions,
      core,
      people,
      store,
      pack,
      body,
      compute,
      outings,
      clock,
      weather,
      quality,
    } = ctx.services;
    schema.slice('homesteads', {
      initial: (env, w) =>
        Object.fromEntries(
          Object.keys(w.households).map(id => [id, { coop: false, hens: 0, fed: 0, eggs: 0 }]),
        ),
      validate: (all, w) =>
        (is.keyedBy(all, Object.keys(w.households)) &&
          Object.values(all).every(
            h =>
              typeof h.coop === 'boolean' &&
              is.int(h.hens, 0, 4) &&
              (h.coop || h.hens === 0) &&
              is.int(h.fed) &&
              is.int(h.eggs, 0, 12),
          )) ||
        'homesteads',
    });
    const home = w => w.homesteads[store.id(w)];
    const totalGreens = (w, id) => GREENS.reduce((n, k) => n + pack.reach(w, id, k), 0);
    const why = (w, a, at) => {
      if (!a) return '没有这件事';
      if (!atStation(w, people, a.station, at)) return '走到院里的物件旁再动手';
      const id = people.who(w),
        h = home(w);
      for (const [k, n] of Object.entries(a.cost || {}))
        if (pack.reach(w, id, k, at) < n) return `${ITEMS[k].name}不够，要${n}份`;
      if (a.id === 'pickle' && totalGreens(w, id) < 3) return '要三份青菜、萝卜、白菜这类的菜';
      if (a.id === 'buildCoop' && h.coop) return '鸡窝已经搭好了';
      if (a.id === 'buyHen' && (!h.coop || h.hens >= 4))
        return h.coop ? '鸡窝只能养四只' : '先搭好鸡窝';
      if (a.id === 'feedHens') {
        if (!h.hens) return '还没养鸡';
        if (h.fed === w.clock.day) return '今天喂过了';
        if (pack.reach(w, id, 'rice', at) + pack.reach(w, id, 'bean', at) < 1)
          return '要一把米或豆子';
      }
      if (a.id === 'eggs' && !h.eggs) return '窝里还没有蛋';
      if (a.id === 'bigbasket' && pack.big(w, id)) return '已经有大背篓了';
      if (a.id === 'rest' && people.me(w).energy >= 100) return '精神正足，不用歇';
      if (a.id === 'stars' && people.me(w).map === 'cottage') return '到屋外坐坐才能看天色';
      if (a.id === 'stars' && (w.clock.minute < CALENDAR.dark || outings.count(w, 'stars') > 0))
        return '天黑以后再来，每夜看一回';
      if (people.me(w).energy < people.quote(w, a.id).value) return '太累了，先歇歇';
      return null;
    };
    commands.register('homestead', ({ draft, input, fact }) => {
      const w = draft.world;
      people.place(w, input.at);
      const a = HOMEWORK[input.id],
        reason = why(w, a, null);
      if (reason) refuse(reason);
      const id = people.who(w),
        h = home(w);
      people.spend(w, draft, a.id, fact);
      for (const [k, n] of Object.entries(a.cost || {})) pack.use(w, id, k, n, a.label);
      if (a.id === 'pickle') {
        let left = 3;
        for (const k of GREENS) {
          const n = Math.min(left, pack.reach(w, id, k));
          if (n) pack.use(w, id, k, n, '腌菜');
          left -= n;
        }
      }
      for (const [k, n] of Object.entries(a.give || {})) pack.receive(w, id, k, n, a.label);
      if (a.id === 'buildCoop') h.coop = true;
      if (a.id === 'buyHen') {
        store.pay(w, 6, '托桂嫂抱鸡');
        h.hens++;
      }
      if (a.id === 'feedHens') {
        pack.use(w, id, pack.has(w, id, 'rice') ? 'rice' : 'bean', 1, '喂鸡');
        h.fed = w.clock.day;
      }
      let eggs = 0;
      let fineEgg = '';
      if (a.id === 'eggs') {
        eggs = h.eggs;
        // 一窝里抽一下有没有一枚极品蛋；极品另占一格，在外头放不下就不抽
        const room = eggs > 0 && (pack.fits(w, id, fineId('egg')) || people.atHome(w, id));
        const got = room ? quality.roll(w, id, 'egg', {}, 'egg') : { item: 'egg', fine: false };
        if (eggs - (got.fine ? 1 : 0) > 0)
          pack.receive(w, id, 'egg', eggs - (got.fine ? 1 : 0), '自家鸡下的');
        if (got.fine) pack.receive(w, id, got.item, 1, '自家鸡下的');
        h.eggs = 0;
        const name = ITEMS[got.item].name;
        if (got.fine) fineEgg = got.first ? fill(FIRST_FINE, { name }) : `里头有一枚${name}！`;
        fact('eggs.collected', { who: id, n: eggs, fine: got.fine });
      }
      if (a.id === 'bigbasket') {
        pack.upgrade(w, id);
        fact('pack.upgraded', { who: id, cap: 8 });
      }
      if (a.id === 'rest') {
        const r = compute.run('rest.restore', { w, who: id }, { value: 16, mood: 2, parts: [] });
        people.restore(w, id, r.value, '歇了一会儿');
        body.mood(w, id, r.mood, '歇口气，心里松快');
        clock.elapse(w, 180, fact);
      }
      // 做完的一段话按坐下那一刻算：在哪儿歇、下没下雨。
      const line = choreLine(a.id, people.me(w).map, weather.has(w, 'wet'), eggs) + fineEgg;
      if (a.id === 'stars') {
        outings.mark(w, 'stars');
        body.mood(w, id, 4, '看了一会儿星星');
        clock.elapse(w, 180, fact);
      }
      fact('home.worked', { who: id, id: a.id, label: a.label, line });
    });
    reactions.on(
      'day.started',
      (s, e, emit) => {
        for (const [id, h] of Object.entries(s.world.homesteads)) {
          let n = 0;
          for (let i = 0; i < h.hens; i++)
            if (core.random(s.world) < (h.fed === s.world.clock.day - 1 ? 0.8 : 0.3)) n++;
          h.eggs = Math.min(12, h.eggs + n);
          if (n) emit('hens.laid', { household: id, n });
        }
      },
      { priority: 47 },
    );
    queries.define('homestead', (w, station, at) => ({
      ...home(w),
      options: Object.values(HOMEWORK)
        .filter(a => a.station === station && !(a.id === 'stars' && people.me(w).map === 'cottage'))
        .map(a => ({
          ...a,
          reason: why(w, a, at),
          cost: people.quote(w, a.id),
          materials: Object.entries(a.cost || {})
            .map(([k, n]) => `${ITEMS[k].name}×${n}`)
            .join('、'),
        })),
    }));
  },
};
