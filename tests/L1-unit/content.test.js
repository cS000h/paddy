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
  ROUTINES,
  ROUTINE_DAY,
  DOING,
  LINES,
  RETURN_GIFT,
  mapOfPlace,
} from '../../src/content/people.js';
import { SKILLS, LEVELS, ORIGINS } from '../../src/content/growth.js';
import {
  ATTRS,
  MAIN_ATTRS,
  TAGS,
  AI_KEYS,
  TEMPERS,
  PAIRS,
  LINES_OF_ORIGIN,
  LINE_BONUS,
  LINE_UP_AT,
  INNATE,
  COPING,
  OLD_TRAITS,
  FILL_TEMPERS,
  DEFAULT_LINE,
} from '../../src/content/traits.js';
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
    const rules = ROUTINES[id];
    assert.ok(!rules.at(-1).when, `${id} 的作息最后一条得是平常日子（不写 when）`);
    for (const rule of rules) {
      assert.equal(rule.go.length, ROUTINE_DAY.slots.length, `${id} 的作息要排满每一段`);
      for (const tag of rule.when || [])
        assert.ok(['wet', 'heavy', 'fog', 'winter', 'fair'].includes(tag), `不认识的情形 ${tag}`);
    }
    const places = new Set(rules.flatMap(rule => rule.go));
    if (ROUTINE_DAY.stay[id]) places.add(ROUTINE_DAY.stay[id]);
    for (const place of places) {
      assert.ok(
        MAPS[mapOfPlace(place)]?.spots[`${id}.${place}`],
        `${id} 的作息指向不存在的位置 ${id}.${place}`,
      );
      assert.ok(DOING[id]?.[place], `${id} 在 ${place} 时没有写在做什么`);
    }
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

