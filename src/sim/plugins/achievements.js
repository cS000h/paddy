// 成就：听登记表里的事计数，到数就得（content/achievements.js）。G-31 起分三档、带话、有回响：
//   事实 achievement.earned {who, id, name, kind, tier, line, title, rice}   rice 是这下攒到几根稻穗
//        achievement.near {who, id, name, left}   差最后一两回时提一嘴，一个成就只在跨过那一下说一回
//   命令 achievement.wear {id}  戴上一个大成的称号（id 为 null 摘下）→ achievement.worn {who, id, title}
//   查询 achievements → 每个成就一行（暗成就没得之前名字是「？？」，带 clue）
//        achievement.board → {rice, marks, worn, titles}：稻穗、下一回表示在几根、戴着的和能戴的称号
//   清早：便条里提昨天得了什么；攒到 10/25/40 根稻穗，村里来一回表示（RICE_MARKS）。
//   第二天的贺喜一天只挑一件（G-31）：攒着、大成那档里最早没提过的，对口的村民见面先说（'talk.news'），
//   茶摊传开另一件（'tea.gossip'）；其余顺延到后几天。戴着称号时，村民没别的好提，三天里有一天这么招呼你。
import { is } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { ACHIEVEMENTS } from '../../content/achievements.js';
import { ACH_TEXT, ACH_TITLES, RICE_MARKS, ME_IN_GOSSIP } from '../../content/achievement-text.js';
import { PEOPLE } from '../../content/people.js';
import { fill } from '../../content/text.js';

const BY_ID = new Map(ACHIEVEMENTS.map(a => [a.id, a]));
/** 贺喜过了这么多天还没轮上就不提了，免得半个月后还有人来道喜。 */
const HERALD_DAYS = 7;
/** 差几回算「快到了」：两成，至少一回；五回以下的不提。 */
const nearAt = goal => (goal < 5 ? null : goal - Math.max(1, Math.floor(goal / 5)));
const dayOk = d => is.int(d, 1);
const idOk = id => id === null || BY_ID.has(id);

