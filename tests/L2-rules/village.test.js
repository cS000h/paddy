// L2 规则：时间、乡邻、收菜筐、手记。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, must, refused, growOne, carried, FIELD } from '../helpers.js';
import { createGame } from '../../src/port/game.js';
import { lifeLine } from '../../src/sim/talk.js';

test('时间一小段一小段地过，到半夜停住不催人，睡一觉到第二天清早', () => {
  const g = newGame();
  assert.equal(g.ask('clock').clock, '06:00');
  must(g, 'clock.advance', { minutes: 10 });
  assert.equal(g.ask('clock').clock, '06:10');
  assert.equal(refused(g, 'clock.advance', { minutes: 0 }), '时间只能一小段一小段地过');
  for (let i = 0; i < 9; i++) must(g, 'clock.advance', { minutes: 120 });
  assert.equal(g.ask('clock').stopped, true);
  assert.equal(refused(g, 'clock.advance', { minutes: 10 }), '夜深了');
  assert.deepEqual(must(g, 'sleep'), ['day.ended', 'day.started', 'weather.changed']);
  const c = g.ask('clock');
  assert.deepEqual([c.day, c.clock, c.period], [2, '06:00', '清晨']);
});

test('头一回见面说见面的话；同一天再说话不再涨熟悉', () => {
  const g = newGame();
  const first = g.dispatch('talk', { to: 'shi' }).facts.find(f => f.type === 'person.talked');
  assert.equal(first.data.first, true);
  assert.equal(first.data.gain, 1, '画面要说熟悉了多少');
  assert.match(first.data.line, /住下了/);
  const again = g.dispatch('talk', { to: 'shi' }).facts.find(f => f.type === 'person.talked');
  assert.equal(again.data.first, false);
  assert.equal(again.data.gain, 0);
  assert.equal(g.ask('bonds').find(b => b.id === 'shi').known, 1);
  must(g, 'sleep');
  must(g, 'talk', { to: 'shi' });
  assert.equal(g.ask('bonds').find(b => b.id === 'shi').known, 2);
  assert.match(refused(g, 'talk', { to: 'zhou' }), /不在附近/);
});

test('在田边初见石伯，他认得刚种下的地有没有浇过', () => {
  for (const wet of [false, true]) {
    const g = newGame();
    must(g, 'farm.till', FIELD);
    must(g, 'farm.sow', FIELD);
    if (wet) must(g, 'farm.water', FIELD);
    const greeting = g.dispatch('talk', { to: 'shi' }).facts.find(f => f.type === 'person.talked');
    assert.match(greeting.data.line, wet ? /水吃进土/ : /籽旁边还是干的/);
  }
});

test('初见阿满跟着他的早班和午前作息；再问不重复涨熟悉', () => {
  const meet = g => g.dispatch('talk', { to: 'aman' }).facts[0].data;
  const morning = newGame();
  assert.match(meet(morning).line, /叶尖/);
  const tea = newGame();
  for (const minutes of [120, 60]) must(tea, 'clock.advance', { minutes });
  must(tea, 'travel.to', { to: 'tea' });
  const first = meet(tea);
  assert.ok(first.first);
  assert.match(first.line, /剥/);
  assert.equal(meet(tea).gain, 0);
  const walking = newGame();
  assert.match(
    walking.dispatch('talk', { to: 'aman', walking: true }).facts[0].data.line,
    /边走边说/,
  );
});

test('同一茶摊按说话者的心情和天气选词，赶路和赴约优先', () => {
  const c = { place: 'tea', slot: 3, band: 'low', wx: 'sunny' };
  assert.match(lifeLine('aman', c, 1), /过不去/);
  assert.match(lifeLine('aman', { ...c, band: 'ok' }, 1), /几趟路/);
  assert.match(lifeLine('aman', { ...c, wx: 'rain', wet: true }, 1), /袖口/);
  assert.match(lifeLine('aman', { ...c, waiting: true }, 1), /位子/);
  assert.match(lifeLine('aman', { ...c, waiting: true, walking: true }, 1), /边走边说/);
});

