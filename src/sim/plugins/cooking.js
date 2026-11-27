// 灶台：做饭、端走、放回、吃。饭菜存到户里；端走交给个人行囊。菜谱也属于这一户。
//   cook {items, spices, method, cut, log, at} → meal.cooked {…这道菜, perfect, beats, first, ids, items, line}
//       log 是亲自掌火时按的记录（炒：下料、翻锅、出锅；炖：添柴、起锅；烤：翻面、出锅），没有就是稳稳做。
//   查询 cook.preview(input) 给面板看这锅饭和这一锅的节拍；cook.fire(input, log, t) 是此刻锅里什么样子。
//   dish.pack / dish.store / dish.eat {id, at}
import { ITEMS } from '../../content/items.js';
import { ENCOUNTER_WORDS as words } from '../../content/encounters.js';
import { registerResidentOptions } from '../resident-options.js';
import { is } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { MAPS } from '../../content/maps/index.js';
import { RECIPES, QUALITY } from '../../content/recipes.js';
import { COOK_TEXT } from '../../content/life-text.js';
import { FIRE_PERFECT, FIRE_QUALITY, FIRE_TWISTS } from '../../content/cook-fire.js';
import { fireAt } from '../cook-fire.js';
import { fill } from '../../content/text.js';
import { previewMeal } from '../cuisine.js';
import { validDish } from '../dish.js';
import { near } from './people.js';

// 出锅的一段话（沿用 0.12）：凉拌是摆上桌，其余先说火候再说出锅；头一回做、用了时令菜各添一句。
// 火候那一句照做法分开说（G-11）；掌火全中、砸了也有点意思，换那一句。
function cookedLine(dish, first) {
  const fire = dish.perfect
    ? FIRE_PERFECT[dish.method].line
    : dish.twist
      ? FIRE_TWISTS[dish.twist].line
      : FIRE_QUALITY[dish.method]?.[dish.quality] || QUALITY[dish.quality].line;
  const values = { quality: fire, servings: dish.servings, name: dish.name };
  return (
    fill(dish.method === 'mix' ? COOK_TEXT.mix : COOK_TEXT.done, values) +
    (first ? COOK_TEXT.first : '') +
    (dish.seasonal ? COOK_TEXT.seasonal : '')
  );
}

function gui({ ask, at }) {
  const bag = ask('goods', at).filter(i => i.carried > 0);
  const recipes = ask('kitchen', at).recipes.filter(
    r =>
      r.method === 'stew' && r.items.length <= 3 && r.items.some(id => bag.some(i => i.id === id)),
  );
  return recipes.slice(0, 4).map(r => {
    const missing = [...r.items, ...r.spices].filter(id => !bag.some(i => i.id === id));
    return {
      key: 'recipe.' + r.name,
      group: '请教炖菜',
      label: r.name,
      line: words.recipe(
        r.name,
        [...r.items, ...r.spices].map(id => ITEMS[id].name),
        missing.map(id => ITEMS[id].name),
      ),
    };
  });
}

