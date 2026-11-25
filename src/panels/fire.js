// 亲自掌火的小窗：炒三拍（下料、翻锅两下、出锅）、炖守火（添柴、起锅）、烤翻面（翻面、出锅）。
// 照 Gemini G-11 的设计图：小窗压在下半截，上面还看得见人在灶边；左边一幅灶台特写（art/stove-scene.js），
// 右边一句、几条、两个键，页眉右边几枚小牌子说到了哪一拍。点灶台那幅画也算按主键。
// 这一锅的节拍、此刻锅里怎样、刚按的那一下早了还是晚了都问规则（cook.preview、cook.fire），
// 这里只照着说、照着画、记下按的时刻。出锅以后那一张在 cooked.js。
import { FIRE_CUES, FIRE_HOW, FIRE_SAY, FIRE_SOUNDS } from '../content/cook-fire.js';
import { METHODS } from '../content/recipes.js';
import { kindOf } from '../content/items.js';
import { fill } from '../content/text.js';
import { stoveScene } from '../art/stove-scene.js';
import { button, actions, title, esc } from './html.js';

const pct = v => `${Math.max(0, Math.min(100, v))}%`;
const CN = '零一二三四五六七八九十';

/** 一条进度：左边名字，中间的条（几段标出来），右边一句小字。needle 的条只画一根针。 */
const meter = (label, key, zones = [], cls = '') =>
  `<p class="fire-bar ${cls}"><span>${label}</span><i data-fire-${key}>` +
  zones
    .map(([a, b, c]) => `<em class="${c}" style="left:${pct(a)};width:${pct(b - a)}"></em>`)
    .join('') +
  `<b></b></i><span class="fire-note" data-fire-note-${key}></span></p>`;

/** 一段正当时 [from, from + long] 在「到正当时中间算一成」的条上占哪一截（条走到 max 倍为满）。 */
const span = (from, long, max) => {
  const mid = from + long / 2;
  return [(100 * from) / mid / max, (100 * (from + long)) / mid / max, 'ok'];
};

/** 主键：大字下面一行小字说什么时候按。 */
const key = (action, label, sub, data = {}) =>
  button(action, label, {
    main: true,
    data,
    cls: 'fire-key',
    html: `${esc(label)}<small>${esc(sub)}</small>`,
  });

/** 这锅饭此刻能按哪两个键。炒没下料只能下料；烤到最后一面只剩出锅。 */
function keysFor(m, plan) {
  const log = m.log || [];
  if (m.method === 'fry') {
    if (!log.some(e => e[1] === 'add'))
      return [
        button('backKitchen', '先不做'),
        key('firePress', '下料', '锅沿冒青烟时点（空格）', { key: 'add' }),
      ];
    return [
      button('cookFinish', '出锅'),
      key('firePress', '翻锅', '火头窜高时点（空格）', { key: 'toss' }),
    ];
  }
  if (m.method === 'stew')
    return [
      button('cookFinish', '起锅'),
      key('firePress', '添柴', '轻点往上拱一截火', { key: 'stoke' }),
    ];
  const flips = log.filter(e => e[1] === 'flip').length;
  return [
    button('backKitchen', '先不做'),
    flips >= plan.brown.length - 1
      ? key('cookFinish', '出锅', '外皮金黄微裂时出锅')
      : key('firePress', '翻面', '烤黄时点这里翻过去', { key: 'flip' }),
  ];
}

/** 进度条：炒是油温、火候，炖是灶膛火和汤色，烤是这一面的火色。正当时那一段标出来（随下料、翻面换）。 */
function barsFor(m, plan, p) {
  const log = m.log || [];
  if (m.method === 'stew') {
    const scale = plan.over + 30;
    return (
      meter(
        '灶膛火',
        'fire',
        [
          [...plan.band, 'ok'],
          [p.boil, 100, 'hot'],
        ],
        'needle',
      ) + meter('汤色白', 'soup', [[(100 * p.done) / scale, (100 * plan.over) / scale, 'ok']])
    );
  }
  if (m.method === 'fry') {
    if (!log.some(e => e[1] === 'add'))
      return meter('油温', 'cook', [span(plan.smoke, plan.smokeLong, 1.4)]);
    return meter('火候', 'cook', [span(plan.color, plan.colorLong, 1.4)]);
  }
  const side = Math.min(log.filter(e => e[1] === 'flip').length, plan.brown.length - 1);
  return meter('这一面', 'cook', [span(plan.brown[side], plan.brownLong, 1.5)], 'needle roast');
}

