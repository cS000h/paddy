// 和乡邻来往的两个小窗：说话送礼，和院门边托阿满买卖的收菜筐。
import { PEOPLE } from '../content/people.js';
import { itemImg } from './icons.js';
import { button, actions, close, title, para, itemRow, itemList, esc } from './html.js';

/** 身上带着拿得出手的东西、做好的饭菜，就可以送一样；一人一天收一回。 */
function giftsFor(modal, game, here) {
  const person = PEOPLE[modal.who];
  const bond = game.ask('bonds').find(b => b.id === modal.who);
  if (modal.gifted) return '';
  if (bond.giftedToday) return para(`今天已经送过${person.name}东西了，改天再送。`, 'aside');
  const to = modal.who;
  const things = game
    .ask('goods', here)
    .filter(item => item.gift)
    .map(item =>
      button('gift', '', {
        data: { to, item: item.id },
        html: `${itemImg(item.id)}${esc(item.name)}`,
      }),
    );
  const meals = game.ask('kitchen', here);
  const dishes = [...meals.dishes, ...meals.carried].map(d =>
    button('gift', `端一份${d.name}`, { data: { to, dish: d.id } }),
  );
  if (!things.length && !dishes.length) return para('身上没带拿得出手的东西。', 'aside');
  return `<div class="gifts"><span>送点什么</span>${things.join('')}${dishes.join('')}</div>`;
}

export function talkView(modal, game, here) {
  const person = PEOPLE[modal.who];
  return `${title(person.name, `${person.role} · ${modal.doing}`)}
    ${para(modal.line)}${giftsFor(modal, game, here)}
    ${actions(close())}`;
}

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
