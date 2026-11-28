// 地点交互集中在这里：面前的东西该提示什么、右下那枚印上刻什么字，点了以后开哪个面板，
// 或者直接动手做（采集点、院里的活，见 work）。规则仍由端口决定，这里只发命令、把结果演出来。
import { BODY } from '../content/body.js';
import { PEOPLE } from '../content/people.js';
import { POKES } from '../content/pokes.js';
import { SEARCH_LINES } from '../content/search.js';
import { farmable } from '../content/maps/index.js';
import { giftable } from '../content/pantry.js';
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
  sign: '看路牌',
  kitchen: '生火做饭',
  book: '翻一翻册子',
  wardrobe: '照衣镜',
  cloth: '看看布摊上的衣裳',
  stall: '看看摊子上的货',
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
  sign: '看看',
  kitchen: '做饭',
  book: '翻册',
  wardrobe: '换装',
  cloth: '布摊',
  stall: '买卖',
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
function waterOptions(scene, { x, y }) {
  const { game } = scene.deps;
  const at = scene.at();
  const drink = !game.ask('drink.why', x, y, at) && game.ask('body').thirst < BODY.notThirsty;
  const reason = game.ask('farm.why', 'refill', x, y, at);
  return {
    drink,
    refill: !reason,
    text: drink ? (reason ? '喝口水' : '喝水，再灌满水壶') : reason || '灌满浇菜的水壶',
  };
}

export function drawWater(scene, target) {
  const { drink, refill, text } = waterOptions(scene, target);
  if (!drink && !refill) return scene.deps.shell.toast(text);
  if (drink && !scene.send('drink', target).ok) return;
  if (refill && !scene.send('farm.refill', target).ok) return;
  scene.deps.shell.toast(
    drink ? (refill ? '喝过水，也灌满了浇菜的水壶。' : '捧起清水，解了渴。') : '浇菜的水壶灌满了。',
  );
  scene.performer.play('refill', { target });
}

/** 手里拿着能吃的（零嘴、能生吃的、带着的饭菜），面前又没别的事：印上刻「吃」。 */
export function heldHint(scene) {
  const { game, shell } = scene.deps;
  const key = shell.get().held;
  if (!key) return null;
  const slot = game.ask('pack', scene.at()).slots.find(s => s.key === key);
  if (slot?.slot === 'dish') return { text: `吃${slot.name}`, verb: '吃', ok: true, dish: slot.id };
  if (slot?.slot === 'item' && slot.eat)
    return { text: `吃${slot.name}`, verb: '吃', ok: true, eat: slot.id };
  return null;
}

/** 手里拿着的能不能递给人：一样东西或一份饭菜直接递；鱼篓、竹篮里不止一样，打开「递东西」挑。 */
function heldGift(scene) {
  const { game, shell } = scene.deps;
  const key = shell.get().held;
  const slot = key && game.ask('pack', scene.at()).slots.find(s => s.key === key);
  if (!slot) return null;
  if (slot.slot === 'dish') return { name: slot.name, input: { dish: slot.id } };
  if (slot.slot === 'item' && giftable(slot.id))
    return { name: slot.name, input: { item: slot.id } };
  if (['creel', 'basket'].includes(slot.slot)) return { name: slot.name, pick: true };
  return null;
}

/** 拿着东西点人：递过去，对方的话照常在说话框里冒出来。手里空着或拿的不能送，返回 false 照常说话。 */
export function giveHeld(scene, person) {
  const { game, shell, platform } = scene.deps;
  const gift = heldGift(scene);
  if (!gift) return false;
  const modal = {
    kind: 'talk',
    who: person.id,
    walking: person.commuting,
    anchor: scene.headOnScreen(person),
  };
  if (gift.pick) {
    const line = game.ask('resident.greeting', person.id, person.commuting);
    if (!line) return false;
    shell.set({ modal: { ...modal, line, open: true, group: '递东西' } });
    return true;
  }
  const out = game.dispatch('gift', { to: person.id, ...gift.input, at: scene.at() });
  if (!out.ok) {
    scene.refuse(out.reason);
    return true;
  }
  const given = out.facts.find(f => f.type === 'gift.given')?.data;
  platform.audio.play('talk');
  const favorite = given?.favorite === true ? given.dish : given?.favorite;
  shell.set({ modal: { ...modal, line: given?.line || '', open: true, favorite } });
  return true;
}