/** 灶台小窗里挑好的那锅：食材、调料、做法、刀工（和 app/kitchen.js 发给规则的一样）。 */
export const inputOf = m => ({
  items: m.items || [],
  spices: m.spices || [],
  method: m.method || 'stew',
  cut: m.cut || null,
});

export function fireView(m, game) {
  const p = game.ask('cook.preview', { ...inputOf(m), log: null });
  if (!p.ok || !p.plan)
    return `${title('亲自掌火', p.reason || '')}${actions(button('backKitchen', '回灶台'))}`;
  const s = game.ask('cook.fire', inputOf(m), [], 0) || {};
  const tag =
    { fry: '三拍出镬气', stew: '守住小火' }[m.method] ||
    `翻面${p.plan.brown.length === 3 ? '两' : CN[p.plan.brown.length - 1]}回`;
  return `<header class="fire-head"><h2>掌火 · ${esc(METHODS[m.method])}<small>${esc(p.name)} · ${tag}</small></h2>
      <p class="fire-chips" data-fire-chips></p></header>
    <div class="fire-play">
      <div class="fire-scene" data-fire-scene data-base="${esc(p.base)}"><canvas class="fire-canvas" data-fire-canvas></canvas><b class="fire-sound" data-fire-sound></b></div>
      <div class="fire-side">
        <p class="fire-say"><b data-fire-cue>&nbsp;</b><small data-fire-hint>&nbsp;</small></p>
        ${barsFor(m, p.plan, s)}
        ${actions(...keysFor(m, p.plan))}
      </div>
    </div>`;
}

/** 此刻那一句（大字）。炖刚开火说一句「转小火」，扑了锅说一句「扑锅了」。 */
function cueOf(s, t, boiledAt) {
  const c = FIRE_CUES[s.method];
  if (s.method === 'fry') {
    const beat = c[s.beat];
    return s.now ? beat.now : s.cue ? beat.cue : s.late ? beat.late || beat.wait : beat.wait;
  }
  if (s.method === 'stew') {
    if (s.dry) return c.over;
    if (s.white) return c.white;
    if (t - boiledAt < 1500) return c.boiled;
    if (t < 1500) return c.start;
    if (s.zone === 'band' && s.soup >= s.done * 0.8) return c.cue;
    if (s.zone === 'hot' && s.fire < s.boil) return c.warm;
    return c[s.zone];
  }
  if (s.late) return s.last ? c.lastLate : c.late;
  if (s.now) return s.last ? c.last : c.now;
  if (s.cue) return s.last ? c.lastCue : c.cue;
  return fill(c.wait, { k: CN[s.side + 1] });
}

/** 那一句底下的小字：刚按了一下就说按得怎样，过一会儿换回怎么看、按什么。 */
function hintOf(s, t) {
  if (s.said && t - s.said.at < 1600) return [FIRE_SAY[s.said.key][s.said.v], s.said.v];
  const how = FIRE_HOW[s.method];
  return [typeof how === 'string' ? how : how[s.beat], ''];
}

const chip = (text, cls) => `<span class="fire-chip ${cls}">${esc(text)}</span>`;

/** 页眉右边的小牌子：炒三拍到了哪一拍，炖的汤几成白，烤到第几面。 */
function chipsOf(s, log) {
  if (s.method === 'fry') {
    const added = log.some(e => e[1] === 'add');
    const all = s.tossed >= s.flares;
    const toss = `② 翻锅 ${s.tossed ?? 0}/${s.flares ?? 2}`;
    return [
      added
        ? chip('① 下料 ✓', 'done')
        : chip(s.now ? '① 下料 · 正当时' : '① 下料', s.now ? 'now' : 'cur'),
      !added
        ? chip('② 翻锅', 'todo')
        : s.flare
          ? chip(`${toss} · 正当时`, 'now')
          : chip(all ? `${toss} ✓` : toss, all ? 'done' : 'cur'),
      s.beat === 'serve' && s.now
        ? chip('③ 出锅 · 正当时', 'now')
        : chip('③ 出锅', added ? 'cur' : 'todo'),
    ].join('');
  }
  if (s.method === 'stew') {
    const tenth = Math.min(9, Math.floor((s.soup / s.done) * 10));
    if (s.dry) return chip('汤快熬干了', 'warn');
    if (s.white) return chip('汤白了 · 起锅', 'now');
    return chip(tenth ? `汤${CN[tenth]}成白` : '汤还清着', 'cur');
  }
  const state = s.now ? ' · 正当时' : s.cue ? ' · 边沿微黄' : s.late ? ' · 要焦了' : '';
  return Array.from({ length: s.sides }, (_, k) =>
    k < s.side
      ? chip(`第${CN[k + 1]}面 ✓`, 'done')
      : k > s.side
        ? chip(`第${CN[k + 1]}面`, 'todo')
        : chip(`第${CN[k + 1]}面${state}`, s.now ? 'now' : s.late ? 'warn' : 'cur'),
  ).join('');
}

