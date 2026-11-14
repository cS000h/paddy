// 界面面板：日期、体力、工具栏、提示条、手记、对话小窗、触屏的摇杆和按钮。
// 面板不改世界：要做事就发意图或调用 actions（由 app 提供），要显示就问端口。
import { TOOLS } from '../content/items.js';
import { icon } from '../art/index.js';
import { modalView } from './modals.js';

const esc = text =>
  String(text).replace(
    /[&<>"]/g,
    ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch],
  );

function iconUrl(name) {
  const grid = icon(name);
  const canvas = document.createElement('canvas');
  canvas.width = grid.w;
  canvas.height = grid.h;
  canvas.getContext('2d').putImageData(new ImageData(grid.bytes(), grid.w, grid.h), 0, 0);
  return canvas.toDataURL();
}

export function createPanels({ root, game, intents, shell, platform, actions }) {
  const icons = Object.fromEntries(
    ['hoe', 'seed', 'can', 'hand', 'coin'].map(n => [n, iconUrl(n)]),
  );
  root.innerHTML = `
    <div class="card date"><span class="seal">稻</span><div><b data-id="date"></b><small data-id="time"></small></div></div>
    <div class="card vitals">
      <span>体力</span><div class="bar" data-id="bar"><i></i></div><span data-id="energy"></span>
      <img class="pixel" width="16" height="16" src="${icons.coin}" alt="铜钱" /><span data-id="coins"></span>
      <button data-do="journal">手记</button><button data-do="mute" data-id="mute"></button>
    </div>
    <aside class="card journal" data-id="journal" hidden></aside>
    <div class="hint" data-id="hint" hidden></div>
    <nav class="card toolbar" data-id="toolbar"></nav>
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
  let journalOpen = !small(platform.device.profile());
  let toastTimer = 0;

  function renderHud() {
    const clock = game.ask('clock');
    const hero = game.ask('hero');
    const home = game.ask('home');
    el.date.textContent = `${clock.seasonName} · 第 ${clock.dayOfSeason} 日`;
    el.time.textContent = `${clock.period} ${clock.clock} · ${clock.hour}`;
    el.bar.firstElementChild.style.width = `${(hero.energy / hero.energyMax) * 100}%`;
    el.bar.classList.toggle('low', hero.energy < 20);
    el.energy.textContent = hero.energy;
    el.coins.textContent = home.coins;
    el.mute.textContent = platform.audio.muted() ? '声·关' : '声·开';
    const count = id => home.items.find(i => i.id === id)?.n || 0;
    const badge = {
      seed: count('seed.qingcai'),
      can: `${home.can}/${home.canMax}`,
      hand: count('veg.qingcai') || '',
    };
    const current = shell.get().tool;
    el.toolbar.innerHTML = TOOLS.map(
      (
        tool,
        i,
      ) => `<button data-tool="${tool.id}" class="${tool.id === current ? 'on' : ''}" title="${tool.verb}">
        <em>${i + 1}</em><i>${badge[tool.id] ?? ''}</i>
        <img class="pixel" src="${icons[tool.id]}" alt="" />${tool.name}</button>`,
    ).join('');
    if (journalOpen) renderJournal(home);
    el.journal.hidden = !journalOpen;
  }

  function renderJournal(home) {
    const goals = game.ask('guide');
    const next = goals.find(g => !g.done);
    el.journal.innerHTML = `
      <h2>手记</h2>
      <ul>${goals
        .map(
          g =>
            `<li class="${g.done ? 'done' : ''}"><span>${esc(g.text)}${g === next ? `<small>${esc(g.hint)}</small>` : ''}</span></li>`,
        )
        .join('')}</ul>
      <h3>竹篮里</h3>
      <ul>${home.items.map(i => `<li><span>${esc(i.name)}</span><span>${i.n}</span></li>`).join('') || '<li>空的</li>'}</ul>
      <h3>乡邻</h3>
      <ul>${game
        .ask('bonds')
        .map(
          b =>
            `<li><span>${esc(b.name)}<small>${esc(b.role)}</small></span><span>${b.known ? '熟悉 ' + b.known : '还没说过话'}</span></li>`,
        )
        .join('')}</ul>
      <button class="danger" data-do="reset">重新开始</button>`;
  }

  function renderShell(state) {
    sky.style.backgroundColor = state.tint;
    veil.style.opacity = state.veil;
    const touch = platform.device.profile().touch;
    const drawer = journalOpen && platform.device.profile().narrow;
    el.stick.hidden = el.do.hidden = !touch || !!state.modal || drawer;
    el.hint.hidden = !state.hint || !!state.modal;
    if (state.hint) {
      el.hint.className = 'hint' + (state.hint.ok ? '' : ' no');
      el.hint.innerHTML = esc(state.hint.text) + (state.hint.ok && !touch ? '<kbd>空格</kbd>' : '');
    }
    for (const button of el.toolbar.children)
      button.classList.toggle('on', button.dataset.tool === state.tool);
    el.modal.hidden = !state.modal;
    el.modal.innerHTML = state.modal
      ? `<div class="sheet">${modalView(state.modal, game, esc)}</div>`
      : '';
  }

  let lastToast = null;
  function renderToast(state) {
    if (!state.toast || state.toast === lastToast) return;
    lastToast = state.toast;
    el.toast.textContent = state.toast.text;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), 1800);
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
      renderHud();
      return renderShell(shell.get());
    }
    if (what === 'mute') {
      platform.audio.setMuted(!platform.audio.muted());
      return renderHud();
    }
    if (what === 'close') return shell.set({ modal: null });
    if (what && actions[what]) return actions[what](button.dataset);
    return undefined;
  });
  el.do.addEventListener('click', () => intents.emit('act'));

  // 有小窗的时候：确认键按主按钮，取消键关掉
  const offAct = intents.on('act', () => {
    if (shell.get().modal)
      (el.modal.querySelector('button.main') || el.modal.querySelector('button'))?.click();
  });
  const offCancel = intents.on('cancel', () => shell.get().modal && shell.set({ modal: null }));

  // 摇杆：手指离圆心多远就是多大的方向
  const knob = el.stick.firstElementChild;
  const stickMove = event => {
    const box = el.stick.getBoundingClientRect();
    const radius = box.width / 2;
    // 手指离圆心的位移；画面转过来的时候，方向也要跟着转
    const offset = platform.viewport.toLocalDelta(
      event.clientX - box.left - radius,
      event.clientY - box.top - radius,
    );
    let x = offset.x / radius;
    let y = offset.y / radius;
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    knob.style.transform = `translate(${x * radius * 0.6}px, ${y * radius * 0.6}px)`;
    intents.setMove('stick', Math.abs(x) < 0.25 ? 0 : x, Math.abs(y) < 0.25 ? 0 : y);
  };
  const stickEnd = () => {
    knob.style.transform = '';
    intents.setMove('stick', 0, 0);
  };
  el.stick.addEventListener('pointerdown', event => {
    platform.viewport.lockLandscape();
    el.stick.setPointerCapture(event.pointerId);
    stickMove(event);
  });
  el.stick.addEventListener('pointermove', event => event.buttons && stickMove(event));
  el.stick.addEventListener('pointerup', stickEnd);
  el.stick.addEventListener('pointercancel', stickEnd);

  const offs = [
    offAct,
    offCancel,
    game.onCommit(renderHud),
    shell.subscribe(state => (renderShell(state), renderToast(state))),
    platform.device.onChange(profile => {
      if (small(profile) && journalOpen) {
        journalOpen = false;
        renderHud();
      }
      renderShell(shell.get());
    }),
  ];
  renderHud();
  renderShell(shell.get());
  return {
    refresh: renderHud,
    destroy() {
      offs.forEach(off => off());
      root.innerHTML = '';
    },
  };
}
