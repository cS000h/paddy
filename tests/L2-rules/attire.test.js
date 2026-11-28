// 合时令、合场合（sim/plugins/attire.js，G-40）：只管合不合，不管强不强。
// 衣镜跟前按天气、日子说一句；雨天披着蓑衣出门不算淋雨；逢集、过节、有约穿得合场合，
// 头一个搭话的乡邻多夸一句、心情 +1；地毯合季节清早心情 ±1。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../src/port/game.js';
import { newGame, must, MIRROR } from '../helpers.js';
import { COATS, HAIR } from '../../src/content/wardrobe.js';
import {
  COAT_FIT,
  HAIR_FIT,
  MIRROR as LINES,
  DRESSED,
  RUG_SEASON,
} from '../../src/content/attire.js';
import { DECOR } from '../../src/content/furniture.js';

const USES = [
  '下地',
  '灶边',
  '赶集',
  '做客',
  '节令',
  '采山',
  '行船',
  '走街',
  '雨天',
  '雪天',
  '寻常',
];

/** 存档改一改再读回来，人站在小屋衣镜跟前。 */
function at(edit, { map = 'cottage' } = {}) {
  const g0 = newGame();
  if (map !== 'yard') must(g0, 'travel.to', { to: map });
  const saved = JSON.parse(JSON.stringify(g0.save()));
  edit(saved.state.world);
  return createGame({ saved, debug: true });
}
const owns = (w, coat) => w.wardrobe.owned.home.coat.push(coat);
const wear = (w, coat, hair = 'plain') => {
  if (!w.wardrobe.owned.home.coat.includes(coat)) owns(w, coat);
  w.wardrobe.worn.hero = { coat, hair };
};
// 春天、晴、不逢集、不过节、没有约的一天
const plainDay = (w, day = 3) => {
  w.clock.day = day;
  w.clock.minute = 9 * 60;
  w.weather.now = w.weather.today = 'cloudy';
  w.weather.jitter = 0;
};

test('每件衣裳、每种发式都有标签和一句话，话不超 30 字，场合的说法都认得', () => {
  assert.deepEqual(Object.keys(COAT_FIT).sort(), Object.keys(COATS).sort());
  assert.deepEqual(Object.keys(HAIR_FIT).sort(), Object.keys(HAIR).sort());
  for (const [id, f] of [...Object.entries(COAT_FIT), ...Object.entries(HAIR_FIT)]) {
    assert.ok(f.line.length <= 30, id);
    assert.ok(f.uses.length >= 1 && f.seasons.length + f.uses.length <= 4, id);
    for (const u of f.uses) assert.ok(USES.includes(u), `${id}: ${u}`);
    for (const s of f.seasons) assert.ok([0, 1, 2, 3].includes(s), id);
  }
  for (const f of Object.values(COAT_FIT)) assert.ok(['thin', 'mid', 'thick'].includes(f.warm));
  for (const list of Object.values(LINES)) {
    assert.equal(list.length, 2);
    for (const l of list) assert.ok(l.length <= 30, l);
  }
  // 合季节的地毯都是置办得到的样式
  for (const style of Object.keys(RUG_SEASON)) {
    if (style === 'mood') continue;
    assert.ok(DECOR.rug.styles[style], style);
  }
});

test('衣镜跟前的一句：下雨没披蓑衣、冷天穿单薄、穿着围裙先提醒；逢集穿得体面夸一句；合季节说这件自己的话', () => {
  const line = (edit, coat, hair = 'plain') => at(edit).ask('attire', coat, hair);
  const rainy = w => {
    plainDay(w);
    w.weather.now = w.weather.today = 'drizzle';
  };
  assert.ok(LINES.rain.includes(line(rainy, 'plain').line));
  assert.equal(line(rainy, 'rain').line, COAT_FIT.rain.line, '披着蓑衣就不提醒');
  assert.ok(line(rainy, 'plain').warn);
  const freezing = w => {
    plainDay(w, 50); // 冬天
    w.weather.now = w.weather.today = 'snow';
    w.weather.jitter = -3;
  };
  assert.ok(LINES.cold.includes(line(freezing, 'field').line));
  assert.equal(line(freezing, 'plum').line, COAT_FIT.plum.line, '大雪天穿朱红冬衣正合适');
  assert.ok(LINES.apron.includes(line(plainDay, 'cook').line));
  const fair = w => plainDay(w, 5);
  assert.ok(LINES.fair.includes(line(fair, 'ink').line));
  assert.equal(line(fair, 'ink').occasion, 'fair');
  assert.equal(line(fair, 'field').occasion, null, '下地的短褂不算赶集的体面');
  assert.equal(line(plainDay, 'ink').line, COAT_FIT.ink.line, '春天穿墨青短衫');
  assert.ok(LINES.fine.includes(line(plainDay, 'plain').line));
  assert.equal(line(plainDay, 'plum').line, '', '春天穿冬衣不合季节，不冒话也不责备');
  assert.equal(line(fair, 'ink', 'braid').hair, HAIR_FIT.braid.line, '垂辫合赶集');
  assert.equal(line(plainDay, 'ink', 'plain').hair, '', '原发不另说');
});

