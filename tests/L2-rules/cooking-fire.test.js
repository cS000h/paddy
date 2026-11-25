// L2-16 掌火：炒三拍（下料、翻锅、出锅）、炖守火（添柴、起锅）、烤翻面（翻面、出锅）。
// 这一锅的节拍由世界的种子和这户第几回烧火定；按的记录 log 交给规则判火候。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, refused, bestFire } from '../helpers.js';
import { FIRE, FIRE_PERFECT } from '../../src/content/cook-fire.js';

const at = { x: 10, y: 11, dir: 'up' };
const FRY = { items: ['rice', 'egg'], method: 'fry' };
const STEW = { items: ['potato', 'bean'], method: 'stew' };
const ROAST = { items: ['potato'], method: 'roast' };

const planOf = (g, meal) => g.ask('cook.preview', meal).plan;
/** 做这一锅，返回出锅的事实。 */
function cooked(g, meal, log) {
  const out = g.dispatch('cook', { ...meal, log, at });
  assert.equal(out.ok, true, out.reason);
  return out.facts.find(f => f.type === 'meal.cooked').data;
}
/** 同一局开头做这一锅（节拍一样），火候是哪一档。 */
const quality = (meal, log) => cooked(newGame(), meal, log).quality;
/** 把出锅换到第 t 毫秒（出锅以后的按键不算）。 */
const serveAt = (log, t) => [
  ...log.filter(e => e[1] !== 'serve' && e[0] <= t),
  [Math.round(t), 'serve'],
];

test('这一锅的节拍：同一局同一回烧火一样，问了不动存档；做过一锅就换', () => {
  const [a, b, c] = [newGame(3), newGame(3), newGame(4)];
  assert.deepEqual(planOf(a, FRY), planOf(b, FRY));
  assert.notDeepEqual(planOf(a, FRY), planOf(c, FRY));
  const before = a.save();
  a.ask('cook.fire', FRY, [], 1500);
  assert.deepEqual(a.save(), before, '问节拍、问此刻锅里怎样都不动随机数');
  const plan = planOf(a, FRY);
  assert.equal(cooked(a, FRY, bestFire(a, FRY)).quality, 'great');
  assert.notDeepEqual(planOf(a, FRY), plan, '烧过一回火，下一锅换了节拍');
});

test('炒、炖、烤样样按在正当时：拿手，出锅那句换成全中的说法；节拍不跟着饭菜存', () => {
  for (const meal of [FRY, STEW, ROAST]) {
    const g = newGame();
    const d = cooked(g, meal, bestFire(g, meal));
    assert.equal(d.quality, 'great', meal.method);
    assert.equal(d.perfect, true, meal.method);
    assert.ok(d.name.startsWith('拿手'));
    assert.ok(d.line.includes(FIRE_PERFECT[meal.method].line), d.line);
    const dish = g.ask('kitchen', at).dishes[0];
    for (const key of ['plan', 'beats', 'perfect', 'fire']) assert.equal(key in dish, false, key);
  }
});

test('炒：出锅早了夹生、生，晚了焦边、糊；差一点是家常；油不热就下料炒得再好也家常；漏翻一下不算全中', () => {
  const g = newGame();
  const plan = planOf(g, FRY);
  const best = bestFire(g, FRY);
  const add = best[0][0];
  const [from, to] = [add + plan.color, add + plan.color + plan.colorLong];
  const far = FIRE.near + 2 * plan.colorLong;
  assert.equal(quality(FRY, serveAt(best, from - FIRE.near - 100)), 'under');
  assert.equal(quality(FRY, serveAt(best, from - far - 100)), 'raw');
  assert.equal(quality(FRY, serveAt(best, to + FIRE.near + 100)), 'over');
  assert.equal(quality(FRY, serveAt(best, to + far + 100)), 'burnt');
  assert.equal(quality(FRY, serveAt(best, from - 100)), 'plain');
  // 早下料（油还没冒烟），后面跟着一样按准
  const cold = best.map(([t, k]) => [t - Math.round(plan.smokeLong / 2) - FIRE.near - 100, k]);
  assert.equal(quality(FRY, cold), 'plain');
  // 漏了头一回翻锅：拿手，但不是全中
  const once = best.filter((e, k) => k !== 1);
  const d = cooked(newGame(), FRY, once);
  assert.deepEqual([d.quality, d.perfect], ['great', false]);
  assert.equal(d.beats.toss, `${plan.flares.length - 1}/${plan.flares.length}`);
  // 一下也没翻：恰好
  assert.equal(
    quality(
      FRY,
      best.filter(e => e[1] !== 'toss'),
    ),
    'good',
  );
  // 没下料就出锅：生的
  assert.equal(quality(FRY, [[3000, 'serve']]), 'raw');
});

