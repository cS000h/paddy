// 做事攒性情（执行方案 M10）：落脚单只定随家里来的那一个性情，另外两个从头半个月真做的事里长出来。
// 数和话在 content/leaning.js（G-27）。
//   每天过完，主角这一天做的事贴过的做法标签（心烦那边记在 w.vexes 里）一样最多算 perTag 分：
//   顺着哪个性情给哪个加，违着的减；局面里选了一样直接加 pick 分（服务 leaning.add）。
//   攒到 bud，喜欢说这个的村民见面先提一句（'talk.news'）；攒到 offer，清早冒出来那一句
//     → leaning.offered {temper, name, line, take, yes, wait, clash}
//   认下或再看看：命令 leaning.answer {take} → leaning.answered {temper, name, took, line}
//     认下和家里带来的对着的那一样，顶掉家里那一个，认下后那位村民头回见面说一句
//   满半个月（第 15 天清早）还空着的，按攒得最多的落定 → leaning.settled {tempers, lines}
//   违着家里带来的性情心烦涨了，心里冒一句（一天一回）→ leaning.pulled {line}
//   查询 leaning → 正在问的那一样、这几天最显的三样、落定没有
import { refuse } from '../../kernel/dispatch.js';
import { is } from '../../kernel/schema.js';
import { TEMPERS } from '../../content/traits.js';
import { FAMILY } from '../../content/settle.js';
import { LEAN, LEANING, FAMILY_CLASH } from '../../content/leaning.js';
import { SOCIAL_TAGS } from '../../content/stress.js';

const IDS = Object.keys(TEMPERS);
const tallyOk = x =>
  is.obj(x) && Object.entries(x).every(([k, n]) => IDS.includes(k) && is.int(n, 0, 99));
const rotate = (list, n) => list[Math.abs(n) % list.length];

