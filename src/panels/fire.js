// 亲自掌火的小窗：炒三拍（下料、翻锅、出锅）、炖守火（添柴、起锅）、烤翻面（翻面、出锅）。
// 这一锅的节拍、此刻锅里什么样子都问规则（cook.preview、cook.fire），这里只照着说、照着画、记下按的时刻。
// 画面先用灶台小图和几条进度；Gemini G-11 的设计图和火苗回来再换。
import { FIRE, FIRE_CUES } from '../content/cook-fire.js';
import { fill } from '../content/text.js';
import { button, actions, title } from './html.js';
import { stovePicture } from './stove-picture.js';

const pct = v => `${Math.max(0, Math.min(100, v))}%`;
const meter = (label, key, zone = null) =>
  `<p class="fire-bar"><span>${label}</span><i data-fire-${key}>` +
  (zone ? `<em style="left:${pct(zone[0])};width:${pct(zone[1] - zone[0])}"></em>` : '') +
  '<b></b></i></p>';

/** 这锅饭此刻能按哪几个键。烤到最后一面只剩出锅；炒没下料只能下料。 */
function keysFor(m, plan) {
  const log = m.log || [];
  if (m.method === 'fry') {
    if (!log.some(e => e[1] === 'add'))
      return [button('firePress', '下料', { main: true, data: { key: 'add' } })];
    return [
      button('firePress', '翻锅', { main: true, data: { key: 'toss' } }),
      button('cookFinish', '出锅'),
    ];
  }
  if (m.method === 'stew')
    return [
      button('firePress', '添柴', { main: true, data: { key: 'stoke' } }),
      button('cookFinish', '起锅'),
    ];
  const flips = log.filter(e => e[1] === 'flip').length;
  return flips >= plan.brown.length - 1
    ? [button('cookFinish', '出锅', { main: true })]
    : [button('firePress', '翻面', { main: true, data: { key: 'flip' } })];
}

/** 一段正当时 [from, from + long] 在「到正当时中间算一成」的条上占哪一截（条走到 max 倍为满）。 */
const window = (from, long, max) => {
  const mid = from + long / 2;
  return [(100 * from) / mid / max, (100 * (from + long)) / mid / max];
};

/** 进度条：炒是油温、火候，炖是火和汤，烤是这一面。正当时那一段标出来（随下料、翻面换）。 */
function barsFor(m, plan) {
  const log = m.log || [];
  if (m.method === 'stew') {
    const scale = plan.over + 30;
    const soup = [(100 * FIRE.stew.done) / scale, (100 * plan.over) / scale];
    return meter('火', 'fire', plan.band) + meter('汤', 'soup', soup);
  }
  if (m.method === 'fry') {
    if (!log.some(e => e[1] === 'add'))
      return meter('油温', 'cook', window(plan.smoke, plan.smokeLong, 1.4));
    return meter('火候', 'cook', window(plan.color, plan.colorLong, 1.4));
  }
  const side = Math.min(log.filter(e => e[1] === 'flip').length, plan.brown.length - 1);
  return meter('这一面', 'cook', window(plan.brown[side], plan.brownLong, 1.5));
}

export function fireView(m, game) {
  const p = game.ask('cook.preview', { ...inputOf(m), log: null });
  if (!p.ok || !p.plan)
    return `${title('亲自掌火', '')}${actions(button('backKitchen', '回灶台'))}`;
  const sub = m.method === 'roast' ? `${p.fire.word} · 共${p.plan.brown.length}面` : p.fire.word;
  return `${title('亲自掌火', sub)}
    <div class="fire-play">${stovePicture({ ...m, base: p.base }, 'heat')}<div>
      <p class="fire-cue" data-fire-cue>&nbsp;</p>
      ${barsFor(m, p.plan)}
      ${actions(button('backKitchen', '先不做了'), ...keysFor(m, p.plan))}</div></div>`;
}

/** 灶台小窗里挑好的那锅：食材、调料、做法、刀工（和 app/kitchen.js 发给规则的一样）。 */
export const inputOf = m => ({
  items: m.items || [],
  spices: m.spices || [],
  method: m.method || 'stew',
  cut: m.cut || null,
});

/** 此刻该说哪一句。 */
function cueOf(s) {
  const c = FIRE_CUES[s.method];
  if (s.method === 'fry') {
    const beat = c[s.beat];
    return s.now ? beat.now : s.cue ? beat.cue : s.late ? beat.late || beat.wait : beat.wait;
  }
  if (s.method === 'stew') {
    if (s.dry) return c.over;
    if (s.white) return c.white;
    return s.zone === 'out' ? c.low : c[s.zone];
  }
  if (s.late) return c.late;
  if (s.now) return s.last ? c.last : c.now;
  return s.cue ? c.cue : fill(c.wait, { k: '一二三四'[s.side] });
}

/** 掌火时每一帧：问规则此刻锅里怎样，换那一句、挪进度条、到了正当时亮一下；太久没出锅就替你出锅。 */
export function animateFire(root, shell, actions, game, platform) {
  let live = true;
  let lastCue = '';
  function frame(now) {
    if (!live) return;
    const m = shell.get().modal;
    if (m?.kind === 'heat' && m.started !== undefined) draw(m, now - m.started);
    requestAnimationFrame(frame);
  }
  function draw(m, t) {
    const s = game.ask('cook.fire', inputOf(m), m.log || [], Math.round(t));
    if (!s) return;
    const cue = root.querySelector('[data-fire-cue]');
    const text = cueOf(s);
    if (cue && cue.textContent !== text) {
      cue.textContent = text;
      cue.classList.toggle('now', !!(s.now || s.white || s.flare));
      cue.classList.toggle('warn', !!(s.late || s.dry || s.zone === 'out' || s.zone === 'hot'));
      if (text !== lastCue && (s.now || s.white)) platform.audio.play(s.flare ? 'bite' : 'nod');
      lastCue = text;
    }
    const set = (key, v) => {
      const bar = root.querySelector(`[data-fire-${key}] b`);
      if (bar) bar.style.width = pct(v);
    };
    if (s.method === 'stew') {
      set('fire', s.fire);
      set('soup', (s.soup * 100) / (s.over + 30));
      const bar = root.querySelector('[data-fire-fire]');
      bar?.classList.toggle('hot', s.zone === 'hot');
      bar?.classList.toggle('weak', s.zone === 'out' || s.zone === 'cold');
    } else if (s.method === 'fry')
      set('cook', (100 * (s.beat === 'heat' ? s.warm : s.cooked)) / 1.4);
    else set('cook', (100 * s.browned) / 1.5);
    const art = root.querySelector('[data-cook-heat]');
    const pose = String(Math.floor(t / 180) % 8);
    if (art && art.style.getPropertyValue('--pose') !== pose) art.style.setProperty('--pose', pose);
    root.querySelector('.fire-play')?.classList.toggle('hot', !!(s.now || s.flare));
    // 太久没出锅：替你出锅（炖到时辰熬干了，炒、烤早就焦了）
    if (t > 26000 && !m.finishing) actions.cookFinish();
  }
  requestAnimationFrame(frame);
  return () => {
    live = false;
  };
}
