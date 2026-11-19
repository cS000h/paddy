// 常驻在画面上的几块：左上的日期、天气和“下一步”，右上的身体四样、铜钱和几个按钮，下方的工具栏，
// 右下那枚“做”的印（触屏时）。骨架只建一次，之后只改变了的字和数——原来每走一次时就把
// 工具栏整个重建，手机上会顿一下，手指正按着的按钮也会被换掉，点了没反应。
import { TOOLS, ITEMS } from '../content/items.js';
import { toolIconUrl, itemIconUrl } from './icons.js';
import { termOf } from '../content/calendar.js';
import { esc } from './html.js';

// 身上的四样：一个圈一样，圈里一个字；快见底时圈变成朱砂色。
const GAUGES = [
  ['energy', '力'],
  ['hunger', '饱'],
  ['thirst', '水'],
  ['mood', '心'],
];
const gauge = ([id, mark]) =>
  `<button class="gauge ${id}" data-do="vital" data-vital="${id}" data-id="${id}">` +
  `<i>${mark}</i></button>`;

// 16 格以内的单色印记，和工具图共用整数像素的边缘。
const glyphs = {
  bag: 'M5 1h6v2H9v2h3v2h2v6h-2v2H4v-2H2V7h2V5h3V3H5z M5 8v4h1V8z',
  map: 'M1 4l5-2 5 2 4-2v11l-4 2-5-2-5 2z M3 5v7l2-1V4z M7 4v7l3 1V5z M12 5v7l1-1V4z',
  journal: 'M3 1h10v14H3v-2H1v-1h2V9H1V8h2V5H1V4h2z M5 3v10h6V3z M6 5h4v1H6z M6 8h4v1H6z',
  menu: 'M2 3h12v2H2z M2 7h12v2H2z M2 11h12v2H2z',
};
const navKey = (
  id,
  label,
  cls = '',
) => `<button class="menu-btn ${cls}" data-do="${id}" aria-label="${label}">
  <svg aria-hidden="true" viewBox="0 0 16 16" shape-rendering="crispEdges"><path fill-rule="evenodd" d="${glyphs[id]}"/></svg>${label}</button>`;

const toolButton = (tool, i) =>
  `<button data-tool="${tool.id}" aria-label="${tool.name}"><img class="pixel" alt="" />` +
  `<i class="badge"></i><span class="name">${tool.name}</span><em class="key">${i + 1}</em></button>`;

/** 常驻几块的骨架；带 data-id 的元素由 renderHud 填。 */
export const HUD_HTML = `
  <div class="left">
    <div class="card date">
      <span class="seal">稻</span>
      <span class="when"><b data-id="date"></b><small data-id="time"></small></span>
      <button class="weather" data-do="weather" data-id="weather"></button>
    </div>
    <button class="card next" data-do="next" data-id="next" hidden></button>
  </div>
  <div class="vitals"><div class="body-strip">
    ${gauge(GAUGES[0])}<em class="vigor" data-id="vigor"></em>
    ${GAUGES.slice(1).map(gauge).join('')}
    <span class="buff" data-id="buff" hidden></span>
    </div><span class="coins" title="铜钱"><img class="pixel" width="16" height="16"
      src="${toolIconUrl('coin')}" alt="铜钱" /><span data-id="coins"></span></span>
    <nav class="system-keys" aria-label="常用入口">
      ${navKey('bag', '行囊')}${navKey('map', '地图')}
      <button class="menu-btn book-key" data-do="book">册子</button>
      ${navKey('journal', '手记')}${navKey('menu', '菜单')}
    </nav>
  </div>
  <nav class="toolbar" data-id="toolbar">${TOOLS.map(toolButton).join('')}<span class="sep"></span>
    <span class="tool-mode" data-id="mode" hidden>手选 · 再点解锁</span><button class="chip" data-do="seeds">选种</button><button class="chip" data-do="field">看地</button>
  </nav>`;

/** 字变了才改，不变就不碰 DOM。 */
const put = (node, text) => {
  if (node.textContent !== text) node.textContent = text;
};
const attr = (node, name, value) => {
  if (node.getAttribute(name) !== value) node.setAttribute(name, value);
};