test('送一把菜：对方记着，第二天早上留下回礼和便条', () => {
  const g = newGame();
  assert.match(refused(g, 'gift', { to: 'gui', item: 'tofu' }), /豆腐不够了/);
  assert.equal(refused(g, 'gift', { to: 'gui', item: 'seed.qingcai' }), '这个不好拿去送人');
  growOne(g);
  must(g, 'farm.harvest', FIELD);
  assert.match(
    refused(g, 'gift', { to: 'gui', item: 'egg' }),
    /身上没带鸡蛋/,
    '在外头，家里存的东西够不着',
  );
  const said = g.dispatch('gift', { to: 'gui', item: 'veg.qingcai' }).facts;
  assert.match(said.find(f => f.type === 'gift.given').data.line, /自己种的/);
  assert.equal(said.find(f => f.type === 'gift.given').data.gain, 2);
  assert.equal(g.ask('bonds').find(b => b.id === 'gui').known, 2);
  const seedsBefore = carried(g, 'seed.qingcai');
  assert.ok(must(g, 'sleep').includes('gift.returned'));
  assert.equal(carried(g, 'seed.qingcai'), seedsBefore + 2);
  assert.ok(g.ask('notes', g.ask('clock').day).some(n => n.title === '桂嫂的回礼'));
  const greet = () =>
    g.dispatch('talk', { to: 'gui' }).facts.find(f => f.type === 'person.talked').data.line;
  assert.match(greet(), /碗你留着/);
  assert.doesNotMatch(greet(), /碗你留着/);
  assert.ok(!must(g, 'sleep').includes('gift.returned'), '回礼只给一次');
});

test('收菜筐：晚上放菜，清早换成钱；留钱托捎种子，清早送到', () => {
  const g = newGame();
  growOne(g);
  must(g, 'farm.harvest', FIELD);
  assert.equal(refused(g, 'basket.put', { item: 'seed.qingcai', n: 1 }), '阿满只收吃的和手艺活');
  must(g, 'basket.put', { item: 'veg.qingcai', n: 1 });
  must(g, 'basket.order', { item: 'seed.qingcai', n: 5 });
  assert.equal(g.ask('home').coins, 24 - 10);
  assert.equal(refused(g, 'basket.order', { item: 'seed.qingcai', n: 50 }), '钱不够');
  const facts = must(g, 'sleep');
  assert.ok(facts.includes('basket.sold') && facts.includes('basket.delivered'));
  const home = g.ask('home');
  assert.equal(home.coins, 24 - 10 + 6);
  assert.equal(carried(g, 'seed.qingcai'), 11 + 5, '捎来的东西先放在身上');
  assert.deepEqual(g.ask('basket').goods, []);
});

test('手记：做到一件记一件，每件只记一次', () => {
  const g = newGame();
  assert.ok(g.ask('guide').every(q => !q.done));
  growOne(g);
  must(g, 'farm.harvest', FIELD);
  must(g, 'talk', { to: 'gui' });
  const done = g
    .ask('guide')
    .filter(q => q.done)
    .map(q => q.id);
  assert.deepEqual(done, ['till', 'water', 'sow', 'meet', 'harvest']);
  assert.ok(!must(g, 'farm.till', { x: 7, y: 19, at: FIELD.at }).includes('guide.done'));
});

test('聊天：见面聊日常聊几遍都行；近况、安排、天色每天各问一回；天黑了不问安排', () => {
  const g = newGame();
  must(g, 'talk', { to: 'shi' });
  const life = g.dispatch('talk', { to: 'shi', topic: 'life' }).facts[0].data;
  assert.equal(life.topic, 'life');
  assert.equal(life.gain, 0, '同一天再聊不再涨熟悉');
  for (const topic of ['news', 'plan', 'sky']) {
    const said = g.dispatch('talk', { to: 'shi', topic }).facts[0].data;
    assert.ok(said.line.length > 4, topic);
    assert.equal(refused(g, 'talk', { to: 'shi', topic }), '这个话题今天已经聊过了，明天再问吧。');
  }
  assert.equal(refused(g, 'talk', { to: 'shi', topic: 'gossip' }), '没有这个话题');
  assert.deepEqual(g.ask('bonds').find(b => b.id === 'shi').asked, ['news', 'plan', 'sky']);
  must(g, 'sleep');
  assert.deepEqual(g.ask('bonds').find(b => b.id === 'shi').asked, [], '清早又能问了');
  const plan = g.dispatch('talk', { to: 'shi', topic: 'plan' }).facts[0].data.line;
  assert.match(plan, /清晨在.*午前去.*午后去.*傍晚去/, '说一天四段各去哪儿');
  must(g, 'talk', { to: 'gui' }); // 先见过面，夜里才说隔墙话
  for (let i = 0; i < 8; i++) must(g, 'clock.advance', { minutes: 120 });
  assert.equal(refused(g, 'talk', { to: 'gui', topic: 'plan' }), '天都黑了，明天的事明天再问吧。');
  assert.match(
    g.dispatch('talk', { to: 'gui' }).facts[0].data.line,
    /还没睡|夜里凉|蛐蛐/,
    '夜里桂嫂隔着墙说话',
  );
});

