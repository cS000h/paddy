// 小屋里的摆设：六处，每处换几种样子（东西和话在 content/furniture.js）。只换好看，不加任何数值。
// 托人做 / 买下的收着，随时免费换回原样或别的。人要在小屋里才换得了。县城货等阿满捎（第 7 步），现在买不到。
// 存档记买下了哪几样、每处现在摆的是哪样。
//   decor.buy {slot, style, at} → decor.changed {slot, style, bought, coins, line}
//   decor.set {slot, style, at} → decor.changed {slot, style, bought: false, line}
import { is } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { DECOR, DECOR_SLOTS, DECOR_MAKERS, decorId } from '../../content/furniture.js';

const ALL = DECOR_SLOTS.flatMap(slot =>
  Object.keys(DECOR[slot].styles)
    .filter(style => style !== 'default')
    .map(style => decorId(slot, style)),
);

export const decor = {
  id: 'sim.decor',
  provides: ['decor'],
  requires: ['schema', 'commands', 'queries', 'people', 'store'],
  writes: ['decor'],
  install(ctx) {
    const { schema, commands, queries, people, store } = ctx.services;
    schema.slice('decor', {
      initial: () => ({ owned: [], on: {} }),
      validate: d =>
        (is.arr(d.owned, ALL.length) &&
          d.owned.every(id => ALL.includes(id)) &&
          is.obj(d.on) &&
          Object.entries(d.on).every(
            ([slot, style]) => DECOR_SLOTS.includes(slot) && d.owned.includes(decorId(slot, style)),
          )) ||
        'decor',
    });

    /** 共同的检查：在小屋里、有这一处这一样。 */
    function pick(w, input) {
      people.place(w, input.at);
      if (people.me(w).map !== 'cottage') refuse('回小屋里再换摆设');
      const slot = DECOR[input.slot];
      const style = slot?.styles[input.style];
      if (!style) refuse('没有这样摆设');
      return style;
    }
    function put(w, slot, style) {
      if (style === 'default') delete w.decor.on[slot];
      else w.decor.on[slot] = style;
    }

    commands.register('decor.buy', ({ draft, input, fact }) => {
      const w = draft.world;
      const s = pick(w, input);
      const id = decorId(input.slot, input.style);
      if (input.style === 'default' || w.decor.owned.includes(id)) refuse('这样已经有了');
      if (!s.from || s.from === 'town') refuse('县城的货，得托阿满进城捎回来');
      store.pay(w, s.price, `托${DECOR_MAKERS[s.from]}置办${s.name}`);
      w.decor.owned.push(id);
      put(w, input.slot, input.style);
      fact('decor.changed', {
        slot: input.slot,
        style: input.style,
        bought: true,
        coins: s.price,
        line: s.line,
      });
    });

    commands.register('decor.set', ({ draft, input, fact }) => {
      const w = draft.world;
      const s = pick(w, input);
      if (input.style !== 'default' && !w.decor.owned.includes(decorId(input.slot, input.style)))
        refuse('这样还没置办');
      if ((w.decor.on[input.slot] || 'default') === input.style) refuse('现在摆的就是这样');
      put(w, input.slot, input.style);
      fact('decor.changed', { slot: input.slot, style: input.style, bought: false, line: s.line });
    });

    // 县城货是阿满捎回来、县城大单送的（sim/plugins/town.js），不经过付钱
    ctx.provide(
      'decor',
      Object.freeze({
        owns: (w, id) => w.decor.owned.includes(id),
        grant: ctx.own((w, id) => {
          if (!ALL.includes(id) || w.decor.owned.includes(id)) return false;
          w.decor.owned.push(id);
          return true;
        }),
      }),
    );

    // 各处摆设：{slot: {name, object, on, styles: [{id, name, desc, from, maker, price, owned, on}]}}
    queries.define('decor', w =>
      Object.fromEntries(
        DECOR_SLOTS.map(slot => {
          const on = w.decor.on[slot] || 'default';
          const d = DECOR[slot];
          return [
            slot,
            {
              name: d.name,
              object: d.object,
              on,
              styles: Object.entries(d.styles).map(([style, s]) => ({
                id: style,
                name: s.name,
                desc: s.desc,
                from: s.from || null,
                maker: s.from ? DECOR_MAKERS[s.from] : null,
                price: s.price,
                owned: style === 'default' || w.decor.owned.includes(decorId(slot, style)),
                on: style === on,
              })),
            },
          ];
        }),
      ),
    );
  },
};
