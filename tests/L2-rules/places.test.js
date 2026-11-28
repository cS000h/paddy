import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/port/game.js';
import { MAPS, walkable } from '../../src/content/maps/index.js';
import { newGame, must, refused, wait, stocked, carried } from '../helpers.js';
import { STALLS, STALL_TAKES } from '../../src/content/stalls.js';
function travel(g, to) {
  const map = MAPS[g.ask('hero').map],
    row = map.objects.find(o => o[3]?.to === to);
  assert.ok(row, `${map.id}没有去${to}的出口`);
  const [, x, y] = row;
  const [dx, dy] = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ].find(([dx, dy]) => walkable(map, x + dx, y + dy));
  must(g, 'travel', { x, y, at: { x: x + dx, y: y + dy, dir: 'up' } });
  assert.equal(g.ask('hero').map, to);
}
test('檐下做饭，进屋收纳睡觉；存档留在屋里，出门饭菜不丢', () => {
  const g = newGame();
  assert.match(refused(g, 'travel', { x: 8, y: 9, at: { x: 20, y: 15 } }), /门边/);
  must(g, 'cook', { items: ['rice'], method: 'stew', at: { x: 10, y: 11 } });
  travel(g, 'cottage');
  must(g, 'pack.put', { item: 'rice', at: { x: 12, y: 7 } });
  assert.match(
    refused(g, 'cook', { items: ['rice'], method: 'stew', at: { x: 15, y: 8 } }),
    /檐下灶台/,
  );
  must(g, 'sleep');
  const loaded = createGame({ saved: JSON.parse(JSON.stringify(g.save())), debug: true });
  assert.equal(loaded.ask('hero').map, 'cottage');
  assert.equal(loaded.ask('kitchen').dishes.length, 1);
  travel(loaded, 'yard');
  assert.equal(loaded.ask('kitchen').dishes.length, 1);
});
test('全部村路能往返，采集点在新地图可用，居民逐时段各有去处、平日不进你的院子', () => {
  const g = newGame();
  travel(g, 'creek');
  must(g, 'gather', { id: 'bamboo', at: { x: 8, y: 9 } });
  travel(g, 'hill');
  assert.equal(g.ask('residents').find(p => p.id === 'yun').map, 'hill');
  travel(g, 'creek');
  travel(g, 'river');
  assert.equal(g.ask('residents').find(p => p.id === 'zhou').map, 'river');
  travel(g, 'tea');
  travel(g, 'market');
  travel(g, 'yard');
  for (let day = 0; day < 16; day++) {
    for (let slot = 0; slot < 4; slot++) {
      for (const p of g.ask('residents'))
        if (p.visible) assert.ok(walkable(MAPS[p.map], p.x, p.y), `${p.id}的落脚处`);
      wait(g, 180);
    }
    must(g, 'sleep');
  }
  // 乡邻平日的去处不能落在你家篱笆里：进院得有由头（翻修、飘香、做客），不是作息
  const [x0, y0, x1, y1] = MAPS.yard.home;
  for (const [name, [x, y]] of Object.entries(MAPS.yard.spots))
    if (/^[a-z]+\.(yard|field)$/.test(name))
      assert.ok(x < x0 || x > x1 || y < y0 || y > y1, `${name}落在自家院里`);
});
test('柜台当面买卖、钱货一起结算，库存不能靠重进或读档刷新，傍晚鲜货降价', () => {
  const g = newGame();
  assert.match(refused(g, 'market.buy', { shop: 'market', item: 'rice' }), /柜台/);
  travel(g, 'market');
  const at = { x: 14, y: 11 },
    shop = 'market';
  must(g, 'market.visit', { shop, at });
  const rice = g.ask('market').wares.find(i => i.item === 'rice');
  const money = g.ask('home').coins;
  must(g, 'market.buy', { shop, item: 'rice', at });
  // 头三天头一回在铺子买东西，小乔多找三文（局面池的 door.coins）
  assert.equal(g.ask('home').coins, money - rice.price + 3);
  assert.equal(g.ask('market').wares.find(i => i.item === 'rice').left, rice.left - 1);
  must(g, 'market.visit', { shop, at });
  const loaded = createGame({ saved: JSON.parse(JSON.stringify(g.save())), debug: true });
  assert.deepEqual(loaded.ask('market'), g.ask('market'));
  // 杂货铺只卖放得住的；鲜货在路南的摊子上，平常只摆中间那个，卖鲜货的摊子傍晚降一文
  assert.ok(!g.ask('market').wares.some(i => ['tofu', 'pork'].includes(i.item)));
  const out = g.ask('stalls');
  assert.deepEqual([out[0], out[2]], [null, null]);
  const stall = 'stall.' + out[1];
  const ware = g.ask('market', stall).wares.find(i => i.price > 1);
  wait(g, 540);
  const drop = STALLS[out[1]].drop ? 1 : 0;
  assert.equal(
    g.ask('market', stall).wares.find(i => i.item === ware.item).price,
    ware.price - drop,
  );
  must(g, 'market.sell', { shop, item: 'rice', at });
  const before = JSON.stringify(g.save());
  assert.match(refused(g, 'market.sell', { shop, item: 'lambLeg', at }), /羊腿/);
  assert.equal(JSON.stringify(g.save()), before);
});
test('铺子收东西从钱匣里付：每天每类前几份原价、再多半价、收满就不收；茶摊不收；收的货隔天转手回本', () => {
  const g = stocked(newGame(), { 'fish.carp': 12 });
  must(g, 'pack.put', { item: 'fish.carp', n: 12, at: { x: 8, y: 11 } });
  travel(g, 'market');
  const at = { x: 14, y: 11 },
    shop = 'market';
  must(g, 'market.visit', { shop, at });
  const carp = 9; // 鲤鱼基准价 6，鱼按 1.5 倍
  const coins = () => g.ask('home').coins;
  let money = coins();
  for (let i = 0; i < 5; i++) must(g, 'market.sell', { shop, item: 'fish.carp', at });
  assert.equal(coins(), money + 5 * carp);
  assert.deepEqual(g.ask('market').takes.fish, { full: 0, half: 5 });
  money = coins();
  must(g, 'market.sell', { shop, item: 'fish.carp', at });
  assert.equal(coins(), money + Math.floor(carp / 2), '收得多了只给半价');
  for (let i = 0; i < 4; i++) must(g, 'market.sell', { shop, item: 'fish.carp', at });
  assert.equal(
    refused(g, 'market.sell', { shop, item: 'fish.carp', at }),
    '这样东西今天铺子收够了，明天再来',
  );
  assert.equal(carried(g, 'fish.carp'), 2);
  travel(g, 'tea');
  assert.match(
    refused(g, 'market.sell', { shop: 'tea', item: 'fish.carp', at: { x: 17, y: 11 } }),
    /茶摊/,
  );
  must(g, 'sleep');
  assert.deepEqual(g.ask('market').takes.fish, { full: 5, half: 5 }, '第二天重新收');
});
test('铺子钱匣见底就收不动', () => {
  const saved = JSON.parse(JSON.stringify(newGame().save()));
  saved.state.world.purses.houses.shop.coins = 5;
  saved.state.world.households.home.items['fish.carp'] = 2;
  const g = createGame({ saved, debug: true });
  must(g, 'pack.put', { item: 'fish.carp', n: 2, at: { x: 8, y: 11 } });
  travel(g, 'market');
  const at = { x: 14, y: 11 };
  assert.match(refused(g, 'market.sell', { shop: 'market', item: 'fish.carp', at }), /钱匣/);
  assert.equal(carried(g, 'fish.carp'), 2, '没卖成，鱼还在身上');
});
test('茶摊喝茶补水，听闲话每天一次；集日有肉摊，下棋长交际', () => {
  const g = newGame();
  travel(g, 'tea');
  const at = { x: 17, y: 11 };
  const coins = g.ask('home').coins;
  must(g, 'tea.do', { kind: 'drink', at });
  assert.equal(g.ask('body').thirst, 100);
  assert.equal(g.ask('home').coins, coins - 1);
  must(g, 'tea.do', { kind: 'listen', at });
  assert.match(refused(g, 'tea.do', { kind: 'listen', at }), /做过/);
  wait(g, 360);
  const before = g.ask('bonds').find(p => p.id === 'shi').known;
  must(g, 'tea.do', { kind: 'chess', at });
  assert.ok(g.ask('bonds').find(p => p.id === 'shi').known > before);
  for (let n = 1; n < 5; n++) must(g, 'sleep');
  assert.ok(g.ask('market', 'tea').fair);
  // 集日路南三个摊位摆满，鱼摊一定来；肉不在茶摊卖了，归肉摊
  const out = g.ask('stalls');
  assert.ok(out.every(Boolean) && out.includes('fish') && new Set(out).size === 3);
  assert.ok(!g.ask('market', 'tea').wares.some(i => i.item === 'wholeChicken'));
});

