import { ORIGINS, TRAITS } from '../content/growth.js';
export function originView(m, game, esc) {
  const step = m.route ? 'reply' : 'route';
  return `<h2>初来稻乡<small>${step === 'route' ? '一顿饭' : '第二天清早'}</small></h2>
 <p>${step === 'route' ? '暮色落下来，桂嫂把小院钥匙放在你手里。茶摊的饭香顺着风飘来，今晚怎么过？' : '阿满挑着担子经过院门，笑着问：“今天有什么打算？”'}</p>
 <div class="origin-choices">${ORIGINS[step].map(o => `<button data-do="originPick" data-id="${o.id}">${esc(o.text)}<small>获得「${TRAITS[o.trait].name}」：${TRAITS[o.trait].effect}</small></button>`).join('')}</div>
 <p class="aside">这两个选择只决定起初的性情，往后的日子由你自己过。</p>`;
}
export function bookView(m, game, esc) {
  const tab = m.tab || 'skills',
    page = m.page || 0,
    g = game.ask('growth');
  let list;
  if (tab === 'skills')
    list = g.skills.map(
      s =>
        `<li><span class="what"><b>${s.name} · ${s.title}</b><small>经验 ${s.xp}${s.next === null ? ' · 已达行家' : ' / ' + s.next}</small>${s.perks.map(p => `<small class="${p.on ? 'active-perk' : ''}">${p.on ? '✓' : '○'} ${p.level}级：${esc(p.text)}</small>`).join('')}</span></li>`,
    );
  else if (tab === 'traits')
    list = g.traits.map(
      t =>
        `<li class="${t.owned ? 'active-perk' : ''}"><span class="what"><b>${t.owned ? '已得' : '未得'} · ${esc(t.name)}</b><small>${esc(t.effect)}</small><small>${esc(t.need || t.from)}</small></span></li>`,
    );
  else
    list = game
      .ask('achievements')
      .toSorted((a, b) => Number(!!b.day) - Number(!!a.day))
      .map(
        a =>
          `<li><span class="achievement-seal ${a.day ? 'earned' : ''}">${a.day ? '印' : '○'}</span><span class="what"><b>${esc(a.name)}</b><small>${a.day ? '第' + a.day + '日达成' : a.future ? '等村里的节日开张' : a.count + ' / ' + a.goal}</small></span></li>`,
      );
  const per = 4,
    pages = Math.ceil(list.length / per),
    p = Math.min(page, pages - 1);
  return `<h2>稻乡小册<small>${p + 1} / ${pages} 页</small></h2><nav class="tabs">${[
    ['skills', '本事'],
    ['traits', '性情'],
    ['achievements', '成就'],
  ]
    .map(
      ([id, name]) =>
        `<button class="${tab === id ? 'main' : ''}" data-do="bookTab" data-tab="${id}">${name}</button>`,
    )
    .join('')}</nav>
 <ul class="items">${list.slice(p * per, p * per + per).join('')}</ul>
 ${!g.origin ? '<button data-do="origin">补记初来时的两件小事</button>' : ''}
 <div class="row"><button data-do="bookPage" data-page="${Math.max(0, p - 1)}">上一页</button><button data-do="bookPage" data-page="${Math.min(pages - 1, p + 1)}">下一页</button><button data-do="close">合上册子</button></div>`;
}
