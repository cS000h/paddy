// 地点交互集中在这里：面前的东西该提示什么、右下那枚印上刻什么字，点了以后开哪个面板。
// 这里只开面板，规则仍由端口决定。
import { PEOPLE } from '../content/people.js';
import { farmable } from '../content/maps/index.js';
import { costText, careNote } from '../shell/words.js';
import { dirTo, toolVerb } from './logic.js';

// 提示条上的话（键鼠时显示在工具栏上方）
export const ACT_HINT = {
  'door.hero': '进小屋',
  travel: '沿路走去',
  sleep: '躺下歇息',
  market: '看看今日的货',
  tea: '坐下喝茶',
  outing: '找些东西',
  housework: '看看能做什么',
  'door.gui': '敲敲门',
  water: '喝水、打水',
  store: '收拾橱柜',
  basket: '看看收菜筐',
  sign: '看路牌',
  kitchen: '生火做饭',
  book: '翻一翻册子',
};

// 印上刻的字：一到两个字，竖着排，一眼看出按下去做什么
const STAMP = {
  'door.hero': '进屋',
  travel: '上路',
  sleep: '歇息',
  market: '买卖',
  tea: '喝茶',
  'door.gui': '敲门',
  water: '打水',
  store: '橱柜',
  basket: '菜筐',
  sign: '看看',
  kitchen: '做饭',
  book: '翻册',
};
const STATION_STAMP = {
  forage: '找菜',
  wood: '捡柴',
  bamboo: '挖笋',
  mushroom: '采菌',
  tea: '采茶',
  chestnut: '拾栗',
  fish: '垂钓',
  workbench: '手艺',
  pickle: '腌菜',
  coop: '鸡窝',
  rest: '歇歇',
};
const TOOL_STAMP = { hoe: '锄地', seed: '播种', can: '浇水', hand: '采收' };

/**
 * 面前那一格的提示：{text, verb, ok, care}；没什么可做是 null。
 * text 是提示条上的一句话，verb 是印上的字，ok 为 false 时 text 写着为什么不行。
 */
export function hintFor(scene, t) {
  const { game, shell } = scene.deps;
  if (t.kind === 'person')
    return { text: `和${PEOPLE[t.person.id].name}说话`, verb: '说话', ok: true };
  if (t.kind === 'thing') {
    const { act, station, label } = t.thing;
    const verb = STATION_STAMP[station] || STAMP[act] || '看看';
    return {
      text: label || ACT_HINT[act],
      verb: act === 'housework' && station === 'tea' ? '喝茶' : verb,
      ok: true,
    };
  }
  if (t.kind === 'water') {
    const reason = game.ask('farm.why', 'refill', t.x, t.y, scene.at());
    return { text: reason || '打水', verb: '打水', ok: !reason };
  }
  if (!farmable(scene.map, t.x, t.y)) return null;
  const tool = shell.get().tool;
  const reason = game.ask('farm.why', tool, t.x, t.y, scene.at(), shell.get().seed);
  const cost = costText(game.ask('action.cost', tool));
  // 地里长了草、生了虫，提示条顺带说一声；工具栏的“看地”也会亮起来
  const care = careNote(game.ask('farm.detail', t.x, t.y));
  const text = (reason || `${toolVerb(tool)} · ${cost}`) + (care ? ` · ${care}` : '');
  return { text, verb: TOOL_STAMP[tool] || toolVerb(tool), ok: !reason, care: !!care };
}

export function touchThing(scene, thing) {
  const { shell, platform } = scene.deps;
  scene.player.face(dirTo(scene.player.tile, thing));
  platform.audio.play('talk');
  if (thing.to) {
    const out = scene.send('travel', thing);
    if (!out.ok) shell.toast(out.reason);
    return;
  }
  if (['outing', 'housework'].includes(thing.act))
    return shell.set({
      modal: { kind: 'activity', station: thing.station, label: thing.label, group: thing.act },
    });
  if (thing.act === 'market') {
    const out = scene.send('market.visit', thing, { shop: thing.shop });
    if (!out.ok) return;
  }
  const kind = {
    water: 'water',
    store: 'store',
    basket: 'basket',
    kitchen: 'kitchen',
    book: 'book',
    sleep: 'sleep',
    tea: 'tea',
    market: 'market',
  }[thing.act];
  if (kind)
    return shell.set({
      modal: { kind, shop: thing.shop, label: thing.label, x: thing.x, y: thing.y },
    });
  return shell.set({
    modal: { kind: 'sign', text: thing.text || '门虚掩着，屋里飘出饭菜的香味。桂嫂大概在灶上忙。' },
  });
}