export const leaning = {
  id: 'sim.leaning',
  provides: ['leaning'],
  requires: ['schema', 'commands', 'queries', 'reactions', 'compute', 'people', 'persona'],
  writes: ['leaning'],
  install(ctx) {
    const { schema, commands, queries, reactions, compute, people, persona } = ctx.services;

    // tally 攒了几分，wait 说「再看看」时攒到几分，offer 正在问的那一样，heard 苗头说过了的，
    // seen 认下对着的那一样以后，等着说那句「看出来」的村民，pulled 哪天冒过「家里性情拉扯」那句，settled 落定了
    schema.slice('leaning', {
      initial: () => ({
        tally: {},
        wait: {},
        offer: null,
        heard: [],
        seen: null,
        pulled: 0,
        settled: false,
      }),
      validate: x =>
        (is.obj(x) &&
          tallyOk(x.tally) &&
          tallyOk(x.wait) &&
          (x.offer === null || IDS.includes(x.offer)) &&
          is.arr(x.heard, IDS.length) &&
          x.heard.every(t => IDS.includes(t)) &&
          (x.seen === null || Object.hasOwn(FAMILY_CLASH, x.seen)) &&
          is.int(x.pulled, 0) &&
          typeof x.settled === 'boolean') ||
        'leaning',
    });

    const hero = w => people.who(w);
    /** 随家里来的那个性情（落脚单还没填就是 null）。 */
    const familyOf = w => {
      const f = w.growth?.[hero(w)]?.origin?.family;
      return f ? FAMILY[f].temper : null;
    };
    const held = w => persona.get(w, hero(w))?.tempers || [];
    const active = w => !w.leaning.settled && !!familyOf(w);

    /**
     * 这一样能不能认：还没有，同一对里没有别的；同一对里是家里带来的那一个、又正好是对着的，算顶掉它。
     * 返回 false 或 {drop: 顶掉哪一个 | null}。
     */
    /** @returns {{drop: string|null}|null} 认得下就给出要换掉的那样（多半没有） */
    function fits(w, t) {
      const mine = held(w);
      if (mine.includes(t)) return null;
      const same = mine.find(x => TEMPERS[x].pair === TEMPERS[t].pair);
      if (same) {
        const fam = familyOf(w);
        return same === fam && FAMILY_CLASH[fam]?.against === t ? { drop: fam } : null;
      }
      return mine.length < LEAN.max ? { drop: null } : null;
    }

    function add(w, t, n) {
      if (!active(w) || !Object.hasOwn(TEMPERS, t) || !n) return;
      const v = Math.max(0, Math.min(99, (w.leaning.tally[t] || 0) + n));
      if (v) w.leaning.tally[t] = v;
      else delete w.leaning.tally[t];
    }

    /** 攒得最多、还能认的几样，从多到少（一样多的按性情表的顺序）。 */
    const ranked = w =>
      IDS.filter(t => (w.leaning.tally[t] || 0) > 0 && fits(w, t))
        .map(t => ({ t, n: w.leaning.tally[t] }))
        .sort((a, b) => b.n - a.n || IDS.indexOf(a.t) - IDS.indexOf(b.t));

    const offerView = (w, t) => {
      const fam = familyOf(w),
        clash = fits(w, t)?.drop ? FAMILY_CLASH[fam].take : null;
      return {
        temper: t,
        name: TEMPERS[t].name,
        line: rotate(LEANING[t].rise, w.clock.day),
        take: LEANING[t].take,
        yes: LEANING[t].yes,
        wait: LEANING[t].wait,
        clash,
      };
    };

    // 一天过完：这一天做的事贴过的标签攒进去；一整天没跟人打过交道，算独处一天。
    // 反应跑的时候钟已经拨到第二天，心烦那边（priority 60）会把「独处」记到新的一天上，所以赶在它前头看。
    reactions.on(
      'day.ended',
      (s, e) => {
        const w = s.world,
          v = w.vexes?.[hero(w)];
        if (!active(w) || !v) return;
        // 「独处」是心烦那边头天夜里记上的，不算这一天做的；照这一天有没有跟人打交道重算
        const n = v.day === e.data.day ? { ...v.n } : {};
        delete n.alone;
        if (!SOCIAL_TAGS.some(t => n[t])) n.alone = 1;
        for (const [tag, k] of Object.entries(n)) {
          const c = Math.min(k, LEAN.perTag);
          for (const t of IDS) {
            if (TEMPERS[t].likes.includes(tag)) add(w, t, c);
            else if (TEMPERS[t].dislikes.includes(tag)) add(w, t, -c);
          }
        }
      },
      { priority: 55 },
    );

    // 清早：满半个月的落定；不然看有没有攒够一样、冒出来问你
    reactions.on(
      'day.started',
      (s, e, emit) => {
        const w = s.world,
          L = w.leaning;
        if (!active(w)) return;
        if (w.clock.day > LEAN.days) {
          const got = [];
          for (let left = ranked(w); held(w).length < LEAN.max && left.length; left = ranked(w)) {
            const pick = left.find(x => !fits(w, x.t)?.drop);
            if (!pick) break;
            persona.take(w, hero(w), pick.t);
            got.push(pick.t);
          }
          L.settled = true;
          L.offer = null;
          if (got.length)
            emit('leaning.settled', {
              who: hero(w),
              tempers: got.map(t => TEMPERS[t].name),
              lines: got.map(t => LEANING[t].settle),
            });
          return;
        }
        if (L.offer && !fits(w, L.offer)) L.offer = null;
        if (L.offer) return;
        const pick = ranked(w).find(
          x => x.n >= LEAN.offer && (L.wait[x.t] === undefined || x.n >= L.wait[x.t] + LEAN.again),
        );
        if (!pick) return;
        L.offer = pick.t;
        emit('leaning.offered', { who: hero(w), ...offerView(w, pick.t) });
      },
      { priority: 70 },
    );

    commands.register('leaning.answer', ({ draft, input, fact }) => {
      const w = draft.world,
        L = w.leaning,
        t = L.offer;
      if (!t) refuse('这会儿没人这么说你');
      const ok = fits(w, t);
      if (!ok) refuse('这一样已经认不下了');
      const took = input.take === true;
      let line = LEANING[t][took ? 'yes' : 'wait'];
      if (took) {
        persona.take(w, hero(w), t, ok.drop);
        if (ok.drop) {
          line = FAMILY_CLASH[ok.drop].take;
          L.seen = ok.drop;
        }
        if (held(w).length >= LEAN.max) L.settled = true;
      } else L.wait[t] = L.tally[t] || 0;
      L.offer = null;
      fact('leaning.answered', { who: hero(w), temper: t, name: TEMPERS[t].name, took, line });
    });

    /** 见面头一句：认下对着的那一样以后，看出来的那位村民先说；不然攒出苗头的那一样，喜欢说它的村民提一句。 */
    function budOf(w, to) {
      const L = w.leaning;
      if (L.seen && FAMILY_CLASH[L.seen].seen[0] === to) return { seen: true };
      if (!active(w)) return null;
      const t = ranked(w).find(
        x =>
          x.n >= LEAN.bud && !L.heard.includes(x.t) && LEANING[x.t].bud.some(([by]) => by === to),
      )?.t;
      return t ? { t } : null;
    }
    compute.tap(
      'talk.news',
      (r, { w, to }) => {
        const b = w.leaning && budOf(w, to);
        if (b?.seen) r.value = FAMILY_CLASH[w.leaning.seen].seen[1];
        else if (b) r.value = LEANING[b.t].bud.find(([by]) => by === to)[1];
      },
      { priority: 20 }, // 最先：村里刚出的事都比这一句要紧
    );
    // 今天头一回说上话、开头那一句正是这一句：记下说过了
    reactions.on('person.talked', (s, e) => {
      const w = s.world,
        to = e.data.to,
        b = e.data.gained && budOf(w, to);
      if (!b) return;
      const said = compute.run('talk.news', { w, to }, { value: '', parts: [] }).value;
      if (b.seen && said === FAMILY_CLASH[w.leaning.seen].seen[1]) w.leaning.seen = null;
      else if (!b.seen && said === LEANING[b.t].bud.find(([by]) => by === to)[1])
        w.leaning.heard.push(b.t);
    });

    // 违着家里带来的性情，心烦涨了：心里冒一句（一天一回）
    reactions.on('stress.changed', (s, e, emit) => {
      const w = s.world,
        d = e.data,
        fam = familyOf(w);
      if (d.who !== hero(w) || d.delta <= 0 || !d.tag || !fam || !held(w).includes(fam)) return;
      if (!TEMPERS[fam].dislikes.includes(d.tag) || w.leaning.pulled === w.clock.day) return;
      w.leaning.pulled = w.clock.day;
      const f = w.growth[hero(w)].origin.family;
      const line = FAMILY_CLASH[fam]
        ? rotate(FAMILY_CLASH[fam].pull, w.clock.day)
        : FAMILY[f].against;
      emit('leaning.pulled', { who: hero(w), line });
    });

    queries.define('leaning', w => {
      const L = w.leaning;
      return {
        offer: L.offer ? offerView(w, L.offer) : null,
        settled: L.settled || !familyOf(w),
        top: active(w)
          ? ranked(w)
              .slice(0, 3)
              .map(x => ({ id: x.t, name: TEMPERS[x.t].name, n: x.n }))
          : [],
        offerAt: LEAN.offer,
        daysLeft: Math.max(0, LEAN.days - w.clock.day + 1),
      };
    });

    ctx.provide('leaning', Object.freeze({ add: ctx.own(add) }));
  },
};
