// L2 规则：外乡过客（G-15 的 2–12 号）。集日来四位、平常日子一到两位；开场选一样，第二步定输赢；
// 了结以后第二天村民先提一句、茶摊传开一句；断案时受了委屈的那一方第二天到院门口来。
// 规则测试一律通过端口发命令；过客哪天来只看种子和日子，这里把他摆进存档里直接见面。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/port/game.js';
import { newGame, must, refused, carried } from '../helpers.js';
import { ITEMS } from '../../src/content/items.js';
import { MODIFIERS } from '../../src/content/modifiers.js';
import { ON_MAP } from '../../src/content/people.js';
import { ATTRS } from '../../src/content/traits.js';
import { MAPS, walkable, actAt } from '../../src/content/maps/index.js';
import { VISITOR_SPOTS } from '../../src/content/visitors.js';
import { MATCH } from '../../src/content/fair-match.js';
import { fill } from '../../src/content/text.js';
import { PASSERS, PASSER_TEXT, PASSER_SPOTS, PASSER_RULES } from '../../src/content/passers.js';
import { arrivals, newEntry } from '../../src/sim/passer-state.js';
import { isFairDay } from '../../src/content/calendar.js';

/** 一局新开的，上午九点，人站在某位过客跟前；身上带几样东西、几盘菜，手上有几文钱。 */
function meet(id, { items = {}, dishes = [], coins = 30, attrs = null } = {}) {
  const save = structuredClone(newGame().save());
  const w = save.state.world;
  const e = newEntry(id, w.clock.day, -1, []);
  w.passers.today = [e];
  w.clock.minute = 9 * 60;
  Object.assign(w.packs.hero.items, items);
  w.packs.hero.dishes.push(...dishes);
  w.households[Object.keys(w.households)[0]].coins = coins;
  w.people.hero.map = e.map;
  if (attrs) Object.assign(w.persona.hero, attrs);
  const game = createGame({ saved: save, debug: true });
  const at = { x: e.x + 1, y: e.y, dir: 'left' };
  if (!walkable(MAPS[e.map], at.x, at.y)) at.x = e.x - 1;
  return { game, key: 'passer.' + id, at };
}
const pick = (m, key) => {
  const out = m.game.dispatch('passer.pick', { id: m.key, key, at: m.at });
  assert.equal(out.ok, true, out.reason);
  return out.facts.find(f => f.type === 'passer.picked').data;
};
const dish = (id, quality) => ({
  id,
  name: '炒青菜',
  base: 'fry.qingcai',
  cut: null,
  day: 1,
  full: 20,
  energy: 10,
  uses: 1,
  buff: 'hearty',
  method: 'fry',
  quality,
  ingredients: ['veg.qingcai'],
  spices: [],
  water: 0,
  tasteMood: 0,
  seasonal: false,
});

test('十一位过客的话和规则对得上：一步一步选项一样多，按钮不超过 10 个字，话不超过 30 个字', () => {
  assert.equal(Object.keys(PASSERS).length, 11);
  const len = s => s.replace(/[“”]/g, '').replace(/^[^：“]{1,4}：/, '').length;
  for (const [id, p] of Object.entries(PASSERS)) {
    const t = PASSER_TEXT[id];
    assert.ok(t, id);
    assert.equal(t.steps.length, p.steps.length, `${id} 步数`);
    p.steps.forEach((opts, s) => {
      assert.equal(t.steps[s].opts.length, opts.length, `${id} 第 ${s + 1} 步的选项`);
      opts.forEach((o, i) => {
        const label = fill(t.steps[s].opts[i].label, p.fill || {});
        assert.ok(label.length <= 10, `${id} 按钮太长：${label}`);
        if (o.check) assert.ok(Object.hasOwn(ATTRS, o.check), `${id} 检定 ${o.check}`);
        for (const eff of [o.do, o.ok, o.bad, o.burnt].filter(Boolean)) {
          if (eff.give) assert.ok(ITEMS[eff.give[0]], `${id} 给的 ${eff.give[0]}`);
          if (eff.title) assert.ok(MODIFIERS[eff.title], `${id} 称号 ${eff.title}`);
          for (const v of Object.keys(eff.bond || {})) assert.ok(ON_MAP.includes(v), v);
          if (eff.visit !== undefined) assert.ok(t.visit?.[eff.visit], `${id} 上门的人`);
          if (eff.back !== undefined) assert.ok(t.back[eff.back], `${id} 回头话 ${eff.back}`);
          if (eff.next !== undefined) assert.ok(p.steps[eff.next], `${id} 下一步`);
        }
        for (const alt of (o.need || '').split('|').filter(a => a && !a.includes(':')))
          assert.ok(['dish', 'crop', 'wild', 'fishy'].includes(alt) || ITEMS[alt], alt);
      });
    });
    const lines = JSON.stringify(t)
      .match(/"[^"]*"/g)
      .map(s => JSON.parse(s));
    for (const line of lines)
      for (const part of line.split('\n')) assert.ok(len(part) <= 30, `${id} 的话太长：${part}`);
    assert.ok(!JSON.stringify(t).includes('彩头'), `${id}：彩头只指稀罕收成，过客给的叫赏头`);
    if (['doctor', 'carpenter'].includes(id)) assert.ok(!t.rumor.bad, `${id} 不传坏话`);
  }
});

