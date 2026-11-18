// 面板里用的小图：把 art 层画好的像素格子变成 <img> 能用的地址。同一张图只转一次。
import { icon, itemIcon } from '../art/index.js';

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

/** 某样物品的图标。 */
export const itemIconUrl = id => cached('item:' + id, () => itemIcon(id));

/** 一样物品的 <img>。 */
export const itemImg = id =>
  `<img class="pixel item" width="32" height="32" src="${itemIconUrl(id)}" alt="" />`;
