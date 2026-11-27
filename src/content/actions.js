import { OUTDOOR, HOMEWORK } from './activities.js';
// 花体力的事。每一件写明：算哪一类（kind）、基准体力（energy）、是不是在户外、叫什么。
// 规则里凡是要花体力，都按这里的名字走 people.spend()，价钱再经过 'action.cost' 计算管道，
// 所以饿了、渴了、有本事、吃了什么，都能在同一个地方加减，提示里说的和实际扣的也是同一个数。
//   kind：farm 农活 | forage 采集 | fish 钓鱼 | craft 手艺 | cook 做饭 | chore 杂事 | rest 歇息
export const ACTIONS = Object.freeze({
  hawk: { id: 'hawk', label: '吆喝卖菜', kind: 'social', energy: 4, outdoor: true },
  teaChat: { id: 'teaChat', label: '茶摊闲坐', kind: 'social', energy: 0 },
  sky: { id: 'sky', kind: 'sky', energy: 0, outdoor: true, label: '抬头看天' },
  weed: { id: 'weed', kind: 'farm', energy: 4, outdoor: true, label: '拔草' },
  bugs: { id: 'bugs', kind: 'farm', energy: 2, outdoor: true, label: '捉虫' },
  manure: { id: 'manure', kind: 'farm', energy: 3, outdoor: true, label: '施肥' },
  drain: { id: 'drain', kind: 'farm', energy: 8, outdoor: true, label: '挖排水沟' },
  ...OUTDOOR,
  ...HOMEWORK,
  cookShred: { id: 'cookShred', kind: 'cook', energy: 5, outdoor: false, label: '切丝做饭' },
  mixShred: { id: 'mixShred', kind: 'cook', energy: 3, outdoor: false, label: '切丝拌菜' },
  cook: { id: 'cook', kind: 'cook', energy: 4, outdoor: false, label: '生火做饭' },
  mix: { id: 'mix', kind: 'cook', energy: 2, outdoor: false, label: '拌菜' },
  hoe: { id: 'hoe', kind: 'farm', energy: 4, outdoor: true, label: '锄地' },
  seed: { id: 'seed', kind: 'farm', energy: 1, outdoor: true, label: '播种' },
  can: { id: 'can', kind: 'farm', energy: 2, outdoor: true, label: '浇水' },
  hand: { id: 'hand', kind: 'farm', energy: 1, outdoor: true, label: '采收' },
  refill: { id: 'refill', kind: 'chore', energy: 0, outdoor: true, label: '打水' },
  // 修院子一处（content/yard-fix.js）；请老鲁搭手也一样花力气
  fixYard: { id: 'fixYard', kind: 'craft', energy: 10, outdoor: true, label: '拾掇院子' },
  // 钓鱼不限竿数，一竿 2 体力（见 content/fishing.js）
  fish: { id: 'fish', kind: 'fish', energy: 2, outdoor: true, label: '下竿钓鱼' },
  // 路边翻一翻：每处每天一回，一回 1 体力（见 content/search.js）
  search: { id: 'search', kind: 'search', energy: 1, outdoor: true, label: '翻一翻' },
});

// 出力气的活：渴了、撑了会更费劲，干了会出汗。
export const WORK_KINDS = Object.freeze(['farm', 'forage', 'fish', 'help', 'craft', 'work']);
