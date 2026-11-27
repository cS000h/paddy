import { is } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { SKILLS, TRAITS, LEVELS, LEVEL_NAMES, XP } from '../../content/growth.js';
import { ACTIONS } from '../../content/actions.js';
import { REASONS, KEEPSAKES, FAMILY, OLD_TIES } from '../../content/settle.js';
import { CALENDAR } from '../../content/calendar.js';
import { OLD_TRAITS, TEMPERS } from '../../content/traits.js';
const SETTLE_KEYS = ['reason', 'keepsake', 'family', 'own', 'friend'];
const TABLES = {
  reason: REASONS,
  keepsake: KEEPSAKES,
  family: FAMILY,
  own: TEMPERS,
  friend: OLD_TIES,
};
/** 落脚单记下的五项：每项是表里的编号，或者都是空的（旧档的开局两选升上来的）。 */
const originOk = o =>
  is.keyedBy(o, SETTLE_KEYS) &&
  (SETTLE_KEYS.every(k => o[k] === null) ||
    SETTLE_KEYS.every(k => typeof o[k] === 'string' && Object.hasOwn(TABLES[k], o[k])));
export const level = xp => LEVELS.reduce((lv, need, i) => (xp >= need ? i : lv), 0);
/** 今天这门本事已经长了 done（未打折的），再来 raw，实得多少：头 XP.fresh 点照给，往后打折。 */
// 按全天累计算再取整，零碎的小事攒起来也算数，不会每件都被四舍五入吞掉
const dayTotal = n => Math.floor(Math.min(n, XP.fresh) + Math.max(0, n - XP.fresh) * XP.over);
export const credit = (done, raw) => dayTotal(done + raw) - dayTotal(done);
export const growth = {
  id: 'sim.growth',
  provides: ['growth'],
  requires: [
    'schema',
    'commands',
    'queries',
    'reactions',
    'compute',
    'core',
    'people',
    'body',
    'weather',
    'persona',
    'store',
  ],
  writes: ['growth'],
  install(ctx) {
    const {
      schema,
      commands,
      queries,
      reactions,
      compute,
      core,
      people,
      body,
      weather,
      persona,
      store,
    } = ctx.services;
    schema.slice('growth', {
      initial: (env, w) =>
        Object.fromEntries(
          Object.keys(w.packs).map(id => [
            id,
            {
              xp: Object.fromEntries(Object.keys(SKILLS).map(k => [k, 0])),
              traits: [],
              counters: { wetOut: 0, cold: 0, hot: 0, dawn: 0, meals: 0 },
              today: Object.fromEntries(Object.keys(SKILLS).map(k => [k, 0])),
              origin: null,
            },
          ]),
        ),
      validate: (all, w) =>
        (is.keyedBy(all, Object.keys(w.packs)) &&
          Object.values(all).every(
            g =>
              is.obj(g.xp) &&
              Object.keys(SKILLS).every(k => is.int(g.xp[k])) &&
              is.arr(g.traits, 12) &&
              new Set(g.traits).size === g.traits.length &&
              g.traits.every(k => Object.hasOwn(TRAITS, k) && !Object.hasOwn(OLD_TRAITS, k)) &&
              is.obj(g.counters) &&
              ['wetOut', 'cold', 'hot', 'dawn', 'meals'].every(k => is.int(g.counters[k])) &&
              is.keyedBy(g.today, Object.keys(SKILLS)) &&
              Object.values(g.today).every(n => is.int(n)) &&
              (g.origin === null || originOk(g.origin)),
          )) ||
        'growth',
    });
    const mine = (w, id = people.who(w)) => w.growth[id];
    const lv = (w, k, id = people.who(w)) => level(mine(w, id)?.xp[k] || 0);
    // 开局两选的六个旧特质搬进了人物档案（换成性情或出身线），问它们就去问档案；做出来的六个还记在这里。
    const has = (w, t, id = people.who(w)) =>
      Object.hasOwn(OLD_TRAITS, t)
        ? persona.hasOld(w, id, t)
        : mine(w, id)?.traits.includes(t) || false;
    const gain = (w, id, emit, skill, n, source) => {
      const g = mine(w, id);
      if (!g) return;
      const r = compute.run('xp.gain', { w, who: id, skill, source }, { value: n, parts: [] });
      if (r.parts.some(p => p.id === 'buff.alert')) body.useBuff(w, id, 'alert');
      const before = lv(w, skill, id);
      // 一天里头几回照给，往后打折：猛刷一整天和天天干一点，长进差不多
      const raw = Math.max(0, r.value) * (XP.rate[skill] || 1),
        got = credit(g.today[skill], raw);
      g.today[skill] += raw;
      g.xp[skill] += got;
      const after = lv(w, skill, id);
      core.log(w, id, 'xp:' + skill, got, SKILLS[skill].name);
      if (after > before)
        emit('skill.leveled', {
          who: id,
          skill,
          level: after,
          name: SKILLS[skill].name,
          title: LEVEL_NAMES[after],
        });
    };
    const grant = (w, id, emit, t) => {
      if (has(w, t, id)) return;
      mine(w, id).traits.push(t);
      emit('trait.gained', { who: id, trait: t, name: TRAITS[t].name });
    };
    // 落脚单：缘由、旧物（定出身线）、随家里来的性情、自己的性子（和家里那个不在同一对里）、旧交情。
    // 缘由跟谁有旧，旧交情就是谁。只填一次；旧档（开局两选）升上来的五项都是空的。
    commands.register('origin.settle', ({ draft, input, fact }) => {
      const w = draft.world,
        id = people.who(w),
        g = mine(w, id);
      if (g.origin) refuse('已经落过脚了，日子往前过');
      const pick = (table, key) =>
        typeof input[key] === 'string' && Object.hasOwn(table, input[key]) ? input[key] : null;
      const reason = pick(REASONS, 'reason'),
        keepsake = pick(KEEPSAKES, 'keepsake'),
        family = pick(FAMILY, 'family'),
        own = pick(TEMPERS, 'own'),
        friend = pick(OLD_TIES, 'friend');
      if (!reason || !keepsake || !family || !own || !friend) refuse('落脚单还没填齐');
      const home = FAMILY[family].temper;
      if (TEMPERS[own].pair === TEMPERS[home].pair)
        refuse(`「${TEMPERS[own].name}」和随家里来的「${TEMPERS[home].name}」合不到一个人身上`);
      const tie = REASONS[reason].friend;
      if (tie && tie !== friend) refuse('这一户的旧交情是定下的');
      g.origin = { reason, keepsake, family, own, friend };
      persona.settle(w, id, [home, own], KEEPSAKES[keepsake].line, g.xp);
      const r = REASONS[reason];
      if (r.coins > 0) store.earn(w, r.coins, '落脚时带来的');
      if (r.coins < 0) store.pay(w, Math.min(store.coins(w), -r.coins), '落脚时手头紧');
      for (const [item, n] of Object.entries(r.items)) store.add(w, item, n, '落脚时带来的');
      fact('origin.settled', { who: id, reason, friend, line: r.first });
    });
    reactions.on(
      'action.performed',
      (s, e, emit) => {
        const w = s.world,
          d = e.data,
          id = d.who,
          g = mine(w, id);
        if (!g) return;
        const skill = {
          social: 'social',
          farm: 'farm',
          forage: 'forage',
          craft: 'craft',
          sky: 'sky',
        }[d.kind];
        // 出多大力长多少本事：照这件事的基准体力，不看本事省下的那点；不花体力的（看天、闲坐）给 1
        const n = d.id === 'hand' ? XP.harvest : Math.max(1, ACTIONS[d.id]?.energy ?? 2);
        if (skill) gain(w, id, emit, skill, n, d.kind);
        if (d.kind === 'forage' && has(w, 'solitary', id))
          body.mood(w, id, 2, '独行：一个人在林子里自在');
        if (['rest', 'sky', 'social', 'chore'].includes(d.kind)) return;
        if (w.clock.minute < CALENDAR.morningEnd) g.counters.dawn++;
        if (d.outdoor) {
          if (weather.has(w, 'wet')) g.counters.wetOut++;
          const feel = compute.run(
            'body.feel',
            { w, who: id },
            { value: weather.view(w).temperature, parts: [] },
          ).value;
          if (feel < 12) g.counters.cold++;
          if (feel > 26) g.counters.hot++;
        }
      },
      { priority: 60 },
    );
    // 路边翻找一回只花 1 体力，翻得勤：翻到东西才长一点采集的本事，空手的不算
    reactions.on(
      'search.found',
      (s, e, emit) => {
        if (mine(s.world, e.data.who)) gain(s.world, e.data.who, emit, 'forage', 1, 'search');
      },
      { priority: 60 },
    );
    // 钓鱼按钓上来的给经验，甩竿不给：不然站在河边一直甩就能刷满
    reactions.on(
      'fish.caught',
      (s, e, emit) => {
        const d = e.data;
        if (mine(s.world, d.who))
          gain(s.world, d.who, emit, 'forage', XP.fish[d.thing ? 'thing' : d.grade] ?? 2, 'fish');
      },
      { priority: 60 },
    );
    reactions.on('day.started', s => {
      for (const g of Object.values(s.world.growth)) for (const k in g.today) g.today[k] = 0;
    });
    reactions.on(
      'meal.cooked',
      (s, e, emit) => {
        const w = s.world,
          d = e.data,
          id = d.who;
        mine(w, id).counters.meals += 1;
        gain(
          w,
          id,
          emit,
          'cook',
          // 按火候和头一回给，不按放了几样：多放食材不该多长本事
          XP.cook.base +
            (XP.cook[d.quality] || 0) +
            (d.first ? XP.cook.first : 0) +
            (d.cut === 'shred' ? XP.cook.shred : 0),
          'cook',
        );
      },
      { priority: 60 },
    );
    reactions.on(
      'person.talked',
      (s, e, emit) => {
        const w = s.world,
          id = e.data.who || people.who(w);
        if (e.data.gained) gain(w, id, emit, 'social', 1, 'talk');
        if (e.data.gained && has(w, 'lively', id)) body.mood(w, id, 2, '爱热闹：聊得开心');
      },
      { priority: 60 },
    );
    reactions.on(
      'gift.given',
      (s, e, emit) => {
        const w = s.world,
          id = e.data.who || people.who(w);
        gain(w, id, emit, 'social', 2 + (e.data.liked ? 1 : 0), 'gift');
        if (has(w, 'lively', id)) body.mood(w, id, 2, '爱热闹：送饭开心');
      },
      { priority: 60 },
    );
    reactions.onSettle(
      (s, emit) => {
        const w = s.world;
        for (const [id, g] of Object.entries(w.growth)) {
          for (const [t, key, n] of [
            ['rainwalker', 'wetOut', 6],
            ['coldproof', 'cold', 5],
            ['heatproof', 'hot', 5],
            ['hearth', 'meals', 8],
            ['earlybird', 'dawn', 6],
          ])
            if (g.counters[key] >= n) grant(w, id, emit, t);
          if (id === people.who(w) && Object.values(w.bonds.known).reduce((a, b) => a + b, 0) >= 20)
            grant(w, id, emit, 'familiar');
        }
      },
      { priority: 40 },
    );
    queries.define('growth', w => {
      const g = mine(w);
      return {
        origin: g.origin,
        skills: Object.entries(SKILLS).map(([k, d]) => ({
          id: k,
          name: d.name,
          level: lv(w, k),
          title: LEVEL_NAMES[lv(w, k)],
          xp: g.xp[k],
          next: LEVELS[lv(w, k) + 1] ?? null,
          perks: Object.entries(d.perks).map(([n, text]) => ({
            level: +n,
            text,
            on: lv(w, k) >= +n,
          })),
        })),
        traits: Object.entries(TRAITS).map(([id, d]) => ({ id, ...d, owned: has(w, id) })),
      };
    });
    ctx.provide('growth', Object.freeze({ level: lv, has }));
  },
};
