// 路过稻乡的外乡过客（G-15 的 2–12 号）：集日来两位，平常日子三成多来一位，辰时到、酉时走，
// 站在茶摊、杂货铺、渡口或你家院门口。谁是谁、每一步能选什么、选了怎么样，都在 content/passers.js。
//   passer.pick {id, key, at} → passer.picked {who, id, pid, end, line, notes}
//     id 是站着的那一位（查询 passers 给的），key 是 passer.options 给的一行。人得站到跟前（at）。
// 了结以后记一笔回响：第二天村民见面先提一句（'talk.news'），茶摊传开一句（'tea.gossip'）；
// 断案时受了委屈的那一方第二天到院门口来，递碗茶赔个不是（2 文）或者说没断错。
import { refuse } from '../../kernel/dispatch.js';
import { isFairDay } from '../../content/calendar.js';
import { checkChance } from '../../content/events.js';
import { ITEMS } from '../../content/items.js';
import { ON_MAP, PEOPLE } from '../../content/people.js';
import {
  PASSERS,
  PASSER_TEXT,
  PASSER_RULES as R,
  PLUS_NAMES,
  OTHER_LOOK,
} from '../../content/passers.js';
import { VISIT_WORDS as V } from '../../content/passers.js';
import { tierOf } from '../../content/talk.js';
import { fill } from '../../content/text.js';
import { ATTRS } from '../../content/traits.js';
import {
  passersInitial,
  passersValid,
  arrivals,
  newEntry,
  entryKey,
  nameOf,
  greeting,
} from '../passer-state.js';
import { fits, grade, needName, RANK } from '../passer-state.js';
import { near } from './people.js';

