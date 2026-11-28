// L2 规则：身体（饥、渴、心情）、吃喝、随身行囊。一律通过端口发命令。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  newGame,
  must,
  refused,
  growOne,
  carried,
  stored,
  wait,
  FIELD,
  HOME,
  WELL,
  stocked,
} from '../helpers.js';

const eaten = out => out.facts.find(f => f.type === 'meal.eaten').data;
const drunk = out => out.facts.find(f => f.type === 'water.drunk').data;
const whys = g => g.ask('ledger').map(e => e.why);
const cost = (g, action) => g.ask('action.cost', action);

test('开局不饿不渴；时间过去，肚子慢慢空、口慢慢干，日子安稳心情慢慢好', () => {
  const g = newGame();
  const b = g.ask('body');
  assert.deepEqual([b.hunger, b.thirst, b.mood, b.stuffed, b.buff], [60, 80, 62, 0, null]);
  assert.deepEqual([b.hungerWord, b.thirstWord, b.moodWord], ['不饿', '不渴', '平静']);
  wait(g, 180); // 06:00 → 09:00，一个时辰
  const later = g.ask('body');
  assert.deepEqual([later.hunger, later.thirst, later.mood], [55, 76, 64]);
  wait(g, 900); // → 24:00
  const night = g.ask('body');
  assert.deepEqual([night.hunger, night.thirst, night.mood], [30, 59, 74], '天黑以后口干得慢一半');
  must(g, 'sleep');
  const dawn = g.ask('body');
  assert.deepEqual([dawn.hunger, dawn.thirst, dawn.mood], [25, 53, 72], '一夜又饿又渴，熬夜心情差');
});

test('吃零嘴：管饱、回体力、心情好一点，甜的口干，还带一份增益', () => {
  const g = newGame();
  must(g, 'farm.till', FIELD);
  const out = g.dispatch('eat', { item: 'cake' });
  assert.deepEqual(
    out.facts.map(f => f.type),
    ['meal.eaten', 'guide.done'],
  );
  assert.equal(eaten(out).line, '你吃了米糕。软糯微甜。');
  const b = g.ask('body');
  assert.deepEqual([b.hunger, b.thirst, b.mood], [74, 77, 64]);
  assert.deepEqual(
    [b.buff.type, b.buff.name, b.buff.left, b.buff.text],
    ['treat', '解馋', 2, '接下来2次心情变差时，只差一半'],
  );
  assert.equal(g.ask('hero').energy, 100, '锄地花的 4 点体力补回来了');
  assert.equal(carried(g, 'cake'), 1);
  assert.deepEqual(
    g
      .ask('ledger')
      .slice(-6)
      .map(e => e.text),
    ['米糕 −1', '饱腹 +14', '体力 +4', '心情 +2', '水分 −3', '解馋 ×2'],
    '每一样变化都记进了流水',
  );
});

test('不是什么都能直接吃；能生吃的只顶七成饱；在外头只吃得到身上带的', () => {
  const g = newGame();
  assert.equal(refused(g, 'eat', { item: 'seed.qingcai' }), '这个不能直接吃');
  assert.equal(refused(g, 'eat', { item: 'rice', at: HOME }), '这个不能直接吃');
  assert.match(refused(g, 'eat', { item: 'herb', at: FIELD.at }), /身上没带香草/);
  must(g, 'eat', { item: 'herb', at: HOME }); // 人在院里，家里存的也够得着
  assert.equal(g.ask('body').hunger, 62);
  assert.equal(stored(g, 'herb'), 0);
  assert.match(refused(g, 'eat', { item: 'herb', at: HOME }), /香草不够了/);
});

test('解馋：接下来几回心情变差时只差一半，用一回少一回', () => {
  const g = newGame();
  must(g, 'eat', { item: 'cake' });
  wait(g, 990); // 熬到 22:30
  const before = g.ask('body').mood;
  must(g, 'sleep');
  const b = g.ask('body');
  assert.equal(b.mood, before - 1, '熬夜本来要掉 2 点');
  assert.equal(b.buff.left, 1);
  assert.ok(whys(g).includes('熬夜，早上没精神（解了馋，没那么烦）'));
});

