// L4 回放：让一个“乱玩的玩家”按固定种子玩很多步。
//  1. 不管怎么乱玩，规则都不会抛错，世界始终通过校验（校验由内核在每条命令后做）。
//  2. 同一个种子玩两遍，结果逐字节相同（规则是确定的，所以存档可回放、问题可复现）。
//  3. 基线：固定种子的最终世界有一个指纹。规则的行为变了，指纹就变——
//     如果是有意改的，把新指纹写回 GOLDEN；如果不是，就是改坏了。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/port/game.js';

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const fingerprint = text => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16).padStart(8, '0');
};

/** 乱玩 steps 步。返回最终存档的文字和各种命令成功、被拒绝的次数。 */
export function randomPlay(seed, steps) {
  const game = createGame({ seed, debug: true });
  const r = rng(seed ^ 0x9e3779b9);
  const pick = list => list[Math.floor(r() * list.length)];
  const tally = {};
  const moves = [
    () => {
      const x = 6 + Math.floor(r() * 5);
      const y = 19 + Math.floor(r() * 3);
      return [
        pick(['farm.till', 'farm.sow', 'farm.water', 'farm.water', 'farm.harvest']),
        { x, y, at: { x, y: y - 1, dir: 'down' } },
      ];
    },
    () => ['farm.refill', { x: 18, y: 18, at: { x: 17, y: 18, dir: 'right' } }],
    () => ['talk', { to: pick(['shi', 'gui']) }],
    () => ['gift', { to: pick(['shi', 'gui']), item: 'veg.qingcai' }],
    () => ['basket.put', { item: 'veg.qingcai', n: 1 }],
    () => ['basket.order', { item: 'seed.qingcai', n: 1 + Math.floor(r() * 3) }],
    () => ['clock.advance', { minutes: 10 * (1 + Math.floor(r() * 6)) }],
    () => ['sleep', {}],
    () => ['person.place', { x: 8, y: 11, dir: pick(['up', 'down', 'left', 'right']) }],
  ];
  const weights = [14, 2, 2, 1, 1, 1, 3, 1, 1];
  const total = weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < steps; i++) {
    let roll = r() * total;
    const index = weights.findIndex(w => (roll -= w) < 0);
    const [type, input] = moves[index]();
    const out = game.dispatch(type, input);
    const slot = (tally[type] ||= { ok: 0, no: 0 });
    out.ok ? slot.ok++ : slot.no++;
  }
  return { text: JSON.stringify(game.save()), tally, game };
}

const GOLDEN = { seed: 20261113, steps: 600, fingerprint: 'a8c47fbf' }; // M7：乡邻的心情、话题和送礼

test('乱玩 12 局、每局 400 步：每种命令都真的成功过，世界始终合法', () => {
  const seen = {};
  for (let seed = 1; seed <= 12; seed++) {
    const { tally, game } = randomPlay(seed, 400);
    for (const [type, t] of Object.entries(tally)) seen[type] = (seen[type] || 0) + t.ok;
    const hero = game.ask('hero');
    assert.ok(hero.energy >= 0 && hero.energy <= hero.energyMax);
    assert.ok(game.ask('home').coins >= 0);
  }
  for (const type of [
    'farm.till',
    'farm.sow',
    'farm.water',
    'farm.harvest',
    'farm.refill',
    'talk',
    'gift',
    'basket.put',
    'basket.order',
    'sleep',
  ])
    assert.ok(seen[type] > 0, `乱玩里 ${type} 一次都没成功，这条规则等于没测到`);
});

test('同一个种子玩两遍，结果逐字节相同', () => {
  assert.equal(randomPlay(77, 500).text, randomPlay(77, 500).text);
  assert.notEqual(randomPlay(77, 500).text, randomPlay(78, 500).text);
});

test('基线：固定种子的最终世界指纹不变', () => {
  const actual = fingerprint(randomPlay(GOLDEN.seed, GOLDEN.steps).text);
  assert.equal(
    actual,
    GOLDEN.fingerprint,
    `规则行为变了。若是有意修改，把 GOLDEN.fingerprint 改成 '${actual}'`,
  );
});
