// L2-25 做事攒性情、局面池、年景与节令、村民的盼头（第 4 块）：落脚单只定随家里来的那一个性情，
// 另外两个从头半个月做的事里攒出来，冒出来那一句问你认不认，满半个月落定；头三天找上门的事、
// 年景小局面、大日子上人碰人、盼头攒到一半，都是接话里的几个选项，选了当场兑现；
// 一季一个天时年景压到各户的年景上；节令前后有便条、村民先提一句、聚到一处、第二天传开。
// 一律通过端口发命令、问查询；要搭的场面从存档里摆好再读进来。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/port/game.js';
import { newGame, must, refused, wait, stored } from '../helpers.js';
import { SCENES } from '../../src/content/scenes.js';
import { LEANING, FAMILY_CLASH, LEAN } from '../../src/content/leaning.js';
import { FEASTS, YEARS } from '../../src/content/almanac.js';
import { HOPES } from '../../src/content/hopes.js';
import { TEMPERS, ATTRS } from '../../src/content/traits.js';
import { WHY } from '../../src/content/opinion.js';
import { ITEMS } from '../../src/content/items.js';
import { ON_MAP } from '../../src/content/people.js';
import { feastOn } from '../../src/sim/plugins/almanac.js';

const SHEET = { reason: 'keeper', keepsake: 'sickle', family: 'poor', friend: 'gui' };
/** 落脚：家里穷怕了（抠门），自己的性子空着。 */
const fresh = (seed = 1) => {
  const g = newGame(seed);
  must(g, 'origin.settle', SHEET);
  return g;
};
function staged(g, change) {
  const save = structuredClone(g.save());
  change(save.state.world);
  return createGame({ saved: save, debug: true });
}
const sleepTo = (g, day) => {
  while (g.ask('clock').day < day) must(g, 'sleep');
  return g;
};
const act = (g, type, input = {}) => {
  const out = g.dispatch(type, input);
  assert.equal(out.ok, true, `${type}：${out.reason}`);
  return out;
};
const fact = (out, type) => out.facts.find(f => f.type === type)?.data;
const tempers = g => g.ask('persona').tempers.map(t => t.id);
const where = (g, id) => g.ask('residents').find(p => p.id === id);
/** 走到那人那张图上、算是认识了，问他今天开口那一句（不动原来那一局）。 */
function greet(g, id) {
  const p = where(g, id);
  const h = staged(g, w => {
    Object.assign(w.people.hero, { map: p.map, x: p.x, y: p.y + 1, dir: 'up' });
    w.bonds.known[id] ||= 3;
  });
  return h.ask('resident.greeting', id);
}
const why = (g, id) =>
  g
    .ask('opinion', id)
    .parts.filter(p => p.id.startsWith('why.'))
    .map(p => p.id.slice(4));

test('数据对得上：局面的选项、性情、来由、东西都指得上，话不超长', () => {
  for (const [id, s] of Object.entries(SCENES)) {
    for (const o of s.opts) {
      assert.ok(o.label.length <= 10, `${id} 的按钮字：${o.label}`);
      for (const x of [o, o.check?.ok, o.check?.bad].filter(Boolean)) {
        if (x.temper) assert.ok(TEMPERS[x.temper], `${id}.${o.key} 的性情`);
        for (const [, reason] of x.like || [])
          assert.ok(WHY[reason], `${id}.${o.key} 的来由 ${reason}`);
        for (const item of [...Object.keys(x.cost || {}), x.gain?.[0]].filter(Boolean))
          assert.ok(ITEMS[item], `${id}.${o.key} 的 ${item}`);
      }
      if (o.check) assert.ok(ATTRS[o.check.attr], `${id}.${o.key} 的检定`);
    }
    if (typeof s.a === 'string') assert.ok(ON_MAP.includes(s.a), id);
    if (s.feast) assert.ok(FEASTS[s.feast]?.big, `${id} 挂在大日子上`);
  }
  assert.deepEqual(Object.keys(LEANING).sort(), Object.keys(TEMPERS).sort());
  for (const [home, c] of Object.entries(FAMILY_CLASH))
    assert.equal(TEMPERS[home].pair, TEMPERS[c.against].pair, `${home} 和 ${c.against} 是一对`);
  assert.equal(Object.keys(FEASTS).length, 13);
  for (const f of Object.values(FEASTS)) for (const r of f.rumor) assert.ok(r.length <= 32, r);
  for (const id of Object.keys(HOPES)) assert.ok(SCENES['hope.' + id], `${id} 的盼头有局面`);
  // 一季十四日：春社第六天，第一年没有拜年，第二年正月初一拜年
  assert.equal(feastOn(6), 'sheshu');
  assert.equal(feastOn(1), null);
  assert.equal(feastOn(57), 'newyear');
  assert.equal(feastOn(56), 'chuxi');
});

