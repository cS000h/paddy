// 面板拼 HTML 用的几块砖：转义、按钮、一行物品、翻页。每种小窗都用它们，样子和写法才一致。
// 按钮写 data-do="名字"，带的 data-* 原样交给 app 的 actions（见 src/app/main.js）。
import { itemImg } from './icons.js';

/** 给玩家看的字放进 HTML 前先转义。 */
export const esc = text =>
  String(text).replace(
    /[&<>"]/g,
    ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch],
  );

/**
 * 一个按钮。action 是 data-do 的名字；data 里的每一项变成 data-*。
 * 按钮上的字会转义；要放图标之类的 HTML，用 html 代替 label。
 * @param {string} action
 * @param {string} label
 * @param {{data?: object, main?: boolean, chosen?: boolean, disabled?: boolean,
 *   title?: string, html?: string}} [options]
 */
export function button(action, label, options = {}) {
  const { data = {}, main = false, chosen = false, disabled = false, title = '' } = options;
  const attrs = Object.entries(data)
    .map(([key, value]) => ` data-${key}="${esc(value)}"`)
    .join('');
  const classes = [main && 'main', chosen && 'chosen'].filter(Boolean).join(' ');
  const inner = options.html ?? esc(label);
  return (
    `<button data-do="${action}"${attrs}${classes ? ` class="${classes}"` : ''}` +
    `${title ? ` title="${esc(title)}"` : ''}${disabled ? ' disabled' : ''}>${inner}</button>`
  );
}

/** 小窗底下的一排按钮（矮屏上会贴在纸的底边，不用滚到底才找得到）。 */
export const actions = (...buttons) => `<div class="row">${buttons.join('')}</div>`;

/** 关掉小窗的按钮。 */
export const close = (label = '好', main = true) => button('close', label, { main });

/** 小窗的标题，small 是标题旁边的小字。 */
export const title = (text, small = '') =>
  `<h2>${esc(text)}${small ? `<small>${esc(small)}</small>` : ''}</h2>`;

/** 一段话；空的就什么都不写。cls 是段落的样式名。 */
export const para = (text, cls = '') =>
  text ? `<p${cls ? ` class="${cls}"` : ''}>${esc(text)}</p>` : '';

/**
 * 物品单里的一行：左边图标，中间名字和几行小字，右边按钮。
 * @param {{icon?: string, name: string, count?: number|string, notes?: string[], acts?: string}} row
 */
export function itemRow({ icon = '', name, count = '', notes = [], acts = '' }) {
  const small = notes
    .filter(Boolean)
    .map(note => `<small>${esc(note)}</small>`)
    .join('');
  return (
    `<li>${icon ? itemImg(icon) : ''}<span class="what">${esc(name)}` +
    `${count !== '' ? `<b>×${count}</b>` : ''}${small}</span>` +
    `${acts ? `<span class="acts">${acts}</span>` : ''}</li>`
  );
}

/** 物品单；空的时候写一句 none。 */
export const itemList = (rows, none) =>
  `<ul class="items">${rows.join('') || `<li class="none">${esc(none)}</li>`}</ul>`;

/** 翻页：一页放 per 条。返回这一页的条目和上一页、下一页两个按钮。 */
export function paged(list, page, per, action) {
  const pages = Math.max(1, Math.ceil(list.length / per));
  const at = Math.min(Math.max(0, page), pages - 1);
  const turn = (label, to) =>
    button(action, label, { data: { page: to }, disabled: to === at || to < 0 || to >= pages });
  return {
    items: list.slice(at * per, at * per + per),
    page: at,
    pages,
    buttons: turn('上一页', at - 1) + turn('下一页', at + 1),
  };
}
