// 册子的「图鉴」页（Gemini G-10 的设计图）：上面一排分页，九格一屏；点一格看详情。
// 找到的画出来、写一句摘要；没找到的画成淡灰的影子，写线索。数全从查询 catalog 来。
import { ITEMS } from '../content/items.js';
import { FISH_NAMES, FISH_CHEERS, FISH_GRADES } from '../content/fishing.js';
import { itemImg } from './icons.js';
import { button, actions, close, esc, paged } from './html.js';

const PER = 9;

const grades = e =>
  `<span class="cat-grades">${e.grades.map(on => `<i class="${on ? 'on' : ''}"></i>`).join('')}</span>`;

function card(e) {
  if (!e.found)
    return (
      `<button class="cat-card unknown" data-do="bookEntry" data-item="${esc(e.item)}" disabled>` +
      `${itemImg(e.item)}<span><b>？？？</b><small>${esc(e.clue)}</small></span></button>`
    );
  const sum = e.fish ? `最长 ${esc(e.bestText)}` : `找到 ${e.n} 回`;
  return (
    `<button class="cat-card ${e.fine ? 'fine' : ''}" data-do="bookEntry" data-item="${esc(e.item)}">` +
    `${itemImg(e.item)}<span><b>${esc(ITEMS[e.item].name)}</b><small>${sum}</small>` +
    `${e.fish ? grades(e) : ''}</span>${e.fine ? '<em>极</em>' : ''}</button>`
  );
}

function detail(page, e) {
  const name = ITEMS[e.item].name;
  const tags = [
    e.fine ? '<span class="cat-tag fine">见过极品</span>' : '',
    e.fish && e.bestText ? `<span class="cat-tag">最长${esc(e.bestText)}</span>` : '',
  ].join('');
  const count = e.fish ? `钓过 ${e.n} 条` : `找到 ${e.n} 回`;
  const stats = `${count} · ${e.date} 头回入册 · 常在${e.clue}`;
  let fish = '';
  if (e.fish) {
    const names = FISH_NAMES[e.fish].names;
    const seen = e.grades.filter(Boolean).length;
    const cells = FISH_GRADES.map(
      (g, i) =>
        `<div class="${e.grades[i] ? 'on' : ''}"><small>${g.word}</small>` +
        `<b>${e.grades[i] ? esc(names[i]) : '？？？'}</b></div>`,
    ).join('');
    const zhou = FISH_CHEERS[e.fish]?.zhou;
    fish =
      `<h3>乡下四档叫法（已集齐 ${seen} / 4）</h3><div class="cat-names">${cells}</div>` +
      (zhou ? `<blockquote><small>老周说过</small>${esc(zhou)}</blockquote>` : '');
  }
  return `<h2>${esc(page.name)} · 详情</h2>
    <div class="cat-detail">${itemImg(e.item)}<div><b class="cat-name">${esc(name)}</b>${tags}
      <p>${esc(e.line)}<small>${esc(stats)}</small></p></div></div>${fish}
    ${actions(button('bookEntry', '返回' + page.name, { data: { item: '' } }), close('合上册子', false))}`;
}

/** 图鉴页的正文和底下一排按钮。m.shelf 是哪一页，m.entry 是正在看的那一样。 */
export function catalogBody(m, game) {
  const pages = game.ask('catalog');
  const page = pages.find(p => p.id === m.shelf) || pages[0];
  const open = m.entry && page.entries.find(e => e.item === m.entry && e.found);
  if (open) return detail(page, open);
  const shelves = pages
    .map(p =>
      button('bookShelf', '', {
        data: { shelf: p.id },
        chosen: p.id === page.id,
        html: `${esc(p.name)}${p.id === page.id ? ` ${p.found}/${p.total}` : ''}`,
      }),
    )
    .join('');
  const book = paged(page.entries.map(card), m.page || 0, PER, 'bookPage');
  const done = page.done ? `<p class="cat-done">✿ ${esc(page.done)}</p>` : '';
  return `<h2>稻乡图鉴<small>${esc(page.head)}</small></h2>
    <nav class="cat-shelves">${shelves}</nav>${done}
    <div class="cat-grid">${book.items.join('')}</div>
    ${actions(book.buttons, close('合上册子', false))}`;
}
