// 行囊和橱柜两个小窗里写什么。
//   bag   随时能开：身上带着什么，哪些能直接吃，水壶里还有几口
//   store 站在橱柜跟前才开：左边是家里存的，右边是身上带的，来回倒腾
import { dishRows } from './kitchen.js';
import { button, actions, close, title, para, itemRow, itemList, esc } from './html.js';

// 直接吃下去是什么效果，写成一行小字。
function eatNote(eat) {
  const parts = [`饱腹 +${eat.full}`];
  if (eat.energy) parts.push(`体力 +${eat.energy}`);
  if (eat.mood) parts.push(`心情 +${eat.mood}`);
  if (eat.water > 0) parts.push('解渴');
  if (eat.water < 0) parts.push('口干');
  return parts.join(' · ');
}

const eatButton = item =>
  item.eat ? button('eat', '吃', { data: { item: item.id }, title: eatNote(item.eat) }) : '';

/** 饿不饿、渴不渴、心情怎样，吃过的饭菜还管着什么好处。 */
function bodyLine(game) {
  const b = game.ask('body');
  const words = [b.hungerWord, b.thirstWord, '心情' + b.moodWord];
  if (b.stuffedWord) words.push(b.stuffedWord);
  const buff = b.buff
    ? `<p class="buff-note"><b>${esc(b.buff.name)}</b>　${esc(b.buff.text)}</p>`
    : '';
  return `${para(words.join(' · '), 'body-line')}${buff}`;
}

function flaskRow(pack) {
  if (!pack.flask) return '';
  const { left, max } = pack.flask;
  return itemRow({
    icon: 'flask',
    name: '水壶里的水',
    count: `${left}/${max} 口`,
    notes: ['在井边、溪边喝水时会顺手灌满'],
    acts: button('sip', '喝一口', { disabled: !left }),
  });
}

const progress = () => button('saves', '进度与玩法');

export function bagView(modal, game, here) {
  const pack = game.ask('pack', here);
  const items = pack.items.map(item =>
    itemRow({
      icon: item.id,
      name: item.name,
      count: item.n,
      notes: [item.eat ? eatNote(item.eat) : item.text],
      acts: eatButton(item),
    }),
  );
  const where = pack.atHome
    ? '家里存的东西在小屋的橱柜里。'
    : '家里存的东西在小屋的橱柜里，出了院子就够不着了。';
  const rows = [...items, dishRows(pack.dishes, true), flaskRow(pack)].filter(Boolean);
  const how = pack.basket ? '野货装在竹篮里，连篮子只占一格' : '一格放一样东西';
  return `${title('行囊', `${pack.used}/${pack.cap} 格 · ${how}`)}
    ${bodyLine(game)}
    ${itemList(rows, '空的')}
    ${para(where, 'aside')}
    ${actions(progress(), close())}`;
}

export function storeView(modal, game, here) {
  const pack = game.ask('pack', here);
  const full = pack.room < 1;
  const stored = game.ask('home').items.map(item => {
    const stuck = !item.carry || (full && !pack.items.some(i => i.id === item.id));
    const hint = !item.carry ? '不好随身带' : stuck ? '行囊满了' : '';
    const take = n =>
      button('packPut', n === 'all' ? '全拿' : '拿一份', {
        data: { item: item.id, n },
        disabled: stuck,
        title: hint,
      });
    return itemRow({
      icon: item.id,
      name: item.name,
      count: item.n,
      notes: [hint],
      acts: eatButton(item) + take(1) + (item.n > 1 ? take('all') : ''),
    });
  });
  const carried = pack.items.map(item =>
    itemRow({
      icon: item.id,
      name: item.name,
      count: item.n,
      acts: eatButton(item) + button('packTake', '放下', { data: { item: item.id, n: 'all' } }),
    }),
  );
  return `${title('橱柜', '家里存的东西都在这儿')}
    <div class="two">
      <section><h3>家里存的</h3>${itemList(stored, '空的')}</section>
      <section><h3>身上带的 <small>${pack.used}/${pack.cap} 格</small></h3>
        ${itemList([...carried, flaskRow(pack)].filter(Boolean), '空的')}</section>
    </div>
    ${actions(progress(), close())}`;
}
