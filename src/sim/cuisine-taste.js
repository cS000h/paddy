// 沿用0.12的性味评分与口味算法，平分按原表顺序。
const ORDER = ['alert', 'fresh', 'cool', 'treat', 'guest', 'warm', 'filling', 'hearty'];
function buffOf(items, method, I, spices = []) {
  const it = items.map(k => I(k)),
    tag = t => it.filter(i => i.tags.includes(t)),
    nat = n => it.filter(i => i.nature === n),
    sp = k => spices.filter(x => x === k).length;
  const full = it.reduce((a, i) => a + i.full, 0),
    ginger = items.includes('ginger'),
    meat = tag('meat').length;
  const sc = {
    warm:
      (method === 'stew' ? 2 : 0) +
      nat('warm').length +
      (ginger ? 3 : 0) -
      (method === 'mix' ? 3 : 0) +
      (sp('chili') ? 2 : 0) +
      (sp('wine') ? 1 : 0),
    cool:
      nat('cool').length * 1.5 +
      (method === 'mix' ? 2 : 0) -
      (method === 'roast' ? 2 : 0) -
      nat('warm').length -
      (ginger ? 3 : 0) +
      (sp('vinegar') ? 1.5 : 0) -
      (sp('chili') ? 2 : 0),
    hearty:
      tag('staple').length * 1.5 + (method === 'fry' || method === 'roast' ? 1 : 0) + meat * 2,
    fresh:
      tag('wild').length * 2 +
      tag('herb').length * 2.5 +
      (sp('scallion') ? 1 : 0) +
      (sp('vinegar') ? 1 : 0),
    treat:
      tag('sweet').length * 2 +
      (method === 'roast' ? 1 : 0) +
      (sp('sugar') ? 2.5 : 0) +
      (method === 'roast' && meat ? 1 : 0),
    alert: (items.includes('tea') ? 4 : 0) + (sp('chili') ? 1 : 0),
    guest:
      (items.length >= 3 ? 2 : 0) +
      tag('umami').length * 1.2 +
      (sp('soy') ? 2 : 0) +
      meat * 0.5 +
      (sp('scallion') ? 0.5 : 0),
    filling:
      (full >= 30 ? 2 : 0) +
      (tag('staple').length >= 2 ? 1.5 : 0) +
      (method === 'stew' && items.includes('rice') && items.length > 1 ? 1 : 0) +
      (meat ? 1 : 0),
  };
  const type = ORDER.reduce((best, k) => (sc[k] > sc[best] ? k : best), ORDER[0]);
  const first = list => list[0]?.short || list[0]?.name || '';
  const why = {
    warm: ginger
      ? '姜丝驱寒'
      : sp('chili')
        ? '辣椒下肚，浑身冒汗'
        : nat('warm').length
          ? `${first(nat('warm'))}性温，又是热汤`
          : '热汤热水，下肚就暖',
    cool:
      method === 'mix'
        ? `${first(nat('cool')) || '凉菜'}生拌，爽口解暑`
        : sp('vinegar')
          ? '醋一点，开胃解腻'
          : `${first(nat('cool'))}性凉`,
    hearty: meat ? `${first(tag('meat'))}实在，吃了有力气` : `${first(tag('staple'))}顶饱`,
    fresh: tag('herb').length
      ? '香草提味，人也清爽'
      : tag('wild').length
        ? `${first(tag('wild'))}带着山野的清香`
        : '葱香清爽',
    treat: sp('sugar') ? '甜口的，解馋' : `${first(tag('sweet')) || first(tag('meat'))}香甜`,
    alert: items.includes('tea') ? '茶叶提神' : '辣得人一激灵',
    guest: sp('soy')
      ? '红亮亮的一盘，端出去体面'
      : items.length >= 3
        ? '几样凑成一桌，拿得出手'
        : `${first(tag('umami'))}鲜，适合待客`,
    filling: '分量足，扛饿',
  }[type];
  return { type, why };
}

function tasteOf(items, method, I, spices = []) {
  const it = items.map(k => I(k)),
    n = k => spices.filter(x => x === k).length,
    tag = t => it.filter(i => i.tags.includes(t)).length;
  const salty = n('soy') + tag('cured') + (n('soy') >= 2 ? 1 : 0),
    sweet = n('sugar') * 2 + tag('sweet') + (method === 'roast' && tag('sweet') ? 1 : 0);
  const soupy = method === 'stew',
    dry = (method === 'roast' || (method === 'fry' && (tag('staple') || tag('meat')))) && !soupy;
  const juicy = method === 'mix' && (tag('crisp') || tag('raw'));
  const words = [],
    notes = [];
  let water = soupy ? 12 : juicy ? 6 : 0,
    mood = 0;
  if (salty >= 2) {
    words.push('偏咸');
    water -= 10;
    mood -= 1;
    notes.push('偏咸：下饭，吃完口渴，心情也差一点');
  }
  if (sweet >= 4) {
    words.push('太甜');
    water -= 4;
    mood += 1;
    notes.push('太甜：解馋，但有点腻、口干');
  }
  if (dry) {
    words.push('干');
    water -= 6;
    notes.push('干：烤的炒的没汤水，吃完要喝水');
  }
  if (soupy) notes.push('有汤水：吃完解渴');
  return { words, notes, water: Math.max(-20, Math.min(20, water)), mood };
}

export { buffOf, tasteOf };
