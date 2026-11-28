// 启动入口：把平台、规则（经由端口）、输入意图、世界画面、界面面板接到一起。
// 这里只管组装和跨着几块的流程：读档、自动存档、清早备份、时间流逝，以及出了岔子怎么办。
// 面板按钮能做的事分在同目录的几个文件里。
import '../panels/style.css';
import '../panels/play-hud.css';
import '../panels/book.css';
import '../panels/catalog.css';
import '../panels/diet.css';
import '../panels/fishing.css';
import '../panels/fire.css';
import '../panels/person.css';
import '../panels/wardrobe.css';
import { createGame } from '../port/game.js';
import { createWebPlatform } from '../platform/web.js';
import { createIntents } from '../shell/intents.js';
import { createShellState } from '../shell/state.js';
import { createWorld } from '../world/index.js';
import { createPanels } from '../panels/index.js';
import { CALENDAR } from '../content/calendar.js';
import { TOOLS } from '../content/items.js';
import { MAPS } from '../content/maps/index.js';
import { createProblems } from './problems.js';
import { showFallback } from './fallback.js';
import { saveActions } from './saves.js';
import { encounterActions } from './encounter.js';
import { homeActions } from './home.js';
import { marketActions } from './market.js';
import { decorActions } from './decor.js';
import { fieldActions } from './field.js';
import { growthActions, growthNotices } from './growth.js';
import { dietNotices } from './diet.js';
import { pulseActions, pulseNotices } from './pulse.js';
import { activityActions } from './activities.js';
import { kitchenActions } from './kitchen.js';
import { readingActions } from './reading.js';
import { travelActions } from './travel.js';

const platform = createWebPlatform(document.getElementById('app'));
const debug = platform.debug();

// 规则、画面、面板、计时，哪儿出错都交到这里；错得太密时弹小窗告诉玩家进度已经存好。
let shell = null;
const problems = createProblems({
  onBurst: () => shell?.set({ modal: { kind: 'trouble' } }),
});
const report = (error, where) => problems.report(error, where);
platform.onStray(report);

try {
  start();
} catch (error) {
  // 启动时就出错：给一页说明，进度不动；能导出浏览器里的原档
  report(error, 'start');
  document.getElementById('boot')?.remove();
  showFallback(document.getElementById('ui'), {
    error,
    rawSave: platform.storage.raw(),
    download: platform.files.download,
  });
}

