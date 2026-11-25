// 下竿时把这一竿定好：钓上来的是哪种鱼（偶尔不是鱼）、多长、浮漂怎么动、遛的时候冲几回。
// 纯函数：随机数、鱼口、本事加宽的提竿工夫由规则插件（plugins/fishing.js）传进来；测试也拿它算份数。
import {
  FISH,
  FISH_SPOTS,
  FISH_THINGS,
  FISH_JUNK,
  FISHING,
  FLOAT,
  FIGHT,
} from '../content/fishing.js';

/** 此刻这处钓点各种鱼有几份：季节、早晚、天气。now = {season, dusk, weather, wet} */
export const fishTable = (spot, now) =>
  /** @type {[string, number][]} */ (
    Object.entries(FISH_SPOTS[spot].fish)
      .map(([k, n]) => {
        const f = FISH[k];
        const v =
          n * f.season[now.season] * (now.dusk ? f.dusk : 1) * (f.weather[now.weather] ?? 1);
        return /** @type {[string, number]} */ ([k, v]);
      })
      .filter(([, n]) => n > 0)
  );

/** 咬钩时偶尔拉上来的东西各有几份；skip 是这回不出的物品（身上已经揣着的失物）。 */
export const thingTable = (spot, now, skip = []) =>
  /** @type {[string, number][]} */ (
    Object.values(FISH_THINGS)
      .filter(t => !skip.includes(t.item))
      .map(t => {
        const v = (t.spots[spot] || 0) * t.season[now.season] * (now.dusk ? t.dusk : 1);
        return /** @type {[string, number]} */ ([t.id, v * (now.wet ? t.wet : 1)]);
      })
      .filter(([, n]) => n > 0)
  );

/** 提竿晚了钩上来的杂物各有几份。 */
export const junkTable = (spot, now) =>
  /** @type {[typeof FISH_JUNK[number], number][]} */ (
    FISH_JUNK.filter(j => (!j.season || j.season.includes(now.season)) && (!j.wet || now.wet))
      .map(j => [j, j.spots[spot] || 0])
      .filter(([, n]) => n > 0)
  );

/**
 * 定一竿。
 *   rand()            [0, 1) 的随机数（存档里的那一串）
 *   pick(table)       按份数挑一样
 *   windowOf(id, ms)  本事加宽之后，咬钩留给你提竿的工夫
 *   rate              这一竿有东西来咬的把握（天气、早晚、饵、惊没惊着）
 */
export function makeBout({ rand, pick, windowOf }, spot, now, { bait, rate, skip, day }) {
  const between = r => Math.round(r[0] + (r[1] - r[0]) * rand());
  const kind = pick(fishTable(spot, now));
  const f = FISH[kind];
  const lean = bait ? FISHING.baitLen : FISHING.plainLen;
  let len = Math.round(f.len[0] + (f.len[1] - f.len[0]) * rand() ** lean);
  const bites = rand() < rate;
  // 有东西来咬时，偶尔是河虾、毛蟹、瓷片……：照钓鱼那样看漂、遛，只是轻重照它自己的
  const things = bites ? thingTable(spot, now, skip) : [];
  const thing = things.length && rand() < FISHING.things ? FISH_THINGS[pick(things)] : null;
  if (thing) len = thing.heft;
  const wait = bait ? FISHING.baitWait : 1;
  const nods = thing ? between(FLOAT.thingNods) : between(f.nods);
  const events = [];
  let at = Math.round(between(FLOAT.first) * wait * (thing ? 1 : f.first));
  for (let k = 0; k < nods; k++) {
    const dur = between(FLOAT.nod);
    events.push({ at, kind: 'nod', dur });
    const last = k === nods - 1;
    at +=
      dur + Math.round(between(last ? FLOAT.bite : FLOAT.gap) * wait * (last || thing ? 1 : f.gap));
  }
  let end;
  if (bites) {
    const window = windowOf(thing ? thing.id : kind, thing ? FLOAT.thing : f.window);
    const style = thing ? 'sink' : f.bite;
    events.push({ at, kind: 'bite', dur: window, drag: style === 'drag', lift: style === 'lift' });
    end = at + window;
  } else end = at + between(FLOAT.idle);
  const runs = [];
  let from = between(FIGHT.firstRun);
  const long = Math.min(FIGHT.run[2], FIGHT.run[0] + len * FIGHT.run[1]);
  const count = thing ? thing.runs : f.runs + Math.floor(len / FIGHT.perRun);
  for (let k = 0; k < count; k++) {
    runs.push([from, long]);
    from += long + between(FIGHT.gap);
  }
  return {
    spot,
    fish: thing ? thing.id : kind,
    len,
    bait: !!bait,
    phase: 'float',
    float: { events, end },
    runs,
    day,
  };
}
