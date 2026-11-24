// 说哪句话：按此刻的情形从 content 的几张表里挑。同一天、同一件事挑出来的总是同一句，
// 不消耗随机数（多问一遍不会换一句，存档回放也一样）。这里只挑字，熟悉、心情这些数归 social 插件改。
import { LIFE, NEWS, SKY, PLAN, HEARD, DEEDS, NIGHT_TALK } from '../content/talk-lines.js';
import { GESTURE, SKY_SKILL } from '../content/talk.js';
import { FAVORITE_HINT } from '../content/gift-lines.js';
import { WEATHER_TYPES, WEATHER_FREQ } from '../content/weather.js';
import { ENCOUNTERS, INTRO, TEA_DATE, ON_THE_WAY, SNOW } from '../content/encounters.js';
const WORKPLACE = {
  shi: 'field',
  gui: 'yard',
  aman: 'field',
  qiao: 'market',
  zhou: 'river',
  yun: 'hill',
};

/** 固定挑一句：key 相同挑出来的就相同。 */
export const stable = (list, key) => list[Math.abs(key | 0) % list.length];

/** 一个字符串的小指纹，用来给不同的人、不同的事错开挑选。 */
export const mark = text => [...text].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7);

/** 话是引号开头的，前面加上今天这种心情下的一个动作（GESTURE）。 */
export const withGesture = (id, band, text, key) =>
  text.startsWith('“') ? stable(GESTURE[id][band], key) + text : text;

/** 聊日常：LIFE 里从上往下，头一个条件成立的那组挑一句；夜里有隔墙话的先说隔墙话。 */
export function lifeLine(id, c, key, first = false) {
  const speak = words => '“' + (first ? INTRO[id] : '') + words + '”';
  if (c.walking) return speak(ON_THE_WAY[id]);
  if (c.night && NIGHT_TALK[id]) {
    const night = stable(NIGHT_TALK[id], key);
    return first ? speak(night.slice(1, -1)) : night;
  }
  if (c.waiting) return '“' + TEA_DATE[id] + '”';
  const scene = ENCOUNTERS[id][c.place];
  if (scene) {
    let local = scene[c.band];
    if (c.wet && c.wx !== 'snow' && scene.rain) local = scene.rain;
    else if (c.wx === 'snow') local = SNOW[id];
    if (!local && (first || Math.abs(key) % 3 === 1)) {
      if (c.slot === 0) local = scene.early;
      if (c.slot === 3) local = scene.late;
    }
    // 本行当里偶尔聊农时、身体、交情等旧话；到了别处优先说眼前的事。
    if (local || first || c.place !== WORKPLACE[id] || Math.abs(key) % 3 !== 0)
      return speak(local || stable(scene.lines, key));
  }
  for (const [when, lines] of LIFE[id]) if (when(c)) return stable(lines, key);
  return '';
}

/** 熟一点以后会说起最爱吃什么：熟悉到第一层以上、还没说过，隔天说一回。 */
export const favoriteDue = (id, c, day, told) => c.rel >= 1 && !told && (day + id.length) % 2 === 0;
export const favoriteLine = id => FAVORITE_HINT[id];

/** 问近况：听说了你做的好事就先说这个，否则说说村里的小事。 */
export function newsLine(id, c, key, deed = null) {
  if (deed && DEEDS[deed]) return HEARD[id](DEEDS[deed]);
  const pool = NEWS[id].map(x => (typeof x === 'function' ? x(c) : x)).filter(Boolean);
  return stable(pool, key);
}

/**
 * 问天色：他们猜明天的天气，按各人的准头（SKY_SKILL）猜中；猜错就说一种这个季节也会有的别的天气。
 * 不用随机数：同一天同一个人猜的总是同一种。
 */
export function skyLine(id, day, tomorrow, season) {
  const roll = (Math.abs(mark(`${id}:${day}`)) % 1000) / 1000;
  let code = tomorrow;
  if (roll >= SKY_SKILL[id]) {
    const others = Object.keys(WEATHER_TYPES).filter(
      k => k !== tomorrow && WEATHER_FREQ[k][season] > 0,
    );
    code = stable(others, day + id.length);
  }
  return SKY[id](WEATHER_TYPES[code].name, code);
}

/** 问今天的安排：t 是“清晨在……，午前去……”那一串。 */
export const planLine = (id, t, c) => PLAN[id](t, c);
