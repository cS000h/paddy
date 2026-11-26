// 过客（sim/plugins/passers.js）存档里的样子和几样不动存档的小工具：谁哪天来、站在哪儿、开口说什么。
import { is, check } from '../kernel/schema.js';
import {
  PASSERS,
  PASSER_IDS,
  PASSER_TEXT,
  PASSER_RULES as R,
  PASSER_SPOTS,
} from '../content/passers.js';
import { fill } from '../content/text.js';
import { CROPS, ITEMS, plainOf } from '../content/items.js';
import { BASKET_GOODS } from '../content/pantry.js';
import { noise } from './noise.js';

const ENDS = ['ok', 'bad', 'mild', 'none'];
const RUMORS = ['good', 'luck', 'bad'];

export const passersInitial = () => ({ today: [], met: {}, echo: [] });

const words = list => Array.isArray(list) && list.length <= 12 && list.every(s => is.str(s, 40));
const spotOk = e => Object.hasOwn(PASSER_SPOTS, e.map) && is.int(e.x, 0) && is.int(e.y, 0);
const entryOk = e =>
  is.obj(e) &&
  PASSER_IDS.includes(e.id) &&
  is.int(e.day, 0) &&
  is.int(e.step, 0, 1) &&
  is.int(e.visit, -1, 1) &&
  words(e.picked) &&
  words(e.flags) &&
  words(e.seen) &&
  (e.end === null || ENDS.includes(e.end)) &&
  is.str(e.line) &&
  spotOk(e);
const metOk = m => is.obj(m) && is.int(m.n, 0) && is.int(m.last, -1, 2) && is.int(m.day, 0);
const echoOk = e =>
  is.obj(e) &&
  PASSER_IDS.includes(e.id) &&
  is.int(e.day, 0) &&
  ['ok', 'bad', 'mild'].includes(e.end) &&
  words(e.seen) &&
  (e.rumor === null || RUMORS.includes(e.rumor)) &&
  is.int(e.visit, -1, 1);

export const passersValid = s =>
  check([
    [is.obj(s), 'obj'],
    [Array.isArray(s.today) && s.today.length <= 4 && s.today.every(entryOk), 'today'],
    [
      is.obj(s.met) &&
        Object.entries(s.met).every(([id, m]) => PASSER_IDS.includes(id) && metOk(m)),
      'met',
    ],
    [Array.isArray(s.echo) && s.echo.length <= 8 && s.echo.every(echoOk), 'echo'],
  ]);

/** 今天来哪几位：集日两位，平常日子三成多来一位；同一位隔几天才再来。只看种子和日子。 */
export function arrivals(seed, day, fair, met) {
  const n = fair ? 2 : noise(seed, day, 31) < R.chance ? 1 : 0;
  const free = PASSER_IDS.filter(id => !met[id] || day - met[id].day >= R.rest);
  const out = [];
  for (let i = 0; i < n && free.length; i++)
    out.push(free.splice(Math.floor(noise(seed, day, 32 + i) * free.length), 1)[0]);
  return out;
}

/** 一位过客今天的一局；visit 是断案后受了委屈、第二天上门的那一方（visit 里的第几位）。 */
export function newEntry(id, day, visit, taken) {
  const map = visit >= 0 ? 'yard' : PASSERS[id].map;
  const spots = PASSER_SPOTS[map];
  const spot = spots[Math.min(spots.length - 1, taken.filter(m => m === map).length)];
  return {
    id,
    day,
    step: 0,
    visit,
    picked: [],
    flags: [],
    seen: [],
    end: null,
    line: '',
    map,
    ...spot,
  };
}

export const entryKey = e => 'passer.' + e.id + (e.visit >= 0 ? '.visit' : '');

const quote = s => (s ? '“' + s + '”' : '');

/** 站在那儿的那一位叫什么：上门的那一方可能是另一个人。 */
export const nameOf = e =>
  e.visit >= 0 ? PASSER_TEXT[e.id].visit[e.visit][0] : PASSERS[e.id].name;

/** 走到跟前时他说的话：上门的说气话，说过话的接着上一句，回头客先提上回，不然照开场。 */
export function greeting(e, met, day) {
  const text = PASSER_TEXT[e.id];
  const p = PASSERS[e.id];
  if (e.visit >= 0) return quote(text.visit[e.visit][1]);
  if (e.line) return e.line;
  const back = met && met.last >= 0 && e.step === 0 ? text.back[met.last] : null;
  if (back) return fill(quote(back), p.fill || {});
  const open = text.steps[e.step].open;
  const says = open.filter(o => o[0]);
  const aside = open.find(o => o[1] && !o[0]);
  const say = says[Math.abs(day) % says.length][0];
  return fill(say + (aside ? '　' + aside[1] : ''), p.fill || {});
}

const PRODUCE = new Set(Object.values(CROPS).map(c => c.produce));
const WILD = new Set(BASKET_GOODS);
export const RANK = ['burnt', 'raw', 'under', 'over', 'plain', 'good', 'great'];
/** 要带着的那一样：一个类名或物品 id；成色好的、彩头也算（plainOf 落回本来那样）。 */
const KINDS = {
  crop: id => PRODUCE.has(id),
  wild: id => WILD.has(id),
  fishy: id => id.startsWith('fish') || id === 'lotusPod',
};
export const fits = (kind, id) => (KINDS[kind] ? KINDS[kind](plainOf(id)) : plainOf(id) === kind);
export const grade = id => (ITEMS[id]?.prize ? 3 : ITEMS[id]?.fine ? 2 : 1);
/** 要带的那一样怎么叫（按钮上写「身上没带…」）。 */
export const needName = need =>
  need
    .split('|')
    .filter(a => !a.startsWith('flag:'))
    .map(
      a => ({ dish: '热菜', crop: '自家菜', wild: '野菜', fishy: '鱼或莲蓬' })[a] || ITEMS[a].name,
    )
    .join('或');
