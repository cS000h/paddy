import { esc } from './html.js';

function foodRow(group, days) {
  const counts = days.map(day => day[group.id]);
  const note = esc(group.note) + (group.id === 'meat' ? '（豆腐也算荤）' : '');
  const cells = counts.map(n => {
    const dots = '<i></i>'.repeat(Math.min(n, 3));
    return `<td aria-label="${n}回"><span class="diet-grains" aria-hidden="true">${dots}</span></td>`;
  });
  return `<tr class="${counts.some(Boolean) ? '' : 'diet-quiet'}">
    <th scope="row">${esc(group.name)}<small>${note}</small></th>${cells.join('')}</tr>`;
}

function tastes({ likes, dislikes }) {
  if (!likes.length && !dislikes.length) return '什么都吃得下';
  const words = list => list.map(esc).join('、') || '无';
  return `<span>爱吃　${words(likes)}</span><span>忌口　${words(dislikes)}</span>`;
}

export function dietPage(game) {
  const { groups, days, states, palate, villagers, tasted } = game.ask('diet');
  if (!tasted && !days.some(day => groups.some(g => day[g.id])))
    return '<p>灶火才刚生起，这几日还没正经吃过什么。</p>';
  const current = states.map(
    s =>
      `<details class="diet-state ${s.kind === 'bad' ? 'bad' : 'good'}">
      <summary>${esc(s.name)}</summary><p>${esc(s.desc)}</p></details>`,
  );
  const neighbors = villagers.map(
    v =>
      `<div class="diet-neighbor"><b>${esc(v.name)}</b><div>
      ${v.known ? tastes(v) : '还不算熟络，摸不清爱吃哪一口。'}</div></div>`,
  );
  return `<div class="diet-page"><section><h3>近三日吃食</h3>
    <table><thead><tr><td></td><th scope="col">前天</th><th scope="col">昨天</th>
    <th scope="col">今天</th></tr></thead><tbody>${groups.map(g => foodRow(g, days)).join('')}
    </tbody></table>
    ${current.length ? '<h3>眼下</h3>' + current.join('') : ''}
    <h3>我的口味</h3><div class="diet-palate">${tastes(palate)}</div></section>
    <section><h3>乡邻爱吃</h3>${neighbors.join('')}</section>
    <small class="diet-total">吃过 ${tasted} 道菜</small></div>`;
}
