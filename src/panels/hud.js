// 常驻在画面上的几块：左上的日期和天气，右上的体力、饱、水、心情和铜钱，下方的工具栏。
import { TOOLS, ITEMS } from '../content/items.js';
import { toolIconUrl, itemIconUrl } from './icons.js';
import { esc } from './html.js';

const meter = (id, label) =>
  `<span class="meter ${id}" data-id="${id}"><b>${label}</b><span class="bar"><i></i></span></span>`;

/** 常驻几块的骨架；带 data-id 的元素由 renderHud 填。左上一列从上往下：日期、下一步、流水。 */
export const HUD_HTML = `
  <div class="left">
    <div class="card date"><span class="seal">稻</span><div><b data-id="date"></b>
      <small data-id="time"></small><button data-do="weather" data-id="weather"></button></div></div>
    <button class="card next" data-do="journal" data-id="next" hidden></button>
    <div class="feed" data-id="feed"></div>
  </div>
  <div class="card vitals">
    <span class="meter energy"><b>体力</b><span class="bar" data-id="bar"><i></i></span><em data-id="energy"></em></span>
    ${meter('hunger', '饱')}${meter('thirst', '水')}${meter('mood', '心')}
    <span class="buff" data-id="buff" hidden></span>
    <span class="coins"><img class="pixel" width="16" height="16" src="${toolIconUrl('coin')}" alt="铜钱" /><span data-id="coins"></span></span>
    <button data-do="book">册子</button><button data-do="bag">行囊</button>
    <button data-do="journal">手记</button><button data-do="mute" data-id="mute"></button>
  </div>
  <nav class="card toolbar" data-id="toolbar"></nav>`;

function setMeter(node, value, word, low) {
  node.querySelector('i').style.width = `${value}%`;
  node.classList.toggle('low', low);
  node.title = word;
}

/** 工具栏：四件工具（菜种那一格显示挑中的是哪种种子、身上带着几粒），再加“选种”“田地”。 */
function toolbarHtml(game, seed) {
  const pack = game.ask('pack');
  const home = game.ask('home');
  const carried = id => pack.items.find(i => i.id === id)?.n || 0;
  const badge = { seed: carried(seed), can: `${home.can}/${home.canMax}` };
  const tools = TOOLS.map((tool, i) => {
    const isSeed = tool.id === 'seed';
    const icon = isSeed ? itemIconUrl(seed) : toolIconUrl(tool.id);
    const title = isSeed ? `${tool.verb}：${ITEMS[seed].name}` : tool.verb;
    return `<button data-tool="${tool.id}" title="${esc(title)}"><em>${i + 1}</em>
      <i>${badge[tool.id] ?? ''}</i><img class="pixel" src="${icon}" alt="" />${tool.name}</button>`;
  });
  return (
    tools.join('') + '<button data-do="seeds">选种</button><button data-do="field">田地</button>'
  );
}

/** 工具栏上哪件工具拿在手里；面前那格地要照料时，“田地”亮起来。 */
export function syncToolbar(el, state) {
  for (const button of el.toolbar.children) {
    button.classList.toggle('on', button.dataset.tool === state.tool);
    if (button.dataset.do === 'field') button.classList.toggle('alert', !!state.hint?.care);
  }
}

/** 按规则里此刻的样子，重填常驻的几块。 */
export function renderHud(el, { game, shell, platform }) {
  const clock = game.ask('clock');
  const hero = game.ask('hero');
  const body = game.ask('body');
  const weather = game.ask('weather');
  el.weather.textContent = `${weather.name} ${weather.temperature}° · ${game.ask('comfort').word}`;
  el.date.textContent = `${clock.seasonName} · 第 ${clock.dayOfSeason} 日`;
  el.time.textContent = `${clock.period} ${clock.clock} · ${clock.hour}`;
  el.bar.firstElementChild.style.width = `${(hero.energy / hero.energyMax) * 100}%`;
  el.bar.classList.toggle('low', hero.energy < 20);
  el.energy.textContent = hero.energy;
  setMeter(el.hunger, body.hunger, `饱腹 ${body.hunger}：${body.hungerWord}`, body.hunger < 20);
  setMeter(el.thirst, body.thirst, `水分 ${body.thirst}：${body.thirstWord}`, body.thirst < 30);
  setMeter(el.mood, body.mood, `心情 ${body.mood}：${body.moodWord}`, body.mood <= 25);
  el.buff.hidden = !body.buff;
  if (body.buff) {
    el.buff.textContent = `${body.buff.name} ${body.buff.left}`;
    el.buff.title = body.buff.text;
  }
  el.coins.textContent = game.ask('home').coins;
  el.mute.textContent = platform.audio.muted() ? '声·关' : '声·开';
  el.toolbar.innerHTML = toolbarHtml(game, shell.get().seed);
  syncToolbar(el, shell.get());
}
