// 樟树下的茶摊：喝茶、下棋、帮阿满吆喝、听闲话。做什么、给多少见 content/market.js 的 TEA_DEEDS。
//   tea.do {kind, at} → tea.done {kind, line}；喝茶另发 water.drunk
import { is } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { dateOf, isFairDay } from '../../content/calendar.js';
import { TEAS, TEA_DEEDS } from '../../content/market.js';
import { ROUTINE_DAY } from '../../content/people.js';
import { CHESS_TEXT, TEA_GOSSIP, TEA_TEXT } from '../../content/life-text.js';
import { atStation } from '../stations.js';

const KINDS = Object.keys(TEA_DEEDS);
const fill = (text, values) => text.replace(/\{(\w+)\}/g, (_, key) => values[key]);

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
    'compute',
  ],
  writes: ['teaDays'],
  install(ctx) {
    const { schema, commands, queries, people, body, pack, store, core, clock, social } =
      ctx.services;
    const { residents, weather, compute } = ctx.services;

    // 每人每天各做一回：记的是上一次做的日子。
    schema.slice('teaDays', {
      initial: (env, w) =>
        Object.fromEntries(Object.keys(w.packs).map(id => [id, { chess: 0, hawk: 0, listen: 0 }])),
      validate: (all, w) =>
        (is.keyedBy(all, Object.keys(w.packs)) &&
          Object.values(all).every(
            v => is.obj(v) && ['chess', 'hawk', 'listen'].every(k => is.int(v[k])),
          )) ||
        'teaDays',
    });

    const present = (w, id) =>
      residents.positions(w).some(p => p.id === id && p.map === 'tea' && p.visible);
    const teaOf = w => TEAS[dateOf(w.clock.day).season];

    const why = (w, kind) => {
      if (!KINDS.includes(kind)) return '茶摊没有这件事';
      const id = people.who(w);
      if (kind === 'drink') {
        const flaskFull = !pack.flask.has(w, id) || pack.flask.left(w, id) >= 3;
        return body.get(w, id).thirst >= 95 && flaskFull ? '不渴，喝不下了' : null;
      }
      if (w.teaDays[id][kind] === w.clock.day) return '今天已经做过了';
      if (w.clock.minute >= ROUTINE_DAY.home) return '茶客已经散了，明天再来';
      if (kind === 'chess' && !present(w, 'shi') && !present(w, 'zhou'))
        return '石伯和老周都不在，等他们来再开棋';
      if (kind === 'hawk' && (!present(w, 'aman') || w.clock.minute >= TEA_DEEDS.hawk.until))
        return '阿满早上来摆摊，到时候再帮忙';
      return null;
    };

    commands.register('tea.do', ({ draft, input, fact }) => {
      const w = draft.world;
      const id = people.who(w);
      const kind = input.kind;
      const deed = TEA_DEEDS[kind];
      people.place(w, input.at);
      if (people.me(w).map !== 'tea' || !atStation(w, people, 'tea'))
        refuse('到樟树下的茶桌边再坐');
      const reason = why(w, kind);
      if (reason) refuse(reason);
      let line = '';
      if (kind === 'drink') {
        const [tea, taste] = teaOf(w);
        store.pay(w, -deed.coins, '一碗茶');
        body.drink(w, id, deed.water, '喝茶');
        body.mood(w, id, deed.mood, '坐下喝碗茶');
        pack.flask.fill(w, id);
        line = fill(TEA_TEXT.drink, { tea, taste });
        fact('water.drunk', { who: id, source: 'tea', line });
      } else {
        w.teaDays[id][kind] = w.clock.day;
        people.spend(w, draft, kind === 'hawk' ? 'hawk' : 'teaChat', fact);
        if (kind === 'chess') {
          const to = present(w, 'shi') ? 'shi' : 'zhou';
          social.relate(w, to, deed.relation, '下了一盘棋');
          body.mood(w, id, deed.mood, '下了盘棋');
          line = CHESS_TEXT[to][core.random(w) < 0.35 ? 0 : 1];
          clock.elapse(w, deed.minutes, fact);
        } else if (kind === 'hawk') {
          store.earn(w, deed.coins, '帮阿满卖菜');
          social.relate(w, 'aman', deed.relation, '帮着吆喝');
          body.mood(w, id, deed.mood, '吆喝了一早上');
          line = TEA_TEXT.hawk;
          clock.elapse(w, deed.minutes, fact);
        } else {
          // 村里刚出的事走计算管道 'tea.gossip'（比如昨天集日比鱼传开的那一句）
          const usual = isFairDay(w.clock.day + 1)
            ? TEA_TEXT.fairTomorrow
            : core.stable(TEA_GOSSIP, w.clock.day);
          const gossip = compute.run('tea.gossip', { w }, { value: usual, parts: [] }).value;
          line = fill(TEA_TEXT.listen, { forecast: weather.view(w).forecast.name, gossip });
          core.post(w, { title: '茶摊上听来的', text: line });
        }
      }
      fact('tea.done', { who: id, kind, line });
    });

    queries.define('tea', w => ({
      tea: teaOf(w),
      options: KINDS.map(kind => ({ kind, reason: why(w, kind) })),
    }));
  },
};
