// L2-24 集日收尾、小院翻修、满院飘香：比鱼时爱凑热闹的乡邻围到渡口，比完第二天钓客上门；
// 院里六处能修，修好了按天气、时辰招人进院；做出拿手又用了极品料，门口聚上几位，怎么分各有后果，
// 第二天尝到的人还碗。一律通过端口发命令、问查询；要搭的场面从存档里摆好再读进来。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/port/game.js';
import { newGame, must, refused, bestFire, carried, wait, HOME, STOVE } from '../helpers.js';
import { MATCH } from '../../src/content/fair-match.js';
import { CROWD_DOING, MATCH_VISIT, VISIT_TEXT } from '../../src/content/crowd.js';
import { YARD_FIX, FIX_IDS, YARD_GUESTS } from '../../src/content/yard-fix.js';
import { AROMA, AROMA_RETURN } from '../../src/content/aroma.js';
import { ITEMS } from '../../src/content/items.js';

/** 从存档里摆一个场面再读进来（写入检查开着）。 */
function staged(g, change) {
  const save = structuredClone(g.save());
  change(save.state.world);
  return createGame({ saved: save, debug: true });
}
const sleepTo = (g, day) => {
  while (g.ask('clock').day < day) must(g, 'sleep');
  return g;
};
/** 发一条必须成功的命令，返回整个结果（要看事实里的数据）。 */
const act = (g, type, input) => {
  const out = g.dispatch(type, input);
  assert.equal(out.ok, true, `${type}：${out.reason}`);
  return out;
};
const where = (g, id) => g.ask('residents').find(p => p.id === id);
const GATE = Object.freeze({ x: 8, y: 14, dir: 'down' });
const RIVER = Object.freeze({ x: 17, y: 18 });

test('数据对得上：六处的材料、进院的人、回礼都指得上', () => {
  for (const id of FIX_IDS) {
    const d = YARD_FIX[id];
    for (const item of Object.keys(d.cost)) assert.ok(ITEMS[item], `${id} 的 ${item}`);
    assert.ok(d.done.length <= 30, d.done);
    for (const g of id === 'platform' ? [] : YARD_GUESTS[id]) {
      assert.ok(g.say.length <= 40 && g.doing, id);
      for (const item of [g.gift, g.borrow].filter(Boolean)) assert.ok(ITEMS[item[0]], item[0]);
    }
    const docs = Object.values(YARD_GUESTS)
      .flatMap(l => l.map(g => g.doing))
      .filter(Boolean);
    assert.equal(new Set(docs).size, docs.length, '各件进院的事说法不同');
  }
  for (const [item] of Object.values(AROMA_RETURN)) assert.ok(ITEMS[item], item);
  for (const [why, byHost] of Object.entries(VISIT_TEXT))
    for (const say of Object.values(byHost)) assert.ok(say.length <= 40, `${why}：${say}`);
});

test('比鱼时爱凑热闹的乡邻围到渡口，比完都算在场；收了场各回各处', () => {
  const g = staged(sleepTo(newGame(1), 5), w => {
    Object.assign(w.people.hero, { map: 'river', ...RIVER, dir: 'left' });
    w.households.home.coins = 50;
    w.weather.now = 'cloudy';
  });
  wait(g, 9 * 60 - g.ask('clock').minute);
  const out = act(g, 'match.join', { at: RIVER, stake: false });
  const crowd = out.facts.find(f => f.type === 'crowd.gathered')?.data;
  assert.ok(crowd && crowd.who.length > 0, '有人围过来');
  assert.ok(crowd.who.every(id => where(g, id).map === 'river'));
  assert.ok(crowd.who.every(id => where(g, id).doing === CROWD_DOING.match));
  assert.ok(!crowd.who.includes('yun'), '怕生的云姑不来凑热闹');
  // 量尺分出输赢：围过来的人都在场
  const done = staged(g, w => {
    Object.assign(w.match.today, {
      phase: 'ready',
      topic: 'single',
      mine: [9, 9, 9].map(len => ({ fish: 'carp', len })),
      his: [3, 3, 3].map(len => ({ fish: 'carp', len })),
    });
  });
  must(done, 'match.measure', { at: RIVER });
  const seen = done.save().state.world.match.echo.seen;
  assert.ok(
    crowd.who.every(id => seen.includes(id)),
    seen.join(),
  );
  assert.ok(
    crowd.who.every(id => where(done, id).doing !== CROWD_DOING.match),
    '散了',
  );
  assert.ok(
    done.ask('heard').some(x => x.act === 'match'),
    '见闻里记了一笔',
  );
});

