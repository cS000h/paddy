// L2 规则：人心的底子后半段——家底、心烦、见闻、村民按性情做事，和村志工具。一律通过端口发命令、问查询；
// 要搭的场面（心烦快满了、手头紧）从存档里摆好再读进来。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/port/game.js';
import { newGame, must, refused, settle } from '../helpers.js';
import { HOUSES, EXPENSES, EXPENSE_SIZE } from '../../src/content/purse.js';
import { DEEDS } from '../../src/content/deeds.js';
import { TEMPERS, TAGS, COPING } from '../../src/content/traits.js';
import { FACT_TAGS, PLACE_TAGS, DAY_TAGS, UP_LINES, DOWN_LINES } from '../../src/content/stress.js';
import { aiOf, scoreOf } from '../../src/sim/deeds.js';
import { simulate, printLog } from '../../tools/village-sim.mjs';

/** 从存档里摆一个场面再读进来（写入检查开着）。 */
function staged(change, seed = 1) {
  const save = structuredClone(newGame(seed).save());
  change(save.state.world);
  return createGame({ saved: save, debug: true });
}
const world = g => g.save().state.world;
const passDay = g => {
  while (g.ask('clock').minute < 20 * 60) must(g, 'clock.advance', { minutes: 60 });
  return must(g, 'sleep');
};

test('数据对得上：做法标签、营生、开销、动作、心烦的话都指得上', () => {
  for (const h of Object.values(HOUSES)) assert.ok(h.coins > 0 && Array.isArray(h.members));
  for (const e of Object.values(EXPENSES)) {
    assert.ok(e.house === null || Object.hasOwn(HOUSES, e.house), e.title);
    assert.ok(Object.hasOwn(EXPENSE_SIZE, e.size), e.title);
    assert.ok(e.title.length <= 8, e.title);
  }
  for (const [id, d] of Object.entries(DEEDS)) {
    assert.ok(
      d.tags.every(t => Object.hasOwn(TAGS, t)),
      id,
    );
    assert.ok(d.again <= d.fade, `${id} 隔的天数要短过见闻记的天数`);
  }
  const tags = [
    ...Object.values(FACT_TAGS).flat(),
    ...Object.values(PLACE_TAGS).flat(),
    ...Object.values(DAY_TAGS).flatMap(x => Object.values(x).flat()),
  ];
  assert.ok(tags.every(t => Object.hasOwn(TAGS, t)));
  // 违着有话的性情，都真有违着的做法；顺着同理
  for (const t of Object.keys(UP_LINES)) assert.ok(TEMPERS[t].dislikes.length, t);
  for (const t of Object.keys(DOWN_LINES)) assert.ok(TEMPERS[t].likes.length, t);
  for (const [t, def] of Object.entries(TEMPERS)) {
    if (def.dislikes.length) assert.ok(UP_LINES[t], `${t} 缺违着时的话`);
    assert.ok(DOWN_LINES[t], `${t} 缺顺着时的话`);
  }
});

test('家底：六户和铺子各有钱，每天按营生进出；别人家有多少钱看不见', () => {
  const g = newGame();
  const houses = g.ask('purse');
  assert.deepEqual(
    houses.map(h => h.id),
    Object.keys(HOUSES),
  );
  assert.ok(houses.every(h => !('coins' in h) && h.fortuneWord === '年景平常' && !h.short));
  const before = world(g).purses.houses;
  passDay(g);
  const after = world(g).purses.houses;
  assert.ok(Object.keys(HOUSES).some(id => after[id].coins !== before[id].coins));
  assert.ok(Object.values(after).every(h => h.coins >= 0));
});

