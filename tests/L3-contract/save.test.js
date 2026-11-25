// L3 存档契约：存了能读，读了能接着玩；每个存档版本留一份样本，保证旧档一直读得了。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { MAPS as MAPS_FOR_GROUND } from '../../src/content/maps/index.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createGame } from '../../src/port/game.js';
import { SAVE_FORMAT } from '../../src/port/save.js';
import { SAVE_VERSION } from '../../src/sim/index.js';
import { newGame, must, growOne, carried, FIELD } from '../helpers.js';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');

test('存档经过一次 JSON 往返，读回来和原来一模一样，还能接着玩', () => {
  const g = newGame(3);
  growOne(g);
  must(g, 'talk', { to: 'shi' });
  const text = JSON.stringify(g.save());
  const back = createGame({ saved: JSON.parse(text), debug: true });
  assert.equal(JSON.stringify(back.save()), text);
  assert.equal(back.revision(), g.revision());
  must(back, 'farm.harvest', FIELD);
  assert.equal(carried(back, 'veg.qingcai'), 1);
});

test('认不出来的存档会被拒绝，不会悄悄开新档', () => {
  assert.throws(() => createGame({ saved: { hello: 1 } }), /这不是《稻》的存档/);
  assert.throws(
    () => createGame({ saved: { format: SAVE_FORMAT, version: SAVE_VERSION + 1, state: {} } }),
    /认不出来/,
  );
  const broken = JSON.parse(JSON.stringify(newGame().save()));
  broken.state.world.clock.day = -5;
  assert.throws(() => createGame({ saved: broken }), /存档无法通过检查：clock: day/);
});

test('每个存档版本都有样本，样本都能升到当前版本并继续玩', () => {
  const files = readdirSync(fixtures).filter(f => /^save-v\d+\.json$/.test(f));
  const versions = files.map(f => Number(f.match(/\d+/)[0])).sort((a, b) => a - b);
  assert.deepEqual(
    versions,
    Array.from({ length: SAVE_VERSION }, (_, i) => i + 1),
    '每个版本各要一份 tests/fixtures/save-vN.json',
  );
  for (const file of files) {
    const g = createGame({
      saved: JSON.parse(readFileSync(path.join(fixtures, file), 'utf8')),
      debug: true,
    });
    assert.equal(g.save().version, SAVE_VERSION);
    must(g, 'sleep');
    assert.ok(g.ask('clock').day >= 2);
  }
});

test('第4日的初版存档升级后仍停在第4日，钱、种下的菜和乡邻熟悉度不被重开', () => {
  const old = JSON.parse(readFileSync(path.join(fixtures, 'save-v1.json'), 'utf8'));
  old.state.world.clock.day = 4;
  const before = JSON.stringify(old);
  const g = createGame({ saved: old, debug: true });
  assert.equal(g.ask('clock').day, 4);
  for (const [id, h] of Object.entries(old.state.world.households)) {
    const now = g.save().state.world.households[id];
    assert.equal(now.coins, h.coins);
    assert.equal(now.can, h.can);
    assert.deepEqual(now.members, h.members);
    for (const [item, n] of Object.entries(h.items)) {
      const carried = h.members.reduce(
        (sum, who) => sum + (g.save().state.world.packs[who].items[item] || 0),
        0,
      );
      assert.ok((now.items[item] || 0) + carried >= n, '原有物品保留，种子迁到行囊');
    }
  }
  for (const [id, value] of Object.entries(old.state.world.bonds.known))
    assert.equal(g.save().state.world.bonds.known[id], value);
  assert.equal(
    Object.keys(g.save().state.world.land.yard.plots).length,
    Object.keys(old.state.world.land.yard.plots).length,
  );
  assert.equal(JSON.stringify(old), before, '迁移不改调用者持有的原档');
});

test('衣镜只换得上衣箱里有的，拒绝无效选项，读档保留人物外观', () => {
  const g = newGame();
  const wear = { coat: 'field', hair: 'loose', at: { x: 8, y: 5 } };
  assert.equal(g.dispatch('wardrobe.wear', wear).ok, false);
  must(g, 'travel.to', { to: 'cottage' });
  must(g, 'wardrobe.wear', wear);
  const saved = JSON.stringify(g.save());
  assert.equal(g.dispatch('wardrobe.wear', { ...wear, hair: '未知' }).ok, false);
  assert.equal(g.dispatch('wardrobe.wear', { ...wear, coat: 'winter' }).ok, false);
  assert.equal(JSON.stringify(g.save()), saved);
  const back = createGame({ saved: JSON.parse(saved) });
  assert.equal(back.ask('hero').look, 'hero/field/loose/3');
  must(back, 'wardrobe.wear', { ...wear, coat: 'plain' });
  assert.equal(back.ask('hero').look, 'hero/plain/loose/3');
});

test('衣装拆成插件以前的旧档：身上穿的进了衣箱，样子不变，没穿过的照旧要买要找', () => {
  const old = JSON.parse(readFileSync(path.join(fixtures, 'save-v13.json'), 'utf8'));
  Object.assign(old.state.world.people.hero, { coat: 'winter', hair: 'braid' });
  const g = createGame({ saved: old });
  assert.equal(g.ask('hero').look, 'hero/winter/braid/3');
  const box = g.ask('wardrobe');
  assert.equal(box.coat.find(p => p.id === 'winter').owned, true);
  assert.equal(box.hair.find(p => p.id === 'braid').owned, true);
  assert.equal(box.coat.find(p => p.id === 'hoodie').owned, false);
});

