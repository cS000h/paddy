// L2-19 翻找、钓鱼碰上的小事：翻找只在有动静的地方、照图和季节时段碰上，一天最多一件；
// 失物捡了一辈子只一回，还给失主有那句话和回礼；昧下的只叫当时在场看见的人记着；
// 帮人一把多一份交情；蚂蚁搬家看出了明天的天。钓完一竿偶尔碰上一件，对得上钓点；
// 指点过的鱼口好些（今天的身边风物）；要用掉东西的做法，身上没有就做不了。
// 出一锅偶尔碰上灶边的事，对得上做法和锅里有没有鱼。规则一律通过端口问和做。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/port/game.js';
import { MAPS, walkable } from '../../src/content/maps/index.js';
import { EVENTS, SEARCH_EVENTS, FISHING_EVENTS, STOVE_EVENTS } from '../../src/content/events.js';
import { MODIFIERS } from '../../src/content/modifiers.js';
import { FOUND_OWNERS, FISH_SPOTS } from '../../src/content/fishing.js';
import { ITEMS } from '../../src/content/items.js';
import { newGame, must, carried, fishOnce } from '../helpers.js';

const SIDES = [
  [0, 1, 'up'],
  [0, -1, 'down'],
  [1, 0, 'left'],
  [-1, 0, 'right'],
];
const besideOf = (map, spot) => {
  for (const [dx, dy, dir] of SIDES)
    if (walkable(MAPS[map], spot.x + dx, spot.y + dy))
      return { x: spot.x + dx, y: spot.y + dy, dir };
  throw new Error('站不了人');
};

/** 眼下手上这件小事，改成 id 那件，落在主角脚下。 */
function facing(g, id, edit = w => w) {
  const save = JSON.parse(JSON.stringify(g.save()));
  const w = save.state.world;
  const me = w.people.hero;
  w.pulse.active = { id, day: w.clock.day, map: me.map, x: me.x, y: me.y };
  edit(w);
  return createGame({ saved: save, debug: true });
}
const here = g => {
  const h = g.ask('hero');
  return { x: h.x, y: h.y, dir: h.dir };
};
/** 做一件，要成功，返回整份结果（带 facts）。 */
const act = (g, type, input) => {
  const out = g.dispatch(type, input);
  assert.equal(out.ok, true, `${type}：${out.reason}`);
  return out;
};
const choose = (g, choice) => act(g, 'event.choose', { choice, at: here(g) });
const whyOf = (g, from) => g.ask('opinion', from).parts.map(p => p.id);

test('二十件都登记了：做法齐全，失物八件各有失主、回礼是登记过的东西', () => {
  assert.equal(Object.keys(SEARCH_EVENTS).length, 20);
  const lost = Object.values(SEARCH_EVENTS).filter(e => e.once);
  assert.equal(lost.length, 8);
  for (const ev of Object.values(SEARCH_EVENTS)) {
    assert.equal(EVENTS[ev.id], ev);
    assert.ok(ev.choices.length >= 2, ev.id);
    for (const k of ev.when.maps || []) assert.ok(MAPS[k], `${ev.id} 的图 ${k}`);
  }
  for (const item of [
    'pipe',
    'kite',
    'thimble',
    'purse',
    'stripKnife',
    'sachet',
    'bell',
    'tally',
  ]) {
    assert.ok(ITEMS[item] && ITEMS[item].sell === 0, `${item} 卖不了`);
    const o = FOUND_OWNERS[item];
    assert.ok(o.owner && o.line, item);
    if (o.thanks) assert.ok(ITEMS[o.thanks.item], item);
  }
});

