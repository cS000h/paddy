// L1 素材：程序画的图是确定的、尺寸对、只用调色板里的颜色，地图用到的物件都有画法。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as art from '../../src/art/index.js';
import { P, SHADOW } from '../../src/art/palette.js';
import { MAPS, GROUND, OBJECTS } from '../../src/content/maps/index.js';
import { PEOPLE, ON_MAP } from '../../src/content/people.js';
import { ITEMS } from '../../src/content/items.js';
import { RECIPES, QUALITY } from '../../src/content/recipes.js';
import { COOKED_ITEMS } from '../../src/art/cooked-food.js';
import { createHash } from 'node:crypto';

const palette = new Set([...Object.values(P), SHADOW]);
const tiles = MAPS.yard.ground.map(row => [...row].map(ch => GROUND[ch].id));

test('每样食材有熟料，每道菜的成品可分，锅中有动作', () => {
  assert.deepEqual(
    [...COOKED_ITEMS].sort(),
    Object.keys(ITEMS)
      .filter(k => ITEMS[k].cook)
      .sort(),
  );
  const plates = new Map();
  for (const [base, method, items, spices = []] of RECIPES) {
    const s = { base, method, items, spices };
    const plate = art.cookingFrame(s, 0, true);
    assert.deepEqual(offPalette(plate), [], base);
    const hash = createHash('sha256').update(plate.bytes()).digest('hex');
    assert.ok(!plates.has(hash), base + ' / ' + plates.get(hash));
    plates.set(hash, base);
    if (method !== 'mix') {
      const grades = Object.keys(QUALITY).map(quality =>
        createHash('sha256')
          .update(art.cookingFrame({ ...s, quality }, 0, true).bytes())
          .digest('hex'),
      );
      assert.equal(new Set(grades).size, grades.length, base + '的各档火候');
    }
    const first = art.cookingFrame(s, 0);
    const moving = art.cookingFrame(s, 4);
    assert.deepEqual([moving.w, moving.h], [64, 50]);
    assert.deepEqual(offPalette(moving), [], base);
    assert.notDeepEqual(first.data, moving.data, base);
  }
});

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

test('物品图标：每样物品都有一张，16×16，只用调色板的颜色，没有两张是一样的', () => {
  assert.deepEqual([...art.ITEM_ICONS].sort(), Object.keys(ITEMS).sort());
  const seen = new Map();
  for (const id of art.ITEM_ICONS) {
    const g = art.itemIcon(id);
    assert.deepEqual([g.w, g.h], [16, 16]);
    assert.ok(g.data.filter(c => c !== 0).length >= 40, `${id} 的图标太空`);
    assert.deepEqual(offPalette(g), [], `${id} 用了调色板以外的颜色`);
    const key = g.data.join(',');
    assert.ok(!seen.has(key), `${id} 和 ${seen.get(key)} 的图标一模一样`);
    seen.set(key, id);
  }
  assert.throws(() => art.itemIcon('nothing'), /没有这样物品的图标/);
});

test('地块和图标：32 张土、4 个作物阶段、5 个图标、草和虫两种记号，都是 16×16', () => {
  const soil = art.soilSet();
  assert.equal(Object.keys(soil).length, 32);
  const small = [...Object.values(soil), ...art.cropFrames(), art.cursor(true), art.cursor(false)];
  for (const name of ['hoe', 'seed', 'can', 'hand', 'coin']) small.push(art.icon(name));
  for (const name of art.PLOT_MARKS) small.push(art.plotMark(name));
  for (const g of small) {
    assert.deepEqual([g.w, g.h], [16, 16]);
    assert.deepEqual(offPalette(g), []);
  }
  assert.notDeepEqual(soil['dry.15'].data, soil['wet.15'].data, '干土和湿土要看得出区别');
  assert.ok(soil['wet.15'].data.includes(P.wet2), '湿土用深泥色');
  assert.ok(!soil['wet.15'].data.includes(P.m2), '草色不能覆盖泥色');
  assert.deepEqual(art.PLOT_MARKS, ['weeds', 'bugs']);
  // 记号留出正中给作物：中间 6×6 一个像素都不画
  for (const name of art.PLOT_MARKS)
    for (let y = 5; y < 11; y++)
      for (let x = 5; x < 11; x++) assert.equal(art.plotMark(name).get(x, y), 0, name);
});

test('四季换色与七种作物都只用调色板，四阶段彼此可分', () => {
  for (const id of ['qingcai', 'chive', 'cucumber', 'longbean', 'pumpkin', 'radish', 'cabbage']) {
    const frames = art.cropSet(id);
    assert.equal(frames.length, 4);
    for (const g of frames) {
      assert.equal(g.w, 16);
      for (let season = 0; season < 4; season++) {
        const colored = art.seasonGrid(g, season);
        for (const c of colored.data) assert.ok(c === 0 || Object.values(P).includes(c));
      }
    }
  }
});

test('小屋与村路的每张地面都能画出来且只用调色板', () => {
  for (const map of Object.values(MAPS)) {
    const tiles = map.ground.map(row => [...row].map(ch => GROUND[ch].id));
    const grid = art.paintGround(tiles, 7);
    assert.equal(grid.w, map.width * 16);
    assert.equal(grid.h, map.height * 16);
    assert.deepEqual(offPalette(grid), [], map.id);
  }
});
