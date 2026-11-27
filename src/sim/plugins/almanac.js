// 年景与节令（执行方案 M12）。数和话在 content/almanac.js（G-28）。
//   天时年景：换季那天看上一季的天气定这一季是涝、旱、虫、好还是平常，先挨着的两户年景各压一档（好年抬一档），
//     清早便条说一句，茶摊上隔天说一句（'tea.gossip'），每位村民这一季头回说话先提一句（'talk.news'）
//     → almanac.year {kind, name, line}
//   节令：前三天便条、茶摊、一位村民先提；前一天便条说该备什么；当天一早便条；有聚处的那几段，
//     村民聚到樟树下或渡口（接 'resident.positions'）；大日子碰上灾年换一段旁白，那位村民当天先说一句；
//     第二天茶摊传开一句（好的或坏的：大日子上你插手了那件事就是好的，小节令下雨是坏的）
//   服务 almanac.year(w) → 这一季的天时、almanac.feast(w) → 今天的节令 {id, def} 或 null、
//        almanac.join(w) 你在今天的大日子上插了手
//   查询 almanac → 这一季的年景、今天和下一个节令
import { is } from '../../kernel/schema.js';
import { noise } from '../noise.js';
import { ON_MAP } from '../../content/people.js';
import { mapOfPlace } from '../../content/people.js';
import { dateOf, CALENDAR } from '../../content/calendar.js';
import { CROWD } from '../../content/crowd.js';
import { FEASTS, FEAST_AHEAD, FEAST_DOING, YEARS, YEAR_RULE } from '../../content/almanac.js';
import { aiOf } from '../deeds.js';

const KINDS = Object.keys(YEARS);
const FEAST_IDS = Object.keys(FEASTS);
const BAD = ['flood', 'drought', 'pest'];
const rotate = (list, n) => list[Math.abs(n) % list.length];

/** 第几天是哪个节令（第一年的拜年不过）。 */
export function feastOn(day) {
  const d = dateOf(day);
  return (
    FEAST_IDS.find(
      id =>
        FEASTS[id].season === d.season &&
        FEASTS[id].day === d.dayOfSeason &&
        d.year >= (FEASTS[id].from || 1),
    ) || null
  );
}

