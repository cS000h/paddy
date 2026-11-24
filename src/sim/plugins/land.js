// 田地。每一格地有自己的状态：锄过没有、今天浇过没有、种着什么、长了几天。
//   farm.till    {x, y, at} → plot.tilled
//   farm.sow     {x, y, at, seed} → plot.sown
//   farm.water   {x, y, at} → plot.watered
//   farm.harvest {x, y, at} → crop.harvested {item, n, fine, line}   收到的可能是极品（见 quality 插件）
//   farm.refill  {x, y, at} → can.refilled      （挨着水缸、水井、水沟或溪水）
//   day.started  → 浇过水的作物长一天，然后土干掉
// 每条命令里的 at 是操控的人此刻站的格子；目标格必须挨着他。
// 菜种从身上拿（人在院里时家里存的也算），收下来的菜先进行囊。
// “为什么不行”只写在 why() 一处：命令用它拒绝，画面用同一个它来提示，两边不会说法不一。
import { ENCOUNTER_WORDS as words } from '../../content/encounters.js';
import { registerResidentOptions } from '../resident-options.js';
import { is } from '../../kernel/schema.js';
import { CROPS, ITEMS, CAN_CAPACITY, SOIL, cropStage, isRipe } from '../../content/items.js';
import { FIRST_FINE, fineId } from '../../content/quality.js';
import { fill } from '../../content/text.js';
import { MAPS, farmable, waterSource, isHome } from '../../content/maps/index.js';
import { dateOf } from '../../content/calendar.js';
import { fieldAdvice, installLandCare } from '../land-care.js';
import { near } from './people.js';

const key = (x, y) => `${x},${y}`;
const SEED = 'seed.qingcai';
const cropOf = seed => Object.values(CROPS).find(c => c.seed === seed);

function shi({ ask, person }) {
  if (person.place !== 'field') return [];
  return ask('farm.plots', 'yard', true)
    .filter(p => p.crop)
    .map(p => {
      const { x, y } = p;
      return {
        key: 'plot.' + x + '.' + y,
        group: '请他看一畦',
        label: p.name,
        plot: { x, y },
        line: words.crop(p.name, p.advice),
      };
    });
}