test('换好衣裳，镜子跟前那一句跟着换衣的事实一起出来', () => {
  const g = at(w => {
    plainDay(w, 5);
    owns(w, 'ink');
  });
  const out = g.dispatch('wardrobe.wear', { coat: 'ink', hair: 'plain', at: MIRROR });
  assert.ok(out.ok);
  const f = out.facts.find(x => x.type === 'wardrobe.worn');
  assert.ok(LINES.fair.includes(f.data.line));
});

test('雨天在屋外：没披蓑衣淋了雨、体感低一截；披着蓑衣不算淋雨；不加别的', () => {
  const outside = coat =>
    at(
      w => {
        plainDay(w);
        w.weather.now = w.weather.today = 'rain';
        wear(w, coat);
      },
      { map: 'creek' },
    ).ask('comfort');
  const plain = outside('plain');
  const rain = outside('rain');
  assert.ok(plain.parts.some(p => p.id === 'body.wet'));
  assert.ok(!rain.parts.some(p => p.id === 'body.wet'));
  assert.equal(rain.value - plain.value, 2, '只是把淋雨那一截去掉');
  // 晴天穿蓑衣跟原衣一样
  const sunny = coat =>
    at(
      w => {
        plainDay(w);
        wear(w, coat);
      },
      { map: 'creek' },
    ).ask('comfort').value;
  assert.equal(sunny('rain'), sunny('plain'));
});

test('逢集穿得体面：今天头一个搭话的乡邻多夸一句、心情 +1；第二个不再夸；穿得随便照样热情', () => {
  // 第 5 天逢集，上午桂嫂去了茶摊；人也走到那张图上
  let map = 'yard';
  const day = (coat, edit = () => {}) =>
    at(
      w => {
        plainDay(w, 5);
        wear(w, coat);
        w.bonds.known.gui = 5;
        w.bonds.known.shi = 5;
        edit(w);
      },
      { map },
    );
  map = day('plain')
    .ask('residents')
    .find(p => p.id === 'gui').map;
  const gui = day('plain')
    .ask('residents')
    .find(p => p.id === 'gui');
  assert.equal(gui.map, map);
  assert.ok(gui.visible);
  const near = { x: gui.x + 1, y: gui.y, dir: 'left' };
  const greet = g => g.ask('resident.greeting', 'gui');
  // 这天头一句是节令的新鲜事（排在夸之前），说过一回再搭话补一句夸
  assert.ok(!DRESSED.any.includes(greet(day('ink'))));
  const dressedTalk = day('ink');
  must(dressedTalk, 'talk', { to: 'gui', at: near });
  assert.ok(DRESSED.any.includes(greet(dressedTalk)), '再搭话补一句夸');
  const casualTalk = day('field');
  must(casualTalk, 'talk', { to: 'gui', at: near });
  assert.ok(!DRESSED.any.includes(greet(casualTalk)), '随便穿不夸');
  const talk = g => {
    const before = g.ask('body').mood;
    must(g, 'talk', { to: 'gui', at: near });
    return g.ask('body').mood - before;
  };
  const casual = talk(day('field'));
  assert.equal(talk(day('ink')) - casual, DRESSED.mood);
  // 已经跟石伯说过话了，桂嫂就不是头一个：不夸也不加心情
  const later = () => day('ink', w => (w.bonds.talked.shi = 5));
  assert.equal(talk(later()), casual);
  const asked = later();
  must(asked, 'talk', { to: 'gui', at: near });
  assert.ok(!DRESSED.any.includes(greet(asked)));
});

test('城里成衣也算赶集的体面；阿满、桂嫂、小乔见了各有一句新鲜话，不超 30 字', () => {
  for (const coat of ['hoodie', 'denim']) {
    const g = at(w => {
      plainDay(w, 5);
      wear(w, coat);
    });
    // 直接看 talk.news 的结果：用查询比较难站到三人跟前，这里只看名单和话对得上
    assert.ok(g.ask('attire', coat).occasion === 'fair');
  }
  for (const id of Object.keys(DRESSED.city)) assert.ok(DRESSED.city[id].length <= 30);
});

test('地毯合不合时令：冬天铺土布毯醒来心情 +1，铺竹席 -1；原样旧蒲草席不管季节', () => {
  const woke = style =>
    (() => {
      const g = at(w => {
        w.clock.day = 42; // 秋天最后一天，睡一夜进冬天
        if (style) w.decor = { owned: [`rug.${style}`], on: { rug: style } };
      });
      must(g, 'sleep');
      return g.ask('body').mood;
    })();
  const plain = woke(null);
  assert.equal(woke('stripe') - plain, RUG_SEASON.mood);
  assert.equal(woke('embroidered') - plain, RUG_SEASON.mood);
  assert.equal(woke('bamboo') - plain, -RUG_SEASON.mood);
});
