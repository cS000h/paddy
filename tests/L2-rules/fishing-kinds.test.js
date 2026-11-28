// L2-15 钓鱼加料（Gemini G-09）：十三种鱼照季节、早晚、天气分开；浮漂各有各的动法；按大小有叫法；
// 咬钩时偶尔拉上来的不是鱼，提晚了偶尔挂上杂物；失物还给失主；河虾毛蟹进鱼篓；破草鞋能拆、水草团能当肥。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/port/game.js';
import {
  FISH,
  FISH_SPOTS,
  FISH_NAMES,
  FISH_THINGS,
  FISH_GRADES,
  FOUND_OWNERS,
  FLOAT,
} from '../../src/content/fishing.js';
import { ITEMS } from '../../src/content/items.js';
import { fishTable, thingTable, makeBout } from '../../src/sim/fishing-bout.js';
import { gradeOf } from '../../src/sim/fishing-fight.js';
import { newGame, must, carried, fishOnce, HOME, FISH_SPOT, FIELD, WORKBENCH } from '../helpers.js';

const NOON = { season: 0, dusk: false, weather: 'sunny', wet: false };
const share = (table, ids) =>
  table.filter(([k]) => ids.includes(k)).reduce((n, [, v]) => n + v, 0) /
  table.reduce((n, [, v]) => n + v, 0);
const weightOf = (table, id) => table.find(([k]) => k === id)?.[1] || 0;

/** 照给定的鱼定一竿：随机数一律 0.5，有鱼来咬，不出杂物。 */
const boutOf = (fish, spot = 'river') =>
  makeBout({ rand: () => 0.5, pick: () => fish, windowOf: (id, ms) => ms }, spot, NOON, {
    bait: false,
    rate: 1,
    skip: [],
    day: 1,
  });

/** 改一份存档再开局。 */
function edited(change, seed = 1) {
  const save = JSON.parse(JSON.stringify(newGame(seed).save()));
  change(save.state.world);
  return createGame({ saved: save, debug: true });
}

test('十三种鱼都有处钓；家常鱼占大半，新来的几种照季节、早晚、天气多起来', () => {
  const reachable = new Set(Object.values(FISH_SPOTS).flatMap(s => Object.keys(s.fish)));
  assert.deepEqual([...reachable].sort(), Object.keys(FISH).sort());
  const plain = {
    yard: ['bleak', 'crucian', 'yellowcat'],
    creek: ['bleak', 'crucian', 'yellowcat'],
  };
  plain.river = ['crucian', 'carp', 'grass', 'yellowcat'];
  for (const spot of Object.keys(FISH_SPOTS))
    assert.ok(share(fishTable(spot, NOON), plain[spot]) >= 0.55, `${spot} 家常鱼太少了`);
  const rainyDusk = { season: 1, dusk: true, weather: 'rain', wet: true };
  const sunnyNoon = { ...NOON, season: 1 };
  assert.ok(
    weightOf(fishTable('river', rainyDusk), 'catfish') >=
      5 * weightOf(fishTable('river', sunnyNoon), 'catfish'),
    '鲶鱼阴雨傍晚多',
  );
  assert.ok(
    weightOf(fishTable('yard', NOON), 'sleeper') >
      weightOf(fishTable('yard', sunnyNoon), 'sleeper'),
    '塘鳢春天比夏天多',
  );
  const dusk = { ...sunnyNoon, dusk: true };
  assert.ok(
    weightOf(fishTable('river', dusk), 'culter') >
      weightOf(fishTable('river', sunnyNoon), 'culter'),
  );
  assert.equal(weightOf(fishTable('yard', NOON), 'culter'), 0, '溪湾水浅，没有翘嘴');
});

