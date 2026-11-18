// 采集点、钓点和院里干家务的小窗，以及钓鱼时看浮漂的那一下。
import { ACTIVITY_HINTS } from '../content/life-text.js';
import { FISH_TIMING } from '../content/activities.js';
import { costText } from '../shell/words.js';
import { button, actions, close, title, para, itemRow, itemList } from './html.js';
import { timingBar } from './timing.js';

function optionRow(a) {
  const used = [a.materials, a.left !== undefined && `今天还剩${a.left}次`].filter(Boolean);
  return itemRow({
    name: a.label,
    notes: [
      [...used, costText(a.cost)].join(' · '),
      ACTIVITY_HINTS[a.id],
      a.reason, // 现在做不了的原因
    ],
    acts: button('activity', a.id === 'fish' ? '下竿' : '动手', {
      data: { id: a.id },
      disabled: !!a.reason,
    }),
  });
}

export function activityView(m, game, here) {
  const outing = m.group === 'outing';
  const data = game.ask(outing ? 'outings' : 'homestead', m.station, here);
  const coop =
    !outing && m.station === 'coop'
      ? para(`${data.coop ? '鸡窝搭好了' : '先用三根柴搭窝'} · ${data.hens}只鸡 · ${data.eggs}个蛋`)
      : '';
  const resume =
    outing && data.pending && m.station === 'fish'
      ? button('resumeFish', '浮漂还在水里，继续钓', { main: true })
      : '';
  return `${title(m.label || '院里院外', data.weather ? data.weather.name : '慢慢做，不着急')}
    ${coop}${para(m.line, 'activity-story')}${resume}
    ${itemList(data.options.map(optionRow), '')}
    ${actions(close('回去', false))}`;
}

export function fishView() {
  return `${title('溪湾垂钓', '浮漂沉到青色一段，提竿')}
    ${para('按空格或点“提竿”。正中更容易钓到两条；错过也要花一次机会。')}
    ${timingBar(FISH_TIMING.center, FISH_TIMING.half)}
    ${actions(button('fishGiveUp', '收竿回去'), button('fishReel', '提竿', { main: true }))}`;
}
