// 院门边托阿满买卖的收菜筐。
import { button, actions, close, title, para, itemRow, itemList } from './html.js';

export function basketView(modal, game, here) {
  const coins = game.ask('home').coins;
  const basket = game.ask('basket');
  const inside = basket.goods.map(g => `${g.name} ${g.n} 份`).join('、') || '空的';
  const ordered = basket.order.map(g => `${g.name} ${g.n * g.qty} 份`).join('、');
  const put = (item, n, label) => button('basketPut', label, { data: { item: item.id, n } });
  const sell = game
    .ask('goods', here)
    .filter(item => item.basket)
    .map(item =>
      itemRow({
        icon: item.id,
        name: item.name,
        count: item.n,
        notes: [`每份 ${item.sell} 文`],
        acts: put(item, 1, '放一份') + (item.n > 1 ? put(item, item.n, '全放') : ''),
      }),
    );
  const buy = basket.wares.map(ware =>
    itemRow({
      icon: ware.id,
      name: ware.name,
      notes: [`${ware.buy} 文${ware.qty > 1 ? `，一回 ${ware.qty} 份` : ''}`],
      acts: button('basketOrder', '捎一份', {
        data: { item: ware.id, n: 1 },
        disabled: coins < ware.buy,
      }),
    }),
  );
  return `${title('收菜筐', `阿满清早来收，钱留在筐底 · 手头 ${coins} 文`)}
    ${para(`筐里：${inside}。${ordered ? `托阿满捎的：${ordered}，明早送到。` : ''}`)}
    <div class="two">
      <section><h3>放进筐里卖</h3>${itemList(sell, '身上没有阿满肯收的东西')}</section>
      <section><h3>留钱托他捎</h3>${itemList(buy, '')}</section>
    </div>
    ${actions(close())}`;
}