function setGauge(node, value, word, low) {
  node.style.setProperty('--v', String(Math.max(0, Math.min(100, Math.round(value)))));
  node.classList.toggle('low', low);
  attr(node, 'title', word);
  attr(node, 'aria-label', word);
}

/** 工具栏：菜种那一格显示挑中的是哪种种子、身上带着几粒；水壶显示还剩几下。 */
function syncTools(el, game, seed) {
  const pack = game.ask('pack');
  const home = game.ask('home');
  const carried = id => pack.items.find(i => i.id === id)?.n || 0;
  const badge = { seed: String(carried(seed)), can: `${home.can}` };
  for (const tool of TOOLS) {
    const button = el.toolbar.querySelector(`[data-tool="${tool.id}"]`);
    const isSeed = tool.id === 'seed';
    attr(button.querySelector('img'), 'src', isSeed ? itemIconUrl(seed) : toolIconUrl(tool.id));
    put(button.querySelector('.badge'), badge[tool.id] ?? '');
    attr(button, 'title', isSeed ? `${tool.verb}：${ITEMS[seed].name}` : tool.verb);
  }
}

/** 工具栏上哪件工具拿在手里；面前那格地要照料时，“看地”点上一点朱砂。 */
export function syncToolbar(el, state) {
  el.mode.hidden = !state.manualTool;
  for (const button of el.toolbar.querySelectorAll('button')) {
    const tool = button.dataset.tool;
    if (tool) {
      const active = tool === (state.manualTool ? state.tool : state.hint?.tool);
      button.classList.toggle('on', active);
      button.classList.toggle('locked', active && state.manualTool);
      attr(button, 'aria-pressed', String(active && state.manualTool));
    }
    if (button.dataset.do === 'field') button.classList.toggle('alert', !!state.hint?.care);
  }
}

/** 右下那枚印：刻着眼下按下去会做的事；做不了时颜色淡下去，没什么可做时只刻一个“做”。 */
export function syncStamp(node, hint) {
  const verb = hint?.verb || '做';
  // 两个字上下叠着刻（竖排的 writing-mode 在按钮里会被浏览器错排成横的）
  const label = verb.length > 1 ? 'pair' : 'single';
  const html = `<span class="${label}">${[...verb].map(ch => `<i>${esc(ch)}</i>`).join('')}</span>`;
  if (node.innerHTML !== html) node.innerHTML = html;
  node.classList.toggle('no', !!hint && !hint.ok);
  node.classList.toggle('idle', !hint);
  attr(node, 'aria-label', hint ? hint.text : '对面前的东西做事');
}

/** 按规则里此刻的样子，改常驻几块里变了的地方。 */
export function renderHud(el, { game, shell }) {
  const clock = game.ask('clock');
  const hero = game.ask('hero');
  const body = game.ask('body');
  const weather = game.ask('weather');
  put(el.date, `${termOf(clock)} · 第 ${clock.dayOfSeason} 日`);
  put(el.time, `${clock.hour} ${clock.clock}`);
  attr(el.time, 'title', clock.period);
  put(el.weather, `${weather.name} ${weather.temperature}° · ${game.ask('comfort').word}`);
  setGauge(
    el.energy,
    (hero.energy / hero.energyMax) * 100,
    `体力 ${hero.energy}`,
    hero.energy / hero.energyMax < 0.3,
  );
  put(el.vigor, String(hero.energy));
  setGauge(el.hunger, body.hunger, `饱腹 ${body.hunger}：${body.hungerWord}`, body.hunger < 30);
  setGauge(el.thirst, body.thirst, `水分 ${body.thirst}：${body.thirstWord}`, body.thirst < 30);
  setGauge(el.mood, body.mood, `心情 ${body.mood}：${body.moodWord}`, body.mood < 30);
  el.buff.hidden = !body.buff;
  if (body.buff) {
    put(el.buff, `${body.buff.name} ${body.buff.left}`);
    attr(el.buff, 'title', body.buff.text);
  }
  put(el.coins, String(game.ask('home').coins));
  syncTools(el, game, shell.get().seed);
  syncToolbar(el, shell.get());
}
