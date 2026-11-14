// 身体的数值：饥、渴、心情怎么变，吃饱喝足有什么好处。数值取自《稻间》0.12（core.js、teahouse.js），
// 只是 0.12 的一天分四个“时辰”，这里的时间是连着走的，所以把“每个时辰”折成了“每三个钟头”。
// 都是占位的游戏尺度，只从这里读。

export const BODY = Object.freeze({
  start: Object.freeze({ hunger: 60, thirst: 80, mood: 62 }),
  slotMinutes: 180, // 一个“时辰”：0.12 里按时辰算的事（心情、吃撑、耐饿）每过这么久算一回
  hungerEvery: 36, // 每过这么多分钟，饱腹 −1（一个时辰 −5）
  thirstEvery: 45, // 白天每过这么多分钟，水分 −1（一个时辰 −4）
  thirstEveryNight: 90, // 天黑以后口干得慢一半
  dusk: 19 * 60,
  overnight: Object.freeze({ hunger: 5, thirst: 6 }), // 睡一觉掉的
  sweatEvery: 8, // 在外头干活，每花这么多体力，水分再 −1
  earlyBed: 21 * 60, // 这之前睡下，醒来心情好
  hungry: 20, // 饱腹低于它：干活更费力，心情往下掉，睡不踏实
  thirsty: 30, // 水分低于它：干活更费力
  parched: 12, // 水分低于它：更费力，心情往下掉
  gloomy: 25, // 心情不高于它：提不起劲
  heavy: 4, // 至少这么费力的活才算重活：轻活每样难处最多只加 1 点体力
  notThirsty: 95, // 水分到这个数就喝不下了
  flaskSips: 3,
});

// 喝水的地方：一回补多少水分，喝的时候说什么。
export const DRINKS = Object.freeze({
  well: {
    amount: 35,
    line: '你摇着辘轳打上一桶水，舀起一瓢一口气喝了大半，凉得牙根发酸。',
  },
  vat: { amount: 35, line: '你揭开水缸的木盖舀了一瓢。水凉丝丝的，有点甜。' },
  creek: {
    amount: 25,
    line: '你蹲在水边，捧起水喝了几口，又往脸上撩了一把，整个人都清醒了。',
  },
  flask: { amount: 25, line: '你拔开竹筒的塞子，仰头喝了几口。水带着竹子的清气。' },
});
export const FLASK_REFILL = '顺手把竹筒水壶也灌满了。';

/** @type {[number, string][]} */
const MOOD = [
  [25, '低落'],
  [45, '有点闷'],
  [70, '平静'],
  [85, '愉快'],
  [101, '舒畅'],
];
export const moodWord = m => MOOD.find(([max]) => m < max)[1];
export const thirstWord = t =>
  t >= 70 ? '不渴' : t >= 45 ? '有点口干' : t >= 25 ? '渴了' : t >= 10 ? '渴得厉害' : '嗓子冒烟';
export const hungerWord = h =>
  h >= 70 ? '饱着' : h >= 45 ? '不饿' : h >= 25 ? '有点饿' : h >= 10 ? '饿了' : '饿得发慌';
export const stuffedWord = n => ['', '有点撑', '吃撑了', '撑得走不动'][n || 0];

// 吃下去的东西带来的好处（增益）。base 是做成一道菜时管用的次数；零嘴固定管 2 次。
// per：0.12 里干一次活是一整片地，这里是一格，所以按“下”算的增益把次数乘上 per、每下的量相应减小。
export const BUFFS = Object.freeze({
  hearty: { name: '踏实', base: 3, per: 4, text: n => `接下来${n}下农活，每下少耗1体力` },
  warm: {
    name: '暖身',
    base: 3,
    per: 4,
    text: n => `接下来${n}下在雨里、冷天干的活不额外耗体力；身上也暖和些`,
  },
  fresh: { name: '清爽', base: 2, per: 1, text: n => `接下来${n}次采集、钓鱼，每次多得1份` },
  cool: {
    name: '清凉',
    base: 3,
    per: 4,
    text: n => `接下来${n}下在热天干的活不额外耗体力；身上也凉快些`,
  },
  alert: {
    name: '提神',
    base: 3,
    per: 1,
    text: n => `接下来${n}次长本事时多得1点经验；熬夜也不太伤神`,
  },
  treat: { name: '解馋', base: 3, per: 1, text: n => `接下来${n}次心情变差时，只差一半` },
  guest: { name: '好客', base: 2, per: 1, text: n => `接下来${n}次聊天或送饭，关系多涨1点` },
  filling: { name: '耐饿', base: 3, per: 1, text: n => `接下来${n}段时辰，肚子饿得慢一半` },
});
export const SNACK_BUFF_USES = 2;

/** 一份增益实际管用多少下：0.12 的次数乘上这种增益的 per。 */
export const buffUses = (type, n) => n * BUFFS[type].per;

// 流水里每一种变化叫什么（见 core 插件的 ledger）。
export const LEDGER_LABELS = Object.freeze({
  energy: '体力',
  hunger: '饱腹',
  thirst: '水分',
  mood: '心情',
  coins: '钱',
  stuffed: '撑',
});
