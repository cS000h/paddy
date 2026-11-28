// 采集点、院里干活的那一条：底下一排“挑哪件活”，挑了就合上，人在世界里去做（见 app/activities.js）。
// 每个按钮上是活的名字，底下一行小字是花多少力气、今天还剩几次，做不了的灰着、写着为什么。
// 钓鱼另有小窗，见 panels/fishing.js。
import { ACTIVITY_HINTS } from '../content/life-text.js';
import { costText } from '../shell/words.js';
import { button, actions, close, title, para, esc } from './html.js';
import { servedImg } from './stove-picture.js';

function pick(a) {
  const note =
    a.reason ||
    [costText(a.cost), a.materials, a.left !== undefined && `今天还剩${a.left}次`]
      .filter(Boolean)
      .join(' · ');
  const tip = ACTIVITY_HINTS[a.id] ? ` title="${esc(ACTIVITY_HINTS[a.id])}"` : '';
  return `<button data-do="activity" data-id="${esc(a.id)}"${a.reason ? ' disabled' : ''}${tip}>
    <b>${esc(a.label)}</b><small>${esc(note)}</small></button>`;
}

/** 木墩边：院里六处能修的地方（sim/plugins/yard-fix.js）。修好的不再列。 */
function fixes(game, here) {
  const rows = game.ask('yard.fix', here).filter(r => !r.fixed);
  if (!rows.length) return '';
  const one = (r, help) => {
    const how = help ? r.help : r;
    const note =
      how.reason || [how.materials, !help && r.check && `看${r.check}`].filter(Boolean).join(' · ');
    return `<button data-do="yardFix" data-id="${esc(r.id)}" data-help="${help ? 1 : 0}"${how.reason ? ' disabled' : ''} title="${esc(r.open)}">
    <b>${esc((help ? '请老鲁搭手修' : '修') + r.name)}</b><small>${esc(note)}</small></button>`;
  };
  return rows.map(r => one(r, false) + (r.help ? one(r, true) : '')).join('');
}

/** 窗下饭桌：手上端着的放下，桌上摆着的坐下一起吃，或端回手上；行囊里能随手吃的也在这儿吃。 */
function diningPicks(game, here) {
  const t = game.ask('table', here);
  const hands = new Set(t.hands.map(d => d.id));
  const dish = (act, label, d) =>
    button(act, '', { data: { id: d.id }, html: servedImg(d) + esc(label + d.name) });
  const set = t.hands.map(d => dish('dishSet', '放下', d)).join('');
  const lift = t.dishes.map(d => dish('dishLift', '端起', d)).join('');
  const eat = t.dishes.length
    ? button('tableEat', '', {
        main: true,
        html: `<b>坐下吃饭</b><small>桌上${t.dishes.length}样一起吃，算一顿</small>`,
      })
    : '';
  const packed = game
    .ask('kitchen', here)
    .carried.filter(d => !hands.has(d.id))
    .map(d => dish('dishEat', '吃', d))
    .join('');
  return set + eat + lift + packed;
}

function diningNote(game, here) {
  const t = game.ask('table', here);
  if (t.dishes.length) return `桌上摆着${t.dishes.length}样（最多${t.seats}样）`;
  return t.hands.length ? '把手上的菜放下' : '去院里灶台端一样热菜进来';
}

export function activityView(m, game, here) {
  const outing = m.group === 'outing';
  const data = game.ask(outing ? 'outings' : 'homestead', m.station, here);
  const coop =
    !outing && m.station === 'coop'
      ? `${data.coop ? '鸡窝搭好了' : '先用三根柴搭窝'} · ${data.hens}只鸡 · ${data.eggs}个蛋`
      : '';
  const supper = m.dining ? diningPicks(game, here) : '';
  const sub = m.dining
    ? diningNote(game, here)
    : coop || (data.weather ? data.weather.name : '挑一件做');
  return `${title(m.label || '院里院外', sub)}
    <div class="picks">${supper}${data.options.map(pick).join('')}${m.station === 'workbench' ? fixes(game, here) : ''}</div>
    ${actions(close('算了', false))}`;
}
