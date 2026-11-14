// 启动入口：把平台、规则（经由端口）、输入意图、世界画面、界面面板接到一起。
// 这里也放“跨着几块的流程”：过夜、送礼、收菜筐、存档、时间流逝。
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

const platform = createWebPlatform(document.getElementById('app'));
const debug = platform.debug();
const onError = error => console.error(error);

// 读档；读不了就开新的一局，旧档留在原处不删（下一次保存才会盖掉）。
let game;
try {
  game = createGame({ saved: platform.storage.load(), seed: platform.seed(), debug, onError });
} catch (error) {
  console.warn('存档读不了，开新的一局：', error);
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

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const here = () => world.heroAt() || undefined;

/** 发命令；被拒绝就把原因说给玩家。 */
function run(type, input) {
  const out = game.dispatch(type, input);
  if (!out.ok) shell.toast(out.reason);
  return out;
}

// 面板上的按钮能做的事。按钮写 data-do="名字"，带的 data-* 会传进来。
const actions = {
  bag() {
    shell.set({ modal: { kind: 'bag' } });
  },
  eat({ item }) {
    run('eat', { item, at: here() });
  },
  sip() {
    run('sip', { at: here() });
  },
  packPut({ item, n }) {
    run('pack.put', { item, n: n === 'all' ? n : Number(n), at: here() });
  },
  packTake({ item, n }) {
    run('pack.take', { item, n, at: here() });
  },
  drink() {
    const m = shell.get().modal;
    run('drink', { x: m.x, y: m.y, at: here() });
  },
  refill() {
    const m = shell.get().modal;
    run('farm.refill', { x: m.x, y: m.y, at: here() });
  },
  async sleep() {
    shell.set({ modal: null, veil: 1 });
    await wait(650);
    const out = run('sleep', { at: here() });
    await wait(350);
    shell.set({ veil: 0 });
    if (!out.ok) return;
    const day = game.ask('clock').day;
    const notes = game.ask('notes', day);
    if (notes.length) shell.set({ modal: { kind: 'notes', day, notes } });
    else shell.toast(`第 ${day} 日的清早。`);
  },
  gift({ to, item }) {
    const modal = shell.get().modal;
    const out = run('gift', { to, item, at: here() });
    if (!out.ok) return;
    const line = out.facts.find(f => f.type === 'gift.given').data.line;
    shell.set({ modal: { ...modal, line, gifted: true } });
  },
  basketPut({ item, n }) {
    if (run('basket.put', { item, n: Number(n), at: here() }).ok)
      shell.set({ modal: { kind: 'basket' } });
  },
  basketOrder({ item, n }) {
    if (run('basket.order', { item, n: Number(n), at: here() }).ok)
      shell.set({ modal: { kind: 'basket' } });
  },
  reset() {
    shell.set({
      modal: {
        kind: 'confirm',
        title: '重新开始',
        text: '要从春天的第一日重新来过吗？现在的进度会被清掉。',
        yes: 'resetNow',
        label: '重新开始',
      },
    });
  },
  resetNow() {
    saving = false;
    platform.storage.clear();
    location.reload();
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
});

intents.on('tool', data => {
  const id = data.id || TOOLS[data.index]?.id;
  if (id) shell.set({ tool: id });
});
intents.on('tool.step', data => shell.stepTool(data.by));

// 存档：每次世界有变化之后稍等一下再存；窗口被切走时立刻存，并记下站在哪儿。
let saving = true;
let saveTimer = 0;
const saveNow = () => saving && platform.storage.save(game.save());
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