/** 条右边的小字。 */
function notesOf(s) {
  if (s.method === 'stew') {
    const b = s.band;
    const fire =
      s.fire >= s.boil
        ? '要扑锅'
        : s.fire > b[1]
          ? '偏旺'
          : s.fire >= b[0] + 6
            ? '小火'
            : s.fire >= b[0]
              ? '快掉出小火'
              : '火弱';
    const tenth = Math.min(9, Math.floor((s.soup / s.done) * 10));
    return { fire, soup: s.dry ? '熬过了' : s.white ? '汤白了' : `${CN[tenth]}成白` };
  }
  if (s.method === 'fry') {
    if (s.beat === 'heat')
      return { cook: s.now ? '冒青烟' : s.cue ? '起纹了' : s.late ? '冒黑烟' : '油热着' };
    return { cook: s.late ? '过了' : s.beat === 'serve' && s.now ? '正好' : '' };
  }
  return { cook: s.now ? '金黄正当时' : s.cue ? '边沿微黄' : s.late ? '发黑了' : '还白着' };
}

/** 灶台特写这一帧的样子：灶膛火几档、火头窜没窜、锅里下没下料、冒白气还是灰烟。 */
function viewOf(s) {
  if (s.method === 'fry') {
    const heat = s.beat === 'heat';
    const level = heat ? (s.now || s.late ? 'high' : 'mid') : s.rising || s.flare ? 'high' : 'mid';
    return { empty: heat, level, flare: !!s.flare, smoke: !!s.late };
  }
  if (s.method === 'stew') {
    const b = s.band;
    const level =
      s.fire <= b[0] ? 'out' : s.fire <= b[1] ? 'low' : s.fire < s.boil ? 'mid' : 'high';
    return { level, steam: s.soup >= s.done * 0.75, smoke: !!s.dry };
  }
  return { level: 'low', smoke: !!s.late };
}

// 按下去那一下的声音
const CLANG = {
  add: 'sizzle',
  toss: 'whoosh',
  stoke: 'crackle',
  flip: 'sizzle',
  flipMore: 'sizzle',
};

/** 画布保持原始格数，放大交给 CSS。 */
export function paintScene(canvas, grid) {
  if (canvas.width !== grid.w) canvas.width = grid.w;
  if (canvas.height !== grid.h) canvas.height = grid.h;
  canvas.getContext('2d').putImageData(new ImageData(grid.bytes(), grid.w, grid.h), 0, 0);
}

/** 这锅菜在画里什么样（画只认原来那几样，极品画出来一样）。 */
export const potOf = (m, base) => ({
  method: m.method || 'stew',
  items: (m.items || m.ingredients || []).map(kindOf),
  spices: m.spices || [],
  base,
});

/**
 * 掌火时每一帧：问规则此刻锅里怎样，画灶台、换那一句和小字、挪进度条、换小牌子；
 * 刚按了一下就在锅上冒一个字、响一声；太久没出锅就替你出锅。出锅以后那一张的灶台也在这儿画。
 */
