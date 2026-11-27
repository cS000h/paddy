// 册子的「性情」页：你自己的性情从哪儿来、有什么用，出身线到了哪一级，和做出来的六个历练。
import { FAMILY, KEEPSAKES, REASONS, OLD_TIES } from '../content/settle.js';
import { OLD_TRAITS } from '../content/traits.js';
import { PEOPLE } from '../content/people.js';
import { temperNotes, lineNotes } from './traits-text.js';
import { uiIconImg } from './icons.js';
import { esc, paged } from './html.js';

const small = notes =>
  notes
    .filter(Boolean)
    .map(n => `<small>${esc(n)}</small>`)
    .join('');

const card = (icon, head, notes) =>
  `<li class="active-perk">${icon}<span class="what"><b>${esc(head)}</b>${small(notes)}</span></li>`;

const earnedRow = t =>
  `<li class="${t.owned ? 'active-perk' : ''}"><span class="what">` +
  `<b>${t.owned ? '已得' : '未得'} · ${esc(t.name)}</b>` +
  `<small>${esc(t.effect)}</small><small>${esc(t.need)}</small></span></li>`;

/** 性情从哪儿来：落脚单上随家里来的、头半个月做出来的；旧档（开局两选）升上来的说不清，就不写。 */
function whence(origin, id) {
  if (!origin?.family) return '';
  const fam = FAMILY[origin.family];
  if (fam.temper === id) return `随家里来：${fam.from}。${fam.text}`;
  if (origin.own === id) return '你自己的性子';
  return '头半个月做出来的，你认下了';
}

export function temperPage(m, game) {
  const me = game.ask('persona');
  const { origin, traits } = game.ask('growth');
  const mine = me.tempers.map(t =>
    card(uiIconImg('temper_' + t.id, 32), t.name, [whence(origin, t.id), ...temperNotes(t.id)]),
  );
  for (let i = me.tempers.length; i < 3; i++)
    mine.push(
      card('<i class="folio-blank"></i>', '还没定下', [
        '头半个月做的事慢慢攒出来，攒够了村里人会说，你认下才算；满半个月还空着的按最显的落定',
      ]),
    );
  const line = me.line;
  const keep = origin?.keepsake ? KEEPSAKES[origin.keepsake] : null;
  const lineCard = line
    ? card(uiIconImg('tab_skills', 32), `出身 · ${line.name}${line.lv}级「${line.title}」`, [
        keep ? `随身旧物：${keep.name}。${keep.text}` : '',
        ...lineNotes(line.id, line.lv),
      ])
    : '';
  const settled = origin?.reason
    ? `<p class="aside">${esc(REASONS[origin.reason].name)}　旧交情：${esc(PEOPLE[origin.friend].name)}，${esc(OLD_TIES[origin.friend].note)}</p>`
    : '';
  const earned = traits.filter(t => !Object.hasOwn(OLD_TRAITS, t.id)).map(earnedRow);
  const book = paged(earned, m.page || 0, 3, 'bookPage');
  const head = (text, sub) => `<h3>${esc(text)}<small>${esc(sub)}</small></h3>`;
  return {
    body: `${head('我的性情', '人物三格里的那几个')}<ul class="items">${mine.join('')}${lineCard}</ul>${settled}
      ${head('历练', `做出来的 · ${book.page + 1} / ${book.pages} 页`)}<ul class="items">${book.items.join('')}</ul>`,
    buttons: book.buttons,
  };
}
