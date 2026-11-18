// 各种小窗里写什么。每种小窗一个函数 (modal, game, here) → HTML；按钮上的 data-do 说明点了以后做什么。
// 加一种小窗 = 在 VIEWS 里登记一个函数，再让 app 的 actions 认得它的按钮。
// here 是操控的人此刻站的格子，问“够得着什么”时要带上。
import { savesView } from './saves.js';
import { marketView, teaView } from './market.js';
import { weatherView, seedsView, fieldView } from './field.js';
import { originView, bookView } from './book.js';
import { activityView, fishView } from './activities.js';
import { kitchenView, recipesView, heatView } from './kitchen.js';
import { bagView, storeView } from './bag.js';
import { talkView, basketView } from './village.js';
import { mapView } from './map.js';
import * as n from './notices.js';
import { actions, close, title, para } from './html.js';

const VIEWS = {
  saves: savesView,
  market: marketView,
  tea: teaView,
  weather: weatherView,
  seeds: seedsView,
  field: fieldView,
  origin: originView,
  book: bookView,
  activity: activityView,
  fish: fishView,
  kitchen: kitchenView,
  recipes: recipesView,
  heat: heatView,
  water: n.waterView,
  talk: talkView,
  sleep: n.sleepView,
  basket: basketView,
  bag: bagView,
  store: storeView,
  sign: n.signView,
  notes: n.notesView,
  confirm: n.confirmView,
  trouble: n.troubleView,
  elsewhere: n.elsewhereView,
  menu: n.menuView,
  map: mapView,
};

// 小窗摆在哪儿：
//   dialogue  贴着下沿的一长条：说话、旁白、水边、歇息、钓鱼。世界在上面照样看得见，像戏里的一场；
//   center    正中一张：开局的选择、确认、出错、全村地图；
//   menu      右上角“更多”底下的一小列；
//   side      其余的从右边展开成一整幅，高到顶，左边还看得见世界。
const PLACE = {
  talk: 'dialogue',
  notes: 'dialogue',
  sign: 'dialogue',
  water: 'dialogue',
  sleep: 'dialogue',
  fish: 'dialogue',
  origin: 'center',
  confirm: 'center',
  trouble: 'center',
  elsewhere: 'center',
  map: 'center',
  menu: 'menu',
};
/** 这个小窗摆在哪儿：'dialogue' | 'center' | 'menu' | 'side'。 */
export const placementOf = modal => PLACE[modal.kind] || 'side';

// 内容多的小窗用宽一点的纸。
const WIDE = new Set(['store', 'basket', 'kitchen', 'recipes', 'market', 'map']);
// 这几种小窗必须在里面做出选择，点纸外面不会关掉。
const MUST_ANSWER = new Set(['origin', 'trouble']);

/** 点小窗外面的空白处能不能关掉它。 */
export const closesOnBackdrop = modal => !MUST_ANSWER.has(modal.kind);

// 右上角的“×”：整幅的、正中的小窗都有，伸手就够得着，不用翻到底找“回去”
const CROSS = '<button class="x" data-do="dismiss" aria-label="关上"></button>';

/** 小窗画不出来时换上的那张纸：说清楚出了什么事，能关掉。 */
export const brokenSheet = () =>
  `<div class="frame center"><div class="sheet center">${title('这个小窗没能打开')}${para(
    '程序出了点岔子，已经记下了。进度没有受影响，关上它接着玩就好。',
  )}${actions(close('关上'))}</div></div>`;

/**
 * 一个小窗的 HTML：外面一层框（frame）定大小、挂着“×”，里面那张纸（sheet）自己滚动，
 * 这样纸再长，“×”和最底下那排按钮都不会滚出去。
 */
export function modalView(modal, game, here) {
  const view = VIEWS[modal.kind];
  if (!view) throw new Error('没有这种小窗：' + modal.kind);
  const place = placementOf(modal);
  const cross = ['side', 'center'].includes(place) && closesOnBackdrop(modal) ? CROSS : '';
  const cls = place + (WIDE.has(modal.kind) ? ' wide' : '');
  return `<div class="frame ${cls}">${cross}<div class="sheet ${cls}">${view(modal, game, here)}</div></div>`;
}
