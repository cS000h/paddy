// 行囊和橱柜两个小窗里写什么。
//   bag   随时能开：身上带着什么，哪些能直接吃，水壶里还有几口
//   store 站在橱柜跟前才开：左边是家里存的，右边是身上带的，来回倒腾
import { dishRows } from './kitchen.js';
import { itemImg } from './icons.js';

// 直接吃下去是什么效果，写成一行小字。
function eatNote(eat) {
  const parts = [`饱腹 +${eat.full}`];
  if (eat.energy) parts.push(`体力 +${eat.energy}`);
  if (eat.mood) parts.push(`心情 +${eat.mood}`);
  if (eat.water > 0) parts.push('解渴');
  if (eat.water < 0) parts.push('口干');
  return parts.join(' · ');
}

const row = (item, esc, buttons, note = '') =>
  `<li>${itemImg(item.id)}<span class="what">${esc(item.name)}<b>×${item.n}</b>
      ${note ? `<small>${esc(note)}</small>` : ''}</span><span class="acts">${buttons}</span></li>`;

const eatButton = item =>
  item.eat
    ? `<button data-do="eat" data-item="${item.id}" title="${eatNote(item.eat)}">吃</button>`
    : '';

const empty = text => `<li class="none">${text}</li>`;

function bodyLine(game, esc) {
  const b = game.ask('body');
  const words = [b.hungerWord, b.thirstWord, '心情' + b.moodWord];
  if (b.stuffedWord) words.push(b.stuffedWord);
  const buff = b.buff
    ? `<p class="buff-note"><b>${esc(b.buff.name)}</b>　${esc(b.buff.text)}</p>`
    : '';
  return `<p class="body-line">${esc(words.join(' · '))}</p>${buff}`;
}

function flaskRow(pack) {
  if (!pack.flask) return '';
  const { left, max } = pack.flask;
  return `<li>${itemImg('flask')}<span class="what">水壶里的水<b>${left}/${max} 口</b>
      <small>在井边、溪边喝水时会顺手灌满</small></span>
      <span class="acts"><button data-do="sip" ${left ? '' : 'disabled'}>喝一口</button></span></li>`;
}

export function bagView(modal, game, esc, here) {
  const pack = game.ask('pack', here);
  const items = pack.items
    .map(item => row(item, esc, eatButton(item), item.eat ? eatNote(item.eat) : item.text))
    .join('');
  const where = pack.atHome
    ? '家里存的东西在檐下的橱柜里。'
    : '家里存的东西在院里的橱柜里，出了院子就够不着了。';
  return `<h2>行囊<small>${pack.used}/${pack.cap} 格 · 一格放一样东西</small></h2>
    ${bodyLine(game, esc)}
    <ul class="items">${items || empty('空的')}${dishRows(pack.dishes, esc, true)}${flaskRow(pack)}</ul>
    <p class="aside">${where}</p>
    <div class="row"><button class="main" data-do="close">好</button></div>`;
}

export function storeView(modal, game, esc, here) {
  const pack = game.ask('pack', here);
  const home = game.ask('home');
  const full = pack.room < 1;
  const stored = home.items
    .map(item => {
      const stuck = !item.carry || (full && !pack.items.some(i => i.id === item.id));
      const hint = !item.carry ? '不好随身带' : stuck ? '行囊满了' : '';
      const take = n =>
        `<button data-do="packPut" data-item="${item.id}" data-n="${n}" ${stuck ? 'disabled' : ''}
          title="${hint}">${n === 'all' ? '全拿' : '拿一份'}</button>`;
      return row(item, esc, eatButton(item) + take(1) + (item.n > 1 ? take('all') : ''), hint);
    })
    .join('');
  const carried = pack.items
    .map(item =>
      row(
        item,
        esc,
        eatButton(item) +
          `<button data-do="packTake" data-item="${item.id}" data-n="all">放下</button>`,
      ),
    )
    .join('');
  return `<h2>橱柜<small>家里存的东西都在这儿</small></h2>
    <div class="two">
      <section><h3>家里存的</h3><ul class="items">${stored || empty('空的')}</ul></section>
      <section><h3>身上带的<small>${pack.used}/${pack.cap} 格</small></h3>
        <ul class="items">${carried || empty('空的')}${flaskRow(pack)}</ul></section>
    </div>
    <div class="row"><button class="main" data-do="close">好</button></div>`;
}
