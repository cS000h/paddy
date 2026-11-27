// 村民的盼头（执行方案 M12，CK3 的个人打算）。数和话在 content/hopes.js（G-29）。
//   到了 start 那天起念头；每天清早按家里年景攒一点，攒到三段各有一段旁白（便条）和他自己的一句（见面先说）
//     → hope.stage {who, stage, line, say}
//   攒到一半以后，会帮的、会拆台的那位见面先说一句；你能插手的那一件在局面池（content/scenes.js 的 hope.*），
//     帮一把、使绊子用服务 hopes.push 往前推、往后拖
//   攒满了办成（桂嫂要等大日子）：便条写那一段，他心烦降一截 → hope.done {who, line, notes}
//   过了日子还没攒满，办不成：他心烦涨一大截 → hope.failed {who, line, notes}
//   查询 hopes → 六位村民各盼什么、到了哪一段、办成没有
import { is } from '../../kernel/schema.js';
import { noise } from '../noise.js';
import { PEOPLE } from '../../content/people.js';
import { HOPES, HOPE_PACE as P } from '../../content/hopes.js';
import { FEASTS } from '../../content/almanac.js';

const IDS = Object.keys(HOPES);
const STATES = ['idle', 'saving', 'done', 'failed'];
const STAGE_WORDS = ['刚起念头', '攒到一半', '差最后一点'];
const hopeOk = h =>
  is.obj(h) &&
  STATES.includes(h.state) &&
  is.int(h.n, 0, 999) &&
  is.int(h.stage, 0, 2) &&
  is.int(h.told, -1, 2) &&
  typeof h.side === 'boolean' &&
  is.int(h.since, 0) &&
  is.int(h.at, 0);
const fresh = () => ({ state: 'idle', n: 0, stage: 0, told: -1, side: false, since: 0, at: 0 });

export const hopes = {
  id: 'sim.hopes',
  provides: ['hopes'],
  requires: ['schema', 'queries', 'reactions', 'compute', 'core', 'persona', 'purse', 'almanac'],
  writes: ['hopes'],
  install(ctx) {
    const { schema, queries, reactions, compute, core, persona, purse, almanac } = ctx.services;

    // 每人一份：state 到哪一步，n 攒了几分，stage 第几段，told 他自己那句说到第几段，
    // side 会帮、会拆台的那两句说过没有，since 哪天起的念头，at 哪天办成或办不成
    schema.slice('hopes', {
      initial: () => Object.fromEntries(IDS.map(id => [id, fresh()])),
      validate: x => (is.keyedBy(x, IDS) && Object.values(x).every(hopeOk)) || 'hopes',
    });

    const stageOf = n => P.stages.filter(at => n >= at).length;
    const name = id => PEOPLE[id].name;
    const said = ([by, line]) => `${name(by)}：${line}`;

    /** 帮一把、使绊子：正在攒的才动；不会因此当场办成或办不成，等第二天清早再看。 */
    function push(w, id, n) {
      const h = w.hopes[id];
      if (h?.state !== 'saving' || !Number.isInteger(n)) return;
      h.n = Math.max(0, Math.min(HOPES[id].need, h.n + n));
    }

    reactions.on(
      'day.started',
      (s, e, emit) => {
        const w = s.world,
          day = w.clock.day;
        IDS.forEach((id, i) => {
          const h = w.hopes[id],
            def = HOPES[id];
          if (h.state === 'idle' && day >= def.start) {
            Object.assign(h, { state: 'saving', since: day, stage: 0 });
            core.post(w, { title: name(id) + '的盼头', text: def.stages[0][0] });
            emit('hope.stage', {
              who: id,
              stage: 0,
              line: def.stages[0][0],
              say: def.stages[0][1],
            });
            return;
          }
          if (h.state !== 'saving') return;
          const big = FEASTS[almanac.feast(w)?.id]?.big;
          if (h.n >= def.need && (!def.feast || big)) {
            Object.assign(h, { state: 'done', at: day });
            persona.vex(w, id, -P.done);
            const { story, say, reacts, after } = def.done;
            core.post(w, { title: name(id) + '办成了', text: story + after });
            emit('hope.done', {
              who: id,
              line: story,
              notes: [`${name(id)}：${say}`, ...reacts.map(said)],
            });
            return;
          }
          if (day - h.since > def.days) {
            Object.assign(h, { state: 'failed', at: day });
            persona.vex(w, id, P.fail);
            core.post(w, { title: name(id) + '没办成', text: def.fail.story });
            emit('hope.failed', {
              who: id,
              line: def.fail.story,
              notes: [`${name(id)}：${def.fail.say}`],
            });
            return;
          }
          const house = purse.houseOf(id);
          const jitter = Math.floor(noise(w.meta.seed, day, 991, i) * (P.jitter + 1));
          const gain = Math.max(
            0,
            P.base + (house ? purse.fortune(w, house) : 0) * P.fortune + jitter,
          );
          h.n = Math.min(def.need, h.n + gain);
          const stage = stageOf(h.n);
          if (stage > h.stage) {
            h.stage = stage;
            core.post(w, { title: name(id) + '的盼头', text: def.stages[stage][0] });
            emit('hope.stage', {
              who: id,
              stage,
              line: def.stages[stage][0],
              say: def.stages[stage][1],
            });
          }
        });
      },
      { priority: 75 },
    );

    /** 见面头一句：他自己的盼头到了新的一段；攒到一半以后，会帮、会拆台的那位先说他们的。 */
    function newsOf(w, to) {
      const h = w.hopes[to];
      if (h?.state === 'saving' && h.told < h.stage)
        return { line: HOPES[to].stages[h.stage][1], own: true };
      for (const id of IDS) {
        const o = w.hopes[id];
        if (o.state !== 'saving' || o.stage < 1 || o.side) continue;
        if (HOPES[id].helper[0] === to) return { line: HOPES[id].helper[1], side: id };
        if (HOPES[id].spoiler[0] === to) return { line: HOPES[id].spoiler[1], side: id };
      }
      return null;
    }
    compute.tap(
      'talk.news',
      (r, { w, to }) => {
        const n = w.hopes && newsOf(w, to);
        if (n) r.value = n.line;
      },
      { priority: 25 },
    );
    reactions.on('person.talked', (s, e) => {
      const w = s.world,
        to = e.data.to,
        n = e.data.gained && newsOf(w, to);
      if (!n || compute.run('talk.news', { w, to }, { value: '', parts: [] }).value !== n.line)
        return;
      if (n.own) w.hopes[to].told = w.hopes[to].stage;
      else w.hopes[n.side].side = true;
    });

    queries.define('hopes', w =>
      IDS.map(id => {
        const h = w.hopes[id];
        return {
          who: id,
          name: name(id),
          want: HOPES[id].want,
          state: h.state,
          stage: h.state === 'saving' ? STAGE_WORDS[h.stage] : null,
          after: h.state === 'done' ? HOPES[id].done.after : null,
        };
      }),
    );

    ctx.provide('hopes', Object.freeze({ push: ctx.own(push) }));
  },
};
