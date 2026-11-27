// 局面池（执行方案 M11）：写局面，不写剧本。池子和话在 content/scenes.js（G-27、G-28、G-29）。
//   今天有哪几件（清早排上）：头三天找上门的事按日子来，多找三文钱是头三天头一回在杂货铺买东西时碰上；
//     天时年景不平常的那一季，第三天来那一件；大日子上从聚来的人里找性情对得上的两位；
//     村民的盼头攒到一半（hope.stage 第二段），那一件挂几天
//   演 a 的那位这几段站到那儿（接 'resident.positions'），说上话先说那一句（'talk.news'），
//     接话里多几个选项（'resident.options'）→ 命令 scene.choose {id, pick, at} → scene.chosen {id, pick, ok, line, notes}
//     选了：用东西、花钱、出力气，好感、心情、见闻、盼头当场兑现；给那一样性情攒几分（leaning.add），贴做法标签
//   第二天那位见面先提一句（'talk.news'）
//   碰上那一下（大日子上那几件除外，聚起来就看得见）→ scene.opened {id, line}
//   查询 scenes → 今天挂着的几件（谁、在哪儿）
import { refuse } from '../../kernel/dispatch.js';
import { is } from '../../kernel/schema.js';
import { noise } from '../noise.js';
import { ITEMS } from '../../content/items.js';
import { ON_MAP, PEOPLE } from '../../content/people.js';
import { checkChance } from '../../content/events.js';
import { dateOf } from '../../content/calendar.js';
import { FEASTS, YEARS, YEAR_RULE } from '../../content/almanac.js';
import { LEAN } from '../../content/leaning.js';
import {
  SCENES,
  SCENE_GROUP,
  DOOR_DAYS,
  DOOR_UNTIL,
  HOPE_STAY,
  SCENE_ACTION,
  SCENE_CHECK,
} from '../../content/scenes.js';
import { witnessLine } from './witness.js';

const IDS = Object.keys(SCENES);
const rotate = (list, n) => list[Math.abs(n) % list.length];
const liveOk = e =>
  is.obj(e) &&
  IDS.includes(e.id) &&
  ON_MAP.includes(e.a) &&
  (e.b === null || ON_MAP.includes(e.b)) &&
  is.int(e.day, 1) &&
  is.int(e.until, 1);
const doneOk = x =>
  is.obj(x) && Object.entries(x).every(([k, d]) => IDS.includes(k) && is.int(d, 1));

