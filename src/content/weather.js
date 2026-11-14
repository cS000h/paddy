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
