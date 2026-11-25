// 钓鱼的小窗：挑饵下竿 → 看漂 → 遛鱼 → 出鱼。水面那一幅是 Astra 画的（art/fishing-water.js）：
// 浮漂照规则给的时刻点头、下沉；遛鱼时每一帧问规则 fish.fight，鱼影离岸多远、线绷多紧照着画；
// 拉上来鱼出水，再弹一张鱼的大图（名字、几寸、哪一档、新纪录、极品，身边村民的那句话）。
// 规则怎么判都在 sim/plugins/fishing.js，这里只画和收手上的按下、松开。
import { fishingFrame } from '../art/fishing-water.js';
import { plainOf } from '../content/items.js';
import { costText } from '../shell/words.js';
import { button, actions, close, title, para, esc } from './html.js';
import { itemIconUrl } from './icons.js';

// 画布保持原始格数，放大交给 CSS。
export function paintFishing(canvas, spot, state) {
  const grid = fishingFrame(spot, state);
  if (canvas.width !== grid.w) canvas.width = grid.w;
  if (canvas.height !== grid.h) canvas.height = grid.h;
  canvas.getContext('2d').putImageData(new ImageData(grid.bytes(), grid.w, grid.h), 0, 0);
}

// 由事件边沿触发一次；持续收线时由调用方按节拍传 reel。
export function fishingCue(platform, cue) {
  platform.audio.play(cue);
  if (cue === 'bite') platform.haptic();
}

const water = hold =>
  `<div class="fish-scene"${hold ? ' data-fish-hold' : ''}><canvas class="fishing-water" data-fish-canvas></canvas></div>`;

const again = (data, bait) => {
  const keep = bait && data.bait.some(b => b.item === bait);
  return button('fishCast', keep ? '挂饵再下一竿' : '再下一竿', {
    main: true,
    data: keep ? { bait } : {},
    disabled: !!data.reason,
  });
};

/** 拉上来的那条：大图、名字、几寸、哪一档，几个记号。 */
function catchCard(c) {
  const marks = [
    c.first ? '<b class="fish-mark">头一回</b>' : '',
    c.record ? '<b class="fish-mark gold">新纪录</b>' : '',
    c.fine ? '<b class="fish-mark gold">极品</b>' : '',
    c.grade === 'huge' ? '<b class="fish-mark big">大家伙</b>' : '',
  ].join('');
  return `<div class="fish-catch grade-${esc(c.grade)}">
    <img class="fish-big" src="${itemIconUrl(c.item)}" alt="">
    <div class="fish-says">
      <p class="fish-name">${esc(c.name)}<small>${esc(c.lenText)} · ${esc(c.gradeWord)}</small></p>
      <p class="fish-marks">${marks}</p>
    </div>
  </div>`;
}

export function fishingView(m, game, here) {
  const data = game.ask('fishing', here);
  const spot = data.spot;
  const sub = spot ? `${spot.name} · ${spot.moodWord}` : '';
  const bait = data.bait[0];
  if (m.phase === 'float')
    return `${title('看漂', sub)}${water(false)}
      ${para('浮漂轻轻点几下别急，整个沉下去（鲤鱼是拖着走）再提竿；点水面也能提。', 'aside')}
      ${actions(button('fishQuit', '收竿'), button('fishHook', '提竿', { main: true }))}`;
  if (m.phase === 'fight')
    return `${title('遛鱼', '按住收线；鱼一冲（水花大、线发红）就松手')}${water(true)}
      ${actions(button('fishQuit', '收竿'), '<button class="main fish-hold" data-fish-hold>收线（按住）</button>')}`;
  // 结果页：水面和说的话并排（矮屏上竖着放不下），顺带碰上的事（捡到件衣裳）也写在这儿，不另冒字
  const aside = m.aside ? para(m.aside, 'fish-aside') : '';
  if (m.phase === 'caught') {
    const c = m.catch;
    return `${title('钓上来了', sub)}
      <div class="fish-result">${water(false)}<div>${catchCard(c)}
        ${para(c.line, 'aside')}${c.cheer ? para(c.cheer.line, 'fish-cheer') : ''}${aside}</div></div>
      ${actions(close('收竿', false), again(data, m.bait))}`;
  }
  if (m.phase === 'lost' || m.phase === 'missed')
    return `${title(m.phase === 'lost' ? '跑了' : '没钓着', sub)}
      <div class="fish-result">${water(false)}<div>${para(m.line || '', 'aside')}${aside}</div></div>
      ${actions(close('收竿', false), again(data, m.bait))}`;
  return `${title(spot ? spot.name : '钓鱼', spot ? `${spot.moodWord} · ${costText(data.cost)}` : '')}
    ${water(false)}
    ${para(data.reason || (bait ? '挂上蚯蚓，咬钩快，大鱼也多。' : '锄地、雨后翻石头能翻出蚯蚓，挂上咬钩快。'), 'aside')}
    ${actions(
      close('算了', false),
      bait
        ? button('fishCast', `挂${bait.name}下竿 ×${bait.n}`, {
            data: { bait: bait.item },
            disabled: !!data.reason,
          })
        : '',
      button('fishCast', '下竿', { main: true, disabled: !!data.reason }),
    )}`;
}