test('浮漂各有各的动法：鳊鱼往上送，翘嘴漂没站稳就来抢，麦穗点得又多又急，鲶鱼不点就拖', () => {
  const biteOf = b => b.float.events.find(e => e.kind === 'bite');
  assert.equal(biteOf(boutOf('bream')).lift, true);
  assert.equal(biteOf(boutOf('crucian')).lift, false);
  assert.ok(biteOf(boutOf('culter')).at < FLOAT.first[0], '翘嘴比寻常鱼头一下动静来得早');
  const topmouth = boutOf('topmouth', 'yard').float.events.filter(e => e.kind === 'nod');
  assert.ok(topmouth.length >= 3);
  const gaps = topmouth.slice(1).map((e, k) => e.at - topmouth[k].at - topmouth[k].dur);
  assert.ok(Math.max(...gaps) < FLOAT.gap[0], '麦穗两下之间隔得比寻常的短');
  const catfish = boutOf('catfish').float.events;
  assert.deepEqual(
    catfish.map(e => e.kind),
    ['bite'],
  );
  assert.equal(catfish[0].drag, true);
});

test('各种鱼按大小有叫法；钓上来那句照叫法说', () => {
  for (const id of Object.keys(FISH)) {
    assert.equal(FISH_NAMES[id]?.names.length, 4, id);
    assert.ok(FISH_NAMES[id].huge, id);
  }
  assert.equal(FISH_NAMES.crucian.names[FISH_GRADES.indexOf(gradeOf('crucian', 9))], '老草板');
  const g = newGame(3);
  let seen = 0;
  for (let i = 0; i < 40 && seen < 6; i++) {
    if (g.ask('hero').energy < 10) must(g, 'sleep');
    const c = fishOnce(g).facts.find(f => f.type === 'fish.caught')?.data;
    if (!c) continue;
    must(g, 'pack.take', { item: c.item, n: 'all', at: HOME });
    if (c.thing) continue;
    seen++;
    assert.equal(c.folk, FISH_NAMES[c.fish].names[FISH_GRADES.findIndex(x => x.id === c.grade)]);
    if (c.first) assert.match(c.line, new RegExp(FISH[c.fish].name));
    else if (c.grade === 'huge') assert.ok(c.line.startsWith(FISH_NAMES[c.fish].huge));
    else assert.match(c.line, new RegExp(c.folk));
  }
  assert.ok(seen >= 3);
});

test('咬钩时偶尔拉上来的不是鱼（一成上下）：不量长短、不记纪录；揣着的失物不会再钓上来', () => {
  const now = { season: 0, dusk: true, weather: 'cloudy', wet: false };
  let things = 0;
  let n = 0;
  for (let seed = 1; seed <= 400; seed++) {
    let x = seed * 9301;
    const rand = () => ((x = (x * 16807) % 2147483647) / 2147483647) % 1;
    const pick = table => {
      let r = rand() * table.reduce((s, [, v]) => s + v, 0);
      return table.find(([, v]) => (r -= v) < 0)?.[0] ?? table.at(-1)[0];
    };
    const b = makeBout({ rand, pick, windowOf: (id, ms) => ms }, 'yard', now, {
      bait: false,
      rate: 1,
      skip: [],
      day: 1,
    });
    n++;
    if (FISH_THINGS[b.fish]) things++;
  }
  assert.ok(things / n > 0.03 && things / n < 0.2, `拉上来不是鱼的占了 ${things}/${n}`);
  assert.ok(thingTable('yard', now).some(([k]) => k === 'shuttle'));
  assert.ok(!thingTable('yard', now, ['shuttle']).some(([k]) => k === 'shuttle'));
  // 真钓一回：多下几竿，碰上一回不是鱼的
  let got = null;
  for (let seed = 1; seed <= 30 && !got; seed++) {
    const g = newGame(seed);
    for (let i = 0; i < 25 && !got; i++) {
      if (g.ask('hero').energy < 10) must(g, 'sleep');
      const c = fishOnce(g).facts.find(f => f.type === 'fish.caught')?.data;
      if (c?.thing) got = { g, c };
      else if (c) must(g, 'pack.take', { item: c.item, n: 'all', at: HOME });
    }
  }
  assert.ok(got, '钓了几百竿，一回都没拉上来不是鱼的');
  const { g, c } = got;
  assert.ok(Object.hasOwn(FISH_THINGS, c.fish));
  assert.equal(c.lenText, '');
  assert.ok(!c.record && !c.first);
  assert.equal(c.line.startsWith(FISH_THINGS[c.fish].line), true);
  assert.ok(carried(g, c.item) >= 1 || g.ask('home').items.some(it => it.id === c.item));
  assert.equal(g.ask('fishing', FISH_SPOT).records[c.fish], undefined);
});

