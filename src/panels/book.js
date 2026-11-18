// 开局的两个选择，和记着本事、性情、成就的小册子。
import { ORIGINS, TRAITS } from '../content/growth.js';
import { button, actions, close, title, para, esc, paged } from './html.js';

const ORIGIN_STEPS = {
  route: {
    small: '一顿饭',
    text: '暮色落下来，桂嫂把小院钥匙放在你手里。茶摊的饭香顺着风飘来，今晚怎么过？',
  },
  reply: { small: '第二天清早', text: '阿满挑着担子经过院门，笑着问：“今天有什么打算？”' },
};

export function originView(m) {
  const step = m.route ? 'reply' : 'route';
  const choices = ORIGINS[step].map(choice => {
    const trait = TRAITS[choice.trait];
    const html = `${esc(choice.text)}<small>获得「${esc(trait.name)}」：${esc(trait.effect)}</small>`;
    return button('originPick', '', { data: { id: choice.id }, html });
  });
  return `${title('初来稻乡', ORIGIN_STEPS[step].small)}
    ${para(ORIGIN_STEPS[step].text)}
    <div class="origin-choices">${choices.join('')}</div>
    ${para('这两个选择只决定起初的性情，往后的日子由你自己过。', 'aside')}`;
}

// 册子的三页：每页一种条目，各自怎么写成一行。
const perkLine = p =>
  `<small class="${p.on ? 'active-perk' : ''}">${p.on ? '✓' : '○'} ${p.level}级：${esc(p.text)}</small>`;

const skillRow = s => {
  const xp = `经验 ${s.xp}${s.next === null ? ' · 已达行家' : ' / ' + s.next}`;
  const head = `<b>${esc(s.name)} · ${esc(s.title)}</b><small>${xp}</small>`;
  return `<li><span class="what">${head}${s.perks.map(perkLine).join('')}</span></li>`;
};

const traitRow = t =>
  `<li class="${t.owned ? 'active-perk' : ''}"><span class="what">` +
  `<b>${t.owned ? '已得' : '未得'} · ${esc(t.name)}</b>` +
  `<small>${esc(t.effect)}</small><small>${esc(t.need || t.from)}</small></span></li>`;

const achievementRow = a => {
  const state = a.day
    ? `第${a.day}日达成`
    : a.future
      ? '等村里的节日开张'
      : `${a.count} / ${a.goal}`;
  return (
    `<li><span class="achievement-seal ${a.day ? 'earned' : ''}">${a.day ? '印' : '○'}</span>` +
    `<span class="what"><b>${esc(a.name)}</b><small>${state}</small></span></li>`
  );
};

const TABS = [
  ['skills', '本事'],
  ['traits', '性情'],
  ['achievements', '成就'],
];

function rowsOf(tab, game) {
  if (tab === 'skills') return game.ask('growth').skills.map(skillRow);
  if (tab === 'traits') return game.ask('growth').traits.map(traitRow);
  // 已经落印的排在前面
  return game
    .ask('achievements')
    .toSorted((a, b) => Number(!!b.day) - Number(!!a.day))
    .map(achievementRow);
}

export function bookView(m, game) {
  const tab = m.tab || 'skills';
  const book = paged(rowsOf(tab, game), m.page || 0, 4, 'bookPage');
  const tabs = TABS.map(([id, name]) =>
    button('bookTab', name, { data: { tab: id }, main: tab === id }),
  ).join('');
  const origin = game.ask('growth').origin ? '' : button('origin', '补记初来时的两件小事');
  return `${title('稻乡小册', `${book.page + 1} / ${book.pages} 页`)}
    <nav class="tabs">${tabs}</nav>
    <ul class="items">${book.items.join('')}</ul>
    ${origin}
    ${actions(book.buttons, close('合上册子', false))}`;
}
