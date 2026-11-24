// 手记：头几天的小目标、行囊里有什么、和乡邻熟到什么程度、约了谁。
// 手记合上的时候，左上角留一行“下一步”，新来的人不用翻手记也知道接着做什么。
import { fill } from '../content/text.js';
import { doWord } from '../shell/words.js';
import { tierWord } from '../content/talk.js';
import { esc } from './html.js';

/** 目标底下那行小字：按这台设备的说法讲怎么做（按空格，或点“做”）。 */
const hintOf = (goal, touch) => fill(goal.hint, { do: doWord(touch) });

export function journalView(game, touch, tab) {
  const goals = game.ask('guide');
  const next = goals.find(g => !g.done);
  const pack = game.ask('pack');
  const goalRows = goals.map(g => {
    const hint = g === next ? `<small>${esc(hintOf(g, touch))}</small>` : '';
    return `<li class="${g.done ? 'done' : ''}"><span>${esc(g.text)}${hint}</span></li>`;
  });
  const packRows = pack.items.map(i => `<li><span>${esc(i.name)}</span><span>${i.n}</span></li>`);
  // 乡邻那页：熟到哪一层，和他待你的好感；指上去看好感是哪几样加减的（人情账的样子等 A-03）
  const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n);
  const bondRows = game.ask('bonds').map(b => {
    const known = b.known ? tierWord(b.known) : '还没说过话';
    const liked = b.favorite ? `爱吃${b.favorite}` : b.role;
    const o = game.ask('opinion', b.id);
    const why = o.parts.map(p => `${p.label} ${signed(p.delta)}`).join('，') || '还没什么来由';
    return (
      `<li title="${esc(why)}"><span>${esc(b.name)}<small>${esc(liked)}</small></span>` +
      `<span>${known}<small>好感 ${signed(o.value)}</small></span></li>`
    );
  });
  const date = game.ask('visits').active;
  const day = game.ask('clock').day;
  const dateRow = date
    ? `<p class="appointment">${date.day === day ? '今天' : '明天'}午前 · 樟树茶摊 · ${esc(date.name)}</p>`
    : '';
  const tabs = [
    ['goals', '记事'],
    ['pack', '行囊'],
    ['people', '乡邻'],
  ]
    .map(
      ([id, label]) =>
        `<button data-do="journalTab" data-tab="${id}" aria-pressed="${tab === id}">${label}</button>`,
    )
    .join('');
  const dishes = pack.dishes.map(d => `<li>${esc(d.name)}</li>`).join('');
  const buff = game.ask('body').buff;
  const pages = {
    goals: `<ul>${goalRows.join('')}</ul>
      <button data-do="saves">进度与玩法</button><button class="danger" data-do="reset">重新开始</button>`,
    pack: `<h3>已用 ${pack.used}/${pack.cap} 格</h3><ul>${packRows.join('') + dishes || '<li>空的</li>'}</ul>
      ${buff ? `<p><b>${esc(buff.name)}</b> · ${esc(buff.text)}</p>` : ''}`,
    people: `${dateRow}<ul>${bondRows.join('')}</ul>`,
  };
  return `<header><h2>手记</h2><button data-do="journal" aria-label="收起手记">×</button></header>
    <nav aria-label="手记分页">${tabs}</nav><section>${pages[tab]}</section>`;
}

/** 下一个还没做到的目标那一行；目标都做完了是空字符串。 */
export function nextStepView(game, touch) {
  const next = game.ask('guide').find(g => !g.done);
  if (!next) return '';
  return `<b>下一步</b><span>${esc(next.text)}</span><small>${esc(hintOf(next, touch))}</small>`;
}
