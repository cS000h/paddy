// 集日比鱼：集日上午到申时前，外乡钓客（何老三、钱胖子轮流）在渡口钓点边立木牌，约你现比三竿。
// 台词和数在 content/fair-match.js。玩家要站到钓客跟前（规则校验站位 at）。
//   match.join    {at, stake}   → match.joined   {who, host, stake, line}   应下（押 10 文，或者只切磋）
//   接下来在渡口下的三竿算数：钓上的量长短，空竿、跑了、惊了都算 0 → match.cast {who, n, line}
//   match.measure {at}          → match.measured {who, host, result, caught, line}（result 为 null 是还能验）
//       摊开木尺量。钱胖子眼看要输，会掏暗篓里城里买的鱼充数；他压过你时可以当众验他的鱼。
//   match.inspect {at, look}    → match.settled  {who, host, result, caught, line}   验（look）或认了
//   match.after   {at, choice}  → match.after    {who, choice, line}   输了以后：再约、请喝茶、走人
// 比的三竿不算进惊窝（计算管道 'fish.scare'）。比完记一笔回响：第二天村民见面先提一句（'talk.news'），
// 茶摊传开一句（'tea.gossip'）。赢了得「渡口头竿」，识破得「亮眼识鱼」，赢够三回得「水湾压场」。
import { refuse } from '../../kernel/dispatch.js';
import { isFairDay } from '../../content/calendar.js';
import { FISH } from '../../content/fishing.js';
import { ON_MAP, PEOPLE } from '../../content/people.js';
import { tierOf } from '../../content/talk.js';
import { fill } from '../../content/text.js';
import { MATCH, HOSTS, TOPICS, MATCH_WORDS as W, INSPECT_PARTS } from '../../content/fair-match.js';
import { MATCH_BEFORE, MATCH_CROWD, MATCH_ECHO, MATCH_RUMOR } from '../../content/fair-match.js';
import { lenText } from '../fishing-fight.js';
import { NTH, matchInitial, matchValid, newBout, scoreOf } from '../fair-match-bout.js';
import { hisCatch, cheat, showLines, greeting, optionsOf } from '../fair-match-bout.js';
import { noise } from '../noise.js';
import { near } from './people.js';

