import { itemImg } from './icons.js';
export function marketView(m, game, esc, here) {
  const shop = m.shop || 'market',
    market = game.ask('market', shop, here),
    coins = game.ask('home').coins;
  const goods = game.ask('goods', here).filter(i => i.sell > 0);
  return `<h2>${shop === 'tea' ? '茶点摊' : '杂货铺'}<small>${market.fair ? '今日赶集 · ' : ''}手头 ${coins} 文</small></h2><div class="two">
  <section><h3>今日的货</h3><ul class="items">${market.wares.map(i => `<li>${itemImg(i.item)}<span class="what">${esc(i.name)}<small>${i.price}文 · ${i.qty}份 · 余${i.left}${i.why.length ? '<br>' + esc(i.why.map(([t, n]) => t + (n > 0 ? '+' : '') + n).join('，')) : ''}</small></span><button data-do="marketBuy" data-item="${i.item}" ${coins < i.price || !i.left ? 'disabled' : ''}>买一回</button></li>`).join('')}</ul></section>
  <section><h3>卖点随身带的</h3><ul class="items">${goods.map(i => `<li>${itemImg(i.id)}<span class="what">${esc(i.name)} ×${i.n}<small>每份${i.sell}文起</small></span><button data-do="marketSell" data-item="${i.id}">卖一份</button></li>`).join('') || '<li>行囊里还没有可卖的东西。</li>'}</ul><p class="aside">鲜货也会卖给别的乡邻。傍晚剩下的便宜些，卖完明天再来。</p></section></div>
  <div class="row"><button data-do="close">收好东西，继续走</button></div>`;
}
export function teaView(m, game, esc) {
  const t = game.ask('tea'),
    labels = {
      drink: `要一碗${t.tea[0]}`,
      chess: '和老人下盘棋',
      hawk: '帮阿满吆喝',
      listen: '听茶客闲聊',
    };
  return `<h2>樟树下坐坐<small>${esc(t.tea[1])}</small></h2><p>${esc(m.line || '树荫落在桌上。坐一会儿，听听村里的事。')}</p><ul class="items">${t.options.map(o => `<li><span class="what">${labels[o.kind]}<small>${esc(o.reason || { drink: '1文 · 水分+40，心情+2', chess: '一段时辰 · 心情+4，人情+1', hawk: '一段时辰 · 钱+3，人情+1', listen: '不花时辰，每天一回' }[o.kind])}</small></span><button data-do="teaDo" data-kind="${o.kind}" ${o.reason ? 'disabled' : ''}>${o.kind === 'drink' ? '喝茶' : '坐下'}</button></li>`).join('')}</ul><div class="row"><button data-do="close">起身</button></div>`;
}
