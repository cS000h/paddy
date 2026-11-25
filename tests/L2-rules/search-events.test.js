// L2-19 翻找碰上的小事：只在有动静的地方、照图和季节时段碰上，一天最多一件；
// 失物捡了一辈子只一回，还给失主有那句话和回礼；昧下的只叫当时在场看见的人记着；
// 帮人一把多一份交情；蚂蚁搬家看出了明天的天。规则一律通过端口问和做。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/port/game.js';
import { MAPS, walkable } from '../../src/content/maps/index.js';
import { EVENTS, SEARCH_EVENTS } from '../../src/content/events.js';
import { FOUND_OWNERS } from '../../src/content/fishing.js';
import { ITEMS } from '../../src/content/items.js';
import { newGame, must, carried } from '../helpers.js';

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
