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

export function activityView(m, game, here) {
  const outing = m.group === 'outing';
  const data = game.ask(outing ? 'outings' : 'homestead', m.station, here);
  const coop =
    !outing && m.station === 'coop'
      ? `${data.coop ? '鸡窝搭好了' : '先用三根柴搭窝'} · ${data.hens}只鸡 · ${data.eggs}个蛋`
      : '';
  const dishes = m.dining ? game.ask('kitchen', here).carried : [];
  const supper = dishes
    .map(d =>
      button('dishEat', '', {
        data: { id: d.id },
        html: servedImg(d) + esc('吃' + d.name),
      }),
    )
    .join('');
  const sub = m.dining
    ? supper
      ? '带来的饭菜'
      : '可从院灶端一份饭进来吃'
    : coop || (data.weather ? data.weather.name : '挑一件做');
  return `${title(m.label || '院里院外', sub)}
    <div class="picks">${supper}${data.options.map(pick).join('')}</div>
    ${actions(close('算了', false))}`;
}
