// L2-20 集日比鱼：集日钓客在渡口立木牌，何老三、钱胖子轮流来，申时后没应下就走；押钱或切磋，
// 渡口的三竿才算数、不算进惊窝；量尺分输赢，钱和称号对得上；钱胖子掏暗篓时能当众验，
// 冤枉了他、没验出都算输；输了能请他喝茶；第二天村民先提一句、茶摊传开，「串通」只在打平钱胖子
// 或输了请他喝茶以后才传。规则一律通过端口问和做，摆局面时改的是存档。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/port/game.js';
import { MATCH, MATCH_WORDS, MATCH_ECHO, MATCH_RUMOR } from '../../src/content/fair-match.js';
import { newGame, must, refused, fishOnce, wait } from '../helpers.js';

const AT = Object.freeze({ x: 17, y: 18 });
const TEA = Object.freeze({ x: 17, y: 11 });

/** 睡到第 day 天清早；edit 改存档（站到渡口钓客跟前、手上有钱）。 */
function fairGame(day = 5, edit = w => w, seed = 1) {
  const g = newGame(seed);
  while (g.ask('clock').day < day) must(g, 'sleep');
  const save = JSON.parse(JSON.stringify(g.save()));
  const w = save.state.world;
  Object.assign(w.people.hero, { map: 'river', ...AT, dir: 'left' });
  w.households.home.coins = 50;
  w.weather.now = 'cloudy';
  edit(w);
  return createGame({ saved: save, debug: true });
}
const reload = (g, edit) => {
  const save = JSON.parse(JSON.stringify(g.save()));
  edit(save.state.world);
  return createGame({ saved: save, debug: true });
};
const act = (g, type, input) => {
  const out = g.dispatch(type, input);
  assert.equal(out.ok, true, `${type}：${out.reason}`);
  return out;
};
/** 气泡里的话连着冒出来的旁白。 */
const line = (out, type) => {
  const d = out.facts.find(f => f.type === type)?.data;
  return d && d.line + (d.notes || []).join('');
};
const keys = g => g.ask('interaction.options', g.ask('match').id, AT).map(r => r.key);
const mods = g => g.ask('modifiers').list.map(m => m.id);
/** 比完三竿，量尺前把两边的鱼摆成给定的长短。 */
function ready(g, mine, his, topic = 'single') {
  return reload(g, w => {
    Object.assign(w.match.today, {
      topic,
      phase: 'ready',
      mine: mine.map(len => ({ fish: len ? 'carp' : null, len })),
      his: his.map(len => ({ fish: len ? 'carp' : null, len })),
    });
  });
}

test('集日清早钓客到渡口，何老三、钱胖子轮流；平日不来，申时后没应下就收竿', () => {
  const g = fairGame(5);
  const he = g.ask('match');
  assert.equal(he.name, '何老三');
  assert.deepEqual([he.map, he.x, he.y], [MATCH.spot.map, MATCH.spot.x, MATCH.spot.y]);
  assert.deepEqual(keys(g), ['rules', 'join', 'spar', 'decline']);
  wait(g, MATCH.until - g.ask('clock').minute);
  assert.equal(g.ask('match'), null);
  must(g, 'sleep');
  assert.equal(g.ask('match'), null, '第 6 天不是集日');
  const next = fairGame(10);
  assert.equal(next.ask('match').name, '钱胖子');
});

test('押钱比三竿：渡口的三竿才算，不算进惊窝；钱不够押不了', () => {
  const poor = fairGame(5, w => (w.households.home.coins = 3));
  const join = poor
    .ask('interaction.options', poor.ask('match').id, AT)
    .find(r => r.key === 'join');
  assert.match(join.reason, /不够/);
  assert.match(refused(poor, 'match.join', { at: AT, stake: true }), /钱不够/);

  const g = fairGame(5);
  const out = act(g, 'match.join', { at: AT, stake: true });
  assert.equal(g.ask('home').coins, 50 - MATCH.stake);
  assert.match(line(out, 'match.joined'), /痛快人/);
  assert.match(refused(g, 'match.join', { at: AT, stake: false }), /比过/);
  const lines = [];
  for (let i = 0; i < MATCH.casts; i++) {
    const cast = fishOnce(g, AT);
    lines.push(line(cast, 'match.cast'));
    assert.notEqual(g.ask('fishing', AT).spot.mood, 'spooked', '比鱼的三竿不算进惊窝');
  }
  assert.match(lines[0], /第一竿/);
  assert.match(lines[2], /三竿落定/);
  assert.equal(g.ask('match').phase, 'ready');
  assert.deepEqual(keys(g), ['measure']);
  // 第四竿不再记
  assert.equal(line(fishOnce(g, AT), 'match.cast'), undefined);
});

