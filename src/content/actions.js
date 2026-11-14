// 花体力的事。每一件写明：算哪一类（kind）、基准体力（energy）、是不是在户外、叫什么。
// 规则里凡是要花体力，都按这里的名字走 people.spend()，价钱再经过 'action.cost' 计算管道，
// 所以饿了、渴了、有本事、吃了什么，都能在同一个地方加减，提示里说的和实际扣的也是同一个数。
//   kind：farm 农活 | forage 采集 | fish 钓鱼 | craft 手艺 | cook 做饭 | chore 杂事 | rest 歇息
export const ACTIONS = Object.freeze({
  cook: { id: 'cook', kind: 'cook', energy: 4, outdoor: false, label: '生火做饭' },
  mix: { id: 'mix', kind: 'cook', energy: 2, outdoor: false, label: '拌菜' },
  hoe: { id: 'hoe', kind: 'farm', energy: 4, outdoor: true, label: '锄地' },
  seed: { id: 'seed', kind: 'farm', energy: 1, outdoor: true, label: '播种' },
  can: { id: 'can', kind: 'farm', energy: 2, outdoor: true, label: '浇水' },
  hand: { id: 'hand', kind: 'farm', energy: 1, outdoor: true, label: '采收' },
  refill: { id: 'refill', kind: 'chore', energy: 0, outdoor: true, label: '打水' },
});

// 出力气的活：渴了、撑了会更费劲，干了会出汗。
export const WORK_KINDS = Object.freeze(['farm', 'forage', 'fish', 'help', 'craft', 'work']);
