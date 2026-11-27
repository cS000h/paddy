// 好感：一个人怎么看另一个人（−100 到 100），照 CK3 的意见来：相性、一条条来由（为什么、多少、还剩几天），
// 村民看主角时再加熟悉的层次。只有数据；怎么记、怎么算在 sim/plugins/opinion.js。
// 数先粗，等 M8 第 10 步的村志工具跑起来再调。

/** 相性：同一个性情 +10，一对里反着的 −10（勤勉碰上懒散、大方碰上抠门……）。 */
export const COMPAT = Object.freeze({ same: 10, clash: -10 });

/** 村民看主角，熟悉到哪一层加多少：还不认识、点头之交、熟络、亲近、交心（层次见 content/talk.js）。 */
export const TIER_OPINION = Object.freeze([0, 4, 8, 14, 20]);

/** 好感最多到多少、最少到多少。 */
export const OPINION_RANGE = Object.freeze([-100, 100]);

/**
 * 来由。label 给人看的说法；n 一条加减多少；days 记几天，null 是一直记着；
 * stack 同一种最多记几条，记满了再来一回，只把最快过期的那条刷新。
 */
// prettier-ignore
export const WHY = Object.freeze({
  // 主角做的事，村民记着
  gift:      { label: '送过东西',       n: 5,   days: 30,   stack: 3 },
  liked:     { label: '送的东西合心意', n: 8,   days: 40,   stack: 2 },
  favorite:  { label: '送了最爱吃的',   n: 15,  days: 60,   stack: 1 },
  fine:      { label: '送的是极品',     n: 5,   days: 40,   stack: 2 },
  chat:      { label: '常来说说话',     n: 2,   days: 10,   stack: 5 },
  met:       { label: '赴过约',         n: 8,   days: 30,   stack: 2 },
  missed:    { label: '约了没来',       n: -12, days: 20,   stack: 2 },
  cancelled: { label: '约了又推了',     n: -4,  days: 14,   stack: 2 },
  helped:    { label: '帮过一把',       n: 4,   days: 30,   stack: 3 },
  sly:       { label: '见你昧下人家的东西', n: -10, days: 30, stack: 2 },
  outburst:  { label: '冲他发过火',     n: -6,  days: 14,   stack: 2 },
  tasted:    { label: '尝过你的好菜',   n: 6,   days: 30,   stack: 2 }, // 满院飘香（sim/plugins/aroma.js）
  bought:    { label: '买过你一碗菜',   n: 3,   days: 20,   stack: 2 },
  treated:   { label: '单给他盛过一碗', n: 10,  days: 40,   stack: 1 },
  snubbed:   { label: '站门口白闻了香', n: -4,  days: 14,   stack: 2 },
  // 局面里你怎么做的（sim/plugins/scenes.js）
  warm:      { label: '跟他聊得投机',   n: 6,   days: 30,   stack: 2 },
  fair:      { label: '说过公道话',     n: 6,   days: 40,   stack: 2 },
  praised:   { label: '当众给过他面子', n: 3,   days: 20,   stack: 3 },
  cool:      { label: '没顺着他',       n: -3,  days: 14,   stack: 2 },
  shunned:   { label: '犯难时你装没看见', n: -5, days: 20,   stack: 2 },
  pitched:   { label: '出力帮过他',     n: 8,   days: 40,   stack: 2 },
  backed:    { label: '帮他圆过心愿',   n: 12,  days: 90,   stack: 1 }, // 盼头（sim/plugins/hopes.js）
  hindered:  { label: '给他使过绊子',   n: -15, days: 60,   stack: 1 },
  // 借、还、帮、传（sim/plugins/ledger.js）
  lent:      { label: '手紧时借过钱',   n: 8,   days: 60,   stack: 2 },
  repaid:    { label: '借了钱按日子还', n: 4,   days: 40,   stack: 2 },
  refused:   { label: '开口借钱被回了', n: -4,  days: 20,   stack: 2 },
  overdue:   { label: '欠钱过了日子',   n: -5,  days: 30,   stack: 1 },
  welshed:   { label: '欠钱赖着不还',   n: -15, days: 60,   stack: 1 },
  dunned:    { label: '上门讨过债',     n: -2,  days: 14,   stack: 2 },
  relieved:  { label: '悄悄接济过',     n: 8,   days: 40,   stack: 2 },
  confided:  { label: '跟他说过悄悄话', n: 3,   days: 14,   stack: 2 },
  tattled:   { label: '在他跟前说人闲话', n: -4, days: 20,  stack: 2 },
  oldtie:    { label: '旧交情',         n: 12,  days: null, stack: 1 }, // 落脚单上的那一笔（content/settle.js）
  // 村民之间开局就有的交情，照台词里提到的事（见 STANDING），一直记着
  veggies:   { label: '常给他送菜',     n: 10,  days: null, stack: 1 },
  fed:       { label: '天天吃他送的菜', n: 10,  days: null, stack: 1 },
  pickles:   { label: '常蹭她的腌菜',   n: 8,   days: null, stack: 1 },
  raised:    { label: '看着长大的',     n: 8,   days: null, stack: 1 },
  uphill:    { label: '常上山来找她',   n: 8,   days: null, stack: 1 },
});

/**
 * 村民之间开局就记着的来由：[谁, 对谁, 来由]。
 * 阿满推板车给老周送菜，蹭桂嫂的腌菜；桂嫂说小乔「嘴贫，心眼倒好」；云姑常提起上山画画的小乔。
 */
export const STANDING = Object.freeze([
  ['aman', 'zhou', 'veggies'],
  ['zhou', 'aman', 'fed'],
  ['aman', 'gui', 'pickles'],
  ['gui', 'qiao', 'raised'],
  ['yun', 'qiao', 'uphill'],
]);
