// 随机随机事件弹窗与流动过客面板（含熟人册）。
import { button, actions, close, title, para, esc } from './html.js';

export function eventView(m, game) {
  if (m.line) {
    return `${title(m.title || '一件小事', m.success === false ? '差了点意思' : '有了眉目')}
      ${para(m.line)}
      ${actions(close('收好', true))}`;
  }
  const ev = game.ask('events').active;
  if (!ev) {
    return `${title('村里小事')}
      ${para('眼下安安静静，没有什么待办的小事。')}
      ${actions(close('回去', false))}`;
  }
  const choices = ev.choices.map(c => {
    const tags = [];
    if (c.check) tags.push(`${c.check.statName} ${c.check.statValue} · 把握 ${c.check.chance}%`);
    if (c.costCoins) tags.push(`花 ${c.costCoins} 文`);
    if (c.reason) tags.push(c.reason);
    const meta = tags.length ? `<small>${esc(tags.join(' · '))}</small>` : '';
    const html = `${esc(c.label)}${meta}`;
    return button('eventPick', '', {
      data: { choice: c.index },
      disabled: c.disabled,
      cls: c.reqTrait ? 'trait-choice' : '',
      html,
    });
  });
  return `${title(ev.title, `第 ${ev.day} 日`)}
    ${para(ev.text)}
    <div class="origin-choices">${choices.join('')}</div>
    ${actions(close('先放一放', false))}`;
}

function visitorCard(v, dish) {
  const mark = v.returning ? ' · 熟客' : '';
  const traits = v.traits.join('、');
  const needText = v.done
    ? '这回的托付已经办好了'
    : `${v.need.text}（谢礼 ${v.rewardCoins} 文${v.rewardItem ? `、${v.rewardItem}×${v.rewardN}` : ''}）`;
  const talkBtn = button('visitorTalk', v.talkedToday ? '今日已聊' : '聊闲话', {
    data: { id: v.id },
    disabled: v.talkedToday,
  });
  const canDish = v.need.kind !== 'dish' || !!dish;
  const fulfillBtn = button('visitorFulfill', v.done ? '已办好' : v.need.kind === 'dish' ? '端份热饭' : '交给他', {
    data: { id: v.id, ...(dish ? { dish: dish.id } : {}) },
    disabled: v.done || !canDish,
    main: !v.done && canDish,
  });
  return `<li><span class="what">
    <b>${esc(v.name)} · ${esc(v.title)}${mark}</b>
    <small>${esc(v.spotName)} · 还留 ${v.left} 天 · 性情：${esc(traits)} · 熟悉 ${v.rel}</small>
    <small>${esc(needText)}</small>
  </span><span class="acts">${talkBtn}${fulfillBtn}</span></li>`;
}

export function visitorsView(m, game, here) {
  const data = game.ask('visitors');
  const kitchen = game.ask('kitchen', here);
  const dish = kitchen.carried[0] || kitchen.dishes[0] || null;
  const activeRows = data.active.map(v => visitorCard(v, dish)).join('');
  const bookRows = data.book
    .map(
      b =>
        `<li><span class="what"><b>${esc(b.name)} · ${esc(b.title)}</b>` +
        `<small>性情：${esc(b.traits.join('、'))} · 来过 ${b.visits} 回 · 熟悉 ${b.rel}</small></span></li>`,
    )
    .join('');
  return `${title('村中过客', `在村 ${data.active.length} 位 · 熟人册 ${data.book.length} 位`)}
    ${m.line ? para(m.line) : para('赶集日和换季常有外村客人在茶摊、村口和渡口歇脚。聊得投机或帮上忙，下回还会回来找你。', 'aside')}
    <h3>眼下在村里</h3>
    <ul class="items">${activeRows || '<li><span class="what"><small>这会儿村里没有过客，赶集日再来看看。</small></span></li>'}</ul>
    <h3>熟人册</h3>
    <ul class="items">${bookRows || '<li><span class="what"><small>还没记下回头客，多和过客聊聊或送份热饭吧。</small></span></li>'}</ul>
    ${actions(close('收好', false))}`;
}
