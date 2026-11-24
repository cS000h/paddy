// 看天、挑菜种、看一格地并照料它。
import { CROPS, ITEMS, SOIL } from '../content/items.js';
import { CALENDAR } from '../content/calendar.js';
import { costText } from '../shell/words.js';
import { button, actions, close, title, para, itemRow, itemList } from './html.js';

export function weatherView(m, game) {
  const w = game.ask('weather');
  const body = game.ask('comfort');
  const clock = game.ask('clock');
  const feel = `身上觉得${body.word}${body.chill ? '，有些着凉，喝碗热汤歇歇' : ''}。`;
  const why = body.parts.map(p => p.label).join('、');
  const ground = w.tags.includes('wet')
    ? '雨水替你润地，连雨记得开沟；林边也许有新菌子。'
    : '土里的水不会一夜消失。去地里摸摸干湿，再决定要不要浇。';
  const sowable = Object.values(CROPS)
    .filter(crop => crop.seasons.includes(clock.season))
    .map(crop => crop.name)
    .join('、');
  return `${title('抬头看天', `${clock.seasonName} · ${w.name} · ${w.temperature}°`)}
    ${para(feel + why)}
    ${para(`看云色，明天可能${w.forecast.name}，把握${w.forecast.acc}%。仔细看天，经验和把握都会长一点。`)}
    ${para(ground, 'aside')}
    <h3>当季可种</h3>${para(sowable)}
    ${actions(
      close('知道了', false),
      button('skyLook', w.looked ? '今天仔细看过了' : '仔细看天', { disabled: w.looked }),
    )}`;
}

export function seedsView(m, game) {
  const carried = game.ask('pack').items;
  const season = game.ask('clock').season;
  const rows = Object.values(CROPS).map(crop => {
    const n = carried.find(i => i.id === crop.seed)?.n || 0;
    const when = crop.seasons.map(i => CALENDAR.seasons[i]).join('、');
    const grow = `${when} · ${crop.days}日长成${crop.regrow ? ' · 留根再长' : ''}`;
    return itemRow({
      icon: crop.seed,
      name: ITEMS[crop.seed].name,
      count: n,
      notes: [grow],
      acts: button('seedChoose', '拿来播种', {
        data: { seed: crop.seed },
        disabled: !n || !crop.seasons.includes(season),
      }),
    });
  });
  return `${title('挑菜种', '从阿满那里捎来后，记得装进行囊')}
    ${itemList(rows, '')}
    ${actions(close('收好', false))}`;
}

const CARE = { weed: '拔草', bugs: '捉虫', drain: '开排水沟', manure: '施肥' };

/** 这格地的干湿，和规则用同一份界限（content/items.js 的 SOIL）。 */
const moisture = water => (water < SOIL.wet ? '干了' : water > SOIL.soggy ? '积水' : '湿润');

/** 照现在的样子收，出极品的把握有多大；底下一行小字写是哪几样加减的（数由规则算好）。 */
function oddsView(odds) {
  if (!odds) return '';
  const sign = d => (d > 0 ? '+' : '−') + Math.abs(d);
  const parts = odds.parts.map(p => `${p.label} ${p.id === 'base' ? p.delta : sign(p.delta)}`);
  const sum = odds.parts.reduce((n, p) => n + p.delta, 0);
  const edge = sum > odds.value ? '，到顶了' : sum < odds.value ? '，最少也有这些' : '';
  return `${para(`收下来是极品的把握：${odds.value}%${edge}`)}${para(parts.join('　'), 'aside')}`;
}

export function fieldView(m, game) {
  const p = game.ask('farm.detail', m.x, m.y);
  if (!p) return `${para('还没有锄过的地。走到菜地边，先锄一格。')}${actions(close())}`;
  const state = [
    p.weeds ? '杂草抢着长。' : '地里没有杂草。',
    p.bugs ? '叶子被虫啃了，晚间来捉。' : '叶子没有虫眼。',
    p.drained ? '水沟已经开好。' : '连雨时可以开沟防涝。',
  ].join('');
  const rows = p.options.map(o =>
    itemRow({
      name: CARE[o.kind],
      notes: [o.reason || costText(o.cost)],
      acts: button('fieldCare', '动手', { data: { kind: o.kind }, disabled: !!o.reason }),
    }),
  );
  return `${title(p.name, p.crop ? `已长 ${p.age}/${p.days} 日` : '等你下种')}
    ${para(`水分 ${p.water}/${SOIL.waterMax}（${moisture(p.water)}） · 地力 ${p.fert}/${SOIL.fertMax}`)}
    ${para(state)}
    ${oddsView(p.odds)}
    ${itemList(rows, '')}
    ${actions(close('继续忙', false))}`;
}
