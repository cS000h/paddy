// 几种小而简单的小窗：水边、回屋歇息、清早的便条、路牌和门口的话、确认、出错、别的页面在玩、菜单。
import { button, actions, close, title, para, esc } from './html.js';

export function waterView(modal, game, here) {
  const reason = game.ask('drink.why', modal.x, modal.y, here);
  return `${title('水边', '井水清凉，溪水带着青草味')}
    ${para(reason || '捧一口水喝，歇口气；也能把浇菜的水壶灌满。')}
    ${actions(
      close('离开', false),
      button('refill', '灌满水壶'),
      button('drink', '喝水', { main: true, disabled: !!reason }),
    )}`;
}

export function sleepView(modal, game) {
  const clock = game.ask('clock');
  const hungry = game.ask('body').hunger < 20;
  let note = clock.late ? '天已经很晚了，明早起来怕是歇不过来。' : '浇过水的菜，明早会长一截。';
  if (hungry) note += '空着肚子睡，明早歇不回来——先吃点东西吧。';
  return `${title('回屋歇息', `${clock.period} ${clock.clock}`)}${para('今天就到这儿吗？' + note)}
    ${actions(close('再待一会儿', false), button('sleep', '歇下', { main: true }))}`;
}

// 清早的便条：夜里发生的事，一条一段
export const notesView = modal =>
  `${title('清早', `第 ${modal.day} 日`)}
    ${modal.notes.map(n => `<p class="note"><b>${esc(n.title)}</b>${esc(n.text)}</p>`).join('')}
    ${actions(close('起身'))}`;

export const confirmView = modal =>
  `${title(modal.title)}${para(modal.text)}
    ${actions(close('算了', false), button(modal.yes, modal.label, { main: true }))}`;

export const signView = modal => `<p class="say">${esc(modal.text)}</p>${actions(close())}`;

// 程序接连出错时的提示。不问规则任何事（这时候问什么都可能再出错），只给三条路。
export const troubleView = () =>
  `${title('出了点岔子')}${para(
    '画面或面板接连出错，已经记下来了。进度一直在自动保存，刷新页面就能接着玩；不放心的话，先导出一份进度。',
  )}${actions(
    button('calm', '先接着玩'),
    button('exportSave', '导出进度'),
    button('reload', '刷新页面', { main: true }),
  )}`;

// 同一份进度在另一个页面里存了档：这边停止自动存档，免得两边互相覆盖。
export const elsewhereView = () =>
  `${title('这局在别的页面里接着玩了')}${para(
    '同一份进度刚在另一个页面里存了档。为了不互相覆盖，这个页面已经停止自动存档；刷新一下，就能接着那边的进度玩。',
  )}${actions(close('留在这里，不再存档', false), button('reload', '刷新，接着那边', { main: true }))}`;

// 右上角“更多”展开的一小列。声音、全屏这些是这台设备的事，打开菜单时由面板带进来。
export const menuView = m =>
  `<div class="menu-list">
    ${button('map', '全村地图')}${button('book', '册子')}${button('journal', '手记')}
    ${button('saves', '进度与玩法')}${button('mute', m.muted ? '声音：关着' : '声音：开着')}
    ${m.fullscreen === null ? '' : button('fullscreen', m.fullscreen ? '退出全屏' : '全屏玩')}
  </div>`;
