// L2-14 走图翻找：每天清早几处有动静，路边的东西每处每天翻一回，有动静的地方翻得出当季的东西，
// 别处多半空手、连着没翻到机会慢慢加；野货出极品；不能吃的东西送人不说「吃」。规则一律通过端口问和做。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/port/game.js';
import { MAPS, walkable } from '../../src/content/maps/index.js';
import { ITEMS, plainOf } from '../../src/content/items.js';
import { SEARCH, SEARCH_FINDS, SEARCH_BOOK } from '../../src/content/search.js';
import { dateOf } from '../../src/content/calendar.js';
import { noise } from '../../src/sim/noise.js';
import { newGame, must, refused, carried, HOME } from '../helpers.js';

const SIDES = [
  [0, 1, 'up'],
  [0, -1, 'down'],
  [1, 0, 'left'],
  [-1, 0, 'right'],
];

/** 站到 spot 四面能站人的一格上，面朝它。 */
function besideOf(map, spot) {
  for (const [dx, dy, dir] of SIDES)
    if (walkable(MAPS[map], spot.x + dx, spot.y + dy))
      return { x: spot.x + dx, y: spot.y + dy, dir };
  throw new Error(`${map} 的 ${spot.x},${spot.y} 四面都站不了人`);
}

/** 走到那张图上（已经在就不走）。 */
function goTo(g, map) {
  if (g.ask('hero').map !== map) must(g, 'travel.to', { to: map });
}

/** 行囊快满了，回家把翻到的东西放下（菜种留着）。 */
function makeRoom(g) {
  if (g.ask('pack').room > 1) return;
  goTo(g, 'yard');
  for (const it of g.ask('pack').items.filter(i => i.id !== 'seed.qingcai'))
    must(g, 'pack.take', { item: it.id, n: 'all', at: HOME });
}

/** 翻一处：行囊腾出地方，走过去，站在旁边翻。返回命令的结果。 */
function searchAt(g, map, spot) {
  makeRoom(g);
  goTo(g, map);
  return g.dispatch('search', { at: besideOf(map, spot), spot: { x: spot.x, y: spot.y } });
}

/** 今天有动静的几处：[{map, x, y, kind}]。 */
const cuesOf = g =>
  Object.keys(MAPS).flatMap(map =>
    g
      .ask('search.spots', map)
      .filter(s => s.cue)
      .map(s => ({ ...s, map })),
  );

test('固定的随机落在 0 到 1 之间，不会是负数（每天清早挑动静、锄地翻蚯蚓都用它）', () => {
  for (let a = 0; a < 300; a++)
    for (let b = 0; b < 30; b++) {
      const v = noise(a, b, 7);
      assert.ok(v >= 0 && v < 1, `noise(${a}, ${b}, 7) = ${v}`);
    }
});

test('每天清早全村五到八处有动静（雨后多一处），各张图大多有一处；第二天换了地方', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const g = newGame(seed);
    const cues = cuesOf(g);
    assert.ok(cues.length >= SEARCH.cues[0], `种子 ${seed} 只有 ${cues.length} 处`);
    assert.ok(cues.length <= SEARCH.cues[1] + SEARCH.wetCues, `种子 ${seed} 有 ${cues.length} 处`);
    assert.ok(new Set(cues.map(c => c.map)).size >= 5, `种子 ${seed} 的动静挤在几张图上`);
  }
  const g = newGame(5);
  const before = cuesOf(g).map(c => `${c.map}:${c.x},${c.y}`);
  must(g, 'sleep');
  const after = cuesOf(g).map(c => `${c.map}:${c.x},${c.y}`);
  assert.notDeepEqual(after, before);
});

test('翻一处花 1 体力、3 分钟；同一处一天一回，第二天又能翻；不在跟前、不是能翻的东西都不行', () => {
  const g = newGame(2);
  const spot = g.ask('search.spots', 'yard').find(s => !s.cue);
  const energy = g.ask('hero').energy;
  const minute = g.ask('clock').minute;
  assert.equal(g.ask('search.why', spot, besideOf('yard', spot)), null);
  assert.ok(searchAt(g, 'yard', spot).ok);
  assert.equal(g.ask('hero').energy, energy - 1);
  assert.equal(g.ask('clock').minute, minute + SEARCH.minutes);
  assert.equal(searchAt(g, 'yard', spot).reason, '今天翻过了');
  assert.ok(g.ask('search.spots', 'yard').find(s => s.x === spot.x && s.y === spot.y).done);
  const far = { x: spot.x + 3, y: spot.y };
  assert.equal(refused(g, 'search', { at: besideOf('yard', spot), spot: far }), '这儿没什么可翻的');
  const other = g.ask('search.spots', 'yard').find(s => Math.abs(s.x - spot.x) > 3);
  assert.equal(
    refused(g, 'search', { at: besideOf('yard', spot), spot: { x: other.x, y: other.y } }),
    '走到跟前再翻',
  );
  must(g, 'sleep');
  assert.ok(searchAt(g, 'yard', spot).ok);
});