/** 比完的第二天清早：钓客在院门口。 */
function visitGame(result, how = null, host = 'he') {
  const g = sleepTo(newGame(1), 6);
  return staged(g, w => {
    w.match.echo = { day: 5, host, result, seen: [], rumor: null, how };
    Object.assign(w.people.hero, { map: 'yard', x: 9, y: 15, dir: 'down' });
    w.households.home.coins = 20;
  });
}

test('比完第二天钓客到院门口：赢了来认个门，请他喝茶得调漂的身边风物；午时后就走了', () => {
  const g = visitGame('win');
  const v = g.ask('match.visit');
  assert.equal(v.name, '何老三');
  assert.deepEqual([v.map, v.x, v.y], ['yard', MATCH_VISIT.spot.x, MATCH_VISIT.spot.y]);
  assert.equal(v.greeting, VISIT_TEXT.win.he);
  const at = { x: 9, y: 15 };
  const keys = g.ask('interaction.options', v.id, at).map(r => r.key);
  assert.deepEqual(keys, ['visit.tea', 'visit.thank']);
  must(g, 'match.visit', { at, choice: 'tea' });
  assert.equal(g.ask('home').coins, 20 - MATCH_VISIT.tea);
  assert.ok(g.ask('modifiers').list.some(m => m.id === 'fish_steady'));
  assert.equal(g.ask('match.visit').done, true);
  assert.match(refused(g, 'match.visit', { at, choice: 'thank' }), /答过/);
  wait(g, MATCH_VISIT.until - g.ask('clock').minute);
  assert.equal(g.ask('match.visit'), null);
});

test('钱胖子被识破来赔不是，留下鸡蛋；被冤枉了来讨说法；没来由的不上门', () => {
  const caught = visitGame('win', 'caught', 'qian');
  const at = { x: 9, y: 15 };
  const before = carried(caught, 'egg');
  must(caught, 'match.visit', { at, choice: 'pardon' });
  assert.equal(carried(caught, 'egg'), before + 2);
  const wronged = visitGame('lose', 'wronged', 'qian');
  assert.equal(wronged.ask('match.visit').greeting, VISIT_TEXT.wronged.qian);
  assert.match(refused(wronged, 'match.visit', { at, choice: 'tea' }), /没有这个选项/);
  assert.equal(visitGame('win', 'caught', 'he').ask('match.visit'), null);
});

