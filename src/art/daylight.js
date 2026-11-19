// 每个时刻的室外天色、檐下环境色和太阳高度。在相邻时刻之间连续取色。
const HOURS = [
  [0, [136, 151, 191], [124, 133, 156], 0],
  [330, [150, 165, 205], [139, 147, 166], 0],
  [390, [255, 232, 214], [203, 188, 172], 0.34],
  [480, [255, 248, 236], [226, 213, 192], 0.76],
  [720, [255, 255, 255], [234, 228, 213], 1],
  [990, [255, 245, 225], [228, 208, 185], 0.7],
  [1110, [252, 209, 176], [204, 174, 157], 0.19],
  [1200, [181, 180, 207], [150, 148, 167], 0],
  [1320, [146, 159, 197], [128, 136, 158], 0],
  [1440, [136, 151, 191], [124, 133, 156], 0],
];
// 天气分别调节环境色、直射光和散射光。雪地反光，仍比阴雨明亮。
const WEATHER = {
  sunny: [[1, 1, 1], 1, 0.73],
  cloudy: [[0.93, 0.95, 0.98], 0.43, 0.87],
  overcast: [[0.83, 0.87, 0.92], 0.05, 0.72],
  drizzle: [[0.8, 0.85, 0.91], 0.015, 0.62],
  rain: [[0.73, 0.79, 0.86], 0, 0.5],
  storm: [[0.64, 0.69, 0.8], 0, 0.36],
  fog: [[0.88, 0.91, 0.94], 0.015, 0.93],
  snow: [[0.9, 0.94, 1], 0.07, 1],
};
const lerp = (a, b, t) => a + (b - a) * t;
export function daylight(minute, weather = 'sunny', indoor = false) {
  const m = Math.max(0, Math.min(1440, minute));
  let i = 0;
  while (i < HOURS.length - 2 && m > HOURS[i + 1][0]) i++;
  const a = HOURS[i],
    b = HOURS[i + 1],
    t = (m - a[0]) / (b[0] - a[0]);
  const [filter, sun, sky] = WEATHER[weather] || WEATHER.cloudy;
  const height = lerp(a[3], b[3], t);
  const base = indoor ? 2 : 1;
  const amount = (0.58 + 0.42 * height) * (indoor ? 0.84 : 1);
  const rgb = a[base].map((v, k) =>
    Math.round(lerp(v, b[base][k], t) * lerp(1, filter[k], amount)),
  );
  return {
    tint: '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join(''),
    direct: height * sun,
    diffuse: (0.045 + 0.955 * height) * sky,
    slope: Math.max(-0.72, Math.min(0.72, (720 - m) / 470)),
    height,
    lamp: Math.max(0, Math.min(1, (0.43 - height * sky) / 0.36)),
    embers: 0.14 + 0.65 * (1 - height * sky),
  };
}
