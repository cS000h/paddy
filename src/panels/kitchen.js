// 灶台、菜谱册、掌火，以及几个小窗共用的“做好的饭菜”一行。
import { itemImg } from './icons.js';
import { METHODS, HEAT, CUTS } from '../content/recipes.js';
import { ITEMS } from '../content/items.js';
import { button, actions, close, title, para, itemRow, esc, paged } from './html.js';
import { timingBar } from './timing.js';

/** 做好的饭菜，一份一行：能吃，灶上的能端走，带着的能放回。carry = 这些是身上带着的。 */
export const dishRows = (dishes, carry = false) =>
  dishes
    .map(d =>
      itemRow({
        icon: d.ingredients[0],
        name: d.name,
        notes: [`饱腹 +${d.full} · ${d.buffText}${carry ? ' · 带着' : ' · 灶上'}`],
        acts:
          button('dishEat', '吃饭', { data: { id: d.id } }) +
          button(carry ? 'dishStore' : 'dishPack', carry ? '放回' : '端走', { data: { id: d.id } }),
      }),
    )
    .join('');

const choices = list => `<div class="choices">${list.join('')}</div>`;

/** 左半边：挑食材、做法、刀工、调料。 */
function picker(m, goods) {
  const items = m.items || [];
  const spices = m.spices || [];
  const method = m.method || 'stew';
  const food = goods
    .filter(i => i.cook)
    .map(i =>
      button('cookPick', '', {
        data: { item: i.id },
        chosen: items.includes(i.id),
        html: `${itemImg(i.id)}${esc(i.name)}<small>×${i.n}</small>`,
      }),
    );
  const methods = Object.entries(METHODS).map(([id, name]) =>
    button('cookMethod', name, { data: { method: id }, chosen: method === id }),
  );
  const cuts = [
    button('cookCut', '家常切法', { data: { cut: '' }, chosen: !m.cut }),
    ...Object.entries(CUTS).map(([id, cut]) =>
      button('cookCut', cut.name, { data: { cut: id }, chosen: m.cut === id }),
    ),
  ];
  const seasoning = goods
    .filter(i => i.kind === 'spice' && i.id !== 'salt')
    .map(i => {
      const used = spices.filter(k => k === i.id).length;
      return button('cookSpice', `${i.name} ${used}/2`, { data: { item: i.id } });
    });
  return `<section><h3>下锅的东西</h3>${choices(food)}
    <h3>怎么做</h3>${choices(methods)}
    <h3>案板上的功夫</h3>${choices(cuts)}
    ${para(m.cut ? CUTS[m.cut].tip : '切块、切丝、切片，各有合适的做法。', 'aside')}
    <h3>添两勺滋味</h3>${choices([
      seasoning.join('') || '<small>去村口杂货铺看看调料</small>',
      button('cookClearSpice', '不放调料'),
    ])}</section>`;
}

/** 右半边：先看会做出什么，再决定稳稳地做还是亲自掌火。 */
function preview(m, game, goods) {
  const method = m.method || 'stew';
  const input = { items: m.items || [], spices: m.spices || [], method, cut: m.cut || null };
  const p = game.ask('cook.preview', input);
  const wood = goods.find(i => i.id === 'wood')?.n || 0;
  const fire = method === 'mix' ? '凉拌不用柴' : `每锅用一根柴 · 家里和身上共${wood}根`;
  const summary = p.ok
    ? `<p>${p.servings}份 · 饱腹 +${p.full} · 体力 +${p.energy}<br>` +
      `${esc(p.why)}——${esc(p.buffText)}</p>${para(p.notes.join('；'), 'aside')}`
    : para(p.reason);
  return `<section><h3>${p.ok ? esc(p.name) : '等你下锅'}</h3>${summary}${para(fire, 'aside')}
    ${actions(
      button('cookPlain', '稳稳做家常饭', { disabled: !p.ok }),
      button('cookHeat', method === 'mix' ? '拌匀装盘' : '亲自掌火', {
        main: true,
        disabled: !p.ok,
      }),
    )}</section>`;
}

export function kitchenView(m, game, here) {
  const goods = game.ask('goods', here);
  const kitchen = game.ask('kitchen', here);
  return `${title('家里的灶台', '挑一至三样食材，做一顿自己的饭')}
    ${para(m.line, 'activity-story')}
    <nav class="tabs">${button('recipes', '翻菜谱')}${close('离开灶台', false)}</nav>
    <div class="two">${picker(m, goods)}${preview(m, game, goods)}</div>
    <h3>做好的饭菜</h3>
    <ul class="items">${dishRows(kitchen.dishes)}${dishRows(kitchen.carried, true)}</ul>`;
}

export function recipesView(m, game, here) {
  const recipes = game.ask('kitchen', here).recipes;
  const book = paged(recipes, m.page || 0, 8, 'recipePage');
  const rows = book.items.map(r => {
    const parts = [...r.items, ...r.spices].map(k => ITEMS[k].name).join('、');
    return itemRow({
      name: `${r.known ? '✓ ' : ''}${r.name}`,
      notes: [`${METHODS[r.method]} · ${parts}${r.known ? ` · 做过${r.times}回` : ''}`],
      acts: button('cookRecipe', '照着做', { data: { name: r.name } }),
    });
  });
  const known = recipes.filter(r => r.known).length;
  return `${title('菜谱册', `做过 ${known}/${recipes.length} 道 · ${book.page + 1}/${book.pages}页`)}
    <ul class="items">${rows.join('')}</ul>
    ${actions(book.buttons, button('backKitchen', '回灶台', { main: true }))}`;
}

export function heatView(m, game) {
  const heat = game.ask('cook.preview', m).heat || HEAT[m.method];
  return `${title('守着这锅火', heat.word)}
    ${para('指针到了青色一段，按空格或点“出锅”。正中最好，太早夹生，太晚会焦。')}
    ${timingBar(heat.center, heat.half)}
    ${actions(button('backKitchen', '先不做了'), button('cookFinish', '出锅', { main: true }))}`;
}