test('院里用火用水，屋里收纳起居，两边的家什各有去处', () => {
  const map = MAPS.yard;
  assert.ok(isHome(map, 8, 11) && !isHome(map, 8, 15) && !isHome(map, 6, 18));
  const room = MAPS.cottage;
  for (const [kind, belongs, other] of [
    ['cupboard', room, map],
    ['bookshelf', room, map],
    ['stove', map, room],
    ['vat', map, room],
    ['workbench', map, room],
  ]) {
    const [, x, y] = belongs.objects.find(([k]) => k === kind);
    assert.ok(isHome(belongs, x, y) && actAt(belongs, x, y));
    assert.ok(!other.objects.some(([k]) => k === kind));
  }
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

test('每个出入口的落脚处存在且可走；小屋家具和全部地点能从小院到达', () => {
  const seen = new Set(['yard']),
    todo = ['yard'];
  while (todo.length) {
    const map = MAPS[todo.shift()];
    for (const [kind, x, y, data] of map.objects) {
      if (!data?.to) continue;
      const dest = MAPS[data.to];
      assert.ok(dest, data.to);
      const at = spot(dest, data.arrival);
      assert.ok(walkable(dest, at.x, at.y));
      assert.ok(
        [
          [0, 1],
          [0, -1],
          [1, 0],
          [-1, 0],
        ].some(([dx, dy]) => walkable(map, x + dx, y + dy)),
      );
      if (!seen.has(dest.id)) {
        seen.add(dest.id);
        todo.push(dest.id);
      }
    }
  }
  assert.deepEqual([...seen].sort(), Object.keys(MAPS).sort());
});

test('生活文字：每件采集和家务做完都有一段话，沿溪能找到的东西都有说法', async () => {
  const { OUTDOOR, HOMEWORK, FORAGE_FINDS } = await import('../../src/content/activities.js');
  const text = await import('../../src/content/life-text.js');
  for (const a of Object.values(OUTDOOR)) {
    if (a.id === 'fish' || a.id === 'forage' || a.id === 'sticks') continue;
    assert.ok(text.ACTIVITY_TEXT[a.id] || text.FIND_TEXT[a.item], `${a.label} 做完没有话说`);
    assert.ok(ITEMS[a.item], `${a.label} 找到的东西没登记`);
  }
  for (const season of FORAGE_FINDS)
    for (const item of Object.keys(season)) assert.ok(text.FIND_TEXT[item] && ITEMS[item], item);
  for (const a of Object.values(HOMEWORK))
    if (a.id !== 'rest') assert.ok(text.ACTIVITY_TEXT[a.id], `${a.label} 做完没有话说`);
  assert.ok(text.REST_TEXT.yard && text.STICKS_TEXT.few && text.STICKS_TEXT.many);
});

test('过客站位和小事的默认地点能站人、能走到跟前，不和乡邻的去处、过客站位重在一格', async () => {
  const { VISITOR_SPOTS, VISITOR_ROLES } = await import('../../src/content/visitors.js');
  const { EVENTS } = await import('../../src/content/events.js');
  const standable = (mapId, x, y, what) => {
    const map = MAPS[mapId];
    assert.ok(map, `${what}：没有地图 ${mapId}`);
    assert.ok(walkable(map, x, y) && !actAt(map, x, y), `${what}：${mapId}(${x},${y}) 站不了人`);
    const ways = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].filter(([dx, dy]) => walkable(map, x + dx, y + dy));
    assert.ok(ways.length, `${what}：${mapId}(${x},${y}) 四面都走不到跟前`);
  };
  const residents = mapId =>
    Object.entries(MAPS[mapId].spots)
      .filter(([name]) => name.includes('.') && !name.startsWith('hero'))
      .map(([name, [x, y]]) => ({ name, x, y }));
  for (const role of Object.values(VISITOR_ROLES)) assert.ok(VISITOR_SPOTS[role.spot], role.id);
  for (const [mapId, list] of Object.entries(VISITOR_SPOTS))
    for (const s of list) {
      standable(mapId, s.x, s.y, '过客站位');
      const clash = residents(mapId).find(r => r.x === s.x && r.y === s.y);
      assert.ok(!clash, `过客站位 ${mapId}(${s.x},${s.y}) 和 ${clash?.name} 重了`);
    }
  for (const ev of Object.values(EVENTS)) {
    const { map, x, y } = ev.spot;
    standable(map, x, y, ev.id);
    const visitor = (VISITOR_SPOTS[map] || []).some(s => s.x === x && s.y === y);
    assert.ok(!visitor, `${ev.id} 的默认地点压在过客站位上，过客在时点不中`);
  }
});

test('特质表：八对性情各两个、方向相反，加减只落在六项上；出身线、根骨、毛病和旧特质的换法都指得上', () => {
  const attrsOk = a =>
    Object.entries(a || {}).every(([k, n]) => Object.hasOwn(ATTRS, k) && Number.isInteger(n) && n);
  assert.deepEqual(MAIN_ATTRS.length, 5);
  assert.ok(MAIN_ATTRS.every(k => Object.hasOwn(ATTRS, k)) && !MAIN_ATTRS.includes('tige'));
  assert.equal(Object.keys(PAIRS).length, 8);
  assert.equal(new Set(Object.values(TEMPERS).map(t => t.name)).size, 16);
  for (const [id, t] of Object.entries(TEMPERS)) {
    assert.ok(attrsOk(t.attrs), id);
    assert.ok(
      [...t.likes, ...t.dislikes].every(tag => Object.hasOwn(TAGS, tag)),
      id,
    );
    assert.ok(!t.likes.some(tag => t.dislikes.includes(tag)), id);
    assert.ok(
      Object.entries(t.ai).every(([k, v]) => AI_KEYS.includes(k) && v >= -100 && v <= 100),
      id,
    );
  }
  // 一对里的两个性情，至少有一样打分值方向相反，不然在村里看不出两种人
  for (const [a, b] of Object.values(PAIRS)) {
    const ai = id => TEMPERS[id].ai;
    assert.ok(
      AI_KEYS.some(k => (ai(a)[k] || 0) * (ai(b)[k] || 0) < 0),
      `${a}/${b}`,
    );
  }
  assert.equal(Object.keys(LINES_OF_ORIGIN).length, 10);
  for (const [id, l] of Object.entries(LINES_OF_ORIGIN)) {
    assert.ok(Object.hasOwn(LINE_BONUS, l.kind) && Object.hasOwn(ATTRS, l.main), id);
    assert.equal(l.kind === 'dual', Object.hasOwn(ATTRS, l.sub || '') && l.sub !== l.main, id);
    assert.ok(l.titles.length === 4 && Object.hasOwn(SKILLS, l.skill), id);
  }
  assert.ok(LINE_UP_AT.every((n, i) => n < LEVELS.length && (i === 0 || n > LINE_UP_AT[i - 1])));
  const levels = {};
  for (const [id, t] of Object.entries(INNATE)) {
    assert.ok(attrsOk(t.attrs), id);
    if (!t.line) continue;
    assert.ok(!levels[t.line + t.lv], `${t.line} 里 ${t.lv} 级重复`);
    levels[t.line + t.lv] = id;
  }
  for (const [id, c] of Object.entries(COPING)) assert.ok(attrsOk(c.attrs) && c.relief, id);
  const opening = [...ORIGINS.route, ...ORIGINS.reply].map(o => o.trait).sort();
  assert.deepEqual(Object.keys(OLD_TRAITS).sort(), opening);
  for (const to of Object.values(OLD_TRAITS))
    assert.ok(
      to.temper ? Object.hasOwn(TEMPERS, to.temper) : Object.hasOwn(LINES_OF_ORIGIN, to.line),
    );
  assert.ok(FILL_TEMPERS.every(id => Object.hasOwn(TEMPERS, id)));
  assert.ok(Object.hasOwn(LINES_OF_ORIGIN, DEFAULT_LINE));
});
