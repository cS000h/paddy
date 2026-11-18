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
import { button, actions, close, title, para, esc } from './html.js';

function waterView(modal, game, here) {
  const reason = game.ask('drink.why', modal.x, modal.y, here);
  return `${title('水边')}${para(reason || '喝口水歇歇，也可以灌满浇菜的水壶。')}
    ${actions(
      close('离开', false),
      button('refill', '打水浇菜'),
      button('drink', '喝水', { main: true, disabled: !!reason }),
    )}`;
}

function sleepView(modal, game) {
  const clock = game.ask('clock');
  const hungry = game.ask('body').hunger < 20;
  let note = clock.late ? '天已经很晚了，明早起来怕是歇不过来。' : '浇过水的菜，明早会长一截。';
  if (hungry) note += '空着肚子睡，明早歇不回来——先吃点东西吧。';
  return `${title('回屋歇息', `${clock.period} ${clock.clock}`)}${para('今天就到这儿吗？' + note)}
    ${actions(close('再待一会儿', false), button('sleep', '歇下', { main: true }))}`;
}

// 清早的便条：夜里发生的事
const notesView = modal =>
  `${title('清早', `第 ${modal.day} 日`)}
    ${modal.notes.map(n => `<p><b>${esc(n.title)}</b>　${esc(n.text)}</p>`).join('')}
    ${actions(close('起身'))}`;

const confirmView = modal =>
  `${title(modal.title)}${para(modal.text)}
    ${actions(close('算了', false), button(modal.yes, modal.label, { main: true }))}`;

const signView = modal => `${para(modal.text)}${actions(close())}`;

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
  water: waterView,
  talk: talkView,
  sleep: sleepView,
  basket: basketView,
  bag: bagView,
  store: storeView,
  sign: signView,
  notes: notesView,
  confirm: confirmView,
};

// 内容多的小窗用宽一点的纸。
const WIDE = new Set(['store', 'basket', 'kitchen', 'recipes', 'market']);
// 这几种小窗必须在里面做出选择，点纸外面不会关掉。
const MUST_ANSWER = new Set(['origin']);

/** 点小窗外面的空白处能不能关掉它。 */
export const closesOnBackdrop = modal => !MUST_ANSWER.has(modal.kind);

/** 一个小窗的 HTML。 */
export function modalView(modal, game, here) {
  const view = VIEWS[modal.kind];
  if (!view) throw new Error('没有这种小窗：' + modal.kind);
  return `<div class="sheet${WIDE.has(modal.kind) ? ' wide' : ''}">${view(modal, game, here)}</div>`;
}
