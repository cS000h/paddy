// 集日比鱼的一局：存档长什么样、三竿怎么算、钓客钓上什么、钱胖子怎么掏暗篓、量尺时说什么、
// 钓客跟前有哪几个选项。纯函数：随机数（rand）、固定挑句（pick）由规则插件 plugins/fair-match.js 传进来。
import { is, check } from '../kernel/schema.js';
import { FISH, FISH_SPOTS } from '../content/fishing.js';
import { ON_MAP } from '../content/people.js';
import { fill } from '../content/text.js';
import { MATCH, HOSTS, TOPICS, MATCH_WORDS as W, MATCH_RUMOR } from '../content/fair-match.js';
import { lenText } from './fishing-fight.js';

const PHASES = ['open', 'fishing', 'ready', 'suspect', 'after', 'over'];
const RESULTS = ['win', 'lose', 'tie'];
export const NTH = ['一', '二', '三'];

const host0 = () => ({ met: 0, last: null, caught: false });
export const matchInitial = () => ({
  fairs: 0,
  wins: 0,
  hosts: { he: host0(), qian: host0() },
  today: null,
  echo: null,
});

/** 集日清早钓客到渡口时的一局。 */
export const newBout = (day, host, topic) => ({
  day,
  host,
  topic,
  phase: 'open',
  stake: 0,
  mine: [],
  his: [],
  pending: false,
  cheat: null,
  seen: [],
  result: null,
});

const catchOk = c =>
  is.obj(c) && (c.fish === null || Object.hasOwn(FISH, c.fish)) && is.int(c.len, 0, 99);
const idsOk = a => is.arr(a, ON_MAP.length) && a.every(id => ON_MAP.includes(id));
const todayOk = t =>
  t === null ||
  (is.obj(t) &&
    is.int(t.day, 1) &&
    Object.hasOwn(HOSTS, t.host) &&
    Object.hasOwn(TOPICS, t.topic) &&
    PHASES.includes(t.phase) &&
    (t.stake === 0 || t.stake === MATCH.stake) &&
    is.arr(t.mine, MATCH.casts) &&
    t.mine.every(catchOk) &&
    is.arr(t.his, MATCH.casts) &&
    t.his.every(catchOk) &&
    typeof t.pending === 'boolean' &&
    (t.cheat === null || is.int(t.cheat, 0, MATCH.casts - 1)) &&
    idsOk(t.seen) &&
    (t.result === null || RESULTS.includes(t.result)));
const echoOk = e =>
  e === null ||
  (is.obj(e) &&
    is.int(e.day, 1) &&
    Object.hasOwn(HOSTS, e.host) &&
    RESULTS.includes(e.result) &&
    idsOk(e.seen) &&
    (e.rumor === null || Object.hasOwn(MATCH_RUMOR, e.rumor)) &&
    [null, 'caught', 'wronged', 'tea'].includes(e.how));

export const matchValid = m =>
  check([
    [is.obj(m), 'obj'],
    [is.int(m.fairs, 0) && is.int(m.wins, 0), 'counts'],
    [
      is.keyedBy(m.hosts, Object.keys(HOSTS)) &&
        Object.values(m.hosts).every(
          h =>
            is.int(h.met, 0) &&
            (h.last === null || RESULTS.includes(h.last)) &&
            typeof h.caught === 'boolean',
        ),
      'hosts',
    ],
    [todayOk(m.today), 'today'],
    [echoOk(m.echo), 'echo'],
  ]);

/** 三竿怎么算：单尾压场看最长那一条，三竿合量看加起来。 */
export const scoreOf = (list, topic) =>
  topic === 'single' ? Math.max(0, ...list.map(c => c.len)) : list.reduce((s, c) => s + c.len, 0);
const bestOf = list => list.reduce((a, c) => (c.len > a.len ? c : a), { fish: null, len: 0 });

/** 钓客自己的三竿：何老三手稳，钱胖子空竿多、钓上的也小。 */
export function hisCatch(rand, weighted, host) {
  const pool = Object.entries(FISH_SPOTS.river.fish).filter(([f]) => FISH[f]);
  return Array.from({ length: MATCH.casts }, () => {
    if (rand() < MATCH.miss[host]) return { fish: null, len: 0 };
    const fish = weighted(pool);
    const [lo, hi] = FISH[fish].len;
    const r = rand();
    const len = lo + Math.floor(r ** MATCH.skew[host] * (hi - lo + 1));
    return { fish, len: Math.min(hi, len) };
  });
}

