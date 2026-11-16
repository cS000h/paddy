// 乡邻。现在只有最小的一圈：打招呼、送一把菜、第二天收到回礼。
//   talk {to, at}        → person.talked {to, first, line}      每人每天头一回说话，熟悉 +1
//   gift {to, item, at}  → gift.given {to, item, liked, line}   每人每天收一回，熟悉 +2；
//                                                                送到心坎上（合他口味的东西）+3
//   day.started          → gift.returned {from, item, n}        昨天收了菜的人留下回礼和便条
// 说哪句话由规则决定并写进事实里，画面只管显示。
import { is, check } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { PEOPLE, ON_MAP, LINES, RETURN_GIFT, FESTIVE } from '../../content/people.js';
import { ITEMS, CROPS } from '../../content/items.js';
import { giftable } from '../../content/pantry.js';

const homeGrown = item => Object.values(CROPS).some(crop => crop.produce === item);

export const social = {
  id: 'sim.social',
  provides: ['social'],
  requires: [
    'schema',
    'commands',
    'reactions',
    'queries',
    'core',
    'people',
    'pack',
    'kitchen',
    'compute',
    'body',
    'residents',
  ],
  writes: ['bonds'],
  install(ctx) {
    const { schema, commands, reactions, queries, core, people, pack, kitchen, compute, body } =
      ctx.services;

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
      if (!ON_MAP.includes(input.to)) refuse('这个人不在附近');
      people.place(w, input.at);
      const p = ctx.services.residents.positions(w).find(p => p.id === input.to);
      if (!p.visible || p.map !== people.me(w).map) refuse('这个人不在附近');
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
      const gained = b.talked[input.to] !== w.clock.day;
      if (gained) {
        const gain = compute.run(
          'relation.gain',
          { w, who: people.who(w), source: 'talk.life' },
          { value: 1, parts: [] },
        );
        b.known[input.to] = Math.min(999, b.known[input.to] + gain.value);
        if (gain.parts.some(p => p.id === 'buff.guest')) body.useBuff(w, people.who(w), 'guest');
      }
      b.talked[input.to] = w.clock.day;
      fact('person.talked', { who: people.who(w), to: input.to, first, gained, line });
    });

    commands.register('gift', ({ draft, input, fact }) => {
      const w = draft.world;
      const b = target(w, input);
      const person = PEOPLE[input.to];
      if (!input.dish && !giftable(input.item)) return { ok: false, reason: '这个不好拿去送人' };
      if (b.gifted[input.to] === w.clock.day)
        return { ok: false, reason: `${person.name}今天已经收过了，改天再送` };
      const dish = input.dish ? kitchen.take(w, people.who(w), input.dish) : null;
      if (!dish) pack.use(w, people.who(w), input.item, 1, `送给${person.name}`);
      // 合口味的东西和过节的吃食，对方格外高兴；自家地里长的，有它自己的一句话
      const liked = dish
        ? person.favorite === dish.base || dish.buff === person.likes
        : person.treats.includes(input.item) || FESTIVE.includes(input.item);
      const lines = LINES[input.to];
      const line = liked ? lines.treat : homeGrown(input.item) ? lines.gift : lines.thanks;
      b.gifted[input.to] = w.clock.day;
      const gain = compute.run(
        'relation.gain',
        { w, who: people.who(w), source: 'gift' },
        { value: liked ? 3 : 2, parts: [] },
      );
      b.known[input.to] = Math.min(999, b.known[input.to] + gain.value);
      if (gain.parts.some(p => p.id === 'buff.guest')) body.useBuff(w, people.who(w), 'guest');
      b.owed.push({ from: input.to, day: w.clock.day + 1 });
      fact('gift.given', {
        to: input.to,
        item: input.item || null,
        dish: dish?.base || null,
        who: people.who(w),
        liked,
        line: line.replace('{n}', dish?.name || ITEMS[input.item].name),
      });
      return undefined;
    });

    reactions.on(
      'day.started',
      (s, e, emit) => {
        const w = s.world;
        for (const o of w.bonds.owed.filter(x => x.day <= w.clock.day)) {
          const g = RETURN_GIFT[o.from];
          pack.receive(w, people.who(w), g.item, g.n, `${PEOPLE[o.from].name}的回礼`);
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

    ctx.provide(
      'social',
      Object.freeze({
        relate: ctx.own((w, to, n, source) => {
          const q = compute.run(
            'relation.gain',
            { w, who: people.who(w), source: 'talk' },
            { value: n, parts: [] },
          );
          w.bonds.known[to] = Math.min(999, w.bonds.known[to] + q.value);
          core.log(w, people.who(w), 'relation:' + to, q.value, source);
        }),
      }),
    );
  },
};
