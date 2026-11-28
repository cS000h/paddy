// 成就的反馈和奖励（G-31）：三档、快到了提一嘴、暗成就、只数当天的、清早便条、一天一件贺喜、称号、稻穗、
// 院里的摆件。
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createGame } from '../../src/port/game.js';
import { ACHIEVEMENTS, ACHIEVEMENT_TIERS } from '../../src/content/achievements.js';
import {
  ACH_TEXT,
  ACH_TITLES,
  RICE_MARKS,
  ME_IN_GOSSIP,
} from '../../src/content/achievement-text.js';
import { KEEPSAKES } from '../../src/content/keepsakes.js';
import { CALENDAR } from '../../src/content/calendar.js';
import { KEEPSAKE_NAMES } from '../../src/art/keepsakes.js';
import { newGame, must, refused } from '../helpers.js';

const reload = (g, edit) => {
  const save = JSON.parse(JSON.stringify(g.save()));
  edit(save.state.world);
  return createGame({ saved: save, debug: true });
};
const facts = (out, type) => out.facts.filter(f => f.type === type).map(f => f.data);
const row = (g, id) => g.ask('achievements').find(a => a.id === id);
/** 菜地第 i 格（一行 12 格，从左上角数）。 */
const plot = i => {
  const x = 6 + (i % 12),
    y = 19 + Math.floor(i / 12);
  return { x, y, at: { x, y: y - 1, dir: 'down' } };
};
/** 不算引号的字数。 */
const len = s => [...s.replace(/[“”]/g, '')].length;

test('每个成就都有档、有类、有那一行话；攒着和大成有对口的村民和两句话，大成有称号', () => {
  for (const a of ACHIEVEMENTS) {
    assert.ok(Object.hasOwn(ACHIEVEMENT_TIERS, a.tier), a.id);
    const text = ACH_TEXT[a.id];
    assert.ok(text?.line && len(text.line) <= 17, `${a.id} 的小话`);
    if (a.hidden) assert.ok(a.clue && len(a.clue) <= 13, `${a.id} 的线索`);
    if (a.tier === 'first' || a.future) continue;
    assert.ok(text.by && text.meet && text.tea, `${a.id} 要有对口的村民和两句话`);
    assert.ok(len(text.meet) <= 30 && len(text.tea) <= 30, `${a.id} 的话太长`);
    if (a.tier === 'grand') assert.ok(ACH_TITLES[a.id], `${a.id} 是大成，要有称号`);
  }
  for (const [id, t] of Object.entries(ACH_TITLES)) {
    assert.equal(ACHIEVEMENTS.find(a => a.id === id)?.tier, 'grand', id);
    assert.ok(len(t.hail) <= 30 && t.hail.includes(t.title), id);
  }
  for (const k of Object.keys(ACHIEVEMENT_TIERS))
    assert.ok(
      ACHIEVEMENTS.some(a => a.tier === k),
      k,
    );
});

const till = (g, i) => {
  const out = g.dispatch('farm.till', plot(i));
  assert.ok(out.ok, out.reason);
  return out;
};

test('得了成就带着档、话和稻穗；差最后几回提一嘴，只提一回', () => {
  const g = newGame();
  const first = facts(till(g, 0), 'achievement.earned')[0];
  assert.deepEqual(
    [first.id, first.tier, first.line, first.rice],
    ['soil1', 'first', ACH_TEXT.soil1.line, 1],
  );
  const near = [],
    earned = [];
  for (let i = 1; i < 20; i++) {
    const out = till(g, i);
    near.push(...facts(out, 'achievement.near').map(d => [i + 1, d.id, d.left]));
    earned.push(...facts(out, 'achievement.earned'));
  }
  // 一方良田要锄二十回：锄到第十六回提一嘴还差四回，往后不再提
  assert.deepEqual(near, [[16, 'soil20', 4]]);
  const soil20 = earned.find(d => d.id === 'soil20');
  assert.deepEqual([soil20.tier, soil20.rice], ['grow', 2]);
  assert.equal(g.ask('achievement.board').rice, 2);
});

