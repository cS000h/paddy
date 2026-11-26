// 彩头留下的痕迹（G-06 核对时定的、G-13 的图；摆在哪、留几天见 content/prizes.js 的 PRIZE_TRACES）：
//   prize.use {item, at} → prize.used {who, item, how, line}
//     南瓜王、双黄蛋：人在院里时摆出来（how 'keep'）；金鳞红鲤：在水边放回河里（how 'release'），不换钱，
//     往后些天出极品的把握多一点（接进 compute 'quality.chance'）。
//   明前雀舌送给云姑（听 gift.given）：往后几天半山凉亭摆着她端来的一碗新茶。
//   查询 prize.traces(map) → [{id, trace, x, y, faint}]：这张图上此刻摆着哪几样，画面照着摆。
//        红鲤的水影是「偶尔闪一尾」：隔一天一回；faint 为真的整体八成透明（G-13 审稿）。
import { is } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { ITEMS } from '../../content/items.js';
import { PRIZE_TRACES, RELEASE_MAPS, prizeId } from '../../content/prizes.js';

const HOW = Object.keys(PRIZE_TRACES);
const dayOk = d => is.int(d, 0);
const personOk = p =>
  is.obj(p) &&
  is.obj(p.since) &&
  Object.entries(p.since).every(([id, d]) => HOW.includes(id) && dayOk(d));

export const prizes = {
  id: 'sim.prizes',
  requires: ['schema', 'commands', 'reactions', 'queries', 'compute', 'people', 'pack', 'body'],
  writes: ['prizes'],
  install(ctx) {
    const { schema, commands, reactions, queries, compute, people, pack, body } = ctx.services;

    schema.slice('prizes', {
      initial: (env, w) => Object.fromEntries(Object.keys(w.packs).map(id => [id, { since: {} }])),
      validate: (all, w) =>
        (is.keyedBy(all, Object.keys(w.packs)) && Object.values(all).every(personOk)) || 'prizes',
    });

    /** 这一样的痕迹今天还在不在。 */
    const lasting = (w, who, id) => {
      const day = w.prizes[who]?.since[id];
      return !!day && w.clock.day - day < PRIZE_TRACES[id].days;
    };

    commands.register('prize.use', ({ draft, input, fact }) => {
      const w = draft.world;
      people.place(w, input.at);
      const who = people.who(w);
      const id = ITEMS[input.item]?.prize;
      const t = PRIZE_TRACES[id];
      if (!t || t.how === 'gift') refuse('这样东西没有别的用处');
      if (!pack.has(w, who, input.item)) refuse(`身上没带${ITEMS[input.item].name}`);
      const map = people.me(w).map;
      if (t.how === 'keep' && !people.atHome(w, who)) refuse('回院里才摆得出来');
      if (t.how === 'release' && !RELEASE_MAPS.includes(map)) refuse('得走到河边、溪边才放得了生');
      pack.use(w, who, input.item, 1, t.how === 'keep' ? '摆在院里' : '放回河里');
      w.prizes[who].since[id] = w.clock.day;
      body.mood(w, who, 6, t.line);
      fact('prize.used', { who, item: input.item, how: t.how, line: t.line });
    });

    reactions.on('gift.given', (s, e) => {
      const w = s.world;
      const d = e.data;
      for (const [id, t] of Object.entries(PRIZE_TRACES))
        if (t.how === 'gift' && d.item === prizeId(id) && d.to === t.to)
          w.prizes[d.who].since[id] = w.clock.day;
    });

    // 放了生，往后些天出极品的把握多一点
    compute.tap('quality.chance', (r, { w, who }) => {
      for (const [id, t] of Object.entries(PRIZE_TRACES))
        if (t.luck && lasting(w, who, id)) compute.part(r, 'prize.' + id, '放生了红鲤', t.luck);
    });

    queries.define('prize.traces', (w, map = people.me(w).map) => {
      const who = people.who(w);
      return Object.entries(PRIZE_TRACES)
        .filter(([id, t]) => t.map === map && lasting(w, who, id))
        .filter(([id, t]) => t.how !== 'release' || (w.clock.day - w.prizes[who].since[id]) % 2)
        .map(([id, t]) => ({ id, trace: t.trace, x: t.x, y: t.y, faint: t.how === 'release' }));
    });
  },
};