test('落脚单不再挑自己的性子：开局只带随家里来的那一个；测试开局给了才有', () => {
  const g = fresh();
  assert.deepEqual(tempers(g), ['stingy']);
  assert.equal(g.ask('leaning').settled, false);
  const t = newGame(2);
  must(t, 'origin.settle', { ...SHEET, own: 'shy' });
  assert.deepEqual(tempers(t), ['stingy', 'shy']);
  assert.match(refused(newGame(3), 'origin.settle', { ...SHEET, own: 'generous' }), /合不到/);
});

test('做事攒性情：局面里选了、做的事贴了标签就攒；攒出苗头村民提一句，攒够了问你认不认', () => {
  let g = fresh();
  // 头一天桂嫂来借盐，跟着细聊：热络攒三分，聊天的标签当晚再算一分
  act(g, 'scene.choose', { id: 'door.salt', pick: 'chat', at: null });
  must(g, 'sleep');
  assert.ok(g.ask('leaning').top.some(t => t.id === 'gregarious' && t.n >= LEAN.bud));
  const bud = LEANING.gregarious.bud.find(([by]) => by === 'zhou')[1];
  assert.equal(greet(g, 'zhou'), bud);
  // 再攒够：清早冒出来那一句；认下
  g = staged(g, w => (w.leaning.tally.gregarious = LEAN.offer));
  const out = act(g, 'sleep');
  const offered = fact(out, 'leaning.offered');
  assert.equal(offered.temper, 'gregarious');
  assert.ok(LEANING.gregarious.rise.includes(offered.line));
  assert.equal(offered.clash, null);
  const took = fact(act(g, 'leaning.answer', { take: true }), 'leaning.answered');
  assert.equal(took.line, LEANING.gregarious.yes);
  assert.deepEqual(tempers(g), ['stingy', 'gregarious']);
  assert.match(refused(g, 'leaning.answer', { take: true }), /没人这么说你/);
  // 再看看：要再多攒 again 分才又问
  g = staged(g, w => (w.leaning.tally.calm = LEAN.offer));
  assert.equal(fact(act(g, 'sleep'), 'leaning.offered').temper, 'calm');
  assert.equal(fact(act(g, 'leaning.answer', { take: false }), 'leaning.answered').took, false);
  assert.equal(fact(act(g, 'sleep'), 'leaning.offered'), undefined);
  g = staged(g, w => (w.leaning.tally.calm = LEAN.offer + LEAN.again));
  assert.equal(fact(act(g, 'sleep'), 'leaning.offered').temper, 'calm');
  must(g, 'leaning.answer', { take: true });
  assert.deepEqual(tempers(g), ['stingy', 'gregarious', 'calm']);
  assert.equal(g.ask('leaning').settled, true, '认满三个就不再问');
});