export const passers = {
  id: 'sim.passers',
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
    'social',
    'modifiers',
    'residents',
    'persona',
  ],
  writes: ['passers'],
  install(ctx) {
    const { schema, commands, queries, reactions, compute, core, people, store, pack } =
      ctx.services;
    const { body, social, modifiers, residents, persona } = ctx.services;

    schema.slice('passers', { initial: passersInitial, validate: passersValid });

    const present = w =>
      w.passers.today.filter(
        e =>
          e.day === w.clock.day &&
          // 上门来的一早就到了院门口
          (w.clock.minute >= R.from || e.visit >= 0) &&
          (w.clock.minute < R.until || (e.picked.length > 0 && !e.end)),
      );
    const find = (w, id) => present(w).find(e => entryKey(e) === id) || null;
    const onlookers = (w, map) =>
      residents
        .positions(w)
        .filter(p => p.visible && p.map === map && ON_MAP.includes(p.id))
        .map(p => p.id);
    const carried = w => Object.keys(w.packs[people.who(w)].items);
    const count = (w, id) => w.packs[people.who(w)].items[id] || 0;
    const coins = w => queries.run('home', w).coins;

    /** 要带的那一样带了没有：有就给出交出去的那一份（菜挑最好的一盘、东西挑成色最好的）。 */
    function have(w, e, need, n = 1) {
      for (const alt of need.split('|')) {
        if (alt.startsWith('flag:') && e.flags.includes(alt.slice(5))) return { flag: true };
        if (alt === 'dish') {
          const list = [...pack.dishes(w, people.who(w))];
          list.sort((a, b) => RANK.indexOf(b.quality) - RANK.indexOf(a.quality));
          if (list.length) return { dish: list[0] };
          continue;
        }
        const items = carried(w).filter(id => fits(alt, id) && count(w, id) >= n);
        items.sort((a, b) => grade(b) - grade(a));
        if (items.length) return { item: items[0] };
      }
      return null;
    }
    /** 检定的把握：那一项的点数，加上台词里写的把握加项（每条算一点）。 */
    function odds(w, e, spec) {
      const who = people.who(w);
      const text = PASSER_TEXT[e.id].steps[e.step].opts[spec.i];
      if (spec.auto && e.flags.includes(spec.auto)) return { chance: 100, parts: [] };
      const known = w.bonds.known;
      const kitchen = w.kitchens[store.id(w)];
      const caught = Object.values(w.fishing[who]?.records || {}).reduce((s, r) => s + r.n, 0);
      const test = {
        friends: () => ON_MAP.filter(id => tierOf(known[id] || 0) >= 2).length >= 3,
        cook: () => Object.keys(kitchen?.known || {}).length >= 3,
        found: () => Object.keys(w.quality[who]?.found || {}).length >= 3,
        fish: () => caught >= 10,
        coins: () => coins(w) >= 60,
        met: () => (w.passers.met[e.id]?.n || 0) > 0,
      };
      const parts = (spec.plus || [])
        .map((k, i) => {
          const [kind, arg] = k.split(':');
          const on =
            kind === 'near'
              ? onlookers(w, e.map).includes(arg)
              : kind === 'item'
                ? count(w, arg) > 0
                : kind === 'flag'
                  ? e.flags.includes(arg)
                  : kind === 'title'
                    ? modifiers.has(w, arg)
                    : test[kind]();
          return on ? text.why?.[i] || PASSERS[e.id].why?.[k] || PLUS_NAMES[kind] : null;
        })
        .filter(Boolean);
      const value = persona.attrs(w, who).values[spec.check] + parts.length;
      return { chance: checkChance(value, R.dc), parts };
    }

    const stepOf = e => PASSERS[e.id].steps[e.step].map((s, i) => ({ ...s, i }));

    queries.define('passers', w =>
      present(w).map(e => ({
        id: entryKey(e),
        pid: e.id,
        name: nameOf(e),
        title: e.visit >= 0 ? '上门来的' : PASSERS[e.id].title,
        look: e.visit >= 0 && nameOf(e) !== PASSERS[e.id].name ? OTHER_LOOK : PASSERS[e.id].look,
        map: e.map,
        x: e.x,
        y: e.y,
        dir: e.dir,
        done: !!e.end,
        greeting: greeting(e, w.passers.met[e.id], w.clock.day),
      })),
    );

    queries.define('passer.options', (w, id) => {
      const e = find(w, id);
      if (!e || e.end) return [];
      const row = (key, label, more = {}) => ({
        key,
        label,
        command: 'passer.pick',
        input: { id, key },
        result: 'passer.picked',
        ...more,
      });
      if (e.visit >= 0)
        return [
          row('tea', `${V.tea}（${R.tea} 文）`, { reason: coins(w) < R.tea ? '钱不够' : null }),
          row('firm', V.firm),
        ];
      const text = PASSER_TEXT[e.id].steps[e.step].opts;
      return stepOf(e)
        .filter(s => !e.picked.includes(e.step + '.' + s.i))
        .map(s => {
          let label = fill(text[s.i].label, PASSERS[e.id].fill || {});
          let confirm = null;
          if (s.cost) label += `（${s.cost} 文）`;
          if (s.check) {
            const { chance } = odds(w, e, s);
            label += ` · 把握${chance}%`;
            confirm = `${ATTRS[s.check]}检定，把握${chance}%`;
          }
          const need = s.need && !have(w, e, s.need, s.do?.take > 1 ? s.do.take : 1);
          const reason = need
            ? `身上没带${needName(s.need)}`
            : s.cost && coins(w) < s.cost
              ? '钱不够'
              : null;
          return row(e.step + '.' + s.i, label, { confirm, reason });
        });
    });

    /** 选了以后的得失。返回要冒在画面上的几句。 */
    function apply(w, e, eff, got, notes) {
      const who = people.who(w);
      const p = PASSERS[e.id];
      const met = (w.passers.met[e.id] ||= { n: 0, last: -1, day: w.clock.day });
      if (eff.take && got?.dish) pack.takeDish(w, who, got.dish.id);
      else if (eff.take && got?.item)
        pack.take(w, who, got.item, eff.take === true ? 1 : eff.take, p.title);
      if (eff.coins > 0) store.earn(w, eff.coins, p.title);
      if (eff.coins < 0) store.pay(w, Math.min(coins(w), -eff.coins), p.title);
      if (eff.mood) body.mood(w, who, eff.mood, p.title);
      if (eff.give) pack.deliver(w, who, eff.give[0], eff.give[1], p.title);
      for (const [to, n] of Object.entries(eff.bond || {}))
        if (n > 0) social.relate(w, to, n, 'passer');
      if (eff.title) modifiers.add(w, who, eff.title, null, p.title);
      if (eff.note) {
        core.post(w, { title: '见闻', text: eff.note });
        notes.push('记下一条见闻：' + eff.note);
      }
      if (eff.flag) e.flags.push(eff.flag);
      if (eff.fav) met.fav = Math.max(-9, Math.min(9, (met.fav || 0) + eff.fav));
      if (eff.give) notes.push(`得了${ITEMS[eff.give[0]].name}×${eff.give[1]}`);
    }

    /** 了结：结语、围观的一句、回响和下回来时说哪一句。 */
    function finish(w, e, end, eff, luck, notes) {
      const text = PASSER_TEXT[e.id];
      let rumor = eff.rumor || (end === 'ok' ? (luck ? 'luck' : 'good') : null);
      if (end === 'none' && e.flags.includes('sour')) [end, rumor] = ['bad', 'bad'];
      e.end = end;
      const met = w.passers.met[e.id];
      met.n = Math.min(999, met.n + 1);
      met.day = w.clock.day;
      met.last = eff.back ?? (end === 'ok' ? 0 : end === 'bad' ? 1 : met.last);
      if (end !== 'ok' && end !== 'bad') {
        if (end === 'mild') w.passers.echo.push(echo(w, e, end, rumor, -1));
        return;
      }
      const [aside, his] = text.ends[end];
      if (aside) notes.push(aside);
      if (his) notes.push(nameOf(e) + '：“' + his + '”');
      const cheer = e.seen.find(id => text.crowd?.[id]);
      if (cheer)
        notes.push(PEOPLE[cheer].name + '：“' + text.crowd[cheer][end === 'ok' ? 0 : 1] + '”');
      w.passers.echo.push(echo(w, e, end, rumor, eff.visit ?? -1));
      core.post(w, { title: PASSERS[e.id].title, text: aside || his });
    }
    const echo = (w, e, end, rumor, visit) => ({
      day: w.clock.day,
      id: e.id,
      end,
      seen: [...e.seen],
      rumor: rumor && PASSER_TEXT[e.id].rumor[rumor] ? rumor : null,
      visit,
    });

    /** 赛菜、赛瓜：拿身上最好的一样跟他比。 */
    function contest(w, e, spec, got) {
      const probed = e.flags.includes('probed');
      if (spec.test === 'dish') {
        const q = got.dish.quality;
        const ok = q === 'great' || q === 'good' || (q === 'plain' && probed);
        return { ok, luck: q === 'plain', rumor: ['burnt', 'raw'].includes(q) ? 'bad' : null };
      }
      const mine = grade(got.item);
      const his = 1 + Math.floor(core.random(w) * 3) - (probed ? 1 : 0);
      return {
        ok: mine >= his,
        luck: mine === his,
        rumor: mine === 1 && mine < his ? 'bad' : null,
      };
    }

    commands.register('passer.pick', ({ draft, input, fact }) => {
      const w = draft.world;
      const e = find(w, input.id);
      if (!e) refuse('过客已经走了');
      const me = people.place(w, input.at);
      if (me.map !== e.map || !near(me, e)) refuse(`走到${nameOf(e)}跟前再说`);
      if (e.end) refuse('这件事已经了了');
      const who = people.who(w);
      const notes = [];
      e.seen = [...new Set([...e.seen, ...onlookers(w, e.map)])];
      // 这一句没话（只冒了旁白）就让他接着说眼下这一步的话
      const done = line =>
        fact('passer.picked', {
          who,
          id: input.id,
          pid: e.id,
          end: e.end,
          line: line || greeting(e, w.passers.met[e.id], w.clock.day),
          notes,
        });

      if (e.visit >= 0) {
        if (!['tea', 'firm'].includes(input.key)) refuse('没有这个选项');
        if (input.key === 'tea') {
          store.pay(w, R.tea, `给${nameOf(e)}赔个不是`);
          body.mood(w, who, 1, '赔了个不是');
        }
        e.end = 'mild';
        return void done(input.key === 'tea' ? V.teaLine : V.firmLine);
      }

      const [step, i] = String(input.key).split('.').map(Number);
      const raw = step === e.step ? PASSERS[e.id].steps[step][i] : null;
      const spec = raw && { ...raw, i };
      if (!spec || e.picked.includes(input.key)) refuse('没有这个选项');
      const text = PASSER_TEXT[e.id].steps[step].opts[i];
      const take = spec.do?.take ?? spec.ok?.take;
      const got = spec.need ? have(w, e, spec.need, take > 1 ? take : 1) : null;
      if (spec.need && !got) refuse(`身上没带${needName(spec.need)}`);
      if (spec.cost) store.pay(w, spec.cost, PASSERS[e.id].title);

      // 头一回搭话：边上的村民先说一句（熟了说熟人的话）
      if (!e.picked.length) {
        const by = e.seen.find(id => PASSER_TEXT[e.id].before[id]);
        const close = by && tierOf(w.bonds.known[by] || 0) >= 2 ? 1 : 0;
        if (by) notes.push(PEOPLE[by].name + '：“' + PASSER_TEXT[e.id].before[by][close] + '”');
      }
      e.picked.push(input.key);

      // 端上一盘烧糊的：有的过客当场就不认（spec.burnt）
      let eff = got?.dish?.quality === 'burnt' && spec.burnt ? spec.burnt : spec.do;
      let reply = text.say || ['', ''];
      let luck = false;
      if (spec.check || spec.test) {
        let ok;
        if (spec.test) {
          const r = contest(w, e, spec, got);
          ({ ok, luck } = r);
          eff = { ...(ok ? spec.ok : spec.bad), ...(r.rumor && !ok ? { rumor: r.rumor } : {}) };
        } else {
          const { chance, parts } = odds(w, e, spec);
          for (const why of parts) notes.push('（' + why + '）');
          const roll = core.random(w) * 100;
          ok = roll < chance;
          luck = ok && chance < 50;
          eff = ok ? spec.ok : spec.bad;
          if (!ok && roll < chance + R.near && text.near)
            notes.push(core.stable(text.near, w.clock.day));
        }
        reply = (ok ? text.ok : text.bad) || ['', ''];
      }
      if (reply[1]) notes.unshift(...reply[1].split('\n'));
      apply(w, e, eff, got, notes);
      const line = fill(reply[0], PASSERS[e.id].fill || {});
      if (line) e.line = line;
      if (eff.next !== undefined && eff.next !== e.step) {
        e.step = eff.next;
        e.line = '';
        // 断案到了第二步：边上的村民说说偏向哪一边
        const side = PASSER_TEXT[e.id].side;
        const by = side && e.seen.find(id => side[id]);
        if (by) notes.push(PEOPLE[by].name + '：“' + side[by] + '”');
      }
      if (eff.end) finish(w, e, eff.end, eff, luck, notes);
      done(line);
    });

    reactions.on(
      'day.started',
      s => {
        const w = s.world;
        const t = w.passers;
        const day = w.clock.day;
        const visits = t.echo.filter(e => e.day === day - 1 && e.visit >= 0);
        t.echo = t.echo.filter(e => e.day >= day - 1).slice(-8);
        t.today = [];
        const taken = [];
        for (const v of visits) {
          t.today.push(newEntry(v.id, day, v.visit, taken));
          taken.push('yard');
        }
        for (const id of arrivals(w.meta.seed, day, isFairDay(day), t.met)) {
          if (t.today.length >= 4) break;
          t.today.push(newEntry(id, day, -1, taken));
          taken.push(PASSERS[id].map);
        }
      },
      { priority: 56 },
    );

    // 第二天：村民见面先提一句；茶摊上传开一句
    const yesterday = w =>
      w.passers.echo.filter(e => e.day === w.clock.day - 1 && e.end !== 'mild');
    compute.tap('talk.news', (r, { w, to }) => {
      if (r.value) return;
      const e = yesterday(w).find(x => PASSER_TEXT[x.id].echo[to]);
      if (e)
        r.value = PASSER_TEXT[e.id].echo[to][e.seen.includes(to) ? (e.end === 'ok' ? 0 : 1) : 2];
    });
    compute.tap('tea.gossip', (r, { w }) => {
      const e = w.passers.echo.find(x => x.day === w.clock.day - 1 && x.rumor);
      if (e) r.value = PASSER_TEXT[e.id].rumor[e.rumor];
    });
  },
};
