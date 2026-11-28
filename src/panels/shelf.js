// 屋里的书架（G-37）：架上的书（读到第几回、读完没有）、随手翻两页、托货郎老陈捎的书、压着的见闻和家书。
// 读不读得了、读完给什么由规则说了算（sim/plugins/reading.js）；这里只照 shelf 查询画出来。
import { button, actions, close, title, para, itemRow, itemList, esc } from './html.js';

export function shelfView(m, game, here) {
  const s = game.ask('shelf', here);
  const tab = m.tab || 'books';
  const tabs = `<nav class="tabs">${button('shelfTab', '架上的书', {
    data: { tab: 'books' },
    chosen: tab === 'books',
  })}${button('shelfTab', '见闻和家书', { data: { tab: 'news' }, chosen: tab === 'news' })}${button(
    'book',
    '翻册子',
  )}</nav>`;
  const story = para(m.line || s.line, 'activity-story');
  if (tab === 'news') {
    const news = s.news.map(line => `<li>${esc(line)}</li>`).join('');
    const letters = s.letters.map(l => `<li>${esc(l.text)}</li>`).join('');
    return `${title('书架', '压在架角的纸条')}${tabs}${story}
      <h3>见闻</h3><ul class="items notes">${news || '<li class="none">这几天村里没什么新鲜事。</li>'}</ul>
      <h3>家书</h3><ul class="items notes">${letters || '<li class="none">还没收到家里的信。</li>'}</ul>
      ${actions(close('合上', false))}`;
  }
  const rows = s.books.map(b =>
    itemRow({
      name: `《${b.name}》`,
      notes: [b.look, b.done ? '读完了 · 能重读' : `读到第 ${b.n}/${b.reads} 回`],
      acts: button('bookRead', b.done ? '重读一回' : '坐下读一回', {
        data: { id: b.id },
        disabled: !!s.read,
        title: s.read || '读一回两个钟头',
      }),
    }),
  );
  const buy = s.buy.map(b =>
    itemRow({
      name: `《${b.name}》`,
      notes: [b.look, `托货郎老陈捎来 · ${b.coins} 文`],
      acts: button('bookBuy', '托他捎', { data: { id: b.id } }),
    }),
  );
  return `${title('书架', s.read || '读一回两个钟头，随手翻两页一刻钟')}${tabs}${story}
    ${itemList(rows, '架上空荡荡的。')}
    ${buy.length ? `<h3>老陈摊上有的</h3>${itemList(buy, '')}` : ''}
    ${actions(button('bookSkim', '随手翻两页', { disabled: !!s.read }), close('合上', false))}`;
}
