// L2-13 钓鱼重做：看漂、遛鱼、六种鱼和长短、钓点会惊、蚯蚓做饵。规则一律通过端口问和做。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/port/game.js';
import { kindOf } from '../../src/content/items.js';
import { lenText } from '../../src/sim/fishing-fight.js';
import { FISH } from '../../src/content/fishing.js';
import { newGame, must, refused, fishOnce, FISH_SPOT, HOME } from '../helpers.js';

const at = FISH_SPOT;
const fact = (out, type) => out.facts.find(f => f.type === type);

/** 下竿，直到这一竿有鱼来咬（没鱼咬的那几竿到头不提就收）。返回咬钩那一下。 */
function castWithBite(g, where = at) {
  for (let i = 0; i < 30; i++) {
    must(g, 'fish.cast', { at: where });
    const bite = g.ask('fishing', where).bout.float.events.find(e => e.kind === 'bite');
    if (bite) return bite;
    must(g, 'fish.hook', { at: where, t: -1 });
  }
  throw new Error('下了三十竿都没鱼咬');
}

/** 钩上一条：返回它的遛鱼查询（按住不放一直到底，看会不会断线）。 */
function hookOne(g) {
  const bite = castWithBite(g);
  assert.ok(must(g, 'fish.hook', { at, t: bite.at }).includes('fish.hooked'));
}

test('下竿：不限竿数，一竿 2 体力；这一竿怎么动存在档里，读档再提竿结果一模一样', () => {
  const g = newGame(3);
  assert.equal(g.ask('action.cost', 'fish').value, 2);
  const energy = g.ask('hero').energy;
  must(g, 'fish.cast', { at });
  assert.equal(g.ask('hero').energy, energy - 2);
  const view = g.ask('fishing', at);
  assert.equal(view.spot.id, 'yard');
  assert.equal(view.bout.phase, 'float');
  assert.ok(view.bout.float.events.every(e => ['nod', 'bite'].includes(e.kind)));
  assert.equal(refused(g, 'fish.cast', { at }), '浮漂还在水里');
  const t = view.bout.float.events.find(e => e.kind === 'bite')?.at ?? -1;
  const replay = createGame({ saved: JSON.parse(JSON.stringify(g.save())), debug: true });
  const a = g.dispatch('fish.hook', { at, t });
  const b = replay.dispatch('fish.hook', { at, t });
  assert.deepEqual(a, b);
  assert.deepEqual(g.save(), replay.save());
  // 以前一天三竿，现在只看体力和天色
  if (g.ask('fishing', at).bout) must(g, 'fish.quit', { at });
  for (let i = 0; i < 6; i++) assert.equal(fishOnce(g).ok, true);
  assert.equal(refused(g, 'fish.cast', { at: HOME }), '走到钓点旁边再下竿');
});

test('看漂：小啄时提竿鱼吓跑，提晚了饵没了，沉下去那一下提竿就钩上', () => {
  const g = newGame(4);
  let bite = castWithBite(g);
  assert.ok(must(g, 'fish.hook', { at, t: Math.max(0, bite.at - 1) }).includes('fish.spooked'));
  assert.equal(g.ask('fishing', at).bout, null);
  bite = castWithBite(g);
  const late = g.dispatch('fish.hook', { at, t: bite.at + bite.dur + 1 });
  assert.match(fact(late, 'fish.missed').data.line, /饵/);
  bite = castWithBite(g);
  const hooked = g.dispatch('fish.hook', { at, t: bite.at + bite.dur });
  assert.ok(['small', 'mid', 'big'].includes(fact(hooked, 'fish.hooked').data.size));
  assert.deepEqual(g.ask('fishing', at).bout.phase, 'fight');
  assert.equal(refused(g, 'fish.hook', { at, t: 0 }), '浮漂不在水里');
});

test('遛鱼：一直松着两秒鱼脱钩；鱼冲的时候还按着线会断；冲就松、不冲就按拉得上来', () => {
  const g = newGame(6);
  hookOne(g);
  const slack = g.ask('fish.fight', [], 30000);
  assert.deepEqual([slack.done, slack.t], ['slack', 2000]);
  assert.equal(g.ask('fish.fight', [[0, 2]], 100), null, '记录不干净就不答');
  // 找一条会往外冲的：按住不放到底，线断了
  let snapped = null;
  for (let i = 0; i < 20 && !snapped; i++) {
    const end = g.ask('fish.fight', [[0, 1]], 30000);
    if (end.done === 'snap') snapped = g.dispatch('fish.land', { at, log: [[0, 1]] });
    else {
      must(g, 'fish.quit', { at });
      hookOne(g);
    }
  }
  assert.ok(snapped, '二十条里总有一条会冲');
  assert.equal(fact(snapped, 'fish.lost').data.why, 'snap');
  assert.equal(g.ask('fishing', at).bout, null);
  // 手上功夫满分：钩上的都拉得上来
  let landed = 0;
  for (let i = 0; i < 8; i++) {
    const out = fishOnce(g);
    if (out.facts.some(f => f.type === 'fish.hooked' || f.type === 'fish.caught'))
      assert.ok(fact(out, 'fish.caught'), '冲就松、不冲就按，钩上了就拉得上来');
    if (fact(out, 'fish.caught')) landed++;
  }
  assert.ok(landed > 0);
});