test('饿着干活更费体力、心情往下掉，空着肚子睡歇不回来；吃了就好', () => {
  const g = newGame();
  assert.deepEqual(cost(g, 'hoe'), { value: 4, parts: [], label: '锄地' });
  wait(g, 1080);
  must(g, 'sleep'); // 睡晚了：体力只回到 80
  wait(g, 216); // 第二天 09:36，饱腹掉到 19
  assert.equal(g.ask('body').hunger, 19);
  assert.deepEqual(cost(g, 'hoe').parts, [{ id: 'vitals.hungry', label: '饿得没劲', delta: 2 }]);
  assert.equal(cost(g, 'hoe').value, 6);
  assert.equal(cost(g, 'seed').value, 2, '轻活每样难处最多加 1 点');
  must(g, 'farm.till', FIELD);
  assert.equal(g.ask('hero').energy, 80 - 6);
  assert.ok(whys(g).includes('锄地（饿得没劲+2）'), '流水里写明多花在哪儿');
  const mood = g.ask('body').mood;
  wait(g, 144); // 过了正午这个时辰
  assert.equal(g.ask('body').mood, mood - 1);
  assert.ok(whys(g).includes('饿得心慌'));
  must(g, 'sleep');
  assert.equal(g.ask('hero').energy, 80, '空着肚子睡的，少歇回 20');
  assert.ok(whys(g).includes('睡了一觉（空着肚子睡的）'));
  assert.equal(
    g.ask('notes', g.ask('clock').day).some(n => n.title === '醒来'),
    true,
  );
  must(g, 'eat', { item: 'cake' });
  must(g, 'eat', { item: 'cake' });
  assert.equal(g.ask('body').hunger, 10 + 28);
  assert.deepEqual(cost(g, 'hoe').parts, []);
});

test('渴了干活也更费体力，渴得厉害心情往下掉；喝了水就好', () => {
  const g = newGame();
  wait(g, 1080);
  must(g, 'sleep');
  wait(g, 1080);
  must(g, 'sleep'); // 第三天清早：两天没喝水
  assert.equal(g.ask('body').thirst, 26);
  assert.ok(cost(g, 'hoe').parts.some(p => p.id === 'thirst' && p.label === '口渴'));
  wait(g, 720); // 到傍晚，水分掉到 12 以下
  assert.ok(g.ask('body').thirst < 12);
  assert.ok(cost(g, 'hoe').parts.some(p => p.id === 'thirst.bad' && p.delta === 2));
  assert.ok(whys(g).includes('渴得心烦'));
  must(g, 'drink', WELL);
  assert.ok(!cost(g, 'hoe').parts.some(p => p.id.startsWith('thirst')));
});

test('水井、水缸、溪边都能喝，喝饱了就喝不下；水田的水不能喝', () => {
  const g = newGame();
  const out = g.dispatch('drink', WELL);
  assert.deepEqual(
    out.facts.map(f => f.type),
    ['water.drunk', 'guide.done'],
  );
  assert.equal(drunk(out).source, 'well');
  assert.match(drunk(out).line, /辘轳/);
  assert.equal(g.ask('body').thirst, 100);
  assert.equal(refused(g, 'drink', WELL), '不渴，喝不下了');
  assert.equal(g.ask('drink.why', WELL.x, WELL.y, WELL.at), '不渴，喝不下了');
  wait(g, 360);
  assert.equal(g.ask('body').thirst, 92);
  assert.equal(refused(g, 'drink', { x: 18, y: 18, at: { x: 12, y: 18 } }), '够不着，走近一点');
  assert.equal(
    refused(g, 'drink', { x: 24, y: 22, at: { x: 23, y: 22, dir: 'right' } }),
    '这儿的水不能喝',
  );
  const creek = g.dispatch('drink', { x: 38, y: 14, at: { x: 37, y: 14, dir: 'right' } });
  assert.equal(drunk(creek).source, 'creek');
  wait(g, 360);
  const vat = g.dispatch('drink', { x: 12, y: 10, at: { x: 12, y: 11, dir: 'up' } });
  assert.equal(drunk(vat).source, 'vat');
});

