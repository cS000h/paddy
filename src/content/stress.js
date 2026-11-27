// 心烦：0 到 100，攒出来的，和一天的心情分开。违着性情做事涨，顺着做、歇一夜降；满了「憋不住了」，
// 从几个解闷毛病里挑一个，泄掉一大截，以后用这个毛病还能解闷。只有数据，规则在 sim/plugins/stress.js。
// 哪个性情顺着、违着哪些做法标签，写在 content/traits.js 的 TEMPERS（likes、dislikes）。
// 话先由 Claude 占位写着，等 G-21（心烦和毛病）交回来照它换。

/**
 * gain 违着一回涨多少（再乘性情的 gain 倍数），relief 顺着一回降多少（乘 relief 倍数）；
 * perTag 同一个标签一天最多算几回（锄十垄地不该涨十回）；night 歇一夜降多少；
 * lonely 爱扎堆的人连着几天没跟人说话（性情的 lonely 天数）以后每天涨多少；
 * short 家里手头紧每天涨多少，badYear 年景很差每天涨多少；
 * snapDrop 憋不住了、挑了毛病以后降多少；cope 用毛病解闷一回降多少（一天一回）；
 * choices 憋不住了给挑几个；outburst 心烦到这么多才会无名火起。
 */
export const STRESS = Object.freeze({
  gain: 6,
  relief: 3,
  perTag: 2,
  night: 2,
  lonely: 5,
  short: 4,
  badYear: 3,
  snapDrop: 50,
  cope: 25,
  choices: 3,
  outburst: 60,
  villagerCope: 60,
});

/** 玩家做的事贴哪些做法标签：按事实的类型。别的几种（干活、茶摊、买东西）在下面分开写。 */
// prettier-ignore
export const FACT_TAGS = Object.freeze({
  'gift.given': ['gift'],
  'person.talked': ['chat'],
  'visitor.talked': ['stranger', 'chat'],
  'appointment.fulfilled': ['chat'],
  'meal.eaten': ['meal'],
  'fish.caught': ['quiet'],
  'home.worked': ['build'],
  'match.joined': ['standout', 'crowd'],
});

/** 花体力的活（content/actions.js 的 kind）贴的标签；花到 heavy 体力以上的再贴「干重活」。 */
export const WORK_TAGS = Object.freeze({ farm: ['farm'], craft: ['build'], heavy: 7 });

/** 茶摊上的几件事。 */
// prettier-ignore
export const TEA_TAGS = Object.freeze({ drink: ['rest'], chess: ['quiet'], hawk: ['crowd', 'help'], listen: ['crowd'] });

/** 一回花到这么多文算「大手花钱」。 */
export const SPLURGE = 15;

/** 一天里有过这几样就不算「独处」，爱扎堆的人也不算闷着。 */
export const SOCIAL_TAGS = Object.freeze(['chat', 'crowd', 'stranger', 'gift', 'standout']);

/** 乡邻每段时辰在那儿待着，就算做了什么（作息表里的去处）。 */
// prettier-ignore
export const PLACE_TAGS = Object.freeze({
  field: ['farm'], yard: ['home'], tea: ['chat', 'crowd'], market: [], creek: ['quiet'], river: ['quiet'], hill: ['alone'],
});

/** 哪种日子在哪儿多算几样：集日茶摊、铺子里生人多；下雨天下田是重活；大雨天哪儿都只能干等。 */
// prettier-ignore
export const DAY_TAGS = Object.freeze({
  fair: { tea: ['stranger'], market: ['stranger'] },
  wet: { field: ['toil'] },
  heavy: { field: ['wait'], tea: ['wait'], river: ['wait'], market: ['wait'], hill: ['wait'], creek: ['wait'] },
});

/** 乡邻憋不住了先染上哪个毛病（照性情，从前往后挑还没有的）。 */
// prettier-ignore
export const COPING_LEAN = Object.freeze({
  gregarious: ['grumble', 'spree'], shy: ['recluse', 'drink'], hasty: ['outburst', 'drink'], calm: ['drink', 'recluse'],
  stingy: ['gluttony', 'recluse'], generous: ['spree', 'gluttony'], ambitious: ['outburst', 'grumble'],
  paranoid: ['recluse', 'outburst'], content: ['gluttony', 'drink'], diligent: ['recluse', 'gluttony'],
});

/** 违着性情时冒的一句（按性情）。 */
// prettier-ignore
export const UP_LINES = Object.freeze({
  lazy: '腰酸背疼，心里直犯嘀咕。', generous: '话说出口，自己先不痛快了。', stingy: '钱一出手，心口跟着一抽。',
  shy: '跟生人说话，手心冒了汗。', honest: '心里像揣了块冷石头。', sly: '这口气咽得不顺。',
  calm: '一时冲动，回过神来心里发虚。', hasty: '干等着，脚底下直发痒。', brave: '缩回来了，心里憋屈。',
  craven: '心还在扑通扑通跳。', content: '贪了这一回，心里不踏实。', ambitious: '让了这一步，越想越不甘。',
  trusting: '疑了人家，自己倒难受。', paranoid: '心里总悬着，放不下。',
});

/** 顺着性情时松一口气的一句。 */
// prettier-ignore
export const DOWN_LINES = Object.freeze({
  diligent: '干了一身汗，心里踏实。', lazy: '歇下来，浑身都松了。', generous: '东西送出去，心里亮堂。',
  stingy: '省下一笔，心里舒坦。', gregarious: '说说笑笑，闷气散了。', shy: '一个人待着，清净。',
  honest: '帮了一把，心安。', sly: '话说得巧，心里有数。', calm: '慢慢来，心也静了。',
  hasty: '赶在头里，痛快。', brave: '敢出这个头，心里畅快。', craven: '安安稳稳的，挺好。',
  content: '一顿家常饭，知足了。', ambitious: '拔了头筹，心气顺了。', trusting: '信了人家，心里热乎。',
  paranoid: '看穿了，心里才踏实。',
});

/** 心烦到三成、六成、九成时冒的一句。 */
export const LEVEL_LINES = Object.freeze([
  [30, '这几天心里有点堵。'],
  [60, '心里乱糟糟的，做什么都不顺。'],
  [90, '心里那根弦绷得紧紧的。'],
]);

/** 憋不住了：弹出时的那句；挑了某个毛病以后的那句；以后用它解闷时冒的那句。 */
export const SNAP_LINE = '心里堵得慌，再也憋不住了。总得找个法子松一松。';
// prettier-ignore
export const COPE_LINES = Object.freeze({
  drink:    { pick: '打一壶黄酒，闷头喝了。', relief: '一口酒下去，心里松了。' },
  gluttony: { pick: '狠狠吃了一顿，才缓过来。', relief: '吃饱了，烦心事也淡了。' },
  recluse:  { pick: '关上院门，谁也不想见。', relief: '一个人关着门，静下来了。' },
  grumble:  { pick: '拉着人说了半天，痛快多了。', relief: '苦水倒出来，心里空了一块。' },
  spree:    { pick: '花钱买了一堆用不上的东西。', relief: '买了点小玩意，心情好些了。' },
  outburst: { pick: '一通火发出来，人倒是松了。', relief: '火气撒了出去，人也蔫了。' },
});