export const land = {
  id: 'sim.land',
  provides: ['land'],
  requires: [
    'schema',
    'commands',
    'reactions',
    'queries',
    'people',
    'store',
    'pack',
    'compute',
    'core',
    'weather',
    'quality',
  ],
  writes: ['land'],
  install(ctx) {
    registerResidentOptions(ctx, 'shi', shi);
    const { schema, commands, reactions, queries, people, store, pack, compute, quality } =
      ctx.services;

    schema.slice('land', {
      initial: () => Object.fromEntries(Object.keys(MAPS).map(id => [id, { plots: {} }])),
      validate: all =>
        (is.keyedBy(all, Object.keys(MAPS)) &&
          Object.entries(all).every(
            ([id, m]) =>
              is.obj(m) &&
              is.obj(m.plots) &&
              Object.entries(m.plots).every(([k, p]) => {
                const [x, y] = k.split(',').map(Number);
                return (
                  k === key(x, y) &&
                  farmable(MAPS[id], x, y) &&
                  is.obj(p) &&
                  typeof p.wet === 'boolean' &&
                  is.int(p.water, 0, SOIL.waterMax) &&
                  is.int(p.fert, 0, SOIL.fertMax) &&
                  typeof p.weeds === 'boolean' &&
                  typeof p.bugs === 'boolean' &&
                  typeof p.drained === 'boolean' &&
                  is.int(p.fed) &&
                  (p.last === null || Object.hasOwn(CROPS, p.last)) &&
                  (p.crop === null || (Object.hasOwn(CROPS, p.crop) && is.int(p.age, 0, 99)))
                );
              }),
          )) ||
        'plots',
    });

    const plotAt = (w, map, x, y) => w.land[map].plots[key(x, y)] || null;

    // 在 (x, y) 做 action 为什么不行；能做就返回 null。只读。
    function why(w, action, x, y, at = null, seed = SEED) {
      const p = people.me(w);
      const id = people.who(w);
      const map = MAPS[p.map];
      const here = at || p;
      const home = isHome(map, here.x, here.y);
      if (!is.int(x, 0, 999) || !is.int(y, 0, 999) || !near(here, { x, y }))
        return '够不着，走近一点';
      const plot = plotAt(w, p.map, x, y);
      if (action === 'refill') {
        if (!waterSource(map, x, y)) return '这儿没有水';
        return store.water(w) >= CAN_CAPACITY ? '水壶已经满了' : null;
      }
      if (action === 'hoe') {
        if (!farmable(map, x, y)) return '这儿不是菜地';
        return plot ? '这一格已经锄过了' : null;
      }
      if (!plot) return farmable(map, x, y) ? '先用锄头把地锄松' : '这儿不是菜地';
      if (action === 'seed') {
        if (plot.crop) return '这一格已经种上了';
        const crop = cropOf(seed);
        if (!crop) return '没有这种菜种';
        if (!crop.seasons.includes(dateOf(w.clock.day).season)) return `这个时节种不了${crop.name}`;
        if (pack.count(w, id, seed) > 0) return null;
        if (store.count(w, seed) < 1) return '种子用完了，托阿满捎一些来';
        return home ? null : '菜种在家里的橱柜里，先回去拿上';
      }
      if (action === 'can') {
        if (plot.water >= SOIL.moist) return '土还润着，不必再浇';
        return store.water(w) > 0 ? null : '水壶空了，去水缸、水井或溪边打水';
      }
      if (action === 'hand') {
        if (!plot.crop) return '这一格还没种东西';
        if (!isRipe(plot.crop, plot.age)) return `${CROPS[plot.crop].name}还没长成`;
        // 收下来可能是极品（另占一格），两样都放得下才收
        const produce = CROPS[plot.crop].produce;
        const fits = [produce, fineId(produce)].every(k => !ITEMS[k] || pack.fits(w, id, k));
        return home || fits ? null : '行囊满了，先回家放一放';
      }
      return '不知道要做什么';
    }

    // 一条农事命令的公共部分：先记下站位，再查能不能做，再扣体力。
    const farm =
      (action, run) =>
      ({ draft, input, fact }) => {
        const w = draft.world;
        const p = people.place(w, input.at);
        const reason = why(w, action, input.x, input.y, null, input.seed || SEED);
        if (reason) return { ok: false, reason };
        people.spend(w, draft, action, fact);
        run(w, p.map, input.x, input.y, fact, people.who(w), input);
      };

    commands.register(
      'farm.till',
      farm('hoe', (w, map, x, y, fact) => {
        w.land[map].plots[key(x, y)] = {
          wet: false,
          crop: null,
          age: 0,
          water: 0,
          drained: false,
          fert: SOIL.fertStart,
          weeds: false,
          bugs: false,
          fed: 0,
          last: null,
        };
        fact('plot.tilled', { map, x, y });
      }),
    );

    commands.register(
      'farm.sow',
      farm('seed', (w, map, x, y, fact, id, input) => {
        const seed = input.seed || SEED;
        pack.use(w, id, seed, 1, '播种');
        const plot = plotAt(w, map, x, y);
        plot.crop = cropOf(seed).id;
        plot.age = 0;
        fact('plot.sown', { map, x, y, crop: plot.crop });
      }),
    );

    commands.register(
      'farm.water',
      farm('can', (w, map, x, y, fact) => {
        store.pour(w);
        const p = plotAt(w, map, x, y);
        p.water = Math.min(p.drained ? SOIL.drainedMax : SOIL.waterMax, p.water + SOIL.pour);
        p.wet = p.water >= SOIL.wet;
        fact('plot.watered', { map, x, y });
      }),
    );

    commands.register(
      'farm.harvest',
      farm('hand', (w, map, x, y, fact, id) => {
        const plot = plotAt(w, map, x, y);
        const def = CROPS[plot.crop];
        const n = compute.run(
          'action.yield',
          { w, who: id, action: { id: 'harvest', kind: 'farm', plot } },
          { value: def.yield, parts: [] },
        ).value;
        // 抽一下是不是极品；头一回收到极品，借这一回说说它有什么用
        const got = quality.roll(w, id, 'farm', { plot }, def.produce);
        pack.receive(w, id, got.item, n, '地里收的');
        const line = got.first ? fill(FIRST_FINE, { name: ITEMS[got.item].name }) : null;
        fact('crop.harvested', {
          map,
          x,
          y,
          crop: def.id,
          item: got.item,
          n,
          fine: got.fine,
          line,
        });
        plot.fert = Math.max(0, plot.fert - (plot.last === plot.crop && !def.regrow ? 3 : 2));
        plot.bugs = false;
        if (def.regrow) plot.age = def.regrow;
        else {
          plot.last = plot.crop;
          plot.crop = null;
          plot.age = 0;
          plot.weeds = false;
        }
      }),
    );

    commands.register(
      'farm.refill',
      farm('refill', (w, map, x, y, fact) => {
        store.refill(w);
        fact('can.refilled', { x, y });
      }),
    );

    installLandCare(ctx, plotAt);

    // 画地用的：每格的干湿、作物和阶段，以及要不要照料（长草、生虫画在地上，一眼看得出）。
    queries.define('farm.plots', (w, map, withAdvice = false) =>
      Object.entries(w.land[map].plots).map(([k, p]) => {
        const [x, y] = k.split(',').map(Number);
        return {
          x,
          y,
          wet: p.wet,
          crop: p.crop,
          ...(withAdvice && p.crop ? { name: CROPS[p.crop].name, advice: fieldAdvice(p) } : {}),
          stage: p.crop ? cropStage(p.crop, p.age) : -1,
          ripe: p.crop ? isRipe(p.crop, p.age) : false,
          weeds: p.weeds,
          bugs: p.bugs,
        };
      }),
    );
    queries.define('farm.why', (w, action, x, y, at, seed) => why(w, action, x, y, at, seed));

    /** 你那块地（小院）现在的样子：种着没有、长到第几段、最干那格多干、排水沟挖了没有。 */
    function fieldSummary(w) {
      const plots = Object.values(w.land.yard.plots).filter(p => p.crop);
      return {
        planted: plots.length > 0,
        growth: Math.max(0, ...plots.map(p => cropStage(p.crop, p.age))),
        water: plots.length ? Math.min(...plots.map(p => p.water)) : SOIL.waterMax,
        drained: plots.length > 0 && plots.every(p => p.drained),
      };
    }

    ctx.provide('land', Object.freeze({ plotAt, why, fieldSummary }));
  },
};
