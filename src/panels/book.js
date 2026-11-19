// 开局的两个选择，和实体书签式「稻乡小册」（人物三层、本事、性情、成就、只读熟人册）。
import { ORIGINS, TRAITS } from '../content/growth.js';
import { uiIconImg, heroPortraitUrl } from './icons.js';
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

const STAT_ICON = {
  farm: 'stat_farm',
  cook: 'stat_cook',
  craft: 'stat_craft',
  social: 'stat_social',
  insight: 'stat_insight',
};

const TRAIT_ICON = {
  easygoing: 'trait_tea',
  lively: 'trait_tea',
  familiar: 'trait_tea',
  slowwarm: 'trait_stone',
  solitary: 'trait_stone',
  curious: 'trait_spark',
  handy: 'trait_spark',
  hearth: 'trait_spark',
  earlybird: 'trait_sickle',
  rainwalker: 'trait_sickle',
  coldproof: 'trait_sickle',
  heatproof: 'trait_sickle',
};

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
    `<li><span class="achievement-mark ${a.day ? 'earned' : ''}">${uiIconImg('award_rice', 24)}</span>` +
    `<span class="what"><b>${esc(a.name)}</b><small>${state}</small></span></li>`
  );
};

function personaBody(m, game) {
  const hero = game.ask('hero');
  const body = game.ask('body');
  const clock = game.ask('clock');
  const modsData = game.ask('modifiers');
  const owned = game.ask('growth').traits.filter(t => t.owned);

  // 顶部人物像 + 清爽平涂像素分格「心境」条
  const filled = Math.max(0, Math.min(8, Math.round((body.mood / 100) * 8)));
  const segs = Array.from(
    { length: 8 },
    (_, i) => `<i class="mood-seg ${i < filled ? 'on' : ''}"></i>`,
  ).join('');
  const header = `<div class="hero-head">
    <div class="hero-pic"><img class="pixel" width="64" height="72" src="${heroPortraitUrl(hero.look)}" alt="" /></div>
    <div class="hero-meta">
      <div class="hero-name"><b>${esc(hero.name)}</b><span class="hero-tag">${esc(clock.seasonName)} · 第${clock.day}日</span></div>
      <div class="mood-row"><span>心境</span><span class="mood-bar" title="${esc(body.moodWord)} ${body.mood}">${segs}</span>${uiIconImg('trait_tea', 24)}</div>
    </div>
  </div>`;

  // 中排：五维属性平涂像素图标条
  const stats = `<div class="stat-strip">${modsData.stats
    .map(
      s =>
        `<div class="stat-item" title="${esc(s.desc)}">${uiIconImg(STAT_ICON[s.id] || 'stat_farm', 32)}` +
        `<span>${esc(s.name)}</span><b>${s.value}</b></div>`,
    )
    .join('')}</div>`;

  // 性情物象卡片
  const traitCards = owned.length
    ? owned
        .slice(0, 4)
        .map(t => {
          const ico = TRAIT_ICON[t.id] || 'trait_spark';
          const cls = ico === 'trait_spark' ? 'trait-card spark' : 'trait-card';
          return `<div class="${cls}" title="${esc(t.effect)}">${uiIconImg(ico, 32)}<span>${esc(t.name)}</span></div>`;
        })
        .join('')
    : '<p class="aside">还没有立下性情印记，过几天自然会显出来。</p>';

  // 身边风物（左格右文并排）
  const list = modsData.list;
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

  return `${header}${stats}
    <h3 class="sec-hd">性情</h3><div class="trait-cards">${traitCards}</div>
    <h3 class="sec-hd">身边风物</h3><div class="mod-split"><div class="mod-tiles">${tiles}</div>${detail}</div>`;
}

// 熟人册（只读）：只看谁在村里落脚、认识过哪些回头客，要说话得亲自走过去。
function folkRows(game) {
  const data = game.ask('visitors');
  const here = data.active.map(
    v =>
      `<li><span class="what"><b>${esc(v.name)} · ${esc(v.title)}${v.returning ? ' · 熟客' : ''}</b>` +
      `<small>眼下在${esc(v.spotName)}（还留 ${v.left} 天）· ${esc(v.traits.join('、'))}</small></span></li>`,
  );
  const known = data.book.map(
    b =>
      `<li><span class="what"><b>${esc(b.name)} · ${esc(b.title)}</b>` +
      `<small>熟人册 · 来过 ${b.visits} 回 · 熟悉 ${b.rel} · ${esc(b.traits.join('、'))}</small></span></li>`,
  );
  const all = [...here, ...known];
  return all.length
    ? all
    : [
        '<li><span class="what"><small>眼下还没记下外村熟人，赶集日去茶摊、村口或渡口转转吧。</small></span></li>',
      ];
}

const TABS = [
  ['persona', '人物', 'tab_persona'],
  ['skills', '本事', 'tab_skills'],
  ['traits', '性情', 'tab_traits'],
  ['achievements', '成就', 'tab_achievements'],
  ['folk', '熟人', 'tab_folk'],
];

function rowsOf(tab, game) {
  if (tab === 'skills') return game.ask('growth').skills.map(skillRow);
  if (tab === 'traits') return game.ask('growth').traits.map(traitRow);
  if (tab === 'folk') return folkRows(game);
  return game
    .ask('achievements')
    .toSorted((a, b) => Number(!!b.day) - Number(!!a.day))
    .map(achievementRow);
}

export function bookView(m, game) {
  const tab = m.tab || 'persona';
  const tabs = TABS.map(
    ([id, name, ico]) =>
      `<button class="book-tab ${tab === id ? 'on' : ''}" data-do="bookTab" data-tab="${id}" title="${name}" aria-label="${name}">${uiIconImg(ico, 32)}</button>`,
  ).join('');
  const origin = game.ask('growth').origin ? '' : button('origin', '补记初来时的两件小事');
  let body;
  let foot;
  if (tab === 'persona') {
    body = personaBody(m, game);
    foot = actions(close('合上册子', false));
  } else {
    const book = paged(rowsOf(tab, game), m.page || 0, 4, 'bookPage');
    body = `${title('稻乡小册', `${book.page + 1} / ${book.pages} 页`)}
      <ul class="items">${book.items.join('')}</ul>`;
    foot = actions(book.buttons, close('合上册子', false));
  }
  return `<div class="book-shell"><nav class="book-tabs" aria-label="册子页签">${tabs}</nav>
    <div class="book-page">${body}${origin}${foot}</div></div>`;
}
