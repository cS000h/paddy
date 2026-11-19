// 界面面板：日期、身体、工具栏、提示、手记、各种小窗、触屏的摇杆圈和那枚“做”的印、冒出来的字。
// 面板不改世界：要做事就发意图或调用 actions（由 app 提供），要显示就问端口。
// 这个文件只管接线；常驻的几块在 hud.js，手记在 journal.js，小窗在 modals.js，
// 摇杆圈在 stick.js，冒出来的字在 captions.js，得了成就、新衣时落下的纸条在 award.js。
import { animateTiming } from './timing.js';
import { modalView, brokenSheet, closesOnBackdrop, placementOf } from './modals.js';
import { HUD_HTML, renderHud, syncToolbar, syncStamp } from './hud.js';
import { journalView, nextStepView } from './journal.js';
import { bindStick } from './stick.js';
import { createCaptions, typeOut } from './captions.js';
import { createAwards, slipOf } from './award.js';
import { esc } from './html.js';

// 不必飘出来的流水：干活花的体力（印上和提示条上已经写了）、在行囊和橱柜之间挪东西。
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
 * @param {() => ({x: number, y: number}|null)} [deps.spot] 操控的人头顶在画面上的位置
 * @param {(error: unknown, where: string) => void} [deps.report] 面板里出错交给谁（默认抛出）
 */