test('修院子：材料不够修不了；够了修好，用掉材料、花力气，画面上多一处；老鲁不在不能请', () => {
  const g = staged(newGame(1), w => Object.assign(w.people.hero, { map: 'yard', ...HOME }));
  const at = HOME;
  const row = g.ask('yard.fix', at).find(r => r.id === 'well');
  assert.match(row.reason, /鹅卵石不够/);
  assert.match(refused(g, 'yard.fix', { id: 'well', at }), /鹅卵石不够/);
  assert.match(refused(g, 'yard.fix', { id: 'well', help: true, at }), /老鲁/);
  const rich = staged(g, w => {
    w.packs.hero.items.pebble = 3;
    w.packs.hero.items.strip = 1;
    w.packs.hero.items.shard = 1;
  });
  const energy = rich.ask('hero').energy;
  // 自己动手看持家：没修成材料还在，再试
  let fixed;
  for (let i = 0; i < 8 && !fixed?.ok; i++) {
    fixed = act(rich, 'yard.fix', { id: 'well', at }).facts.find(f => f.type === 'yard.fixed').data;
    if (!fixed.ok) assert.equal(carried(rich, 'pebble'), 3, '没修成不扣材料');
  }
  assert.equal(fixed.ok, true);
  assert.equal(fixed.line, YARD_FIX.well.done);
  assert.ok(fixed.notes.some(n => n.startsWith('桂嫂')));
  assert.equal(carried(rich, 'pebble'), 0);
  assert.equal(carried(rich, 'shard'), 1, '青瓷片只有彩头台用');
  assert.ok(rich.ask('hero').energy < energy);
  assert.deepEqual(
    rich.ask('yard.fixes', 'yard').map(f => f.id),
    ['well'],
  );
  assert.match(refused(rich, 'yard.fix', { id: 'well', at }), /已经修好/);
  // 彩头台有青瓷片就嵌一圈边
  const plat = staged(rich, w => {
    w.packs.hero.items.pebble = 1;
    w.packs.hero.items.straw = 3;
  });
  must(plat, 'yard.fix', { id: 'platform', at });
  assert.equal(
    plat.ask('yard.fixes', 'yard').find(f => f.id === 'platform').art,
    'prizePedestalPorcelain',
  );
});

test('修好的井边：晴天清早桂嫂来借水洗菜，说上话捎来一条村里的事，一天一回', () => {
  const g = staged(sleepTo(newGame(1), 2), w => {
    w.yardFix.fixed.well = 1;
    w.weather.now = 'sunny';
    w.bonds.known.gui = 10; // 认识了才先提村里的事
    w.bonds.talked.gui = 1;
    w.witness.seq = 1;
    w.witness.list = [
      {
        id: 1,
        day: 1,
        who: 'aman',
        to: 'shi',
        act: 'chat',
        map: 'tea',
        place: 'tea',
        coping: null,
        secret: false,
        knows: ['aman', 'shi', 'gui'],
        until: 30,
      },
    ];
    Object.assign(w.people.hero, { map: 'yard', x: 16, y: 18, dir: 'right' });
  });
  const gui = where(g, 'gui');
  assert.equal(gui.doing, YARD_GUESTS.well[0].doing);
  assert.deepEqual([gui.x, gui.y], [17, 18]);
  const hello = g.ask('resident.greeting', 'gui');
  assert.ok(JSON.stringify(hello).includes('借你一桶凉水'), JSON.stringify(hello));
  const out = act(g, 'talk', { to: 'gui', reply: true, at: { x: 16, y: 18 } });
  const guest = out.facts.find(f => f.type === 'yard.guest').data;
  assert.ok(
    guest.notes.some(n => n.startsWith('听来一件事')),
    guest.notes.join(),
  );
  assert.ok(g.ask('heard').some(x => x.who === 'aman' && x.to === 'shi'));
});

test('修好的檐下长凳：雨天午前有人进院躲雨，说上话留下一把野菜', () => {
  const g = staged(sleepTo(newGame(1), 2), w => {
    w.yardFix.fixed.bench = 1;
    w.weather.now = 'rain';
    Object.assign(w.people.hero, { map: 'yard', x: 11, y: 12, dir: 'left' });
  });
  wait(g, 9 * 60 + 10 - g.ask('clock').minute);
  const guest = g.ask('residents').find(p => p.doing === YARD_GUESTS.bench[0].doing);
  assert.ok(guest, '有人躲雨');
  const before = carried(g, 'shepherd');
  const out = act(g, 'talk', { to: guest.id, at: { x: 11, y: 12 } });
  assert.ok(out.facts.some(f => f.type === 'yard.guest'));
  assert.equal(carried(g, 'shepherd'), before + 1);
});