test('翻有动静的地方偶尔碰上一件，碰上的对得上图和翻的那一类；一天最多一件', () => {
  let hits = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const g = newGame(seed);
    const cues = Object.keys(MAPS).flatMap(map =>
      g
        .ask('search.spots', map)
        .filter(s => s.cue)
        .map(s => ({ ...s, map })),
    );
    let met = 0;
    for (const c of cues) {
      if (g.ask('hero').map !== c.map) must(g, 'travel.to', { to: c.map });
      const before = g.ask('events').active?.id;
      const out = g.dispatch('search', { at: besideOf(c.map, c), spot: { x: c.x, y: c.y } });
      if (!out.ok) continue;
      const now = g.ask('events').active;
      if (!now || now.id === before) continue;
      const ev = EVENTS[now.id];
      assert.equal(ev.trigger, 'search');
      assert.ok(!ev.when.maps || ev.when.maps.includes(c.map), `${now.id} 不该在 ${c.map}`);
      assert.ok(!ev.when.kinds || ev.when.kinds.includes(c.kind), `${now.id} 不该在 ${c.kind}`);
      met++;
      choose(g, ev.choices.length - 1);
    }
    assert.ok(met <= 1, `种子 ${seed} 一天碰上了 ${met} 件`);
    hits += met;
  }
  assert.ok(hits > 0, '四十个种子一件都没碰上');
});

test('拾到老周的烟袋：收起来，还给老周听那句话、得两条鲫鱼；这件记成碰过了', () => {
  const g = facing(newGame(), 'search_pipe');
  choose(g, 0);
  assert.equal(carried(g, 'pipe'), 1);
  assert.ok(g.save().state.world.pulse.done.search_pipe);
  const zhou = g.ask('residents').find(p => p.id === 'zhou');
  if (g.ask('hero').map !== zhou.map) must(g, 'travel.to', { to: zhou.map });
  const fish = carried(g, 'fish.crucian');
  const out = act(g, 'gift', { to: 'zhou', item: 'pipe', at: here(g) });
  assert.equal(out.facts.find(f => f.type === 'gift.given').data.line, FOUND_OWNERS.pipe.line);
  assert.equal(carried(g, 'pipe'), 0);
  assert.equal(carried(g, 'fish.crucian'), fish + 2);
});

test('昧下人家的东西：只有当时在这张图上看得见你的乡邻记着，别人不知道', () => {
  const start = newGame();
  const seen = start.ask('residents').find(p => p.visible);
  if (start.ask('hero').map !== seen.map) must(start, 'travel.to', { to: seen.map });
  const g = facing(start, 'search_thimble');
  const coins = g.ask('home').coins;
  const out = choose(g, 1);
  assert.equal(g.ask('home').coins, coins + 4);
  const fact = out.facts.find(f => f.type === 'pulse.resolved').data;
  const there = g
    .ask('residents')
    .filter(p => p.visible && !p.atDoor && p.map === seen.map)
    .map(p => p.id);
  assert.deepEqual([...fact.seen].sort(), [...there].sort());
  assert.ok(fact.line.endsWith('都看在眼里。'));
  for (const p of g.ask('residents'))
    assert.equal(whyOf(g, p.id).includes('why.sly'), there.includes(p.id), p.id);
});

test('帮人一把：替掌柜掖干草，小乔多一份熟悉、记一条「帮过一把」', () => {
  const g = facing(newGame(), 'search_cat');
  const known = g.save().state.world.bonds.known.qiao;
  choose(g, 1);
  assert.ok(g.save().state.world.bonds.known.qiao > known);
  assert.ok(whyOf(g, 'qiao').includes('why.helped'));
});

test('蚂蚁搬家：看出来了，看云色的说法换成明天真的天，把握九成五', () => {
  let ok = 0;
  for (let seed = 1; seed <= 12 && !ok; seed++) {
    const g = facing(newGame(seed), 'search_ants', w => {
      w.weather.tomorrow = 'rain';
      w.weather.forecast = 'sunny';
    });
    const fact = choose(g, 0).facts.find(f => f.type === 'pulse.resolved').data;
    if (!fact.success) continue;
    ok++;
    const w = g.save().state.world.weather;
    assert.deepEqual([w.forecast, w.acc], ['rain', 95]);
  }
  assert.ok(ok, '十二回都没看出来');
});

test('钓鱼的九件都登记了：钓点、身边风物、要用的东西都对得上', () => {
  assert.equal(Object.keys(FISHING_EVENTS).length, 9);
  for (const ev of Object.values(FISHING_EVENTS)) {
    assert.equal(EVENTS[ev.id], ev);
    for (const k of ev.when.maps || []) assert.ok(FISH_SPOTS[k], `${ev.id} 的钓点 ${k}`);
    for (const c of ev.choices)
      for (const out of [c, c.onOk, c.onFail].filter(Boolean)) {
        if (out.mod) assert.ok(MODIFIERS[out.mod], `${ev.id} 的 ${out.mod}`);
        if (out.use) assert.ok(ITEMS[out.use.item], `${ev.id} 的 ${out.use.item}`);
      }
  }
});

