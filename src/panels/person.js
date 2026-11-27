import { PEOPLE } from '../content/people.js';
import { OLD_TRAITS } from '../content/traits.js';
import { tierWord } from '../content/talk.js';
import { esc } from './html.js';
import { standingUrl, uiIconImg } from './icons.js';

const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n);
const names = list => (list === null ? '未记' : list.map(x => esc(x.name)).join('、') || '无');
const portrait = look => `<img class="pixel folio-person" src="${standingUrl(look)}" alt="">`;
const stamp = label => `<strong class="folio-stamp">${label}</strong>`;
const part = p => esc(p.label) + ' ' + signed(p.delta);

function attributes(profile, selected) {
  const detail = profile.attrs.find(a => a.id === selected);
  const rows = profile.attrs
    .map(
      a =>
        `<button class="folio-stat" data-do="bookAttr" data-attr="${esc(a.id)}" aria-expanded="${a === detail}">
      ${uiIconImg('attr_' + a.id, 24)}<span>${esc(a.name)}</span><b>${a.value}</b>
      <i><em style="width:${Math.min(100, Math.max(0, a.value * 5))}%"></em></i></button>`,
    )
    .join('');
  return (
    rows +
    (detail
      ? `<div class="folio-detail"><b>${esc(detail.name)}明细</b><div>
    ${detail.parts.map(p => (p.id === 'base' ? esc(p.label) + ' ' + p.delta : part(p))).join('　')}　= ${detail.value}</div></div>`
      : '')
  );
}

function rosterOf(game) {
  const villagers = game.ask('bonds').map(b => ({ ...b, look: PEOPLE[b.id].look }));
  const { active, book } = game.ask('visitors');
  const away = book.filter(b => !active.some(v => v.id === b.id));
  return [
    ['村里乡邻', villagers],
    ['在村过客', active],
    ['来过的熟客', away],
  ];
}
export function personaBody(m, game, mods) {
  const groups = rosterOf(game);
  const bonds = groups.flatMap(([, people]) => people);
  const other = bonds.find(b => b.id === m.who);
  const profile = game.ask('persona', other?.id);
  const person = other || game.ask('hero');
  const options = [{ id: '', name: '你' }, ...bonds]
    .map(b => `<button data-do="bookWho" data-who="${esc(b.id)}">${esc(b.name)}</button>`)
    .join('');
  const traits = profile.tempers.map(
    t =>
      `<div>${uiIconImg('temper_' + t.id, 32)}<b>${esc(t.name)}</b><small>${esc(t.desc)}</small></div>`,
  );
  for (let i = 0; i < (other ? profile.unseen : 3 - profile.tempers.length); i++)
    traits.push(
      `<div><i class="folio-blank"></i><small>${other ? '还看不出' : '还没定下'}</small></div>`,
    );
  const line = profile.line;
  const level = line ? ['一级', '二级', '三级', '四级'][line.lv - 1] : '';
  const earned = other
    ? ''
    : '　历练 ' +
      names(game.ask('growth').traits.filter(t => t.owned && !Object.hasOwn(OLD_TRAITS, t.id)));
  const n = profile.stress;
  const bowl = n < 40 ? 'low' : n < 70 ? 'mid' : 'high';
  const snap = other ? null : game.ask('stress').snap;
  const cope = snap
    ? `<div class="folio-snap"><b>憋不住了</b><small>${esc(snap.line)}</small>${snap.choices
        .map(
          c =>
            `<button data-do="cope" data-coping="${esc(c.id)}">${esc(c.name)}<small>${esc(c.note)}</small></button>`,
        )
        .join('')}</div>`
    : '';
  return `<div class="folio"><section><header>${stamp('人物')}<details class="folio-picker"><summary>看谁 · ${esc(person.name)}</summary>
    <div>${options}</div></details></header>
    <div class="folio-identity">${portrait(person.look)}<div><h2>${esc(person.name)}</h2>
    ${line ? esc(line.name) + '<br>' + level + ' · ' + esc(line.title) : '出身未记'}</div></div>
    <div class="folio-traits">${traits.join('')}</div><small>根骨天资 ${names(profile.innate)}　毛病 ${names(profile.coping)}${earned}</small>
    ${n === null ? '' : `<div class="folio-stress">${uiIconImg('stress_' + bowl, 28)}心烦　${n} / 100</div>`}${cope}</section>
    <section><header>${stamp('六项')}<small>二十为满</small></header>${attributes(profile, m.attr)}${mods}</section></div>`;
}

export function ledgerBody(m, game) {
  const groups = rosterOf(game);
  const bonds = groups.flatMap(([, people]) => people);
  const person = bonds.find(b => b.id === m.ledgerWho) || bonds[0];
  const opinion = game.ask('opinion', person.id);
  const group = (title, rows) =>
    `<div class="folio-entry"><span>${title}</span><div>${rows.join('<br>') || '无'}</div></div>`;
  const affinity = opinion.parts.filter(
    p => p.id.startsWith('same.') || p.id.startsWith('clash.') || p.id === 'unseen',
  );
  const reasons = opinion.parts.filter(p => p.id.startsWith('why.'));
  const lines = reasons
    .slice(0, 3)
    .map(p => part(p) + ' · ' + (p.left == null ? '一直记着' : '余 ' + p.left + ' 天'));
  if (reasons.length > 3) lines.push('还有 ' + (reasons.length - 3) + ' 条');
  const roster = groups
    .map(
      ([label, list]) =>
        `<h3>${label}</h3>` +
        (list
          .map(b => {
            const detail = b.title || (b.known ? tierWord(b.known) : '还没说过话');
            return `<button data-do="ledgerWho" data-who="${esc(b.id)}" aria-pressed="${b === person}">
      ${esc(b.name)}<small>${esc(detail)}${b.visits ? ' · 来过 ' + b.visits + ' 回' : ''}</small></button>`;
          })
          .join('') || '<small>暂无</small>'),
    )
    .join('');
  return `<div class="folio folio-ledger"><section><header>${stamp('乡邻')}</header><nav>${roster}</nav></section>
    <section><header>${stamp('人情账')}</header><div class="folio-identity">${portrait(person.look)}
    <div><h2>${esc(person.name)}</h2>${esc(person.title || person.role)}</div><b class="folio-score">好感 ${signed(opinion.value)}</b></div>
    ${group('相投相冲', affinity.map(part))}${person.title ? '' : group('好感来由', lines)}
    ${person.title ? '' : group('熟悉', opinion.parts.filter(p => p.id === 'known').map(part))}
    <button data-do="bookWho" data-who="${esc(person.id)}">看人</button></section></div>`;
}
