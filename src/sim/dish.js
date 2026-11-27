import { is } from '../kernel/schema.js';
import { ITEMS } from '../content/items.js';
import { BUFFS } from '../content/body.js';
import { METHODS, QUALITY, CUTS } from '../content/recipes.js';
import { FIRE_TWISTS } from '../content/cook-fire.js';
/** 一份饭菜在行囊里占几格：带汤的（煮的）要两格，免得洒了。 */
export const dishSize = d => (d.method === 'stew' ? 2 : 1);

// 家里的菜和端在身上的菜共用同一份校验。
export const validDish = d =>
  is.obj(d) &&
  is.int(d.id, 1) &&
  is.str(d.name, 40) &&
  is.str(d.base, 40) &&
  (d.cut === null || Object.hasOwn(CUTS, d.cut)) &&
  is.int(d.day, 1) &&
  is.int(d.full, 0, 100) &&
  is.int(d.energy, 0, 100) &&
  is.int(d.uses, 1, 99) &&
  Object.hasOwn(BUFFS, d.buff) &&
  Object.hasOwn(METHODS, d.method) &&
  Object.hasOwn(QUALITY, d.quality) &&
  is.arr(d.ingredients, 3) &&
  d.ingredients.length > 0 &&
  d.ingredients.every(k => ITEMS[k]?.cook) &&
  is.arr(d.spices, 2) &&
  d.spices.every(k => ITEMS[k]?.kind === 'spice') &&
  is.int(d.water, -20, 20) &&
  is.int(d.tasteMood, -3, 3) &&
  typeof d.seasonal === 'boolean' &&
  (d.twist === undefined || Object.hasOwn(FIRE_TWISTS, d.twist)) &&
  (d.flavor === undefined || is.int(d.flavor, 1, 3));
