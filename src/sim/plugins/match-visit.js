// 集日收尾（执行方案「集日有热闹」第 3、4 条）：比鱼的时候村民围过来看；比完第二天钓客到院门口来。
//   比鱼开局到收场：爱凑热闹的乡邻挪到渡口围一圈（sim/crowd.js），开局时冒 crowd.gathered {map, who, line}
//   比出输赢：记一条见闻，在场的人都知道（witness）
//   第二天清早到午时前：钓客站在院门口，查询 match.visit；他为什么来看昨天怎么收场（content/crowd.js）
//   match.visit {at, choice} → match.visited {who, host, choice, line, notes}
import { refuse } from '../../kernel/dispatch.js';
import { is } from '../../kernel/schema.js';
import { ITEMS } from '../../content/items.js';
import { PEOPLE } from '../../content/people.js';
import { HOSTS, MATCH } from '../../content/fair-match.js';
import { CROWD, CROWD_DOING, CROWD_LINES, MATCH_VISIT as V } from '../../content/crowd.js';
import { VISIT_TEXT, VISIT_OPTS, VISIT_GIFT, VISIT_CHOICES } from '../../content/crowd.js';
import { fill } from '../../content/text.js';
import { gather, names } from '../crowd.js';
import { near } from './people.js';

const LIVE = ['fishing', 'ready', 'suspect', 'after'];

export const matchVisit = {
  id: 'sim.matchVisit',
  requires: [
    'schema',
    'commands',
    'queries',
    'reactions',
    'compute',
    'people',
    'store',
    'pack',
    'body',
    'modifiers',
    'residents',
    'witness',
  ],
  writes: ['matchVisit'],
  install(ctx) {
    const { schema, commands, queries, reactions, compute, people, store, pack } = ctx.services;
    const { body, modifiers, residents, witness } = ctx.services;

    // 今天上门的那一回答过没有（day 是答过的那天）
    schema.slice('matchVisit', {
      initial: () => ({ day: 0 }),
      validate: x => (is.obj(x) && is.int(x.day, 0)) || 'matchVisit',
    });

    // 比到一半（应下以后、了结以前），渡口围一圈人
    compute.tap(
      'resident.positions',
      (r, { w, slot }) => {
        const t = w.match?.today;
        if (slot === null || !t || t.day !== w.clock.day || !LIVE.includes(t.phase)) return;
        gather(r, w, { place: 'river', spots: CROWD.river, doing: CROWD_DOING.match });
      },
      { priority: 60 },
    );

    reactions.on('match.joined', (s, e, emit) => {
      const ids = residents
        .positions(s.world)
        .filter(p => p.map === MATCH.spot.map && p.doing === CROWD_DOING.match)
        .map(p => p.id);
      if (ids.length)
        emit('crowd.gathered', {
          map: MATCH.spot.map,
          who: ids,
          line: fill(CROWD_LINES.match, { names: names(ids, PEOPLE) }),
        });
    });

    for (const type of ['match.measured', 'match.settled'])
      reactions.on(type, (s, e) => {
        if (!e.data.result) return;
        const t = s.world.match.today;
        witness.record(s.world, { who: e.data.who, act: 'match', map: 'river', seenBy: t.seen });
      });

    /** 今天谁上门、为什么：昨天比过，今天午时前，还没答过。 */
    function caller(w) {
      const e = w.match?.echo;
      if (!e || e.day !== w.clock.day - 1 || w.clock.minute >= V.until) return null;
      const why = e.how || e.result;
      const say = VISIT_TEXT[why]?.[e.host];
      return say ? { host: e.host, why, say, done: w.matchVisit.day === w.clock.day } : null;
    }

    queries.define('match.visit', w => {
      const c = caller(w);
      if (!c) return null;
      const host = HOSTS[c.host];
      return {
        id: 'visit.' + c.host,
        host: c.host,
        name: host.name,
        title: '上门来的',
        look: host.look,
        ...V.spot,
        done: c.done,
        greeting: c.say,
      };
    });

    queries.define('match.visit.options', w => {
      const c = caller(w);
      if (!c || c.done) return [];
      const coins = queries.run('home', w).coins;
      return VISIT_CHOICES[c.why].map(key => {
        const o = VISIT_OPTS[key];
        const cost = key === 'tea' ? V.tea : o.pay || 0;
        return {
          key: 'visit.' + key,
          label: o.label + (cost ? `（${cost} 文）` : ''),
          reason: coins < cost ? '钱不够' : '',
          command: 'match.visit',
          input: { choice: key },
          result: 'match.visited',
        };
      });
    });

    commands.register('match.visit', ({ draft, input, fact }) => {
      const w = draft.world;
      const c = caller(w);
      if (!c) refuse('钓客已经走了');
      if (c.done) refuse('已经答过他了');
      const me = people.place(w, input.at);
      if (me.map !== V.spot.map || !near(me, V.spot)) refuse(`走到${HOSTS[c.host].name}跟前再说`);
      const choice = input.choice;
      if (!VISIT_CHOICES[c.why].includes(choice)) refuse('没有这个选项');
      const who = people.who(w);
      const o = VISIT_OPTS[choice];
      const name = HOSTS[c.host].name;
      if (choice === 'tea') store.pay(w, V.tea, `请${name}进院喝茶`);
      if (o.pay) store.pay(w, o.pay, `给${name}赔个不是`);
      if (o.mood) body.mood(w, who, o.mood, `${name}上门来`);
      if (o.title) modifiers.add(w, who, o.title, null, `听${name}讲调漂`);
      const notes = [];
      const gift = (o.gift || choice === 'tea') && VISIT_GIFT[c.why]?.[c.host];
      if (gift) {
        pack.deliver(w, who, gift[0], gift[1], `${name}送的`);
        notes.push(`得了${ITEMS[gift[0]].name}×${gift[1]}`);
      }
      w.matchVisit.day = w.clock.day;
      fact('match.visited', { who, host: c.host, choice, line: o.line, notes });
    });
  },
};
