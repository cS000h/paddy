// 合时令、合场合（G-40）：衣装发式、地毯合不合今天的季节、天气和日子。只管「合不合」，不管「强不强」。
// 不存东西，全靠现有的数据算（身上穿的、今天的天、过不过节、有没有约、逢不逢集、铺的哪种地毯）。
//   计算管道 'wardrobe.line'：衣镜跟前换好衣裳，说的那一句（衣镜跟前 8 种情况，或这件衣裳自己那一句）
//   计算管道 'body.dry'：雨天披着蓑衣出门，不算「淋了雨」，也不因淋雨着凉
//   计算管道 'talk.news'：节令、有约、逢集那天穿得合场合，今天头一个搭话的乡邻多夸一句
//     （头一句让别的新鲜事占了，就在 'talk.aside' 里，再搭话时补上）
//   person.talked：同上那一回，心情 +1（一天只有头一个搭话的人算，所以不用记）
//   清早：铺的地毯合这一季，心情 +1；反季 -1（跟床铺凉席、厚棉被一个路数）
//   查询 attire(coat?, hair?) → {line, hair, fits, occasion}：衣镜预览时这一身会冒的话
// 拿掉这个插件：衣装照样能换，只是没有这些话；蓑衣不再挡雨，地毯不挑季节。
import {
  COAT_FIT,
  HAIR_FIT,
  MIRROR,
  MIRROR_ORDER,
  DRESSED,
  RUG_SEASON,
} from '../../content/attire.js';
import { FEEL_BANDS } from '../../content/weather.js';
import { dateOf, isFairDay } from '../../content/calendar.js';
import { PEOPLE } from '../../content/people.js';

// 场合跟日子：今天过节、有约、逢集各算哪一样
const OCCASIONS = [
  ['feast', '节令'],
  ['guest', '做客'],
  ['fair', '赶集'],
];