test('炖：起早了汤是生的；不添柴火灭了熬不动；柴添太猛扑锅熬过头', () => {
  const g = newGame();
  assert.equal(quality(STEW, [[3000, 'serve']]), 'raw');
  const end = g.ask('cook.fire', STEW, [], FIRE.stew.limit);
  assert.equal(end.zone, 'out', '一回柴不添，火就灭了');
  assert.ok(end.soup < FIRE.stew.done);
  assert.ok(['raw', 'under'].includes(quality(STEW, [[FIRE.stew.limit, 'serve']])));
  const stoked = Array.from({ length: 16 }, (_, k) => [k * 500, 'stoke']);
  const d = cooked(newGame(), STEW, [...stoked, [12000, 'serve']]);
  assert.ok(d.beats.boils >= 2, `扑了${d.beats.boils}回锅`);
  assert.ok(['over', 'burnt'].includes(d.quality), d.quality);
  // 画面看得见：火旺、扑锅
  const hot = g.ask('cook.fire', STEW, stoked, 6000);
  assert.equal(hot.zone, 'hot');
  assert.ok(hot.boils >= 1);
});

test('烤：翻早了夹生，翻晚了焦边；不翻就出锅是生的', () => {
  const g = newGame();
  const plan = planOf(g, ROAST);
  const best = bestFire(g, ROAST);
  const rest = best.slice(1).map(([t, k]) => [t - best[0][0], k]);
  const flipAt = t => [[t, 'flip'], ...rest.map(([d, k]) => [t + d, k])];
  assert.equal(quality(ROAST, flipAt(plan.brown[0] - FIRE.near - 100)), 'under');
  const late = plan.brown[0] + plan.brownLong + FIRE.near + 100;
  assert.equal(quality(ROAST, flipAt(late)), 'over');
  assert.equal(quality(ROAST, [[plan.brown[0] + 300, 'serve']]), 'raw');
});

test('稳稳做不掌火是家常；按的记录不对不收，世界不动', () => {
  const g = newGame();
  const d = cooked(g, FRY, null);
  assert.deepEqual([d.quality, d.perfect], ['plain', false]);
  for (const log of [
    [[500, 'flip']], // 炒不收翻面
    [
      [900, 'add'],
      [300, 'serve'],
    ], // 时刻往回走
    [[2.5, 'serve']],
    [[-1, 'serve']],
    [[70000, 'serve']],
    'x',
    Array.from({ length: 61 }, () => [1, 'toss']), // 按得太多
  ])
    assert.match(refused(g, 'cook', { ...FRY, log, at }), /火候没看清/);
});

test('本事、切法让正当时宽一截：差一点出锅的那一下，切丝对路就正好', () => {
  const base = { items: ['potato'], method: 'fry' };
  const shred = { ...base, cut: 'shred' };
  const g = newGame();
  const [p, s] = [planOf(g, base), planOf(g, shred)];
  assert.equal(s.color, p.color);
  assert.equal(s.colorLong, p.colorLong + 3 * FIRE.widen);
  const log = bestFire(g, base);
  const late = serveAt(log, log[0][0] + p.color + p.colorLong + 10);
  assert.equal(quality(base, late), 'plain');
  assert.equal(quality(shred, late), 'great');
});

test('cook.fire：画面每一帧问到的样子，炒到了哪一拍、炖的火和汤、烤到第几面', () => {
  const g = newGame();
  const fry = planOf(g, FRY);
  const ask = (meal, log, t) => g.ask('cook.fire', meal, log, t);
  assert.deepEqual(
    [ask(FRY, [], fry.smoke - 100).cue, ask(FRY, [], fry.smoke + 10).now],
    [true, true],
  );
  assert.equal(ask(FRY, [], fry.smoke + fry.smokeLong + 10).late, true);
  const add = [[fry.smoke + 100, 'add']];
  const flare = ask(FRY, add, fry.smoke + 100 + fry.flares[0] + 10);
  assert.deepEqual([flare.beat, flare.flare, flare.now], ['toss', true, true]);
  const stew = ask(STEW, [], 0);
  assert.deepEqual([stew.zone, stew.white, stew.dry], ['band', false, false]);
  const roast = planOf(g, ROAST);
  const r = ask(ROAST, [], roast.brown[0] + 10);
  assert.deepEqual([r.side, r.now, r.last], [0, true, false]);
  assert.equal(ask(ROAST, [[roast.brown[0] + 100, 'flip']], roast.brown[0] + 200).side, 1);
  assert.equal(ask(FRY, [], NaN), null);
  assert.equal(ask({ items: ['rice'], method: 'mix' }, [], 100), null);
});