test('乡邻有心情：说话前的动作跟着心情，每天清早随天气起落，熟了一步对方也高兴', () => {
  const g = newGame();
  const mood = id => g.ask('bonds').find(b => b.id === id);
  assert.equal(mood('aman').mood, 'ok');
  must(g, 'talk', { to: 'shi' });
  must(g, 'sleep');
  const said = g.dispatch('talk', { to: 'shi' }).facts[0].data.line;
  assert.match(said, /^石伯.*“/, '引号前面先有一个动作');
  const seen = new Set();
  for (let day = 0; day < 20; day++) {
    must(g, 'sleep');
    for (const b of g.ask('bonds')) seen.add(b.mood);
  }
  assert.ok(seen.size >= 2, '心情会起落');
});

test('熟一点以后说起最爱吃什么，记下来；送去那道菜，对方格外高兴', () => {
  const g = newGame();
  let learned = null;
  for (let day = 0; day < 6 && !learned; day++) {
    learned = g.dispatch('talk', { to: 'shi' }).facts[0].data.favorite;
    must(g, 'sleep');
  }
  assert.equal(learned, '土豆炖豆子');
  assert.equal(g.ask('bonds').find(b => b.id === 'shi').favorite, '土豆炖豆子');
});

test('约定：熟人才约，约好的那天午前他在茶摊等，去了熟悉 +2；没去就错过，对方留话', () => {
  const g = newGame();
  assert.equal(refused(g, 'invite', { to: 'shi' }), '还不认识，先聊两句吧。');
  must(g, 'talk', { to: 'shi' });
  must(g, 'invite', { to: 'shi' });
  assert.equal(g.ask('visits').active.name, '石伯');
  must(g, 'talk', { to: 'gui' });
  assert.equal(refused(g, 'invite', { to: 'gui' }), '先把手头这场约定过完吧。');
  assert.equal(refused(g, 'visit.meet', {}), '约的是明天午前。');
  must(g, 'sleep');
  assert.ok(g.ask('notes', g.ask('clock').day).some(n => n.title === '今天有约'));
  must(g, 'clock.advance', { minutes: 120 });
  must(g, 'clock.advance', { minutes: 70 }); // 九点过，午前
  const shi = g.ask('residents').find(r => r.id === 'shi');
  assert.equal(shi.map, 'tea', '有约的那天午前，他在茶摊');
  assert.match(shi.doing, /等你赴约/);
  must(g, 'travel.to', { to: 'tea' });
  assert.match(g.dispatch('talk', { to: 'shi' }).facts[0].data.line, /茶正好入口/);
  const before = g.ask('bonds').find(b => b.id === 'shi').known;
  const met = g.dispatch('visit.meet', { at: { x: shi.x, y: shi.y + 1, dir: 'up' } });
  assert.ok(met.ok, met.reason);
  assert.equal(g.ask('bonds').find(b => b.id === 'shi').known, before + 2);
  assert.equal(g.ask('visits').active, null);
  // 再约一回，这回不去：过了午前就错过
  must(g, 'sleep');
  g.dispatch('travel.to', { to: 'yard' }); // 回小院，桂嫂在院里
  must(g, 'invite', { to: 'gui' });
  must(g, 'sleep');
  for (let i = 0; i < 4; i++) must(g, 'clock.advance', { minutes: 120 });
  assert.equal(g.ask('visits').active, null);
  assert.ok(g.ask('visits').history.at(-1).includes('没赶上'));
});