test('照着全村地图走过去：沿路一段段走，每段花十分钟；走不到、没这地方、就在这儿都拒绝', async () => {
  const { routeTo, roads } = await import('../../src/content/maps/index.js');
  const { ATLAS } = await import('../../src/content/maps/atlas.js');
  const g = newGame();
  const start = g.ask('clock').minute;
  // 小院到渡口：要经过竹径或茶摊，两段路
  assert.equal(routeTo('yard', 'river').length, 2);
  must(g, 'travel.to', { to: 'river' });
  const hero = g.ask('hero');
  assert.equal(hero.map, 'river');
  assert.ok(walkable(MAPS.river, hero.x, hero.y), '到了站在能站的地方');
  assert.equal(g.ask('clock').minute, start + 20);
  assert.match(refused(g, 'travel.to', { to: 'river' }), /就在这儿/);
  assert.match(refused(g, 'travel.to', { to: 'moon' }), /没有这个地方/);
  // 每张地图都在全村地图上，彼此都走得到；路是对称的
  for (const a of Object.keys(MAPS)) {
    assert.ok(ATLAS[a], `${a} 没画在全村地图上`);
    for (const b of Object.keys(MAPS)) if (a !== b) assert.ok(routeTo(a, b), `${a} 走不到 ${b}`);
  }
  assert.ok(roads().length >= 7);
  // 存档读回来还在渡口，接着走回小院
  const back = createGame({ saved: JSON.parse(JSON.stringify(g.save())), debug: true });
  must(back, 'travel.to', { to: 'yard' });
  assert.equal(back.ask('hero').map, 'yard');
});

