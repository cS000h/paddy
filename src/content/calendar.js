// 时间参数。单日长度、季节天数都还没有定案，所以规则和外壳都只从这里读，不各自写死。
export const CALENDAR = Object.freeze({
  dayStart: 6 * 60, // 一天从 06:00 开始
  dayEnd: 24 * 60, // 到 24:00 时间停住，等玩家回屋歇息（不催促）
  lateSleep: 22 * 60, // 这之后才睡，第二天体力回不满
  seasonDays: 14,
  seasons: ['春', '夏', '秋', '冬'],
  realSecondsPerGameMinute: 0.7, // 外壳用：现实 0.7 秒 = 游戏 1 分钟
  tickMinutes: 10, // 外壳每凑满 10 分钟，给规则发一条“时间前进”
  morningEnd: 9 * 60, // 这之前算清早：早起的好处、清早的鱼口
  dusk: 17 * 60, // 这之后算傍晚：路边翻找认清早、傍晚、夜里
  dark: 19 * 60, // 天黑：夜里才捉得到菜虫、看得见星星，鱼不钓了
  fairEvery: 5, // 每五天一个集日（第 5、10、15……日）
  legMinutes: 10, // 照着全村地图走过去时，每经过一块路牌（一段路）花的时辰
});

/** 这一天是不是集日：杂货铺多进货，茶摊有肉摊，云姑去集上摆茶叶摊。 */
export const isFairDay = day => day % CALENDAR.fairEvery === 0;

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

// 游戏一季十四日，按一季的进度排六个节气。
const TERMS = [
  ['立春', '雨水', '惊蛰', '春分', '清明', '谷雨'],
  ['立夏', '小满', '芒种', '夏至', '小暑', '大暑'],
  ['立秋', '处暑', '白露', '秋分', '寒露', '霜降'],
  ['立冬', '小雪', '大雪', '冬至', '小寒', '大寒'],
];
export const termOf = clock =>
  TERMS[clock.season][Math.floor(((clock.dayOfSeason - 1) * 6) / CALENDAR.seasonDays)];
