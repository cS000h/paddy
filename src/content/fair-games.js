// 集日摊子上的小玩意（G-33 第四节挑了两个不用新操作的）：肉摊猜斤两、菜苗摊比大瓜。
// 只在集日、那个摊子摆出来的时候玩，每个一天玩一回。规则在 sim/plugins/fair-games.js。
//   guess：押 cost 文，老张举起一块肉，你说偏轻 / 正好 / 偏沉，猜中退押钱再得 win，猜偏了押钱归他、送 lose
//   weigh：不花钱，拿行囊里一颗当季大菜上秤，压过今天的榜首得一包当季菜种（seeds 份），没压过送 lose；菜还归你
//          crops：哪几样能称、几两到几两；极品的往上多 fine（0 到 1 的比例）
export const FAIR_GAMES = Object.freeze({
  meat: {
    kind: 'guess',
    title: '猜斤两',
    cost: 2,
    intro: '老张高举肉块晃了两下：“乡邻掌掌眼，这块够不够一斤二两？”',
    choices: { light: '偏轻', right: '正好', heavy: '偏沉' },
    win: { item: 'pork', n: 1 },
    lose: { item: 'scallion', n: 2 },
    lines: {
      win: '木秤一提秤星平平稳稳，老张大笑：“行家眼毒，这块肉归你啦！”',
      lose: '秤杆一翘，老张乐了：“{real}！差一点儿，押钱我收着，这两根葱拿去炖肉。”',
      done: '老张摆摆手：“今儿猜过啦，下个集日再来掌眼！”',
    },
    real: { light: '偏轻了', right: '正好一斤二两', heavy: '偏沉了' },
  },
  veg: {
    kind: 'weigh',
    title: '比大瓜',
    intro: '孙婶把大木秤往前一推：“自家种的大瓜大菜，放上来称称！”',
    crops: { pumpkin: [30, 90], cabbage: [20, 50], radish: [10, 30], cucumber: [4, 10] },
    fine: 0.35,
    seeds: 2,
    lose: { item: 'scallion', n: 1 },
    lines: {
      top: '今儿秤上榜首是一颗{weight}的{crop}。',
      win: '大木秤砣往后挪了又挪，孙婶拍手喊道：“{weight}！今儿头号大瓜出炉啦！”这包{seed}拿去。',
      lose: '{weight}，差一点儿没压过榜首。孙婶仍夸你种得水灵，塞来一把葱。',
      done: '孙婶笑道：“今儿称过啦，留着下个集日再来比！”',
      none: '行囊里没有能上秤的当季大菜（南瓜、白菜、萝卜、黄瓜）。',
    },
  },
});

/** 几两写成「X斤Y两」（十六两一斤以前的老秤不用，这里一斤十两）。 */
export const weightText = liang =>
  (liang >= 10 ? Math.floor(liang / 10) + '斤' : '') + (liang % 10 ? (liang % 10) + '两' : '整');
