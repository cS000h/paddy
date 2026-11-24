// 采集点、钓点、院里干活的那一条：底下一排“挑哪件活”，挑了就合上，人在世界里去做（见 app/activities.js）。
// 每个按钮上是活的名字，底下一行小字是花多少力气、今天还剩几次，做不了的灰着、写着为什么。
// 钓鱼时看浮漂的那一下也在这里。
import { ACTIVITY_HINTS } from '../content/life-text.js';
import { FISH_TIMING } from '../content/activities.js';
import { costText } from '../shell/words.js';
import { button, actions, close, title, para, esc } from './html.js';
import { timingBar } from './timing.js';
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
  const resume =
    outing && data.pending && m.station === 'fish'
      ? button('resumeFish', '浮漂还在水里，接着钓', { main: true })
      : '';
  return `${title(m.label || '院里院外', sub)}
    ${resume ? `<div class="row">${resume}</div>` : ''}
    <div class="picks">${supper}${data.options.map(pick).join('')}</div>
    ${actions(close('算了', false))}`;
}

export function fishView() {
  return `${title('溪湾垂钓', '浮漂沉到青色一段，提竿')}
    ${para('按空格或点“提竿”。正中更容易钓到两条；错过也要花一次机会。', 'aside')}
    ${timingBar(FISH_TIMING.center, FISH_TIMING.half)}
    ${actions(button('fishGiveUp', '收竿回去'), button('fishReel', '提竿', { main: true }))}`;
}
