// 底部对话条里的两类遇事：走到具体地点处理的小事，和走到过客跟前搭话送东西。
import { itemImg } from './icons.js';
import { button, actions, close, para, esc } from './html.js';

/** 走到小事发生地时的底部对话条：短句、短选项，选完关窗并在世界里演出来。 */
export function eventView(m, game) {
  const ev = game.ask('events').active;
  if (!ev) return `${para('这会儿已经没什么动静了。')}${actions(close('好'))}`;
  const choices = ev.choices.map(c => {
    const tags = [];
    if (c.check) tags.push(`${c.check.statName} ${c.check.statValue} · ${c.check.chance}%`);
    if (c.costCoins) tags.push(`${c.costCoins}文`);
    if (c.reason) tags.push(c.reason);
    const meta = tags.length ? ` <small>${esc(tags.join(' · '))}</small>` : '';
    return button('eventPick', '', {
      data: { choice: c.index },
      disabled: c.disabled,
      cls: c.reqTrait ? 'trait-choice' : '',
      html: `${esc(c.label)}${meta}`,
    });
  });
  return `<div class="speaker"><span class="name-seal">事</span>
      <span class="who"><b>${esc(ev.title)}</b><small>${esc(ev.place)}</small></span></div>
    <p class="say">${esc(ev.text)}</p>
    <div class="topics">${choices.join('')}</div>
    ${actions(close('先放一放', false))}`;
}

/** 走到过客跟前时的底部对话条：样式照乡邻说话，能聊闲话、交东西或端热饭。 */
export function visitorView(m, game, here) {
  const v = game.ask('visitors').active.find(x => x.id === m.id);
  if (!v) return `${para('这位过客已经走远了。')}${actions(close('好'))}`;
  const seal = v.name[0] || '客';
  const mark = v.returning ? ' · 熟客' : '';
  const talkBtn = button('visitorTalk', v.talkedToday ? '今日已聊' : '聊闲话', {
    data: { id: v.id },
    disabled: v.talkedToday,
  });
  let fulfillHtml = '';
  if (v.done) {
    fulfillHtml = para('这回的托付已经办好了。', 'aside');
  } else if (v.need.kind === 'dish') {
    const meals = game.ask('kitchen', here);
    const dishes = [...meals.carried, ...meals.dishes].map(d =>
      button('visitorFulfill', `端一份${d.name}`, { data: { id: v.id, dish: d.id }, main: true }),
    );
    fulfillHtml = dishes.length
      ? `<div class="gifts"><span class="lead">${esc(v.need.text)}</span>${dishes.join('')}</div>`
      : para(`${v.need.text}（身上或灶台还没有热饭菜）。`, 'aside');
  } else {
    const goods = game.ask('goods', here);
    const found = goods.find(g => g.id === v.need.item && g.n >= v.need.n);
    const btn = button('visitorFulfill', '', {
      data: { id: v.id },
      disabled: !found,
      main: !!found,
      html: `${itemImg(v.need.item)}交给${esc(v.name)}（${esc(v.need.text)}）`,
    });
    fulfillHtml = `<div class="gifts"><span class="lead">托付</span>${btn}</div>`;
  }
  return `<div class="speaker"><span class="name-seal">${esc(seal)}</span>
      <span class="who"><b>${esc(v.name)}</b><small>${esc(v.title)}${mark} · ${esc(v.traits.join('、'))} · 还留 ${v.left} 天</small></span>
      <span class="bond">熟悉 ${v.rel}</span></div>
    <p class="say">${esc(m.line || v.talkLine)}</p>
    <div class="topics">${talkBtn}</div>
    ${fulfillHtml}
    ${actions(close('好'))}`;
}