export const cooking = {
  id: 'sim.cooking',
  provides: ['kitchen'],
  requires: ['schema', 'commands', 'queries', 'core', 'people', 'store', 'pack', 'body', 'compute'],
  writes: ['kitchens'],
  install(ctx) {
    registerResidentOptions(ctx, 'gui', gui);
    const { schema, commands, queries, core, people, store, pack, body, compute } = ctx.services;
    schema.slice('kitchens', {
      initial: (env, w) =>
        Object.fromEntries(
          Object.keys(w.households).map(id => [id, { dishes: [], known: {}, fires: 0 }]),
        ),
      validate: (all, w) =>
        (is.keyedBy(all, Object.keys(w.households)) &&
          Object.values(all).every(
            k =>
              is.int(k.fires) &&
              is.arr(k.dishes, 40) &&
              k.dishes.every(validDish) &&
              is.obj(k.known) &&
              Object.values(k.known).every(
                r => is.int(r.times, 1) && is.int(r.first, 1) && Object.hasOwn(QUALITY, r.best),
              ),
          )) ||
        'kitchens',
    });
    const home = w => w.kitchens[store.id(w)];
    const preview = (w, input) => previewMeal(w, input, compute, people.who(w), home(w).fires);
    const atStove = (w, input) => {
      const p = people.place(w, input.at);
      const stove = MAPS[p.map].objects.find(([k, x, y]) => k === 'stove' && near(p, { x, y }));
      if (!stove || !people.atHome(w)) refuse('回檐下灶台边才能做饭');
    };
    // gate：满院飘香时站在院门口给门外的人盛，灶上的菜够得着（sim/plugins/aroma.js）
    const take = ctx.own((w, id, dishId, gate = false) => {
      if (pack.dishes(w, id).some(d => d.id === dishId)) return pack.takeDish(w, id, dishId);
      if (!gate && !people.atHome(w, id)) refuse('饭还在家里，先去灶台端上');
      const list = home(w).dishes,
        i = list.findIndex(d => d.id === dishId);
      if (i < 0) refuse('这份饭已经不在了');
      return list.splice(i, 1)[0];
    });
    commands.register('cook', ({ draft, input, fact }) => {
      const w = draft.world;
      atStove(w, input);
      const id = people.who(w),
        k = home(w),
        p = preview(w, input);
      if (k.dishes.length + p.servings > 40) refuse('灶台摆满了，先吃掉一些');
      const action = (p.method === 'mix' ? 'mix' : 'cook') + (p.cut === 'shred' ? 'Shred' : '');
      people.spend(w, draft, action, fact);
      if (p.method !== 'mix') {
        pack.use(w, id, 'wood', 1, '烧火');
        k.fires++;
        if (k.fires % 3 === 0) store.add(w, 'ash', 1, '掏灶膛');
      }
      // 用掉的是挑的那几样（可能是极品）；菜里记的是原来那样，配菜名、画菜都照它
      for (const item of [...input.items, ...p.spices]) pack.use(w, id, item, 1, '做' + p.base);
      const ids = [];
      // 这一锅的节拍、每一拍怎样只在出锅这一下用，不跟着饭菜存
      const { plan, beats, perfect, fire, ...meal } = p;
      for (let i = 0; i < p.servings; i++) {
        const dish = { ...meal, id: core.nextId(w), day: w.clock.day };
        k.dishes.push(dish);
        ids.push(dish.id);
      }
      const first = !k.known[p.base];
      const rank = ['burnt', 'raw', 'under', 'over', 'plain', 'good', 'great'];
      if (first) k.known[p.base] = { times: 1, first: w.clock.day, best: p.quality };
      else {
        k.known[p.base].times++;
        if (rank.indexOf(p.quality) > rank.indexOf(k.known[p.base].best))
          k.known[p.base].best = p.quality;
      }
      body.mood(w, id, QUALITY[p.quality].mood, '做了顿饭');
      fact('meal.cooked', {
        who: id,
        ...meal,
        perfect,
        beats,
        ingredients: p.ingredients.length,
        items: [...p.ingredients],
        // 下锅的有没有极品（菜里只记原来那样）：满院飘香看这个（sim/plugins/aroma.js）
        fine: input.items.some(k => ITEMS[k]?.fine),
        first: first && p.named,
        ids,
        line: cookedLine(p, first && p.named),
      });
    });
    commands.register('dish.pack', ({ draft, input, fact }) => {
      const w = draft.world;
      atStove(w, input);
      const id = people.who(w);
      const list = home(w).dishes,
        i = list.findIndex(d => d.id === input.id);
      if (i < 0) refuse('灶台上没有这份饭');
      pack.putDish(w, id, list.splice(i, 1)[0]);
      fact('dish.packed', { who: id, id: input.id });
    });
    commands.register('dish.store', ({ draft, input, fact }) => {
      const w = draft.world;
      atStove(w, input);
      const id = people.who(w);
      if (home(w).dishes.length >= 40) refuse('灶台摆满了');
      home(w).dishes.push(pack.takeDish(w, id, input.id));
      fact('dish.stored', { who: id, id: input.id });
    });
    commands.register('dish.eat', ({ draft, input, fact }) => {
      const w = draft.world;
      people.place(w, input.at);
      const id = people.who(w),
        d = take(w, id, input.id);
      body.feed(w, id, d.full, '吃了' + d.name);
      people.restore(w, id, d.energy, '吃了' + d.name);
      body.mood(
        w,
        id,
        3 + (d.seasonal ? 2 : 0) + (d.meat ? 1 : 0) + (d.spices.length ? 1 : 0) + d.tasteMood,
        '吃饱了',
      );
      if (d.water >= 0) body.drink(w, id, d.water, '喝汤');
      else body.dry(w, id, -d.water, '饭菜有点干');
      body.setBuff(w, id, d.buff, d.uses, d.why);
      fact('meal.eaten', { who: id, dish: d.name, buff: d.buff, quality: d.quality, snack: false });
    });
    queries.define('kitchen', (w, at) => ({
      dishes: people.atHome(w, people.who(w), at) ? home(w).dishes : [],
      carried: pack.dishes(w, people.who(w)),
      fires: home(w).fires,
      recipes: RECIPES.map(([name, method, items, spices = []]) => ({
        name,
        method,
        items,
        spices,
        ...home(w).known[name],
        known: !!home(w).known[name],
      })),
    }));
    // 掌火时画面每一帧问一回：照这一锅的节拍和到现在按的记录，此刻锅里什么样子
    queries.define('cook.fire', (w, input = {}, log = [], t = 0) => {
      try {
        const { plan } = preview(w, { ...input, log: null });
        return plan && Number.isFinite(t) ? fireAt(plan, log, Math.max(0, t)) : null;
      } catch {
        return null;
      }
    });
    queries.define('cook.preview', (w, input = {}) => {
      try {
        return { ok: true, ...preview(w, input) };
      } catch (e) {
        return { ok: false, reason: e.message };
      }
    });
    ctx.provide('kitchen', Object.freeze({ take }));
  },
};
