// 柜台（杂货铺、茶点摊、路南的摊子）和樟树下的茶桌。
import { TEA_DEEDS } from '../content/market.js';
import { ITEMS } from '../content/items.js';
import { signed } from '../content/text.js';
import { takeKind, kindOf } from '../content/pantry.js';
import { button, actions, close, title, para, itemRow, itemList, esc } from './html.js';

/** 价钱为什么涨落：“刚上市+1，傍晚处理−1”。 */
const priceWhy = why => why.map(([text, n]) => text + signed(n)).join('，');

export function marketView(m, game, here) {
  const shop = m.shop || 'market';
  const market = game.ask('market', shop, here);
  const coins = game.ask('home').coins;
  const wares = market.wares.map(ware =>
    itemRow({
      icon: ware.item,
      name: ware.name,
      notes: [`${ware.price}文 · ${ware.qty}份 · 余${ware.left}`, priceWhy(ware.why)],
      acts: button('marketBuy', '买一回', {
        data: { item: ware.item },
        disabled: coins < ware.price || !ware.left,
      }),
    }),
  );
  const stall = market.stall;
  const sellable = game
    .ask('goods', here)
    .filter(item => item.sell > 0 && (!stall || stall.takes.includes(kindOf(item.id))))
    .map(item => {
      const t = stall ? stall.left : market.takes[takeKind(item.id)];
      const left = t.full
        ? `今天原价还收${t.full}份`
        : t.half
          ? `收满了，再收${t.half}份半价`
          : '今天收够了';
      return itemRow({
        icon: item.id,
        name: item.name,
        count: item.n,
        notes: [
          t.full ? `每份${item.sell}文起` : `半价每份${Math.max(1, Math.floor(item.sell / 2))}文`,
          left,
        ],
        acts: button('marketSell', '卖一份', {
          data: { item: item.id },
          disabled: !t.full && !t.half,
        }),
      });
    });
  const sellNote = stall
    ? `${stall.owner}收这几样：${stall.takes.map(k => ITEMS[k]?.name || k).join('、')}。一天只收几份，集日收得多。`
    : '铺子每样每天只收几份，收满了只给半价。鱼和鲜货也可以卖给想要的乡邻。';
  const sellSide = market.buys
    ? `${itemList(sellable, stall ? '行囊里没有这个摊子收的东西。' : '行囊里还没有可卖的东西。')}
        ${para(sellNote, 'aside')}`
    : para('茶摊只卖不收。要卖东西去杂货铺，或者问问想要的乡邻。', 'aside');
  const name = stall ? `${stall.name} · ${stall.owner}` : shop === 'tea' ? '茶点摊' : '杂货铺';
  const play =
    stall && market.fair ? fairGame(game.ask('fair.game', stall.id, here), game, here, m.line) : '';
  return `${title(name, `${market.fair ? '今日赶集 · ' : ''}手头 ${coins} 文`)}
    ${stall ? para(`“${stall.hawk}”`, 'say') + para(stall.who, 'aside') : ''}
    <div class="two">
      <section><h3>今日的货</h3>${itemList(wares, '今天的货卖完了，明早再来。')}</section>
      <section><h3>卖点随身带的</h3>${sellSide}</section>
    </div>
    ${play}
    ${actions(close('收好东西，继续走', false))}`;
}

/** 集日摊子上的小玩意：猜斤两三个按钮；比大瓜列出行囊里能上秤的菜。玩过了只留一句。 */
function fairGame(g, game, here, line) {
  if (!g) return '';
  const head = `<h3>集日小玩意 · ${esc(g.title)}</h3>`;
  if (g.reason)
    return `<section>${head}${line ? para(line, 'say') : ''}${para(g.reason, 'aside')}</section>`;
  if (g.kind === 'guess')
    return `<section>${head}${para(g.intro, 'say')}${para(`押${g.cost}文，猜中退押钱、白得一块肉。`, 'aside')}
      <div class="acts">${Object.entries(g.choices)
        .map(([choice, label]) => button('fairPlay', label, { data: { kind: 'guess', choice } }))
        .join('')}</div></section>`;
  const crops = game
    .ask('goods', here)
    .filter(item => item.carried > 0 && g.crops.includes(kindOf(item.id)))
    .map(item =>
      itemRow({
        icon: item.id,
        name: item.name,
        count: item.carried,
        notes: ['称完还归你'],
        acts: button('fairPlay', '上秤', { data: { kind: 'weigh', item: item.id } }),
      }),
    );
  return `<section>${head}${para(g.intro, 'say')}
    ${itemList(crops, '行囊里没有能上秤的当季大菜（南瓜、白菜、萝卜、黄瓜）。')}</section>`;
}

/** 茶摊上一件事的说明：花多少时辰、钱和身上会怎样。数从 TEA_DEEDS 来，和规则结算的是同一份。 */
function deedNote(deed) {
  if (deed.note) return deed.note;
  const effects = [
    deed.coins > 0 && `钱${signed(deed.coins)}`,
    deed.water && `水分${signed(deed.water)}`,
    deed.mood && `心情${signed(deed.mood)}`,
    deed.relation && `人情${signed(deed.relation)}`,
  ].filter(Boolean);
  const head = deed.coins < 0 ? `${-deed.coins}文` : deed.minutes ? '一段时辰' : '';
  return [head, effects.join('，')].filter(Boolean).join(' · ');
}

export function teaView(m, game) {
  const t = game.ask('tea');
  const [tea, taste] = t.tea;
  const rows = t.options.map(({ kind, reason }) => {
    const deed = TEA_DEEDS[kind];
    return itemRow({
      name: deed.label.replace('{tea}', tea),
      notes: [reason || deedNote(deed)],
      acts: button('teaDo', deed.act, { data: { kind }, disabled: !!reason }),
    });
  });
  return `${title('樟树下坐坐', taste)}
    <p>${esc(m.line || '树荫落在桌上。坐一会儿，听听村里的事。')}</p>
    ${itemList(rows, '')}
    ${actions(close('起身', false))}`;
}