test('钓上来：鱼进行囊，事实里有名字和长短；头一回说来历，比以前都长才冒新纪录', () => {
  const g = newGame(8);
  const best = {};
  let caught = 0;
  for (let i = 0; i < 40 && caught < 8; i++) {
    if (g.ask('hero').energy < 10) must(g, 'sleep');
    const out = fishOnce(g);
    const c = fact(out, 'fish.caught');
    if (!c) continue;
    caught++;
    const d = c.data;
    assert.ok(Object.hasOwn(FISH, d.fish));
    assert.equal(kindOf(d.item), 'fish');
    assert.equal(d.lenText, lenText(d.len));
    assert.ok(d.len >= FISH[d.fish].len[0] && d.len <= FISH[d.fish].len[1]);
    assert.equal(d.first, best[d.fish] === undefined);
    assert.equal(d.record, best[d.fish] !== undefined && d.len > best[d.fish]);
    if (d.first) assert.match(d.line, new RegExp(FISH[d.fish].name));
    if (d.record) assert.match(d.line, /都长/);
    best[d.fish] = Math.max(best[d.fish] ?? 0, d.len);
    const rec = g.ask('fishing', at).records[d.fish];
    assert.deepEqual([rec.best, rec.bestText], [best[d.fish], lenText(best[d.fish])]);
    assert.ok(g.ask('pack').items.some(it => it.id === d.item) || d.n === 0);
    // 收进橱柜，免得行囊满了
    must(g, 'pack.take', { item: d.item, n: 'all', at: HOME });
  }
  assert.ok(caught >= 3, '四十竿里钓上的不该少于三条');
});

test('长短的说法：七寸、一尺、一尺二、两尺五', () => {
  assert.deepEqual([7, 10, 12, 25].map(lenText), ['七寸', '一尺', '一尺二', '两尺五']);
});

test('钓点会惊：同一处接连钓上三条就惊了，第二天缓过来；问老周也是这么说', () => {
  const g = newGame(9);
  assert.notEqual(g.ask('fishing', at).spot.mood, 'spooked');
  for (let i = 0; i < 30 && g.ask('fishing', at).spot.mood !== 'spooked'; i++) {
    if (g.ask('hero').energy < 10) break;
    const out = fishOnce(g);
    for (const it of g.ask('pack').items.filter(x => x.id.startsWith('fish.')))
      must(g, 'pack.take', { item: it.id, n: 'all', at: HOME });
    assert.equal(out.ok, true);
  }
  assert.equal(g.ask('fishing', at).spot.mood, 'spooked');
  assert.match(g.ask('fish.mood', 'yard'), /惊/);
  must(g, 'sleep');
  assert.notEqual(g.ask('fishing', at).spot.mood, 'spooked');
});

test('蚯蚓：挂饵要身上有，挂上就用掉；锄地有时翻出来，同一局同一格结果一样', () => {
  const g0 = newGame(1);
  assert.equal(refused(g0, 'fish.cast', { at, bait: 'worm' }), '身上没有蚯蚓');
  assert.equal(refused(g0, 'fish.cast', { at, bait: 'rice' }), '没有这种饵');
  const field = { x: 6, y: 19, at: { x: 6, y: 18, dir: 'down' } };
  let g = null;
  for (let seed = 1; seed < 80 && !g; seed++) {
    const t = newGame(seed);
    if (must(t, 'farm.till', field).includes('worm.found')) g = t;
  }
  assert.ok(g, '八十局里总有一局头一锄就翻出蚯蚓');
  assert.equal(g.ask('fishing', at).bait[0]?.n, 1);
  must(g, 'fish.cast', { at, bait: 'worm' });
  assert.deepEqual(g.ask('fishing', at).bait, []);
});

test('下锅、送人：各种鱼都算「鱼」，菜名照旧', () => {
  const g = newGame(2);
  for (const id of ['fish.crucian', 'fish.mandarin', 'fish.carp.fine'])
    assert.equal(g.ask('cook.preview', { items: [id], method: 'stew' }).base, '鱼汤');
});

test('鱼篓：钓上来的各种鱼合起来只占行囊一格', () => {
  const g = newGame(8);
  const before = g.ask('pack').used;
  const kinds = new Set();
  for (let i = 0; i < 40 && kinds.size < 2; i++) {
    if (g.ask('hero').energy < 10) must(g, 'sleep');
    const c = fishOnce(g).facts.find(f => f.type === 'fish.caught');
    if (c) kinds.add(c.data.item);
  }
  assert.ok(kinds.size >= 2, '四十竿里该钓上两种鱼');
  assert.equal(g.ask('pack').used, before + 1);
});