/** 钱胖子眼看要输：把最短的一竿换成暗篓里城里买的鱼，刚好压你一点。压不过就算了。 */
export function cheat(rand, t) {
  const mine = scoreOf(t.mine, t.topic);
  if (scoreOf(t.his, t.topic) > mine || rand() >= MATCH.cheat) return;
  const i = t.his.reduce((k, c, j) => (c.len < t.his[k].len ? j : k), 0);
  const rest = t.topic === 'single' ? 0 : scoreOf(t.his, t.topic) - t.his[i].len;
  const need = mine - rest + 1 + Math.floor(rand() * 2);
  const fish = ['carp', 'grass'].find(f => FISH[f].len[1] >= need);
  if (!fish) return;
  t.his[i] = { fish, len: Math.max(FISH[fish].len[0], need) };
  t.cheat = i;
}

/** 量尺时两边亮鱼的话：他的（气泡里）、你的、两边比下来多少。 */
export function showLines(pick, t) {
  const say = (list, c, n) => fill(pick(list, n), { name: FISH[c.fish].name, len: lenText(c.len) });
  const his = bestOf(t.his);
  const mine = bestOf(t.mine);
  const score = list => (scoreOf(list, t.topic) ? lenText(scoreOf(list, t.topic)) : '空着');
  return {
    his: his.fish ? '“' + say(W.his, his, 0) + '”' : W.hisEmpty,
    mine: mine.fish ? '你：“' + say(W.mine, mine, 1) + '”' : W.mineEmpty,
    total: fill(t.topic === 'sum' ? W.sum : W.single, { his: score(t.his), mine: score(t.mine) }),
  };
}

/** 钓客的招呼：头一回约你、回头客、比到哪一步。 */
export function greeting(pick, t, h) {
  if (t.phase === 'open') {
    const back = W.back[t.host];
    if (h.met && t.host === 'qian' && h.caught) return back.caught;
    if (h.met && h.last === 'win') return back.won;
    if (h.met && h.last === 'lose') return back.lost;
    return pick(W.invite[t.host], 0);
  }
  if (t.phase === 'fishing') return fill(W.waiting, { n: NTH[MATCH.casts - t.mine.length - 1] });
  if (t.phase === 'ready') return W.ready;
  if (t.phase === 'suspect') return W.suspect;
  if (t.phase === 'after') return (t.stake ? W.lose : W.loseSpar)[t.host];
  return W.over[t.host];
}

const row = (key, label, command, input, result, more = {}) => ({
  key,
  label,
  command,
  input,
  result,
  ...more,
});
const short = (coins, n) => (coins < n ? `身上不够 ${n} 文` : '');

/** 钓客跟前的选项（给底部对话条，格式同 sim/plugins/interactions.js）。odds 是验鱼的把握。 */
export function optionsOf(t, coins, odds) {
  const topic = TOPICS[t.topic];
  const rules = {
    key: 'rules',
    label: '问问规矩',
    line: fill(W.rules, { topic: topic.name, desc: topic.desc }),
  };
  if (t.phase === 'open')
    return [
      rules,
      row('join', `押 ${MATCH.stake} 文比三竿`, 'match.join', { stake: true }, 'match.joined', {
        confirm: `押上 ${MATCH.stake} 文`,
        reason: short(coins, MATCH.stake),
      }),
      row('spar', '不押钱，只切磋', 'match.join', { stake: false }, 'match.joined'),
      { key: 'decline', label: '不比', line: W.decline },
    ];
  if (t.phase === 'fishing') return [rules];
  if (t.phase === 'ready')
    return [row('measure', '摊开木尺量量', 'match.measure', {}, 'match.measured')];
  if (t.phase === 'suspect') {
    const { chance, parts } = odds();
    const why = parts.map(p => p.name + '+' + p.delta).join('、') || '全凭眼力';
    const look = { look: true };
    return [
      row('inspect', `验他的鱼 · 把握${chance}%`, 'match.inspect', look, 'match.settled', {
        confirm: `当众验鱼（${why}）`,
      }),
      row('accept', '认了', 'match.inspect', { look: false }, 'match.settled'),
    ];
  }
  if (t.phase === 'after')
    return [
      row('again', '不服，下个集日再比', 'match.after', { choice: 'again' }, 'match.after'),
      row('tea', `请他喝碗茶（${MATCH.tea} 文）`, 'match.after', { choice: 'tea' }, 'match.after', {
        reason: short(coins, MATCH.tea),
      }),
      row('leave', '拂袖走人', 'match.after', { choice: 'leave' }, 'match.after'),
    ];
  return [];
}
