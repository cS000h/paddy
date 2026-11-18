// 界面面板：日期、身体（体力、饱、水、心情）、工具栏、提示条、流水、手记、各种小窗、触屏的摇杆和按钮。
// 面板不改世界：要做事就发意图或调用 actions（由 app 提供），要显示就问端口。
// 这个文件只管接线；常驻的几块在 hud.js，手记在 journal.js，小窗在 modals.js，摇杆在 stick.js。
import { animateTiming } from './timing.js';
import { modalView, closesOnBackdrop } from './modals.js';
import { HUD_HTML, renderHud, syncToolbar } from './hud.js';
import { journalView, nextStepView } from './journal.js';
import { bindStick } from './stick.js';
import { esc } from './html.js';

// 流水里不用特意告诉玩家的：干活花的体力（提示条上已经写了）、在行囊和橱柜之间挪东西。
const MOVES = new Set(['装进行囊', '从行囊里拿出来']);
const worthSaying = e => {
  if (e.k === 'energy') return e.d > 0;
  if (e.k.startsWith('item:') || e.k.startsWith('pack:'))
    return e.d > 0 && !!e.why && !MOVES.has(e.why);
  return true;
};

/**
 * @param {object} deps
 * @param {HTMLElement} deps.root
 * @param {object} deps.game 端口
 * @param {object} deps.intents 输入意图
 * @param {object} deps.shell 外壳状态
 * @param {object} deps.platform 平台
 * @param {object} deps.actions 按钮名字 → 做什么（app 提供）
 * @param {() => object|undefined} deps.here 操控的人此刻站在哪一格
 */
export function createPanels({ root, game, intents, shell, platform, actions, here }) {
  root.innerHTML = `${HUD_HTML}
    <aside class="card journal" data-id="journal" hidden></aside>
    <div class="hint" data-id="hint" hidden></div>
    <div class="stick" data-id="stick" hidden><i></i></div>
    <button class="do" data-id="do" hidden>做</button>
    <div class="toast" data-id="toast"></div>
    <div class="modal" data-id="modal" hidden></div>`;
  const el = Object.fromEntries(
    [...root.querySelectorAll('[data-id]')].map(node => [node.dataset.id, node]),
  );
  const sky = document.getElementById('sky');
  const veil = document.getElementById('veil');
  const small = profile => profile.narrow || profile.compact;
  const touch = () => platform.device.profile().touch;
  let journalOpen = !small(platform.device.profile());
  let toastTimer = 0;
  let seenLedger = game.ask('ledger').at(-1)?.seq || 0;
  let seed = shell.get().seed;

  // 常驻的几块，加上手记（开着时）或左上角的“下一步”（合着时）。
  function renderAll() {
    renderHud(el, { game, shell, platform });
    if (journalOpen) el.journal.innerHTML = journalView(game, touch());
    el.journal.hidden = !journalOpen;
    const next = journalOpen ? '' : nextStepView(game, touch());
    el.next.hidden = !next;
    el.next.innerHTML = next;
  }

  // 流水：上一条命令之后新记的几笔，在日期下面一行行冒出来，过一会儿自己淡掉。
  function renderFeed() {
    const fresh = game.ask('ledger', seenLedger);
    if (!fresh.length) return;
    seenLedger = fresh.at(-1).seq;
    for (const entry of fresh.filter(worthSaying).slice(-4)) {
      const line = document.createElement('p');
      line.className = entry.d > 0 || entry.k.startsWith('buff:') ? 'up' : 'down';
      line.innerHTML = `<b>${esc(entry.text)}</b>${entry.why ? esc(entry.why) : ''}`;
      el.feed.append(line);
      setTimeout(() => line.classList.add('gone'), 2600);
      setTimeout(() => line.remove(), 3200);
    }
    while (el.feed.children.length > 5) el.feed.firstElementChild.remove();
  }

  function renderModal(state) {
    el.modal.hidden = !state.modal;
    el.modal.innerHTML = state.modal ? modalView(state.modal, game, here()) : '';
  }

  function renderShell(state) {
    sky.style.backgroundColor = state.tint;
    veil.style.opacity = state.veil;
    const drawer = journalOpen && platform.device.profile().narrow;
    el.stick.hidden = el.do.hidden = !touch() || !!state.modal || drawer;
    el.hint.hidden = !state.hint || !!state.modal;
    if (state.hint) {
      el.hint.className = 'hint' + (state.hint.ok ? '' : ' no');
      el.hint.innerHTML =
        esc(state.hint.text) + (state.hint.ok && !touch() ? '<kbd>空格</kbd>' : '');
    }
    syncToolbar(el, state);
    renderModal(state);
  }

  let lastToast = null;
  function renderToast(state) {
    if (!state.toast || state.toast === lastToast) return;
    lastToast = state.toast;
    el.toast.textContent = state.toast.text;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(
      () => el.toast.classList.remove('show'),
      Math.max(1800, state.toast.text.length * 110),
    );
  }

  // 点击：按钮上写着 data-do（做什么）或 data-tool（选哪件工具）
  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    platform.audio.unlock();
    if (button.dataset.tool) return intents.emit('tool', { id: button.dataset.tool });
    const what = button.dataset.do;
    if (what === 'journal') {
      journalOpen = !journalOpen;
      renderAll();
      return renderShell(shell.get());
    }
    if (what === 'mute') {
      platform.audio.setMuted(!platform.audio.muted());
      return renderAll();
    }
    if (what === 'close') return shell.set({ modal: null });
    if (what && actions[what]) return actions[what](button.dataset);
    return undefined;
  });
  // 点小窗外面的空白处也能关掉（手机上长的小窗不用滚到底找按钮）；开局的选择除外。
  el.modal.addEventListener('click', event => {
    const modal = shell.get().modal;
    if (event.target === el.modal && modal && closesOnBackdrop(modal)) shell.set({ modal: null });
  });
  el.do.addEventListener('click', () => intents.emit('act'));
  bindStick(el.stick, intents, platform);

  // 有小窗的时候：确认键按主按钮，取消键关掉
  const offAct = intents.on('act', () => {
    if (shell.get().modal)
      (el.modal.querySelector('button.main') || el.modal.querySelector('button'))?.click();
  });
  const offCancel = intents.on('cancel', () => shell.get().modal && shell.set({ modal: null }));

  const offs = [
    animateTiming(root, shell),
    offAct,
    offCancel,
    // 世界变了：重画常驻的面板、冒出新的流水；开着的小窗也跟着重画（里面的数可能变了）
    game.onCommit(facts => {
      for (const f of facts.filter(f => f.type === 'achievement.earned')) {
        const stamp = document.createElement('div');
        stamp.className = 'award-stamp';
        stamp.textContent = '印 · ' + f.data.name;
        root.append(stamp);
        setTimeout(() => stamp.remove(), 3200);
      }
      renderAll();
      renderFeed();
      if (shell.get().modal) renderModal(shell.get());
    }),
    shell.subscribe(state => {
      // 换了菜种，工具栏上那一格的图和数也要换
      if (state.seed !== seed) {
        seed = state.seed;
        renderAll();
      }
      renderShell(state);
      renderToast(state);
    }),
    platform.device.onChange(profile => {
      if (small(profile) && journalOpen) journalOpen = false;
      // 键鼠和触屏说“怎么做”的话不一样，手记和“下一步”跟着重写
      renderAll();
      renderShell(shell.get());
    }),
  ];
  renderAll();
  renderShell(shell.get());
  return {
    refresh: renderAll,
    destroy() {
      offs.forEach(off => off());
      root.innerHTML = '';
    },
  };
}
