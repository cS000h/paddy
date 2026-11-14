import { CROPS, ITEMS } from '../content/items.js';
import { itemImg } from './icons.js';
const SEASONS = ['春', '夏', '秋', '冬'];
export function weatherView(m, game, esc) {
  const w = game.ask('weather'),
    b = game.ask('comfort'),
    c = game.ask('clock');
  return `<h2>抬头看天<small>${c.seasonName} · ${w.name} · ${w.temperature}°</small></h2>
  <p>身上觉得${b.word}${b.chill ? '，有些着凉，喝碗热汤歇歇' : ''}。${esc(b.parts.map(p => p.label).join('、'))}</p>
  <p>看云色，明天可能${w.forecast.name}，把握${w.forecast.acc}%。仔细看天，经验和把握都会长一点。</p>
  <p class="aside">${w.tags.includes('wet') ? '雨水替你润地，连雨记得开沟；林边也许有新菌子。' : '土里的水不会一夜消失。去地里摸摸干湿，再决定要不要浇。'}</p>
  <h3>当季可种</h3><p>${Object.values(CROPS)
    .filter(p => p.seasons.includes(c.season))
    .map(p => p.name)
    .join('、')}</p>
  <div class="row"><button data-do="close">知道了</button><button data-do="skyLook" ${w.looked ? 'disabled' : ''}>${w.looked ? '今天仔细看过了' : '仔细看天'}</button></div>`;
}
export function seedsView(m, game, esc) {
  const goods = game.ask('pack').items,
    season = game.ask('clock').season;
  return `<h2>挑菜种<small>从阿满那里捎来后，记得装进行囊</small></h2><ul class="items">${Object.values(
    CROPS,
  )
    .map(c => {
      const n = goods.find(i => i.id === c.seed)?.n || 0;
      return `<li>${itemImg(c.seed)}<span class="what">${esc(ITEMS[c.seed].name)} ×${n}<small>${c.seasons.map(i => SEASONS[i]).join('、')} · ${c.days}日长成${c.regrow ? ' · 留根再长' : ''}</small></span><button data-do="seedChoose" data-seed="${c.seed}" ${n && c.seasons.includes(season) ? '' : 'disabled'}>拿来播种</button></li>`;
    })
    .join('')}</ul><div class="row"><button data-do="close">收好</button></div>`;
}
export function fieldView(m, game, esc) {
  const p = game.ask('farm.detail', m.x, m.y);
  if (!p) return '<p>还没有锄过的地。走到菜地边，先锄一格。</p><button data-do="close">好</button>';
  const labels = { weed: '拔草', bugs: '捉虫', drain: '开排水沟', manure: '施肥' };
  return `<h2>${esc(p.name)}<small>${p.crop ? `已长 ${p.age}/${p.days} 日` : '等你下种'}</small></h2>
  <p>水分 ${p.water}/30（${p.water < 8 ? '干了' : p.water > 26 ? '积水' : '湿润'}） · 地力 ${p.fert}/10</p>
  <p>${p.weeds ? '杂草抢着长。' : '地里没有杂草。'}${p.bugs ? '叶子被虫啃了，晚间来捉。' : '叶子没有虫眼。'}${p.drained ? '水沟已经开好。' : '连雨时可以开沟防涝。'}</p>
  <ul class="items">${p.options.map(o => `<li><span class="what">${labels[o.kind]}<small>${esc(o.reason || '体力 ' + o.cost.value + (o.cost.parts.length ? ' · ' + o.cost.parts.map(a => a.label).join('、') : ''))}</small></span><button data-do="fieldCare" data-kind="${o.kind}" ${o.reason ? 'disabled' : ''}>动手</button></li>`).join('')}</ul>
  <div class="row"><button data-do="close">继续忙</button></div>`;
}