test('和家里带来的性情别着劲：违着它心里冒一句；认下对着的那一样顶掉家里那个，有人看出来', () => {
  let g = fresh();
  // 送东西违着抠门：心烦涨，心里冒一句家里的老规矩（一天一回）
  const out = act(g, 'gift', { to: 'gui', item: 'cake', at: null });
  assert.ok(FAMILY_CLASH.stingy.pull.includes(fact(out, 'leaning.pulled')?.line));
  g = staged(g, w => (w.leaning.tally.generous = LEAN.offer));
  const offered = fact(act(g, 'sleep'), 'leaning.offered');
  assert.equal(offered.temper, 'generous');
  assert.equal(offered.clash, FAMILY_CLASH.stingy.take);
  assert.equal(
    fact(act(g, 'leaning.answer', { take: true }), 'leaning.answered').line,
    offered.clash,
  );
  assert.deepEqual(tempers(g), ['generous']);
  const [by, line] = FAMILY_CLASH.stingy.seen;
  assert.equal(greet(g, by), line);
});

test('满半个月还空着的，按攒得最多的落定；对着家里那一样不自动顶掉', () => {
  const g = staged(sleepTo(fresh(), LEAN.days), w => {
    w.leaning.tally = { generous: 7, calm: 5, brave: 2 };
  });
  const settled = fact(act(g, 'sleep'), 'leaning.settled');
  assert.deepEqual(settled.tempers, ['沉稳', '勇敢']);
  assert.deepEqual(settled.lines, [LEANING.calm.settle, LEANING.brave.settle]);
  assert.deepEqual(tempers(g), ['stingy', 'calm', 'brave']);
  assert.equal(g.ask('leaning').settled, true);
});

test('头三天找上门：借盐、多找三文钱、渡口搭把手，选了当场兑现，第二天有人提', () => {
  const g = fresh();
  const salt = stored(g, 'salt');
  assert.equal(where(g, 'gui').doing, SCENES['door.salt'].doing);
  const rows = g.ask('scene.options', 'gui', null);
  assert.deepEqual(
    rows.map(r => r.input.pick),
    SCENES['door.salt'].opts.map(o => o.key),
  );
  const chose = fact(
    act(g, 'scene.choose', { id: 'door.salt', pick: 'hush', at: null }),
    'scene.chosen',
  );
  assert.match(chose.line, /^桂嫂：/);
  assert.equal(stored(g, 'salt'), salt - 1);
  assert.ok(why(g, 'gui').includes('helped') && why(g, 'shi').includes('fair'));
  assert.match(refused(g, 'scene.choose', { id: 'door.salt', pick: 'chat' }), /过去了/);
  // 杂货铺头一回买东西：小乔多找三文；退还
  must(g, 'travel.to', { to: 'market', at: null });
  const money = g.ask('home').coins;
  const buy = act(g, 'market.buy', { shop: 'market', item: 'rice', at: { x: 14, y: 11 } });
  assert.ok(SCENES['door.coins'].story.includes(fact(buy, 'scene.opened').line));
  const price = fact(buy, 'market.bought').price;
  assert.equal(g.ask('home').coins, money - price + 3);
  act(g, 'scene.choose', { id: 'door.coins', pick: 'back', at: null });
  assert.equal(g.ask('home').coins, money - price);
  assert.ok(why(g, 'shi').filter(x => x === 'fair').length >= 1);
  // 第二天：桂嫂那件阿满提一句；老周在渡口喊人搭把手
  must(g, 'sleep');
  assert.equal(greet(g, 'aman'), SCENES['door.salt'].echo[1]);
  wait(g, 9 * 60 - g.ask('clock').minute);
  assert.equal(where(g, 'zhou').place, 'river');
  const energy = g.ask('hero').energy;
  must(g, 'travel.to', { to: 'river', at: null });
  const lift = fact(
    act(g, 'scene.choose', { id: 'door.ferry', pick: 'lift', at: null }),
    'scene.chosen',
  );
  assert.ok(g.ask('hero').energy < energy, '搭把手花力气');
  assert.ok(why(g, 'zhou').includes(lift.ok ? 'pitched' : 'helped'));
});