test('过客站的地方能站人，不压过客站位、乡邻的去处和比鱼钓客', () => {
  for (const [mapId, list] of Object.entries(PASSER_SPOTS))
    for (const s of list) {
      const map = MAPS[mapId];
      assert.ok(walkable(map, s.x, s.y) && !actAt(map, s.x, s.y), `${mapId}(${s.x},${s.y})`);
      const ways = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].filter(([dx, dy]) => walkable(map, s.x + dx, s.y + dy));
      assert.ok(ways.length, `${mapId}(${s.x},${s.y}) 走不到跟前`);
      const clash = Object.entries(map.spots).find(
        ([name, [x, y]]) => name.includes('.') && x === s.x && y === s.y,
      );
      assert.ok(!clash, `${mapId}(${s.x},${s.y}) 和 ${clash?.[0]} 重了`);
      assert.ok(!(VISITOR_SPOTS[mapId] || []).some(v => v.x === s.x && v.y === s.y));
      assert.ok(!(MATCH.spot.map === mapId && MATCH.spot.x === s.x && MATCH.spot.y === s.y));
    }
});

test('集日来四位，平常日子准来一位、六成再来一位；同一位隔几天才再来，一张图不站超了', () => {
  const met = {};
  let fair = 0,
    plain = 0,
    plainDays = 0;
  for (let day = 1; day <= 120; day++) {
    const ids = arrivals(7, day, isFairDay(day), met);
    if (isFairDay(day)) {
      assert.equal(ids.length, PASSER_RULES.fair, `集日 ${day}`);
      fair++;
    } else {
      plainDays++;
      plain += ids.length;
      assert.ok(ids.length >= 1, `平常日子 ${day} 一位都没来`);
    }
    for (const map of Object.keys(PASSER_SPOTS)) {
      const n = ids.filter(id => PASSERS[id].map === map).length;
      assert.ok(n <= PASSER_SPOTS[map].length, `${day} 日 ${map} 站了 ${n} 位`);
    }
    for (const id of ids) {
      assert.ok(!met[id] || day - met[id].day >= PASSER_RULES.rest, `${id} 来得太勤`);
      met[id] = { n: 1, last: -1, day };
    }
  }
  assert.ok(fair > 5);
  assert.ok(plain / plainDays > 1.4 && plain / plainDays < 1.8, String(plain / plainDays));
});

test('挑嘴老食客：接下点菜，端上一盘好菜，赏钱、称号，第二天村里提起、茶摊传开', () => {
  const m = meet('gourmet', { dishes: [dish(901, 'great')] });
  const who = m.game.ask('passers')[0];
  assert.equal(who.name, '老食客');
  assert.match(who.greeting, /拿手菜/);
  const rows = m.game.ask('interaction.options', m.key, m.at);
  assert.deepEqual(
    rows.map(r => r.label.split(' ')[0]),
    ['接下点菜', '探探他口风', '灶台忙，不接'],
  );
  assert.match(rows[1].label, /把握\d+%/);
  pick(m, '0.0');
  const coins = m.game.ask('home').coins;
  const out = pick(m, '1.0');
  assert.equal(out.end, 'ok');
  assert.equal(m.game.ask('home').coins, coins + 12);
  assert.equal(m.game.ask('kitchen').carried.length, 0, '菜端给他了');
  assert.ok(
    out.notes.some(n => n.includes('竖大拇指')),
    out.notes.join('|'),
  );
  assert.ok(m.game.ask('modifiers').list.some(x => x.id === 'passer_stove'));
  const echo = m.game.save().state.world.passers.echo.at(-1);
  assert.equal(echo.end, 'ok');
  assert.ok(['good', 'luck'].includes(echo.rumor));
  must(m.game, 'sleep');
  assert.ok(!m.game.ask('passers').some(p => p.pid === 'gourmet'), '老食客走了');
});

test('端上一盘烧糊的：赏钱少给，第二天茶摊传坏话', () => {
  const m = meet('gourmet', { dishes: [dish(902, 'burnt')] });
  pick(m, '0.0');
  const out = pick(m, '1.0');
  assert.equal(out.end, 'bad');
  const w = m.game.save().state.world;
  assert.equal(w.passers.echo.at(-1).rumor, 'bad');
});