test('钓完一竿偶尔碰上一件，对得上钓点；一天最多一件', () => {
  let hits = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const g = newGame(seed);
    let met = 0;
    for (let k = 0; k < 6 && g.ask('hero').energy > 10; k++) {
      if (g.ask('fishing', { x: 37, y: 20, dir: 'down' }).reason) break;
      const before = g.ask('events').active?.id;
      fishOnce(g);
      const now = g.ask('events').active;
      if (!now || now.id === before) continue;
      const ev = EVENTS[now.id];
      // 下竿时原有的就地小事（trigger forage）也会碰上，处理掉接着钓
      if (ev.trigger !== 'fishing') {
        choose(g, 0);
        continue;
      }
      assert.ok(!ev.when.maps || ev.when.maps.includes('yard'), `${now.id} 不该在溪湾`);
      met++;
      choose(g, 0);
    }
    assert.ok(met <= 1, `种子 ${seed} 一天碰上了 ${met} 件`);
    hits += met;
  }
  assert.ok(hits > 0, '三十个种子一件都没碰上');
});

test('老周指点：今天鱼口正好，多一份交情', () => {
  const g = facing(newGame(), 'fish_zhou_boat');
  const known = g.save().state.world.bonds.known.zhou;
  choose(g, 0);
  assert.ok(g.ask('modifiers').list.some(m => m.id === 'fish_luck'));
  assert.ok(g.save().state.world.bonds.known.zhou > known);
});

test('换条新蚯蚓：身上没有蚯蚓做不了，有就用掉一条', () => {
  const none = facing(newGame(), 'fish_sink', w => {
    delete w.packs.hero.items.worm;
  });
  const c = none.ask('events').active.choices[1];
  assert.deepEqual([c.disabled, c.reason], [true, '身上没有蚯蚓']);
  assert.equal(none.dispatch('event.choose', { choice: 1, at: here(none) }).reason, '身上没有蚯蚓');
  const g = facing(newGame(), 'fish_sink', w => {
    w.packs.hero.items.worm = 2;
  });
  choose(g, 1);
  assert.equal(carried(g, 'worm'), 1);
  assert.ok(g.ask('modifiers').list.some(m => m.id === 'fish_luck'));
});

test('灶边五件：出一锅偶尔碰上，对得上做法和锅里有没有鱼；一天最多一件', () => {
  assert.equal(Object.keys(STOVE_EVENTS).length, 5);
  const stove = { x: 10, y: 11, dir: 'up' };
  let hits = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const save = JSON.parse(JSON.stringify(newGame(seed).save()));
    const w = save.state.world;
    Object.assign(w.packs.hero.items, { 'fish.crucian': 6, wood: 6 });
    w.weather.now = 'sunny';
    const g = createGame({ saved: save, debug: true });
    let met = 0;
    for (let k = 0; k < 6; k++) {
      const before = g.ask('events').active?.id;
      const out = g.dispatch('cook', { items: ['fish.crucian'], method: 'stew', at: stove });
      if (!out.ok) break;
      const now = g.ask('events').active;
      if (!now || now.id === before) continue;
      const ev = EVENTS[now.id];
      if (ev.trigger !== 'stove') {
        choose(g, 0);
        continue;
      }
      assert.ok(!ev.when.methods || ev.when.methods.includes('stew'), now.id);
      assert.ok(!ev.when.weather || ev.when.weather.includes('sunny'), now.id);
      met++;
      choose(
        g,
        ev.choices.findIndex(c => !c.use),
      );
    }
    assert.ok(met <= 1, `种子 ${seed} 一天碰上了 ${met} 件`);
    hits += met;
  }
  assert.ok(hits > 0, '三十个种子一件都没碰上');
});

test('桂嫂隔墙闻香：盛一碗给她，多一份交情、回一罐腌菜', () => {
  const g = facing(newGame(), 'stove_gui');
  const pickle = carried(g, 'pickle');
  choose(g, 0);
  assert.equal(carried(g, 'pickle'), pickle + 1);
  assert.ok(whyOf(g, 'gui').includes('why.helped'));
});