export const fairMatch = {
  id: 'sim.fairMatch',
  requires: [
    'schema',
    'commands',
    'queries',
    'reactions',
    'compute',
    'core',
    'people',
    'store',
    'body',
    'modifiers',
    'residents',
    'persona',
  ],
  writes: ['match'],
  install(ctx) {
    const { schema, commands, queries, reactions, compute, core, people, store, body } =
      ctx.services;
    const { modifiers, residents, persona } = ctx.services;

    schema.slice('match', { initial: matchInitial, validate: matchValid });

    /** 钓客还在不在渡口：申时前一直在；比到一半的等你比完。 */
    const present = w => {
      const t = w.match.today;
      if (!t || t.day !== w.clock.day) return null;
      return w.clock.minute < MATCH.until || !['open', 'over'].includes(t.phase) ? t : null;
    };

    const onlookers = w =>
      residents
        .positions(w)
        .filter(p => p.visible && p.map === MATCH.spot.map && ON_MAP.includes(p.id))
        .map(p => p.id);

    function atHost(w, at) {
      const t = present(w);
      if (!t) refuse('钓客已经收竿走了');
      const me = people.place(w, at);
      if (me.map !== MATCH.spot.map || !near(me, MATCH.spot))
        refuse(`走到${HOSTS[t.host].name}跟前再说`);
      return t;
    }

    const rand = w => () => core.random(w);

    function inspectOdds(w, who) {
      const k = MATCH.inspect;
      const parts = [];
      const yueli = persona.attrs(w, who).values.yueli;
      if (yueli > 4) parts.push({ id: 'yueli', delta: (yueli - 4) * k.yueli });
      const caught = Object.values(w.fishing[who]?.records || {}).reduce((s, r) => s + r.n, 0);
      const skill = k.fish.filter(([n]) => caught >= n).pop();
      if (skill) parts.push({ id: 'fish', delta: skill[1] });
      if (onlookers(w).includes('zhou')) parts.push({ id: 'zhou', delta: k.zhou });
      if (w.match.hosts.qian.met > 1) parts.push({ id: 'wary', delta: k.wary });
      const sum = parts.reduce((s, p) => s + p.delta, k.base);
      return {
        chance: Math.max(15, Math.min(95, sum)),
        parts: parts.map(p => ({ ...p, name: INSPECT_PARTS[p.id].name })),
      };
    }

    const pick = w => (list, n) => core.stable(list, w.clock.day + n);

    /** 分出输赢：钱和称号、记下回响、围观的人说一句。 */
    /** 分出输赢：钱和称号、记下回响。say 是钓客跟前气泡里的话，notes 一句一句冒在画面上。 */
    function settle(w, t, result, fact, said, caught = false, type = 'match.settled') {
      const who = people.who(w);
      const m = w.match;
      const host = HOSTS[t.host];
      const staked = t.stake > 0;
      const { notes } = said;
      let say = said.say;
      t.result = result;
      t.seen = [...new Set([...t.seen, ...onlookers(w)])];
      t.phase = result === 'lose' ? 'after' : 'over';
      m.hosts[t.host].last = result;
      const margin = Math.abs(scoreOf(t.mine, t.topic) - scoreOf(t.his, t.topic));
      let crowd = '';
      if (result === 'win') {
        if (staked) store.earn(w, t.stake + MATCH.prize, `比鱼赢了${host.name}`);
        body.mood(w, who, 4, '集日比鱼赢了');
        m.wins = Math.min(999, m.wins + 1);
        if (caught) {
          m.hosts.qian.caught = true;
          modifiers.add(w, who, 'match_eye', null, `识破${host.name}的暗篓`);
        } else {
          say += '“' + (staked ? W.win : W.winSpar)[t.host] + '”';
          crowd = W.winCrowd;
          modifiers.add(w, who, 'match_head', null, `比鱼压过${host.name}`);
        }
        if (m.wins >= MATCH.bay) modifiers.add(w, who, 'match_bay', null, '几回集日稳坐渡口');
      } else if (result === 'tie') {
        if (staked) store.earn(w, t.stake, '比鱼打平，押钱退回');
        body.mood(w, who, 1, '集日比鱼打平');
        say += '“' + W.tie[t.host] + '”';
        crowd = W.tieCrowd;
      } else if (!caught) {
        say += '“' + (staked ? W.lose : W.loseSpar)[t.host] + '”';
        crowd = staked ? W.loseCrowd : W.loseCrowdSpar;
      }
      const cheer = t.seen.find(id => MATCH_CROWD[id]);
      if (cheer && result !== 'tie')
        crowd += PEOPLE[cheer].name + '：“' + MATCH_CROWD[cheer][result === 'win' ? 0 : 1] + '”';
      if (crowd) notes.push(crowd);
      const rumor =
        result === 'win'
          ? margin <= 1
            ? 'luck'
            : 'good'
          : result === 'tie' && t.host === 'qian'
            ? 'collude'
            : null;
      m.echo = { day: w.clock.day, host: t.host, result, seen: [...t.seen], rumor };
      const word = { win: '赢了', lose: '输了', tie: '打平' }[result];
      core.post(w, {
        title: '集日比鱼',
        text: `在渡口和${host.name}比${TOPICS[t.topic].name}，${caught ? '识破了暗篓，' : ''}${word}。`,
      });
      fact(type, { who, host: t.host, result, caught, line: say, notes });
    }

    // 集日清早钓客到渡口；没比完的作罢
    reactions.on(
      'day.started',
      s => {
        const w = s.world;
        const m = w.match;
        const t = m.today;
        if (t && ['fishing', 'ready', 'suspect'].includes(t.phase))
          core.post(w, { title: '集日比鱼', text: t.stake ? W.lapsed : W.lapsedSpar });
        m.today = null;
        if (!isFairDay(w.clock.day)) return;
        m.fairs = Math.min(9999, m.fairs + 1);
        // 牌子上写哪一样只看日子和种子，不动存档里的随机数（别处的收成不跟着变）
        const topic = noise(w.meta.seed, w.clock.day, 5) < 0.5 ? 'single' : 'sum';
        m.today = newBout(w.clock.day, m.fairs % 2 ? 'he' : 'qian', topic);
      },
      { priority: 55 },
    );

    // 比鱼的三竿：在渡口下竿才算；这一竿怎么收场都记一笔
    const matching = (w, who) => {
      const t = present(w);
      return t && t.phase === 'fishing' && who === people.who(w) ? t : null;
    };
    reactions.on('fish.cast', (s, e) => {
      const t = matching(s.world, e.data.who);
      if (t && e.data.spot === MATCH.spot.map) t.pending = true;
    });
    for (const type of ['fish.caught', 'fish.missed', 'fish.lost', 'fish.spooked'])
      reactions.on(type, (s, e, emit) => {
        const w = s.world;
        const t = matching(w, e.data.who);
        if (!t?.pending) return;
        const got =
          type === 'fish.caught' && !e.data.thing ? { fish: e.data.fish, len: e.data.len } : null;
        t.mine.push(got || { fish: null, len: 0 });
        t.pending = false;
        const what = got ? lenText(got.len) + '的' + FISH[got.fish].name : W.empty;
        const left = MATCH.casts - t.mine.length;
        if (!left) t.phase = 'ready';
        const line =
          fill(W.cast, { n: NTH[t.mine.length - 1], what }) +
          (left ? fill(W.castLeft, { n: NTH[left - 1] }) : W.castDone);
        emit('match.cast', { who: e.data.who, n: t.mine.length, line });
      });

    compute.tap('fish.scare', (r, { w, spot }) => {
      if (spot === MATCH.spot.map && present(w)?.phase === 'fishing') r.value = 0;
    });

    // 第二天：村民见面先提一句；茶摊上传开一句
    const echoNow = w => {
      const e = w.match.echo;
      return e && e.day === w.clock.day - 1 ? e : null;
    };
    compute.tap('talk.news', (r, { w, to }) => {
      const e = echoNow(w);
      if (!e || !MATCH_ECHO[to]) return;
      const seen = e.seen.includes(to) && e.result !== 'tie';
      r.value = MATCH_ECHO[to][seen ? (e.result === 'win' ? 0 : 1) : 2];
    });
    compute.tap('tea.gossip', (r, { w }) => {
      const e = echoNow(w);
      if (e?.rumor) r.value = MATCH_RUMOR[e.rumor];
    });

    commands.register('match.join', ({ draft, input, fact }) => {
      const w = draft.world;
      const t = atHost(w, input.at);
      if (t.phase !== 'open') refuse('今天已经比过了');
      if (w.clock.minute >= MATCH.until) refuse('过了申时，钓客要收竿了');
      const who = people.who(w);
      const stake = input.stake === true ? MATCH.stake : 0;
      if (stake) store.pay(w, stake, `押给${HOSTS[t.host].name}`);
      t.stake = stake;
      t.phase = 'fishing';
      t.his = hisCatch(rand(w), pairs => core.weighted(w, pairs), t.host);
      t.seen = onlookers(w);
      w.match.hosts[t.host].met = Math.min(999, w.match.hosts[t.host].met + 1);
      const line = '“' + (stake ? W.join : W.spar) + '”';
      const by = t.seen.find(id => MATCH_BEFORE[id]);
      const close = by && tierOf(w.bonds.known[by] || 0) >= 2 ? 1 : 0;
      const notes = by ? [PEOPLE[by].name + '：“' + MATCH_BEFORE[by][close] + '”'] : [];
      fact('match.joined', { who, host: t.host, stake, line, notes });
    });

    commands.register('match.measure', ({ draft, input, fact }) => {
      const w = draft.world;
      const t = atHost(w, input.at);
      if (t.phase !== 'ready') refuse(t.phase === 'fishing' ? '三竿还没钓完' : '已经量过了');
      if (t.host === 'qian') cheat(rand(w), t);
      const show = showLines(pick(w), t);
      // 他亮鱼的话：要验鱼时留在气泡里，分了输赢就先冒出来、气泡里是他认不认
      const said = { say: show.his, notes: [show.mine + show.total] };
      const his = scoreOf(t.his, t.topic);
      const mine = scoreOf(t.mine, t.topic);
      // 钱胖子压过你：先别认，可以当众验他的鱼
      if (his > mine && t.host === 'qian') {
        t.phase = 'suspect';
        if (onlookers(w).includes('zhou')) said.notes.push(W.zhouCough);
        const who = people.who(w);
        return void fact('match.measured', {
          who,
          host: t.host,
          result: null,
          line: said.say,
          notes: said.notes,
        });
      }
      const result = his > mine ? 'lose' : his < mine ? 'win' : 'tie';
      said.notes.unshift(said.say);
      settle(w, t, result, fact, { say: '', notes: said.notes }, false, 'match.measured');
    });

    commands.register('match.inspect', ({ draft, input, fact }) => {
      const w = draft.world;
      const t = atHost(w, input.at);
      if (t.phase !== 'suspect') refuse('没什么好验的');
      if (input.look !== true) return void settle(w, t, 'lose', fact, { say: '', notes: [] });
      const who = people.who(w);
      if (t.cheat === null) {
        body.mood(w, who, -1, '冤枉了钓客');
        return void settle(w, t, 'lose', fact, { say: '', notes: [W.wrong] });
      }
      const { chance } = inspectOdds(w, who);
      const roll = core.random(w) * 100;
      if (roll < chance) {
        const notes = ['你：“' + W.caught[0] + '”', W.caught[2]];
        return void settle(w, t, 'win', fact, { say: W.caught[1], notes }, true);
      }
      const fish = t.his[t.cheat];
      const notes = [fill(W.missed[0], { name: FISH[fish.fish].name })];
      if (roll < chance + MATCH.near) notes.push(core.stable(W.near, w.clock.day));
      settle(w, t, 'lose', fact, { say: t.stake ? W.missed[1] : W.missedSpar, notes }, true);
    });

    commands.register('match.after', ({ draft, input, fact }) => {
      const w = draft.world;
      const t = atHost(w, input.at);
      if (t.phase !== 'after') refuse('这一局已经了了');
      const who = people.who(w);
      const choice = input.choice;
      if (!['again', 'tea', 'leave'].includes(choice)) refuse('没有这个选项');
      if (choice === 'tea') {
        store.pay(w, MATCH.tea, `请${HOSTS[t.host].name}喝碗茶`);
        body.mood(w, who, 2, '输了请钓客喝茶');
        modifiers.add(w, who, 'fish_steady', null, `听${HOSTS[t.host].name}讲调漂`);
        // 输了还请钱胖子喝茶，多心的人就要说闲话了
        if (t.host === 'qian' && w.match.echo) w.match.echo.rumor = 'collude';
      }
      t.phase = 'over';
      const line = choice === 'leave' ? W.leave : '“' + W[choice] + '”';
      fact('match.after', { who, choice, line, notes: [] });
    });

    queries.define('match', w => {
      const t = present(w);
      if (!t) return null;
      const host = HOSTS[t.host];
      return {
        id: 'match.' + t.host,
        host: t.host,
        name: host.name,
        title: host.title,
        look: host.look,
        ...MATCH.spot,
        phase: t.phase,
        topic: TOPICS[t.topic].name,
        left: MATCH.casts - t.mine.length,
        stake: t.stake,
        done: t.phase === 'over',
        greeting: greeting(pick(w), t, w.match.hosts[t.host]),
      };
    });

    queries.define('match.options', w => {
      const t = present(w);
      const coins = queries.run('home', w).coins;
      return t ? optionsOf(t, coins, () => inspectOdds(w, people.who(w))) : [];
    });
  },
};
