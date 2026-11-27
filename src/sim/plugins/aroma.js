// 满院飘香（「收成出彩」第 4 样）：在院里做出最好的那一档火候、又用了极品料，香味飘出去，
// 爱来往的、跟你要好的村民循着香到院门口（最多三位，候两个钟头）。数和话在 content/aroma.js。
//   出锅那一下 → aroma.spread {who, line}
//   跟门口的人说话，接话里多几行 → aroma.serve {how, to, at} → aroma.served {how, to, ok, line, notes}
//     share 一人盛一小碗（看持家分不分得匀），sell 卖他一碗，one 单给他一碗，keep 自己留着吃
//   第二天：见面先提一句（'talk.news'）、茶摊传开一句（'tea.gossip'）；尝到的人还碗，碗里搁着回礼
//     → aroma.returned {to, line}
//   飘香够三回得称号（身边风物 aroma_cook）
import { refuse } from '../../kernel/dispatch.js';
import { is } from '../../kernel/schema.js';
import { ITEMS } from '../../content/items.js';
import { ON_MAP, PEOPLE } from '../../content/people.js';
import { checkChance } from '../../content/events.js';
import { fill } from '../../content/text.js';
import { tierOf } from '../../content/talk.js';
import {
  AROMA as A,
  AROMA_SPREAD,
  AROMA_GATE,
  AROMA_OPTS,
  AROMA_DONE,
  AROMA_SMELL,
  AROMA_TASTE,
  AROMA_BUY,
  AROMA_NEAR,
} from '../../content/aroma.js';
import { AROMA_ECHO, AROMA_RUMOR, AROMA_RETURN, AROMA_RETURN_LINE } from '../../content/aroma.js';
import { CROWD, CROWD_DOING, CROWD_LINES } from '../../content/crowd.js';
import { aiOf } from '../deeds.js';
import { gather, names } from '../crowd.js';

const HOWS = ['share', 'sell', 'one', 'keep'];
const ids = (x, n) => is.arr(x, n) && x.every(id => ON_MAP.includes(id));
const todayOk = t =>
  t === null ||
  (is.obj(t) &&
    is.int(t.day, 1) &&
    is.int(t.at, 0) &&
    ids(t.who, A.max) &&
    is.arr(t.dishes, 8) &&
    t.dishes.every(d => is.int(d, 1)) &&
    typeof t.done === 'boolean');
const echoOk = e =>
  e === null ||
  (is.obj(e) &&
    is.int(e.day, 1) &&
    HOWS.includes(e.how) &&
    ids(e.who, A.max) &&
    ids(e.got, A.max) &&
    ids(e.back, A.max) &&
    (e.rumor === null || Object.hasOwn(AROMA_RUMOR, e.rumor)));