test('家底：碰上大开销，钱不够的那一截记成手头紧，以后进的钱先填它；换季重定年景', () => {
  // 让阿满家只剩 1 文：碰上开销一定不够。换着种子睡一觉，直到碰上
  let g = null,
    spent = null;
  for (let seed = 1; seed < 400 && !spent; seed++) {
    g = staged(w => (w.purses.houses.aman.coins = 1), seed);
    const facts = g.dispatch('sleep', {}).facts;
    spent = facts.find(f => f.type === 'purse.spent' && f.data.house === 'aman')?.data;
  }
  assert.ok(spent, '四百个种子里总该碰上一回');
  assert.ok(spent.short > 0 && spent.n === EXPENSE_SIZE[EXPENSES[spent.id].size]);
  const short = world(g).purses.houses.aman.short;
  assert.equal(short.n, spent.short);
  assert.equal(g.ask('purse').find(h => h.id === 'aman').short, EXPENSES[spent.id].title);
  assert.equal(world(g).purses.houses.aman.coins, 0);
  passDay(g);
  const later = world(g).purses.houses.aman;
  assert.ok(!later.short || later.short.n < short.n, '进的钱先填手头紧的那一截');
  // 换季：第十五天清早，各户都说一句年景；一季下了十二天雨，种地的年景差
  const s = staged(w => {
    w.clock.day = 14;
    w.purses.tally = { wet: 12, heavy: 6 };
  });
  const turn = s.dispatch('sleep', {}).facts.filter(f => f.type === 'purse.fortune');
  assert.equal(turn.length, Object.keys(HOUSES).length);
  assert.ok(turn.find(f => f.data.house === 'shi').data.fortune < 0);
  assert.ok(world(s).purses.tally.wet <= 1, '新的一季从头记');
});

test('家底：玩家在杂货铺买东西，钱进铺子的钱匣', () => {
  const g = staged(w => {
    w.people.hero.map = 'market';
    w.clock.minute = 9 * 60;
  });
  const at = counter(g);
  assert.ok(at, '杂货铺里找得到柜台前的一格');
  must(g, 'market.visit', { shop: 'market', at });
  const it = g.ask('market', 'market', at).wares.find(x => x.left > 0 && x.price <= 24);
  const box = world(g).purses.houses.shop.coins;
  must(g, 'market.buy', { shop: 'market', item: it.item, at });
  assert.equal(world(g).purses.houses.shop.coins, box + it.price);
});

/** 杂货铺柜台前能站人的一格。 */
function counter(g) {
  for (let y = 0; y < 40; y++)
    for (let x = 0; x < 40; x++) {
      const at = { x, y, dir: 'up' };
      if (g.ask('market', 'market', at).near && g.dispatch('person.place', at).ok) return at;
    }
  return null;
}

test('心烦：违着性情涨、顺着降，同一样一天只算两回；涨过一档说一句', () => {
  // 抠门的人送东西心里一抽：28 涨到 34，刚过三成
  const g = staged(w => {
    w.persona.hero.tempers = ['stingy'];
    w.persona.hero.stress = 28;
    w.packs.hero.items['veg.qingcai'] = 2;
  });
  const up = g.dispatch('gift', { to: 'gui', item: 'veg.qingcai' });
  assert.equal(up.ok, true, up.reason);
  const f = up.facts.find(x => x.type === 'stress.changed').data;
  assert.deepEqual([f.tag, f.delta, f.value, f.crossed], ['gift', 6, 34, true]);
  assert.equal(g.ask('stress').level, 1);
  assert.equal(g.ask('persona').stress, 34);
  // 热络的人说说话心里松：一回 −3，一天只算两回
  const h = staged(w => {
    w.persona.hero.tempers = ['gregarious'];
    w.persona.hero.stress = 20;
  });
  for (let i = 0; i < 4; i++) must(h, 'talk', { to: 'shi' });
  assert.equal(h.ask('stress').value, 14);
});

test('心烦满了憋不住：从三个毛病里挑一个，泄掉一截，一直带着；没憋着时挑不了', () => {
  const g = staged(w => {
    w.persona.hero.tempers = ['stingy'];
    w.persona.hero.stress = 98;
    w.packs.hero.items['veg.qingcai'] = 2;
  });
  assert.equal(refused(g, 'stress.cope', { coping: 'drink' }), '心里还憋得住');
  const out = g.dispatch('gift', { to: 'gui', item: 'veg.qingcai' });
  const snapped = out.facts.find(x => x.type === 'stress.snapped').data;
  assert.equal(snapped.choices.length, 3);
  assert.ok(snapped.choices.every(c => Object.hasOwn(COPING, c.id) && c.name && c.note));
  const snap = g.ask('stress').snap;
  assert.deepEqual(
    snap.choices.map(c => c.id),
    snapped.choices.map(c => c.id),
  );
  const other = Object.keys(COPING).find(c => !snap.choices.some(x => x.id === c));
  assert.equal(refused(g, 'stress.cope', { coping: other }), '没有这个法子');
  const pick = snap.choices[0].id;
  const coped = must(g, 'stress.cope', { coping: pick });
  assert.deepEqual(coped, ['stress.coped']);
  assert.equal(g.ask('stress').value, 50);
  assert.equal(g.ask('stress').snap, null);
  assert.deepEqual(
    g.ask('persona').coping.map(c => c.id),
    [pick],
  );
  // 毛病的代价算进六项（贪杯：持家、体格各 −1……），明细里写着
  const parts = g.ask('persona').attrs.flatMap(a => a.parts);
  if (COPING[pick].attrs) assert.ok(parts.some(p => p.id === 'coping.' + pick));
});

