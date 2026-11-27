// 心烦：0 到 100，攒出来的，和一天的心情分开。违着性情做事涨，顺着做、歇一夜降；满了「憋不住了」，
// 从几个解闷毛病里挑一个，泄掉一大截，以后用这个毛病还能解闷。只有数据，规则在 sim/plugins/stress.js。
// 哪个性情顺着、违着哪些做法标签，写在 content/traits.js 的 TEMPERS（likes、dislikes）。
// 冒的话在 content/stress-lines.js（G-21）。

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

/** 乡邻憋不住了先染上哪个毛病（照性情，从前往后挑还没有的）；六位村民各自的先看 stress-lines.js 的 VILLAGER_SNAP。 */
// prettier-ignore
export const COPING_LEAN = Object.freeze({
  gregarious: ['grumble', 'spree'], shy: ['recluse', 'drink'], hasty: ['outburst', 'drink'], calm: ['drink', 'recluse'],
  stingy: ['gluttony', 'recluse'], generous: ['spree', 'gluttony'], ambitious: ['outburst', 'grumble'],
  paranoid: ['recluse', 'outburst'], content: ['gluttony', 'drink'], diligent: ['recluse', 'gluttony'],
});
