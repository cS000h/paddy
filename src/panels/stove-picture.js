import { cookingFrame, prepBoard, COOK_FRAMES, Grid, itemIcon } from '../art/index.js';
import { plainOf } from '../content/items.js';
import { toUrl } from './icons.js';

// 食材组合很多，只留最近看过的图；每帧动作由浏览器换格，不用反复生成图片。
const urls = new Map();

function picture(picked, stage, ready = true) {
  // 极品下锅，画出来跟寻常的一样
  const selection = { ...picked, items: (picked.items || []).map(plainOf) };
  const { items, method = 'stew', cut = null, quality = 'plain' } = selection;
  const key = JSON.stringify([
    stage,
    method,
    items,
    selection.base,
    selection.spices,
    cut,
    quality,
    ready,
  ]);
  if (urls.has(key)) return urls.get(key);
  const prep = stage === 'prep';
  const served = stage === 'served';
  const width = prep ? 116 : 64;
  const count = !items.length || served || !ready ? 1 : COOK_FRAMES;
  const sheet = new Grid(width * count, 50);
  const raw = prep && items.length ? itemIcon(items[0]) : null;
  for (let frame = 0; frame < count; frame++) {
    const x = frame * width;
    if (prep) sheet.blit(prepBoard(selection, frame, raw), x, 0);
    const pot = ready ? selection : { ...selection, items: [] };
    sheet.blit(cookingFrame(pot, frame, served), x + (prep ? 52 : 0), 0);
  }
  const result = toUrl(sheet);
  if (urls.size >= 48) urls.delete(urls.keys().next().value);
  urls.set(key, result);
  return result;
}

export function stovePicture(selection, stage, ready = true) {
  const moving = ready && Boolean(selection.items?.length);
  const heat = stage === 'heat';
  return `<div class="stove-picture" aria-hidden="true"><i
    class="stove-strip ${stage}${moving ? ' moving' : ''}" ${heat ? 'data-cook-heat' : ''}
    style="background-image:url(${picture(selection, stage, ready)})"></i></div>`;
}

export function servedImg(dish) {
  const image = picture(
    { ...dish, items: dish.ingredients || dish.items, base: dish.base || dish.name },
    'served',
  );
  return `<img class="pixel served-dish" width="64" height="50" src="${image}" alt="" />`;
}
