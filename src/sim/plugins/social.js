// 乡邻。现在只有最小的一圈：打招呼、送一把菜、第二天收到回礼。
//   talk {to, at}        → person.talked {to, first, line}      每人每天头一回说话，熟悉 +1
//   gift {to, item, at}  → gift.given {to, item, line}          每人每天收一回，熟悉 +2
//   day.started          → gift.returned {from, item, n}        昨天收了菜的人留下回礼和便条
// 说哪句话由规则决定并写进事实里，画面只管显示。
import { is, check } from '../../kernel/schema.js';
import { PEOPLE, ON_MAP, LINES, RETURN_GIFT } from '../../content/people.js';
import { ITEMS } from '../../content/items.js';

export const social = {
  id: 'sim.social',
  provides: ['social'],
  requires: ['schema', 'commands', 'reactions', 'queries', 'core', 'people', 'store'],
  writes: ['bonds'],
  install(ctx) {
    const { schema, commands, reactions, queries, core, people, store } = ctx.services;

    schema.slice('bonds', {
      initial: () => ({
        known: Object.fromEntries(ON_MAP.map(id => [id, 0])), // 熟悉程度
        talked: {}, // 这个人上一次跟你说话是哪天
        gifted: {}, // 上一次收你东西是哪天
        owed: [], // 欠着的回礼：[{from, day}]
      }),
      validate: b =>
        check([
          [ON_MAP.every(id => is.int(b.known[id], 0, 999)), 'known'],
          [is.obj(b.talked) && is.obj(b.gifted), 'daily'],
          [
            is.arr(b.owed, 20) &&
              b.owed.every(o => Object.hasOwn(RETURN_GIFT, o.from) && is.int(o.day, 1)),
            'owed',
          ],
        ]),
    });

    const target = (w, input) => {
      if (!ON_MAP.includes(input.to)) throw new Error('这个人不在附近');
      people.place(w, input.at);
      return w.bonds;
    };

    commands.register('talk', ({ draft, input, fact }) => {
      const w = draft.world;
      const b = target(w, input);
      const first = b.known[input.to] === 0 && b.talked[input.to] === undefined;
      const lines = LINES[input.to];
      const line = first
        ? lines.first
        : lines.daily[Math.floor(core.random(w) * lines.daily.length)];
      if (b.talked[input.to] !== w.clock.day) b.known[input.to] += 1;
      b.talked[input.to] = w.clock.day;
      fact('person.talked', { to: input.to, first, line });
    });

    commands.register('gift', ({ draft, input, fact }) => {
      const w = draft.world;
      const b = target(w, input);
      if (ITEMS[input.item]?.kind !== 'produce') return { ok: false, reason: '这个不好拿去送人' };
      if (b.gifted[input.to] === w.clock.day)
        return { ok: false, reason: `${PEOPLE[input.to].name}今天已经收过了，改天再送` };
      store.take(w, input.item, 1);
      b.gifted[input.to] = w.clock.day;
      b.known[input.to] += 2;
      b.owed.push({ from: input.to, day: w.clock.day + 1 });
      fact('gift.given', { to: input.to, item: input.item, line: LINES[input.to].gift });
    });

    reactions.on(
      'day.started',
      (s, e, emit) => {
        const w = s.world;
        for (const o of w.bonds.owed.filter(x => x.day <= w.clock.day)) {
          const g = RETURN_GIFT[o.from];
          store.add(w, g.item, g.n);
          core.post(w, { title: `${PEOPLE[o.from].name}的回礼`, text: g.text });
          emit('gift.returned', { from: o.from, item: g.item, n: g.n });
        }
        w.bonds.owed = w.bonds.owed.filter(x => x.day > w.clock.day);
      },
      { priority: 40 },
    );

    queries.define('bonds', w =>
      ON_MAP.map(id => ({
        id,
        name: PEOPLE[id].name,
        role: PEOPLE[id].role,
        known: w.bonds.known[id],
        talkedToday: w.bonds.talked[id] === w.clock.day,
        giftedToday: w.bonds.gifted[id] === w.clock.day,
      })),
    );

    ctx.provide('social', Object.freeze({}));
  },
};
