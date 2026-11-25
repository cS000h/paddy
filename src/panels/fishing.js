// 钓鱼的小窗：下竿前挑饵、看漂、遛鱼。
// 这是规则做好时配的临时样子，Astra 的 A-05 照单子重做（水面特写、浮漂、鱼影），不用保留这里的画法。
// 规则怎么判都在 sim/plugins/fishing.js：浮漂照规则给的时刻点头、下沉；遛鱼每一帧问 fish.fight。
import { costText } from '../shell/words.js';
import { button, actions, close, title, para } from './html.js';

export function fishingView(m, game, here) {
  const data = game.ask('fishing', here);
  const spot = data.spot;
  const sub = spot ? `${spot.name} · ${spot.moodWord}` : '';
  if (m.phase === 'float')
    return `${title('看漂', sub)}
      <div class="fish-water"><i class="fish-float" data-fish-float></i></div>
      ${para('浮漂轻轻点几下别急，整个沉下去（或者被拖着走）再提竿。', 'aside')}
      ${actions(button('fishQuit', '收竿'), button('fishHook', '提竿', { main: true }))}`;
  if (m.phase === 'fight')
    return `${title('遛鱼', '按住收线；鱼一冲（水花大、线绷紧）就松手')}
      <div class="fish-bars">
        <label>鱼离岸<b><i data-fish-distance></i></b></label>
        <label>线绷着<b><i data-fish-tension></i></b></label>
      </div>
      ${actions(button('fishQuit', '收竿'), '<button class="main fish-hold" data-fish-hold>收线（按住）</button>')}`;
  const bait = data.bait[0];
  return `${title(spot ? spot.name : '钓鱼', spot ? `${spot.moodWord} · ${costText(data.cost)}` : '')}
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

/**
 * 看漂、遛鱼时每一帧跟着动：浮漂照 modal.events 点头、下沉；遛鱼时照规则的 fish.fight 画两根条，
 * 分出了结果就交给 actions.fishLand。按住「收线」（手指、鼠标，或者「做」的键）记成按下、松开。
 */
export function animateFishing(root, shell, actions) {
  let live = true;
  let holding = false;
  let landing = false;
  const fighting = () => {
    const m = shell.get().modal;
    return m?.kind === 'fishing' && m.phase === 'fight';
  };
  const press = down => {
    if (!fighting() || down === holding || landing) return;
    holding = down;
    actions.fishPress({ down });
  };
  const onDown = event => {
    if (!event.target.closest?.('[data-fish-hold]')) return;
    event.preventDefault();
    press(true);
  };
  const onUp = () => press(false);
  const onKey = event => {
    if (!KEYS.has(event.key.toLowerCase()) || event.repeat || !fighting()) return;
    event.preventDefault();
    press(event.type === 'keydown');
  };
  root.addEventListener('pointerdown', onDown);
  addEventListener('pointerup', onUp);
  addEventListener('pointercancel', onUp);
  addEventListener('keydown', onKey, true);
  addEventListener('keyup', onKey, true);

  function frame(now) {
    if (!live) return;
    const m = shell.get().modal;
    if (m?.kind === 'fishing' && m.started !== undefined) {
      const t = now - m.started;
      if (m.phase === 'float') {
        const float = root.querySelector('[data-fish-float]');
        let x = 0,
          y = 0;
        for (const e of m.events || [])
          if (t >= e.at && t < e.at + e.dur) {
            const k = (t - e.at) / e.dur;
            if (e.kind === 'nod') y = 5 * Math.sin(k * Math.PI);
            else if (e.drag) x = 24 * k;
            else y = 16;
          }
        if (float) float.style.transform = `translate(${x}px, ${y}px)`;
      } else if (m.phase === 'fight' && !landing) {
        const s = actions.fishState(Math.round(t));
        if (s) {
          root.querySelector('[data-fish-distance]')?.style.setProperty('width', s.distance + '%');
          const bar = root.querySelector('[data-fish-tension]');
          if (bar) {
            bar.style.width = s.tension + '%';
            bar.classList.toggle('tight', s.tension >= 70);
          }
          root.querySelector('.fish-bars')?.classList.toggle('running', s.running);
          if (s.done) {
            landing = true;
            holding = false;
            actions.fishLand();
          }
        }
      }
    } else {
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
