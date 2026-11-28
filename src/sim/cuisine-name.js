// 沿用0.12的命名和调料匹配。火候在 cook-fire.js 判。
import { RECIPES } from '../content/recipes.js';
import { plainName } from './cuisine-words.js';
const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));
// The named recipe for these ingredients and seasonings: all its seasonings must be in; the one that uses the most wins.
// hidden 是还没学会的书上菜（content/books.js），不算菜谱
function findRecipe(items, method, spices = [], hidden = []) {
  let best = null;
  for (const r of RECIPES) {
    if (hidden.includes(r[0])) continue;
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
function dishName(items, method, I, spices = [], hidden = []) {
  const r = findRecipe(items, method, spices, hidden);
  if (r) return { name: r[0], named: true, spices: r[3] || [] };
  const pre = SPICE_PREFIX(spices, method);
  const plain = plainName(items, method, I);
  // 调料的前缀替掉「清炒」「炭烤」这类做法词；凉拌留一个「拌」
  if (pre)
    return {
      name:
        pre +
        plain.replace(/^(清炒|凉拌|炭烤|清炖|清煮|爆炒|滑炒)/, m => (m === '凉拌' ? '拌' : '')),
      named: false,
    };
  return { name: plain, named: false };
}

export { dishName };