const KEYS = new Set([' ', 'e', 'enter', 'j']);

/** 看漂时此刻浮漂在做什么：点头、沉下去、被拖着走，或者静着；progress 是这一下做到几成。 */
function floatState(events, t) {
  for (const e of events || [])
    if (t >= e.at && t < e.at + e.dur) {
      const progress = (t - e.at) / e.dur;
      if (e.kind === 'nod') return { action: 'nod', progress, edge: e };
      return { action: e.drag ? 'drag' : 'bite', progress, edge: e };
    }
  return { action: 'wait', progress: 0, edge: null };
}

/**
 * 小窗开着时每一帧画水面：看漂照 modal.events，遛鱼照规则的 fish.fight，分出结果就交给 actions.fishLand；
 * 出鱼、跑鱼各演一小段。按住水面或「收线」（手指、鼠标，或者「做」的键）记成按下、松开；看漂时点水面就是提竿。
 */
export function animateFishing(root, shell, actions, platform) {
  let live = true;
  let holding = false;
  let landing = false;
  let heard = null; // 看漂时上一回响过的那一下（点头、咬钩各响一回）
  let reelAt = 0;
  let shown = null; // 上一回响过的结果（出水、断线各响一回）
  const phase = () => {
    const m = shell.get().modal;
    return m?.kind === 'fishing' ? m.phase : null;
  };
  const press = down => {
    if (phase() !== 'fight' || down === holding || landing) return;
    holding = down;
    actions.fishPress({ down });
  };
  const onDown = event => {
    if (phase() === 'float' && event.target.closest?.('[data-fish-canvas]')) {
      event.preventDefault();
      return actions.fishHook();
    }
    if (!event.target.closest?.('[data-fish-hold]')) return;
    event.preventDefault();
    press(true);
  };
  const onUp = () => press(false);
  const onKey = event => {
    if (!KEYS.has(event.key.toLowerCase()) || event.repeat || phase() !== 'fight') return;
    event.preventDefault();
    press(event.type === 'keydown');
  };
  root.addEventListener('pointerdown', onDown);
  addEventListener('pointerup', onUp);
  addEventListener('pointercancel', onUp);
  addEventListener('keydown', onKey, true);
  addEventListener('keyup', onKey, true);

  function draw(m, now) {
    const canvas = root.querySelector('[data-fish-canvas]');
    if (!canvas) return;
    const spot = m.spot || 'yard';
    const t = now - (m.started ?? now);
    if (m.phase === 'float') {
      const s = floatState(m.events, t);
      if (s.edge && s.edge !== heard) {
        heard = s.edge;
        fishingCue(platform, s.action === 'nod' ? 'nod' : 'bite');
      }
      return paintFishing(canvas, spot, s);
    }
    if (m.phase === 'fight' && !landing) {
      const s = actions.fishState(Math.round(t));
      if (!s) return undefined;
      if (holding && !s.running && now - reelAt > 160) {
        reelAt = now;
        platform.audio.play('reel');
      }
      paintFishing(canvas, spot, { action: 'fight', ...s, size: m.size });
      if (s.done) {
        landing = true;
        holding = false;
        actions.fishLand();
      }
      return undefined;
    }
    const k = Math.min(1, t / 900);
    if ((m.phase === 'caught' || m.phase === 'lost') && shown !== m.started) {
      shown = m.started;
      if (m.phase === 'caught') fishingCue(platform, 'splash');
      else if (m.why === 'snap') fishingCue(platform, 'snap');
      if (m.catch?.fine || m.catch?.grade === 'huge') {
        platform.audio.play('fine');
        platform.haptic([14, 60, 24]);
      }
    }
    if (m.phase === 'caught')
      return paintFishing(canvas, spot, {
        action: 'landed',
        progress: k,
        item: plainOf(m.catch.item),
      });
    if (m.phase === 'lost')
      return paintFishing(canvas, spot, {
        action: m.why === 'snap' ? 'snap' : 'slack',
        progress: k,
      });
    return paintFishing(canvas, spot, { action: 'wait' });
  }

  function frame(now) {
    if (!live) return;
    const m = shell.get().modal;
    if (m?.kind === 'fishing') draw(m, now);
    if (m?.kind !== 'fishing' || m.phase !== 'fight') {
      holding = false;
      landing = false;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return () => {
    live = false;
    root.removeEventListener('pointerdown', onDown);
    removeEventListener('pointerup', onUp);
    removeEventListener('pointercancel', onUp);
    removeEventListener('keydown', onKey, true);
    removeEventListener('keyup', onKey, true);
  };
}