export const aroma = {
  id: 'sim.aroma',
  requires: [
    'schema',
    'commands',
    'reactions',
    'compute',
    'core',
    'people',
    'store',
    'pack',
    'body',
    'kitchen',
    'opinion',
    'persona',
    'purse',
    'modifiers',
    'residents',
    'witness',
  ],
  writes: ['aroma'],
  install(ctx) {
    const { schema, commands, reactions, compute, core, people, store, pack, body } = ctx.services;
    const { kitchen, opinion, persona, purse, modifiers, residents, witness } = ctx.services;

    schema.slice('aroma', {
      initial: () => ({ today: null, echo: null, count: 0 }),
      validate: x =>
        (is.obj(x) && todayOk(x.today) && echoOk(x.echo) && is.int(x.count, 0)) || 'aroma',
    });

    const live = w => {
      const t = w.aroma.today;
      return t && t.day === w.clock.day && !t.done && w.clock.minute < t.at + A.stay ? t : null;
    };

    /** 谁循着香来：此刻在外头、不在赴约的；爱来往的，或者跟你够要好的（怕生的要加倍要好）。 */
    function comers(w) {
      const me = people.who(w);
      return residents
        .positions(w)
        .filter(p => p.visible && !p.atDoor && !p.waiting)
        .map(p => ({ id: p.id, social: aiOf(w.persona[p.id]).social }))
        .filter(({ id, social }) => {
          const fond = opinion.of(w, id, me).value;
          return social > A.social || fond >= (social < 0 ? A.fond * 2 : A.fond);
        })
        .sort((a, b) => b.social - a.social)
        .slice(0, A.max)
        .map(p => p.id);
    }

    reactions.on('meal.cooked', (s, e, emit) => {
      const w = s.world;
      const d = e.data;
      if (d.who !== people.who(w) || d.quality !== 'great' || !d.fine || d.method === 'mix') return;
      if (w.clock.minute + A.stay > 20 * 60 || w.aroma.today?.day === w.clock.day) return;
      const who = comers(w);
      w.aroma.today = {
        day: w.clock.day,
        at: w.clock.minute,
        who,
        dishes: d.ids.slice(0, 8),
        done: !who.length,
      };
      const lines = AROMA_SPREAD[d.method];
      const line =
        lines[w.clock.day % lines.length] +
        (who.length ? fill(CROWD_LINES.aroma, { names: names(who, PEOPLE) }) : '');
      // 没来的人里，此刻在外头的挑一位，说一句闻见了
      const far = residents
        .positions(w)
        .find(p => p.visible && !p.atDoor && !who.includes(p.id) && AROMA_SMELL[p.id]);
      const notes = far ? [PEOPLE[far.id].name + '：' + AROMA_SMELL[far.id]] : [];
      emit('aroma.spread', { who, line, notes });
    });

    compute.tap(
      'resident.positions',
      (r, { w, slot }) => {
        const t = slot !== null && w.aroma && live(w);
        if (t)
          gather(r, w, { place: 'yard', spots: CROWD.gate, doing: CROWD_DOING.aroma, who: t.who });
      },
      { priority: 45 }, // 先于进院的客人、围观彩头的挑人：闻香来的人已经定好了
    );

    // 门口的人：先说门口那一句，接话里多几行
    compute.tap(
      'talk.news',
      (r, { w, to }) => {
        const t = live(w);
        if (t?.who.includes(to))
          r.value = AROMA_GATE[to][tierOf(w.bonds.known[to] || 0) >= 2 ? 1 : 0];
        // 第二天：在场尝到了、在场没尝到、没在场听说的（自己端回屋吃的那回不提）
        const e = w.aroma.echo;
        if (!t && e?.day === w.clock.day - 1 && e.how !== 'keep' && AROMA_ECHO[to])
          r.value = AROMA_ECHO[to][e.got.includes(to) ? 0 : e.who.includes(to) ? 1 : 2];
      },
      { priority: 85 },
    );
    compute.tap('tea.gossip', (r, { w }) => {
      const e = w.aroma.echo;
      if (e?.day === w.clock.day - 1 && e.rumor) r.value = AROMA_RUMOR[e.rumor];
    });

    compute.tap('resident.options', (rows, { person }) => {
      if (person.doing !== CROWD_DOING.aroma) return;
      const row = (how, label) => ({
        key: 'aroma.' + how,
        group: '端菜',
        label,
        command: 'aroma.serve',
        input: { how, to: person.id },
        result: 'aroma.served',
      });
      rows.unshift(
        row('share', AROMA_OPTS.share),
        row('sell', AROMA_OPTS.sell),
        row('one', AROMA_OPTS.one),
        row('keep', AROMA_OPTS.keep),
      );
    });

    commands.register('aroma.serve', ({ draft, input, fact }) => {
      const w = draft.world;
      const t = live(w);
      if (!t) refuse('门口的人已经散了');
      const how = input.how;
      if (!HOWS.includes(how)) refuse('没有这个选项');
      const to = input.to;
      if (how !== 'keep' && how !== 'share' && !t.who.includes(to)) refuse('他不在门口');
      if (people.me(w).map !== 'yard') refuse('回院里再说');
      const me = people.who(w);
      let got = [];
      let ok = true;
      let rumor = null;
      if (how !== 'keep') {
        const left = t.dishes.find(id => dishesLeft(w).some(d => d.id === id));
        if (!left) refuse('这锅菜已经吃完了');
        kitchen.take(w, me, left, true);
      }
      const speaker = how === 'share' || !t.who.includes(to) ? t.who[0] : to;
      const name = PEOPLE[speaker].name;
      const crowd = t.who.length > 1;
      let [aside, said] = AROMA_DONE[how];
      const notes = [];
      if (how === 'share') {
        const chance = checkChance(persona.attrs(w, me).values[A.check], A.dc);
        const roll = core.random(w) * 100;
        ok = roll < chance;
        got = ok ? [...t.who] : t.who.slice(0, -1);
        if (!ok) [aside, said] = AROMA_DONE.shareThin;
        if (ok) notes.push(name + '：' + AROMA_TASTE[speaker]);
        else if (roll < chance + A.near) notes.push(AROMA_NEAR);
        for (const id of got) opinion.note(w, id, me, 'tasted');
        rumor = 'good';
      } else if (how === 'sell') {
        const [size, ask] = AROMA_BUY[to];
        const paid = -purse.move(w, purse.houseOf(to), -A.pay[size], '买一碗菜');
        if (paid) store.earn(w, paid, `卖给${name}一碗菜`);
        opinion.note(w, to, me, 'bought');
        got = [to];
        said = ask;
        notes.push(`得了 ${paid} 文`);
        rumor = crowd ? 'stingy' : null;
      } else if (how === 'one') {
        opinion.note(w, to, me, 'treated');
        for (const id of t.who) if (id !== to) opinion.note(w, id, me, 'snubbed');
        got = [to];
        rumor = crowd ? 'partial' : null;
      } else body.mood(w, me, 2, '好菜留着自己吃');
      t.done = true;
      if (aside && (crowd || how.startsWith('share'))) notes.unshift(aside);
      if (how !== 'keep') {
        witness.record(w, { who: me, act: 'aroma', map: 'yard', place: 'yard', seenBy: t.who });
        w.aroma.count = Math.min(9999, w.aroma.count + 1);
        if (w.aroma.count === A.titleAt) modifiers.add(w, me, 'aroma_cook', null, '院里飘香三回');
      }
      w.aroma.echo = { day: w.clock.day, how, who: [...t.who], got, back: [], rumor };
      const line = said ? name + '：' + said : '';
      fact('aroma.served', { who: me, how, to: to || null, ok, line, notes });
    });

    // 尝到的人第二天头一回跟你说话：把碗还回来，碗里搁着回礼
    reactions.on('person.talked', (s, e, emit) => {
      const w = s.world;
      const x = w.aroma.echo;
      const to = e.data.to;
      if (!x || x.day !== w.clock.day - 1 || !x.got.includes(to) || x.back.includes(to)) return;
      x.back.push(to);
      const [item, n] = AROMA_RETURN[to];
      pack.deliver(w, people.who(w), item, n, PEOPLE[to].name + '还碗');
      const line = fill(AROMA_RETURN_LINE, {
        name: PEOPLE[to].name,
        item: `${ITEMS[item].name}×${n}`,
      });
      emit('aroma.returned', { to, line });
    });

    // 灶上和身上还剩的这锅菜
    function dishesLeft(w) {
      const me = people.who(w);
      const home = w.kitchens[store.id(w)]?.dishes || [];
      return [...home, ...pack.dishes(w, me)];
    }
  },
};
