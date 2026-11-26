import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, must, refused, settle, FIELD, wait } from '../helpers.js';
import { createGame } from '../../src/port/game.js';
const skill = (g, id) => g.ask('growth').skills.find(s => s.id === id);
const traits = g =>
  g
    .ask('growth')
    .traits.filter(t => t.owned)
    .map(t => t.id);
test('落脚单只填一次：性情一个随家里来、一个自己挑，旧物定出身线，旧交情记进好感，缘由带来钱和东西', () => {
  const g = newGame();
  const sheet = { reason: 'rest', keepsake: 'poems', family: 'toil', own: 'shy', friend: 'yun' };
  assert.match(refused(g, 'origin.settle', { ...sheet, own: 'lazy' }), /合不到一个人身上/);
  assert.match(refused(g, 'origin.settle', { ...sheet, friend: 'shi' }), /旧交情是定下的/);
  assert.match(refused(g, 'origin.settle', { ...sheet, keepsake: 'hoe' }), /没填齐/);
  const coins = g.ask('home').coins;
  const herb = g.ask('home').items.find(i => i.id === 'herb').n;
  const facts = settle(g, sheet);
  assert.ok(facts.includes('origin.settled'));
  const me = g.ask('persona');
  assert.deepEqual(
    me.tempers.map(t => t.id),
    ['diligent', 'shy'],
  );
  assert.deepEqual([me.line.id, me.line.lv], ['scholar', 1]);
  // 勤勉、怕生、耕读传家原来挂着的好处照旧（自己动手、独行、好问）
  assert.deepEqual(traits(g).sort(), ['curious', 'handy', 'solitary']);
  assert.equal(g.ask('home').coins, coins);
  assert.equal(g.ask('home').items.find(i => i.id === 'herb').n, herb + 2);
  const tie = g.ask('opinion', 'yun').parts.find(p => p.id === 'why.oldtie');
  assert.equal(tie?.delta, 12);
  assert.deepEqual(g.ask('growth').origin, sheet);
  const before = g.save();
  assert.match(refused(g, 'origin.settle', sheet), /已经落过脚/);
  assert.deepEqual(g.save(), before);
  // 缘由带来的钱：盘缠多十六文；逃难的手头紧，钱不够扣也不拒绝
  const town = newGame();
  const was = town.ask('home').coins;
  settle(town, { reason: 'town' });
  assert.equal(town.ask('home').coins, was + 16);
  const flood = newGame();
  settle(flood, { reason: 'flood' });
  assert.equal(flood.ask('home').coins, Math.max(0, was - 16));
});
test('农事逐级省力，清晨做六次得早起；拒绝的动作不加经验', () => {
  const g = newGame();
  for (let x = 6; x < 12; x++) must(g, 'farm.till', { x, y: 19, at: { x, y: 18 } });
  assert.ok(skill(g, 'farm').level >= 2);
  assert.ok(traits(g).includes('earlybird'));
  const q = g.ask('action.cost', 'hoe');
  assert.ok(q.parts.some(p => p.id === 'skill.farm'));
  assert.ok(q.parts.some(p => p.id === 'trait.earlybird'));
  const xp = skill(g, 'farm').xp;
  assert.equal(g.dispatch('farm.till', FIELD).ok, false);
  assert.equal(skill(g, 'farm').xp, xp);
  const before = g.ask('hero').energy;
  must(g, 'farm.till', { x: 12, y: 19, at: { x: 12, y: 18 } });
  assert.equal(before - g.ask('hero').energy, q.value);
});
test('熟悉度与厨艺做出特质；获得后预览与出锅仍一致', () => {
  const g = newGame();
  settle(g, { family: 'enough', own: 'gregarious' });
  for (let i = 0; i < 5; i++) {
    must(g, 'talk', { to: 'shi' });
    must(g, 'talk', { to: 'gui' });
    must(g, 'sleep');
  }
  assert.ok(traits(g).includes('familiar'));
  const before = skill(g, 'social').xp;
  must(g, 'talk', { to: 'shi' });
  const once = skill(g, 'social').xp;
  must(g, 'talk', { to: 'shi' });
  assert.ok(once > before);
  assert.equal(skill(g, 'social').xp, once);
  const at = { x: 10, y: 11 };
  for (const items of [
    ['rice', 'egg'],
    ['rice', 'potato'],
    ['rice', 'bean'],
    ['egg', 'potato'],
  ])
    must(g, 'cook', { items, method: 'stew', at });
  assert.ok(traits(g).includes('hearth'));
  assert.equal(
    g.ask('cook.preview', { items: ['rice', 'egg', 'herb'], method: 'stew' }).servings,
    3,
  );
});
test('成就按事实计数，只落印一次；存取后进度和特质不丢', () => {
  const g = newGame(),
    seen = [];
  g.on('achievement.earned', e => seen.push(e.data.id));
  assert.equal(g.ask('achievements').length, 48);
  must(g, 'farm.till', FIELD);
  assert.ok(seen.includes('soil1'));
  assert.equal(g.ask('achievements').find(a => a.id === 'soil1').day, 1);
  g.dispatch('farm.till', FIELD);
  must(g, 'farm.till', { x: 7, y: 19, at: { x: 7, y: 18 } });
  assert.equal(seen.filter(id => id === 'soil1').length, 1);
  const back = createGame({ saved: JSON.parse(JSON.stringify(g.save())), debug: true });
  assert.deepEqual(back.ask('growth'), g.ask('growth'));
  assert.deepEqual(back.ask('achievements'), g.ask('achievements'));
});
test('慢热歇息的加成、好问看天的经验、独行采集额外经验', () => {
  const g = newGame();
  settle(g, { family: 'boat', own: 'brave', keepsake: 'poems' });
  must(g, 'farm.till', FIELD);
  // 先多干些活，让额外恢复不被100上限吞掉。
  for (let x = 7; x < 12; x++) must(g, 'farm.till', { x, y: 19, at: { x, y: 18 } });
  const e = g.ask('hero').energy;
  must(g, 'homestead', { id: 'rest', at: { x: 5, y: 13 } });
  assert.equal(g.ask('hero').energy, Math.min(100, e + 20));
  wait(g, 600);
  must(g, 'homestead', { id: 'stars', at: { x: 5, y: 13 } });
  assert.ok(skill(g, 'sky').xp >= 2);
  const solo = newGame();
  settle(solo, { family: 'boat', own: 'shy' });
  must(solo, 'gather', { id: 'forage', at: { x: 35, y: 17 } });
  assert.equal(skill(solo, 'forage').xp, 3);
});

