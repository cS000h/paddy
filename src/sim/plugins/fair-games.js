// 集日摊子上的小玩意：肉摊猜斤两、菜苗摊比大瓜（东西和话在 content/fair-games.js）。
// 集日、那个摊子今天摆出来、人在摊子跟前才能玩，每个一天一回。存档记今天玩过哪几个。
//   fair.guess {choice, at} → fair.guessed {stall, win, choice, real, line}
//   fair.weigh {item, at}   → fair.weighed {stall, win, item, weight, top, line}
import { is } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { ITEMS } from '../../content/items.js';
import { dateOf, isFairDay } from '../../content/calendar.js';
import { MAPS } from '../../content/maps/index.js';
import { kindOf, inSeason } from '../../content/pantry.js';
import { STALLS } from '../../content/stalls.js';
import { FAIR_GAMES, weightText } from '../../content/fair-games.js';
import { fill } from '../../content/text.js';
import { near } from './people.js';

const IDS = Object.keys(FAIR_GAMES);
const isFine = item => item.endsWith('.fine');

export const fairGames = {
  id: 'sim.fairGames',
  requires: ['schema', 'commands', 'queries', 'core', 'people', 'pack', 'store'],
  writes: ['fairPlay'],
  install(ctx) {
    const { schema, commands, queries, core, people, pack, store } = ctx.services;
    schema.slice('fairPlay', {
      initial: () => ({ day: 0, done: [] }),
      validate: f =>
        (is.int(f.day, 0) && is.arr(f.done, 8) && f.done.every(id => IDS.includes(id))) ||
        'fairPlay',
    });
    const played = (w, id) => w.fairPlay.day === w.clock.day && w.fairPlay.done.includes(id);

    /** 这个摊子今天能不能玩：不能的给一句为什么，能玩给 ''。 */
    function why(w, id, at) {
      const g = FAIR_GAMES[id];
      if (!g) return '这个摊子没有小玩意';
      if (!isFairDay(w.clock.day)) return `${g.title}只在集日玩`;
      const spot = (w.shops.day === w.clock.day ? w.shops.out : []).indexOf(id);
      if (spot < 0) return `今天${STALLS[id].name}没摆出来`;
      if (played(w, id)) return g.lines.done;
      if (at) {
        const p = people.me(w);
        const ok = MAPS[p.map].objects.some(
          ([k, x, y, d]) => k === 'stall' && d?.spot === spot && near(at, { x, y }),
        );
        if (!ok) return '走到摊子跟前再玩';
      }
      return '';
    }
    function start(w, id, at) {
      people.place(w, at);
      const r = why(w, id, at);
      if (r) refuse(r);
      if (w.fairPlay.day !== w.clock.day) w.fairPlay = { day: w.clock.day, done: [] };
      w.fairPlay.done.push(id);
    }

    commands.register('fair.guess', ({ draft, input, fact }) => {
      const w = draft.world;
      const g = FAIR_GAMES.meat;
      if (!Object.hasOwn(g.choices, input.choice)) refuse('说偏轻、正好还是偏沉');
      start(w, 'meat', input.at);
      store.pay(w, g.cost, '猜斤两的押钱');
      const keys = Object.keys(g.choices);
      const real = keys[Math.floor(core.random(w) * keys.length)];
      const win = real === input.choice;
      const prize = win ? g.win : g.lose;
      if (win) store.earn(w, g.cost, '猜中退回押钱');
      pack.receive(w, people.who(w), prize.item, prize.n, win ? '猜斤两猜中了' : '老张送的');
      fact('fair.guessed', {
        stall: 'meat',
        win,
        choice: input.choice,
        real,
        line: fill(win ? g.lines.win : g.lines.lose, { real: g.real[real] }),
      });
    });

    /** 一颗菜上秤称几两（极品的往上多一截），和今天榜首的一样算法。 */
    const weigh = (crop, r) => {
      const [lo, hi] = FAIR_GAMES.veg.crops[crop];
      return Math.round(lo + Math.min(1, r) * (hi - lo));
    };

    commands.register('fair.weigh', ({ draft, input, fact }) => {
      const w = draft.world;
      const g = FAIR_GAMES.veg;
      const crop = ITEMS[input.item] ? kindOf(input.item) : null;
      if (!crop || !Object.hasOwn(g.crops, crop)) refuse('这样东西上不了秤比大小');
      if (pack.count(w, people.who(w), input.item) < 1) refuse(`身上没带${ITEMS[input.item].name}`);
      start(w, 'veg', input.at);
      const r = core.random(w) + (isFine(input.item) ? g.fine : 0);
      const bar = 0.55 + core.random(w) * 0.35;
      const mine = r > bar;
      const weight = weightText(weigh(crop, r));
      const season = dateOf(w.clock.day).season;
      const seeds = Object.values(ITEMS).filter(
        it => it.kind === 'seed' && it.buy && it.season && inSeason(it.id, season),
      );
      const seed = seeds.length
        ? seeds[Math.floor(core.random(w) * seeds.length)].id
        : 'seed.qingcai';
      const prize = mine ? { item: seed, n: g.seeds } : g.lose;
      pack.receive(w, people.who(w), prize.item, prize.n, mine ? '比大瓜拔了头筹' : '孙婶送的');
      fact('fair.weighed', {
        stall: 'veg',
        win: mine,
        item: input.item,
        weight,
        top: weightText(weigh(crop, bar)),
        line: fill(mine ? g.lines.win : g.lines.lose, { weight, seed: ITEMS[seed].name }),
      });
    });

    // 摊子上的小玩意今天怎样：{id, title, kind, intro, reason, cost, choices | crops}；没有的摊子给 null
    queries.define('fair.game', (w, id, at) => {
      const g = FAIR_GAMES[id];
      if (!g) return null;
      return {
        id,
        title: g.title,
        kind: g.kind,
        intro: g.intro,
        cost: g.cost || 0,
        reason: why(w, id, at),
        choices: g.choices || null,
        crops: g.crops ? Object.keys(g.crops) : null,
      };
    });
  },
};