test('杂货铺门口的草垛是人家的，不能翻；自家院里的草垛能翻', () => {
  const market = MAPS.market.objects.find(o => o[0] === 'haystack');
  assert.ok(
    !newGame(1)
      .ask('search.spots', 'market')
      .some(s => s.x === market[1] && s.y === market[2]),
  );
  assert.ok(
    newGame(1)
      .ask('search.spots', 'yard')
      .some(s => s.kind === 'yard'),
  );
});

test('有动静的地方一定翻得出这一类当季的东西，头一回找到记下日子，长一点采集本事', () => {
  for (let seed = 1; seed <= 12; seed++) {
    const g = newGame(seed);
    const season = dateOf(g.ask('clock').day).season;
    const xp = g.ask('growth').skills.find(s => s.id === 'forage').xp;
    let found = 0;
    for (const c of cuesOf(g)) {
      const out = searchAt(g, c.map, c);
      assert.ok(out.ok, out.reason);
      const f = out.facts.find(x => x.type === 'search.found');
      assert.ok(f, `种子 ${seed} 在 ${c.map} 的${SEARCH_FINDS[c.kind].name}没翻出东西`);
      const def = SEARCH_FINDS[c.kind].finds.find(x => x.item === plainOf(f.data.item));
      assert.ok(def && (!def.seasons || def.seasons.includes(season)), f.data.item);
      assert.ok(f.data.cued);
      // 头一回找到只说山货谱里的新东西；柴、竹篾这些家常的不另说
      const book = SEARCH_BOOK.includes(plainOf(f.data.item));
      if (f.data.first && !f.data.fine && book) assert.match(f.data.line, /头一回找到/);
      if (!book) assert.doesNotMatch(f.data.line, /头一回找到/);
      found++;
    }
    const book = g.ask('search').found;
    assert.ok(book.length >= 1 && book.every(b => b.day === 1));
    assert.ok(g.ask('growth').skills.find(s => s.id === 'forage').xp >= xp + found);
  }
});

test('没动静的地方多半空手，连着没翻到机会一回回加上去，翻到了清零', () => {
  const g = newGame(8);
  const luck0 = g.ask('search').luck.value;
  assert.equal(luck0, SEARCH.luck.base);
  let empty = 0;
  let hit = false;
  for (const s of g.ask('search.spots', 'yard').filter(x => !x.cue)) {
    const out = searchAt(g, 'yard', s);
    if (!out.ok) break;
    if (out.facts.some(f => f.type === 'search.found')) {
      hit = true;
      assert.equal(g.ask('search').luck.value, SEARCH.luck.base);
      break;
    }
    empty++;
    assert.match(out.facts.find(f => f.type === 'search.empty').data.line, /./);
    const luck = g.ask('search').luck;
    assert.equal(
      luck.value,
      Math.min(SEARCH.luck.max, SEARCH.luck.base + empty * SEARCH.luck.miss),
    );
    assert.ok(luck.parts.some(p => p.id === 'miss'));
  }
  assert.ok(empty >= 1, '头一处就翻到了，换个种子');
  assert.ok(hit || empty >= 8);
});

test('翻到能吃的野货会出极品，名字前带「极品」，极品比寻常的值钱', () => {
  let fine = null;
  for (let seed = 1; seed <= 40 && !fine; seed++) {
    const g = newGame(seed);
    for (let day = 0; day < 4 && !fine; day++) {
      for (const c of cuesOf(g)) {
        const out = searchAt(g, c.map, c);
        assert.ok(out.ok, out.reason);
        const f = out.facts.find(x => x.type === 'search.found');
        if (f?.data.fine) fine = f.data;
      }
      must(g, 'sleep');
    }
  }
  assert.ok(fine, '翻了一百多处有动静的地方，一样极品都没出');
  assert.ok(ITEMS[fine.item].fine);
  assert.match(fine.line, /极品/);
  assert.ok(ITEMS[fine.item].sell > ITEMS[plainOf(fine.item)].sell);
});

test('送人不能吃的东西（荷花、柳条……）对方不说「吃」', () => {
  const g = newGame(1);
  const save = JSON.parse(JSON.stringify(g.save()));
  save.state.world.packs.hero.items.lotusFlower = 1;
  save.state.world.packs.hero.items.willowTwig = 1;
  const h = createGame({ saved: save, debug: true });
  const qiao = h.ask('residents').find(p => p.id === 'qiao');
  goTo(h, qiao.map);
  const given = h.dispatch('gift', { to: 'qiao', item: 'lotusFlower' });
  assert.ok(given.ok, given.reason);
  const line = given.facts.find(f => f.type === 'gift.given').data.line;
  assert.doesNotMatch(line, /吃/);
  assert.equal(carried(h, 'lotusFlower'), 0);
});
