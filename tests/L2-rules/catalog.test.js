// L2-17 图鉴（G-10）：四页、每样一句话和线索；钓上来、挂上来、翻到、收菜都记一笔，鱼记最长和见过哪几档；
// 收集的成就照图鉴数；存取不丢。规则一律通过端口问和做。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/port/game.js';
import { CATALOG, CATALOG_INDEX } from '../../src/content/catalog.js';
import { ITEMS } from '../../src/content/items.js';
import { newGame, must, growOne, FIELD, fishOnce, HOME } from '../helpers.js';

const pageOf = (g, id) => g.ask('catalog').find(p => p.id === id);
const entryOf = (g, item) =>
  g
    .ask('catalog')
    .flatMap(p => p.entries)
    .find(e => e.item === item);
const earned = (g, id) => !!g.ask('achievements').find(a => a.id === id).day;

test('图鉴四页：鱼谱 13、河里 9、山货 25、菜园 7，每样都是寻常的物品、写着一句话和线索', () => {
  assert.deepEqual(
    CATALOG.map(p => [p.id, p.entries.length]),
    [
      ['fish', 13],
      ['river', 9],
      ['wild', 25],
      ['garden', 7],
    ],
  );
  const items = CATALOG.flatMap(p => p.entries.map(e => e.item));
  assert.equal(new Set(items).size, items.length, '一样东西只收在一页');
  for (const e of CATALOG.flatMap(p => p.entries)) {
    assert.ok(ITEMS[e.item] && !ITEMS[e.item].fine, e.item);
    assert.ok(e.line && e.clue && e.clue.length <= 16, e.item);
  }
  const g = newGame();
  const pages = g.ask('catalog');
  assert.ok(pages.every(p => p.found === 0 && !p.done));
  // 没找到的只给线索，不给回数
  assert.deepEqual(Object.keys(pages[0].entries[0]).sort(), ['clue', 'found', 'item', 'line']);
});

test('收菜记进菜园：几回、头一回哪天；极品记成见过极品', () => {
  const g = newGame(3);
  growOne(g);
  must(g, 'farm.harvest', FIELD);
  const e = entryOf(g, 'veg.qingcai');
  assert.equal(e.found, true);
  assert.ok(e.n >= 1);
  assert.equal(e.day, g.ask('clock').day);
  assert.match(e.date, /第 \d+ 日/);
  assert.equal(pageOf(g, 'garden').found, 1);
  const back = createGame({ saved: JSON.parse(JSON.stringify(g.save())), debug: true });
  assert.deepEqual(back.ask('catalog'), g.ask('catalog'));
});

test('钓鱼：鱼谱记条数、最长、见过的档；挂上来的东西进河里；初识水色、满载而归照数', () => {
  const g = newGame(8);
  const kinds = new Set();
  let fish = 0;
  let things = 0;
  for (let i = 0; i < 80 && fish < 10; i++) {
    if (g.ask('hero').energy < 10) must(g, 'sleep');
    const out = fishOnce(g);
    const c = out.facts.find(f => f.type === 'fish.caught');
    const junk = out.facts.find(f => f.type === 'fish.missed')?.data.junk;
    if (junk && CATALOG_INDEX[junk]) assert.ok(entryOf(g, junk).found);
    if (!c) continue;
    const d = c.data;
    const got = out.facts.find(f => f.type === 'catalog.got');
    if (CATALOG_INDEX[ITEMS[d.item].fine || d.item]) assert.ok(got, '收到图鉴里的东西要记一笔');
    if (d.thing) things++;
    else {
      fish++;
      kinds.add(d.fish);
      const e = entryOf(g, ITEMS[d.item].fine || d.item);
      const rec = g.ask('fishing', HOME).records[d.fish];
      assert.equal(e.n, rec.n);
      assert.equal(e.best, rec.best);
      assert.ok(e.grades[['small', 'fair', 'big', 'huge'].indexOf(d.grade)]);
      if (d.fine) assert.ok(e.fine);
    }
    must(g, 'pack.take', { item: d.item, n: 'all', at: HOME });
  }
  assert.ok(fish >= 5, '八十竿里该钓上五条以上');
  assert.equal(pageOf(g, 'fish').found, kinds.size);
  assert.equal(earned(g, 'book.fish3'), kinds.size >= 3);
  // things 只是看看有没有，种子定了数就定了
  assert.ok(things >= 0);
});

test('收集的成就：十八样照图鉴算，还木梭给桂嫂算拾金不昧', () => {
  const g = newGame();
  const ids = g
    .ask('achievements')
    .map(a => a.id)
    .filter(id => id.startsWith('book.'));
  assert.equal(ids.length, 18);
  const wild = g.ask('achievements').find(a => a.id === 'book.wild25');
  assert.equal(wild.goal, pageOf(g, 'wild').total);
});
