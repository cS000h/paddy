// 小院翻修（G-23 备选 B）：六处，每处没修、修好两样。修好不加效率，只多一个招人进院的由头。
// 名单、材料、进院的人在 content/yard-fix.js。
//   yard.fix {id, help, at} → yard.fixed {who, id, name, help, line, notes}
//     人在自家院里；材料从身上和家里凑；help 是请落脚木工老鲁搭手（他今天在村里才行），材料省一半
//   查询 yard.fix → 六处的样子和修不修得了；yard.fixes(map) → 修好的那几处画在哪儿
//   修好的地方按天气、时辰招人进院（接 'resident.positions'）；彩头台上有彩头，午后院门口围一圈人。
//   跟进院的人说上话：他先说那一句（'talk.news'），留下东西、捎来一条村里的事、借走两根柴
//     → yard.guest {to, id, line, notes}（一处一天一回）
import { refuse } from '../../kernel/dispatch.js';
import { is } from '../../kernel/schema.js';
import { ITEMS } from '../../content/items.js';
import { PEOPLE } from '../../content/people.js';
import { ATTRS } from '../../content/traits.js';
import { checkChance } from '../../content/events.js';
import { dateOf } from '../../content/calendar.js';
import { YARD_FIX, FIX_IDS, FIX_HELP, YARD_GUESTS, PLATFORM_LOOK } from '../../content/yard-fix.js';
import { RACK_SEASON } from '../../content/yard-fix.js';
import { CROWD, CROWD_DOING } from '../../content/crowd.js';
import { gather } from '../crowd.js';
import { witnessLine } from './witness.js';

const FIX_ART = Object.freeze({
  bench: 'yardBench',
  well: 'wellStoneDeck',
  coop: 'bambooCoop',
  platform: 'prizePedestal',
  rack: 'fenceAndRack',
  shed: 'woodShed',
});

const dayMap = x =>
  is.obj(x) &&
  Object.keys(x).every(k => FIX_IDS.includes(k)) &&
  Object.values(x).every(d => is.int(d, 1));