/** 照 heldHint 吃下去；吃了什么由饮食那边的提示冒出来（app/diet.js）。 */
export function eatHeld(scene) {
  const h = heldHint(scene);
  if (!h) return undefined;
  const at = scene.at();
  const out = h.dish
    ? scene.deps.game.dispatch('dish.eat', { id: h.dish, at })
    : scene.deps.game.dispatch('eat', { item: h.eat, at });
  if (!out.ok) return scene.refuse(out.reason);
  scene.deps.platform.audio.play('talk');
  return out;
}

export function hintFor(scene, t) {
  const { game, shell } = scene.deps;
  if (t.kind === 'decor') {
    const p = POKES[t.decor.kind];
    const why = game.ask('search.why', { x: t.decor.x, y: t.decor.y }, scene.at());
    if (!why) {
      const cost = costText(game.ask('action.cost', 'search'));
      // 有动静的那几处当面说出来：光靠叶子晃一晃，新来的人认不出（G-14 完成标准 3）
      const cue = game
        .ask('search.spots', scene.map.id)
        .some(s => s.cue && s.x === t.decor.x && s.y === t.decor.y);
      return { text: `${cue ? '这儿有动静，' : ''}翻一翻 · ${cost}`, verb: '翻翻', ok: true };
    }
    if (why === SEARCH_LINES.done || why === SEARCH_LINES.nothing)
      return { text: p.hint, verb: p.verb, ok: true };
    return { text: why, verb: p.verb, ok: true };
  }
  if (t.kind === 'person') {
    const name = PEOPLE[t.person.id].name;
    const gift = heldGift(scene);
    if (gift?.pick) return { text: `从${gift.name}里挑一样递给${name}`, verb: '递', ok: true };
    if (gift) return { text: `把${gift.name}递给${name}`, verb: '递', ok: true };
    return { text: `和${name}说话`, verb: '说话', ok: true };
  }
  if (t.kind === 'visitor')
    return { text: `和${t.visitor.visitor.name}说话`, verb: '说话', ok: true };
  if (t.kind === 'pulse') return { text: `看看${t.pulse.title}`, verb: '看看', ok: true };
  if (t.kind === 'water' || t.thing?.act === 'water') {
    const { drink, refill, text } = waterOptions(scene, t);
    return { text, verb: drink ? '喝水' : '打水', ok: drink || refill };
  }
  if (t.kind === 'thing') {
    const { act, station, label } = t.thing;
    const verb = STATION_STAMP[station] || STAMP[act] || '看看';
    return {
      text: label || ACT_HINT[act],
      verb: act === 'housework' && station === 'tea' ? '喝茶' : verb,
      ok: true,
    };
  }
  if (!farmable(scene.map, t.x, t.y)) return heldHint(scene);
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
  const { shell, platform, game } = scene.deps;
  // 路南的摊位：今天摆的是哪个摊子，就当那个摊子的柜台用；空着就说一声
  if (thing.act === 'stall') {
    const id = game.ask('stalls')[thing.spot];
    if (!id) return shell.toast('今天这个摊位空着，集日才摆满。');
    thing = { ...thing, act: 'market', shop: 'stall.' + id, label: undefined };
  }
  scene.player.face(dirTo(scene.player.tile, thing));
  if (thing.act === 'water') return drawWater(scene, thing);
  platform.audio.play('talk');
  if (thing.to) {
    const out = scene.send('travel', thing);
    if (!out.ok) shell.toast(out.reason);
    return;
  }
  // 钓点：开钓鱼的小窗（挑饵、下竿、看漂、遛鱼，见 panels/fishing.js）
  if (thing.station === 'fish')
    return shell.set({ modal: { kind: 'fishing', phase: 'ready', x: thing.x, y: thing.y } });
  if (['outing', 'housework'].includes(thing.act)) {
    // 这儿只有一件活可做（采野菜、采菌子、腌菜……）：不必问，走过去就动手
    const { game } = scene.deps;
    const query = thing.act === 'outing' ? 'outings' : 'homestead';
    const options = game.ask(query, thing.station, scene.at()).options;
    if (!thing.dining && options.length === 1) {
      if (options[0].reason) return scene.refuse(options[0].reason);
      return work(scene, thing.act, options[0].id, thing);
    }
    return shell.set({
      modal: {
        kind: 'activity',
        station: thing.station,
        label: thing.label,
        group: thing.act,
        dining: thing.dining,
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
    store: 'store',
    wardrobe: 'wardrobe',
    cloth: 'cloth',
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
  const line =
    out.facts.find(f => f.type === 'wardrobe.got')?.data.line ??
    out.facts.find(f => ['forage.finished', 'home.worked'].includes(f.type))?.data.line;
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

// 长在水面上的东西（荷叶）：对着它、点它，先算它，不算打水
const ON_WATER = new Set(['lotus']);
export function decorOnWater(scene, x, y) {
  const decor = decorAt(scene, x, y);
  return decor && ON_WATER.has(decor.kind) ? decor : null;
}

/** 那样东西晃一晃（times 是来回几下）。 */
export function wiggle(scene, decor, times = 3) {
  const { sprite } = decor;
  if (decor.shaking) return;
  decor.shaking = true;
  const x = sprite.x;
  scene.tweens.add({
    targets: sprite,
    x: x + 1.5,
    duration: 55,
    yoyo: true,
    repeat: times,
    onComplete: () => {
      sprite.x = x;
      decor.shaking = false;
    },
  });
}

const SHED = { leaf: ['fx:leaf', null], petal: ['fx:petal', null], needle: ['fx:leaf', 0x547a4a] };

/**
 * 碰一碰：那样东西晃一晃，飘下几片叶子或花瓣，有时惊起几只鸟。今天还没翻过就是翻一翻（规则定翻出什么，
 * 见 sim/plugins/search.js），翻过了只冒一句话。
 */
export function poke(scene, decor) {
  const { game, shell, platform } = scene.deps;
  const p = POKES[decor.kind];
  const { sprite } = decor;
  scene.player.face(dirTo(scene.player.tile, decor));
  platform.audio.play('talk');
  wiggle(scene, decor);
  const top = sprite.y - sprite.displayHeight * 0.6;
  if (p.fx === 'straw') scene.effects.straw(sprite.x, sprite.y - 6);
  else if (SHED[p.fx]) scene.ambient.shed(sprite.x, top, 5, ...SHED[p.fx]);
  if (p.birds && Math.random() < 0.6) scene.ambient.scare(sprite.x, top);
  const spot = { x: decor.x, y: decor.y };
  const why = game.ask('search.why', spot, scene.at());
  if (!why) {
    const out = game.dispatch('search', { spot, at: scene.at() });
    if (!out.ok) return scene.refuse(out.reason);
    const f = out.facts.find(x => x.type === 'search.found' || x.type === 'search.empty');
    if (f.type === 'search.found' && !f.data.left) {
      scene.effects.found(sprite.x, top, f.data.fine);
      platform.audio.play(f.data.fine ? 'fine' : 'harvest');
      if (f.data.fine) platform.haptic([14, 60, 24]);
    }
    return shell.toast(f.data.line, f.data.first || f.data.fine);
  }
  if (why !== SEARCH_LINES.done && why !== SEARCH_LINES.nothing) return shell.toast(why);
  if (p.lines.length) shell.toast(p.lines[Math.floor(Math.random() * p.lines.length)]);
}