export const achievements = {
  id: 'sim.achievements',
  requires: ['schema', 'commands', 'reactions', 'queries', 'compute', 'people', 'weather', 'core'],
  writes: ['achievements'],
  install(ctx) {
    const { schema, commands, reactions, queries, compute, people, weather, core } = ctx.services;
    const ids = new Set(BY_ID.keys());
    const keyed = (o, ok) => is.obj(o) && Object.entries(o).every(([k, v]) => ids.has(k) && ok(v));
    schema.slice('achievements', {
      initial: (env, w) =>
        Object.fromEntries(
          Object.keys(w.packs).map(id => [
            id,
            { counts: {}, earned: {}, daily: {}, told: {}, herald: null, title: null },
          ]),
        ),
      validate: (all, w) =>
        (is.keyedBy(all, Object.keys(w.packs)) &&
          Object.values(all).every(
            a =>
              keyed(a.counts, n => is.int(n)) &&
              keyed(a.earned, dayOk) &&
              keyed(a.daily, dayOk) &&
              keyed(a.told, dayOk) &&
              (a.herald === null ||
                (is.obj(a.herald) && idOk(a.herald.talk) && idOk(a.herald.tea))) &&
              (a.title === null || (Object.hasOwn(ACH_TITLES, a.title) && !!a.earned[a.title])),
          )) ||
        'achievements',
    });

    /** 事实以外的条件：下雨、钟点、某个字段的开头。 */
    const fits = (w, a, data) => {
      if (Object.entries(a.where || {}).some(([k, v]) => data[k] !== v)) return false;
      const c = a.when || {};
      if (c.wet && !weather.has(w, 'wet')) return false;
      if (c.hours && (w.clock.minute < c.hours[0] || w.clock.minute >= c.hours[1])) return false;
      return Object.entries(c.prefix || {}).every(([k, v]) => String(data[k] ?? '').startsWith(v));
    };
    const riceOf = state => Object.keys(state.earned).length;

    for (const event of new Set(ACHIEVEMENTS.map(a => a.event)))
      reactions.on(
        event,
        (s, e, emit) => {
          const w = s.world,
            who = e.data.who || people.who(w),
            state = w.achievements[who];
          if (!state) return;
          for (const a of ACHIEVEMENTS.filter(a => a.event === event)) {
            if (state.earned[a.id] || !fits(w, a, e.data)) continue;
            const n = a.amount ? e.data[a.amount] : 1;
            if (!Number.isFinite(n) || n <= 0) continue;
            // 只数当天的：换了一天从头数
            if (a.when?.perDay && state.daily[a.id] !== w.clock.day) {
              state.counts[a.id] = 0;
              state.daily[a.id] = w.clock.day;
            }
            const before = state.counts[a.id] || 0;
            const after = Math.min(a.goal, before + n);
            state.counts[a.id] = after;
            if (after >= a.goal) {
              state.earned[a.id] = w.clock.day;
              const text = ACH_TEXT[a.id];
              emit('achievement.earned', {
                who,
                id: a.id,
                name: a.name,
                kind: a.kind,
                tier: a.tier,
                hidden: !!a.hidden,
                line: text?.line || '',
                title: ACH_TITLES[a.id]?.title || null,
                rice: riceOf(state),
              });
            } else {
              const near = a.hidden ? null : nearAt(a.goal);
              if (near !== null && before < near && after >= near)
                emit('achievement.near', { who, id: a.id, name: a.name, left: a.goal - after });
            }
          }
        },
        { priority: 80 },
      );

    // 清早：昨天得了什么、稻穗攒到了没有，挑今天的贺喜
    reactions.on(
      'day.started',
      s => {
        const w = s.world,
          who = people.who(w),
          state = w.achievements[who];
        if (!state) return;
        const day = w.clock.day;
        const got = Object.entries(state.earned)
          .filter(([, d]) => d === day - 1)
          .map(([id]) => BY_ID.get(id).name);
        if (got.length) core.post(w, { title: '昨天', text: `昨天得了「${got.join('」「')}」。` });
        const rice = Object.values(state.earned).filter(d => d < day).length;
        for (const m of RICE_MARKS)
          if (rice >= m.at && rice - got.length < m.at)
            core.post(w, { title: m.title, text: m.text });
        // 一天一件贺喜：攒着、大成里最早得的、还没提过的；太久的不再提
        const queue = Object.entries(state.earned)
          .filter(([id, d]) => {
            const a = BY_ID.get(id);
            return d < day && d >= day - HERALD_DAYS && !state.told[id] && a.tier !== 'first';
          })
          .toSorted((x, y) => x[1] - y[1] || x[0].localeCompare(y[0]))
          .map(([id]) => id)
          .filter(id => ACH_TEXT[id]?.meet);
        const [talk = null, tea = null] = queue;
        for (const id of [talk, tea]) if (id) state.told[id] = day;
        state.herald = talk ? { talk, tea } : null;
      },
      { priority: 85 },
    );

    const heraldOf = w => w.achievements[people.who(w)]?.herald;
    // 别的事（过客、比鱼、飘香）先提；这边排在最后
    compute.tap(
      'talk.news',
      (r, { w, to }) => {
        if (r.value) return;
        const h = heraldOf(w);
        const text = h && ACH_TEXT[h.talk];
        // 大成谁见了都道一声喜，攒着的只有对口的那位
        if (text && (text.by === to || BY_ID.get(h.talk).tier === 'grand')) {
          r.value = text.meet;
          return;
        }
        const worn = w.achievements[people.who(w)]?.title;
        const n = Object.keys(PEOPLE).indexOf(to);
        if (worn && n >= 0 && (w.clock.day + n) % 3 === 0) r.value = ACH_TITLES[worn].hail;
      },
      { priority: 95 },
    );
    // 茶摊：先放这一句，昨天别处有更大的事（比鱼、飘香）就被那边换掉
    compute.tap(
      'tea.gossip',
      (r, { w }) => {
        const h = heraldOf(w);
        const id = h && (h.tea || h.talk);
        if (id) r.value = fill(ACH_TEXT[id].tea, { me: ME_IN_GOSSIP });
      },
      { priority: 10 },
    );

    commands.register('achievement.wear', ({ draft, input, fact }) => {
      const w = draft.world,
        who = people.who(w),
        state = w.achievements[who];
      const id = input.id ?? null;
      if (id !== null && !(typeof id === 'string' && Object.hasOwn(ACH_TITLES, id)))
        refuse('没有这个称号');
      if (id !== null && !state.earned[id]) refuse('这个称号还没挣到');
      state.title = id;
      fact('achievement.worn', { who, id, title: id ? ACH_TITLES[id].title : null });
    });

    queries.define('achievements', w => {
      const state = w.achievements[people.who(w)];
      return ACHIEVEMENTS.map(a => {
        const day = state.earned[a.id] || null;
        const row = {
          ...a,
          count: state.counts[a.id] || 0,
          day,
          line: ACH_TEXT[a.id]?.line || '',
          title: ACH_TITLES[a.id]?.title || null,
        };
        // 暗成就没得之前只露线索；只数当天的，换了一天册子上也从零看
        if (a.when?.perDay && state.daily[a.id] !== w.clock.day && !day) row.count = 0;
        return a.hidden && !day ? { ...row, name: '？？', line: '', where: null, when: null } : row;
      });
    });
    queries.define('achievement.board', w => {
      const state = w.achievements[people.who(w)];
      const rice = riceOf(state);
      return {
        rice,
        next: RICE_MARKS.find(m => m.at > rice)?.at ?? null,
        worn: state.title ? { id: state.title, title: ACH_TITLES[state.title].title } : null,
        titles: Object.keys(ACH_TITLES)
          .filter(id => state.earned[id])
          .map(id => ({ id, title: ACH_TITLES[id].title })),
      };
    });
  },
};