test('暗成就：没得之前只露线索，下雨天锄五回地才算；只数当天的换一天从头数', () => {
  const g = reload(newGame(), w => (w.weather.now = 'rain'));
  const before = row(g, 'h.rainTill');
  assert.deepEqual([before.name, before.line], ['？？', '']);
  assert.ok(before.clue);
  for (let i = 0; i < 5; i++) till(g, i);
  assert.equal(row(g, 'h.rainTill').name, '冒雨挖土');
  // 晴天锄的不算
  const dry = reload(newGame(), w => (w.weather.now = 'sunny'));
  for (let i = 0; i < 5; i++) till(dry, i);
  assert.equal(row(dry, 'h.rainTill').day, null);

  // 一天给六个人送东西：昨天送的五回不算进今天
  const gifts = reload(newGame(), w => {
    w.packs.hero.items = { 'veg.qingcai': 6 };
    w.achievements.hero.counts['h.sixGifts'] = 5;
    w.achievements.hero.daily['h.sixGifts'] = w.clock.day - 1 || 1;
  });
  const g2 = reload(gifts, w => (w.clock.day = 2));
  must(g2, 'gift', { to: 'gui', item: 'veg.qingcai' });
  assert.equal(row(g2, 'h.sixGifts').day, null);
  assert.equal(row(g2, 'h.sixGifts').count, 1);
});

test('清早便条提昨天得了什么；第二天对口的村民先提一句，茶摊传开；一天只贺一件', () => {
  const g = newGame();
  for (let i = 0; i < 20; i++) till(g, i);
  must(g, 'sleep');
  assert.ok(
    g
      .ask('notes')
      .some(n => n.title === '昨天' && n.text.includes('一方良田') && n.text.includes('第一锄')),
  );
  // 石伯认得你、今天还没说过话：先提一方良田
  const known = reload(g, w => {
    for (const id of ['shi', 'gui']) w.bonds.known[id] = 5;
    w.bonds.talked.shi = 1;
    w.bonds.talked.gui = 1;
  });
  assert.equal(known.ask('resident.greeting', 'shi'), ACH_TEXT.soil20.meet);
  assert.notEqual(known.ask('resident.greeting', 'gui'), ACH_TEXT.soil20.meet);

  // 两件攒着的同一天得：今天贺头一件，茶摊传第二件，后天就不再提
  const two = reload(newGame(), w => {
    Object.assign(w.achievements.hero.earned, { soil20: 1, seed30: 1 });
  });
  must(two, 'sleep');
  const h = reload(two, w => {
    w.bonds.known.shi = 5;
    w.bonds.talked.shi = 1;
  });
  const said = h.ask('resident.greeting', 'shi');
  assert.ok([ACH_TEXT.soil20.meet, ACH_TEXT.seed30.meet].includes(said), said);
  const atTea = reload(two, w => Object.assign(w.people.hero, { map: 'tea', x: 17, y: 11 }));
  const tea = atTea.dispatch('tea.do', { kind: 'listen', at: { x: 17, y: 11 } });
  assert.ok(tea.ok, tea.reason);
  const heard = facts(tea, 'tea.done')[0].line;
  assert.ok(heard.includes(ME_IN_GOSSIP), heard);
  must(two, 'sleep');
  const later = reload(two, w => {
    w.bonds.known.shi = 5;
    w.bonds.talked.shi = 2;
  });
  const next = later.ask('resident.greeting', 'shi');
  assert.ok(![ACH_TEXT.soil20.meet, ACH_TEXT.seed30.meet].includes(next), next);
});

test('称号：挣到大成才戴得上，戴着的村民隔几天这么招呼一声；摘得下来，存取不丢', () => {
  const g = newGame();
  assert.match(refused(g, 'achievement.wear', { id: 'book.grades' }), /还没挣到/);
  assert.match(refused(g, 'achievement.wear', { id: 'soil1' }), /没有这个称号/);
  const won = reload(g, w => (w.achievements.hero.earned['book.grades'] = 1));
  assert.deepEqual(won.ask('achievement.board').titles, [
    { id: 'book.grades', title: ACH_TITLES['book.grades'].title },
  ]);
  must(won, 'achievement.wear', { id: 'book.grades' });
  assert.equal(won.ask('achievement.board').worn.title, '河湾巧手');
  const back = createGame({ saved: JSON.parse(JSON.stringify(won.save())), debug: true });
  assert.deepEqual(back.ask('achievement.board'), won.ask('achievement.board'));
  // 三天里有一天，村民头一回见面这么叫你
  const hails = [1, 2, 3].map(day =>
    reload(won, w => {
      w.clock.day = day;
      w.bonds.known.shi = 5;
      w.bonds.talked.shi = 0;
    }).ask('resident.greeting', 'shi'),
  );
  assert.equal(hails.filter(s => s === ACH_TITLES['book.grades'].hail).length, 1);
  must(won, 'achievement.wear', { id: null });
  assert.equal(won.ask('achievement.board').worn, null);
});

