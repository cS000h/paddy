// 开局的两个选择，和实体书签式「稻乡小册」（人物三层、本事、性情、成就、只读熟人册）。
import { ORIGINS, TRAITS } from '../content/growth.js';
import { personaBody, ledgerBody } from './person.js';
import { catalogBody } from './catalog.js';
import { uiIconImg, achievementImg } from './icons.js';
import { ACHIEVEMENT_KINDS } from '../content/achievements.js';
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

function modIcon(item) {
  if (item.kind === 'bad') return 'mod_cloud';
  if (['tea_fame', 'kind_heart', 'visitor_word'].includes(item.id)) return 'mod_tea';
  if (['good_harvest', 'keen_eye'].includes(item.id)) return 'mod_bird';
  return 'mod_clover';
}

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
    `<li><span class="achievement-mark ${a.day ? 'earned' : ''}">${achievementImg(a.kind, !!a.day)}</span>` +
    `<span class="what"><b>${esc(a.name)}</b><small>${state}</small></span></li>`
  );
};

function modifiers(m, game) {
  const list = game.ask('modifiers').list;
  const activeMod = list.find(x => x.id === m.mod) || list[0] || null;
  const tiles = list.length
    ? list
        .map(
          x =>
            `<button class="mod-tile ${activeMod?.id === x.id ? 'on' : ''} ${x.kind}" data-do="bookMod" data-mod="${esc(x.id)}">` +
            `${uiIconImg(modIcon(x), 32)}<span>${x.left}天</span></button>`,
        )
        .join('')
    : `<div class="mod-empty">${uiIconImg('mod_clover', 32)}<span>暂无风物</span></div>`;
  const detail = activeMod
    ? `<div class="mod-detail ${activeMod.kind}">
        <b>${esc(activeMod.name)}</b>
        <p>${esc(activeMod.desc)}</p>
        <div class="mod-pills"><span>余 ${activeMod.left} 天</span><span>来源：${esc(activeMod.from)}</span></div>
      </div>`
    : `<div class="mod-detail empty">
        <b>身边风物</b>
        <p>吃顿拿手热饭，或在村里办好小事、结交过客后，留下的余味和名声都会记在这里。</p>
      </div>`;

  return `<details class="folio-mods" ${m.mod ? 'open' : ''}><summary>身边风物 · ${list.length}</summary><div class="mod-split"><div class="mod-tiles">${tiles}</div>${detail}</div></details>`;
}

const TABS = [
  ['persona', '人物', 'tab_persona'],
  ['ledger', '乡邻', 'tab_ledger'],
  ['skills', '本事', 'tab_skills'],
  ['traits', '性情', 'tab_traits'],
  ['achievements', '成就', 'tab_achievements'],
  ['catalog', '图鉴', 'tab_catalog'],
];

function rowsOf(tab, game, kind = null) {
  if (tab === 'skills') return game.ask('growth').skills.map(skillRow);
  if (tab === 'traits') return game.ask('growth').traits.map(traitRow);
  return game
    .ask('achievements')
    .filter(a => !kind || a.kind === kind)
    .toSorted((a, b) => Number(!!b.day) - Number(!!a.day))
    .map(achievementRow);
}

/** 成就页顶上那排小页签：全部，和七类各一个（图标 + 拿到几个 / 一共几个）。 */
function kindBar(game, kind) {
  const all = game.ask('achievements');
  const chip = (id, label, ico, list) =>
    `<button class="ach-kind ${kind === id ? 'on' : ''}" data-do="bookKind" data-kind="${id || ''}" ` +
    `title="${label}" aria-label="${label}">${ico}<small>${list.filter(a => a.day).length}/${list.length}</small></button>`;
  return (
    `<nav class="ach-kinds" aria-label="按类看成就">` +
    chip(null, '全部', '<b>全</b>', all) +
    Object.entries(ACHIEVEMENT_KINDS)
      .map(([id, label]) => {
        const list = all.filter(a => a.kind === id);
        return chip(
          id,
          label,
          achievementImg(
            id,
            list.some(a => a.day),
            20,
          ),
          list,
        );
      })
      .join('') +
    `</nav>`
  );
}

export function bookView(m, game) {
  const tab = m.tab || 'persona';
  const tabs = TABS.map(
    ([id, name, ico]) =>
      `<button class="book-tab ${tab === id ? 'on' : ''}" data-do="bookTab" data-tab="${id}" title="${name}" aria-label="${name}">${uiIconImg(ico, 24)}<span>${name}</span></button>`,
  ).join('');
  const origin = game.ask('growth').origin ? '' : button('origin', '补记初来时的两件小事');
  let body;
  let foot;
  if (tab === 'catalog') {
    body = catalogBody(m, game);
    foot = '';
  } else if (tab === 'persona' || tab === 'ledger') {
    body =
      tab === 'ledger'
        ? ledgerBody(m, game)
        : personaBody(m, game, !m.who ? modifiers(m, game) : '');
    foot = actions(close('合上册子', false));
  } else {
    const kind = tab === 'achievements' ? m.achKind || null : null;
    const book = paged(rowsOf(tab, game, kind), m.page || 0, 4, 'bookPage');
    const bar = tab === 'achievements' ? kindBar(game, kind) : '';
    body = `${title('稻乡小册', `${book.page + 1} / ${book.pages} 页`)}${bar}
      <ul class="items">${book.items.join('')}</ul>`;
    foot = actions(book.buttons, close('合上册子', false));
  }
  return `<div class="book-shell"><nav class="book-tabs" aria-label="册子页签">${tabs}</nav>
    <div class="book-page">${body}${origin}${foot}</div></div>`;
}
