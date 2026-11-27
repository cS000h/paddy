// 动作：村民（以后也是玩家）能对谁做的事，和做了以后留下的见闻。只有数据；能不能做、多想做、
// 做了改什么在 sim/deeds.js，谁什么时候打分在 sim/plugins/deeds.js。照执行方案 M8 第 8、9 步。
// 第一批只有三样日常的：闲聊、送点吃的、躲清静。借、还、帮、传、拿是下一段（M9）加进这张表。

/**
 * 多想做 = base + 打分值 × ai 里的权重（八个打分值见 content/traits.js 的 AI_KEYS，各人三个性情加起来）
 *        + 对对方的好感 × opinion + 自己的心烦 × stress + 一点每天不同的起伏（±DEED_ROLL.jitter）。
 * 过了 DEED_ROLL.threshold 才做；一段时辰里一个人最多做一件，挑分最高的那件。
 * tags 做法标签（顺着、违着性情，心烦跟着涨落）；target 'other' 要对着一个在场的人，'self' 自己做；
 * coins 要从自家家底里拿出几文（拿不出就不做）；line 见闻里的说法（{a} 做的人，{b} 对着的人，{place} 在哪儿）。
 * keep 手里至少留几文才肯花；daily 一天最多做几回；again 对同一个人（自己做的就是自己）隔几天才再做一回，
 * 从见闻里查，所以不能长过 fade；fade 见闻记几天；secret 当事人不想让人知道。
 */
// prettier-ignore
export const DEEDS = Object.freeze({
  chat:     { name: '闲聊', tags: ['chat'], target: 'other', base: 0, ai: { social: 0.5 }, opinion: 0.4, stress: 0,
              line: '{a}和{b}在{place}闲聊了几句', daily: 2, again: 1, fade: 3, secret: false },
  treat:    { name: '送点吃的', tags: ['gift'], target: 'other', base: -18, ai: { greed: -0.4, social: 0.2, honor: 0.1 }, opinion: 0.6, stress: 0,
              coins: 2, keep: 10, line: '{a}给{b}捎了点吃的', daily: 1, again: 6, fade: 10, secret: false },
  withdraw: { name: '躲清静', tags: ['alone'], target: 'self', base: -10, ai: { social: -0.5 }, opinion: 0, stress: 0.5,
              line: '{a}一个人在{place}待了半天，谁也没理', daily: 1, again: 2, fade: 3, secret: false },
});

export const DEED_ROLL = Object.freeze({ threshold: 25, jitter: 12 });

/** 不是动作、但也留见闻的事：玩家昧下东西被看见、谁憋不住了、谁用毛病解闷。 */
// prettier-ignore
export const OTHER_DOINGS = Object.freeze({
  cheat: { line: '{a}昧下了人家的东西', fade: 30, secret: true },
  snap:  { line: '{a}心里憋不住了', fade: 10, secret: false },
  cope:  { line: '{a}{coping}', fade: 6, secret: true },
});

/** 用毛病解闷时，见闻里的说法。 */
// prettier-ignore
export const COPE_WORDS = Object.freeze({
  drink: '喝了顿闷酒', gluttony: '闷头吃了一大顿', recluse: '关起门来谁也不见', grumble: '拉着人倒了半天苦水',
  spree: '乱买了一堆小玩意', outburst: '无端发了一通火',
});

/** 见闻里各种「在哪儿」的叫法（作息表里的去处）。 */
// prettier-ignore
export const PLACE_WORDS = Object.freeze({
  field: '田里', yard: '院子边', tea: '樟树茶摊', market: '杂货铺', creek: '溪边', river: '渡口', hill: '后山',
});

/** 存档里最多留几条见闻；满了先丢最早的。 */
export const WITNESS_KEEP = 120;
