// 图鉴：收到一样图鉴里有的东西，就在这人的册子上记一笔（几回、头一回哪天、见没见过极品、鱼见过哪几档）。
// 不改别人的数据，只听已经发生的事：钓上来、挂上来、翻到、采到、收菜。哪几页、每样写什么见 content/catalog.js。
//   听  fish.caught、fish.missed（挂上来的杂物）、search.found、ground.picked、forage.finished、
//       crop.harvested
//   发  catalog.got {who, item, page, first, fine, fineFirst, river, snag, wildFine,
//                    grade, allGrades, rainFind, haul}
//       给成就数用：初识水色、鲜货入篓、大小通吃、满载而归……（content/achievements.js）
//   查询 catalog → 各页每一样找没找到、几回、头回哪天、见没见过极品；鱼另带最长几寸、见过哪几档
import { is } from '../../kernel/schema.js';
import { plainOf } from '../../content/items.js';
import { CATALOG, CATALOG_INDEX, CATALOG_HAUL, RAIN_FINDS } from '../../content/catalog.js';
import { FISH_GRADES } from '../../content/fishing.js';
import { dateOf, termOf } from '../../content/calendar.js';
import { lenText } from '../fishing-fight.js';

const GRADES = FISH_GRADES.map(g => g.id);

const entryOk = ([item, x]) =>
  Object.hasOwn(CATALOG_INDEX, item) &&
  is.obj(x) &&
  is.int(x.n, 0, 1e6) &&
  is.int(x.day, 1) &&
  (x.fine === undefined || x.fine === true) &&
  (x.grades === undefined ||
    (Array.isArray(x.grades) &&
      x.grades.every(g => GRADES.includes(g)) &&
      new Set(x.grades).size === x.grades.length));

const personOk = p =>
  is.obj(p) &&
  is.obj(p.items) &&
  Object.entries(p.items).every(entryOk) &&
  is.obj(p.haul) &&
  is.int(p.haul.day, 0) &&
  is.int(p.haul.n, 0, 1e6);

export const catalog = {
  id: 'sim.catalog',
  requires: ['schema', 'reactions', 'queries', 'people', 'weather'],
  writes: ['catalog'],
  install(ctx) {
    const { schema, reactions, queries, people, weather } = ctx.services;

    schema.slice('catalog', {
      initial: (env, w) =>
        Object.fromEntries(
          Object.keys(w.packs).map(id => [id, { items: {}, haul: { day: 0, n: 0 } }]),
        ),
      validate: (all, w) =>
        (is.keyedBy(all, Object.keys(w.packs)) && Object.values(all).every(personOk)) || 'catalog',
    });

    /** 记一笔；图鉴里没有的东西不记。extra：鱼的档、这一网是鱼几条。 */
    function note(w, who, item, n, fine, emit, extra = {}) {
      const me = w.catalog[who];
      const plain = plainOf(item);
      const at = CATALOG_INDEX[plain];
      if (!me || !at || !(n > 0)) return;
      const had = me.items[plain];
      const x = had || { n: 0, day: w.clock.day };
      x.n = Math.min(1e6, x.n + n);
      const fineFirst = fine && !x.fine;
      if (fine) x.fine = true;
      let allGrades = false;
      if (extra.grade) {
        const grades = x.grades || [];
        if (!grades.includes(extra.grade)) {
          x.grades = [...grades, extra.grade];
          allGrades = x.grades.length === GRADES.length;
        }
      }
      me.items[plain] = x;
      let haul = false;
      if (at.page === 'fish') {
        if (me.haul.day !== w.clock.day) me.haul = { day: w.clock.day, n: 0 };
        const before = me.haul.n;
        me.haul.n = Math.min(1e6, before + n);
        haul = before < CATALOG_HAUL && me.haul.n >= CATALOG_HAUL;
      }
      emit('catalog.got', {
        who,
        item: plain,
        page: at.page,
        first: !had,
        fine: !!fine,
        fineFirst,
        river: at.entry.kind || null,
        snag: ['thing', 'junk'].includes(at.entry.kind),
        wildFine: !!fine && at.page !== 'garden',
        grade: extra.grade || null,
        allGrades,
        rainFind: RAIN_FINDS.includes(plain) && weather.wetLately(w),
        haul,
      });
    }

    const whoOf = (w, e) => e.data.who || people.who(w);
    reactions.on('fish.caught', (s, e, emit) =>
      // 鱼按条记（本事高了一竿能多收几份，鱼谱上还是钓上一条）；拉上来的东西照份数记
      note(
        s.world,
        whoOf(s.world, e),
        e.data.item,
        e.data.thing ? e.data.n : 1,
        e.data.fine,
        emit,
        {
          grade: e.data.thing ? null : e.data.grade,
        },
      ),
    );
    reactions.on('fish.missed', (s, e, emit) => {
      if (e.data.junk) note(s.world, whoOf(s.world, e), e.data.junk, 1, false, emit);
    });
    reactions.on('search.found', (s, e, emit) =>
      note(s.world, whoOf(s.world, e), e.data.item, e.data.n, e.data.fine, emit),
    );
    reactions.on('ground.picked', (s, e, emit) =>
      note(s.world, whoOf(s.world, e), e.data.item, e.data.n, e.data.fine, emit),
    );
    reactions.on('forage.finished', (s, e, emit) =>
      note(s.world, whoOf(s.world, e), e.data.item, e.data.n, e.data.fine, emit),
    );
    reactions.on('crop.harvested', (s, e, emit) =>
      note(s.world, whoOf(s.world, e), e.data.item, e.data.n, e.data.fine, emit),
    );

    queries.define('catalog', w => {
      const who = people.who(w);
      const me = w.catalog[who];
      const records = w.fishing?.[who]?.records || {};
      return CATALOG.map(page => {
        const entries = page.entries.map(entry => {
          const x = me.items[entry.item];
          const base = { item: entry.item, line: entry.line, clue: entry.clue, found: !!x };
          if (!x) return base;
          const more = {
            n: x.n,
            day: x.day,
            date: `${termOf(dateOf(x.day))} · 第 ${dateOf(x.day).dayOfSeason} 日`,
            fine: !!x.fine,
          };
          if (entry.fish)
            Object.assign(more, {
              fish: entry.fish,
              best: records[entry.fish]?.best || 0,
              bestText: records[entry.fish]?.best ? lenText(records[entry.fish].best) : '',
              grades: GRADES.map(g => (x.grades || []).includes(g)),
            });
          return { ...base, ...more };
        });
        const found = entries.filter(x => x.found).length;
        return {
          id: page.id,
          name: page.name,
          head: page.head,
          done: found === entries.length ? page.done : null,
          found,
          total: entries.length,
          entries,
        };
      });
    });
  },
};
