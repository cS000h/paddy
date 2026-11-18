// 界面面板：日期、身体（体力、饱、水、心情）、工具栏、提示条、流水、手记、各种小窗、触屏的摇杆和按钮。
// 面板不改世界：要做事就发意图或调用 actions（由 app 提供），要显示就问端口。
import { animateTiming } from './timing.js';
import { TOOLS } from '../content/items.js';
import { modalView } from './modals.js';
import { toolIconUrl } from './icons.js';
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
  const meter = (id, label) =>
    `<span class="meter ${id}" data-id="${id}"><b>${label}</b><span class="bar"><i></i></span></span>`;
  root.innerHTML = `
    <div class="card date"><span class="seal">稻</span><div><b data-id="date"></b><small data-id="time"></small><button data-do="weather" data-id="weather"></button></div></div>
    <div class="card vitals">
      <span class="meter energy"><b>体力</b><span class="bar" data-id="bar"><i></i></span><em data-id="energy"></em></span>
      ${meter('hunger', '饱')}${meter('thirst', '水')}${meter('mood', '心')}
      <span class="buff" data-id="buff" hidden></span>
      <span class="coins"><img class="pixel" width="16" height="16" src="${toolIconUrl('coin')}" alt="铜钱" /><span data-id="coins"></span></span>
      <button data-do="book">册子</button><button data-do="bag">行囊</button><button data-do="journal">手记</button><button data-do="mute" data-id="mute"></button>
    </div>
    <div class="feed" data-id="feed"></div>
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
  let seenLedger = game.ask('ledger').at(-1)?.seq || 0;

  function setMeter(node, value, word, low) {
    node.querySelector('i').style.width = `${value}%`;
    node.classList.toggle('low', low);
    node.title = word;
  }

  function renderHud() {
    const clock = game.ask('clock');
    const hero = game.ask('hero');
    const home = game.ask('home');
    const body = game.ask('body');
    const pack = game.ask('pack');
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
    el.coins.textContent = home.coins;
    el.mute.textContent = platform.audio.muted() ? '声·关' : '声·开';
    const carried = id => pack.items.find(i => i.id === id)?.n || 0;
    const badge = {
      seed: carried('seed.qingcai'),
      can: `${home.can}/${home.canMax}`,
      hand: carried('veg.qingcai') || '',
    };
    const current = shell.get().tool;
    el.toolbar.innerHTML =
      TOOLS.map(
        (
          tool,
          i,
        ) => `<button data-tool="${tool.id}" class="${tool.id === current ? 'on' : ''}" title="${tool.verb}">
        <em>${i + 1}</em><i>${badge[tool.id] ?? ''}</i>
        <img class="pixel" src="${toolIconUrl(tool.id)}" alt="" />${tool.name}</button>`,
      ).join('') + '<button data-do="seeds">选种</button><button data-do="field">田地</button>';
    if (journalOpen) renderJournal(pack);
    el.journal.hidden = !journalOpen;
  }

  function renderJournal(pack) {
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
      <h3>行囊里（${pack.used}/${pack.cap} 格）</h3>
      <ul>${pack.items.map(i => `<li><span>${esc(i.name)}</span><span>${i.n}</span></li>`).join('') || '<li>空的</li>'}</ul>
      <h3>乡邻</h3>
      <ul>${game
        .ask('bonds')
        .map(
          b =>
            `<li><span>${esc(b.name)}<small>${esc(b.role)}</small></span><span>${b.known ? '熟悉 ' + b.known : '还没说过话'}</span></li>`,
        )
        .join('')}</ul>
      <button data-do="saves">进度与玩法</button>
      <button class="danger" data-do="reset">重新开始</button>`;
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
      renderHud();
      renderFeed();
      if (shell.get().modal) renderModal(shell.get());
    }),
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
