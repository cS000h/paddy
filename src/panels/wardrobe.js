// 小屋衣镜和集上的布摊。衣箱里的能挑能换，其余款式的出处可以展开看。
// 布摊上一行一样，小图是自己穿戴上的样子。规则在 sim/plugins/wardrobe.js，这里只问 'wardrobe'。
import { COATS, HAIR, outfitLook } from '../content/wardrobe.js';
import { CALENDAR } from '../content/calendar.js';
import { PEOPLE } from '../content/people.js';
import { standingUrl, heroPortraitUrl } from './icons.js';
import { title, button, actions, close, esc, itemRow, itemList } from './html.js';

/** 还没有的那一样去哪儿得：“秋冬布摊 108文”“集日布摊 128文”“渡口钓鱼时碰上”。 */
export function wayText(way) {
  if (way.find) return `${way.where}时碰上`;
  if (!way.buy) return '';
  const when = way.fair
    ? '集日'
    : (way.seasons || []).map(season => CALENDAR.seasons[season]).join('');
  return `${when}布摊 ${way.buy}文`;
}

export function wardrobeView(modal, game) {
  const hero = game.ask('hero');
  const box = game.ask('wardrobe');
  const coat = modal.coat ?? box.worn.coat;
  const hair = modal.hair ?? box.worn.hair;
  const look = outfitLook(PEOPLE[hero.id].look, coat, hair);
  const hairTab = modal.tab === 'hair';
  const views = ['right', 'down', 'up']
    .map(dir => `<img class="pixel" src="${standingUrl(look, dir)}" alt="" />`)
    .join('');
  const list = hairTab ? box.hair : box.coat;
  const chosen = hairTab ? hair : coat;
  const owned = list.filter(p => p.owned);
  const missing = list.filter(p => !p.owned);
  const picks = owned.map(p =>
    button('fittingPick', p.name, { chosen: p.id === chosen, data: { id: p.id } }),
  );
  const hints = modal.showMissing
    ? `<ul class="fitting-hints">${missing
        .map(p => `<li><b>${esc(p.name)}</b><small>${esc(wayText(p.way))}</small></li>`)
        .join('')}</ul>`
    : '';
  const count = pieces => `${pieces.filter(p => p.owned).length}/${pieces.length}`;
  return (
    title('小屋衣镜') +
    `<div class="fitting-body"><figure class="fitting-preview"><div>${views}</div>
    <figcaption>${esc(COATS[coat])}<small>${esc(HAIR[hair][0])}</small></figcaption></figure>
    <section><div class="cloth-tabs">` +
    button('fittingTab', `衣装 ${count(box.coat)}`, { chosen: !hairTab, data: { tab: 'coat' } }) +
    button('fittingTab', `发式 ${count(box.hair)}`, { chosen: hairTab, data: { tab: 'hair' } }) +
    `</div><div class="fitting-choices">${picks.join('')}</div>` +
    (missing.length
      ? button('fittingMissing', modal.showMissing ? '收起出处' : `去哪儿找 · ${missing.length}`, {
          cls: 'fitting-more',
        })
      : '') +
    hints +
    '</section></div>' +
    actions(close('收起', false), button('fittingWear', '穿戴好', { main: true }))
  );
}

/** 集上的布摊：成衣看全身，发式看头肩。 */
export function clothView(m, game) {
  const box = game.ask('wardrobe');
  const coins = game.ask('home').coins;
  const base = PEOPLE[game.ask('hero').id].look;
  const row = ware => {
    const coat = ware.kind === 'coat' ? ware.id : box.worn.coat;
    const hair = ware.kind === 'hair' ? ware.id : box.worn.hair;
    const look = outfitLook(base, coat, hair);
    const clothing = ware.kind === 'coat';
    const src = clothing ? standingUrl(look) : heroPortraitUrl(look);
    return itemRow({
      image: `<span class="ware-pic"><img class="pixel" width="32" height="${clothing ? 64 : 36}" src="${src}" alt="" /></span>`,
      name: ware.name,
      notes: [`${ware.price}文${ware.with ? ' · ' + ware.with : ''}`, ware.fair ? '集日成衣' : ''],
      acts: button(
        'clothBuy',
        ware.owned ? (clothing ? '已有' : '已学') : clothing ? '买下' : '学梳',
        {
          data: { kind: ware.kind, id: ware.id },
          disabled: ware.owned || coins < ware.price,
        },
      ),
    });
  };
  const kind = m.tab === 'hair' ? 'hair' : 'coat';
  const tab = (id, name) => button('clothTab', name, { chosen: id === kind, data: { tab: id } });
  return `${title('布摊', `${box.stall.fair ? '今日赶集 · ' : ''}手头 ${coins} 文`)}
    <div class="cloth-tabs">${tab('coat', '挑成衣')}${tab('hair', '学梳头')}</div>
    ${itemList(box.stall.wares.filter(w => w.kind === kind).map(row), '今天还没摆出来。')}
    ${actions(close('收好，接着走', false))}`;
}
