// 乡邻：说话、送东西、第二天收到回礼。说的话照《稻间》0.12（content/talk-lines.js、gift-lines.js），
// 怎么挑那一句在 sim/talk.js；各人今天的心情在 moods 插件。
//   talk {to, topic?, at} → person.talked {to, topic, first, gained, gain, line, favorite}
//       topic：life 聊聊日常（默认，见面就聊，聊几遍都行）、news 问问近况、plan 问问今天的安排、sky 聊聊天色；
//       后三样每人每天各问一回。每人每天头一回说话熟悉 +1，对方也高兴一点。
//   gift {to, item | dish, at} → gift.given {to, item, dish, liked, favorite, gain, line}
//       每人每天收一回。东西：合他心意 +3，否则 +2。饭菜：他最爱吃的那道 +4（格外高兴），
//       合口味 +3，平常 +2，夹生烧糊的 +1（心意到了）。
//   day.started → gift.returned {from, item, n}   昨天收了东西的人留下回礼和便条
import { is, check } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import {
  PEOPLE,
  ON_MAP,
  LINES,
  RETURN_GIFT,
  AFTER_RETURN,
  SHI_FIRST_FIELD,
  FESTIVE,
  ROUTINE_DAY,
} from '../../content/people.js';
import { GREETING_REPLY } from '../../content/encounters.js';
import { TOPICS, tierOf, tierWord } from '../../content/talk.js';
import { TIER_OPINION } from '../../content/opinion.js';
import { GIFT_DISH, GIFT_ITEM, GIFT_FAVORITE, GIFT_SPOILED } from '../../content/gift-lines.js';
import { ITEMS, CROPS, SOIL } from '../../content/items.js';
import { dateOf } from '../../content/calendar.js';
import { giftable } from '../../content/pantry.js';
import { withGesture, lifeLine, chatLine, newsLine, skyLine, planLine } from '../talk.js';
import { favoriteDue, favoriteLine, mark } from '../talk.js';

const homeGrown = item => Object.values(CROPS).some(crop => crop.produce === item);
// 开场和应答有时只差引号前的动作；同一句话应当只说一次。
const spoken = line => line.slice(Math.max(0, line.indexOf('“')));
const sameSpeech = (a, b) => spoken(a) === spoken(b);
const SPOILED = ['raw', 'burnt'];