/** 院里做一锅拿手的极品蛋炒饭。 */
function aromaGame() {
  const g = staged(newGame(1), w => {
    Object.assign(w.people.hero, { map: 'yard', ...STOVE });
    w.packs.hero.items['egg.fine'] = 1;
    delete w.packs.hero.items.egg;
  });
  const meal = { items: ['rice', 'egg.fine'], method: 'fry' };
  const out = act(g, 'cook', { ...meal, log: bestFire(g, meal), at: STOVE });
  return { g, out };
}

test('满院飘香：拿手又用了极品料，爱来往的乡邻循着香到院门口；寻常料不飘', () => {
  const { g, out } = aromaGame();
  const spread = out.facts.find(f => f.type === 'aroma.spread')?.data;
  assert.ok(spread, '飘香了');
  assert.ok(spread.who.length > 0 && spread.who.length <= AROMA.max);
  assert.ok(!spread.who.includes('yun'));
  for (const id of spread.who) assert.equal(where(g, id).doing, CROWD_DOING.aroma, id);
  wait(g, AROMA.stay + 5);
  assert.ok(
    spread.who.every(id => where(g, id).doing !== CROWD_DOING.aroma),
    '候够了就散',
  );

  const plain = newGame(1);
  const meal = { items: ['rice', 'egg'], method: 'fry' };
  const at = STOVE;
  const cooked = act(
    staged(plain, w => Object.assign(w.people.hero, { map: 'yard', ...at })),
    'cook',
    {
      ...meal,
      log: bestFire(plain, meal),
      at,
    },
  );
  assert.ok(!cooked.facts.some(f => f.type === 'aroma.spread'));
});

test('门口的人：一人盛一小碗记好感、卖一碗收钱、单给一人别人不痛快；第二天还碗带回礼', () => {
  const { g, out } = aromaGame();
  const who = out.facts.find(f => f.type === 'aroma.spread').data.who;
  const atGate = staged(g, w => Object.assign(w.people.hero, GATE));
  const first = who[0];
  const rows = atGate.ask('interaction.options', first, GATE).map(r => r.key);
  assert.ok(['aroma.share', 'aroma.sell', 'aroma.one', 'aroma.keep'].every(k => rows.includes(k)));

  const one = staged(atGate, w => w);
  must(one, 'aroma.serve', { how: 'one', to: first, at: GATE });
  const o = one.ask('opinion', first).parts.map(p => p.id);
  assert.ok(o.includes('why.treated'), o.join());
  if (who.length > 1) assert.ok(one.ask('opinion', who[1]).parts.some(p => p.id === 'why.snubbed'));
  assert.match(refused(one, 'aroma.serve', { how: 'share', at: GATE }), /散了/);

  const sell = staged(atGate, w => w);
  const coins = sell.ask('home').coins;
  must(sell, 'aroma.serve', { how: 'sell', to: first, at: GATE });
  assert.ok(sell.ask('home').coins > coins);

  const share = staged(atGate, w => w);
  must(share, 'aroma.serve', { how: 'share', at: GATE });
  const got = share.save().state.world.aroma.echo.got;
  assert.ok(got.length >= who.length - 1);
  for (const id of got) assert.ok(share.ask('opinion', id).parts.some(p => p.id === 'why.tasted'));
  must(share, 'sleep');
  const next = staged(share, w => Object.assign(w.people.hero, { map: 'yard', x: 30, y: 12 }));
  const gui = got.includes('gui') ? 'gui' : null;
  if (gui) {
    const before = carried(next, AROMA_RETURN.gui[0]);
    const talk = next.dispatch('talk', { to: 'gui', at: { x: 30, y: 11 } });
    if (talk.ok) {
      assert.ok(talk.facts.some(f => f.type === 'aroma.returned'));
      assert.equal(carried(next, AROMA_RETURN.gui[0]), before + AROMA_RETURN.gui[1]);
    }
  }
});
