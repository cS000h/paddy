// 书架：读书、随手翻两页、托老陈捎书、看见闻、收家书（书单和话在 content/books.js）。
// 存档记每人架上有哪几本、各读了几回、哪天读完的，收到的家书，哪天看过见闻。
//   book.read {id, at}  坐在书架前读一回（两个钟头）：消一点心烦；最后一回读完给东西 → book.read {…}
//                       读完那回另有 book.finished {who, id, skill, xp, recipes}（本事经验由 growth 插件记）
//   book.skim {at}      随手翻两页（一刻钟）：冒一句书里的话，不推进度 → book.skimmed {who, line}
//   book.buy {id, at}   托货郎老陈捎一本 → book.bought {who, id, coins, line}
//   news.look {at}      翻翻压在架上的见闻：当天和乡邻再搭话会多一句「听说了吗」 → news.looked {who}
//   清早：跟谁熟络了，他送来一本书；阿满进城回来，一季捎回一封家书
//   查询 shelf(at) → {here, books, buy, news, letters, line, read: 能不能读的原因或 null}
//   计算管道 'recipes.hidden'：还没学会的书上菜；'talk.aside'：读完的书、看过的见闻多一句话头
import { is } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { MAPS } from '../../content/maps/index.js';
import { CALENDAR, dateOf, isFairDay } from '../../content/calendar.js';
import { PEOPLE } from '../../content/people.js';
import { fill } from '../../content/text.js';
import { BOOKS, READ, BOOK_LINES, GIFT_WHY, SKIM, NEWS, LETTERS } from '../../content/books.js';
import { BOOK_RECIPES } from '../../content/books.js';
import { isTripDay } from './town.js';
import { near } from './people.js';

const IDS = Object.keys(BOOKS);
const validShelf = s =>
  is.obj(s) &&
  is.obj(s.have) &&
  Object.entries(s.have).every(([k, n]) => IDS.includes(k) && is.int(n, 0, 99)) &&
  is.obj(s.done) &&
  Object.entries(s.done).every(([k, d]) => IDS.includes(k) && is.int(d, 1)) &&
  is.arr(s.letters, 40) &&
  s.letters.every(l => is.int(l.day, 1) && is.str(l.text, 200)) &&
  is.int(s.news, 0);