test('天时年景：上一季雨水多是涝年，阿满、老周的年景各压一档；第三天田头有挖沟那件', () => {
  const base = sleepTo(fresh(4), 14);
  const plain = staged(base, w => (w.purses.tally = { wet: 4, heavy: 0 }));
  const flood = staged(base, w => (w.purses.tally = { wet: 9, heavy: 0 }));
  must(plain, 'sleep');
  const out = act(flood, 'sleep');
  assert.equal(fact(out, 'almanac.year').kind, 'flood');
  assert.equal(flood.ask('almanac').yearName, '涝年');
  const f = h => flood.ask('purse').find(x => x.id === h).fortune;
  const p = h => plain.ask('purse').find(x => x.id === h).fortune;
  for (const h of ['aman', 'zhou']) assert.equal(f(h), Math.max(-2, p(h) - 1), h);
  assert.equal(greet(flood, 'aman'), YEARS.flood.say.aman);
  sleepTo(flood, 17);
  assert.ok(flood.ask('scenes').some(e => e.id === 'year.flood'));
  wait(flood, 9 * 60 - flood.ask('clock').minute);
  assert.equal(where(flood, 'shi').place, 'field');
});

test('节令：前三天便条、村民先提；大日子全村聚到樟树下，人碰人那件你插了手，第二天传好话', () => {
  const g = sleepTo(fresh(1), 3);
  assert.ok(g.ask('notes').some(n => n.text === FEASTS.sheshu.note));
  assert.equal(greet(g, 'gui'), FEASTS.sheshu.talk[1]);
  sleepTo(g, 6);
  assert.equal(g.ask('almanac').today.id, 'sheshu');
  wait(g, 9 * 60 - g.ask('clock').minute);
  const at = g.ask('residents').filter(p => p.place === 'tea');
  assert.ok(at.length >= 5, '大日子差不多全村都来');
  assert.ok(at.every(p => p.doing.startsWith('春社')));
  const live = g.ask('scenes').find(e => SCENES[e.id].feast === 'sheshu');
  assert.ok(live?.now, '春社上有一件人碰人的事');
  must(g, 'travel.to', { to: 'tea', at: null });
  const pick = SCENES[live.id].opts[0].key;
  act(g, 'scene.choose', { id: live.id, pick, at: null });
  must(g, 'sleep');
  assert.equal(g.save().state.world.almanac.last.good, true);
});

test('村民的盼头：到日子起念头，攒到一半你能插手；攒满办成，过了日子办不成', () => {
  let g = sleepTo(fresh(5), HOPES.shi.start);
  assert.equal(g.ask('hopes').find(h => h.who === 'shi').state, 'saving');
  assert.equal(greet(g, 'shi'), HOPES.shi.stages[0][1]);
  g = staged(g, w => (w.hopes.shi.n = 40));
  const out = act(g, 'sleep');
  assert.ok(
    out.facts.some(f => f.type === 'hope.stage' && f.data.who === 'shi' && f.data.stage === 1),
  );
  assert.ok(g.ask('scenes').some(e => e.id === 'hope.shi'));
  const before = g.save().state.world.hopes.shi.n;
  act(g, 'scene.choose', { id: 'hope.shi', pick: 'spoil', at: null });
  assert.equal(g.save().state.world.hopes.shi.n, before - 25);
  assert.ok(why(g, 'shi').includes('hindered'));
  // 攒满了：第二天清早办成
  const done = staged(g, w => (w.hopes.shi.n = 100));
  const end = fact(act(done, 'sleep'), 'hope.done');
  assert.equal(end.line, HOPES.shi.done.story);
  assert.equal(done.ask('hopes').find(h => h.who === 'shi').after, HOPES.shi.done.after);
  // 过了日子还没攒满：办不成
  const late = staged(g, w => {
    w.hopes.shi.since = 1;
    w.clock.day = HOPES.shi.days + 2;
  });
  assert.equal(fact(act(late, 'sleep'), 'hope.failed').line, HOPES.shi.fail.story);
});
