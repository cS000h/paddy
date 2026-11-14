// 采集先用到每日天气；日内变化与预报在M5接上。
export const WEATHER_TYPES = {
  sunny: { name: '晴', temp: 2, water: -4, tags: ['clear', 'bright'] },
  cloudy: { name: '多云', temp: 0, water: -2, tags: [] },
  overcast: { name: '阴', temp: -1, water: -1, tags: ['dim'] },
  drizzle: { name: '小雨', temp: -3, water: 6, tags: ['wet', 'dim'] },
  rain: { name: '大雨', temp: -4, water: 10, tags: ['wet', 'heavy', 'dim'] },
  storm: { name: '雷阵雨', temp: -3, water: 12, tags: ['wet', 'heavy', 'storm', 'dim'] },
  fog: { name: '雾', temp: -2, water: 1, tags: ['fog', 'dim'] },
  snow: { name: '雪', temp: -3, water: 3, tags: ['wet', 'snow', 'cold'] },
};
const CODES = Object.keys(WEATHER_TYPES);
// Relative frequency per season [春, 夏, 秋, 冬]. Tweak here; nothing else needs to change.
export const WEATHER_FREQ = {
  sunny: [26, 34, 40, 30],
  cloudy: [22, 18, 24, 18],
  overcast: [14, 8, 12, 18],
  drizzle: [20, 8, 10, 8],
  rain: [8, 12, 5, 2],
  storm: [2, 16, 3, 0],
  fog: [8, 4, 6, 10],
  snow: [0, 0, 0, 14],
};
export const SEASON_BASE = [16, 28, 19, 3]; // a typical mid-day-ish temperature, °C, game scale
export const SLOT_TEMP = [-4, 1, 3, -1]; // 清晨 午前 午后 傍晚
// 日内天气变化的判定表，顺序沿用0.12。
export const SHIFTS = [
  {
    from: ['fog'],
    slot: 1,
    chance: 0.7,
    to: ['sunny', 'cloudy'],
    text: '雾气退到山脚，四下一下子亮了。',
  },
  {
    from: ['sunny', 'cloudy'],
    slot: 2,
    seasons: [1],
    chance: 0.3,
    to: ['storm'],
    text: '天边压过来一片黑云，雷阵雨说来就来。',
  },
  { from: ['storm'], slot: 3, chance: 0.75, to: ['cloudy'], text: '雨脚收住，屋檐还在滴水。' },
  { from: ['drizzle'], chance: 0.2, to: ['overcast'], text: '细雨停了，地面还润着。' },
  { from: ['rain'], chance: 0.18, to: ['drizzle'], text: '大雨转成了细细的雨丝。' },
  {
    from: ['overcast'],
    seasons: [0, 2],
    chance: 0.15,
    to: ['drizzle'],
    text: '阴了半天，终于飘下细雨。',
  },
  {
    from: ['overcast'],
    seasons: [3],
    chance: 0.15,
    to: ['snow'],
    text: '灰白的天里落下零星的雪。',
  },
  {
    from: ['sunny'],
    seasons: [0, 2, 3],
    chance: 0.08,
    to: ['cloudy'],
    text: '几朵厚云飘过来，日头时隐时现。',
  },
];
export const WEATHER_RULES = { persist: 0.32, forecast: 0.5, lookBonus: 0.2, slotMinutes: 180 };
/** @type {[number,string,string][]} */
export const FEEL_BANDS = [
  [4, 'freezing', '冻得慌'],
  [10, 'cold', '冷'],
  [15, 'cool', '有些凉'],
  [24, 'mild', '适宜'],
  [28, 'warm', '暖和'],
  [32, 'hot', '热'],
  [999, 'scorching', '热得发晕'],
];