test('带着毛病的人做那件事能解一回闷：暴食吃一口，无名火起冲人发火（对方记着）', () => {
  const g = staged(w => {
    w.persona.hero.coping = ['gluttony', 'outburst'];
    w.persona.hero.stress = 80;
  });
  const food = g.ask('pack').items.find(i => i.eat);
  assert.ok(food, '开局行囊里有能吃的');
  const ate = g.dispatch('eat', { item: food.id });
  assert.equal(ate.ok, true, ate.reason);
  assert.equal(g.ask('stress').value, 55);
  const line = ate.facts.find(x => x.type === 'stress.changed').data.line;
  assert.match(line, /饱/);
  // 一天一回：再吃不降
  const again = g.ask('pack').items.find(i => i.eat);
  if (again) g.dispatch('eat', { item: again.id });
  assert.equal(g.ask('stress').value, 55);
  // 明天心烦还在六成以上，跟石伯说话就发作，石伯记着
  const s = staged(w => {
    w.persona.hero.coping = ['outburst'];
    w.persona.hero.stress = 70;
  });
  must(s, 'talk', { to: 'shi' });
  assert.equal(s.ask('stress').value, 45);
  assert.ok(s.ask('opinion', 'shi').parts.some(p => p.id === 'why.outburst'));
});

test('村民按性情做事：每段时辰打一轮分，同一个种子结果相同；在场的人知道这件事', () => {
  const run = seed => {
    const g = newGame(seed);
    const done = [];
    g.on('deed.done', f => done.push(f.data));
    for (let i = 0; i < 3; i++) passDay(g);
    return { g, done };
  };
  const a = run(5),
    b = run(5);
  assert.ok(a.done.length > 0, '三天里村民总该做点什么');
  assert.deepEqual(a.done, b.done);
  assert.ok(a.done.every(d => Object.hasOwn(DEEDS, d.id) && d.line && d.who !== d.to));
  // 一段时辰一人最多做一件
  const per = new Map();
  for (const d of a.done) per.set(d.who, (per.get(d.who) || 0) + 1);
  assert.ok([...per.values()].every(n => n <= 4 * 3));
  // 主角在小院，田里的事看得见：听说的事里有它
  const g = newGame(5);
  const seen = [];
  g.on('deed.done', f => seen.push(f.data));
  must(g, 'clock.advance', { minutes: 120 });
  must(g, 'clock.advance', { minutes: 60 });
  const heard = g.ask('heard');
  for (const d of seen.filter(x => x.map === 'yard'))
    assert.ok(
      heard.some(x => x.line === d.line),
      d.line,
    );
  assert.ok(heard.every(x => typeof x.line === 'string' && x.day === 1));
  // 见闻过些天淡掉
  for (let i = 0; i < 12; i++) must(g, 'sleep');
  assert.ok(g.ask('heard').every(x => x.day > 1));
});

test('打分：性情的分量给足——怕生的人不爱闲聊，热络的人爱；抠门的人不送吃的', () => {
  const ai = tempers => aiOf({ tempers });
  const mid = { roll: 0.5 };
  assert.ok(
    scoreOf(DEEDS.chat, ai(['gregarious']), mid, 12) > scoreOf(DEEDS.chat, ai(['shy']), mid, 12),
  );
  // 就算起伏抽到最高、好感五十，抠门又怕生的人也过不了送吃的门槛
  const top = { roll: 1, opinion: 50 };
  assert.ok(scoreOf(DEEDS.treat, ai(['stingy', 'shy']), top, 12) < 25);
  assert.ok(scoreOf(DEEDS.treat, ai(['generous', 'gregarious']), top, 12) >= 25);
});

test('村志工具：不开画面跑 30 天，逐日打印得出一份日志', () => {
  const log = simulate({ days: 30, seed: 3 });
  assert.equal(log.days.length, 30);
  assert.ok(Object.values(log.totals.deeds).reduce((n, x) => n + x, 0) > 30);
  const text = printLog(log);
  assert.match(text, /第1天/);
  assert.match(text, /第30天/);
  assert.match(text, /总账/);
  assert.deepEqual(simulate({ days: 30, seed: 3 }), log, '同一个种子日志一字不差');
});