test('人物档案：落脚单给两个性情和出身线、第三个空着；村民照定下的；过客按编号推、再查一样；对口本事升级出身线跟着升', () => {
  const g = newGame();
  assert.deepEqual(g.ask('persona').tempers, []);
  settle(g, { family: 'boat', own: 'shy' });
  const me = g.ask('persona');
  assert.deepEqual(
    me.tempers.map(t => t.id),
    ['calm', 'shy'],
  );
  assert.deepEqual([me.line.id, me.line.lv, me.line.title], ['farmer', 1, '笨手庄户']);
  assert.ok(traits(g).includes('slowwarm') && traits(g).includes('solitary'));
  // 村民和过客的性情照定下的或按编号推，只是还不认识，一个也看不出（下一条测试）
  assert.deepEqual([g.ask('persona', 'shi').tempers, g.ask('persona', 'shi').unseen], [[], 3]);
  const v = g.ask('visitors').active[0];
  const vp = g.ask('persona', v.id);
  assert.equal(vp.unseen, 3);
  assert.deepEqual(g.ask('persona', v.id), vp);
  for (let x = 6; x < 12; x++) must(g, 'farm.till', { x, y: 19, at: { x, y: 18 } });
  assert.ok(skill(g, 'farm').level >= 2);
  assert.equal(g.ask('persona').line.lv, 2);
});

test('别人的档案只给看你知道的：熟一层看出一个性情，熟络看出根骨，心烦只看自己的；六项明细不漏', () => {
  const g = newGame();
  const shi = () => g.ask('persona', 'shi');
  const chijia = () => shi().attrs.find(a => a.id === 'chijia');
  assert.deepEqual([shi().tempers, shi().unseen, shi().innate, shi().stress], [[], 3, null, null]);
  assert.equal(chijia().value, 13, '数照给');
  assert.deepEqual(
    chijia().parts.map(p => [p.label, p.delta]),
    [
      ['底子', 4],
      ['农桑庄户三级', 6],
      ['还看不出的', 3],
    ],
    '明细里没看出来的性情并成一条',
  );
  const names = () => shi().tempers.map(t => t.name);
  const seen = [];
  for (let day = 0; day < 6; day++) {
    must(g, 'talk', { to: 'shi' });
    seen.push(names().join('、'));
    must(g, 'sleep');
  }
  // 熟悉 1 点头之交，3 熟络，6 亲近
  assert.deepEqual(seen, [
    '勤勉',
    '勤勉',
    '勤勉、厚道',
    '勤勉、厚道',
    '勤勉、厚道',
    '勤勉、厚道、抠门',
  ]);
  assert.deepEqual([shi().unseen, shi().innate, shi().stress], [0, [], null]);
  assert.ok(chijia().parts.every(p => p.id !== 'unseen'));
  assert.equal(g.ask('persona').stress, 0, '自己的心烦看得见');
});
