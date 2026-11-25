// 技能与特质的好处都在管道中，不把判断塞回种田、做饭等插件。六项给收成出彩的加减也在这里。
import { LEVEL_NAMES, SKILLS } from '../../content/growth.js';
import { CALENDAR } from '../../content/calendar.js';
import { ATTRS } from '../../content/traits.js';
import { SKILL_ODDS, ATTR_ODDS } from '../../content/quality.js';
import { FLOAT } from '../../content/fishing.js';
export const growthPerks = {
  id: 'sim.growthPerks',
  requires: ['growth', 'compute', 'people', 'body', 'persona'],
  writes: [],
  install(ctx) {
    const { growth: g, compute: K, people, body, persona } = ctx.services;
    const lv = (w, k, who) => g.level(w, k, who),
      has = (w, t, who) => g.has(w, t, who);
    // 看漂：采集本事每一级，咬钩后留给你提竿的工夫宽一点
    K.tap(
      'fish.window',
      (r, { w, who }) => {
        const l = lv(w, 'forage', who);
        if (l) K.part(r, 'skill.forage', SKILLS.forage.name + LEVEL_NAMES[l], l * FLOAT.skill);
      },
      { priority: 40 },
    );
    // 出极品的机会：这样活认的本事每一级加一点，认的那一项比底子高多少加多少
    K.tap(
      'quality.chance',
      (r, { w, who, kind }) => {
        const s = SKILL_ODDS[kind];
        const l = s ? lv(w, s.skill, who) : 0;
        if (l) K.part(r, 'skill.' + s.skill, SKILLS[s.skill].name + LEVEL_NAMES[l], l * s.n);
        const a = ATTR_ODDS[kind];
        if (!a) return;
        const v = persona.attrs(w, who).values[a.attr];
        K.part(r, 'attr.' + a.attr, ATTRS[a.attr] + v, (v - a.from) * a.n);
      },
      { priority: 40 },
    );
    K.tap(
      'xp.gain',
      (r, { w, who, skill, source }) => {
        if (skill === 'cook' && source !== 'origin' && has(w, 'handy', who))
          K.part(r, 'trait.handy', '自己动手', 1);
        if (skill === 'forage' && source === 'forage' && has(w, 'solitary', who))
          K.part(r, 'trait.solitary', '独行', 1);
        if (skill === 'sky' && has(w, 'curious', who)) K.part(r, 'trait.curious', '好问', 1);
        if (body.get(w, who)?.mood >= 85 && source !== 'origin')
          K.part(r, 'mood.high', '心情舒畅', 1);
      },
      { priority: 40 },
    );
    K.tap(
      'action.cost',
      (r, { w, who, action: a }) => {
        if (a.base <= 0) return;
        if (a.kind === 'farm' && lv(w, 'farm', who) >= 2)
          K.part(
            r,
            'skill.farm',
            '农事' + LEVEL_NAMES[lv(w, 'farm', who)],
            lv(w, 'farm', who) >= 4 ? -2 : -1,
          );
        if (a.kind === 'forage' && lv(w, 'forage', who) >= 3)
          K.part(r, 'skill.forage', '采集在行', -1);
        if (a.kind === 'craft' && lv(w, 'craft', who) >= 2)
          K.part(r, 'skill.craft', '手艺熟手', -1);
        if (has(w, 'earlybird', who) && w.clock.minute < CALENDAR.morningEnd)
          K.part(r, 'trait.earlybird', '早起的人', -1);
        if (has(w, 'rainwalker', who) && r.parts.some(p => p.id === 'weather.wet'))
          K.part(r, 'trait.rainwalker', '雨中行者', -1);
      },
      { priority: 40 },
    );
    K.tap(
      'action.yield',
      (r, { w, who, action: a }) => {
        if (a.id === 'harvest' && lv(w, 'farm', who) >= 3)
          K.part(r, 'skill.farm', '农事在行', lv(w, 'farm', who) >= 5 ? 2 : 1);
        if (a.kind === 'forage' && lv(w, 'forage', who) >= 4)
          K.part(r, 'skill.forage', '采集老练', 1);
      },
      { priority: 40 },
    );
    K.tap(
      'forage.table',
      (r, { w, who }) => {
        if (lv(w, 'forage', who) >= 2)
          r.value = r.value.map(([k, n]) => [k, k === 'shoot' ? n * 1.6 : n]);
      },
      { priority: 40 },
    );
    K.tap(
      'meal.preview',
      (r, { w, who }) => {
        const l = lv(w, 'cook', who);
        if (l) {
          r.full = Math.min(60, r.full + 2 * l);
          r.notes.push(`厨艺${LEVEL_NAMES[l]}：饱腹 +${2 * l}`);
        }
        if (l >= 2 && r.ingredients.length === 3) {
          r.servings = 3;
          r.notes.push('三样食材，做出3份');
        }
      },
      { priority: 40 },
    );
    K.tap(
      'cook.heat',
      (r, { w, who }) => {
        const l = lv(w, 'cook', who);
        if (l) K.part(r, 'skill.cook', '厨艺', 2 * l);
        if (has(w, 'hearth', who)) K.part(r, 'trait.hearth', '灶边人', 2);
      },
      { priority: 40 },
    );
    K.tap(
      'buff.uses',
      (r, { w, who }) => {
        if (lv(w, 'cook', who) >= 4) K.part(r, 'skill.cook', '厨艺老练', 1);
        if (has(w, 'hearth', who)) K.part(r, 'trait.hearth', '灶边人', 1);
      },
      { priority: 40 },
    );
    K.tap(
      'forecast.accuracy',
      (r, { w, who = people.who(w) }) => {
        if (lv(w, 'sky', who)) K.part(r, 'skill.sky', '看天', 0.08 * lv(w, 'sky', who));
      },
      { priority: 40 },
    );
    K.tap(
      'npc.forecast',
      (r, { w, who = people.who(w) }) => {
        if (has(w, 'curious', who)) K.part(r, 'trait.curious', '好问', 0.15);
      },
      { priority: 40 },
    );
    K.tap(
      'relation.gain',
      (r, { w, who, source }) => {
        if (source.startsWith('talk') && lv(w, 'social', who) >= 3)
          K.part(r, 'skill.social', '交际在行', 1);
        if (source === 'talk.life' && has(w, 'easygoing', who))
          K.part(r, 'trait.easygoing', '随和', 1);
      },
      { priority: 40 },
    );
    K.tap(
      'gossip.chance',
      (r, { w, who = people.who(w) }) => {
        if (lv(w, 'social', who) >= 2) K.part(r, 'skill.social', '交际熟手', 0.15);
      },
      { priority: 40 },
    );
    K.tap(
      'sale.price',
      (r, { w, who, item }) => {
        if (item === 'basket' && lv(w, 'craft', who) >= 3) K.part(r, 'skill.craft', '手艺在行', 6);
      },
      { priority: 40 },
    );
    K.tap(
      'rest.restore',
      (r, { w, who }) => {
        if (has(w, 'slowwarm', who)) {
          K.part(r, 'trait.slowwarm', '慢热', 4);
          r.mood += 3;
        }
      },
      { priority: 40 },
    );
    K.tap(
      'body.feel',
      (r, { w, who }) => {
        if (has(w, 'coldproof', who) && r.value < 12) K.part(r, 'trait.coldproof', '耐寒', 3);
        if (has(w, 'heatproof', who) && r.value > 26) K.part(r, 'trait.heatproof', '耐暑', -3);
      },
      { priority: 30 },
    );
    K.tap(
      'chill.chance',
      (r, { w, who }) => {
        if (has(w, 'rainwalker', who)) r.value *= 0.5;
      },
      { priority: 40 },
    );
  },
};
