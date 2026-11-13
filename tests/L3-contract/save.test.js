// L3 存档契约：存了能读，读了能接着玩；每个存档版本留一份样本，保证旧档一直读得了。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createGame } from '../../src/port/game.js';
import { SAVE_FORMAT } from '../../src/port/save.js';
import { SAVE_VERSION } from '../../src/sim/index.js';
import { newGame, must, growOne, FIELD } from '../helpers.js';

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
  assert.equal(back.ask('home').items.find(i => i.id === 'veg.qingcai').n, 1);
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
