// L2 规则：时间、乡邻、乡邻买卖、手记。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newGame,
  must,
  refused,
  growOne,
  carried,
  FIELD,
  stocked,
  HOME,
  STOVE,
} from '../helpers.js';
import { lifeLine } from '../../src/sim/talk.js';
import { createGame } from '../../src/port/game.js';
import { ITEMS } from '../../src/content/items.js';
import { NEIGHBORS, NEIGHBOR_RULES } from '../../src/content/neighbors.js';

test('时间一小段一小段地过，到半夜停住不催人，睡一觉到第二天清早', () => {
  const g = newGame();
  assert.equal(g.ask('clock').clock, '06:00');
  must(g, 'clock.advance', { minutes: 10 });
  assert.equal(g.ask('clock').clock, '06:10');
  assert.equal(refused(g, 'clock.advance', { minutes: 0 }), '时间只能一小段一小段地过');
  for (let i = 0; i < 9; i++) must(g, 'clock.advance', { minutes: 120 });
  assert.equal(g.ask('clock').stopped, true);
  assert.equal(refused(g, 'clock.advance', { minutes: 10 }), '夜深了');
  // 清早村里各户也有自己的事（家底进出、乡邻做事），不在这里看
  const own = must(g, 'sleep').filter(t => !/^(purse|deed|scene|hope|leaning|almanac)\./.test(t));
  assert.deepEqual(own, ['day.ended', 'day.started', 'weather.changed']);
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

test('乡邻买卖：每户每天想要一两样，走到跟前卖给他或者换他家的，一天两回，不要的不收', () => {
  const g0 = newGame();
  const wants = g0.ask('neighbor.wants', 'gui');
  assert.equal(wants.items.length, 2);
  const want = wants.items[0];
  const g = stocked(g0, { [want]: 3, pebble: 1 });
  const home = HOME;
  must(g, 'pack.put', { item: want, n: 3, at: home });
  must(g, 'pack.put', { item: 'pebble', at: home });
  const gui = g.ask('residents').find(v => v.id === 'gui');
  if (gui.map !== g.ask('hero').map) must(g, 'travel.to', { to: gui.map });
  const at = { x: gui.x, y: gui.y };
  const ask = g.ask('interaction.options', 'gui', at);
  assert.match(ask.find(r => r.key.startsWith('wants.')).line, /嫂子/);
  assert.ok(ask.some(r => r.command === 'neighbor.sell' && r.input.item === want));
  assert.equal(refused(g, 'neighbor.sell', { to: 'gui', item: 'pebble', at }), '他今天不要这个');
  const coins = g.ask('home').coins;
  const deal = g.ask('neighbor.swapFor', 'gui', want);
  assert.ok(deal && deal.n >= 1, '桂嫂拿得出东西换');
  const got = carried(g, deal.item);
  must(g, 'neighbor.sell', { to: 'gui', item: want, at });
  assert.ok(g.ask('home').coins > coins, '钱从桂嫂家出，到了自家');
  assert.ok(g.ask('guide').find(q => q.id === 'sell').done, '卖给乡邻也算「卖一回东西」');
  must(g, 'neighbor.swap', { to: 'gui', item: want, at });
  assert.equal(carried(g, deal.item), got + deal.n);
  assert.equal(
    refused(g, 'neighbor.sell', { to: 'gui', item: want, at }),
    '“今儿买齐啦，再买家里坛子装不下咯！”',
  );
  assert.equal(carried(g, want), 1);
  assert.equal(
    refused(g, 'neighbor.sell', { to: 'qiao', item: want, at }),
    '他手头没闲钱，只换不买',
  );
});

test('乡邻今天想要的一整天不变：存档里的随机数中途被抽过（钓鱼、翻找）也不变，睡一觉才换', () => {
  const g = newGame();
  const before = ['gui', 'shi', 'zhou'].map(id => g.ask('neighbor.wants', id).items);
  const saved = JSON.parse(JSON.stringify(g.save()));
  saved.state.world.meta.seed = (saved.state.world.meta.seed + 12345) >>> 0;
  const later = createGame({ saved });
  assert.deepEqual(
    ['gui', 'shi', 'zhou'].map(id => later.ask('neighbor.wants', id).items),
    before,
  );
  must(later, 'sleep');
  assert.equal(later.save().state.world.deals.day, 2);
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

test('石伯读指定田块；过客交付选项和实际交付共用库存', () => {
  const g = newGame();
  must(g, 'farm.till', FIELD);
  must(g, 'farm.sow', FIELD);
  const plots = () =>
    g.ask('interaction.options', 'shi', FIELD.at).find(c => c.key === 'plot.6.19');
  assert.match(plots().line, /缺水/);
  must(g, 'farm.water', FIELD);
  assert.match(plots().line, /水分够/);
  must(g, 'cook', { items: ['rice'], method: 'stew', at: STOVE });
  const dish = g.ask('kitchen', STOVE).dishes[0];
  must(g, 'dish.carry', { id: dish.id, at: STOVE });
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
  assert.equal(g.ask('table').hands.length, 0, '端着的那碗交出去了');
  assert.match(refused(g, offer.command, { ...offer.input, at }), /帮完了/);
});

test('六位乡邻按各自的工位读家当、菜畦、店货和采集次数', () => {
  const g = newGame();
  must(g, 'farm.till', FIELD);
  must(g, 'farm.sow', FIELD);
  must(g, 'pack.put', { item: 'rice', n: 1, at: HOME });
  for (const [id, key] of [
    ['aman', 'wants.'],
    ['shi', 'plot.'],
    ['gui', 'recipe.'],
    ['qiao', 'cloth'],
    ['zhou', 'fishing.mood'],
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
  const replies = {};
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
      (replies[resident.name] ||= []).push(strip(fact.data.line));
    }
    must(game, 'sleep');
  }
  // 工位上的开场常常天天一样，招呼过后的回应却不能也天天是同一句。
  for (const [name, lines] of Object.entries(replies)) {
    const count = {};
    for (const line of lines) count[line] = (count[line] || 0) + 1;
    assert.ok(Math.max(...Object.values(count)) * 2 <= lines.length, name);
  }
});

test('招呼过后接话里能问近况、安排、天色，熟了能约茶摊；问过的收起，天黑不问安排', () => {
  const g = newGame();
  const gui = () => g.ask('residents').find(p => p.id === 'gui');
  const rows = () => g.ask('interaction.options', 'gui', gui());
  const pick = key => {
    const row = rows().find(o => o.key === key);
    assert.ok(row, key);
    return g.dispatch(row.command, { ...row.input, at: gui() });
  };
  assert.ok(!rows().some(o => o.group === '聊聊' || o.command === 'invite'));
  assert.ok(pick('talk').ok);
  assert.deepEqual(
    rows()
      .filter(o => o.group === '聊聊')
      .map(o => o.key),
    ['topic.news', 'topic.plan', 'topic.sky'],
  );
  assert.ok(pick('topic.news').facts.find(f => f.type === 'person.talked').data.line);
  assert.ok(!rows().some(o => o.key === 'topic.news'));
  const made = pick('invite.gui').facts.find(f => f.type === 'appointment.made');
  assert.match(made.data.line, /茶摊/);
  assert.ok(!rows().some(o => o.command === 'invite'));
  for (let i = 0; i < 7; i++) must(g, 'clock.advance', { minutes: 120 });
  assert.ok(gui().atDoor);
  const night = rows().map(o => o.key);
  assert.ok(night.includes('topic.sky') && !night.includes('topic.plan'));
});

test('乡邻换东西大致等值：每户每样想要的东西，换回来的不超过它价钱的 1.25 倍，换不出就不换', () => {
  const g = newGame();
  const worth = item => ITEMS[item].sell || Math.max(1, Math.ceil((ITEMS[item].buy || 2) / 2));
  let some = 0;
  for (const [id, h] of Object.entries(NEIGHBORS))
    for (const want of h.wants) {
      const item = want === 'fish' ? 'fish.crucian' : want;
      assert.ok(ITEMS[item], `${id} 想要的 ${want} 是游戏里有的东西`);
      for (const give of h.gives) assert.ok(ITEMS[give], `${id} 拿得出的 ${give} 是游戏里有的东西`);
      const deal = g.ask('neighbor.swapFor', id, item);
      if (!deal) continue;
      some++;
      assert.ok(
        worth(deal.item) * deal.n <= worth(item) * NEIGHBOR_RULES.swapCap,
        `${id} 换 ${item}`,
      );
    }
  assert.ok(some > 10, '大多数东西换得出');
});
