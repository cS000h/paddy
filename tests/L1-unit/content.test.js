// L1 内容完整性：数据之间互相指得上。数据写错在这里就会报，不用等到游戏里才发现。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAPS,
  GROUND,
  OBJECTS,
  START_MAP,
  walkable,
  farmable,
  spot,
  actAt,
} from '../../src/content/maps/index.js';
import {
  PEOPLE,
  ON_MAP,
  SCHEDULES,
  LINES,
  RETURN_GIFT,
  scheduleAt,
} from '../../src/content/people.js';
import { CROPS, ITEMS, TOOLS, cropStage, isRipe } from '../../src/content/items.js';
import { CALENDAR, dateOf, timeOf } from '../../src/content/calendar.js';

test('地图：每行一样宽，只用登记过的地面和物件', () => {
  for (const map of Object.values(MAPS)) {
    assert.equal(map.ground.length, map.height);
    for (const row of map.ground) {
      assert.equal(row.length, map.width);
      for (const ch of row) assert.ok(GROUND[ch], `没登记的地面字符 ${ch}`);
    }
    for (const [kind] of map.objects) assert.ok(OBJECTS[kind], `没登记的物件 ${kind}`);
  }
});

test('地图：有名字的位置都站得了人，开局位置在起始地图上', () => {
  for (const map of Object.values(MAPS))
    for (const name of Object.keys(map.spots)) {
      const s = spot(map, name);
      assert.ok(walkable(map, s.x, s.y), `${map.id} 的位置 ${name} (${s.x},${s.y}) 站不了人`);
    }
  assert.ok(MAPS[START_MAP].spots.start);
});

test('地图：菜地里有能锄的格子，可互动的物件旁边至少有一格能站', () => {
  const map = MAPS.yard;
  let plots = 0;
  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < map.width; x++) if (farmable(map, x, y)) plots++;
  assert.ok(plots >= 40, `能锄的格子只有 ${plots} 个`);
  for (const [kind, x, y] of map.objects) {
    if (!OBJECTS[kind].act) continue;
    assert.ok(actAt(map, x, y));
    const around = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ].some(([dx, dy]) => walkable(map, x + dx, y + dy));
    assert.ok(around, `${kind} (${x},${y}) 四周没有能站的格子`);
  }
});

test('人物：地图上的人都有作息、台词和回礼，作息指向存在的位置', () => {
  for (const id of ON_MAP) {
    assert.ok(PEOPLE[id]?.look, `${id} 没有外观`);
    assert.ok(LINES[id]?.first && LINES[id].daily.length >= 2 && LINES[id].gift, `${id} 台词不全`);
    assert.ok(ITEMS[RETURN_GIFT[id].item], `${id} 的回礼不是登记过的物品`);
    for (const entry of SCHEDULES[id])
      assert.ok(MAPS.yard.spots[entry.spot], `${id} 的作息指向不存在的位置 ${entry.spot}`);
    assert.equal(scheduleAt(id, 0), SCHEDULES[id][0]);
    assert.equal(scheduleAt(id, 23 * 60), SCHEDULES[id].at(-1));
  }
});

test('作物和物品：种子、作物、收成互相指得上', () => {
  for (const crop of Object.values(CROPS)) {
    assert.equal(ITEMS[crop.seed].crop, crop.id);
    assert.equal(ITEMS[crop.produce].kind, 'produce');
    assert.equal(cropStage(crop.id, 0), 0);
    assert.equal(cropStage(crop.id, crop.days), crop.stages - 1);
    assert.ok(cropStage(crop.id, crop.days - 1) < crop.stages - 1, '没成熟不能显示成熟的样子');
    assert.equal(isRipe(crop.id, crop.days - 1), false);
  }
  assert.deepEqual(
    TOOLS.map(t => t.id),
    ['hoe', 'seed', 'can', 'hand'],
  );
});

test('日历：日期和钟点的换算', () => {
  assert.deepEqual(dateOf(1), { year: 1, season: 0, seasonName: '春', dayOfSeason: 1 });
  assert.equal(dateOf(CALENDAR.seasonDays + 1).seasonName, '夏');
  assert.equal(dateOf(CALENDAR.seasonDays * 4 + 1).year, 2);
  assert.deepEqual(timeOf(6 * 60), { clock: '06:00', hour: '卯时', period: '清晨' });
  assert.equal(timeOf(12 * 60).hour, '午时');
  assert.equal(timeOf(24 * 60).period, '夜深');
});
