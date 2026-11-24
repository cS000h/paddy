// 底部对话条里的两类遇事：走到具体地点处理的小事，和走到过客跟前搭话送东西。
import { button, actions, close, para, esc } from './html.js';

/** 走到小事发生地时的底部对话条：短句、短选项，选完关窗并在世界里演出来。 */
export function eventView(m, game) {
  const ev = game.ask('events').active;
  if (!ev) return `${para('这会儿已经没什么动静了。')}${actions(close('好'))}`;
  const choices = ev.choices.map(c => {
    const tags = [];
    if (c.check) tags.push(`${c.check.attrName} ${c.check.attrValue} · ${c.check.chance}%`);
    if (c.costCoins) tags.push(`${c.costCoins}文`);
    if (c.reason) tags.push(c.reason);
    const meta = tags.length ? ` <small>${esc(tags.join(' · '))}</small>` : '';
    return button('eventPick', '', {
      data: { choice: c.index },
      disabled: c.disabled,
      cls: c.reqTrait ? 'trait-choice' : '',
      html: `${c.traitName ? esc(`「${c.traitName}」`) : ''}${esc(c.label)}${meta}`,
    });
  });
  return `<div class="speaker"><span class="name-seal">事</span>
      <span class="who"><b>${esc(ev.title)}</b><small>${esc(ev.place)}</small></span></div>
    <p class="say">${esc(ev.text)}</p>
    <div class="topics">${choices.join('')}</div>
    ${actions(close('先放一放', false))}`;
}
