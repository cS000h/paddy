import { FISH_TIMING } from '../content/activities.js';
export function activityView(m, game, esc, here) {
  const query = m.group === 'outing' ? 'outings' : 'homestead';
  const data = game.ask(query, m.station, here);
  const extra =
    query === 'homestead' && m.station === 'coop'
      ? `<p>${data.coop ? '鸡窝搭好了' : '先用三根柴搭窝'} · ${data.hens}只鸡 · ${data.eggs}个蛋</p>`
      : '';
  return `<h2>${esc(m.label || '院里院外')}<small>${data.weather ? esc(data.weather.name) : '慢慢做，不着急'}</small></h2>${extra}
 ${data.pending && m.station === 'fish' ? '<button class="main" data-do="resumeFish">浮漂还在水里，继续钓</button>' : ''}
 <ul class="items">${data.options
   .map(
     a => `<li><span class="what">${esc(a.label)}<small>${a.materials || ''} · 体力 ${a.cost.value}${a.left !== undefined ? ' · 今天还剩' + a.left + '次' : ''}</small>
 <small>${esc(a.reason || a.cost.parts.map(p => p.label + (p.delta > 0 ? '+' : '') + p.delta).join('、') || '可以动手')}</small></span>
 <button data-do="activity" data-id="${a.id}" ${a.reason ? 'disabled' : ''}>${a.id === 'fish' ? '下竿' : '动手'}</button></li>`,
   )
   .join('')}</ul>
 <div class="row"><button data-do="close">回去</button></div>`;
}
export function fishView() {
  return `<h2>溪湾垂钓<small>浮漂沉到青色一段，提竿</small></h2><p>按空格或点“提竿”。正中更容易钓到两条；错过也要花一次机会。</p>
 <div class="timing"><span class="zone" style="left:${FISH_TIMING.center - FISH_TIMING.half}%;width:${FISH_TIMING.half * 2}%"></span><i data-timing></i></div>
 <div class="row"><button data-do="fishGiveUp">收竿回去</button><button class="main" data-do="fishReel">提竿</button></div>`;
}
