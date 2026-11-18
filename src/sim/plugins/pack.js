// 随身行囊。身上带的东西归个人（packs[人]），家里存的归这一户（见 household 插件）。
// 一格放一样东西，不论多少；大件（西瓜、带汤的饭菜）占两格。一共 6 格，编了大背篓是 8 格。
// 在外头收的、捡的、别人给的，先进行囊；装不下了，得回院里放一放。
// 用东西（播种、送人、吃）先从身上拿；人在自家院里时，家里存的也够得着。
//   pack.put  {item, n | 'all', at}  从家里拿上（要在院里）    → pack.changed
//   pack.take {item, n | 'all', at}  放回家里（要在院里）      → pack.changed
//   eat       {item, at}             直接吃：零嘴，或能生吃的  → meal.eaten {line}
import { validDish, dishSize } from '../dish.js';
import { is, check } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { ITEMS } from '../../content/items.js';
import { START_PACK, eatenAs, giftable, basketTakes } from '../../content/pantry.js';
import { BODY, SNACK_BUFF_USES, buffUses } from '../../content/body.js';

export const PACK_SLOTS = 6;
const FULL = '行囊满了，先回家放一放';

export const pack = {
  id: 'sim.pack',
  provides: ['pack'],
  requires: ['schema', 'commands', 'queries', 'core', 'people', 'store', 'body'],
  writes: ['packs'],
  install(ctx) {
    const { schema, commands, queries, core, people, store, body } = ctx.services;

    const sizeOf = items => Object.keys(items).reduce((sum, k) => sum + ITEMS[k].size, 0);

    schema.slice('packs', {
      initial: (env, world) =>
        Object.fromEntries(
          Object.values(world.households)
            .flatMap(h => h.members)
            .map(id => [
              id,
              { cap: PACK_SLOTS, big: false, items: { ...START_PACK }, flask: 0, dishes: [] },
            ]),
        ),
      validate: (all, w) =>
        check([
          [is.obj(all) && Object.keys(all).every(id => Object.hasOwn(w.people, id)), 'whose'],
          [
            Object.values(all).every(
              p =>
                is.int(p.cap, 4, 12) &&
                typeof p.big === 'boolean' &&
                is.int(p.flask, 0, BODY.flaskSips) &&
                is.arr(p.dishes, 12) &&
                p.dishes.every(validDish) &&
                is.obj(p.items) &&
                Object.entries(p.items).every(([k, n]) => ITEMS[k]?.carry && is.int(n, 1, 999)),
            ),
            'fields',
          ],
          [
            Object.values(all).every(
              p => sizeOf(p.items) + p.dishes.reduce((n, d) => n + dishSize(d), 0) <= p.cap,
            ),
            'over capacity',
          ],
        ]),
    });

    const count = (w, id, item) => w.packs[id].items[item] || 0;
    const used = (w, id) =>
      sizeOf(w.packs[id].items) + w.packs[id].dishes.reduce((n, d) => n + dishSize(d), 0);
    const room = (w, id) => w.packs[id].cap - used(w, id);
    /** 还放不放得下：已经有这样东西就能接着放，否则要有空格。 */
    const fits = (w, id, item) =>
      !!ITEMS[item]?.carry && (count(w, id, item) > 0 || room(w, id) >= ITEMS[item].size);

    const put = ctx.own((w, id, item, n = 1, why = null) => {
      const def = ITEMS[item];
      if (!def || !is.int(n, 1)) throw new Error('没有这样东西：' + item);
      if (!def.carry) refuse(`${def.name}不好随身带`);
      if (!fits(w, id, item)) refuse(FULL);
      w.packs[id].items[item] = count(w, id, item) + n;
      core.log(w, id, 'pack:' + item, n, why);
    });

    const take = ctx.own((w, id, item, n = 1, why = null) => {
      if (!is.int(n, 1) || count(w, id, item) < n) refuse(`身上没带${ITEMS[item]?.name || '它'}`);
      const left = count(w, id, item) - n;
      if (left) w.packs[id].items[item] = left;
      else delete w.packs[id].items[item];
      core.log(w, id, 'pack:' + item, -n, why);
    });

    /** 眼下够得着几份：身上带的，加上人在院里时家里存的。at 给了就按 at 算在不在院里。 */
    const reach = (w, id, item, at = null) =>
      count(w, id, item) + (people.atHome(w, id, at) ? store.count(w, item) : 0);
    const has = (w, id, item, n = 1) => reach(w, id, item) >= n;

    /** 用掉 n 份：先用身上的，不够的从家里补（人得在院里）。 */
    function use(w, id, item, n = 1, why = null) {
      const mine = Math.min(n, count(w, id, item));
      const rest = n - mine;
      const name = ITEMS[item]?.name || '东西';
      if (rest > 0 && !people.atHome(w, id)) refuse(`身上没带${name}。家里有的话，回院里的橱柜拿`);
      if (rest > 0 && store.count(w, item) < rest) refuse(`${name}不够了`);
      if (mine) take(w, id, item, mine, why);
      if (rest) store.take(w, item, rest, why);
    }

    /** 得到 n 份：先往行囊里放；放不下而人在院里，就收进家里；在外头就拿不了。 */
    function receive(w, id, item, n = 1, why = null) {
      if (fits(w, id, item)) {
        put(w, id, item, n, why);
        return 'pack';
      }
      if (!people.atHome(w, id)) refuse(FULL);
      store.add(w, item, n, why);
      return 'store';
    }

    // 竹筒水壶里的水。水壶在身上（或人在院里而水壶在家）才用得上。
    const flask = Object.freeze({
      has: (w, id) => has(w, id, 'flask'),
      left: (w, id) => w.packs[id].flask,
      /** 灌满；本来就满或没有水壶，返回 false。 */
      fill: ctx.own((w, id) => {
        if (!has(w, id, 'flask') || w.packs[id].flask >= BODY.flaskSips) return false;
        w.packs[id].flask = BODY.flaskSips;
        return true;
      }),
      sip: ctx.own((w, id) => {
        w.packs[id].flask -= 1;
      }),
    });

    const amount = (input, most) =>
      input.n === 'all' ? most : is.int(input.n, 1, 999) ? input.n : 1;

    // 收拾行囊要在自家院里：和橱柜之间来回倒腾东西，不花时辰。
    const tidy = (input, w) => {
      people.place(w, input.at);
      if (!Object.hasOwn(ITEMS, input.item)) refuse('没有这样东西');
      if (!people.atHome(w)) refuse('回院里的橱柜边才能收拾行囊');
      return people.who(w);
    };

    commands.register('pack.put', ({ draft, input, fact }) => {
      const w = draft.world;
      const id = tidy(input, w);
      const def = ITEMS[input.item];
      if (store.count(w, input.item) < 1) return { ok: false, reason: `${def.name}不够了` };
      if (!def.carry) return { ok: false, reason: `${def.name}不好随身带` };
      if (!fits(w, id, input.item)) return { ok: false, reason: '行囊满了，先放下一样再装' };
      const n = amount(input, store.count(w, input.item));
      store.take(w, input.item, n, '装进行囊');
      put(w, id, input.item, n);
      fact('pack.changed', { who: id, item: input.item, n, in: true });
      return undefined;
    });

    commands.register('pack.take', ({ draft, input, fact }) => {
      const w = draft.world;
      const id = tidy(input, w);
      const n = amount(input, count(w, id, input.item));
      take(w, id, input.item, n);
      store.add(w, input.item, n, '从行囊里拿出来');
      fact('pack.changed', { who: id, item: input.item, n, in: false });
    });

    commands.register('eat', ({ draft, input, fact }) => {
      const w = draft.world;
      people.place(w, input.at);
      const id = people.who(w);
      const item = ITEMS[input.item];
      const eat = eatenAs(input.item);
      if (!item || !eat) return { ok: false, reason: '这个不能直接吃' };
      use(w, id, input.item, 1, '吃了');
      body.feed(w, id, eat.full, `吃了${item.name}`);
      people.restore(w, id, eat.energy, `吃了${item.name}`);
      body.mood(w, id, eat.mood, eat.why);
      if (eat.water > 0) body.drink(w, id, eat.water, `吃了${item.name}，解渴`);
      if (eat.water < 0) body.dry(w, id, -eat.water, `吃了${item.name}，有点口干`);
      if (eat.buff) body.setBuff(w, id, eat.buff, buffUses(eat.buff, SNACK_BUFF_USES), eat.why);
      fact('meal.eaten', {
        who: id,
        item: input.item,
        dish: item.name,
        buff: eat.buff,
        snack: true,
        line: `你吃了${item.name}。${eat.why}。`,
      });
      return undefined;
    });

    const view = ([item, n]) => ({ ...ITEMS[item], n, eat: eatenAs(item) });

    // 眼下够得着的每一样东西（身上的加上在院里时家里的），和它能拿来做什么。
    // 送人、放进收菜筐、下锅，画面都从这一张单子里挑。
    queries.define('goods', (w, at) => {
      const id = people.who(w);
      const home = people.atHome(w, id, at || null);
      const keys = new Set(Object.keys(w.packs[id].items));
      if (home) for (const item of Object.keys(store.items(w))) keys.add(item);
      return [...keys].map(item => ({
        ...ITEMS[item],
        n: reach(w, id, item, at || null),
        carried: count(w, id, item),
        eat: eatenAs(item),
        gift: giftable(item),
        basket: basketTakes(item),
      }));
    });

    queries.define('pack', (w, at) => {
      const id = people.who(w);
      const p = w.packs[id];
      const home = people.atHome(w, id, at || null);
      const hasFlask = count(w, id, 'flask') > 0 || (home && store.count(w, 'flask') > 0);
      return {
        cap: p.cap,
        used: used(w, id),
        room: room(w, id),
        big: p.big,
        atHome: home,
        items: Object.entries(p.items).map(view),
        dishes: p.dishes,
        flask: hasFlask ? { left: p.flask, max: BODY.flaskSips } : null,
      };
    });

    ctx.provide(
      'pack',
      Object.freeze({
        count,
        used,
        room,
        fits,
        put,
        take,
        reach,
        has,
        use,
        receive,
        flask,
        big: (w, id) => w.packs[id].big,
        upgrade: ctx.own((w, id) => {
          if (w.packs[id].big) refuse('已经有大背篓');
          w.packs[id].big = true;
          w.packs[id].cap = 8;
        }),
        dishes: (w, id) => w.packs[id].dishes,
        putDish: ctx.own((w, id, dish) => {
          if (room(w, id) < dishSize(dish)) refuse(FULL);
          w.packs[id].dishes.push(dish);
        }),
        takeDish: ctx.own((w, id, dishId) => {
          const list = w.packs[id].dishes;
          const i = list.findIndex(d => d.id === dishId);
          if (i < 0) refuse('身上没有这份饭');
          return list.splice(i, 1)[0];
        }),
      }),
    );
  },
};
