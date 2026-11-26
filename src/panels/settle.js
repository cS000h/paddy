// 开局的落脚单：一页五行，每行左右换；「换一户」整张重抽。每样都写明有什么用，落脚以后在册子里也查得到。
import { REASONS, KEEPSAKES, FAMILY, OLD_TIES } from '../content/settle.js';
import { TEMPERS, LINES_OF_ORIGIN } from '../content/traits.js';
import { PEOPLE } from '../content/people.js';
import { locked } from '../shell/settle.js';
import { temperNotes, lineNotes } from './traits-text.js';
import { uiIconImg } from './icons.js';
import { button, actions, title, para, esc } from './html.js';

// 手机横屏矮，一行只留两行小字：头一句是说明，其余的作用并成一行
const small = ([first, ...rest]) =>
  `<small>${esc(first)}</small><small class="settle-use">${esc(rest.filter(Boolean).join('；'))}</small>`;

function row(sheet, key, label, icon, head, notes) {
  const fixed = locked(sheet, key);
  const arrow = (dir, mark, name) =>
    button('originCycle', mark, {
      data: { key, dir },
      disabled: fixed,
      title: name,
      cls: 'settle-arrow',
    });
  return `<li class="settle-row">${arrow(-1, '‹', '换上一个')}<span class="what">
    <b><em class="settle-label">${esc(label)}</em>${icon}${esc(head)}</b>${small(notes)}</span>${arrow(1, '›', '换下一个')}</li>`;
}

export function settleView(m) {
  const s = m.sheet;
  const reason = REASONS[s.reason],
    keep = KEEPSAKES[s.keepsake],
    line = LINES_OF_ORIGIN[keep.line],
    fam = FAMILY[s.family],
    home = TEMPERS[fam.temper],
    own = TEMPERS[s.own],
    tie = OLD_TIES[s.friend];
  const temperIcon = id => uiIconImg('temper_' + id, 24);
  const rows = [
    row(s, 'reason', '为什么落脚', '', reason.name, [reason.text, '带来：' + reason.gives]),
    row(s, 'keepsake', '随身旧物', '', `${keep.name} · 出身「${line.name}」`, [
      keep.text,
      ...lineNotes(keep.line),
    ]),
    row(s, 'family', '随家里来', temperIcon(fam.temper), `${home.name}　${fam.from}`, [
      fam.text,
      ...temperNotes(fam.temper),
    ]),
    row(s, 'own', '自己的性子', temperIcon(s.own), own.name, temperNotes(s.own)),
    row(s, 'friend', '旧交情', '', PEOPLE[s.friend].name, [
      tie.note,
      locked(s, 'friend') ? '这一户定下的　好感 +12' : '好感 +12',
    ]),
  ];
  return `${title('落脚单', '看一眼就进院子')}
    <ul class="items settle">${rows.join('')}</ul>
    ${para('第三个性情还空着，往后的日子里慢慢显出来。落脚以后，这些在册子的「性情」页都查得到。', 'aside')}
    ${actions(button('originRoll', '换一户'), button('originSettle', '就这样落脚', { main: true }))}`;
}
