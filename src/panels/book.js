// 开局的两个选择，和记着人物（五维属性+特质+时限修正）、本事、性情、成就的小册子。
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

// 册子的四页：人物三层面板 + 本事 + 性情 + 成就。
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

function personaBody(game) {
  const m = game.ask('modifiers');
  const owned = game.ask('growth').traits.filter(t => t.owned);
  const statCards = m.stats
    .map(s => {
      const parts = [`底 ${s.base}`];
      if (s.traitSum) parts.push(`性情 +${s.traitSum}`);
      if (s.modSum) parts.push(`修正 ${s.modSum > 0 ? '+' : '−'}${Math.abs(s.modSum)}`);
      return `<div class="stat-cell"><b>${esc(s.name)} ${s.value}</b><small>${parts.join(' · ')}</small></div>`;
    })
    .join('');
  const seals = owned.length
    ? owned
        .map(t => `<span class="trait-seal" title="${esc(t.effect)}">${esc(t.name)}</span>`)
        .join('')
    : '<small>还没有立下性情印记</small>';
  const mods = m.list.length
    ? m.list
        .map(
          x =>
            `<li class="mod-row ${x.kind}"><span class="what"><b>${esc(x.name)} · 余 ${x.left} 天</b>` +
            `<small>${esc(x.desc)}（来源：${esc(x.from)}）</small></span></li>`,
        )
        .join('')
    : '<li><span class="what"><small>眼下身上没有时限修正，吃顿拿手饭或遇上村里小事会添上。</small></span></li>';
  return `<div class="stat-grid">${statCards}</div>
    <h3>长期性情</h3><div class="trait-seals">${seals}</div>
    <h3>时限修正</h3><ul class="items">${mods}</ul>`;
}

const TABS = [
  ['persona', '人物'],
  ['skills', '本事'],
  ['traits', '性情'],
  ['achievements', '成就'],
];

function rowsOf(tab, game) {
  if (tab === 'skills') return game.ask('growth').skills.map(skillRow);
  if (tab === 'traits') return game.ask('growth').traits.map(traitRow);
  return game
    .ask('achievements')
    .toSorted((a, b) => Number(!!b.day) - Number(!!a.day))
    .map(achievementRow);
}

export function bookView(m, game) {
  const tab = m.tab || 'persona';
  const tabs = TABS.map(([id, name]) =>
    button('bookTab', name, { data: { tab: id }, main: tab === id }),
  ).join('');
  const origin = game.ask('growth').origin ? '' : button('origin', '补记初来时的两件小事');
  if (tab === 'persona') {
    return `${title('稻乡小册', '人物三层')}
      <nav class="tabs">${tabs}</nav>
      ${personaBody(game)}
      ${origin}
      ${actions(button('visitors', '村中过客'), close('合上册子', false))}`;
  }
  const book = paged(rowsOf(tab, game), m.page || 0, 4, 'bookPage');
  return `${title('稻乡小册', `${book.page + 1} / ${book.pages} 页`)}
    <nav class="tabs">${tabs}</nav>
    <ul class="items">${book.items.join('')}</ul>
    ${origin}
    ${actions(book.buttons, close('合上册子', false))}`;
}
