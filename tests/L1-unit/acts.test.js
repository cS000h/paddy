// L1 做活的动作：每个动作每一帧都画得出来、尺寸对、只用调色板的颜色、确实在动；
// 每件活都写了怎么演，演的每一步都有画好的动作；侧身站位挑得对。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACTS, actFrame, actSheet } from '../../src/art/acts.js';
import { P, SHADOW } from '../../src/art/palette.js';
import { OUTDOOR, HOMEWORK } from '../../src/content/activities.js';
import { SCRIPTS } from '../../src/world/scripts.js';
import { sideSpot, bankSpot } from '../../src/world/logic.js';

import { HAIR, outfitLook } from '../../src/content/wardrobe.js';
import { personFrame } from '../../src/art/people.js';
import { Grid } from '../../src/art/pixel.js';
import { MAPS } from '../../src/content/maps/index.js';
import { sceneryParts, DEPTH } from '../../src/world/depth.js';
const palette = new Set([...Object.values(P), SHADOW]);

test('每个动作每一帧都画得出来：尺寸对、只用调色板的颜色、前后帧有变化、锚点在图里', () => {
  for (const [name, a] of Object.entries(ACTS)) {
    assert.ok(a.frames > 1 && a.fps > 0, name);
    assert.ok(a.ax > 0 && a.ax < a.w && a.ay > 0 && a.ay <= a.h, name + ' 的锚点');
    const seen = new Set();
    for (let f = 0; f < a.frames; f++) {
      const g = actFrame(name, f);
      assert.deepEqual([g.w, g.h], [a.w, a.h], name);
      for (const c of g.data)
        if (c) assert.ok(palette.has(c), `${name} 第 ${f} 帧有调色板外的颜色`);
      seen.add(g.data.join(','));
    }
    assert.ok(seen.size > a.frames / 3, name + ' 几乎不动');
    assert.equal(actFrame(name, 3).data.join(','), actFrame(name, 3).data.join(','), name);
  }
  const sheet = actSheet('chop');
  assert.equal(sheet.grid.w, ACTS.chop.w * ACTS.chop.frames);
  assert.throws(() => actFrame('nap', 0), /没有这个动作/);
});

test('每件活都写了怎么演，演的每一步都有画好的动作', () => {
  const jobs = [...Object.keys(OUTDOOR), ...Object.keys(HOMEWORK)].filter(id => id !== 'fish');
  for (const id of jobs) assert.ok(SCRIPTS[id]?.length, `${id} 没写怎么演`);
  for (const [name, steps] of Object.entries(SCRIPTS))
    for (const step of steps) {
      assert.ok(ACTS[step.act], `${name} 用了没画的动作 ${step.act}`);
      assert.ok(
        !step.around || ['fire', 'steam', 'chips', 'splash', 'drawWater'].includes(step.around),
        name,
      );
    }
  for (const method of ['stew', 'fry', 'roast', 'mix']) assert.ok(SCRIPTS['cook:' + method]);
});

test('侧身站位：东西左右哪边能站、离得近就站哪边，面朝着它；两边都不行就原地', () => {
  const open = (x, y) => x >= 0 && y >= 0 && x < 10 && y < 10;
  const left = sideSpot(open, { x: 1, y: 5 }, { x: 5, y: 5 });
  assert.deepEqual([left.x, left.y, left.face], [4, 5, 'right']);
  const right = sideSpot(open, { x: 9, y: 5 }, { x: 5, y: 5 });
  assert.deepEqual([right.x, right.y, right.face], [6, 5, 'left']);
  const walled = (x, y) => open(x, y) && y !== 5;
  const stay = sideSpot(walled, { x: 3, y: 6 }, { x: 5, y: 5 });
  assert.deepEqual([stay.x, stay.y, stay.face, stay.path.length], [3, 6, 'right', 0]);
});

test('所有地图遵守接地点排序，起手和收势按同一脚底衔接人物原帧', () => {
  for (const map of Object.values(MAPS))
    for (const [kind, x, y] of map.objects) {
      if (kind === 'fishing') {
        const bank = bankSpot(map, { x, y }, { x, y });
        assert(bank && map.ground[bank.water.y][bank.water.x] === 'w', map.id);
      }
      const bottom = (y + 1) * 16;
      const parts = sceneryParts(kind, bottom);
      assert(
        parts.every(p => Number.isFinite(p.depth)),
        map.id + ' ' + kind,
      );
      if (['rug', 'stones', 'trays', 'lotus'].includes(kind)) assert(parts[0].depth < DEPTH.cursor);
      if (kind === 'lotus')
        assert(DEPTH.ripple < parts[0].depth && parts[0].depth < DEPTH.waterInsect);
      if (kind === 'stool') assert(parts[0].depth < bottom - 3);
      if (kind === 'trellis') assert(parts[0].depth < bottom - 3 && parts[1].depth > bottom - 3);
    }
  for (const look of ['hero', 'gui', 'hero/winter/braid/3']) {
    const start = new Grid(40, 40).blit(personFrame(look, 'right', 'stand'), 8, 4);
    assert.deepEqual(actFrame('readyHands', 0, look).data, start.data);
    assert.deepEqual(actFrame('lowerHands', 2, look).data, start.data);
    assert.deepEqual(actFrame('readyHands', 2, look).data, actFrame('lowerHands', 0, look).data);
  }
});

test('发束让出眼周和脸颊：静止、迈步与落手时不与眼睛连成一块', () => {
  for (const style of Object.keys(HAIR))
    for (const dir of ['down', 'right', 'left'])
      for (const pose of ['stand', 'walkA', 'walkB', 'ready', 'strike']) {
        const plain = personFrame('hero', dir, pose);
        const styled = personFrame(outfitLook('hero', 'winter', style), dir, pose);
        const x0 = dir === 'down' ? 4 : dir === 'right' ? 9 : 2;
        const width = dir === 'down' ? 8 : 5;
        const y0 = 11 + Number(pose === 'strike');
        for (let y = y0; y < y0 + 4; y++)
          for (let x = x0; x < x0 + width; x++)
            assert.equal(styled.get(x, y), plain.get(x, y), [style, dir, pose, x, y].join(' '));
      }
});
