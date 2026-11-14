import { itemImg } from './icons.js';
import { METHODS, HEAT } from '../content/recipes.js';
import { ITEMS } from '../content/items.js';
export function dishRows(dishes, esc, carry = false) {
  return dishes
    .map(
      d => `<li>${itemImg(d.ingredients[0])}<span class="what">${esc(d.name)}
 <small>饱腹 +${d.full} · ${esc(d.buffText)}${carry ? ' · 带着' : ' · 灶上'}</small></span>
 <span class="acts"><button data-do="dishEat" data-id="${d.id}">吃饭</button>
 <button data-do="${carry ? 'dishStore' : 'dishPack'}" data-id="${d.id}">${carry ? '放回' : '端走'}</button></span></li>`,
    )
    .join('');
}
export function kitchenView(m, game, esc, here) {
  const items = m.items || [],
    spices = m.spices || [],
    method = m.method || 'stew';
  const goods = game.ask('goods', here),
    k = game.ask('kitchen', here);
  const p = game.ask('cook.preview', { items, spices, method });
  const options = goods
    .filter(i => i.cook)
    .map(
      i => `<button class="${items.includes(i.id) ? 'chosen' : ''}" data-do="cookPick" data-item="${i.id}">
 ${itemImg(i.id)}${esc(i.name)}<small>×${i.n}</small></button>`,
    )
    .join('');
  const seasoning = goods
    .filter(i => i.kind === 'spice' && i.id !== 'salt')
    .map(
      i =>
        `<button data-do="cookSpice" data-item="${i.id}">${esc(i.name)} ${spices.filter(k => k === i.id).length}/2</button>`,
    )
    .join('');
  return `<h2>檐下灶台<small>挑一至三样食材，做一顿自己的饭</small></h2>
 <nav class="tabs"><button data-do="recipes">翻菜谱</button><button data-do="close">离开灶台</button></nav>
 <div class="two"><section><h3>下锅的东西</h3><div class="choices">${options}</div>
 <h3>怎么做</h3><div class="choices">${Object.entries(METHODS)
   .map(
     ([id, name]) =>
       `<button class="${method === id ? 'chosen' : ''}" data-do="cookMethod" data-method="${id}">${name}</button>`,
   )
   .join('')}</div>
 <h3>添两勺滋味</h3><div class="choices">${seasoning || '<small>托阿满捎些调料来</small>'}<button data-do="cookClearSpice">不放调料</button></div></section>
 <section><h3>${p.ok ? esc(p.name) : '等你下锅'}</h3><p>${p.ok ? `${p.servings}份 · 饱腹 +${p.full} · 体力 +${p.energy}<br>${esc(p.why)}——${esc(p.buffText)}` : esc(p.reason)}</p>
 <p class="aside">${p.ok ? esc(p.notes.join('；')) : ''}</p><p class="aside">${method === 'mix' ? '凉拌不用柴' : '每锅用一根柴 · 家里和身上共' + (goods.find(i => i.id === 'wood')?.n || 0) + '根'}</p>
 <div class="row"><button data-do="cookPlain" ${p.ok ? '' : 'disabled'}>稳稳做家常饭</button>
 <button class="main" data-do="cookHeat" ${p.ok ? '' : 'disabled'}>${method === 'mix' ? '拌匀装盘' : '亲自掌火'}</button></div></section></div>
 <h3>做好的饭菜</h3><ul class="items">${dishRows(k.dishes, esc)}${dishRows(k.carried, esc, true) || ''}</ul>`;
}
export function recipesView(m, game, esc, here) {
  const recipes = game.ask('kitchen', here).recipes,
    page = m.page || 0,
    pages = Math.ceil(recipes.length / 8);
  return `<h2>菜谱册<small>做过 ${recipes.filter(r => r.known).length}/${recipes.length} 道 · ${page + 1}/${pages}页</small></h2>
 <ul class="items">${recipes
   .slice(page * 8, page * 8 + 8)
   .map(
     r =>
       `<li><span class="what">${r.known ? '✓ ' : ''}${esc(r.name)}<small>${METHODS[r.method]} · ${[...r.items, ...r.spices].map(k => ITEMS[k].name).join('、')}${r.known ? ' · 做过' + r.times + '回' : ''}</small></span></li>`,
   )
   .join('')}</ul>
 <div class="row"><button data-do="recipePage" data-page="${Math.max(0, page - 1)}">上一页</button><button data-do="recipePage" data-page="${Math.min(pages - 1, page + 1)}">下一页</button><button class="main" data-do="backKitchen">回灶台</button></div>`;
}
export function heatView(m, game, esc) {
  const h = HEAT[m.method];
  return `<h2>守着这锅火<small>${esc(h.word)}</small></h2><p>指针到了青色一段，按空格或点“出锅”。正中最好，太早夹生，太晚会焦。</p>
 <div class="timing"><span class="zone" style="left:${h.center - h.half}%;width:${h.half * 2}%"></span><i data-timing></i></div>
 <div class="row"><button data-do="backKitchen">先不做了</button><button class="main" data-do="cookFinish">出锅</button></div>`;
}
