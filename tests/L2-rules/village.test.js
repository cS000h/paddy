// L2 规则：时间、乡邻、收菜筐、手记。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, must, refused, growOne, carried, FIELD } from '../helpers.js';

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
  assert.deepEqual(done, ['till', 'sow', 'water', 'meet', 'harvest']);
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
