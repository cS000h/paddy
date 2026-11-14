// L1 素材：程序画的图是确定的、尺寸对、只用调色板里的颜色，地图用到的物件都有画法。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as art from '../../src/art/index.js';
import { P, SHADOW } from '../../src/art/palette.js';
import { MAPS, GROUND, OBJECTS } from '../../src/content/maps/index.js';
import { PEOPLE, ON_MAP } from '../../src/content/people.js';

const palette = new Set([...Object.values(P), SHADOW]);
const tiles = MAPS.yard.ground.map(row => [...row].map(ch => GROUND[ch].id));

function offPalette(grid) {
  const strays = new Set();
  for (const c of grid.data) if (c !== 0 && !palette.has(c)) strays.add(c.toString(16));
  return [...strays];
}

test('同一个种子画出来的图一模一样（存档里不用存图，换台机器看到的也一样）', () => {
  assert.deepEqual(art.paintGround(tiles, 7).data, art.paintGround(tiles, 7).data);
  assert.notDeepEqual(art.paintGround(tiles, 7).data, art.paintGround(tiles, 8).data);
  for (const kind of ['tree.broad', 'haystack', 'rock'])
    assert.deepEqual(art.objectSprite(kind, 2).grid.data, art.objectSprite(kind, 2).grid.data);
});

test('地面：大小是格子数乘 16，每个像素都画到了', () => {
  const g = art.paintGround(tiles, 7);
  assert.deepEqual([g.w, g.h], [MAPS.yard.width * 16, MAPS.yard.height * 16]);
  assert.ok(g.data.every(c => c !== 0));
  assert.deepEqual(offPalette(g), []);
});

test('物件：规则里登记的每一种都有画法，锚点在图的范围附近，只用调色板的颜色', () => {
  assert.deepEqual([...art.OBJECT_KINDS].sort(), Object.keys(OBJECTS).sort());
  for (const kind of art.OBJECT_KINDS)
    for (let variant = 0; variant < 4; variant++) {
      const s = art.objectSprite(kind, variant);
      assert.ok(
        s.grid.data.some(c => c !== 0),
        `${kind} 是空的`,
      );
      assert.ok(
        s.ax >= 0 && s.ax <= s.grid.w && s.ay >= s.grid.h * 0.5 && s.ay <= s.grid.h + 60,
        `${kind} 的锚点不对`,
      );
      assert.deepEqual(offPalette(s.grid), [], `${kind} 用了调色板以外的颜色`);
    }
});

test('人物：地图上的人都有外观；每张图 6 列 4 行，每帧都有内容，朝左是朝右的镜像', () => {
  for (const id of ['hero', ...ON_MAP]) assert.ok(art.LOOK_NAMES.includes(PEOPLE[id].look));
  for (const look of art.LOOK_NAMES) {
    const sheet = art.personSheet(look);
    assert.deepEqual([sheet.w, sheet.h], [art.FRAME_W * 6, art.FRAME_H * 4]);
    assert.deepEqual(offPalette(sheet), []);
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 6; col++) {
        let filled = 0;
        for (let y = 0; y < art.FRAME_H; y++)
          for (let x = 0; x < art.FRAME_W; x++)
            if (sheet.get(col * art.FRAME_W + x, row * art.FRAME_H + y)) filled++;
        assert.ok(filled > 120, `${look} 第 ${row} 行第 ${col} 帧太空`);
      }
    for (let y = 0; y < art.FRAME_H; y++)
      for (let x = 0; x < art.FRAME_W; x++)
        assert.equal(
          sheet.get(x, art.FRAME_H + y),
          sheet.get(art.FRAME_W - 1 - x, art.FRAME_H * 2 + y),
        );
  }
});

test('地块和图标：32 张土、4 个作物阶段、5 个图标，都是 16×16', () => {
  const soil = art.soilSet();
  assert.equal(Object.keys(soil).length, 32);
  const small = [...Object.values(soil), ...art.cropFrames(), art.cursor(true), art.cursor(false)];
  for (const name of ['hoe', 'seed', 'can', 'hand', 'coin']) small.push(art.icon(name));
  for (const g of small) {
    assert.deepEqual([g.w, g.h], [16, 16]);
    assert.deepEqual(offPalette(g), []);
  }
  assert.notDeepEqual(soil['dry.15'].data, soil['wet.15'].data, '干土和湿土要看得出区别');
});
