// 手记：头几天的小目标、行囊里有什么、和乡邻熟到什么程度、约了谁。
// 手记合上的时候，左上角留一行“下一步”，新来的人不用翻手记也知道接着做什么。
import { fill } from '../content/text.js';
import { doWord } from '../shell/words.js';
import { tierWord } from '../content/talk.js';
import { esc } from './html.js';

/** 目标底下那行小字：按这台设备的说法讲怎么做（按空格，或点“做”）。 */
const hintOf = (goal, touch) => fill(goal.hint, { do: doWord(touch) });

export function journalView(game, touch) {
  const goals = game.ask('guide');
  const next = goals.find(g => !g.done);
  const pack = game.ask('pack');
  const goalRows = goals.map(g => {
    const hint = g === next ? `<small>${esc(hintOf(g, touch))}</small>` : '';
    return `<li class="${g.done ? 'done' : ''}"><span>${esc(g.text)}${hint}</span></li>`;
  });
  const packRows = pack.items.map(i => `<li><span>${esc(i.name)}</span><span>${i.n}</span></li>`);
  const bondRows = game.ask('bonds').map(b => {
    const known = b.known ? tierWord(b.known) : '还没说过话';
    const liked = b.favorite ? `爱吃${b.favorite}` : b.role;
    return `<li><span>${esc(b.name)}<small>${esc(liked)}</small></span><span>${known}</span></li>`;
  });
  const date = game.ask('visits').active;
  const day = game.ask('clock').day;
  const dateRow = date
    ? `<p class="appointment">${date.day === day ? '今天' : '明天'}午前 · 樟树茶摊 · ${esc(date.name)}</p>`
    : '';
  return `<h2>手记</h2>
    <ul>${goalRows.join('')}</ul>
    <h3>行囊里（${pack.used}/${pack.cap} 格）</h3>
    <ul>${packRows.join('') || '<li>空的</li>'}</ul>
    <h3>乡邻</h3>
    ${dateRow}
    <ul>${bondRows.join('')}</ul>
    <button data-do="saves">进度与玩法</button>
    <button class="danger" data-do="reset">重新开始</button>`;
}

/** 下一个还没做到的目标那一行；目标都做完了是空字符串。 */
export function nextStepView(game, touch) {
  const next = game.ask('guide').find(g => !g.done);
  if (!next) return '';
  return `<b>下一步</b><span>${esc(next.text)}</span><small>${esc(hintOf(next, touch))}</small>`;
}
