import { is } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { dateOf } from '../../content/calendar.js';
import { TEAS } from '../../content/market.js';
import { CHESS_TEXT, TEA_GOSSIP } from '../../content/life-text.js';
import { atStation } from '../stations.js';
export const teahouse = {
  id: 'sim.teahouse',
  requires: [
    'schema',
    'commands',
    'queries',
    'people',
    'body',
    'pack',
    'store',
    'core',
    'clock',
    'social',
    'residents',
    'weather',
  ],
  writes: ['teaDays'],
  install(ctx) {
    const {
      schema,
      commands,
      queries,
      people,
      body,
      pack,
      store,
      core,
      clock,
      social,
      residents,
      weather,
    } = ctx.services;
    schema.slice('teaDays', {
      initial: (env, w) =>
        Object.fromEntries(Object.keys(w.packs).map(id => [id, { chess: 0, hawk: 0, listen: 0 }])),
      validate: (all, w) =>
        Object.entries(all).every(
          ([id, v]) => w.people[id] && ['chess', 'hawk', 'listen'].every(k => is.int(v[k])),
        ) || 'teaDays',
    });
    const present = (w, id) =>
      residents.positions(w).some(p => p.id === id && p.map === 'tea' && p.visible);
    const why = (w, kind) => {
      if (!['drink', 'chess', 'hawk', 'listen'].includes(kind)) return '茶摊没有这件事';
      if (kind === 'drink')
        return body.get(w, people.who(w)).thirst >= 95 &&
          (!pack.flask.has(w, people.who(w)) || pack.flask.left(w, people.who(w)) >= 3)
          ? '不渴，喝不下了'
          : null;
      if (w.teaDays[people.who(w)][kind] === w.clock.day) return '今天已经做过了';
      if (w.clock.minute >= 1200) return '茶客已经散了，明天再来';
      if (kind === 'chess' && !present(w, 'shi') && !present(w, 'zhou'))
        return '石伯和老周都不在，等他们来再开棋';
      if (kind === 'hawk' && (!present(w, 'aman') || w.clock.minute >= 720))
        return '阿满早上来摆摊，到时候再帮忙';
      return null;
    };
    commands.register('tea.do', ({ draft, input, fact }) => {
      const w = draft.world,
        id = people.who(w),
        kind = input.kind;
      people.place(w, input.at);
      if (people.me(w).map !== 'tea' || !atStation(w, people, 'tea'))
        refuse('到樟树下的茶桌边再坐');
      const reason = why(w, kind);
      if (reason) refuse(reason);
      let line = '';
      if (kind === 'drink') {
        store.pay(w, 1, '一碗茶');
        body.drink(w, id, 40, '喝茶');
        body.mood(w, id, 2, '坐下喝碗茶');
        pack.flask.fill(w, id);
        const tea = TEAS[dateOf(w.clock.day).season];
        line = `你要了一碗${tea[0]}。${tea[1]}。`;
        fact('water.drunk', { who: id, source: 'tea', line });
      } else {
        w.teaDays[id][kind] = w.clock.day;
        people.spend(w, draft, kind === 'hawk' ? 'hawk' : 'teaChat', fact);
        if (kind === 'chess') {
          const to = present(w, 'shi') ? 'shi' : 'zhou';
          social.relate(w, to, 1, '下了一盘棋');
          body.mood(w, id, 4, '下了盘棋');
          line = CHESS_TEXT[to][core.random(w) < 0.35 ? 0 : 1];
          clock.elapse(w, 180, fact);
        } else if (kind === 'hawk') {
          store.earn(w, 3, '帮阿满卖菜');
          social.relate(w, 'aman', 1, '帮着吆喝');
          body.mood(w, id, 2, '吆喝了一早上');
          line = '你帮着称菜、找零，阿满负责跟人抬杠。一筐菜卖完，他塞给你三个钱。';
          clock.elapse(w, 180, fact);
        } else {
          line = `你端着茶碗，听邻桌东一句西一句：几个老人看着天说，明天可能${weather.view(w).forecast.name}。${(w.clock.day + 1) % 5 === 0 ? '明天是集日，有人说杀猪的老张要来摆摊，想吃肉的趁早。' : core.stable(TEA_GOSSIP, w.clock.day)}`;
          core.post(w, { title: '茶摊上听来的', text: line });
        }
      }
      fact('tea.done', { who: id, kind, line });
    });
    queries.define('tea', w => ({
      tea: TEAS[dateOf(w.clock.day).season],
      options: ['drink', 'chess', 'hawk', 'listen'].map(kind => ({ kind, reason: why(w, kind) })),
    }));
  },
};