export const yardFix = {
  id: 'sim.yardFix',
  requires: [
    'schema',
    'commands',
    'queries',
    'reactions',
    'compute',
    'people',
    'store',
    'pack',
    'weather',
    'residents',
    'opinion',
    'witness',
    'core',
    'body',
    'persona',
  ],
  writes: ['yardFix'],
  install(ctx) {
    const { schema, commands, queries, reactions, compute, people, store, pack } = ctx.services;
    const { weather, residents, opinion, witness, core, body, persona } = ctx.services;

    // fixed 哪一处哪天修好的，trim 彩头台嵌没嵌青瓷边，gifts 哪一处的客人哪天留过东西
    schema.slice('yardFix', {
      initial: () => ({ fixed: {}, trim: false, gifts: {} }),
      validate: x =>
        (is.obj(x) && dayMap(x.fixed) && typeof x.trim === 'boolean' && dayMap(x.gifts)) ||
        'yardFix',
    });

    const helper = w =>
      queries.run('passers', w).some(p => p.pid === FIX_HELP.passer && !p.title.includes('上门'));
    const half = n => Math.ceil(n / 2);
    const costOf = (id, help) =>
      Object.entries(YARD_FIX[id].cost).map(([item, n]) => [item, help ? half(n) : n]);

    function why(w, id, help, at) {
      const me = people.who(w);
      if (w.yardFix.fixed[id]) return '已经修好了';
      if (people.me(w).map !== 'yard') return '回自家院里才能动手';
      if (help && !helper(w)) return '老鲁今天不在村里';
      for (const [item, n] of costOf(id, help))
        if (pack.reach(w, me, item, at) < n) return `${ITEMS[item].name}不够，要${n}份`;
      if (YARD_FIX[id].coins > store.coins(w)) return '钱不够';
      return '';
    }

    commands.register('yard.fix', ({ draft, input, fact }) => {
      const w = draft.world;
      const id = input.id;
      if (!FIX_IDS.includes(id)) refuse('院里没有这一处');
      const help = input.help === true;
      const reason = why(w, id, help, input.at);
      if (reason) refuse(reason);
      const me = people.who(w);
      const def = YARD_FIX[id];
      people.spend(w, draft, 'fixYard', fact);
      const notes = [];
      // 自己动手看一项：没修成只花了力气，材料还在，改天再试；差一点说差在哪儿
      if (!help && def.check) {
        const chance = checkChance(persona.attrs(w, me).values[def.check], FIX_HELP.dc);
        const roll = core.random(w) * 100;
        if (roll >= chance) {
          if (roll < chance + FIX_HELP.near) notes.push(def.near);
          return void fact('yard.fixed', {
            who: me,
            id,
            name: def.name,
            help,
            ok: false,
            line: def.fail,
            notes,
          });
        }
      }
      for (const [item, n] of costOf(id, help)) pack.use(w, me, item, n, '修' + def.name);
      if (def.coins) store.pay(w, def.coins, '修' + def.name);
      w.yardFix.fixed[id] = w.clock.day;
      if (help) notes.push(FIX_HELP.name + '：' + def.help);
      if (def.extra && pack.reach(w, me, def.extra, input.at) > 0) {
        pack.use(w, me, def.extra, 1, '嵌' + def.name);
        w.yardFix.trim = true;
        notes.push(def.doneExtra);
      }
      const [by, said] = def.passer;
      notes.push(PEOPLE[by].name + '：' + said);
      witness.record(w, { who: me, act: 'fix', map: 'yard', place: 'yard' });
      fact('yard.fixed', { who: me, id, name: def.name, help, ok: true, line: def.done, notes });
    });

    queries.define('yard.fix', (w, at) => {
      const can = helper(w);
      return FIX_IDS.map(id => {
        const def = YARD_FIX[id];
        const list = help =>
          costOf(id, help)
            .map(([item, n]) => `${ITEMS[item].name}×${n}`)
            .concat(def.coins ? [`${def.coins} 文`] : [])
            .join('、');
        return {
          id,
          name: def.name,
          fixed: !!w.yardFix.fixed[id],
          open: def.open,
          check: def.check ? ATTRS[def.check] : null,
          materials: list(false),
          reason: why(w, id, false, at),
          help: can ? { materials: list(true), reason: why(w, id, true, at) } : null,
        };
      });
    });

    // 修好的那几处画在哪儿、用哪张图（art/yard-fix.js）；挂架上按季节挂东西
    queries.define('yard.fixes', (w, map = people.me(w).map) =>
      map !== 'yard'
        ? []
        : FIX_IDS.filter(id => w.yardFix.fixed[id]).map(id => ({
            id,
            x: YARD_FIX[id].at[0],
            y: YARD_FIX[id].at[1],
            art: id === 'platform' && w.yardFix.trim ? 'prizePedestalPorcelain' : FIX_ART[id],
            hang: id === 'rack' ? RACK_SEASON[dateOf(w.clock.day).season] : null,
          })),
    );

    /** 这一段谁进院：修好的地方按顺序看，每处从上往下头一件对得上的，挑头一个此刻在外头的人。 */
    function guestsOf(w, r, slot) {
      const wet = weather.has(w, 'wet');
      const season = dateOf(w.clock.day).season;
      const out = [];
      for (const id of FIX_IDS) {
        if (!w.yardFix.fixed[id] || id === 'platform') continue;
        for (const g of YARD_GUESTS[id]) {
          const c = g.when;
          if (!c.slots.includes(slot) || c.wet !== wet) continue;
          if ((c.seasons && !c.seasons.includes(season)) || (c.every && w.clock.day % c.every))
            continue;
          const who = g.who.find(p => r.value[p] && r.waiting !== p && !r.spots[p]);
          if (!who) continue;
          out.push({ id, g, who });
          r.spots[who] = 'guest.' + id;
          break;
        }
      }
      return out;
    }

    compute.tap(
      'resident.positions',
      (r, { w, slot }) => {
        if (slot === null || !w.yardFix) return;
        for (const { g, who } of guestsOf(w, r, slot)) {
          r.value[who] = 'yard';
          r.doing[who] = g.doing;
        }
        // 彩头台上摆着彩头：午后爱凑热闹的人在院门口围一圈
        if (
          w.yardFix.fixed.platform &&
          YARD_GUESTS.platform[0].when.slots.includes(slot) &&
          queries.run('prize.traces', w, 'yard').length
        )
          gather(r, w, { place: 'yard', spots: CROWD.gate, doing: CROWD_DOING.prize, max: 2 });
      },
      { priority: 55 },
    );

    /** 他此刻是不是进院来的客人：{id 哪一处, g 哪一件}；围观彩头的 id 是 platform。 */
    const guestNow = (w, to) => {
      const p = residents.positions(w).find(x => x.id === to);
      if (!p) return null;
      if (p.doing === CROWD_DOING.prize) return { id: 'platform', g: null };
      for (const id of FIX_IDS) {
        const g = id === 'platform' ? null : YARD_GUESTS[id].find(x => x.doing === p.doing);
        if (g) return { id, g };
      }
      return null;
    };

    /** 彩头摆上去头两天说头一回看见的话，再往后说看了几天的。 */
    const lookLine = (w, to) => {
      const t = queries.run('prize.traces', w, 'yard')[0];
      const since = t && w.prizes[people.who(w)]?.since[t.id];
      return PLATFORM_LOOK[to][since && w.clock.day - since > 1 ? 1 : 0];
    };

    compute.tap(
      'talk.news',
      (r, { w, to }) => {
        const x = guestNow(w, to);
        if (x) r.value = x.id === 'platform' ? lookLine(w, to) : x.g.say;
      },
      { priority: 90 },
    );

    reactions.on('person.talked', (s, e, emit) => {
      const w = s.world;
      const to = e.data.to;
      const x = guestNow(w, to);
      if (!x || x.id === 'platform' || w.yardFix.gifts[x.id] === w.clock.day) return;
      const { id, g } = x;
      const me = people.who(w);
      const notes = [];
      w.yardFix.gifts[id] = w.clock.day;
      if (g.gift) {
        pack.deliver(w, me, g.gift[0], g.gift[1], PEOPLE[to].name + '留下的');
        notes.push(`${PEOPLE[to].name}留下${ITEMS[g.gift[0]].name}×${g.gift[1]}`);
      }
      if (g.news) {
        const x = witness.tell(w, to, me);
        if (x) notes.push('听来一件事：' + witnessLine(x) + '。');
      }
      // 身上带着才借：反应里不许拒绝，不去动家里的
      if (g.borrow && pack.count(w, me, g.borrow[0]) >= g.borrow[1]) {
        pack.use(w, me, g.borrow[0], g.borrow[1], '借给' + PEOPLE[to].name);
        opinion.note(w, to, me, 'helped');
        notes.push(`借给${PEOPLE[to].name}${ITEMS[g.borrow[0]].name}×${g.borrow[1]}`);
      }
      if (g.mood) body.mood(w, me, g.mood, PEOPLE[to].name + '进院来坐坐');
      emit('yard.guest', { to, id, line: g.say, notes });
    });
  },
};