test('竹筒水壶：在水边喝水时顺手灌满，带在身上随时喝三口', () => {
  let g = newGame();
  assert.equal(refused(g, 'sip'), '身上没带竹筒水壶');
  assert.equal(g.ask('pack').flask, null);
  g = stocked(g, { flask: 1 });
  must(g, 'pack.put', { item: 'flask', at: HOME });
  must(g, 'sleep');
  assert.equal(carried(g, 'flask'), 1);
  assert.deepEqual(g.ask('pack').flask, { left: 0, max: 3 });
  assert.equal(refused(g, 'sip'), '水壶空了，到井边、溪边灌满');
  assert.match(drunk(g.dispatch('drink', WELL)).line, /顺手把竹筒水壶也灌满了/);
  assert.equal(refused(g, 'sip'), '不渴，喝不下了');
  wait(g, 360);
  const before = g.ask('body').thirst;
  assert.equal(drunk(g.dispatch('sip')).source, 'flask');
  assert.equal(g.ask('body').thirst, Math.min(100, before + 25));
  assert.deepEqual(g.ask('pack').flask, { left: 2, max: 3 });
  assert.match(drunk(g.dispatch('drink', WELL)).line, /灌满了/, '不渴也可以只灌水壶');
  assert.equal(g.ask('pack').flask.left, 3);
});

test('行囊：一格放一样，一共 6 格；在自家院里才能和橱柜倒腾东西', () => {
  const g = newGame();
  const p = g.ask('pack');
  assert.deepEqual([p.cap, p.used, p.room, p.atHome], [6, 2, 4, true]);
  assert.deepEqual(must(g, 'pack.put', { item: 'rice', n: 2, at: HOME }), ['pack.changed']);
  assert.deepEqual([carried(g, 'rice'), stored(g, 'rice')], [2, 1]);
  must(g, 'pack.take', { item: 'rice', n: 'all' });
  assert.deepEqual([carried(g, 'rice'), stored(g, 'rice')], [0, 3]);
  assert.equal(
    refused(g, 'pack.put', { item: 'rice', at: FIELD.at }),
    '回到自家院里或小屋才能收拾行囊',
  );
  assert.equal(g.ask('pack', FIELD.at).atHome, false);
  for (const item of ['rice', 'egg', 'potato', 'herb']) must(g, 'pack.put', { item, at: HOME });
  assert.equal(g.ask('pack').room, 0);
  assert.equal(refused(g, 'pack.put', { item: 'bean' }), '行囊满了，先放下一样再装');
  must(g, 'pack.put', { item: 'rice', n: 'all' }); // 已经有的东西还能接着放
  assert.equal(carried(g, 'rice'), 3);
  assert.equal(refused(g, 'pack.put', { item: 'tofu' }), '豆腐不够了');
  assert.equal(refused(g, 'pack.take', { item: 'bean' }), '身上没带豆子');
});

test('行囊一格一格摆出来：顺序是放进去的先后，底栏照这个画', () => {
  const g = newGame();
  must(g, 'pack.put', { item: 'rice', n: 2, at: HOME });
  must(g, 'pack.put', { item: 'egg', at: HOME });
  const slots = g.ask('pack').slots;
  assert.deepEqual(
    slots.map(s => [s.key, s.slot, s.n]),
    [
      ['seed.qingcai', 'item', 12],
      ['cake', 'item', 2],
      ['rice', 'item', 2],
      ['egg', 'item', 1],
    ],
  );
  assert.equal(slots.find(s => s.key === 'cake').eat.full > 0, true, '能直接吃的带着吃法');
  must(g, 'pack.take', { item: 'cake', n: 'all', at: HOME });
  assert.deepEqual(
    g.ask('pack').slots.map(s => s.key),
    ['seed.qingcai', 'rice', 'egg'],
  );
});