function start() {
  const onError = (error, { command, listener }) =>
    report(error, command ? 'rules:' + command.type : 'listener:' + listener);

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

  const intents = createIntents({ onError: report });
  shell = createShellState({ onError: report });
  const world = createWorld({
    parent: document.getElementById('stage'),
    game,
    intents,
    shell,
    platform,
    report,
    map: MAPS[game.ask('hero').map],
  });

  const here = () => world.heroAt() || undefined;

  /** 发命令；被拒绝就把原因说给玩家（规则出错时，原因是端口给的一句人话）。 */
  function run(type, input) {
    const out = game.dispatch(type, input);
    if (!out.ok) shell.toast(out.reason);
    return out;
  }

  // 存档：每次世界有变化之后稍等一下再存；窗口被切走时立刻存，并记下站在哪儿。
  let warnedSave = false;
  const saveNow = () => {
    if (!saving) return;
    if (!platform.storage.save(game.save()) && !warnedSave) {
      warnedSave = true;
      shell.toast('进度暂时存不进浏览器，请在行囊里打开“进度与玩法”导出备份。');
    }
  };
  const stopSaving = () => {
    saving = false;
    // 拿着的那格吃完、卖光、送掉了：手里就空了
    const held = shell.get().held;
    if (held && !game.ask('pack').slots.some(s => s.key === held)) shell.set({ held: null });
    clearTimeout(saveTimer);
  };

  // 面板上的按钮能做的事。按钮写 data-do="名字"，带的 data-* 会传进来。
  const deps = { game, shell, platform, run, here, world };
  const actions = {
    ...saveActions({ ...deps, loadProblem, stopSaving, problems }),
    ...homeActions(deps),
    ...encounterActions(deps),
    ...marketActions(deps),
    ...decorActions(deps),
    ...fieldActions(deps),
    ...growthActions({ ...deps, debug }),
    ...pulseActions(deps),
    ...activityActions(deps),
    ...kitchenActions(deps),
    ...readingActions(deps),
    ...travelActions(deps),
    reload() {
      saveNow();
      location.reload();
    },
    calm() {
      problems.calm();
      shell.set({ modal: null });
    },
  };

  createPanels({
    root: document.getElementById('ui'),
    game,
    intents,
    shell,
    platform,
    actions,
    here,
    report,
    spot: () => world.headOnScreen(),
  });
  document.getElementById('boot')?.remove();

  growthNotices(game, shell);
  dietNotices(game, shell);
  pulseNotices(game, shell);
  if (!game.ask('growth').origin) actions.origin();
  if (loadProblem) actions.saves();

  intents.on('tool', data => {
    const id = data.id || TOOLS[data.index]?.id;
    if (id && !shell.paused())
      shell.set({ tool: id, manualTool: !(shell.get().manualTool && shell.get().tool === id) });
  });
  intents.on('tool.step', data => !shell.paused() && shell.stepTool(data.by));
  // 拿起行囊里的一格：种子拿在手里就是要播这一种；再点同一格是放下，空着手
  intents.on('hold', data => {
    if (shell.paused()) return;
    const slots = game.ask('pack', here()).slots;
    const slot = data.key ? slots.find(s => s.key === data.key) : slots[data.index];
    const now = shell.get();
    if (!slot || slot.key === now.held) {
      const seedHeld = now.manualTool && now.tool === 'seed' && now.held;
      return shell.set({ held: null, ...(seedHeld ? { manualTool: false } : {}) });
    }
    if (slot.slot === 'item' && slot.kind === 'seed')
      return shell.set({ held: slot.key, seed: slot.id, tool: 'seed', manualTool: true });
    return shell.set({ held: slot.key, manualTool: false });
  });

  game.onCommit(facts => {
    // 到了新地方，让工具栏重新按面前的东西挑。
    const hero = game.ask('hero').id;
    if (
      shell.get().manualTool &&
      facts.some(f => f.type === 'person.travelled' && f.data.who === hero)
    )
      shell.set({ manualTool: false });
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 400);
    // 刚醒来：另存一份“今天清早”，玩坏了能退回来
    if (saving && facts.some(f => f.type === 'day.started')) platform.storage.saveDawn(game.save());
  });
  platform.onHide(() => {
    intents.release();
    const at = here();
    if (at && !shell.paused()) game.dispatch('person.place', at);
    saveNow();
  });
  // 同一份进度在另一个页面里存了档：这边不再自动存，免得两边互相覆盖
  platform.onOtherTab(() => {
    if (!saving) return;
    stopSaving();
    shell.set({ modal: { kind: 'elsewhere' } });
  });

  // 时间：现实里每过一小会儿，游戏里就过十分钟。有小窗弹着、窗口不在前台时，时间不走。
  // 先约好下一帧再干活：这一帧出了错，时间照样往前走。
  let carried = 0;
  let last = performance.now();
  function tick(now) {
    requestAnimationFrame(tick);
    const seconds = Math.min(0.25, (now - last) / 1000);
    last = now;
    try {
      if (shell.paused() || document.visibilityState !== 'visible') return;
      if (game.ask('clock').stopped) return;
      carried += seconds / CALENDAR.realSecondsPerGameMinute;
      if (carried >= CALENDAR.tickMinutes) {
        carried -= CALENDAR.tickMinutes;
        game.dispatch('clock.advance', { minutes: CALENDAR.tickMinutes });
      }
    } catch (error) {
      report(error, 'time');
    }
  }
  requestAnimationFrame(tick);

  // 调试入口：网址带 ?debug 时，测试和控制台可以通过它直接操作。
  if (debug) window.__dao = { game, shell, intents, world, platform, problems };
}
