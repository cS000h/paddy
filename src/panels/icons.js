// 面板里用的小图：把 art 层画好的像素格子变成 <img> 能用的地址。同一张图只转一次。
import { icon, itemIcon, fineItemIcon, uiIcon, personFrame, Grid } from '../art/index.js';
import { ITEMS } from '../content/items.js';

const cache = new Map();

export function toUrl(grid) {
  const canvas = document.createElement('canvas');
  canvas.width = grid.w;
  canvas.height = grid.h;
  canvas.getContext('2d').putImageData(new ImageData(grid.bytes(), grid.w, grid.h), 0, 0);
  return canvas.toDataURL();
}

function cached(key, make) {
  if (!cache.has(key)) cache.set(key, toUrl(make()));
  return cache.get(key);
}

/** 工具和铜钱的图标：hoe、seed、can、hand、coin。 */
export const toolIconUrl = name => cached('tool:' + name, () => icon(name));

/** 某样物品的图标。极品照寻常那样画，再描一圈金、点一颗星（art 层不认物品表，在这儿换过去）。 */
export const itemIconUrl = id =>
  cached('item:' + id, () => (ITEMS[id]?.fine ? fineItemIcon(ITEMS[id].fine) : itemIcon(id)));

/** 一样物品的 <img>。 */
export const itemImg = id =>
  `<img class="pixel item" width="32" height="32" src="${itemIconUrl(id)}" alt="" />`;

/** 界面用平涂像素图标的地址与 <img>。 */
export const uiIconUrl = id => cached('ui:' + id, () => uiIcon(id));
export const uiIconImg = (id, size = 20) =>
  `<img class="pixel ui-ico" width="${size}" height="${size}" src="${uiIconUrl(id)}" alt="" />`;

/** 衣镜和布摊共用站立全身像，看得见衣摆、裤脚和发式。 */
export const standingUrl = (look, dir = 'down') =>
  cached('stand:' + dir + ':' + look, () => personFrame(look, dir, 'stand'));

/** 人物上半身像素小像：截站立正面的头和肩（16×18），册子里按 4 倍整数放大，像素不糊。 */
export const heroPortraitUrl = look =>
  cached('bust:' + look, () => {
    const full = personFrame(look, 'down', 'stand');
    const bust = new Grid(16, 18);
    for (let y = 0; y < 18; y++) for (let x = 0; x < 16; x++) bust.set(x, y, full.get(x, y + 2));
    return bust;
  });
