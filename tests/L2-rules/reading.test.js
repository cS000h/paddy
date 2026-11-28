// L2 规则：书架（第 4 步，G-37）。坐下读一回、读完给东西、重读、随手翻两页、托老陈捎书、乡邻送书、
// 书教的新菜读完才会、家书、见闻。一律通过端口发命令。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, must, refused, settle, near, travel, stocked, STOVE } from '../helpers.js';
import { createGame } from '../../src/port/game.js';
import { BOOKS, READ, BOOK_LINES, SKIM } from '../../src/content/books.js';
import { RECIPES } from '../../src/content/recipes.js';

const SHELF = near('cottage', 'bookshelf');
/** 改一改存档再读回来：f 拿到 world。 */
const edit = (g, f) => {
  const saved = JSON.parse(JSON.stringify(g.save()));
  f(saved.state.world);
  return createGame({ saved, debug: true });
};
const home = g => {
  travel(g, 'cottage');
  return g;
};

test('开局书架上有《稻乡旧历》：读一回两个钟头，消一点心烦；读完长看天的本事，重读只消心烦', () => {
  const g = home(edit(newGame(), w => (w.persona.hero.stress = 30)));
  const shelf = g.ask('shelf', SHELF);
  assert.deepEqual(
    shelf.books.map(b => b.id),
    ['almanac'],
  );
  assert.equal(shelf.here, true);
  const sky = g.ask('growth').skills.find(s => s.id === 'sky').xp;
  const minute = g.ask('clock').minute;
  const out = g.dispatch('book.read', { id: 'almanac', at: SHELF });
  const read = out.facts.find(f => f.type === 'book.read').data;
  assert.equal(read.line, BOOKS.almanac.lines[0]);
  assert.equal(read.done, true);
  assert.equal(read.after, BOOK_LINES.done.skill);
  assert.equal(g.ask('clock').minute - minute, READ.minutes);
  assert.equal(g.ask('stress').value, 30 - READ.calm);
  assert.ok(g.ask('growth').skills.find(s => s.id === 'sky').xp > sky, '看天长了一点');
  const again = g.dispatch('book.read', { id: 'almanac', at: SHELF });
  const re = again.facts.find(f => f.type === 'book.read').data;
  assert.equal(re.again, true);
  assert.equal(re.line, BOOK_LINES.again);
  assert.equal(g.ask('stress').value, 30 - READ.calm - READ.again);
  assert.equal(
    refused(g, 'book.read', { id: 'almanac', at: near('cottage', 'bed') }),
    BOOK_LINES.where,
  );
  assert.match(refused(g, 'book.read', { id: 'poems', at: SHELF }), /没有这本书/);
});

test('夜深了不让坐下读；随手翻两页只花一刻钟，冒一句书里的话，不推进度', () => {
  const g = home(newGame());
  const out = g.dispatch('book.skim', { at: SHELF });
  assert.ok(SKIM.includes(out.facts.find(f => f.type === 'book.skimmed').data.line));
  assert.equal(g.ask('shelf').books[0].n, 0);
  const late = edit(g, w => (w.clock.minute = READ.late));
  assert.equal(refused(late, 'book.read', { id: 'almanac', at: SHELF }), BOOK_LINES.late);
  assert.equal(late.ask('shelf').read, BOOK_LINES.late);
});

test('落脚单带了半旧诗册，书架上多一本；托货郎老陈捎书要付钱，有了不再捎', () => {
  const g = newGame();
  settle(g, { keepsake: 'poems' });
  assert.ok(
    g
      .ask('shelf')
      .books.map(b => b.id)
      .includes('poems'),
  );
  const h = home(edit(newGame(), w => (w.households.home.coins += 100)));
  const coins = h.ask('home').coins;
  assert.ok(h.ask('shelf').buy.some(b => b.id === 'creek'));
  must(h, 'book.buy', { id: 'creek', at: SHELF });
  assert.equal(h.ask('home').coins, coins - BOOKS.creek.price);
  assert.equal(refused(h, 'book.buy', { id: 'creek', at: SHELF }), BOOK_LINES.had);
  assert.equal(refused(h, 'book.buy', { id: 'fields', at: SHELF }), BOOK_LINES.notSold);
});

test('书教的新菜：没读完《灶下新抄》菜谱册里没有、做出来按食材起名；读完三回才会', () => {
  const taught = BOOKS.stove.gives.recipes;
  for (const name of taught)
    assert.ok(
      RECIPES.some(r => r[0] === name),
      name,
    );
  let g = stocked(newGame(), { shoot: 1, tofu: 1 });
  g = edit(g, w => (w.bonds.known.gui = READ.giftAt));
  const named = () => g.ask('cook.preview', { items: ['shoot', 'tofu'], method: 'stew' }).base;
  const listed = () => g.ask('kitchen', STOVE).recipes.some(r => r.name === '鲜笋炖豆腐');
  assert.notEqual(named(), '鲜笋炖豆腐');
  assert.equal(listed(), false, '开局菜谱册里没有书上的菜');
  // 跟桂嫂熟络了：第二天清早她送来一本
  must(g, 'sleep');
  assert.ok(g.ask('shelf').books.some(b => b.id === 'stove'));
  travel(g, 'cottage');
  for (let i = 0; i < BOOKS.stove.reads; i++) {
    if (i) must(g, 'sleep');
    must(g, 'book.read', { id: 'stove', at: SHELF });
  }
  assert.equal(named(), '鲜笋炖豆腐');
  assert.equal(listed(), true);
});

test('阿满进城回来，一季捎回一封家书；看过见闻，当天和乡邻再搭话会多一句', () => {
  let g = edit(newGame(), w => (w.clock.day = 3));
  must(g, 'sleep');
  const letters = g.ask('shelf').letters;
  assert.equal(letters.length, 1, '进城那天过了，家书到了');
  for (let i = 0; i < 5; i++) must(g, 'sleep');
  assert.equal(g.ask('shelf').letters.length, 1, '一季只来一封');
  g = home(g);
  must(g, 'news.look', { at: SHELF });
  assert.ok(Array.isArray(g.ask('shelf').news));
});