export const social = {
  id: 'sim.social',
  provides: ['social'],
  requires: [
    'schema',
    'commands',
    'reactions',
    'queries',
    'core',
    'people',
    'pack',
    'kitchen',
    'compute',
    'body',
    'comfort',
    'weather',
    'moods',
    'residents',
    'land',
  ],
  writes: ['bonds'],
  install(ctx) {
    const { schema, commands, reactions, queries, core, people, pack, kitchen, compute, body } =
      ctx.services;
    const { comfort, weather, moods } = ctx.services;

    schema.slice('bonds', {
      initial: () => ({
        known: Object.fromEntries(ON_MAP.map(id => [id, 0])), // 熟悉程度
        talked: {}, // 这个人上一次跟你说话是哪天
        gifted: {}, // 上一次收你东西是哪天
        owed: [], // 欠着的回礼：[{from, day}]
        asked: {}, // 今天问过他哪几样（news / plan / sky），清早清空
        favs: {}, // 他跟你说过最爱吃什么了
      }),
      validate: b =>
        check([
          [ON_MAP.every(id => is.int(b.known[id], 0, 999)), 'known'],
          [is.obj(b.talked) && is.obj(b.gifted), 'daily'],
          [
            is.arr(b.owed, 20) &&
              b.owed.every(o => Object.hasOwn(RETURN_GIFT, o.from) && is.int(o.day, 1)),
            'owed',
          ],
          [
            is.obj(b.asked) &&
              Object.entries(b.asked).every(
                ([id, list]) =>
                  ON_MAP.includes(id) &&
                  is.arr(list, 4) &&
                  list.every(t => Object.hasOwn(TOPICS, t)),
              ),
            'asked',
          ],
          [is.obj(b.favs) && Object.keys(b.favs).every(id => ON_MAP.includes(id)), 'favs'],
        ]),
    });

    const target = (w, input) => {
      if (!ON_MAP.includes(input.to)) refuse('这个人不在附近');
      people.place(w, input.at);
      const p = ctx.services.residents.positions(w).find(p => p.id === input.to);
      if (!p.visible || p.map !== people.me(w).map) refuse('这个人不在附近');
      return p;
    };

    /** 熟悉加 n（经过 relation.gain 管道），对方也跟着高兴一点；返回实际加了多少。 */
    function relate(w, to, n, source) {
      const q = compute.run(
        'relation.gain',
        { w, who: people.who(w), source },
        { value: n, parts: [] },
      );
      const before = w.bonds.known[to];
      w.bonds.known[to] = Math.min(999, before + Math.max(0, q.value));
      if (q.parts.some(p => p.id === 'buff.guest')) body.useBuff(w, people.who(w), 'guest');
      const gain = w.bonds.known[to] - before;
      if (gain > 0) moods.cheer(w, to, Math.min(6, gain * 2));
      return gain;
    }

    /** 说话那一刻的情形（content/talk-lines.js 开头写着每一样是什么）。 */
    function context(w, to, person, walking) {
      const who = people.who(w);
      const feel = comfort.sense(w, who);
      const v = body.get(w, who);
      return {
        place: person.place,
        walking,
        waiting: person.waiting,
        band: moods.band(w, to).id,
        wx: w.weather.now,
        wet: weather.has(w, 'wet'),
        hot: ['hot', 'scorching'].includes(feel.id),
        cold: ['cold', 'freezing'].includes(feel.id),
        season: dateOf(w.clock.day).season,
        slot: ctx.services.residents.slotOf(w.clock.minute),
        night: w.clock.minute >= ROUTINE_DAY.home,
        rel: tierOf(w.bonds.known[to]),
        mood: v.mood,
        chill: feel.chill,
        hungry: v.hunger < 25,
        field: ctx.services.land.fieldSummary(w),
        noticed: [],
        flag: () => false,
      };
    }

    /** 按话题挑一句。返回 {line, favorite}（这回说起了最爱吃的菜就带上菜名）。 */
    function say(w, to, topic, c) {
      const day = w.clock.day;
      const key = day + c.slot + (c.night ? 4 : 0) + mark(to + topic);
      const band = c.band;
      if (topic === 'plan')
        return { line: planLine(to, ctx.services.residents.schedule(w, to), c) };
      if (topic === 'sky')
        return { line: skyLine(to, day, w.weather.tomorrow, dateOf(day + 1).season) };
      if (topic === 'news') return { line: withGesture(to, band, newsLine(to, c, day), key) };
      if (!c.night && !c.walking && !c.waiting && favoriteDue(to, c, day, w.bonds.favs[to])) {
        w.bonds.favs[to] = true;
        return {
          line: withGesture(to, band, favoriteLine(to), key),
          favorite: PEOPLE[to].favorite,
        };
      }
      const line = lifeLine(to, c, key);
      return { line: c.night ? line : withGesture(to, band, line, key) };
    }

    function firstWords(w, to, c) {
      const atField =
        to === 'shi' &&
        !c.walking &&
        c.field.planted &&
        c.field.growth === 0 &&
        c.field.water <= SOIL.soggy &&
        c.place === 'field';
      const soil = c.field.water < SOIL.wet ? 'dry' : 'wet';
      const key = w.clock.day + c.slot + mark(to);
      const greeting = lifeLine(to, c, key, true);
      return {
        line: atField
          ? SHI_FIRST_FIELD[soil]
          : c.night
            ? greeting
            : withGesture(to, c.band, greeting, key),
      };
    }

    function openingLine(w, to, c) {
      if (!w.bonds.known[to] && w.bonds.talked[to] === undefined) return firstWords(w, to, c).line;
      if (w.bonds.talked[to] !== w.clock.day && w.bonds.gifted[to] === w.clock.day - 1)
        return AFTER_RETURN[to];
      return lifeLine(to, c, w.clock.day + c.slot + mark(to));
    }

    /**
     * 招呼过后对方接的话，不复述开场。开场常是工位上那一句固定的话，只用一句回应动作的话
     * 天天一样；所以白天先拣一句 0.12 的家常话接着聊，接不上再用回应动作。
     * 头一回见面和夜里隔着墙，只用回应。
     */
    function replyTo(w, to, c, opening, first) {
      if (!first && !c.night) {
        const key = w.clock.day + c.slot + mark(to + 'reply');
        const chat = chatLine(to, c, key);
        if (chat && !sameSpeech(opening, chat)) return withGesture(to, c.band, chat, key);
      }
      return GREETING_REPLY[to][first ? 0 : 1];
    }

    queries.define('resident.greeting', (w, to, walking = false) => {
      const person = ctx.services.residents.positions(w).find(p => p.id === to);
      if (!person?.visible || person.map !== people.me(w).map) return null;
      const c = context(w, to, person, walking);
      return openingLine(w, to, c);
    });

    commands.register('talk', ({ draft, input, fact }) => {
      const w = draft.world;
      const person = target(w, input);
      const b = w.bonds;
      const to = input.to;
      const topic = input.topic ?? 'life';
      if (!Object.hasOwn(TOPICS, topic)) refuse('没有这个话题');
      const c = context(w, to, person, input.walking === true);
      if (topic === 'plan' && c.night) refuse('天都黑了，明天的事明天再问吧。');
      const asked = b.asked[to] || [];
      if (topic !== 'life' && asked.includes(topic)) refuse('这个话题今天已经聊过了，明天再问吧。');
      const first = b.known[to] === 0 && b.talked[to] === undefined;
      const opening = input.reply === true && topic === 'life' ? openingLine(w, to, c) : null;
      const gained = b.talked[to] !== w.clock.day;
      const gain = gained ? relate(w, to, 1, topic === 'life' ? 'talk.life' : 'talk') : 0;
      b.talked[to] = w.clock.day;
      if (topic !== 'life') b.asked[to] = [...asked, topic];
      // 照 0.12：挑哪句话看的是这回说话之前熟到哪一层
      let said;
      if (first && topic === 'life') said = firstWords(w, to, c);
      else if (gained && topic === 'life' && b.gifted[to] === w.clock.day - 1) {
        said = { line: AFTER_RETURN[to] };
      } else said = say(w, to, topic, c);
      if (opening && sameSpeech(opening, said.line))
        said = { line: replyTo(w, to, c, opening, first) };
      fact('person.talked', {
        who: people.who(w),
        to,
        topic,
        first,
        gained,
        gain,
        line: said.line,
        favorite: said.favorite || null,
      });
    });

    commands.register('gift', ({ draft, input, fact }) => {
      const w = draft.world;
      target(w, input);
      const b = w.bonds;
      const to = input.to;
      const person = PEOPLE[to];
      if (!input.dish && !giftable(input.item)) return { ok: false, reason: '这个不好拿去送人' };
      if (b.gifted[to] === w.clock.day)
        return { ok: false, reason: `${person.name}今天已经收过了，改天再送` };
      const dish = input.dish ? kitchen.take(w, people.who(w), input.dish) : null;
      if (!dish) pack.use(w, people.who(w), input.item, 1, `送给${person.name}`);
      const band = moods.band(w, to).id;
      const key = w.clock.day + mark(to + (dish?.base || input.item));
      let liked,
        favorite = false,
        value,
        line;
      if (dish) {
        favorite = person.favorite === dish.base;
        const spoiled = SPOILED.includes(dish.quality);
        liked = !spoiled && (favorite || dish.buff === person.likes);
        value = spoiled ? 1 : favorite ? 4 : liked ? 3 : 2;
        line = spoiled
          ? GIFT_SPOILED[to]
          : favorite
            ? GIFT_FAVORITE[to]
            : withGesture(to, band, GIFT_DISH[to][liked ? 'yes' : 'no'](dish.name), key);
        if (favorite) {
          moods.cheer(w, to, 8);
          b.favs[to] = true;
        }
      } else {
        // 合心意的东西和过节的吃食，对方格外高兴；自家地里长的，有它自己的一句话
        liked = person.treats.includes(input.item) || FESTIVE.includes(input.item);
        value = liked ? 3 : 2;
        const name = ITEMS[input.item].name;
        line = liked
          ? GIFT_ITEM[to].yes(name)
          : homeGrown(input.item)
            ? LINES[to].gift.replace('{n}', name)
            : GIFT_ITEM[to].no(name);
        line = withGesture(to, band, line, key);
      }
      b.gifted[to] = w.clock.day;
      const gain = relate(w, to, value, 'gift');
      b.owed.push({ from: to, day: w.clock.day + 1 });
      fact('gift.given', {
        to,
        item: input.item || null,
        dish: dish?.base || null,
        who: people.who(w),
        liked,
        favorite,
        gain,
        line,
      });
      return undefined;
    });

    reactions.on(
      'day.started',
      (s, e, emit) => {
        const w = s.world;
        w.bonds.asked = {};
        for (const o of w.bonds.owed.filter(x => x.day <= w.clock.day)) {
          const g = RETURN_GIFT[o.from];
          const where = pack.deliver(w, people.who(w), g.item, g.n, `${PEOPLE[o.from].name}的回礼`);
          core.post(w, { title: `${PEOPLE[o.from].name}的回礼`, text: g.text });
          emit('gift.returned', { from: o.from, item: g.item, n: g.n, where });
        }
        w.bonds.owed = w.bonds.owed.filter(x => x.day > w.clock.day);
      },
      { priority: 40 },
    );

    // 好感（sim/plugins/opinion.js）：村民看主角，熟到哪一层加多少。
    compute.tap('opinion', (r, { w, from, to }) => {
      if (to !== people.who(w) || !ON_MAP.includes(from)) return;
      const n = w.bonds.known[from];
      compute.part(r, 'known', '熟悉：' + tierWord(n), TIER_OPINION[tierOf(n)]);
    });

    queries.define('bonds', w =>
      ON_MAP.map(id => {
        const mood = moods.band(w, id);
        return {
          id,
          name: PEOPLE[id].name,
          role: PEOPLE[id].role,
          known: w.bonds.known[id],
          tier: tierOf(w.bonds.known[id]),
          mood: mood.id,
          moodWord: mood.word,
          favorite: w.bonds.favs[id] ? PEOPLE[id].favorite : null,
          asked: w.bonds.asked[id] || [],
          talkedToday: w.bonds.talked[id] === w.clock.day,
          giftedToday: w.bonds.gifted[id] === w.clock.day,
        };
      }),
    );

    ctx.provide(
      'social',
      Object.freeze({
        relate: ctx.own((w, to, n, source) => {
          const gain = relate(w, to, n, 'talk');
          core.log(w, people.who(w), 'relation:' + to, gain, source);
        }),
      }),
    );
  },
};