test('稻穗攒到十根，第二天清早村里来一回表示', () => {
  const nine = ACHIEVEMENTS.filter(a => a.id !== 'soil1')
    .slice(0, 9)
    .map(a => a.id);
  const g = reload(newGame(), w => {
    for (const id of nine) {
      w.achievements.hero.earned[id] = 1;
      w.achievements.hero.told[id] = 1;
    }
  });
  assert.equal(g.ask('achievement.board').next, RICE_MARKS[0].at);
  till(g, 0);
  assert.equal(g.ask('achievement.board').rice, 10);
  const today = () => g.ask('notes', g.ask('clock').day);
  must(g, 'sleep');
  assert.ok(today().some(n => n.title === RICE_MARKS[0].title));
  must(g, 'sleep');
  assert.ok(!today().some(n => n.title === RICE_MARKS[0].title));
});

test('得了对口的成就，院里摆出那件摆件；稻穗够数第二天门上挂纪念；进院的人再搭话时看见了说一句', () => {
  const g = newGame();
  assert.deepEqual(g.ask('yard.keepsakes', 'yard'), []);
  for (const k of KEEPSAKES) {
    assert.ok(
      ACHIEVEMENTS.some(a => a.id === k.for && a.tier !== 'first'),
      k.id,
    );
    assert.ok(KEEPSAKE_NAMES.includes(k.id), `${k.id} 要有图`);
    assert.ok(len(k.look) <= 30, `${k.id} 的话太长`);
  }
  for (const m of RICE_MARKS) assert.ok(KEEPSAKE_NAMES.includes(m.art), m.title);
  const hoe = KEEPSAKES.find(k => k.id === 'ornHoe');
  const got = reload(g, w => {
    w.achievements.hero.earned[hoe.for] = w.clock.day;
  });
  assert.deepEqual(
    got.ask('yard.keepsakes', 'yard').map(k => k.id),
    ['ornHoe'],
  );
  assert.deepEqual(got.ask('yard.keepsakes', 'village'), []);
  // 稻穗：攒到十根当天还不挂，第二天才挂
  const ten = ACHIEVEMENTS.slice(0, 10).map(a => a.id);
  const rich = reload(g, w => {
    for (const id of ten) w.achievements.hero.earned[id] = w.clock.day;
  });
  assert.ok(!rich.ask('yard.keepsakes', 'yard').some(k => k.id === RICE_MARKS[0].art));
  must(rich, 'sleep');
  assert.ok(rich.ask('yard.keepsakes', 'yard').some(k => k.id === RICE_MARKS[0].art));
  // 石伯平常傍晚在院外樟树下，不在院里，看不见摆件，不提（两天都试，躲开隔天那一下）
  for (const day of [2, 3]) {
    const outside = reload(got, w => {
      w.clock.day = day;
      w.clock.minute = 16 * 60;
      w.bonds.known.shi = 5;
    });
    assert.equal(outside.ask('residents').find(p => p.id === 'shi').map, 'yard');
    assert.notEqual(outside.ask('resident.greeting', 'shi'), hoe.look);
  }
  // 修好竹挂架，晴天清早每三天他进院按一回门闩（content/yard-fix.js）：头一句说门闩，
  // 再搭话时两天里有一天提锄头架
  const said = [6, 9].map(day => {
    const x = reload(got, w => {
      w.clock.day = day;
      w.clock.minute = 7 * 60;
      w.weather.now = w.weather.today = 'sunny';
      w.yardFix.fixed.rack = 1;
      w.bonds.known.shi = 5;
      w.bonds.talked.shi = 0;
    });
    const shi = x.ask('residents').find(p => p.id === 'shi');
    assert.equal(shi.doing, '顺手替你按紧门闩');
    assert.notEqual(x.ask('resident.greeting', 'shi'), hoe.look);
    must(x, 'talk', { to: 'shi', at: { x: shi.x + 1, y: shi.y, dir: 'left' } });
    return x;
  });
  assert.equal(said.filter(x => x.ask('resident.greeting', 'shi') === hoe.look).length, 1);
});

test('旧档已过满一年的清早还没得「四季安居」，读档就补上', () => {
  const old = JSON.parse(
    readFileSync(new URL('../fixtures/save-v34.json', import.meta.url), 'utf8'),
  );
  const a = old.state.world.achievements.hero;
  delete a.earned.days60;
  a.counts.days60 = 58;
  const g = createGame({ saved: old, debug: true });
  assert.ok(row(g, 'days60').day);
  assert.equal(row(g, 'days60').count, 56);
});

test('「四季安居」跟着日历，住满一整年', () => {
  const a = ACHIEVEMENTS.find(x => x.id === 'days60');
  assert.equal(a.goal, CALENDAR.seasonDays * CALENDAR.seasons.length);
});
