// 约定（照《稻间》0.12 的 visits.js）：跟熟人约好明天午前在樟树茶摊坐坐。约定是存着的事，不是一句话：
// 到了那天午前，作息自己会把他排到茶摊（接 resident.positions 管道），你去了就能坐下聊一会儿。
//   invite {to, at}       → appointment.made {npc, day, slot}      认识以后才能约；一回只约一个，一天只约一回
//   visit.meet {at}       → appointment.fulfilled {npc, line}      当天午前在茶摊碰上他：熟悉 +2，心情 +5，过去一个钟头
//   visit.cancel {}       → appointment.cancelled {npc}            托茶摊带话，这回先作罢
//   清早                   → appointment.reminded                    当天有约，清早的便条里提一句
//   过了午前还没去           → appointment.missed                      对方留话：不打紧，下回再坐
import { is, check } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { PEOPLE, ON_MAP } from '../../content/people.js';
import { MEET } from '../../content/talk-lines.js';

const SLOT = 1; // 午前
const MEET_WAITING = '茶摊那杯茶还等着你呢，回来再歇吧。';
const PLACE = 'tea';

export const visits = {
  id: 'sim.visits',
  requires: [
    'schema',
    'commands',
    'reactions',
    'queries',
    'compute',
    'core',
    'people',
    'body',
    'clock',
    'social',
    'moods',
    'residents',
  ],
  writes: ['visits'],
  install(ctx) {
    const { schema, commands, reactions, queries, compute, core, people, body, clock } =
      ctx.services;
    const { social, moods } = ctx.services;

    schema.slice('visits', {
      initial: () => ({ active: null, invitedDay: 0, history: [] }),
      validate: x =>
        check([
          [is.int(x.invitedDay, 0), 'invitedDay'],
          [is.arr(x.history, 12) && x.history.every(t => is.str(t, 200)), 'history'],
          [
            x.active === null ||
              (is.obj(x.active) &&
                ON_MAP.includes(x.active.npc) &&
                is.int(x.active.day, 1) &&
                x.active.slot === SLOT),
            'active',
          ],
        ]),
    });

    const slotNow = w => ctx.services.residents.slotOf(w.clock.minute);
    const due = w => {
      const a = w.visits.active;
      return !!a && a.day === w.clock.day && slotNow(w) === a.slot;
    };
    function end(w, text) {
      w.visits.history = [...w.visits.history, text].slice(-12);
      w.visits.active = null;
    }

    // 有约的那天午前，他在茶摊等着
    compute.tap(
      'resident.positions',
      (r, { w, slot }) => {
        const a = w.visits?.active;
        if (a && a.day === w.clock.day && slot === a.slot) {
          r.value[a.npc] = PLACE;
          r.waiting = a.npc;
          // 赴约要紧：围观、进院做客挪过去的站位作罢
          delete r.spots[a.npc];
          delete r.doing[a.npc];
        }
      },
      { priority: 80 },
    );

    /** 他就在眼前（和说话、送礼一样的判断）。 */
    function near(w, to, at) {
      if (!ON_MAP.includes(to)) refuse('先找眼前的人说一声。');
      people.place(w, at);
      const p = ctx.services.residents.positions(w).find(p => p.id === to);
      if (!p.visible || p.map !== people.me(w).map) refuse('先找眼前的人说一声。');
    }

    commands.register('invite', ({ draft, input, fact }) => {
      const w = draft.world;
      near(w, input.to, input.at);
      if (w.bonds.known[input.to] < 1) refuse('还不认识，先聊两句吧。');
      if (w.visits.active) refuse('先把手头这场约定过完吧。');
      if (w.visits.invitedDay === w.clock.day) refuse('今天已经约过人了，留点空闲给彼此。');
      w.visits.active = { npc: input.to, day: w.clock.day + 1, slot: SLOT };
      w.visits.invitedDay = w.clock.day;
      const text = `你和${PEOPLE[input.to].name}约好明天午前在茶摊坐坐。下雨也在棚下碰头。`;
      core.post(w, { title: '明天有个小约定', text });
      fact('appointment.made', {
        npc: input.to,
        day: w.clock.day + 1,
        slot: SLOT,
        place: PLACE,
        line: text,
      });
    });

    commands.register('visit.meet', ({ draft, input, fact }) => {
      const w = draft.world;
      const a = w.visits.active;
      if (!a) refuse('没有待赴的约。');
      if (!due(w)) refuse(a.day > w.clock.day ? '约的是明天午前。' : '约的是午前，时辰不对。');
      near(w, a.npc, input.at);
      social.relate(w, a.npc, 2, '赴了约');
      body.mood(w, people.who(w), 5, '赴了约，聊得开心');
      moods.cheer(w, a.npc, 6);
      const line = `你按约来了。${MEET[a.npc]}这会儿，彼此都没有急着走。`;
      end(w, line);
      core.post(w, {
        title: '说好的那杯茶',
        text: `第${w.clock.day}天，你和${PEOPLE[a.npc].name}在茶摊坐了一会儿。`,
      });
      clock.elapse(w, 60, fact);
      fact('appointment.fulfilled', { npc: a.npc, line });
    });

    commands.register('visit.cancel', ({ draft, fact }) => {
      const w = draft.world;
      const a = w.visits.active;
      if (!a) refuse('没有待赴的约。');
      end(w, `你托茶摊带话，这回和${PEOPLE[a.npc].name}的约定先作罢。改天再坐。`);
      fact('appointment.cancelled', { npc: a.npc });
    });

    // 清早：当天有约就提一句；约的日子过了（睡过了头）也算错过
    reactions.on(
      'day.started',
      (s, e, emit) => {
        const w = s.world;
        const a = w.visits.active;
        if (!a) return;
        if (a.day < w.clock.day) return missed(w, emit);
        if (a.day === w.clock.day) {
          core.post(w, {
            title: '今天有约',
            text: `今天午前和${PEOPLE[a.npc].name}约了茶摊，别忘了留一段空闲。`,
          });
          emit('appointment.reminded', { npc: a.npc });
        }
      },
      { priority: 45 },
    );
    function missed(w, emit) {
      const a = w.visits.active;
      const text = `午前过去了，你没赶上和${PEOPLE[a.npc].name}的那杯茶。对方留话：不打紧，下回再坐。`;
      end(w, text);
      core.post(w, { title: '这回没碰上', text });
      emit('appointment.missed', { npc: a.npc });
    }
    // 坐下歇、躺下歇晌之前问一句：一觉醒来会不会误了今天午前的约
    compute.tap('rest.keep', (r, { w, until }) => {
      const a = w.visits.active;
      if (!a || a.day !== w.clock.day || slotNow(w) > a.slot) return;
      if (ctx.services.residents.slotOf(until) > a.slot) r.value = MEET_WAITING;
    });
    reactions.on(
      'time.passed',
      (s, e, emit) => {
        const w = s.world;
        const a = w.visits.active;
        if (a && a.day === w.clock.day && slotNow(w) > a.slot) missed(w, emit);
      },
      { priority: 70 },
    );

    queries.define('visits', w => {
      const a = w.visits.active;
      return {
        active: a ? { ...a, name: PEOPLE[a.npc].name, due: due(w) } : null,
        history: w.visits.history,
        canInvite: !a && w.visits.invitedDay !== w.clock.day,
      };
    });
  },
};