test('v16 升级：村民之间开局的几条交情记进好感，主角这边从这一版起记', () => {
  const saved = JSON.parse(
    readFileSync(new URL('../fixtures/save-v16.json', import.meta.url), 'utf8'),
  );
  const g = createGame({ saved, debug: true });
  const notes = g.save().state.world.opinion.notes;
  assert.equal(notes.length, 5);
  assert.ok(notes.every(x => x.until === null && x.to !== 'hero'));
  assert.equal(g.ask('opinion', 'gui', 'qiao').value, 28);
  assert.deepEqual(
    g
      .ask('opinion', 'zhou', 'aman')
      .parts.map(p => p.label)
      .sort(),
    ['天天吃他送的菜', '莫名别扭'].sort(),
  );
});

test('v21 升级：地上冒野货从零起，翻找里留的空位去掉', () => {
  const saved = JSON.parse(
    readFileSync(new URL('../fixtures/save-v21.json', import.meta.url), 'utf8'),
  );
  const g = createGame({ saved, debug: true });
  const w = g.save().state.world;
  assert.deepEqual(Object.keys(w.ground).sort(), Object.keys(w.packs).sort());
  for (const x of Object.values(w.ground)) assert.deepEqual(x, { items: [] });
  for (const s of Object.values(w.search)) assert.equal(Object.hasOwn(s, 'ground'), false);
  g.dispatch('sleep', {});
  assert.ok(Object.keys(MAPS_FOR_GROUND).some(m => g.ask('ground', m).length));
});

test('v20 升级：图鉴照已有的钓鱼记录、翻到过的、出过极品的补上，日子不知道的记成那天', () => {
  const saved = JSON.parse(
    readFileSync(new URL('../fixtures/save-v20.json', import.meta.url), 'utf8'),
  );
  const w0 = saved.state.world;
  w0.fishing.hero.records = { crucian: { n: 3, best: 8 } };
  w0.search.hero.found = { moss: 2 };
  const g = createGame({ saved, debug: true });
  const w = g.save().state.world;
  assert.deepEqual(Object.keys(w.catalog).sort(), Object.keys(w.packs).sort());
  const items = w.catalog.hero.items;
  assert.deepEqual(items['fish.crucian'], { n: 3, day: w0.clock.day });
  assert.deepEqual(items.moss, { n: 1, day: 2 });
  assert.equal(items['veg.qingcai'].fine, true);
  assert.deepEqual(Object.keys(items).sort(), ['fish.crucian', 'moss', 'veg.qingcai']);
  assert.equal(g.ask('catalog')[0].entries.find(e => e.item === 'fish.crucian').bestText, '八寸');
});

test('v18 升级：旧的钓鱼（下竿时抽好的运气、今天钓过几竿）去掉，钓鱼记录从零记起', () => {
  const saved = JSON.parse(
    readFileSync(new URL('../fixtures/save-v18.json', import.meta.url), 'utf8'),
  );
  for (const o of Object.values(saved.state.world.outings)) {
    o.fish = { roll: 0.5, day: 1 };
    o.counts.fish = 2;
  }
  const g = createGame({ saved, debug: true });
  const w = g.save().state.world;
  assert.deepEqual(Object.keys(w.fishing).sort(), Object.keys(w.packs).sort());
  for (const f of Object.values(w.fishing))
    assert.deepEqual(f, { bout: null, records: {}, spots: {} });
  for (const o of Object.values(w.outings)) {
    assert.equal(Object.hasOwn(o, 'fish'), false);
    assert.equal(Object.hasOwn(o.counts, 'fish'), false);
  }
  assert.equal(g.ask('fishing').bout, null);
});

test('v17 升级：收成出彩从零记起，以前收的菜都算寻常的', () => {
  const saved = JSON.parse(
    readFileSync(new URL('../fixtures/save-v17.json', import.meta.url), 'utf8'),
  );
  const w = createGame({ saved, debug: true }).save().state.world;
  assert.deepEqual(Object.keys(w.quality).sort(), Object.keys(w.packs).sort());
  for (const q of Object.values(w.quality)) assert.deepEqual(q, { miss: {}, found: {} });
});

test('v15 升级：开局两选的旧特质换成性情和出身线，历练留在成长里，村民有了档案', () => {
  const saved = JSON.parse(
    readFileSync(new URL('../fixtures/save-v15.json', import.meta.url), 'utf8'),
  );
  const hero = saved.state.world.growth.hero;
  hero.origin = { route: 'later', reply: 'ask' };
  hero.traits = ['earlybird', 'slowwarm', 'curious'];
  hero.xp.sky = 10;
  const g = createGame({ saved, debug: true });
  const world = g.save().state.world;
  assert.deepEqual(world.growth.hero.traits, ['earlybird']);
  assert.deepEqual(world.persona.hero.tempers, ['calm']);
  assert.deepEqual(world.persona.hero.line, { id: 'scholar', lv: 2 });
  const p = g.ask('persona');
  assert.deepEqual(
    p.tempers.map(t => [t.name, t.oppositeName]),
    [['沉稳', '急躁']],
  );
  assert.equal(p.line.title, '识字书生');
  const traits = g
    .ask('growth')
    .traits.filter(t => t.owned)
    .map(t => t.id)
    .sort();
  assert.deepEqual(traits, ['curious', 'earlybird', 'slowwarm']);
  assert.deepEqual(world.persona.yun.tempers, ['diligent', 'shy', 'paranoid']);
});

test('v14 升级保留筐中的货和订单，从下一次清晨才记收据', () => {
  const saved = JSON.parse(
    readFileSync(new URL('../fixtures/save-v14.json', import.meta.url), 'utf8'),
  );
  const g = createGame({ saved, debug: true });
  assert.deepEqual(g.save().state.world.basket, { ...saved.state.world.basket, receipt: null });
});
