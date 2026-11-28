// 全村地图：七个地方画在一张纸上，路连着路；你在哪儿、乡邻此刻在哪儿都标着。
// 点一个地方，看那儿有什么、要走多久；再点同一个地方（或点“走过去”）就出发。路就是各张地图上的路牌连起来的那些。
import { MAPS, roads, routeTo } from '../content/maps/index.js';
import { ATLAS } from '../content/maps/atlas.js';
import { CALENDAR } from '../content/calendar.js';
import { button, actions, title, para, esc } from './html.js';

// 纸上的山水：一条河从东北流下来，西北是山，院子周围是田。只是画，不能点。
const SCENERY = `
  <path class="river" d="M100 18 C 86 26, 78 22, 66 34 S 58 58, 70 76 S 92 96, 100 100" />
  <path class="hill" d="M4 30 L18 6 L28 22 L38 8 L50 30 Z" />
  <path class="field" d="M38 66 h20 v10 h-20 Z M30 72 h7 v9 h-7 Z" />`;

// 一条路：近的画直，远的往南弯一点，免得横穿中间的地方
function road(a, b) {
  const bend = Math.hypot(b.x - a.x, b.y - a.y) > 50 ? 18 : 0;
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2 + bend;
  return `<path d="M${a.x} ${a.y} Q${cx} ${cy} ${b.x} ${b.y}" />`;
}

function place(id, a, { here, picked, folks }) {
  const cls = ['place', here && 'here', picked && 'picked'].filter(Boolean).join(' ');
  const who = folks.length ? `<small>${esc(folks.join(' '))}</small>` : '';
  const mark = here ? '<em>你在这儿</em>' : '';
  return (
    `<button class="${cls}" data-do="mapPick" data-to="${id}" ` +
    `style="left:${a.x}%;top:${a.y}%">${mark}<b>${esc(MAPS[id].name)}</b>${who}</button>`
  );
}

function info(id, hero) {
  const a = ATLAS[id];
  if (id === hero.map)
    return `<h3>${esc(MAPS[id].name)}</h3>${para(a.note)}${para('你就在这儿。', 'aside')}`;
  const legs = routeTo(hero.map, id);
  if (!legs)
    return `<h3>${esc(MAPS[id].name)}</h3>${para(a.note)}${para('从这儿走不过去。', 'aside')}`;
  const minutes = legs.length * CALENDAR.legMinutes;
  const via =
    legs.length > 1
      ? `，路过${legs
          .slice(1)
          .map(l => MAPS[l.map].name)
          .join('、')}`
      : '';
  return `<h3>${esc(MAPS[id].name)}</h3>${para(a.note)}
    ${para(`沿路走过去要 ${minutes} 分钟${via}。`, 'aside')}
    ${actions(button('goTo', '走过去', { main: true, data: { to: id } }))}`;
}

export function mapView(m, game) {
  const hero = game.ask('hero');
  const folks = game.ask('residents').filter(r => r.visible);
  const lines = roads()
    .filter(([a, b]) => ATLAS[a] && ATLAS[b])
    .map(([a, b]) => road(ATLAS[a], ATLAS[b]))
    .join('');
  const places = Object.entries(ATLAS)
    .map(([id, a]) =>
      place(id, a, {
        here: id === hero.map,
        picked: id === m.pick,
        folks: folks.filter(r => r.map === id).map(r => r.name),
      }),
    )
    .join('');
  const side = m.pick
    ? info(m.pick, hero)
    : para('点一个地方，看看那儿有什么、走过去要多久。', 'aside');
  return `${title('全村地图', `你在${MAPS[hero.map].name}`)}
    <div class="atlas-wrap">
      <div class="atlas"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        ${SCENERY}<g class="roads">${lines}</g></svg>${places}</div>
      <div class="atlas-info">${side}</div>
    </div>`;
}
