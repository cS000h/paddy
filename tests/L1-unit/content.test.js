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
  isHome,
  drinkSource,
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
import {
  START_STORE,
  START_PACK,
  BASKET_WARES,
  eatenAs,
  giftable,
  basketTakes,
  seasonal,
  inSeason,
} from '../../src/content/pantry.js';
import { ACTIONS } from '../../src/content/actions.js';
import { BODY, BUFFS, DRINKS, buffUses, moodWord, thirstWord } from '../../src/content/body.js';
import { FESTIVE } from '../../src/content/people.js';

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
    assert.ok(ITEMS[crop.produce].cook && ITEMS[crop.produce].sell > 0, '收成能下锅、能卖');
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

test('物品总表：每样东西字段齐全，买卖价按基准价折算，开局的东西和能托捎的货都登记过', () => {
  assert.equal(Object.keys(ITEMS).length, 63);
  const KINDS = ['food', 'whole', 'spice', 'snack', 'seed', 'material', 'craft', 'tool'];
  for (const [id, item] of Object.entries(ITEMS)) {
    assert.equal(item.id, id);
    assert.ok(item.name && KINDS.includes(item.kind), `${id} 的名字或种类不对`);
    assert.ok(item.buy === 0 || item.buy >= item.sell, `${id} 买进不能比卖出便宜`);
    assert.ok(Array.isArray(item.tags) && [1, 2].includes(item.size));
    if (item.cook) assert.ok(['cool', 'neutral', 'warm'].includes(item.nature), `${id} 缺性味`);
    if (item.snack) assert.ok(!item.snack.buff || BUFFS[item.snack.buff], `${id} 的增益没登记`);
    if (item.kind === 'seed') assert.equal(item.sell, 0);
  }
  assert.deepEqual([ITEMS['veg.qingcai'].sell, ITEMS['seed.qingcai'].buy], [6, 2]);
  assert.deepEqual([ITEMS.rice.buy, ITEMS.rice.sell, ITEMS.fish.buy], [8, 6, 0]);
  for (const id of [...Object.keys(START_STORE), ...Object.keys(START_PACK), ...BASKET_WARES])
    assert.ok(ITEMS[id], `${id} 不是登记过的物品`);
  for (const id of BASKET_WARES) assert.ok(ITEMS[id].buy > 0, `${id} 没有买价`);
  for (const id of Object.keys(START_PACK)) assert.ok(ITEMS[id].carry);
  for (const id of ON_MAP)
    for (const gift of [...PEOPLE[id].treats, ...FESTIVE]) {
      assert.ok(giftable(gift), `${PEOPLE[id].name}喜欢的 ${gift} 得是送得出手的东西`);
      assert.ok(BUFFS[PEOPLE[id].likes] && LINES[id].treat && LINES[id].thanks);
    }
});

test('物品的几个判断：能不能直接吃、当不当季、能不能送、阿满收不收', () => {
  assert.deepEqual(eatenAs('cake'), { water: -3, ...ITEMS.cake.snack });
  assert.equal(eatenAs('cucumber').full, 4);
  assert.equal(eatenAs('cucumber').water, 5);
  assert.equal(eatenAs('rice'), null);
  assert.equal(eatenAs('nothing'), null);
  assert.deepEqual(
    [seasonal('cucumber', 1), seasonal('cucumber', 0), seasonal('rice', 0)],
    [true, false, false],
  );
  assert.deepEqual([inSeason('cucumber', 0), inSeason('rice', 0)], [false, true]);
  assert.deepEqual(
    [giftable('egg'), giftable('basket'), giftable('wood'), giftable('seed.qingcai')],
    [true, true, false, false],
  );
  assert.deepEqual(
    [basketTakes('veg.qingcai'), basketTakes('basket'), basketTakes('salt')],
    [true, true, false],
  );
});

test('身体的数值和花体力的事：工具都登记了价钱，喝水的地方都有说法，增益的次数折算', () => {
  for (const tool of TOOLS) assert.ok(ACTIONS[tool.id]?.energy > 0, `${tool.id} 没登记花多少体力`);
  for (const [id, a] of Object.entries(ACTIONS)) assert.ok(a.id === id && a.kind && a.label);
  for (const source of ['well', 'vat', 'creek', 'flask']) assert.ok(DRINKS[source].amount > 0);
  assert.deepEqual([buffUses('hearty', 3), buffUses('treat', 3)], [12, 3]);
  assert.deepEqual([moodWord(0), moodWord(62), moodWord(100)], ['低落', '平静', '舒畅']);
  assert.deepEqual([thirstWord(80), thirstWord(5)], ['不渴', '嗓子冒烟']);
  assert.ok(BODY.hungerEvery > 0 && BODY.slotMinutes % BODY.hungerEvery === 0);
});

test('地图：自家院子在篱笆里，橱柜在院里；井、缸、溪水能喝，水田不能', () => {
  const map = MAPS.yard;
  assert.ok(isHome(map, 8, 11) && !isHome(map, 8, 15) && !isHome(map, 6, 18));
  const cupboard = map.objects.find(([kind]) => kind === 'cupboard');
  assert.ok(isHome(map, cupboard[1], cupboard[2]));
  assert.equal(actAt(map, cupboard[1], cupboard[2]).act, 'store');
  assert.deepEqual(
    [drinkSource(map, 18, 18), drinkSource(map, 12, 10), drinkSource(map, 38, 14)],
    ['well', 'vat', 'creek'],
  );
  assert.deepEqual([drinkSource(map, 24, 22), drinkSource(map, 8, 11)], [null, null]);
});

test('日历：日期和钟点的换算', () => {
  assert.deepEqual(dateOf(1), { year: 1, season: 0, seasonName: '春', dayOfSeason: 1 });
  assert.equal(dateOf(CALENDAR.seasonDays + 1).seasonName, '夏');
  assert.equal(dateOf(CALENDAR.seasonDays * 4 + 1).year, 2);
  assert.deepEqual(timeOf(6 * 60), { clock: '06:00', hour: '卯时', period: '清晨' });
  assert.equal(timeOf(12 * 60).hour, '午时');
  assert.equal(timeOf(24 * 60).period, '夜深');
});
