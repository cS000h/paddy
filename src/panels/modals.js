// 各种小窗里写什么。每种小窗一个函数，返回一段 HTML；按钮上的 data-do 说明点了以后做什么。
// 加一种小窗 = 在 VIEWS 里加一个函数，再让 app 的 actions 认得它的按钮。
// 每个函数拿到 (modal, game, esc, here)：here 是操控的人此刻站的格子，问“够得着什么”时要带上。
import { activityView, fishView } from './activities.js';
import { kitchenView, recipesView, heatView } from './kitchen.js';
import { PEOPLE } from '../content/people.js';
import { itemImg } from './icons.js';
import { bagView, storeView } from './bag.js';

const VIEWS = {
  activity: activityView,
  fish: fishView,
  kitchen: kitchenView,
  recipes: recipesView,
  heat: heatView,
  water(modal, game, esc, here) {
    const reason = game.ask('drink.why', modal.x, modal.y, here);
    return `<h2>水边</h2><p>${esc(reason || '喝口水歇歇，也可以灌满浇菜的水壶。')}</p>
      <div class="row"><button data-do="close">离开</button><button data-do="refill">打水浇菜</button>
      <button class="main" data-do="drink" ${reason ? 'disabled' : ''}>喝水</button></div>`;
  },
  // 和村民说话：他在做什么、说了什么；身上带着拿得出手的东西，就可以送一样
  talk(modal, game, esc, here) {
    const person = PEOPLE[modal.who];
    const bond = game.ask('bonds').find(b => b.id === modal.who);
    const gifts = game.ask('goods', here).filter(item => item.gift);
    const meals = game.ask('kitchen', here);
    const dishGifts = [...meals.dishes, ...meals.carried]
      .map(
        d =>
          `<button data-do="gift" data-to="${modal.who}" data-dish="${d.id}">端一份${esc(d.name)}</button>`,
      )
      .join('');
    let give = '';
    if (modal.gifted) give = '';
    else if (bond.giftedToday)
      give = `<p class="aside">今天已经送过${esc(person.name)}东西了，改天再送。</p>`;
    else if (!gifts.length) give = '<p class="aside">身上没带拿得出手的东西。</p>';
    else
      give = `<div class="gifts"><span>送点什么</span>${gifts
        .map(
          item =>
            `<button data-do="gift" data-to="${modal.who}" data-item="${item.id}">
              ${itemImg(item.id)}${esc(item.name)}</button>`,
        )
        .join('')}</div>`;
    return `<h2>${esc(person.name)}<small>${esc(person.role)} · ${esc(modal.doing)}</small></h2>
      <p>${esc(modal.line)}</p>${give}${!modal.gifted && !bond.giftedToday ? `<div class="gifts">${dishGifts}</div>` : ''}
      <div class="row"><button class="main" data-do="close">好</button></div>`;
  },

  sleep(modal, game, esc) {
    const clock = game.ask('clock');
    const body = game.ask('body');
    let note = clock.late ? '天已经很晚了，明早起来怕是歇不过来。' : '浇过水的菜，明早会长一截。';
    if (body.hunger < 20) note += '空着肚子睡，明早歇不回来——先吃点东西吧。';
    return `<h2>回屋歇息<small>${esc(clock.period)} ${esc(clock.clock)}</small></h2>
      <p>今天就到这儿吗？${note}</p>
      <div class="row"><button data-do="close">再待一会儿</button><button class="main" data-do="sleep">歇下</button></div>`;
  },

  // 院门边的收菜筐：放东西进去托阿满卖，或者留钱托他捎东西
  basket(modal, game, esc, here) {
    const home = game.ask('home');
    const basket = game.ask('basket');
    const goods = game.ask('goods', here).filter(item => item.basket);
    const inside = basket.goods.map(g => `${esc(g.name)} ${g.n} 份`).join('、') || '空的';
    const ordered = basket.order.map(g => `${esc(g.name)} ${g.n * g.qty} 份`).join('、');
    const put = (item, n, label) =>
      `<button data-do="basketPut" data-item="${item.id}" data-n="${n}">${label}</button>`;
    const sell = goods
      .map(
        item => `<li>${itemImg(item.id)}<span class="what">${esc(item.name)}<b>×${item.n}</b>
          <small>每份 ${item.sell} 文</small></span>
          <span class="acts">${put(item, 1, '放一份')}${item.n > 1 ? put(item, item.n, '全放') : ''}</span></li>`,
      )
      .join('');
    const buy = basket.wares
      .map(
        ware => `<li>${itemImg(ware.id)}<span class="what">${esc(ware.name)}
          <small>${ware.buy} 文${ware.qty > 1 ? `，一回 ${ware.qty} 份` : ''}</small></span>
          <span class="acts"><button data-do="basketOrder" data-item="${ware.id}" data-n="1"
            ${home.coins >= ware.buy ? '' : 'disabled'}>捎一份</button></span></li>`,
      )
      .join('');
    return `<h2>收菜筐<small>阿满清早来收，钱留在筐底 · 手头 ${home.coins} 文</small></h2>
      <p>筐里：${inside}。${ordered ? `托阿满捎的：${ordered}，明早送到。` : ''}</p>
      <div class="two">
        <section><h3>放进筐里卖</h3>
          <ul class="items">${sell || '<li class="none">身上没有阿满肯收的东西</li>'}</ul></section>
        <section><h3>留钱托他捎</h3><ul class="items">${buy}</ul></section>
      </div>
      <div class="row"><button class="main" data-do="close">好</button></div>`;
  },

  bag: bagView,
  store: storeView,

  sign: (modal, game, esc) =>
    `<p>${esc(modal.text)}</p><div class="row"><button class="main" data-do="close">好</button></div>`,

  // 清早的便条：夜里发生的事
  notes: (modal, game, esc) =>
    `<h2>清早<small>第 ${modal.day} 日</small></h2>
      ${modal.notes.map(n => `<p><b>${esc(n.title)}</b>　${esc(n.text)}</p>`).join('')}
      <div class="row"><button class="main" data-do="close">起身</button></div>`,

  confirm: (modal, game, esc) =>
    `<h2>${esc(modal.title)}</h2><p>${esc(modal.text)}</p>
      <div class="row"><button data-do="close">算了</button><button class="main" data-do="${modal.yes}">${esc(modal.label)}</button></div>`,
};

// 内容多的小窗用宽一点的纸。
const WIDE = new Set(['store', 'basket', 'kitchen', 'recipes']);

/** 一个小窗的 HTML。 */
export function modalView(modal, game, esc, here) {
  const view = VIEWS[modal.kind];
  if (!view) throw new Error('没有这种小窗：' + modal.kind);
  return `<div class="sheet${WIDE.has(modal.kind) ? ' wide' : ''}">${view(modal, game, esc, here)}</div>`;
}