export function createPanels({
  root,
  game,
  intents,
  shell,
  platform,
  actions,
  here,
  spot = () => null,
  report = error => {
    throw error;
  },
}) {
  root.innerHTML = `${HUD_HTML}
    <aside class="card journal" data-id="journal" hidden></aside>
    <div class="hint" data-id="hint" hidden></div>
    <div class="stick" data-id="stick" hidden><i></i></div>
    <button class="do" data-id="do" hidden></button>
    <div class="modal" data-id="modal" hidden></div>`;
  const el = Object.fromEntries(
    [...root.querySelectorAll('[data-id]')].map(node => [node.dataset.id, node]),
  );
  const veil = document.getElementById('veil');
  const captions = createCaptions(root, spot);
  const awards = createAwards(root);
  const small = profile => profile.narrow || profile.compact;
  const touch = () => platform.device.profile().touch;
  let journalOpen = false;
  let journalTab = 'goals';
  let seenLedger = game.ask('ledger').at(-1)?.seq || 0;
  let seed = shell.get().seed;
  let shownModal = null; // 画在纸上的是哪一个小窗（同一个就不重画，免得滚动位置跳回顶上）
  let finishTyping = () => {};
  let nextTimer = 0;

  /** 字变了才换，不变就不碰 DOM。 */
  const fill = (node, html) => {
    if (node.innerHTML !== html) node.innerHTML = html;
  };

  // 常驻的几块，加上手记（开着时）或左上角的“下一步”（合着时）。
  function renderAll() {
    root.classList.toggle('touch', touch());
    renderHud(el, { game, shell });
    if (journalOpen) fill(el.journal, journalView(game, touch(), journalTab));
    el.journal.hidden = !journalOpen;
    const next = journalOpen ? '' : nextStepView(game, touch());
    el.next.hidden = !next;
    fill(el.next, next);
  }

  // “下一步”：刚换了目标时连怎么做一起说，过一会儿收成一行；点一下再展开。
  function openNext() {
    el.next.classList.add('open');
    clearTimeout(nextTimer);
    nextTimer = setTimeout(() => el.next.classList.remove('open'), 9000);
  }

  // 流水：上一条命令之后新记的几笔，从人头顶飘起来，一两秒就散。
  function renderFeed() {
    const fresh = game.ask('ledger', seenLedger);
    if (!fresh.length) return;
    seenLedger = fresh.at(-1).seq;
    const said = fresh.filter(worthSaying).slice(-3);
    captions.float(said.map(e => ({ text: e.text, up: e.d > 0 || e.k.startsWith('buff:') })));
  }

  function renderModal(state, force = false) {
    const modal = state.modal;
    root.classList.toggle('modal-open', !!modal);
    root.dataset.place = modal ? placementOf(modal) : '';
    const morning = modal?.kind === 'notes';
    if (root.dataset.morning !== String(morning)) {
      root.dataset.morning = String(morning);
      for (const node of root.children) if (node !== el.modal) node.inert = morning;
    }
    el.modal.hidden = !modal;
    if (!modal) {
      shownModal = null;
      finishTyping();
      return void (el.modal.innerHTML = '');
    }
    if (modal === shownModal && !force) return;
    const sameKind = shownModal?.kind === modal.kind;
    const sameLine = sameKind && shownModal?.line === modal.line;
    shownModal = modal;
    const scroller = el.modal.querySelector('.sheet');
    const keep = force && scroller ? scroller.scrollTop : 0;
    try {
      el.modal.className = 'modal ' + placementOf(modal);
      el.modal.innerHTML = modalView(modal, game, here());
      // 同一张纸上换衣、翻页或买东西时，保留纸的位置，只在打开时演入场。
      if (sameKind) el.modal.firstElementChild.style.animation = 'none';
    } catch (error) {
      el.modal.innerHTML = brokenSheet();
      report(error, 'panels:' + modal.kind);
      return;
    }
    if (keep) el.modal.querySelector('.sheet').scrollTop = keep;
    // 说话的那一句一个字一个字地出来；同一句重画时不再重来
    const say = el.modal.querySelector('.say');
    finishTyping();
    finishTyping = say && !sameLine ? typeOut(say) : () => {};
  }

  function renderShell(state) {
    veil.style.opacity = state.veil;
    if (state.modal && journalOpen) {
      journalOpen = false;
      renderAll();
    }
    const drawer = journalOpen && (touch() || small(platform.device.profile()));
    root.classList.toggle('drawer-open', drawer);
    el.toolbar.inert = !!state.modal || drawer;
    el.stick.hidden = el.do.hidden = !touch() || !!state.modal || drawer;
    el.hint.hidden = !state.hint || !!state.modal || touch();
    if (state.hint) {
      el.hint.className = 'hint' + (state.hint.ok ? '' : ' no');
      const html = esc(state.hint.text) + (state.hint.ok ? '<kbd>空格</kbd>' : '');
      fill(el.hint, html);
    }
    syncStamp(el.do, state.hint);
    syncToolbar(el, state);
    renderModal(state);
    if (state.modal?.kind === 'notes' && !el.modal.contains(document.activeElement))
      el.modal.querySelector('.main')?.focus();
  }

  let lastToast = null;
  function renderToast(state) {
    if (!state.toast || state.toast === lastToast) return;
    lastToast = state.toast;
    captions.say(state.toast.text);
  }

  // 按钮要做的事出错（包括 async 的），交给 report，不让它变成页面上没人接的错
  function run(fn, what) {
    try {
      const out = fn();
      if (out && typeof out.catch === 'function')
        out.catch(error => report(error, 'action:' + what));
    } catch (error) {
      report(error, 'action:' + what);
    }
  }

  // 只和这块屏幕有关的几件事，面板自己办：开合手记、声音、全屏、菜单、看身上的数
  const LOCAL = {
    journalTab({ tab }) {
      journalTab = tab;
      renderAll();
      el.journal.querySelector('section').scrollTop = 0;
      el.journal.querySelector(`[data-tab="${tab}"]`)?.focus();
    },
    journal() {
      if (shell.get().modal?.kind === 'menu') shell.set({ modal: null });
      journalOpen = !journalOpen;
      renderAll();
      renderShell(shell.get());
    },
    mute() {
      platform.audio.setMuted(!platform.audio.muted());
      LOCAL.menu();
    },
    async fullscreen() {
      shell.set({ modal: null });
      await platform.fullscreen.toggle();
    },
    menu() {
      const fs = platform.fullscreen;
      shell.set({
        modal: {
          kind: 'menu',
          muted: platform.audio.muted(),
          fullscreen: fs.available() ? fs.active() : null,
        },
      });
    },
    dismiss: () => shell.set({ modal: null }),
    close: () => shell.set({ modal: null }),
    next: openNext,
    vital({ vital }) {
      const node = el[vital];
      if (node) shell.toast(node.getAttribute('title'));
    },
  };

  // 点击：按钮上写着 data-do（做什么）或 data-tool（选哪件工具）
  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || button.disabled) {
      // 点在对话框里（不是按钮）：那句话还在一个字一个字地出，就让它一下子出完
      if (event.target.closest('.sheet.dialogue')) finishTyping();
      return;
    }
    platform.audio.unlock();
    if (button.dataset.tool) return intents.emit('tool', { id: button.dataset.tool });
    const what = button.dataset.do;
    if (LOCAL[what]) return run(() => LOCAL[what](button.dataset), what);
    if (what && actions[what]) return run(() => actions[what](button.dataset), what);
    return undefined;
  });
  // 点小窗外面的空白处也能关掉（手机上长的小窗不用滚到底找按钮）；开局的选择除外。
  el.modal.addEventListener('click', event => {
    const modal = shell.get().modal;
    if (event.target === el.modal && modal && closesOnBackdrop(modal)) shell.set({ modal: null });
  });
  el.do.addEventListener('click', () => intents.emit('act'));

  // 有小窗的时候：确认键按主按钮，取消键关掉
  const offAct = intents.on('act', () => {
    if (shell.get().modal)
      (el.modal.querySelector('button.main') || el.modal.querySelector('button'))?.click();
  });
  const offCancel = intents.on('cancel', () => {
    const modal = shell.get().modal;
    if (modal && closesOnBackdrop(modal)) shell.set({ modal: null });
    else if (!modal && journalOpen) LOCAL.journal();
  });
  let lastNext = '';

  const offs = [
    animateTiming(root, shell),
    offAct,
    offCancel,
    bindStick(el.stick, intents),
    // 世界变了：重画常驻的面板、飘出新的流水；开着的小窗也跟着重画（里面的数可能变了）
    game.onCommit(facts => {
      for (const f of facts) {
        const slip = slipOf(f, game);
        if (slip) awards.show(slip);
      }
      renderAll();
      renderFeed();
      const goal = el.next.textContent;
      if (goal && goal !== lastNext) openNext();
      lastNext = goal;
      if (shell.get().modal) renderModal(shell.get(), true);
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
  lastNext = el.next.textContent;
  if (lastNext) openNext();
  return {
    refresh: renderAll,
    destroy() {
      offs.forEach(off => off());
      awards.stop();
      captions.destroy();
      root.innerHTML = '';
    },
  };
}