export function animateFire(root, shell, actions, game, platform) {
  let live = true;
  let seen = { canvas: null, scene: '', cue: '', hint: '', chips: '', said: -1, boils: 0 };
  let boiledAt = -9999;
  function frame(now) {
    if (!live) return;
    const m = shell.get().modal;
    try {
      // 这一帧的时间戳可能比开火那一刻还早几毫秒，从零算
      if (m?.kind === 'heat' && m.started !== undefined) draw(m, Math.max(0, now - m.started));
      else if (m?.kind === 'cooked') served(m, now);
    } finally {
      requestAnimationFrame(frame);
    }
  }
  /** 小窗重画过（按了一下就会），记着的字都作废。 */
  function fresh(canvas) {
    if (seen.canvas === canvas) return;
    seen = { ...seen, canvas, scene: '', cue: '', hint: '', chips: '' };
  }
  function draw(m, t) {
    const canvas = root.querySelector('[data-fire-canvas]');
    if (!canvas) return;
    fresh(canvas);
    const log = m.log || [];
    const s = game.ask('cook.fire', inputOf(m), log, Math.round(t));
    if (!s) return;
    if (t < 100) [boiledAt, seen.boils, seen.said] = [-9999, 0, -1];
    if (s.method === 'stew' && s.boils > seen.boils) boiledAt = t;
    seen.boils = s.boils || 0;
    const view = viewOf(s);
    const tick = Math.floor(t / 140);
    const sceneKey = JSON.stringify([view, tick]);
    if (sceneKey !== seen.scene) {
      seen.scene = sceneKey;
      const base = canvas.closest('[data-fire-scene]')?.getAttribute('data-base') || '';
      paintScene(canvas, stoveScene(potOf(m, base), view, tick));
    }
    say(s, t);
    const chips = chipsOf(s, log);
    const strip = root.querySelector('[data-fire-chips]');
    if (strip && chips !== seen.chips) strip.innerHTML = seen.chips = chips;
    bars(s);
    root.querySelector('.fire-play')?.classList.toggle('hot', !!(s.flare || s.dry));
    // 太久没出锅：替你出锅（炖到时辰熬干了，炒、烤早就焦了）
    if (t > 26000 && !m.finishing) actions.cookFinish();
  }
  /** 那一句、底下的小字；刚按了一下，锅上冒一个字、响一声。 */
  function say(s, t) {
    const text = cueOf(s, t, boiledAt);
    const cue = root.querySelector('[data-fire-cue]');
    if (cue && text !== seen.cue) {
      if (seen.cue && (s.now || s.white)) platform.audio.play(s.flare ? 'whoosh' : 'nod');
      seen.cue = text;
      cue.textContent = text;
      cue.className = s.now || s.white || s.flare ? 'now' : s.late || s.dry ? 'warn' : '';
    }
    const [hint, how] = hintOf(s, t);
    const small = root.querySelector('[data-fire-hint]');
    if (small && hint !== seen.hint) {
      seen.hint = hint;
      small.textContent = hint;
      small.className = how === 'right' ? 'good' : how ? 'off' : '';
    }
    if (!s.said || s.said.at === seen.said) return;
    seen.said = s.said.at;
    const pop = root.querySelector('[data-fire-sound]');
    if (pop) {
      pop.textContent = FIRE_SOUNDS[s.said.key === 'flipMore' ? 'flip' : s.said.key] || '';
      pop.classList.remove('pop');
      void (/** @type {HTMLElement} */ (pop).offsetWidth);
      pop.classList.add('pop');
    }
    platform.audio.play(CLANG[s.said.key] || 'nod');
  }
  function bars(s) {
    const set = (k, v) => {
      const bar = root.querySelector(`[data-fire-${k}]`);
      const b = bar?.querySelector('b');
      if (!b) return;
      if (bar.closest('.needle')) b.style.left = pct(v);
      else b.style.width = pct(v);
    };
    if (s.method === 'stew') {
      set('fire', s.fire);
      set('soup', (s.soup * 100) / (s.over + 30));
    } else if (s.method === 'fry')
      set('cook', (100 * (s.beat === 'heat' ? s.warm : s.cooked)) / 1.4);
    else set('cook', (100 * s.browned) / 1.5);
    for (const [k, text] of Object.entries(notesOf(s))) {
      const note = root.querySelector(`[data-fire-note-${k}]`);
      if (note && note.textContent !== text) note.textContent = text;
    }
  }
  /** 出锅以后：灶台上摆着这道菜，灶膛里剩点小火。 */
  function served(m, now) {
    const canvas = root.querySelector('[data-fire-canvas]');
    if (!canvas) return;
    fresh(canvas);
    const tick = Math.floor(now / 160);
    const key = `served${tick % 4}`;
    if (key === seen.scene) return;
    seen.scene = key;
    const dish = m.cooked || {};
    const view = { level: dish.method === 'mix' ? null : 'low', served: true };
    const pot = potOf({ ...m.picks, method: dish.method }, dish.base || '');
    paintScene(canvas, stoveScene(pot, view, tick));
  }
  // 点灶台那幅画也算按主键（G-11：点这里或点锅翻炒）
  const tap = event => {
    if (!event.target.closest?.('[data-fire-scene]')) return;
    if (shell.get().modal?.kind !== 'heat') return;
    root.querySelector('.fire-side button.main')?.click();
  };
  root.addEventListener('click', tap);
  requestAnimationFrame(frame);
  return () => {
    live = false;
    root.removeEventListener('click', tap);
  };
}
