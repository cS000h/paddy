// 灶台：做饭、端走、放回、吃。饭菜存到户里；端走交给个人行囊。菜谱也属于这一户。
//   cook {items, spices, method, cut, log, at} → meal.cooked {…这道菜, perfect, beats, first, ids, items, line}
//       log 是亲自掌火时按的记录（炒：下料、翻锅、出锅；炖：添柴、起锅；烤：翻面、出锅），没有就是稳稳做。
//   查询 cook.preview(input) 给面板看这锅饭和这一锅的节拍；cook.fire(input, log, t) 是此刻锅里什么样子。
//   dish.carry {id, at}  灶台上的端到手上（热菜都这么端）；dish.pack 只装得下能随手吃的（烤栗子、姜茶……）
//   dish.store {id, at}  手上的、行囊里的放回灶台
//   dish.eat {id, at}    随手吃一份：能随手吃的、旧档行囊里本来就有的热饭；别的热菜得端上桌
//   table.eat {at}       坐在窗下饭桌边，把桌上摆的几样一起吃了，算一顿 → meal.eaten {…, courses}
import { ITEMS } from '../../content/items.js';
import { ENCOUNTER_WORDS as words } from '../../content/encounters.js';
import { registerResidentOptions } from '../resident-options.js';
import { is } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { MAPS } from '../../content/maps/index.js';
import { RECIPES, QUALITY, TIRED } from '../../content/recipes.js';
import { COOK_TEXT } from '../../content/life-text.js';
import { FIRE_PERFECT, FIRE_QUALITY, FIRE_TWISTS } from '../../content/cook-fire.js';
import { fireAt } from '../cook-fire.js';
import { fill } from '../../content/text.js';
import { previewMeal } from '../cuisine.js';
import { validDish } from '../dish.js';
import { near } from './people.js';
import { handheld, mealLine, TABLE_LINES } from '../../content/table.js';

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
  requires: [
    'schema',
    'commands',
    'queries',
    'core',
    'people',
    'store',
    'pack',
    'body',
    'compute',
    'table',
  ],
  writes: ['kitchens'],
  install(ctx) {
    registerResidentOptions(ctx, 'gui', gui);
    const { schema, commands, queries, core, people, store, pack, body, compute, table } =
      ctx.services;
    schema.slice('kitchens', {
      initial: (env, w) =>
        Object.fromEntries(
          Object.keys(w.households).map(id => [
            id,
            { dishes: [], known: {}, fires: 0, recent: [] },
          ]),
        ),
      validate: (all, w) =>
        (is.keyedBy(all, Object.keys(w.households)) &&
          Object.values(all).every(
            k =>
              is.int(k.fires) &&
              is.arr(k.recent, TIRED.window) &&
              k.recent.every(n => is.str(n, 40)) &&
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
    // 先看手上端着的，再看行囊，再看家里灶台和饭桌上的
    const take = ctx.own((w, id, dishId, gate = false) => {
      const held = table.drop(w, id, dishId);
      if (held) return held;
      if (pack.dishes(w, id).some(d => d.id === dishId)) return pack.takeDish(w, id, dishId);
      if (!gate && !people.atHome(w, id)) refuse('饭还在家里，先去灶台端上');
      const list = home(w).dishes,
        i = list.findIndex(d => d.id === dishId);
      if (i >= 0) return list.splice(i, 1)[0];
      const served = table.lift(w, dishId);
      if (served) return served;
      refuse('这份饭已经不在了');
    });
    /** 灶台上这一份拿出来（没有就拒绝）。 */
    const fromStove = (w, dishId, why) => {
      const list = home(w).dishes,
        i = list.findIndex(d => d.id === dishId);
      if (i < 0) refuse(why);
      return list.splice(i, 1)[0];
    };
    const outside = d =>
      d.method === 'stew' ? TABLE_LINES.outside.soup : TABLE_LINES.outside.plate;
    /**
     * 吃下一样：吃腻了打折的饱腹、体力、汤水；记进最近几顿。心情、增益由一顿饭统一算。
     * 返回这一样的 {seen 吃腻了几档, tired 那两个字, mood 这一样添的心情}。
     */
    function course(w, id, d, k) {
      // 吃腻了：最近几顿里这道菜吃过几回，饱腹打折、心情扣一点
      // 合口的菜腻得慢一点（sim/plugins/diet.js 接进 'meal.tired'）
      const seen = k.recent.filter(n => n === d.base).length;
      const eased = compute.run(
        'meal.tired',
        { w, who: id, items: d.ingredients, spices: d.spices },
        { value: seen, parts: [] },
      ).value;
      const times = Math.max(0, Math.min(TIRED.full.length - 1, eased));
      const tired = TIRED.words[times];
      k.recent = [...k.recent, d.base].slice(-TIRED.window);
      body.feed(
        w,
        id,
        Math.round(d.full * TIRED.full[times]),
        '吃了' + d.name + (tired ? `（${tired}）` : ''),
      );
      people.restore(w, id, d.energy, '吃了' + d.name);
      if (d.water >= 0) body.drink(w, id, d.water, '喝汤');
      else body.dry(w, id, -d.water, '饭菜有点干');
      const mood = (d.seasonal ? 2 : 0) + (d.meat ? 1 : 0) + d.tasteMood + TIRED.mood[times];
      return { times, tired, mood };
    }
    const RANK = ['burnt', 'raw', 'under', 'over', 'plain', 'good', 'great'];
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
      const rank = RANK;
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
      const d = home(w).dishes.find(d => d.id === input.id);
      if (!d) refuse('灶台上没有这份饭');
      if (!handheld(d)) refuse(TABLE_LINES.pack);
      pack.putDish(w, id, fromStove(w, input.id, '灶台上没有这份饭'));
      fact('dish.packed', { who: id, id: input.id });
    });
    commands.register('dish.carry', ({ draft, input, fact }) => {
      const w = draft.world;
      atStove(w, input);
      const id = people.who(w);
      if (!home(w).dishes.some(d => d.id === input.id)) refuse('灶台上没有这份饭');
      table.hold(w, id, fromStove(w, input.id, '灶台上没有这份饭'));
      fact('dish.carried', { who: id, id: input.id });
    });
    commands.register('dish.store', ({ draft, input, fact }) => {
      const w = draft.world;
      atStove(w, input);
      const id = people.who(w);
      if (home(w).dishes.length >= 40) refuse('灶台摆满了');
      const held = table.drop(w, id, input.id);
      home(w).dishes.push(held || pack.takeDish(w, id, input.id));
      fact('dish.stored', { who: id, id: input.id });
    });
    commands.register('dish.eat', ({ draft, input, fact }) => {
      const w = draft.world;
      people.place(w, input.at);
      const id = people.who(w),
        k = home(w);
      // 行囊里的（能随手吃的，或旧档里本来装着的热饭）哪儿都能吃；别的热菜得上桌
      const packed = pack.dishes(w, id).some(d => d.id === input.id);
      const all = [...table.hands(w, id), ...k.dishes, ...table.dishes(w)];
      const seen = all.find(d => d.id === input.id);
      if (!packed && seen && !handheld(seen))
        refuse(people.me(w).map === 'cottage' ? TABLE_LINES.where : outside(seen));
      const d = take(w, id, input.id);
      const c = course(w, id, d, k);
      body.mood(w, id, 3 + c.mood, '吃饱了');
      body.setBuff(w, id, d.buff, d.uses, d.why);
      fact('meal.eaten', {
        who: id,
        dish: d.name,
        buff: d.buff,
        quality: d.quality,
        snack: false,
        tired: c.tired,
        times: c.times,
        base: d.base,
        items: [...d.ingredients],
        spices: [...d.spices],
      });
    });
    commands.register('table.eat', ({ draft, input, fact }) => {
      const w = draft.world;
      people.place(w, input.at);
      if (!table.at(w)) refuse('坐到屋里窗下饭桌边再吃');
      if (!table.dishes(w).length) refuse(TABLE_LINES.empty);
      const id = people.who(w),
        k = home(w),
        dishes = table.clear(w);
      const courses = dishes.map(d => ({ d, ...course(w, id, d, k) }));
      // 一桌算一顿：心情底数只给一回，每样添的加起来；增益挑管得最久的那一样
      const extra = courses.reduce((n, c) => n + c.mood, 0);
      body.mood(w, id, 3 + extra, '坐下吃了一顿');
      const best = [...dishes].sort((a, b) => b.uses - a.uses)[0];
      body.setBuff(w, id, best.buff, best.uses, best.why);
      const top = [...dishes].sort((a, b) => RANK.indexOf(b.quality) - RANK.indexOf(a.quality))[0];
      fact('meal.eaten', {
        who: id,
        dish: dishes.map(d => d.name).join('、'),
        buff: best.buff,
        quality: top.quality,
        snack: false,
        tired: courses[0].tired,
        times: courses[0].times,
        base: dishes[0].base,
        items: [...new Set(dishes.flatMap(d => d.ingredients))],
        spices: [...new Set(dishes.flatMap(d => d.spices))],
        courses: courses.map(c => ({
          dish: c.d.name,
          base: c.d.base,
          times: c.times,
          tired: c.tired,
        })),
        line: mealLine(dishes),
      });
    });
    queries.define('kitchen', (w, at) => ({
      dishes: people.atHome(w, people.who(w), at) ? home(w).dishes : [],
      // 身上的：手上端着的在前，行囊里的在后
      carried: [...table.hands(w, people.who(w)), ...pack.dishes(w, people.who(w))],
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
