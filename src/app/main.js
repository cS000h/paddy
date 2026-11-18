// 启动入口：把平台、规则（经由端口）、输入意图、世界画面、界面面板接到一起。
// 这里只管组装和跨着几块的流程：读档、自动存档、时间流逝。面板按钮能做的事分在同目录的几个文件里。
import '../panels/style.css';
import { createGame } from '../port/game.js';
import { createWebPlatform } from '../platform/web.js';
import { createIntents } from '../shell/intents.js';
import { createShellState } from '../shell/state.js';
import { createWorld } from '../world/index.js';
import { createPanels } from '../panels/index.js';
import { CALENDAR } from '../content/calendar.js';
import { TOOLS } from '../content/items.js';
import { MAPS } from '../content/maps/index.js';
import { saveActions } from './saves.js';
import { homeActions } from './home.js';
import { marketActions } from './market.js';
import { fieldActions } from './field.js';
import { growthActions, growthNotices } from './growth.js';
import { activityActions } from './activities.js';
import { kitchenActions } from './kitchen.js';

const platform = createWebPlatform(document.getElementById('app'));
const debug = platform.debug();
const onError = error => console.error(error);

// 读档失败时仅开临时体验局，暂停自动保存，绝不覆盖浏览器原档。
let game;
let loadProblem = '';
let saving = true;
let saveTimer = 0;
try {
  game = createGame({ saved: platform.storage.load(), seed: platform.seed(), debug, onError });
} catch (error) {
  console.warn('存档读不了，已保护原档：', error);
  loadProblem = '原来的进度暂时读不了，已停止自动覆盖。请先导出浏览器原档留作备份。';
  saving = false;
  game = createGame({ seed: platform.seed(), debug, onError });
}

const intents = createIntents();
const shell = createShellState();
const world = createWorld({
  parent: document.getElementById('stage'),
  game,
  intents,
  shell,
  platform,
  map: MAPS[game.ask('hero').map],
});

const here = () => world.heroAt() || undefined;

/** 发命令；被拒绝就把原因说给玩家。 */
function run(type, input) {
  const out = game.dispatch(type, input);
  if (!out.ok) shell.toast(out.reason);
  return out;
}

// 面板上的按钮能做的事。按钮写 data-do="名字"，带的 data-* 会传进来。
const deps = { game, shell, platform, run, here, world };
const stopSaving = () => {
  saving = false;
  clearTimeout(saveTimer);
};
const actions = {
  ...saveActions({ ...deps, loadProblem, stopSaving }),
  ...homeActions(deps),
  ...marketActions(deps),
  ...fieldActions(deps),
  ...growthActions(deps),
  ...activityActions(deps),
  ...kitchenActions(deps),
};

createPanels({
  root: document.getElementById('ui'),
  game,
  intents,
  shell,
  platform,
  actions,
  here,
});

growthNotices(game, shell);
if (!game.ask('growth').origin) shell.set({ modal: { kind: 'origin' } });
if (loadProblem) actions.saves();

intents.on('tool', data => {
  const id = data.id || TOOLS[data.index]?.id;
  if (id) shell.set({ tool: id });
});
intents.on('tool.step', data => shell.stepTool(data.by));

// 存档：每次世界有变化之后稍等一下再存；窗口被切走时立刻存，并记下站在哪儿。
let warnedSave = false;
const saveNow = () => {
  if (!saving) return;
  if (!platform.storage.save(game.save()) && !warnedSave) {
    warnedSave = true;
    shell.toast('进度暂时存不进浏览器，请在行囊里打开“进度与玩法”导出备份。');
  }
};
game.onCommit(() => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 400);
});
platform.onHide(() => {
  intents.release();
  const at = here();
  if (at && !shell.paused()) game.dispatch('person.place', at);
  saveNow();
});

// 时间：现实里每过一小会儿，游戏里就过十分钟。有小窗弹着、窗口不在前台时，时间不走。
let carried = 0;
let last = performance.now();
function tick(now) {
  const seconds = Math.min(0.25, (now - last) / 1000);
  last = now;
  if (!shell.paused() && document.visibilityState === 'visible' && !game.ask('clock').stopped) {
    carried += seconds / CALENDAR.realSecondsPerGameMinute;
    if (carried >= CALENDAR.tickMinutes) {
      carried -= CALENDAR.tickMinutes;
      game.dispatch('clock.advance', { minutes: CALENDAR.tickMinutes });
    }
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// 调试入口：网址带 ?debug 时，测试和控制台可以通过它直接操作。
if (debug) window.__dao = { game, shell, intents, world, platform };