test('要带着的东西没带，选不了；钱不够也选不了', () => {
  const m = meet('carpenter', { coins: 0 });
  const rows = m.game.ask('interaction.options', m.key, m.at);
  assert.match(rows[0].reason, /身上没带柴/);
  assert.match(rows[1].reason, /樟木块/);
  assert.equal(rows[3].reason, null);
  refused(m.game, 'passer.pick', { id: m.key, key: '0.0', at: m.at });
  const h = meet('herbseller', { coins: 2 });
  assert.equal(h.game.ask('interaction.options', h.key, h.at)[1].reason, '钱不够');
});

test('老木工：匀两份柴，柴交出去，得工钱，石伯熟悉涨', () => {
  const m = meet('carpenter', { items: { wood: 3 } });
  const before = m.game.ask('home').coins;
  const out = pick(m, '0.0');
  assert.equal(out.end, 'ok');
  assert.equal(carried(m.game, 'wood'), 1);
  assert.equal(m.game.ask('home').coins, before + 2);
  refused(m.game, 'passer.pick', { id: m.key, key: '0.3', at: m.at });
});

test('断案：判了大牛，第二天瘦猴到院门口来；递碗茶赔个不是花 2 文', () => {
  const m = meet('ridge');
  pick(m, '0.1');
  const rows = m.game.ask('interaction.options', m.key, m.at);
  assert.equal(rows.length, 3);
  const out = pick(m, '1.0');
  assert.equal(out.end, 'ok');
  assert.ok(m.game.ask('modifiers').list.some(x => x.id === 'passer_fair'));
  must(m.game, 'sleep');
  // 睡下以后人还在茶摊那张图上；回到院里见他
  const save = structuredClone(m.game.save());
  save.state.world.people.hero.map = 'yard';
  m.game = createGame({ saved: save, debug: true });
  const visit = m.game.ask('passers').find(p => p.id === 'passer.ridge.visit');
  assert.ok(visit, '瘦猴上门');
  assert.equal(visit.name, '瘦猴');
  assert.equal(visit.map, 'yard');
  assert.match(visit.greeting, /护短/);
  const at = { x: visit.x + 1, y: visit.y, dir: 'left' };
  const opts = m.game.ask('interaction.options', visit.id, at);
  assert.deepEqual(
    opts.map(o => o.key),
    ['tea', 'firm'],
  );
  const coins = m.game.ask('home').coins;
  must(m.game, 'passer.pick', { id: visit.id, key: 'tea', at });
  assert.equal(m.game.ask('home').coins, coins - PASSER_RULES.tea);
  assert.equal(m.game.ask('interaction.options', visit.id, at).length, 0, '了了就没话了');
});

test('草药贩：信了他掏钱买下，得一份寻常桃胶，心情落；话说完了就没有选项', () => {
  const m = meet('herbseller');
  const out = pick(m, '0.1');
  assert.equal(out.end, 'bad');
  assert.equal(carried(m.game, 'peachGum'), 1);
  assert.deepEqual(m.game.ask('interaction.options', m.key, m.at), []);
  assert.ok(m.game.ask('passers')[0].done);
});

test('货郎：压价压成了看担底货；没压成又不买，算砸，第二天茶摊传坏话', () => {
  const m = meet('drummer');
  const first = pick(m, '0.2');
  if (first.end === null && m.game.ask('passers')[0].greeting.includes('翻山')) {
    // 没压成：这一项没了，仍可原价买卖
    const rows = m.game.ask('interaction.options', m.key, m.at).map(r => r.key);
    assert.deepEqual(rows, ['0.0', '0.1', '0.3']);
    assert.equal(pick(m, '0.3').end, 'bad');
    assert.equal(m.game.save().state.world.passers.echo.at(-1).rumor, 'bad');
  } else {
    const out = pick(m, '1.1');
    assert.equal(out.end, 'ok');
    assert.ok(m.game.ask('notes').some(n => n.title === '见闻'));
  }
});

test('检定：把握写在按钮上，掷了以后成也好砸也好都往下一步走，这一项不再出现', () => {
  for (let seed = 0; seed < 6; seed++) {
    const m = meet('gourmet');
    const row = m.game.ask('interaction.options', m.key, m.at)[1];
    assert.match(row.confirm, /人情检定，把握\d+%/);
    const out = pick(m, '0.1');
    assert.equal(out.end, null);
    assert.ok(out.line, '他总有话说');
    const keys = m.game.ask('interaction.options', m.key, m.at).map(r => r.key);
    assert.deepEqual(keys, ['1.0', '1.1']);
    void seed;
  }
});
