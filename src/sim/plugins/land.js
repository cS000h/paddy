// 田地。每一格地有自己的状态：锄过没有、今天浇过没有、种着什么、长了几天。
//   farm.till    {x, y, at} → plot.tilled
//   farm.sow     {x, y, at, seed} → plot.sown
//   farm.water   {x, y, at} → plot.watered
//   farm.harvest {x, y, at} → crop.harvested
//   farm.refill  {x, y, at} → can.refilled      （挨着水缸、水井、水沟或溪水）
//   day.started  → 浇过水的作物长一天，然后土干掉
// 每条命令里的 at 是操控的人此刻站的格子；目标格必须挨着他。
// 菜种从身上拿（人在院里时家里存的也算），收下来的菜先进行囊。
// “为什么不行”只写在 why() 一处：命令用它拒绝，画面用同一个它来提示，两边不会说法不一。
import { is } from '../../kernel/schema.js';
import { CROPS, ITEMS, CAN_CAPACITY, cropStage, isRipe } from '../../content/items.js';
import { MAPS, farmable, waterSource, isHome } from '../../content/maps/index.js';
import { near } from './people.js';

const key = (x, y) => `${x},${y}`;
const SEED = 'seed.qingcai'; // 现在只有青菜一种；M5 把别的作物搬进来时改成“手里选的那一种”

export const land = {
  id: 'sim.land',
  provides: ['land'],
  requires: ['schema', 'commands', 'reactions', 'queries', 'people', 'store', 'pack', 'compute'],
  writes: ['land'],
  install(ctx) {
    const { schema, commands, reactions, queries, people, store, pack, compute } = ctx.services;

    schema.slice('land', {
      initial: () => Object.fromEntries(Object.keys(MAPS).map(id => [id, { plots: {} }])),
      validate: all =>
        Object.entries(all).every(
          ([id, m]) =>
            Object.hasOwn(MAPS, id) &&
            is.obj(m.plots) &&
            Object.entries(m.plots).every(([k, p]) => {
              const [x, y] = k.split(',').map(Number);
              return (
                farmable(MAPS[id], x, y) &&
                typeof p.wet === 'boolean' &&
                (p.crop === null || (Object.hasOwn(CROPS, p.crop) && is.int(p.age, 0, 99)))
              );
            }),
        ) || 'plots',
    });

    const plotAt = (w, map, x, y) => w.land[map].plots[key(x, y)] || null;

    // 在 (x, y) 做 action 为什么不行；能做就返回 null。只读。
    function why(w, action, x, y, at = null) {
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
        if (pack.count(w, id, SEED) > 0) return null;
        if (store.count(w, SEED) < 1) return '种子用完了，托阿满捎一些来';
        return home ? null : '菜种在家里的橱柜里，先回去拿上';
      }
      if (action === 'can') {
        if (plot.wet) return '今天浇过了，土还润着';
        return store.water(w) > 0 ? null : '水壶空了，去水缸、水井或溪边打水';
      }
      if (action === 'hand') {
        if (!plot.crop) return '这一格还没种东西';
        if (!isRipe(plot.crop, plot.age)) return `${CROPS[plot.crop].name}还没长成`;
        return home || pack.fits(w, id, CROPS[plot.crop].produce) ? null : '行囊满了，先回家放一放';
      }
      return '不知道要做什么';
    }

    // 一条农事命令的公共部分：先记下站位，再查能不能做，再扣体力。
    const farm =
      (action, run) =>
      ({ draft, input, fact }) => {
        const w = draft.world;
        const p = people.place(w, input.at);
        const reason = why(w, action, input.x, input.y);
        if (reason) return { ok: false, reason };
        people.spend(w, draft, action, fact);
        run(w, p.map, input.x, input.y, fact, people.who(w));
      };

    commands.register(
      'farm.till',
      farm('hoe', (w, map, x, y, fact) => {
        w.land[map].plots[key(x, y)] = { wet: false, crop: null, age: 0 };
        fact('plot.tilled', { map, x, y });
      }),
    );

    commands.register(
      'farm.sow',
      farm('seed', (w, map, x, y, fact, id) => {
        pack.use(w, id, SEED, 1, '播种');
        const plot = plotAt(w, map, x, y);
        plot.crop = ITEMS[SEED].crop;
        plot.age = 0;
        fact('plot.sown', { map, x, y, crop: plot.crop });
      }),
    );

    commands.register(
      'farm.water',
      farm('can', (w, map, x, y, fact) => {
        store.pour(w);
        plotAt(w, map, x, y).wet = true;
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
          { w, who: id, action: { id: 'harvest', kind: 'farm' } },
          { value: def.yield, parts: [] },
        ).value;
        pack.receive(w, id, def.produce, n, '地里收的');
        fact('crop.harvested', { map, x, y, crop: def.id, item: def.produce, n });
        plot.crop = null;
        plot.age = 0;
      }),
    );

    commands.register(
      'farm.refill',
      farm('refill', (w, map, x, y, fact) => {
        store.refill(w);
        fact('can.refilled', { x, y });
      }),
    );

    // 清早：昨天浇过水的作物长一天；然后所有的土都干了。
    reactions.on(
      'day.started',
      (s, e, emit) => {
        for (const [map, m] of Object.entries(s.world.land))
          for (const [k, plot] of Object.entries(m.plots)) {
            if (plot.crop && plot.wet && !isRipe(plot.crop, plot.age)) {
              plot.age += 1;
              const [x, y] = k.split(',').map(Number);
              emit('crop.grew', {
                map,
                x,
                y,
                crop: plot.crop,
                age: plot.age,
                ripe: isRipe(plot.crop, plot.age),
              });
            }
            plot.wet = false;
          }
      },
      { priority: 30 },
    );

    queries.define('farm.plots', (w, map) =>
      Object.entries(w.land[map].plots).map(([k, p]) => {
        const [x, y] = k.split(',').map(Number);
        return {
          x,
          y,
          wet: p.wet,
          crop: p.crop,
          stage: p.crop ? cropStage(p.crop, p.age) : -1,
          ripe: p.crop ? isRipe(p.crop, p.age) : false,
        };
      }),
    );
    queries.define('farm.why', (w, action, x, y, at) => why(w, action, x, y, at));

    ctx.provide('land', Object.freeze({ plotAt, why }));
  },
};
