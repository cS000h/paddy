// 和乡邻来往的两个小窗：说话送礼，和院门边托阿满买卖的收菜筐。
import { PEOPLE, ROUTINE_DAY } from '../content/people.js';
import { TOPICS, LOOK, tierWord } from '../content/talk.js';
import { itemImg } from './icons.js';
import { button, actions, close, title, para, itemRow, itemList, esc } from './html.js';

/** 身上带着拿得出手的东西、做好的饭菜，就可以送一样；一人一天收一回。 */
function giftsFor(modal, game, here) {
  const person = PEOPLE[modal.who];
  const bond = game.ask('bonds').find(b => b.id === modal.who);
  if (modal.gifted) return '';
  if (bond.giftedToday) return para(`今天已经送过${person.name}东西了，改天再送。`, 'aside');
  const to = modal.who;
  const things = game
    .ask('goods', here)
    .filter(item => item.gift)
    .map(item =>
      button('gift', '', {
        data: { to, item: item.id },
        html: `${itemImg(item.id)}${esc(item.name)}`,
      }),
    );
  const meals = game.ask('kitchen', here);
  const dishes = [...meals.dishes, ...meals.carried].map(d =>
    button('gift', `端一份${d.name}`, { data: { to, dish: d.id } }),
  );
  if (!things.length && !dishes.length) return para('身上没带拿得出手的东西。', 'aside');
  return `<div class="gifts"><span class="lead">送点什么</span>${things.join('')}${dishes.join('')}</div>`;
}

/**
 * 还能问的几件事（近况、安排、天色）：今天问过的灰着；天黑了不问安排。
 * 熟了可以约他明天午前茶摊坐坐；约好的那天午前在茶摊碰上，就能坐下来聊一会儿。
 */
function topicsFor(modal, bond, night, visits) {
  const asks = ['news', 'plan', 'sky'].map(topic =>
    button('talkTopic', TOPICS[topic], {
      data: { to: modal.who, topic },
      disabled: bond.asked.includes(topic) || (topic === 'plan' && night),
    }),
  );
  const mine = visits.active?.npc === modal.who;
  if (mine && visits.active.due)
    asks.unshift(button('visitMeet', `坐下来陪${visits.active.name}聊一会儿`, { main: true }));
  else if (!mine && visits.canInvite && bond.known >= 1 && !night)
    asks.push(button('invite', '约明天午前茶摊坐坐', { data: { to: modal.who } }));
  return `<div class="topics">${asks.join('')}</div>`;
}

/**
 * 和乡邻说话：左边一枚名字印（人物不画脸），右边是谁、在做什么、今天看上去怎样、熟到哪一层；
 * 底下这一句话，再往下是还能问的几件事、送点什么，和“好”。
 */
export function talkView(modal, game, here) {
  const person = PEOPLE[modal.who];
  const bond = game.ask('bonds').find(b => b.id === modal.who);
  const { day, minute } = game.ask('clock');
  const looks = LOOK[modal.who][bond.mood];
  const look = looks[day % looks.length];
  const gained = modal.gain ? `<b class="gain">+${modal.gain}</b>` : '';
  const learned = modal.favorite
    ? para(`记下了：${person.name}最爱吃${modal.favorite}。`, 'aside learned')
    : '';
  return `<div class="speaker"><span class="name-seal">${esc(person.seal || person.name)}</span>
      <span class="who"><b>${esc(person.name)}</b><small>${esc(person.role)} · ${esc(modal.doing)} · ${esc(look)}</small></span>
      <span class="bond">${esc(tierWord(bond.known))}${gained}</span></div>
    <p class="say">${esc(modal.line)}</p>
    ${learned}
    ${topicsFor(modal, bond, minute >= ROUTINE_DAY.home, game.ask('visits'))}
    ${giftsFor(modal, game, here)}
    ${actions(close('好'))}`;
}

export function basketView(modal, game, here) {
  const coins = game.ask('home').coins;
  const basket = game.ask('basket');
  const inside = basket.goods.map(g => `${g.name} ${g.n} 份`).join('、') || '空的';
  const ordered = basket.order.map(g => `${g.name} ${g.n * g.qty} 份`).join('、');
  const put = (item, n, label) => button('basketPut', label, { data: { item: item.id, n } });
  const sell = game
    .ask('goods', here)
    .filter(item => item.basket)
    .map(item =>
      itemRow({
        icon: item.id,
        name: item.name,
        count: item.n,
        notes: [`每份 ${item.sell} 文`],
        acts: put(item, 1, '放一份') + (item.n > 1 ? put(item, item.n, '全放') : ''),
      }),
    );
  const buy = basket.wares.map(ware =>
    itemRow({
      icon: ware.id,
      name: ware.name,
      notes: [`${ware.buy} 文${ware.qty > 1 ? `，一回 ${ware.qty} 份` : ''}`],
      acts: button('basketOrder', '捎一份', {
        data: { item: ware.id, n: 1 },
        disabled: coins < ware.buy,
      }),
    }),
  );
  return `${title('收菜筐', `阿满清早来收，钱留在筐底 · 手头 ${coins} 文`)}
    ${para(`筐里：${inside}。${ordered ? `托阿满捎的：${ordered}，明早送到。` : ''}`)}
    <div class="two">
      <section><h3>放进筐里卖</h3>${itemList(sell, '身上没有阿满肯收的东西')}</section>
      <section><h3>留钱托他捎</h3>${itemList(buy, '')}</section>
    </div>
    ${actions(close())}`;
}