export const almanac = {
  id: 'sim.almanac',
  provides: ['almanac'],
  requires: ['schema', 'queries', 'reactions', 'compute', 'core', 'people', 'purse', 'weather'],
  writes: ['almanac'],
  install(ctx) {
    const { schema, queries, reactions, compute, core, purse, weather } = ctx.services;

    // year 这一季的天时，told 这一季已经提过年景的村民，last 刚过去的那个节令 {id, day, good}，joined 今天插过手
    schema.slice('almanac', {
      initial: () => ({ year: 'plain', told: [], last: null, joined: 0 }),
      validate: x =>
        (is.obj(x) &&
          KINDS.includes(x.year) &&
          is.arr(x.told, ON_MAP.length) &&
          x.told.every(id => ON_MAP.includes(id)) &&
          (x.last === null ||
            (is.obj(x.last) &&
              FEAST_IDS.includes(x.last.id) &&
              is.int(x.last.day, 1) &&
              typeof x.last.good === 'boolean')) &&
          is.int(x.joined, 0)) ||
        'almanac',
    });

    const feast = w => {
      const id = feastOn(w.clock.day);
      return id ? { id, def: FEASTS[id] } : null;
    };
    /** 这一季的天时（第一季平常）。 */
    function decide(w) {
      const t = w.purses.tally;
      if (t.wet >= YEAR_RULE.flood || t.heavy >= YEAR_RULE.heavy) return 'flood';
      if (t.wet <= YEAR_RULE.drought) return 'drought';
      const roll = noise(w.meta.seed, w.clock.day, 977, 0);
      return roll < YEAR_RULE.pest ? 'pest' : roll < YEAR_RULE.good ? 'good' : 'plain';
    }
    const seasonStart = w => dateOf(w.clock.day).dayOfSeason === 1 && w.clock.day > 1;
    /** 大日子碰上灾年：换一段旁白和一句话。 */
    const hard = (w, f) => (f?.def.hard && BAD.includes(w.almanac.year) ? f.def.hard : null);

    // 换季：先看上一季的天气定天时（家底那边 priority 40 才清掉这一季的天气），再压各户年景（家底定完以后）
    reactions.on(
      'day.started',
      (s, e, emit) => {
        const w = s.world;
        if (!seasonStart(w)) return;
        const kind = decide(w);
        w.almanac.year = kind;
        w.almanac.told = [];
        if (YEARS[kind].note)
          emit('almanac.year', { kind, name: YEARS[kind].name, line: YEARS[kind].note });
      },
      { priority: 39 },
    );
    reactions.on(
      'day.started',
      s => {
        const w = s.world;
        if (!seasonStart(w)) return;
        for (const [house, n] of Object.entries(YEARS[w.almanac.year].hit))
          purse.shift(w, house, n);
      },
      { priority: 41 },
    );

    // 清早便条：年景、节令前三天、前一天、当天
    reactions.on(
      'day.started',
      s => {
        const w = s.world,
          day = w.clock.day;
        if (seasonStart(w) && YEARS[w.almanac.year].note)
          core.post(w, { title: '年景', text: YEARS[w.almanac.year].note });
        const soon = feastOn(day + FEAST_AHEAD);
        if (soon) core.post(w, { title: '节令', text: FEASTS[soon].note });
        const next = feastOn(day + 1);
        if (next)
          core.post(w, { title: '节令', text: `明天${FEASTS[next].name}：${FEASTS[next].prep}` });
        const f = feast(w);
        if (f) {
          const h = hard(w, f);
          const story = h ? h[0] : f.def.big ? null : f.def.story;
          core.post(w, { title: f.def.name, text: f.def.morning + (story ? story : '') });
        }
      },
      { priority: 86 },
    );

    // 节令过完：记下好坏，第二天茶摊传开（反应跑的时候钟已经拨到第二天，看 e.data.day）
    reactions.on(
      'day.ended',
      (s, e) => {
        const w = s.world,
          day = e.data.day,
          id = feastOn(day);
        if (!id) return;
        const good = FEASTS[id].big ? w.almanac.joined === day : !weather.has(w, 'wet');
        w.almanac.last = { id, day, good };
      },
      { priority: 50 },
    );

    // 聚人：大日子全村都来，小节令爱凑热闹的来；樟树下各坐各的老位置，渡口站围观的那几处
    compute.tap(
      'resident.positions',
      (r, { w, slot }) => {
        const f = slot !== null && w.almanac && feast(w);
        if (!f || !f.def.place || !f.def.slots.includes(slot)) return;
        const place = f.def.place;
        const free = id =>
          r.value[id] && r.waiting !== id && !r.spots[id] && mapOfPlace(r.value[id]) !== 'cottage';
        const who = ON_MAP.filter(id => free(id) && (f.def.big || aiOf(w.persona[id]).social > 0));
        let crowd = 0;
        for (const id of who) {
          if (place === 'river' && id !== 'zhou') {
            if (crowd >= CROWD.river.length) continue;
            r.spots[id] = CROWD.river[crowd++];
          }
          r.value[id] = place;
          r.doing[id] = FEAST_DOING.replace('{name}', f.def.name);
        }
      },
      { priority: 40 }, // 先于闻香、进院的客人：过节的人先定下
    );

    /** 见面头一句：灾年大日子那位、节令前三天那位、这一季头回见面的年景话。 */
    function newsOf(w, to) {
      const f = feast(w),
        h = hard(w, f);
      if (h && h[1][0] === to) return { line: h[1][1] };
      for (let k = 1; k <= FEAST_AHEAD; k++) {
        const id = feastOn(w.clock.day + k);
        if (id && FEASTS[id].talk[0] === to) return { line: FEASTS[id].talk[1] };
      }
      const say = YEARS[w.almanac.year].say[to];
      if (say && !w.almanac.told.includes(to)) return { line: say, year: true };
      return null;
    }
    compute.tap(
      'talk.news',
      (r, { w, to }) => {
        const n = w.almanac && newsOf(w, to);
        if (n) r.value = n.line;
      },
      { priority: 30 },
    );
    reactions.on('person.talked', (s, e) => {
      const w = s.world,
        to = e.data.to,
        n = e.data.gained && newsOf(w, to);
      if (n?.year && compute.run('talk.news', { w, to }, { value: '', parts: [] }).value === n.line)
        w.almanac.told.push(to);
    });

    compute.tap(
      'tea.gossip',
      (r, { w }) => {
        const A = w.almanac;
        if (A.last && A.last.day === w.clock.day - 1) {
          r.value = FEASTS[A.last.id].rumor[A.last.good ? 0 : 1];
          return;
        }
        for (let k = 1; k <= FEAST_AHEAD; k++) {
          const id = feastOn(w.clock.day + k);
          if (id) return void (r.value = FEASTS[id].tea);
        }
        const tea = YEARS[A.year].tea;
        if (tea.length && w.clock.day % 2 === 0) r.value = rotate(tea, w.clock.day >> 1);
      },
      { priority: 20 },
    );

    queries.define('almanac', w => {
      const f = feast(w);
      let next = null;
      for (let k = 1; k <= CALENDAR.seasonDays * 4 && !next; k++) {
        const id = feastOn(w.clock.day + k);
        if (id) next = { id, name: FEASTS[id].name, in: k, big: FEASTS[id].big };
      }
      return {
        year: w.almanac.year,
        yearName: YEARS[w.almanac.year].name,
        today: f ? { id: f.id, name: f.def.name, big: f.def.big, place: f.def.place } : null,
        next,
      };
    });

    ctx.provide(
      'almanac',
      Object.freeze({
        year: w => w.almanac.year,
        feast,
        join: ctx.own(w => {
          w.almanac.joined = w.clock.day;
        }),
      }),
    );
  },
};