export const reading = {
  id: 'sim.reading',
  requires: [
    'schema',
    'commands',
    'reactions',
    'queries',
    'compute',
    'core',
    'people',
    'clock',
    'store',
    'persona',
    'social',
    'weather',
  ],
  writes: ['books'],
  install(ctx) {
    const { schema, commands, reactions, queries, compute, core } = ctx.services;
    const { people, clock, store, persona, social, weather } = ctx.services;
    schema.slice('books', {
      initial: (env, w) =>
        Object.fromEntries(
          Object.keys(w.packs).map(id => [
            id,
            { have: { almanac: 0 }, done: {}, letters: [], news: 0 },
          ]),
        ),
      validate: (all, w) =>
        (is.keyedBy(all, Object.keys(w.packs)) && Object.values(all).every(validShelf)) || 'books',
    });
    const mine = w => w.books[people.who(w)];
    const atShelf = (w, at = null) => {
      const p = at ? { ...people.me(w), ...at } : people.me(w);
      return (
        p.map === 'cottage' &&
        MAPS.cottage.objects.some(([k, x, y]) => k === 'bookshelf' && near(p, { x, y }))
      );
    };
    const finished = (s, id) => s.have[id] >= BOOKS[id].reads;
    /** 现在坐不下来读书的原因；读得了是 null。 */
    const why = (w, minutes, at = null) => {
      if (!atShelf(w, at)) return BOOK_LINES.where;
      if (w.clock.minute >= READ.late) return BOOK_LINES.late;
      const until = w.clock.minute + minutes;
      return compute.run('rest.keep', { w, until }, { value: '' }).value || null;
    };
    const sitLine = w =>
      w.clock.minute >= CALENDAR.dark
        ? BOOK_LINES.sit.night
        : weather.has(w, 'wet')
          ? BOOK_LINES.sit.rain
          : BOOK_LINES.sit.sun;

    commands.register('book.read', ({ draft, input, fact }) => {
      const w = draft.world;
      people.place(w, input.at);
      const s = mine(w);
      const b = BOOKS[input.id];
      if (!b || !Object.hasOwn(s.have, input.id)) refuse('架上没有这本书');
      const no = why(w, READ.minutes);
      if (no) refuse(no);
      const id = people.who(w);
      const again = finished(s, input.id);
      const calm = again ? READ.again : READ.calm + (b.gives.calm ? READ.more : 0);
      persona.vex(w, id, -calm);
      clock.elapse(w, READ.minutes, fact);
      let line = BOOK_LINES.again;
      let done = false;
      if (!again) {
        line = b.lines[s.have[input.id]];
        s.have[input.id]++;
        done = finished(s, input.id);
      }
      const g = b.gives;
      if (done) {
        s.done[input.id] = w.clock.day;
        fact('book.finished', {
          who: id,
          id: input.id,
          skill: g.skill || null,
          xp: g.skill ? READ.xp : 0,
          recipes: g.recipes || [],
        });
      }
      const gain = g.recipes ? 'recipes' : g.skill ? 'skill' : g.calm ? 'calm' : null;
      fact('book.read', {
        who: id,
        id: input.id,
        name: b.name,
        n: s.have[input.id],
        total: b.reads,
        again,
        done,
        calm,
        sit: sitLine(w),
        line,
        after: done && gain ? BOOK_LINES.done[gain] : '',
      });
    });
    commands.register('book.skim', ({ draft, input, fact }) => {
      const w = draft.world;
      people.place(w, input.at);
      const no = why(w, READ.skim);
      if (no) refuse(no);
      clock.elapse(w, READ.skim, fact);
      fact('book.skimmed', {
        who: people.who(w),
        line: SKIM[Math.floor(core.random(w) * SKIM.length)],
      });
    });
    commands.register('book.buy', ({ draft, input, fact }) => {
      const w = draft.world;
      people.place(w, input.at);
      if (!atShelf(w)) refuse(BOOK_LINES.where);
      const b = BOOKS[input.id];
      if (!b?.price) refuse(BOOK_LINES.notSold);
      const s = mine(w);
      if (Object.hasOwn(s.have, input.id)) refuse(BOOK_LINES.had);
      store.pay(w, b.price, `托老陈捎《${b.name}》`);
      s.have[input.id] = 0;
      fact('book.bought', {
        who: people.who(w),
        id: input.id,
        coins: b.price,
        line: fill(BOOK_LINES.bought, { name: b.name }),
      });
    });
    commands.register('news.look', ({ draft, input, fact }) => {
      const w = draft.world;
      people.place(w, input.at);
      if (!atShelf(w)) refuse(BOOK_LINES.where);
      mine(w).news = w.clock.day;
      fact('news.looked', { who: people.who(w) });
    });

    // 落脚单带了半旧诗册：书架上多摆这一本
    reactions.on('origin.settled', (s, e) => {
      const shelf = s.world.books[e.data.who];
      if (shelf && e.data.keepsake === 'poems') shelf.have.poems ??= 0;
    });
    reactions.on('day.started', s => {
      const w = s.world;
      const me = people.who(w);
      const shelf = w.books[me];
      // 跟谁熟络了，他送来一本书（一早只送一本）
      const gift = IDS.find(
        k =>
          PEOPLE[BOOKS[k].from] &&
          !Object.hasOwn(shelf.have, k) &&
          social.familiar(w, BOOKS[k].from) >= READ.giftAt,
      );
      if (gift) {
        const b = BOOKS[gift];
        shelf.have[gift] = 0;
        const text = fill(BOOK_LINES.gift, {
          who: PEOPLE[b.from].name,
          name: b.name,
          why: GIFT_WHY[b.from],
        });
        core.post(w, { title: '送书', text });
      }
      // 阿满进城回来：这一季还没收到家书就捎回一封
      const season = d => dateOf(d).season + dateOf(d).year * 4;
      const day = w.clock.day;
      if (isTripDay(day - 1) && !shelf.letters.some(l => season(l.day) === season(day))) {
        const family = w.growth?.[me]?.origin?.family;
        const pool = [...(LETTERS[family] || []), ...LETTERS.any];
        const text = pool[shelf.letters.length % pool.length];
        shelf.letters.push({ day, text });
        if (shelf.letters.length > 40) shelf.letters.shift();
        core.post(w, { title: '家书', text: BOOK_LINES.letter });
      }
    });

    // 还没学会的书上菜
    compute.tap('recipes.hidden', (r, { w, who }) => {
      const s = w.books[who];
      if (!s) return;
      r.value = r.value.filter(name => !finished(s, BOOK_RECIPES[name]));
    });
    // 读完几天里搭话多一句话头；今天看过见闻，和乡邻再搭话提一句村里传开的事
    compute.tap('talk.aside', (r, { w, to }) => {
      if (r.value) return;
      const s = mine(w);
      const topic = IDS.find(
        k => BOOKS[k].gives.topic?.[to] && w.clock.day - (s.done[k] ?? -99) < READ.topicDays,
      );
      if (topic) return void (r.value = BOOKS[topic].gives.topic[to]);
      if (s.news !== w.clock.day) return;
      const told = queries.run('heard', w).find(x => x.who !== to && x.to !== to);
      if (told) r.value = fill(NEWS.aside, { line: told.line });
    });

    queries.define('shelf', (w, at = null) => {
      const s = mine(w);
      const books = Object.keys(s.have).map(k => ({
        id: k,
        name: BOOKS[k].name,
        look: BOOKS[k].look,
        n: s.have[k],
        reads: BOOKS[k].reads,
        done: finished(s, k),
      }));
      const unread = books.filter(b => !b.done).length;
      const buy = IDS.filter(k => BOOKS[k].price && !Object.hasOwn(s.have, k)).map(k => ({
        id: k,
        name: BOOKS[k].name,
        look: BOOKS[k].look,
        coins: BOOKS[k].price,
      }));
      const news = [
        ...(isFairDay(w.clock.day + 1) ? [NEWS.fair] : []),
        ...(isTripDay(w.clock.day - 1) || isTripDay(w.clock.day - 2)
          ? [core.stable(NEWS.town, w.clock.day)]
          : []),
        ...queries
          .run('heard', w)
          .slice(0, 4)
          .map(x => x.line),
      ];
      return {
        here: atShelf(w, at),
        books,
        buy,
        news,
        letters: s.letters.slice().reverse(),
        line: books.length
          ? BOOK_LINES.shelf[unread === 0 ? 0 : unread < 3 ? 1 : 2]
          : BOOK_LINES.none[0],
        read: why(w, READ.minutes, at),
      };
    });
  },
};