test('路南的摊子：各卖各的货、只收自己要的；集日鱼摊收鱼最多，收满给半价再收满不收；赶集前一天和当天有便条', () => {
  const g0 = newGame();
  assert.deepEqual(g0.ask('stalls'), [null, 'veg', null], '开局头一天进集场，中间已经摆着菜苗摊');
  for (let n = 1; n < 4; n++) must(g0, 'sleep');
  assert.ok(g0.ask('notes', 4).some(x => x.title === '明天赶集'));
  must(g0, 'sleep');
  assert.ok(g0.ask('notes', 5).some(x => x.title === '今天赶集'));
  const out = g0.ask('stalls');
  const spot = out.indexOf('fish');
  const cap = STALL_TAKES.fair;
  const g = stocked(g0, { 'fish.crucian': cap * 2 + 1, rice: 1 });
  must(g, 'pack.put', { item: 'fish.crucian', n: cap * 2 + 1, at: { x: 8, y: 11 } });
  must(g, 'pack.put', { item: 'rice', at: { x: 8, y: 11 } });
  travel(g, 'market');
  const at = { x: [8, 14, 20][spot], y: 17 };
  const shop = 'stall.fish';
  must(g, 'market.visit', { shop, at });
  assert.match(
    refused(g, 'market.sell', { shop, item: 'rice', at }),
    new RegExp(STALLS.fish.owner),
  );
  const coins = g.ask('home').coins;
  for (let i = 0; i < cap; i++) must(g, 'market.sell', { shop, item: 'fish.crucian', at });
  const full = g.ask('home').coins - coins;
  for (let i = 0; i < cap; i++) must(g, 'market.sell', { shop, item: 'fish.crucian', at });
  assert.ok(g.ask('home').coins - coins - full < full, '后几份只给半价');
  assert.equal(
    refused(g, 'market.sell', { shop, item: 'fish.crucian', at }),
    STALLS.fish.lines.full,
  );
  const ware = g.ask('market', shop).wares.find(i => i.left > 0);
  must(g, 'market.buy', { shop, item: ware.item, at });
  assert.match(refused(g, 'market.visit', { shop: 'stall.' + 'nope', at }), /柜台/);
});

test('云姑出摊那天白天站在自己摊子旁边，不在后山；收摊后照常去溪边', () => {
  const g = newGame();
  const yun = () => g.ask('residents').find(p => p.id === 'yun');
  let spot = -1;
  for (let n = 0; n < 60 && spot < 0; n++) {
    must(g, 'sleep');
    spot = g.ask('stalls').indexOf('tea');
  }
  assert.ok(spot >= 0, '几个集日里总有一回轮到山货茶摊');
  const at = yun();
  assert.equal(at.map, 'market');
  assert.deepEqual([at.x, at.y], [[6, 12, 18][spot], 18]);
  wait(g, 1080 - g.ask('clock').minute);
  assert.notEqual(yun().map, 'market', '傍晚收了摊就走');
});