test('用东西先用身上的，不够的从家里补；够得着的东西列成一张单子', () => {
  const g = newGame();
  must(g, 'pack.put', { item: 'veg.qingcai', n: 1, at: HOME });
  const veg = g.ask('goods').find(i => i.id === 'veg.qingcai');
  assert.deepEqual([veg.n, veg.carried, veg.gift, veg.eat], [2, 1, true, null]);
  assert.equal(
    g.ask('goods', FIELD.at).find(i => i.id === 'veg.qingcai').n,
    1,
    '出了院子只算身上的',
  );
  assert.equal(
    g.ask('goods', FIELD.at).some(i => i.id === 'rice'),
    false,
  );
  assert.equal(g.ask('goods').find(i => i.id === 'seed.qingcai').gift, false);
});

test('行囊满了收不了菜，有提示；回家放下一样就好了', () => {
  const g = newGame();
  for (const item of ['rice', 'egg', 'potato', 'herb']) must(g, 'pack.put', { item, at: HOME });
  growOne(g);
  assert.equal(refused(g, 'farm.harvest', FIELD), '行囊满了，先回家放一放');
  assert.equal(g.ask('farm.why', 'hand', FIELD.x, FIELD.y, FIELD.at), '行囊满了，先回家放一放');
  must(g, 'pack.take', { item: 'herb', at: HOME });
  must(g, 'farm.harvest', FIELD);
  assert.equal(carried(g, 'veg.qingcai'), 1);
});

test('菜种放在家里，到了地里就够不着', () => {
  const g = newGame();
  must(g, 'pack.take', { item: 'seed.qingcai', n: 'all', at: HOME });
  must(g, 'farm.till', FIELD);
  assert.equal(refused(g, 'farm.sow', FIELD), '菜种在家里的橱柜里，先回去拿上');
  must(g, 'pack.put', { item: 'seed.qingcai', n: 3, at: HOME });
  must(g, 'farm.sow', FIELD);
  assert.deepEqual([carried(g, 'seed.qingcai'), stored(g, 'seed.qingcai')], [2, 9]);
});

test('吃得太饱会撑：干重活更费劲，过一个时辰消一点', () => {
  const g = stocked(newGame(), { cake: 3 });
  must(g, 'pack.put', { item: 'cake', n: 3, at: HOME });
  must(g, 'sleep');
  assert.equal(carried(g, 'cake'), 5);
  for (let i = 0; i < 4; i++) must(g, 'eat', { item: 'cake' });
  assert.deepEqual([g.ask('body').hunger, g.ask('body').stuffedWord], [100, '有点撑']);
  assert.deepEqual(
    cost(g, 'hoe').parts.find(p => p.id === 'stuffed'),
    { id: 'stuffed', label: '吃撑了', delta: 1 },
  );
  must(g, 'eat', { item: 'cake' });
  assert.equal(g.ask('body').stuffed, 2);
  assert.equal(cost(g, 'hoe').parts.find(p => p.id === 'stuffed').delta, 2);
  wait(g, 180);
  assert.equal(g.ask('body').stuffed, 1);
  assert.ok(whys(g).includes('消了点食'));
});

test('天黑以后早早睡下，醒来心情好；自家人之外的人没有这些数', () => {
  const g = newGame();
  wait(g, 840); // 20:00
  const mood = g.ask('body').mood;
  must(g, 'sleep');
  assert.equal(g.ask('body').mood, mood + 2);
  assert.equal(g.ask('hero').energy, 100);
  assert.deepEqual(Object.keys(g.save().state.world.vitals), ['hero']);
  assert.deepEqual(Object.keys(g.save().state.world.packs), ['hero']);
});
