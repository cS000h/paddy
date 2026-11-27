// 沿用0.12的命名和调料匹配。火候在 cook-fire.js 判。
import { RECIPES } from '../content/recipes.js';
const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));
// The named recipe for these ingredients and seasonings: all its seasonings must be in; the one that uses the most wins.
function findRecipe(items, method, spices = []) {
  let best = null;
  for (const r of RECIPES) {
    const sea = r[3] || [];
    if (
      r[1] === method &&
      sameSet(r[2], items) &&
      sea.every(x => spices.includes(x)) &&
      (!best || sea.length > (best[3] || []).length)
    )
      best = r;
  }
  return best;
}

// item lookup is injected (the registry lives in core); the pure helpers below take it as `I`.
const SPICE_PREFIX = (sp, method) =>
  sp.includes('sugar') && sp.includes('vinegar')
    ? '糖醋'
    : sp.includes('soy')
      ? method === 'fry'
        ? '酱炒'
        : method === 'roast'
          ? '酱烤'
          : '红烧'
      : sp.includes('chili')
        ? '香辣'
        : sp.includes('vinegar')
          ? method === 'fry'
            ? '醋溜'
            : '酸'
          : sp.includes('scallion')
            ? '葱香'
            : sp.includes('sugar')
              ? '糖'
              : sp.includes('wine')
                ? '酒香'
                : '';
function dishName(items, method, I, spices = []) {
  const r = findRecipe(items, method, spices);
  if (r) return { name: r[0], named: true, spices: r[3] || [] };
  const pre = SPICE_PREFIX(spices, method);
  if (pre) {
    const plain = dishName(items, method, I).name.replace(/^(清炒|凉拌|烤)/, m =>
      m === '凉拌' ? '拌' : '',
    );
    return { name: pre + plain, named: false };
  }
  const sh = k => I(k)?.short || I(k)?.name || k;
  const rice = items.includes('rice'),
    egg = items.includes('egg'),
    rest = items.filter(k => k !== 'rice' && k !== 'egg').map(sh);
  let name;
  if (method === 'stew')
    name = rice
      ? rest.length
        ? `${rest.join('')}${egg ? '鸡蛋' : ''}粥`
        : '鸡蛋粥'
      : items.length >= 3
        ? '什锦杂烩汤'
        : `${items.map(sh).join('')}汤`;
  else if (method === 'fry')
    name = rice
      ? `${rest.join('')}${egg && rest.length ? '蛋' : ''}炒饭`
      : egg
        ? `${rest.join('')}炒蛋`
        : items.length === 1
          ? `清炒${sh(items[0])}`
          : items.length === 2
            ? `${sh(items[0])}炒${sh(items[1])}`
            : '家常小炒';
  else if (method === 'roast')
    name = items.length >= 3 ? '炭烤拼盘' : `烤${items.map(sh).join('')}`;
  else name = `凉拌${items.map(sh).join('')}`;
  return { name, named: false };
}

export { dishName };