test('查账、确认订货和隔天收货：预览不留痕，重复旧订单不扣钱', () => {
  const g = newGame();
  const at = { x: 20, y: 19 };
  const options = () => g.ask('interaction.options', 'aman', at);
  const before = JSON.stringify(g.save());
  assert.ok(g.ask('resident.greeting', 'aman'));
  assert.ok(!options().some(c => c.key.startsWith('bill.')));
  const order = options().find(
    c => c.input?.item === 'seed.qingcai' && c.command === 'basket.order',
  );
  assert.ok(order.confirm);
  assert.equal(JSON.stringify(g.save()), before);
  must(g, order.command, { ...order.input, at });
  const paid = g.ask('home').coins;
  assert.match(refused(g, order.command, { ...order.input, at }), /单子变过/);
  assert.equal(g.ask('home').coins, paid);
  must(g, 'basket.put', { item: 'cake', n: 1, at: { x: 8, y: 11 } });
  assert.ok(must(g, 'sleep').includes('basket.delivered'));
  const receipt = g.ask('basket').receipt;
  assert.deepEqual(receipt.goods, { cake: 1 });
  assert.ok(receipt.coins > 0);
  const line = options().find(c => c.key === 'bill.' + receipt.day).line;
  assert.match(line, /^第 2 日/);
  assert.ok(line.includes('米糕') && line.includes(receipt.coins + '文'));
  const loaded = createGame({ saved: g.save(), debug: true });
  assert.deepEqual(loaded.ask('basket').receipt, receipt);
  assert.equal(
    loaded.ask('interaction.options', 'aman', at).find(c => c.key === 'bill.' + receipt.day).line,
    line,
  );
  assert.equal(loaded.ask('bonds').find(b => b.id === 'aman').known, 0);
});
test('石伯读指定田块；过客交付选项和实际交付共用库存', () => {
  const g = newGame();
  must(g, 'farm.till', FIELD);
  must(g, 'farm.sow', FIELD);
  const plots = () =>
    g.ask('interaction.options', 'shi', FIELD.at).find(c => c.key === 'plot.6.19');
  assert.match(plots().line, /缺水/);
  must(g, 'farm.water', FIELD);
  assert.match(plots().line, /水分够/);
  must(g, 'cook', { items: ['rice'], method: 'stew', at: { x: 10, y: 11 } });
  const dish = g.ask('kitchen', { x: 10, y: 11 }).dishes[0];
  must(g, 'dish.pack', { id: dish.id, at: { x: 10, y: 11 } });
  const v = g.ask('visitors').active[0];
  must(g, 'travel.to', { to: v.map });
  const at = { x: v.x, y: v.y };
  const rows = () => g.ask('interaction.options', v.id, at);
  assert.match(v.greeting, /想/);
  const offer = rows().find(c => c.input?.dish === dish.id);
  assert.ok(offer.confirm);
  must(g, offer.command, { ...offer.input, at });
  assert.ok(!rows().some(c => c.command === 'visitor.fulfill'));
  assert.match(g.ask('visitors').active.find(p => p.id === v.id).greeting, /已经收到/);
  assert.equal(g.ask('pack').dishes.length, 0);
  assert.match(refused(g, offer.command, { ...offer.input, at }), /帮完了/);
});

test('六位乡邻按各自的工位读家当、菜畦、店货和采集次数', () => {
  const g = newGame();
  must(g, 'farm.till', FIELD);
  must(g, 'farm.sow', FIELD);
  must(g, 'pack.put', { item: 'rice', n: 1, at: { x: 8, y: 11 } });
  for (const [id, key] of [
    ['aman', 'order.'],
    ['shi', 'plot.'],
    ['gui', 'recipe.'],
    ['qiao', 'cloth'],
    ['zhou', 'outing.fish'],
    ['yun', 'outing.tea'],
  ]) {
    const pos = g.ask('residents').find(v => v.id === id);
    if (pos.map !== g.ask('hero').map) must(g, 'travel.to', { to: pos.map });
    const before = g.save();
    const rows = g.ask('interaction.options', id, { x: pos.x, y: pos.y });
    assert.ok(
      rows.some(r => r.key.startsWith(key)),
      id,
    );
    assert.deepEqual(g.save(), before);
    assert.ok(
      !g.ask('interaction.options', id, pos, true).some(r => r.key.startsWith(key)),
      id + ' 赶路',
    );
  }
});

test('夜里初见桂嫂报姓名，连续两周的主动寒暄都有独立回应', () => {
  const night = newGame();
  for (let i = 0; i < 7; i++) must(night, 'clock.advance', { minutes: 120 });
  assert.match(night.ask('resident.greeting', 'gui'), /桂嫂/);
  const game = newGame();
  for (let day = 0; day < 14; day++) {
    const strip = line => line.slice(line.indexOf('“') + 1).replace(/”$/, '');
    for (const resident of game.ask('residents').filter(p => p.visible)) {
      if (game.ask('hero').map !== resident.map) must(game, 'travel.to', { to: resident.map });
      const line = game.ask('resident.greeting', resident.id);
      const choice = game
        .ask('interaction.options', resident.id, resident)
        .find(o => o.key === 'talk');
      const fact = game
        .dispatch(choice.command, choice.input)
        .facts.find(f => f.type === 'person.talked');
      assert.notEqual(strip(line), strip(fact.data.line), resident.name);
    }
    must(game, 'sleep');
  }
});