test('提竿晚了，鱼跑了，钩子偶尔倒挂上水草、石头', () => {
  let junk = null;
  for (let seed = 1; seed <= 20 && !junk; seed++) {
    const g = newGame(seed);
    for (let i = 0; i < 20 && !junk; i++) {
      if (g.ask('hero').energy < 10) must(g, 'sleep');
      must(g, 'fish.cast', { at: FISH_SPOT, bait: null });
      const bite = g.ask('fishing', FISH_SPOT).bout.float.events.find(e => e.kind === 'bite');
      const t = bite ? bite.at + bite.dur + 50 : -1;
      const out = g.dispatch('fish.hook', { at: FISH_SPOT, t });
      assert.ok(out.ok, out.reason);
      const missed = out.facts.find(f => f.type === 'fish.missed').data;
      if (missed.junk) junk = { g, missed };
      else if (bite) assert.doesNotMatch(missed.line, /水草|石头|柳条|草鞋/);
    }
  }
  assert.ok(junk, '提晚了几百回，一回都没挂上东西');
  assert.ok(junk.missed.line.startsWith('浮漂沉下去又浮上来'));
  assert.ok(
    carried(junk.g, junk.missed.junk) >= 1 ||
      junk.g.ask('home').items.some(it => it.id === junk.missed.junk),
  );
});

test('木头梭子还给桂嫂：她说她那句，情分照最爱吃的那一道算；送给别人就是寻常东西', () => {
  const g = edited(w => (w.packs.hero.items.shuttle = 2));
  const back = g
    .dispatch('gift', { to: 'gui', item: 'shuttle' })
    .facts.find(f => f.type === 'gift.given').data;
  assert.equal(back.line, FOUND_OWNERS.shuttle.line);
  assert.ok(back.liked);
  const other = g
    .dispatch('gift', { to: 'aman', item: 'shuttle' })
    .facts.find(f => f.type === 'gift.given').data;
  assert.notEqual(other.line, FOUND_OWNERS.shuttle.line);
  assert.ok(back.gain > other.gain);
});

test('河虾、毛蟹跟鱼一起装进鱼篓，合起来只占一格；破草鞋拆出稻草；水草团当肥', () => {
  const g = edited(w => {
    w.packs.hero.items = { 'fish.crucian': 1, shrimp: 2, crab: 1, oldSandal: 1 };
    w.households.home.items = { waterweed: 1 };
  });
  assert.equal(g.ask('pack').used, 2, '鱼篓一格，破草鞋一格');
  assert.ok(ITEMS.shrimp.creel && ITEMS.crab.creel);
  must(g, 'homestead', { id: 'unpick', at: WORKBENCH });
  assert.equal(carried(g, 'oldSandal'), 0);
  assert.equal(carried(g, 'straw'), 2);
  const fert = g.ask('farm.detail', FIELD.x, FIELD.y)?.fert;
  if (fert === undefined) must(g, 'farm.till', FIELD);
  const before = g.ask('farm.detail', FIELD.x, FIELD.y).fert;
  must(g, 'farm.care', { ...FIELD, kind: 'manure' });
  assert.equal(g.ask('farm.detail', FIELD.x, FIELD.y).fert, before + 2);
  assert.equal(
    g.ask('home').items.some(it => it.id === 'waterweed'),
    false,
  );
});
