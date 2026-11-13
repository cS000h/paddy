// 时间参数。单日长度、季节天数都还没有定案，所以规则和外壳都只从这里读，不各自写死。
export const CALENDAR = Object.freeze({
  dayStart: 6 * 60, // 一天从 06:00 开始
  dayEnd: 24 * 60, // 到 24:00 时间停住，等玩家回屋歇息（不催促）
  lateSleep: 22 * 60, // 这之后才睡，第二天体力回不满
  seasonDays: 28,
  seasons: ['春', '夏', '秋', '冬'],
  realSecondsPerGameMinute: 0.7, // 外壳用：现实 0.7 秒 = 游戏 1 分钟
  tickMinutes: 10, // 外壳每凑满 10 分钟，给规则发一条“时间前进”
});

const HOURS = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
/** @type {[number, string][]} */
const PERIODS = [
  [5 * 60, '夜深'],
  [8 * 60, '清晨'],
  [11 * 60, '上午'],
  [13 * 60, '晌午'],
  [17 * 60, '午后'],
  [19 * 60, '傍晚'],
  [22 * 60, '入夜'],
  [24 * 60 + 1, '夜深'],
];

/** 第几天属于哪一年、哪一季、季内第几日（都从 1 数起，季从 0 数起）。 */
export function dateOf(day) {
  const index = day - 1;
  const perYear = CALENDAR.seasonDays * CALENDAR.seasons.length;
  const season = Math.floor((index % perYear) / CALENDAR.seasonDays);
  return {
    year: Math.floor(index / perYear) + 1,
    season,
    seasonName: CALENDAR.seasons[season],
    dayOfSeason: (index % CALENDAR.seasonDays) + 1,
  };
}

/** 一天里的第几分钟 → 钟点、时辰和口语里的时段。 */
export function timeOf(minute) {
  const m = Math.max(0, Math.min(24 * 60, minute));
  const hh = Math.floor(m / 60) % 24;
  const mm = m % 60;
  return {
    clock: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
    hour: HOURS[Math.floor(((hh + 1) % 24) / 2)] + '时',
    period: PERIODS.find(([until]) => m < until)[1],
  };
}