test('量尺：赢了退押钱加彩头、得渡口头竿；打平退押钱；输了能请喝茶', () => {
  const win = ready(
    fairGame(5, w => w),
    [12, 3, 0],
    [9, 8, 0],
  );
  const g0 = reload(win, w => (w.match.today.stake = MATCH.stake));
  const out = act(g0, 'match.measure', { at: AT });
  assert.equal(out.facts.find(f => f.type === 'match.measured').data.result, 'win');
  assert.equal(g0.ask('home').coins, 50 + MATCH.stake + MATCH.prize);
  assert.ok(mods(g0).includes('match_head'));
  assert.equal(g0.ask('match').phase, 'over');

  const tie = reload(ready(fairGame(5), [9], [9]), w => (w.match.today.stake = MATCH.stake));
  act(tie, 'match.measure', { at: AT });
  assert.equal(tie.ask('home').coins, 50 + MATCH.stake);

  const lose = ready(fairGame(5), [4, 4, 4], [3, 3, 7], 'sum');
  const said = line(act(lose, 'match.measure', { at: AT }), 'match.measured');
  assert.match(said, /三竿合起来，他一尺三，你一尺二/);
  assert.deepEqual(keys(lose), ['again', 'tea', 'leave']);
  const tea = act(lose, 'match.after', { at: AT, choice: 'tea' });
  assert.match(line(tea, 'match.after'), /调漂/);
  assert.equal(lose.ask('home').coins, 50 - MATCH.tea);
  assert.ok(mods(lose).includes('fish_steady'));
  assert.equal(lose.ask('match').done, true);
});

test('钱胖子掏暗篓：能当众验，验出来退钱得亮眼识鱼；没验出、冤枉了他都算输', () => {
  // 钱胖子三竿钓得少，眼看要输就掏暗篓：试几个种子，总有掏的
  let suspect = null;
  for (let seed = 1; seed <= 12 && !suspect; seed++) {
    const g = ready(
      fairGame(10, w => (w.meta.seed = seed * 7919)),
      [12],
      [3],
    );
    const out = act(g, 'match.measure', { at: AT });
    if (g.ask('match').phase === 'suspect') suspect = { g, out };
  }
  assert.ok(suspect, '钱胖子眼看要输时会掏暗篓');
  const inspect = suspect.g
    .ask('interaction.options', suspect.g.ask('match').id, AT)
    .find(r => r.key === 'inspect');
  assert.match(inspect.label, /把握\d+%/);

  const results = new Set();
  for (let seed = 1; seed <= 30; seed++) {
    const g = reload(suspect.g, w => {
      w.meta.seed = seed * 104729;
      w.match.today.stake = MATCH.stake;
    });
    const settled = act(g, 'match.inspect', { at: AT, look: true }).facts.find(
      f => f.type === 'match.settled',
    ).data;
    results.add(settled.result);
    if (settled.result === 'win') {
      assert.match(settled.line, /灰溜溜/);
      assert.match(settled.notes.join(''), /鱼鳃都发暗/);
      assert.ok(mods(g).includes('match_eye'));
      assert.equal(g.ask('home').coins, 50 + MATCH.stake + MATCH.prize);
    } else assert.match(settled.notes[0], /不太鲜亮/);
  }
  assert.deepEqual([...results].sort(), ['lose', 'win'], '验鱼有成有败');

  // 他没耍心眼，你冤枉了他：心情掉一点，照样输
  const honest = reload(suspect.g, w => (w.match.today.cheat = null));
  const mood = honest.ask('body').mood;
  const out = act(honest, 'match.inspect', { at: AT, look: true });
  assert.match(line(out, 'match.settled'), /确是刚出水的/);
  assert.ok(honest.ask('body').mood < mood);
  assert.equal(honest.ask('match').phase, 'after');
});

test('第二天：在场的村民先提一句，茶摊传开；「串通」只在打平钱胖子或输了请喝茶以后', () => {
  const known = w => {
    w.bonds.known.zhou = 5;
    w.bonds.talked.zhou = 1;
  };
  const won = reload(ready(fairGame(5, known), [20], [3]), w => (w.match.today.seen = ['zhou']));
  act(won, 'match.measure', { at: AT });
  must(won, 'sleep');
  const back = reload(won, w => Object.assign(w.people.hero, { map: 'river', x: 15, y: 15 }));
  const zhouLine = back.ask('resident.greeting', 'zhou');
  assert.equal(zhouLine, MATCH_ECHO.zhou[0]);
  const tea = reload(won, w => Object.assign(w.people.hero, { map: 'tea', ...TEA }));
  assert.match(
    line(act(tea, 'tea.do', { kind: 'listen', at: TEA }), 'tea.done'),
    /外乡老客|撞了大运/,
  );

  const gossip = g => {
    must(g, 'sleep');
    const t = reload(g, w => Object.assign(w.people.hero, { map: 'tea', ...TEA }));
    return line(act(t, 'tea.do', { kind: 'listen', at: TEA }), 'tea.done');
  };
  const tieQian = ready(fairGame(10), [9], [9]);
  act(tieQian, 'match.measure', { at: AT });
  assert.ok(gossip(tieQian).includes(MATCH_RUMOR.collude));

  const teaQian = ready(fairGame(10), [3], [9]);
  act(teaQian, 'match.measure', { at: AT });
  act(teaQian, 'match.inspect', { at: AT, look: false });
  act(teaQian, 'match.after', { at: AT, choice: 'tea' });
  assert.ok(gossip(teaQian).includes(MATCH_RUMOR.collude));

  const lostHe = ready(fairGame(5), [3], [9]);
  act(lostHe, 'match.measure', { at: AT });
  act(lostHe, 'match.after', { at: AT, choice: 'leave' });
  assert.ok(!gossip(lostHe).includes(MATCH_RUMOR.collude));
  assert.match(MATCH_WORDS.leave, /散了/);
});
