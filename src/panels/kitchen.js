// 灶台、菜谱册，以及几个小窗共用的“做好的饭菜”一行。亲自掌火的小窗在 fire.js。
import { itemImg } from './icons.js';
import { METHODS, CUTS } from '../content/recipes.js';
import { ITEMS } from '../content/items.js';
import { button, actions, close, title, para, itemRow, esc, paged } from './html.js';
import { stovePicture, servedImg } from './stove-picture.js';
import { handheld } from '../content/table.js';

/**
 * 做好的饭菜，一份一行。where：stove 灶上（热菜端起、能随手吃的吃或装进行囊）、hands 手上端着（放回灶台）、
 * pack 行囊里（吃、放回灶台）。热菜要端进屋摆上饭桌才吃得了。
 */
export const dishRows = (dishes, where = 'stove') =>
  dishes
    .map(d => {
      const loose = handheld(d);
      const acts =
        where === 'stove'
          ? loose
            ? button('dishEat', '吃', { data: { id: d.id } }) +
              button('dishPack', '装进行囊', { data: { id: d.id } })
            : button('dishCarry', '端起', { data: { id: d.id } })
          : (where === 'pack' ? button('dishEat', '吃', { data: { id: d.id } }) : '') +
            button('dishStore', '放回灶台', { data: { id: d.id } });
      const at = { stove: '灶上', hands: '端着', pack: '行囊里' }[where];
      return itemRow({
        image: servedImg(d),
        name: d.name,
        notes: [`饱腹 +${d.full} · ${d.buffText || ''} · ${at}${loose ? '' : ' · 上桌吃'}`],
        acts,
      });
    })
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
      return button('cookSpice', '', {
        data: { item: i.id },
        chosen: used > 0,
        html: `${itemImg(i.id)}${esc(i.name)} <small>${used}/2</small>`,
      });
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
  return `<section><h3>${p.ok ? esc(p.name) : '等你下锅'}</h3>${stovePicture({ ...input, base: p.base }, 'prep', p.ok)}${summary}${para(fire, 'aside')}
    ${actions(
      button('cookPlain', '稳稳做家常饭', { disabled: !p.ok }),
      button('cookHeat', method === 'mix' ? '拌匀装盘' : '亲自掌火', {
        main: true,
        disabled: !p.ok,
      }),
    )}</section>`;
}

/** 身上的饭菜：手上端着的、行囊里的分开列。 */
export function carriedRows(game, kitchen) {
  const hands = game.ask('table').hands;
  const ids = new Set(hands.map(d => d.id));
  return (
    dishRows(hands, 'hands') +
    dishRows(
      kitchen.carried.filter(d => !ids.has(d.id)),
      'pack',
    )
  );
}

export function kitchenView(m, game, here) {
  const goods = game.ask('goods', here);
  const kitchen = game.ask('kitchen', here);
  const served = [...kitchen.dishes, ...kitchen.carried].find(d => d.id === m.servedId);
  return `${title('家里的灶台', '挑一至三样食材，做一顿自己的饭')}
    ${served ? `<p class="activity-story cooked-story">${servedImg(served)}${esc(m.line)}</p>` : para(m.line, 'activity-story')}
    <nav class="tabs">${button('recipes', '翻菜谱')}${close('离开灶台', false)}</nav>
    <div class="two kitchen-layout">${picker(m, goods)}${preview(m, game, goods)}</div>
    <h3>做好的饭菜</h3>
    <ul class="items">${dishRows(kitchen.dishes)}${carriedRows(game, kitchen)}</ul>`;
}

export function recipesView(m, game, here) {
  const recipes = game.ask('kitchen', here).recipes;
  const book = paged(recipes, m.page || 0, 8, 'recipePage');
  const rows = book.items.map(r => {
    const parts = [...r.items, ...r.spices].map(k => ITEMS[k].name).join('、');
    return itemRow({
      image: servedImg(r),
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
