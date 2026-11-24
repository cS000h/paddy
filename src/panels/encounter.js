import { PEOPLE } from '../content/people.js';
import { actions, button, close, esc } from './html.js';
import { itemImg } from './icons.js';

function options(m, rows) {
  if (!rows.length) return '';
  if (!m.open) return button('encounterMenu', '接话', { main: true });
  const back = button('encounterMenu', '返回', { data: { group: m.pending ? m.group || '' : '' } });
  const selected = m.pending && rows.find(r => r.key === m.pending);
  if (selected)
    return (
      button('encounterPick', selected.confirm, {
        main: true,
        data: { key: selected.key, confirm: 'yes' },
      }) + back
    );
  const groups = new Set();
  const buttons = [];
  for (const row of rows) {
    if (row.group && !m.group) {
      if (!groups.has(row.group))
        buttons.push(
          button('encounterMenu', row.group, {
            data: row.plot ? { group: row.group, picker: 'field' } : { group: row.group },
          }),
        );
      groups.add(row.group);
    } else if ((row.group || '') === (m.group || '')) {
      buttons.push(
        button('encounterPick', '', {
          data: { key: row.key },
          disabled: !!row.reason,
          html:
            (row.icon ? itemImg(row.icon) : '') +
            esc(row.label) +
            (row.reason ? ' · ' + esc(row.reason) : ''),
        }),
      );
    }
  }
  if (m.group) buttons.push(back);
  return buttons.join('');
}
export function encounterView(m, game, here) {
  const id = m.who || m.id;
  const visitor = m.kind === 'visitor' ? game.ask('visitors').active.find(v => v.id === id) : null;
  const name = visitor?.name || PEOPLE[id]?.name || '过客';
  const rows = game.ask('interaction.options', id, here, m.walking);
  if (m.field) {
    const view = m.fieldView;
    const marks = rows
      .filter(r => r.plot)
      .map(r => {
        if (!view) return '';
        const { x, y } = r.plot;
        const chosen = m.field.x === x && m.field.y === y;
        const label = esc(
          r.label + '，第 ' + (y - view.top + 1) + ' 行第 ' + (x - view.left + 1) + ' 畦',
        );
        return `<button class="crop-pick" data-do="encounterPick" data-key="${esc(r.key)}" aria-label="${label}" aria-pressed="${chosen}" style="left:${view.x + x * view.step}px;top:${view.y + y * view.step}px;width:${view.step}px;height:${view.step}px"></button>`;
      });
    return `<div class="field-caption">${m.field === true ? '点田里的一畦，请石伯看看。' : '<b>' + esc(name) + '</b> ' + esc(m.line)}</div>${marks.join('')}
      <div class="npc-actions">${actions(button('encounterMenu', '回到石伯身边'), close('告辞', false))}</div>`;
  }
  const x = Number(m.anchor?.x) || 160,
    y = Number(m.anchor?.y) || 140;
  return `<div class="npc-bubble" style="--npc-x:${x}px;--npc-y:${y}px"><b>${esc(name)}</b>
    <p class="say">${esc(m.line || '')}</p>${m.favorite ? '<small>记下了最爱吃的' + esc(m.favorite) + '</small>' : ''}</div>
    <div class="npc-actions">${actions(options(m, rows), close('告辞', false))}</div>`;
}
