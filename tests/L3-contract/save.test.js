// L3 存档契约：存了能读，读了能接着玩；每个存档版本留一份样本，保证旧档一直读得了。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
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

test('v14 升级保留筐中的货和订单，从下一次清晨才记收据', () => {
  const saved = JSON.parse(
    readFileSync(new URL('../fixtures/save-v14.json', import.meta.url), 'utf8'),
  );
  const g = createGame({ saved, debug: true });
  assert.deepEqual(g.save().state.world.basket, { ...saved.state.world.basket, receipt: null });
});
