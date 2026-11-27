// 背地里的事（执行方案 M9 的帮、传、拿）：接济、顺手拿、传闲话。借和还在 sim/plugins/debts.js。
//   清早：大方、手里宽的悄悄接济手头紧又处得来的那户，怕生的不留名
//   午前、午后：心烦、缺钱、不守信的趁铺子没人从钱匣拿几文；厚道的不拿。没人看见就没人知道是谁
//   传闲话：茶摊上爱来往、不厚道的村民闲聊时，把不想让人知道的事说给对方（见闻的「谁知道」加一个人）；
//     你在茶摊听闲话，也听得到一件；你也能把听来的事说给人听（命令 gossip.tell），厚道的人皱眉
//   事实 gossip.heard {line}、gossip.told {to, secret, line, notes}
import { refuse } from '../../kernel/dispatch.js';
import { ON_MAP, PEOPLE } from '../../content/people.js';
import {
  LEDGER as L,
  GOSSIP_GROUP,
  DOOR_NOTES,
  GOSSIP_LEAD,
  LEDGER_LABELS as LABEL,
} from '../../content/debts.js';
import { aiOf } from '../deeds.js';
import { fill } from '../debts.js';
import { witnessLine } from './witness.js';

const HERO = 'hero';

export const quietDeeds = {
  id: 'sim.quietDeeds',
  requires: [
    'commands',
    'reactions',
    'compute',
    'queries',
    'core',
    'people',
    'persona',
    'residents',
    'opinion',
    'purse',
    'witness',
    'stress',
  ],
  install(ctx) {
    const { commands, reactions, compute, queries, core, people } = ctx.services;
    const { persona, residents, opinion, purse, witness, stress } = ctx.services;
    const name = id => (id === HERO ? '你' : PEOPLE[id].name);
    const coinsOf = (w, id) => purse.coins(w, purse.houseOf(id) || '');
    const shortOf = (w, id) => purse.short(w, purse.houseOf(id) || '');
    const pass = (w, from, to, n, why) => {
      purse.move(w, purse.houseOf(from), -n, why);
      purse.move(w, purse.houseOf(to), n, why);
    };
    const mapOf = (w, id) => residents.positions(w).find(p => p.id === id)?.map || 'yard';
    const postNote = (w, key) => core.post(w, { ...DOOR_NOTES[key] });
    function near(w, to) {
      const p = residents.positions(w).find(x => x.id === to);
      return !!p?.visible && p.map === people.me(w).map;
    }

    /** 大方、手里宽的悄悄接济手头紧又处得来的那户；怕生的不留名。 */
    function relief(w) {
      for (const a of ON_MAP) {
        const ai = aiOf(persona.get(w, a));
        if (ai.greed >= 0 || coinsOf(w, a) < L.relief.has) continue;
        const b = ON_MAP.find(
          x => x !== a && shortOf(w, x) && opinion.of(w, a, x).value >= L.relief.opinion,
        );
        if (!b) continue;
        pass(w, a, b, L.relief.give, '接济' + name(b));
        opinion.note(w, b, a, 'relieved');
        const act = ai.social < 0 ? 'reliefQuiet' : 'relief';
        witness.record(w, { who: a, to: b, act, map: mapOf(w, b), seenBy: [] });
        return;
      }
    }

    /** 心烦、缺钱、不守信的，趁铺子柜台没人拿几文。厚道的不拿。 */
    function take(w) {
      const at = residents.positions(w).filter(p => p.visible && !p.atDoor);
      for (const a of ON_MAP) {
        const p = persona.get(w, a),
          ai = aiOf(p);
        if (ai.honor >= 0 || !shortOf(w, a) || p.stress < L.take.stress) continue;
        const me = at.find(x => x.id === a);
        if (me?.place !== 'market') continue;
        const crowd = at.filter(x => x.place === 'market' && x.id !== a).map(x => x.id);
        if (crowd.length) continue;
        const got = -purse.move(w, 'shop', -L.take.coins, '钱匣少了');
        if (!got) continue;
        purse.move(w, purse.houseOf(a), got, '顺手拿的');
        witness.record(w, { who: a, act: 'take', map: me.map, place: 'market', seenBy: [] });
        postNote(w, 'shopShort');
        return;
      }
    }

    // 顺手拿：午前、午后铺子里没别人的时候
    reactions.on(
      'time.passed',
      (s, e) => {
        const slot = residents.slotOf(e.data.minute);
        if ((slot === 1 || slot === 2) && slot !== residents.slotOf(e.data.from)) take(s.world);
      },
      { priority: 72 },
    );

    // 传闲话：茶摊上闲聊的两位，爱来往又不厚道的那位把一件不想让人知道的事说出去
    reactions.on('deed.done', (s, e) => {
      const d = e.data;
      if (d.id !== 'chat' || d.place !== 'tea' || !d.to) return;
      const ai = aiOf(persona.get(s.world, d.who));
      if (ai.social > 0 && ai.honor < 30) witness.tell(s.world, d.who, d.to, true);
    });
    /** 此刻在茶摊、肯传闲话的人。 */
    const gossipers = w =>
      residents
        .positions(w)
        .filter(p => p.visible && p.place === 'tea')
        .map(p => p.id)
        .filter(id => {
          const ai = aiOf(persona.get(w, id));
          return ai.social > 0 && ai.honor < 30;
        });
    reactions.on('tea.done', (s, e, emit) => {
      if (e.data.kind !== 'listen') return;
      const w = s.world;
      for (const a of gossipers(w)) {
        const x = witness.tell(w, a, HERO, true);
        if (!x) continue;
        const line = fill(GOSSIP_LEAD.heard, { a: name(a), line: witnessLine(x) });
        core.post(w, { title: '茶摊上的闲话', text: line });
        emit('gossip.heard', { line });
        return;
      }
    });

    commands.register('gossip.tell', ({ draft, input, fact }) => {
      const w = draft.world,
        to = input?.to;
      if (!ON_MAP.includes(to)) refuse('没有这个人');
      if (!near(w, to)) refuse(`${name(to)}不在跟前`);
      const x = witness.tell(w, HERO, to, true) || witness.tell(w, HERO, to, false);
      if (!x) refuse(fill(GOSSIP_LEAD.nothing, { a: name(to) }));
      const ai = aiOf(persona.get(w, to));
      const honest = ai.honor >= 30;
      opinion.note(w, to, HERO, honest && x.secret ? 'tattled' : 'confided');
      stress.apply(w, HERO, x.secret ? ['gossip'] : ['chat'], fact);
      const told = fill(GOSSIP_LEAD.told, { a: name(to), line: witnessLine(x) });
      const back = fill(honest && x.secret ? GOSSIP_LEAD.honest : GOSSIP_LEAD.keen, {
        a: name(to),
      });
      fact('gossip.told', { to, secret: x.secret, line: told, notes: [back] });
    });

    reactions.on('day.started', s => relief(s.world), { priority: 73 });

    queries.define('gossip.options', (w, to) =>
      ON_MAP.includes(to)
        ? [
            {
              key: 'gossip.tell',
              group: GOSSIP_GROUP,
              label: LABEL.gossip,
              reason: '',
              command: 'gossip.tell',
              input: { to },
              result: 'gossip.told',
            },
          ]
        : [],
    );
    compute.tap('resident.options', (list, { person, ask }) => {
      list.push(...ask('gossip.options', person.id));
    });
  },
};
