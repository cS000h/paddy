// 地点交互集中在这里：面前的东西该提示什么、右下那枚印上刻什么字，点了以后开哪个面板，
// 或者直接动手做（采集点、院里的活，见 work）。规则仍由端口决定，这里只发命令、把结果演出来。
import { PEOPLE } from '../content/people.js';
import { POKES } from '../content/pokes.js';
import { farmable } from '../content/maps/index.js';
import { costText, careNote } from '../shell/words.js';
import { dirTo, toolVerb, fieldTool } from './logic.js';

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
  wardrobe: '照衣镜',
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
  wardrobe: '换装',
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
  if (t.kind === 'decor') {
    const p = POKES[t.decor.kind];
    return { text: p.hint, verb: p.verb, ok: true };
  }
  if (t.kind === 'person')
    return { text: `和${PEOPLE[t.person.id].name}说话`, verb: '说话', ok: true };
  if (t.kind === 'visitor')
    return { text: `和${t.visitor.visitor.name}说话`, verb: '说话', ok: true };
  if (t.kind === 'pulse')
    return { text: `看看${t.pulse.title}`, verb: '看看', ok: true };
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
  const plot = game.ask('farm.detail', t.x, t.y);
  const state = shell.get();
  const tool = state.manualTool ? state.tool : fieldTool(plot);
  const care = careNote(plot);
  if (!tool)
    return { text: care || '看看这格地', verb: '看地', tool: null, ok: true, care: !!care };
  const reason = game.ask('farm.why', tool, t.x, t.y, scene.at(), state.seed);
  const cost = costText(game.ask('action.cost', tool));
  const text = (reason || `${toolVerb(tool)} · ${cost}`) + (care ? ` · ${care}` : '');
  return { tool, text, verb: TOOL_STAMP[tool], ok: !reason, care: !!care };
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
  if (['outing', 'housework'].includes(thing.act)) {
    // 这儿只有一件活可做（采野菜、采菌子、腌菜……）：不必问，走过去就动手
    const { game } = scene.deps;
    const query = thing.act === 'outing' ? 'outings' : 'homestead';
    const options = game.ask(query, thing.station, scene.at()).options;
    if (options.length === 1 && options[0].id !== 'fish') {
      if (options[0].reason) return scene.refuse(options[0].reason);
      return work(scene, thing.act, options[0].id, thing);
    }
    return shell.set({
      modal: {
        kind: 'activity',
        station: thing.station,
        label: thing.label,
        group: thing.act,
        x: thing.x,
        y: thing.y,
      },
    });
  }
  if (thing.act === 'market') {
    const out = scene.send('market.visit', thing, { shop: thing.shop });
    if (!out.ok) return;
  }
  const kind = {
    water: 'water',
    store: 'store',
    wardrobe: 'wardrobe',
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

/**
 * 做一件采集或院里的活：发命令，成了就在 target 那儿把活演出来（world/scripts.js），演完冒一句话。
 * group 是 'outing'（野外）或 'housework'（院里）；被拒绝就把原因说出来。
 */
export function work(scene, group, id, target) {
  const { game, shell } = scene.deps;
  const out = game.dispatch(group === 'outing' ? 'gather' : 'homestead', { id, at: scene.at() });
  if (!out.ok) return scene.refuse(out.reason);
  const line = out.facts.find(f => ['forage.finished', 'home.worked'].includes(f.type))?.data.line;
  scene.performer.play(id, {
    target: target ? { x: target.x, y: target.y } : null,
    then: () => line && shell.toast(line),
  });
  return out;
}

/** 这一格上有没有能随手碰一碰的东西（树、竹、花、草垛……，见 content/pokes.js）。 */
export function decorAt(scene, x, y) {
  return scene.scenery.find(s => s.x === x && s.y === y && POKES[s.kind]) || null;
}

const SHED = { leaf: ['fx:leaf', null], petal: ['fx:petal', null], needle: ['fx:leaf', 0x547a4a] };

/** 碰一碰：那样东西晃一晃，飘下几片叶子或花瓣，有时惊起几只鸟，冒一句话。不改世界。 */
export function poke(scene, decor) {
  const { shell, platform } = scene.deps;
  const p = POKES[decor.kind];
  const { sprite } = decor;
  scene.player.face(dirTo(scene.player.tile, decor));
  platform.audio.play('talk');
  if (!decor.shaking) {
    decor.shaking = true;
    const x = sprite.x;
    scene.tweens.add({
      targets: sprite,
      x: x + 1.5,
      duration: 55,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        sprite.x = x;
        decor.shaking = false;
      },
    });
  }
  const top = sprite.y - sprite.displayHeight * 0.6;
  if (p.fx === 'straw') scene.effects.straw(sprite.x, sprite.y - 6);
  else if (SHED[p.fx]) scene.ambient.shed(sprite.x, top, 5, ...SHED[p.fx]);
  if (p.birds && Math.random() < 0.6) scene.ambient.scare(sprite.x, top);
  if (p.lines.length) shell.toast(p.lines[Math.floor(Math.random() * p.lines.length)]);
}
