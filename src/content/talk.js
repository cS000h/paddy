// 和乡邻说话：几个话题、熟到什么程度、今天心情怎样、说话前的那个动作、看上去的样子。
// 全部照搬《稻间》0.12（village/residents.js、lines.js）。说的内容在 talk-lines.js，送东西的话在 gift-lines.js。

/** 能聊的几件事。life 是见面就聊的，其余三样在对话里点。 */
export const TOPICS = Object.freeze({
  life: '聊聊日常',
  news: '问问近况',
  plan: '问问今天的安排',
  sky: '聊聊天色',
});

/** 熟悉程度的几层：熟悉的数不到上限，就是这一层。 */
// prettier-ignore
const TIERS = [[1, '还不认识'], [3, '点头之交'], [6, '熟络'], [10, '亲近'], [Infinity, '交心']];
/** 第几层（0 还不认识 … 4 交心）。 */
export const tierOf = n => TIERS.findIndex(([max]) => n < max);
export const tierWord = n => TIERS[tierOf(n)][1];

/** 心情 0–100 分四档。 */
// prettier-ignore
const MOOD = [[30, 'low', '心情低落'], [50, 'meh', '有点烦心'], [75, 'ok', '心情平常'], [101, 'good', '心情不错']];
export const moodBand = n => {
  const [, id, word] = MOOD.find(([max]) => n < max);
  return { id, word };
};

/** 各人平常的心情；每天清早往这儿回落三分之一，再看天气。 */
export const BASE_MOOD = Object.freeze({ aman: 70, gui: 66, shi: 55, qiao: 68, zhou: 60, yun: 58 });

/** 天气对各人心情的影响（清早结算）。 */
// prettier-ignore
export const WEATHER_MOOD = Object.freeze({
  aman: { sunny: 6, cloudy: 2, drizzle: -4, rain: -8, storm: -10, snow: 4 },
  gui: { sunny: 3, rain: -3, storm: -4, snow: -3, fog: -1 },
  shi: { drizzle: 5, rain: 2, sunny: -1, storm: -3 },
  qiao: { rain: -5, drizzle: -2, snow: 6, fog: 3, sunny: 2 },
  zhou: { overcast: 5, drizzle: 4, cloudy: 2, sunny: -2, storm: -6, snow: -3 },
  yun: { fog: 5, drizzle: 3, sunny: 2, storm: -4 },
});

/** 他们看天的准头：问“聊聊天色”时，说中明天天气的把握。 */
export const SKY_SKILL = Object.freeze({
  aman: 0.6,
  gui: 0.5,
  shi: 0.85,
  qiao: 0.4,
  zhou: 0.75,
  yun: 0.7,
});

// 说话前的一个动作，按今天的心情挑（good / ok / meh / low）。
// prettier-ignore
export const GESTURE = Object.freeze({
  aman: { good: ['阿满一见你就笑出了声：', '阿满老远就冲你挥手，扯着嗓子：'], ok: ['阿满抹了把额头的汗：', '阿满朝你扬了扬下巴：'], meh: ['阿满挠着后脑勺，叹了口气：', '阿满低低地哼了一声：'], low: ['阿满半天才应了一声：'] },
  gui: { good: ['桂嫂笑得眼睛眯成一条缝，拉着你的袖子：', '桂嫂笑着把你拉近了些：'], ok: ['桂嫂把手在围裙上擦了擦：', '桂嫂上下打量你一眼：'], meh: ['桂嫂揉着腰，皱着眉：', '桂嫂叹口气，揉了揉肩：'], low: ['桂嫂缓了缓才接话：'] },
  shi: { good: ['石伯难得笑了一下，皱纹都舒展开了：', '石伯把烟袋在鞋底磕了磕：'], ok: ['石伯直起腰，看了你一眼：', '石伯点了点头：'], meh: ['石伯皱着眉看天，过了一会儿才说：'], low: ['石伯揉着膝盖，声音闷闷的：'] },
  qiao: { good: ['小乔冲你挤了挤眼睛：', '小乔扬起眉毛，一脸得意：'], ok: ['小乔歪着头打量你：', '小乔笑了一声：'], meh: ['小乔托着下巴，有气无力的：'], low: ['小乔把脸埋在胳膊里，闷声说：'] },
  zhou: { good: ['老周眯起眼睛笑了：', '老周嘴里还哼着半句渔歌，停下来说：'], ok: ['老周慢悠悠地开了口：', '老周笑着向你招了招手：'], meh: ['老周沉默了一会儿才接话：'], low: ['老周低声应了一句：'] },
  yun: { good: ['云姑抿着嘴笑，声音轻轻的：', '云姑把竹篓往身后一藏，脸有点红：'], ok: ['云姑拢了拢袖口：', '云姑小声说：'], meh: ['云姑看着远处的山，轻轻叹了口气：'], low: ['云姑眼圈有点红，别过脸去：'] },
});
