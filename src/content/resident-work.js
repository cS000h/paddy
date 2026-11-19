// 乡邻到了作息里的地方以后在那儿做什么。地点由规则作息指定，这里只管“在那儿的样子”：
//   act     在工位上一遍遍做的动作（src/art/acts-*.js 里的名字）；rain 是下雨天换的那一个
//   stops   在工位附近走动的几个落脚点，相对作息给的那一格
//   delay   到了工位先站几秒再动手（默认 0.6），同在一块地里的两个人好错开
//   notice  看见哪种事会走过来看一眼：{事实种类: 'inspect'}；同一天只看一回
// 点人、开窗、作息换了地方，都会打断这些。画面照着这张表演，不在画面代码里写死是谁。
// 今天头一回走到乡邻跟前时，他转过身看你，头顶冒一个记号（src/art/emotes.js）：
// 还不认识的人冒问号，熟人看他今天的心情（心情的几档见 content/talk.js）。
export const GREET = Object.freeze({
  stranger: 'question',
  low: 'dots',
  meh: 'dots',
  ok: 'note',
  good: 'note',
});

// 说完话、收下东西以后冒的记号：收到喜欢的、聊得熟了一层冒心，平常收下冒音符。
export const AFTER = Object.freeze({ liked: 'heart', plain: 'note', closer: 'heart' });

export const RESIDENT_WORK = Object.freeze({
  'shi.field': {
    act: 'feelSoil',
    stops: [
      [0, 0],
      [0, -2],
      [0, 1],
    ],
    notice: { 'plot.sown': 'inspect' },
  },
  'aman.field': {
    act: 'feelSoil',
    stops: [
      [0, 0],
      [-1, 1],
    ],
    delay: 2.1,
  },
  'shi.yard': { act: 'weave', rain: 'sit' },
  'shi.tea': { act: 'sip' },
  'gui.yard': { act: 'hangCloth', rain: 'sortGreens' },
  'gui.tea': { act: 'sip' },
  'qiao.market': { act: 'countBeads', rain: 'sit' },
  'zhou.river': { act: 'mendNet', rain: 'sit' },
  'yun.hill': { act: 'gather:tea', rain: 'sit' },
  'zhou.tea': { act: 'sip' },
});