export const scenes = {
  id: 'sim.scenes',
  requires: [
    'schema',
    'commands',
    'queries',
    'reactions',
    'compute',
    'core',
    'people',
    'store',
    'pack',
    'body',
    'opinion',
    'persona',
    'residents',
    'witness',
    'stress',
    'leaning',
    'almanac',
    'hopes',
  ],
  writes: ['scenes'],
  install(ctx) {
    const { schema, commands, queries, reactions, compute, core, people, store, pack } =
      ctx.services;
    const { body, opinion, persona, residents, witness, stress, leaning, almanac, hopes } =
      ctx.services;

    // live 今天挂着的几件（a、b 演的人，day 哪天排上，until 挂到哪天），done 头三天和盼头那几件哪天了结的，
    // echo 了结了的几件（day 是了结那天），第二天见面提一句
    schema.slice('scenes', {
      initial: () => ({ live: [], done: {}, echo: [] }),
      validate: x =>
        (is.obj(x) &&
          is.arr(x.live, 12) &&
          x.live.every(liveOk) &&
          doneOk(x.done) &&
          is.arr(x.echo, 12) &&
          x.echo.every(liveOk)) ||
        'scenes',
    });

    const me = w => people.who(w);
    const name = id => PEOPLE[id].name;
    const fill = (text, e) =>
      text.replaceAll('{a}', name(e.a)).replaceAll('{b}', e.b ? name(e.b) : '旁人');

    /** 找人演：写死的就是那位；写了性情的，从有这几样性情之一的村民里挑（每天挑法固定）。 */
    function cast(w, role, not, salt) {
      if (!role) return null;
      if (typeof role === 'string') return role;
      const list = ON_MAP.filter(
        id => id !== not && persona.get(w, id)?.tempers.some(t => role.tempers.includes(t)),
      )
        .map((id, i) => ({ id, r: noise(w.meta.seed, w.clock.day, 941 + salt, i) }))
        .sort((a, b) => a.r - b.r);
      return list[0]?.id || null;
    }

    function open(w, id, until, emit, salt = 0) {
      const def = SCENES[id];
      const a = cast(w, def.a, null, salt);
      const b = cast(w, def.b, a, salt + 1);
      if (!a || (def.b && !b) || w.scenes.live.some(e => e.id === id)) return null;
      const e = { id, a, b, day: w.clock.day, until };
      w.scenes.live.push(e);
      // 碰上那一下：有旁白冒旁白，没有就说一声谁在哪儿等着（头回见面那一句会盖过他开口那句）
      const first = def.story
        ? rotate(def.story, w.clock.day)
        : def.say && def.doing
          ? `${name(a)}${def.doing}：${rotate(def.say, w.clock.day)}`
          : null;
      if (first && emit) emit('scene.opened', { id, line: fill(first, e) });
      return e;
    }

    // 清早排上今天的几件
    reactions.on(
      'day.started',
      (s, e, emit) => {
        const w = s.world,
          S = w.scenes,
          day = w.clock.day;
        S.live = S.live.filter(x => x.until >= day);
        const door = DOOR_DAYS[day];
        if (door && !S.done[door]) open(w, door, day, emit);
        const year = YEARS[almanac.year(w)].scene;
        if (year && dateOf(day).dayOfSeason === YEAR_RULE.scene) open(w, year, day + 1, emit);
        const f = almanac.feast(w);
        if (f && FEASTS[f.id].big) {
          const pool = IDS.filter(id => SCENES[id].feast === f.id)
            .map((id, i) => ({ id, r: noise(w.meta.seed, day, 953, i) }))
            .sort((a, b) => a.r - b.r);
          pool.some(({ id }, i) => open(w, id, day, null, i * 2));
        }
      },
      { priority: 80 },
    );

    // 开局那天没有「清早」：落了脚就排上头一天那件
    reactions.on('origin.settled', (s, e, emit) => {
      const w = s.world,
        door = DOOR_DAYS[w.clock.day];
      if (door && !w.scenes.done[door]) open(w, door, w.clock.day, emit);
    });

    // 盼头攒到一半：那一件挂几天
    reactions.on('hope.stage', (s, e, emit) => {
      const w = s.world,
        id = 'hope.' + e.data.who;
      if (e.data.stage === 1 && SCENES[id] && !w.scenes.done[id])
        open(w, id, w.clock.day + HOPE_STAY - 1, emit);
    });

    // 头三天头一回在杂货铺买东西：小乔多找了三文钱
    reactions.on('market.bought', (s, e, emit) => {
      const w = s.world,
        id = 'door.coins';
      if (e.data.shop !== 'market' || w.clock.day > DOOR_UNTIL || w.scenes.done[id]) return;
      if (w.scenes.live.some(x => x.id === id)) return;
      if (open(w, id, w.clock.day, emit)) store.earn(w, SCENES[id].extra, '小乔多找的');
    });

    const slotNow = w => residents.slotOf(w.clock.minute);
    /** 这一件此刻有没有人在那儿演：写了地方的看时辰；大日子看节令聚人的时辰。 */
    function onStage(w, e) {
      const def = SCENES[e.id];
      if (e.until < w.clock.day || e.day > w.clock.day) return false;
      if (def.feast) {
        const f = FEASTS[def.feast];
        return almanac.feast(w)?.id === def.feast && f.slots.includes(slotNow(w));
      }
      return !def.place || def.slots.includes(slotNow(w));
    }

    compute.tap(
      'resident.positions',
      (r, { w, slot }) => {
        if (slot === null || !w.scenes) return;
        for (const e of w.scenes.live) {
          const def = SCENES[e.id];
          if (!def.place || !def.slots.includes(slot) || e.until < w.clock.day) continue;
          if (r.waiting === e.a || !r.value[e.a]) continue;
          r.value[e.a] = def.place;
          if (def.spot) r.spots[e.a] = def.spot;
          else delete r.spots[e.a];
          r.doing[e.a] = def.doing;
        }
      },
      { priority: 50 },
    );

    const liveFor = (w, to) => w.scenes.live.filter(e => e.a === to && onStage(w, e));

    compute.tap(
      'talk.news',
      (r, { w, to }) => {
        const e = w.scenes && liveFor(w, to)[0];
        if (e) {
          const def = SCENES[e.id];
          const say = def.say ? rotate(def.say, w.clock.day) : null;
          const pre = def.bsay ? `（${name(e.b)}：${def.bsay}）` : '';
          if (say) r.value = fill(pre + say, e);
          return;
        }
        const x = w.scenes?.echo.find(x => {
          const by = SCENES[x.id].echo[0];
          return x.day === w.clock.day - 1 && (by === 'a' ? x.a : by) === to;
        });
        if (x) r.value = SCENES[x.id].echo[1];
      },
      { priority: 88 },
    );

    /** 这一样眼下做不了的原因（空的就是做得了）。 */
    function why(w, opt, at) {
      for (const [item, n] of Object.entries(opt.cost || {}))
        if (pack.reach(w, me(w), item, at) < n) return `${ITEMS[item].name}不够，要${n}份`;
      if (opt.coins < 0 && store.coins(w) < -opt.coins) return `钱不够，要${-opt.coins}文`;
      return '';
    }

    // 接话里多几个选项：找人插件只给查询，这里按查询 'scene.options' 排
    queries.define('scene.options', (w, to, at = null) => {
      const rows = [];
      const p = residents.positions(w).find(x => x.id === to);
      for (const e of liveFor(w, to)) {
        const def = SCENES[e.id];
        if (def.place && p?.place !== def.place) continue;
        rows.push(
          ...def.opts.map(o => ({
            key: `scene.${e.id}.${o.key}`,
            group: SCENE_GROUP,
            label: o.label,
            reason: why(w, o, at),
            command: 'scene.choose',
            input: { id: e.id, pick: o.key },
            result: 'scene.chosen',
          })),
        );
      }
      return rows;
    });
    compute.tap('resident.options', (rows, { person, ask, at }) => {
      rows.unshift(...ask('scene.options', person.id, at));
    });

    /** 谁记下来由：'a'、'b'、'all'（全村）或村民编号。 */
    const whoOf = (e, k) => (k === 'all' ? ON_MAP : k === 'a' ? [e.a] : k === 'b' ? [e.b] : [k]);

    commands.register('scene.choose', ({ draft, input, fact }) => {
      const w = draft.world,
        S = w.scenes;
      const e = S.live.find(x => x.id === input.id);
      if (!e || !onStage(w, e)) refuse('这件事已经过去了');
      const def = SCENES[e.id];
      const opt = def.opts.find(o => o.key === input.pick);
      if (!opt) refuse('没有这个选项');
      if (def.place) {
        const p = residents.positions(w).find(x => x.id === e.a);
        if (!p?.visible || p.place !== def.place || p.map !== people.me(w).map)
          refuse(`${name(e.a)}不在跟前`);
      }
      const reason = why(w, opt, input.at);
      if (reason) refuse(reason);
      const hero = me(w);
      if (opt.energy) people.spend(w, draft, SCENE_ACTION, fact);
      const notes = [];
      let ok = true;
      let out = opt;
      if (opt.check) {
        const chance = checkChance(persona.attrs(w, hero).values[opt.check.attr], SCENE_CHECK.dc);
        const roll = core.random(w) * 100;
        ok = roll < chance;
        if (!ok && roll < chance + SCENE_CHECK.near) notes.push(opt.check.near);
        out = { ...opt, ...(ok ? opt.check.ok : opt.check.bad) };
      }
      const why2 = `${name(e.a)}那件事`;
      for (const [item, n] of Object.entries(out.cost || {})) pack.use(w, hero, item, n, why2);
      if (out.coins < 0) store.pay(w, -out.coins, why2);
      if (out.coins > 0) store.earn(w, out.coins, why2);
      if (out.gain) {
        pack.deliver(w, hero, out.gain[0], out.gain[1], why2);
        notes.push(`得了${ITEMS[out.gain[0]].name}×${out.gain[1]}`);
      }
      if (out.mood) body.mood(w, hero, out.mood, why2);
      for (const [k, reason2] of out.like || [])
        for (const id of whoOf(e, k)) if (id) opinion.note(w, id, hero, reason2);
      if (out.seen) notes.push(`${name(out.seen[0])}看在眼里：${out.seen[1]}`);
      if (out.gossip) notes.push(`${name(e.a)}顺嘴说：“${rotate(def.gossip, w.clock.day)}”`);
      if (out.news) {
        const x = witness.tell(w, e.a, hero);
        if (x) notes.push('听来一件事：' + witnessLine(x) + '。');
      }
      if (out.hope) hopes.push(w, e.a, out.hope);
      if (out.temper) leaning.add(w, out.temper, LEAN.pick);
      if (out.tags?.length) stress.apply(w, hero, out.tags, fact);
      if (def.feast) almanac.join(w);
      if (out.story) notes.unshift(fill(out.story, e));
      S.live = S.live.filter(x => x !== e);
      if (def.kind === 'door' || def.kind === 'hope') S.done[e.id] = w.clock.day;
      S.echo = S.echo.filter(x => x.day >= w.clock.day - 1);
      if (def.echo) S.echo.push({ ...e, day: w.clock.day });
      const line = out.reply ? `${name(e.a)}：${fill(out.reply, e)}` : '';
      fact('scene.chosen', { who: hero, id: e.id, pick: opt.key, ok, line, notes });
    });

    queries.define('scenes', w =>
      w.scenes.live.map(e => ({
        id: e.id,
        kind: SCENES[e.id].kind,
        a: e.a,
        b: e.b,
        name: name(e.a),
        place: SCENES[e.id].place || FEASTS[SCENES[e.id].feast]?.place || null,
        now: onStage(w, e),
      })),
    );
  },
};