export const attire = {
  id: 'sim.attire',
  requires: ['reactions', 'compute', 'queries', 'people', 'weather', 'body', 'almanac'],
  writes: [],
  install(ctx) {
    const { reactions, compute, queries, people, weather, body, almanac } = ctx.services;
    const band = t => FEEL_BANDS.find(r => t <= Number(r[0]))[1];
    const wornOf = (w, who) => w.wardrobe?.worn?.[who] || { coat: 'plain', hair: 'plain' };

    /** 今天是什么日子：过节、有约、逢集（可能同时几样，按 OCCASIONS 的先后）。 */
    const today = w => {
      const on = {
        feast: !!almanac.feast(w),
        guest: w.visits?.active?.day === w.clock.day,
        fair: isFairDay(w.clock.day),
      };
      return OCCASIONS.filter(([id]) => on[id]);
    };
    /** 这件（衣裳或发式）合不合今天：合这一季，或合今天的天（雨天、雪天）。 */
    const fitsDay = (w, fit) => {
      const season = dateOf(w.clock.day).season;
      if (fit.seasons.includes(season)) return true;
      if (fit.uses.includes('雨天') && weather.has(w, 'wet') && !weather.has(w, 'snow'))
        return true;
      if (fit.uses.includes('雪天') && weather.has(w, 'snow')) return true;
      return false;
    };
    /** 今天有场合、这件衣裳又合那个场合：返回场合 id，否则 null。 */
    const dressedFor = (w, coat) => {
      const fit = COAT_FIT[coat];
      return today(w).find(([, word]) => fit.uses.includes(word))?.[0] || null;
    };

    /** 衣镜跟前的一句：先看要不要提醒（下雨、冷、热、围裙），再看场合，最后看这件合不合季节。 */
    function mirror(w, coat, hair) {
      const fit = COAT_FIT[coat];
      const t = band(weather.view(w).temperature);
      const wet = weather.has(w, 'wet') && !weather.has(w, 'snow');
      const when = {
        rain: wet && coat !== 'rain',
        cold:
          (['cold', 'freezing'].includes(t) && fit.warm === 'thin') ||
          (t === 'freezing' && fit.warm !== 'thick'),
        hot: ['hot', 'scorching'].includes(t) && fit.warm === 'thick' && !wet,
        apron: coat === 'cook',
        feast: dressedFor(w, coat) === 'feast',
        guest: dressedFor(w, coat) === 'guest',
        fair: dressedFor(w, coat) === 'fair',
      };
      const pick = list => list[w.clock.day % list.length];
      const key = MIRROR_ORDER.find(k => when[k]);
      const fits = fitsDay(w, fit);
      let line = '';
      if (key) line = pick(MIRROR[key]);
      else if (fits) line = coat === 'plain' ? pick(MIRROR.fine) : fit.line;
      const h = HAIR_FIT[hair];
      const hairFits =
        fitsDay(w, h) ||
        h.uses.includes('寻常') ||
        today(w).some(([, word]) => h.uses.includes(word));
      return {
        line,
        hair: hairFits && hair !== 'plain' ? h.line : '',
        fits,
        warn: ['rain', 'cold', 'hot', 'apron'].includes(key),
        occasion: dressedFor(w, coat),
      };
    }

    compute.tap('wardrobe.line', (r, { w, coat, hair }) => {
      r.value = mirror(w, coat, hair).line;
    });

    compute.tap('body.dry', (r, { w, who }) => {
      if (wornOf(w, who).coat === 'rain') compute.part(r, 'attire.rain', '披着蓑衣', 1);
    });

    // 今天还没跟哪位乡邻说过话
    const firstTalk = w => !Object.values(w.bonds?.talked || {}).includes(w.clock.day);
    const praise = (w, to, k = 0) => {
      const { coat } = wornOf(w, people.who(w));
      if (!dressedFor(w, coat)) return '';
      if (COAT_FIT[coat].city && DRESSED.city[to] && !k) return DRESSED.city[to];
      const i = w.clock.day + Object.keys(PEOPLE).indexOf(to) + k;
      return DRESSED.any[i % DRESSED.any.length];
    };
    // 别的新鲜事（过客、比鱼、节令、成就）先提，这边排在最后
    compute.tap(
      'talk.news',
      (r, { w, to }) => {
        if (r.value || !firstTalk(w)) return;
        r.value = praise(w, to);
      },
      { priority: 95 },
    );
    // 头一句让别的新鲜事占了：今天头一个说上话的那位，再搭话时补一句夸
    compute.tap(
      'talk.aside',
      (r, { w, to }) => {
        if (r.value) return;
        const today = Object.entries(w.bonds.talked).filter(([, d]) => d === w.clock.day);
        if (today.length === 1 && today[0][0] === to) r.value = praise(w, to, 1);
      },
      { priority: 95 },
    );
    reactions.on(
      'person.talked',
      (s, e) => {
        const w = s.world;
        if (!e.data.gained) return;
        // 刚说过的这一位是今天头一个
        const talked = Object.values(w.bonds.talked).filter(d => d === w.clock.day).length;
        if (talked !== 1) return;
        const who = people.who(w);
        if (dressedFor(w, wornOf(w, who).coat)) body.mood(w, who, DRESSED.mood, DRESSED.why);
      },
      { priority: 60 },
    );

    reactions.on('day.started', s => {
      const w = s.world;
      const rug = RUG_SEASON[w.decor?.on?.rug];
      if (!rug) return;
      const season = dateOf(w.clock.day).season;
      const id = people.who(w);
      if (rug.fit.includes(season)) body.mood(w, id, RUG_SEASON.mood, rug.good);
      else if (rug.miss.includes(season)) body.mood(w, id, -RUG_SEASON.mood, rug.bad);
    });

    queries.define('attire', (w, coat, hair) => {
      const worn = wornOf(w, people.who(w));
      const c = Object.hasOwn(COAT_FIT, coat) ? coat : worn.coat;
      const h = Object.hasOwn(HAIR_FIT, hair) ? hair : worn.hair;
      return mirror(w, c, h);
    });
  },
};
