// 钓鱼的几样纯算法：长短怎么说、遛鱼一步一步怎么算、存档里的钓鱼记录长什么样。
// 规则插件（plugins/fishing.js）和测试共用；画面不直接用它，问查询 fish.fight。
import { is } from '../kernel/schema.js';
import { FISH, FISH_SPOTS, FIGHT } from '../content/fishing.js';

export { noise } from './noise.js';

const DIGITS = '〇一二三四五六七八九';

/** 长短写成说的话：七寸、一尺、一尺二、两尺五。 */
export function lenText(len) {
  const chi = Math.floor(len / 10),
    cun = len % 10;
  if (!chi) return DIGITS[cun] + '寸';
  return (chi === 2 ? '两' : DIGITS[chi]) + '尺' + (cun ? DIGITS[cun] : '');
}

/** 个头：小鱼、中等、大鱼（画面上竿弯多少、水花多大照它来）。 */
export const sizeOf = len => (len < FIGHT.small ? 'small' : len > FIGHT.big ? 'big' : 'mid');

/** 遛鱼时按下、松开的记录是不是干净：[[毫秒, 0 或 1], ...]，时间不往回走。 */
export const wellLog = log =>
  Array.isArray(log) &&
  log.length <= 600 &&
  log.every(
    (e, k) =>
      Array.isArray(e) &&
      e.length === 2 &&
      is.int(e[0], 0, FIGHT.max) &&
      (e[1] === 0 || e[1] === 1) &&
      (k === 0 || e[0] >= log[k - 1][0]),
  );

/**
 * 遛鱼：照按下、松开的记录，每 50 毫秒算一步，算到第 until 毫秒，或者分出了结果。
 * bout 里要有 len（寸）和 runs（[[开始, 多久], ...] 鱼往外冲的几回）。纯函数，画面和结算共用。
 */
export function simulate(bout, log, until) {
  const { step, max, slack } = FIGHT;
  const dt = step / 1000;
  const reel = FIGHT.reel / (1 + bout.len / 8);
  const strain = FIGHT.strain + bout.len * FIGHT.strainLen;
  const pull = FIGHT.pull + bout.len / 2;
  const runningAt = at => bout.runs.some(([from, long]) => at >= from && at < from + long);
  const end = Math.min(until, max);
  let distance = 100,
    tension = 0,
    peak = 0,
    holding = false,
    free = 0,
    i = 0,
    t = 0,
    done = null;
  while (t < end && !done) {
    while (i < log.length && log[i][0] <= t) holding = log[i++][1] === 1;
    const running = runningAt(t);
    if (holding) {
      free = 0;
      if (running) tension += strain * dt;
      else {
        tension += FIGHT.hold * dt;
        distance -= reel * dt;
      }
    } else {
      free += step;
      tension = Math.max(0, tension - FIGHT.ease * dt);
      if (running) distance = Math.min(100, distance + pull * dt);
    }
    peak = Math.max(peak, tension);
    t += step;
    if (distance <= 0) done = 'landed';
    else if (tension >= 100) done = 'snap';
    else if (free >= slack || t >= max) done = 'slack';
  }
  while (i < log.length && log[i][0] <= t) holding = log[i++][1] === 1;
  return {
    t,
    distance: Math.max(0, Math.round(distance)),
    tension: Math.min(100, Math.round(tension)),
    running: !done && runningAt(t),
    holding,
    done,
    peak: Math.round(peak),
  };
}

const boutOk = b =>
  b === null ||
  (is.obj(b) &&
    Object.hasOwn(FISH_SPOTS, b.spot) &&
    Object.hasOwn(FISH, b.fish) &&
    is.int(b.len, 1, 99) &&
    typeof b.bait === 'boolean' &&
    (b.phase === 'float' || b.phase === 'fight') &&
    is.obj(b.float) &&
    is.arr(b.float.events, 12) &&
    b.float.events.every(
      e =>
        is.obj(e) &&
        is.int(e.at, 0, 60000) &&
        is.int(e.dur, 1, 5000) &&
        ['nod', 'bite'].includes(e.kind),
    ) &&
    is.int(b.float.end, 0, 60000) &&
    is.arr(b.runs, 20) &&
    b.runs.every(
      r => Array.isArray(r) && r.length === 2 && is.int(r[0], 0, 60000) && is.int(r[1], 1, 5000),
    ) &&
    is.int(b.day, 1));

export const personOk = p =>
  is.obj(p) &&
  boutOk(p.bout) &&
  is.obj(p.records) &&
  Object.entries(p.records).every(
    ([k, r]) => Object.hasOwn(FISH, k) && is.obj(r) && is.int(r.n, 1, 1e6) && is.int(r.best, 1, 99),
  ) &&
  is.obj(p.spots) &&
  Object.entries(p.spots).every(
    ([k, s]) => Object.hasOwn(FISH_SPOTS, k) && is.obj(s) && is.int(s.n, 0, 99) && is.int(s.at, 0),
  );
