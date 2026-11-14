// 各种小窗里写什么。每种小窗一个函数，返回一段 HTML；按钮上的 data-do 说明点了以后做什么。
// 加一种小窗 = 在 VIEWS 里加一个函数，再让 app 的 actions 认得它的按钮。
import { PEOPLE } from '../content/people.js';

const VIEWS = {
  // 和村民说话：他在做什么、说了什么；手里有菜就可以送一把
  talk(modal, game, esc) {
    const person = PEOPLE[modal.who];
    const bond = game.ask('bonds').find(b => b.id === modal.who);
    const veg = game.ask('home').items.find(i => i.id === 'veg.qingcai')?.n || 0;
    const gift = modal.gifted
      ? ''
      : `<button data-do="gift" data-to="${modal.who}" ${veg && !bond.giftedToday ? '' : 'disabled'}>
          ${bond.giftedToday ? '今天送过了' : veg ? '送一把青菜' : '手里没有菜'}</button>`;
    return `<h2>${esc(person.name)}<small>${esc(person.role)} · ${esc(modal.doing)}</small></h2>
      <p>${esc(modal.line)}</p>
      <div class="row">${gift}<button class="main" data-do="close">好</button></div>`;
  },

  sleep(modal, game, esc) {
    const clock = game.ask('clock');
    const note = clock.late ? '天已经很晚了，明早起来怕是歇不过来。' : '浇过水的菜，明早会长一截。';
    return `<h2>回屋歇息<small>${esc(clock.period)} ${esc(clock.clock)}</small></h2>
      <p>今天就到这儿吗？${note}</p>
      <div class="row"><button data-do="close">再待一会儿</button><button class="main" data-do="sleep">歇下</button></div>`;
  },

  // 院门边的收菜筐：放菜进去托阿满卖，或者留钱托他捎种子
  basket(modal, game, esc) {
    const home = game.ask('home');
    const basket = game.ask('basket');
    const veg = home.items.find(i => i.id === 'veg.qingcai')?.n || 0;
    const inside = basket.goods.map(g => `${esc(g.name)} ${g.n} 份`).join('、') || '空的';
    const ordered = basket.order.map(g => `${esc(g.name)} ${g.n} 份`).join('、');
    const seed = basket.seeds[0];
    return `<h2>收菜筐<small>阿满清早来收，钱留在筐底</small></h2>
      <p>筐里：${inside}。${ordered ? `托阿满捎的：${ordered}，明早送到。` : ''}</p>
      <div class="row">
        <button data-do="basketPut" data-item="veg.qingcai" data-n="1" ${veg ? '' : 'disabled'}>放一份青菜（每份 6 文）</button>
        <button data-do="basketPut" data-item="veg.qingcai" data-n="${veg}" ${veg > 1 ? '' : 'disabled'}>全放进去（${veg} 份）</button>
        <button data-do="basketOrder" data-item="${seed.id}" data-n="5" ${home.coins >= seed.buy * 5 ? '' : 'disabled'}>托捎 5 份${esc(seed.name)}（${seed.buy * 5} 文）</button>
        <button class="main" data-do="close">好</button>
      </div>`;
  },

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

/** 一个小窗的 HTML。 */
export function modalView(modal, game, esc) {
  const view = VIEWS[modal.kind];
  if (!view) throw new Error('没有这种小窗：' + modal.kind);
  return view(modal, game, esc);
}
