// 出锅以后那一张（照 Gemini G-11 的「出锅」设计图）：一眼看出做成了什么菜、哪一档火候、是不是全中、
// 是不是头一回做。左边灶台上摆着这道菜，右边菜的小图（拿手、全中换暖金双线框）、名字、饱腹和心情、
// 出锅那句、这一锅每一拍怎样；底下「端走」「回灶台」「再做一锅」（亲自掌火做的，再做一锅直接再掌一回火）。
// 不弹大字、不闪。
import { FIRE_PERFECT, FIRE_TWISTS } from '../content/cook-fire.js';
import { QUALITY, HEAT } from '../content/recipes.js';
import { button, actions, esc } from './html.js';
import { servedImg } from './stove-picture.js';

const chip = (text, cls) => `<span class="fire-chip ${cls}">${esc(text)}</span>`;
const WORD = { right: '正好', near: '差一点', early: '早了', late: '晚了', missed: '没按' };
const CN = '零一二三四五六七八九十';
/** 几回、几面：二说成两。 */
const count = n => (n === 2 ? '两' : CN[Math.min(10, n)]);

/** 这一锅每一拍怎样，一句说完。 */
export function beatsText(c) {
  const b = c.beats;
  if (c.method === 'mix') return '凉拌不用火';
  if (!b) return '稳稳做的家常火候';
  if (c.method === 'fry')
    return c.perfect ? '三拍全中' : `下料${WORD[b.heat]} · 翻锅 ${b.toss} · 出锅${WORD[b.serve]}`;
  if (c.method === 'stew') {
    const steady = `小火守住${CN[Math.min(10, Math.round(b.steady / 10))]}成`;
    return `${steady} · ${b.boils ? `扑了${count(b.boils)}回锅` : '没扑锅'}`;
  }
  const right = b.sides.filter(v => v === 'right').length;
  return right === b.sides.length
    ? '面面金黄'
    : `${count(b.sides.length)}面里翻准了${count(right)}面`;
}

export function cookedView(m, game, here) {
  const c = m.cooked || {};
  const q = QUALITY[c.quality] || QUALITY.plain;
  const kitchen = game.ask('kitchen', here);
  const onStove = kitchen.dishes.find(d => d.id === m.servedId);
  const dish = onStove || kitchen.carried.find(d => d.id === m.servedId);
  const gold = c.perfect || c.quality === 'great';
  const chips = [
    c.first && chip('头一回做', 'first'),
    c.perfect && chip(FIRE_PERFECT[c.method].name, 'gold'),
    c.twist && chip(FIRE_TWISTS[c.twist].name, 'twist'),
    chip(q.name, gold ? 'gold' : q.mood > 0 ? 'done' : q.mood < 0 ? 'warn' : 'cur'),
  ].filter(Boolean);
  const wood = game.ask('goods', here).find(i => i.id === 'wood')?.n || 0;
  const mood = q.mood > 0 ? ` · 心情 +${q.mood}` : '';
  const note = [beatsText(c), c.first ? '已记入菜谱册' : '', q.xp ? '厨艺长了一点' : '']
    .filter(Boolean)
    .join(' · ');
  const fire = c.method === 'mix' ? '凉拌' : HEAT[c.method]?.word || '';
  return `<header class="fire-head"><h2>出锅了<small>${esc(fire)} · ${esc(c.servings)}份</small></h2>
      <p class="fire-chips">${chips.join('')}</p></header>
    <div class="fire-play">
      <div class="fire-scene" data-fire-scene><canvas class="fire-canvas" data-fire-canvas></canvas></div>
      <div class="fire-side">
        <div class="cooked-card${gold ? ' gold' : ''}">${dish ? servedImg(dish) : ''}
          <p><b>${esc(c.name)}</b><small>饱腹 +${esc(c.full)}${mood}</small></p></div>
        <p class="cooked-line">${esc(c.line)}</p>
        <p class="cooked-note">${esc(note)}</p>
        ${actions(
          onStove ? button('cookedPack', '端走', { data: { id: m.servedId } }) : '',
          button('cookedBack', '回灶台'),
          button('cookAgain', '再做一锅', {
            main: true,
            cls: 'fire-key',
            html: `再做一锅<small>家里和身上余柴 ${wood} 根</small>`,
          }),
        )}
      </div>
    </div>`;
}
