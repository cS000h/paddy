// 乡邻此刻在哪儿、在做什么。作息表在 content/people.js（ROUTINES），这里只判断今天是什么情形。
// 人物线、节令要临时改谁去哪儿，接 'resident.positions' 计算管道，不改这张表。
import {
  PEOPLE,
  ON_MAP,
  ROUTINES,
  ROUTINE_DAY,
  DOING,
  RAIN_DOING,
  mapOfPlace,
} from '../../content/people.js';
import { MAPS, spot } from '../../content/maps/index.js';
import { dateOf, isFairDay } from '../../content/calendar.js';

const SLOT_WORDS = ['清晨', '午前', '午后', '傍晚'];

/** 一天里的第几段（0–3）。 */
const slotOf = minute => {
  const slot = ROUTINE_DAY.slots.findLastIndex(from => minute >= from);
  return Math.max(0, slot);
};

/** 按作息表，某人在这种情形下、这一段时间去哪儿。 */
const placeOf = (id, situation, slot) =>
  ROUTINES[id].find(rule => (rule.when || []).every(tag => situation[tag])).go[slot];

export const residents = {
  id: 'sim.residents',
  provides: ['residents'],
  requires: ['queries', 'weather', 'compute'],
  writes: [],
  install(ctx) {
    const { queries, weather, compute } = ctx.services;

    const situationOf = w => ({
      wet: weather.has(w, 'wet'),
      heavy: weather.has(w, 'heavy'),
      fog: weather.has(w, 'fog'),
      winter: dateOf(w.clock.day).season === 3,
      fair: isFairDay(w.clock.day),
    });

    /** 第 slot 段（夜里传 null）各人去哪儿：{人: 地方 | null}。 */
    function placesAt(w, slot) {
      const situation = situationOf(w);
      const places = Object.fromEntries(
        ON_MAP.map(id => [
          id,
          slot === null ? ROUTINE_DAY.stay[id] || null : placeOf(id, situation, slot),
        ]),
      );
      return compute.run('resident.positions', { w, slot }, { value: places, parts: [] }).value;
    }

    /** 一个人今天一天的去处，用他自己的话说：“清晨在田里，午前去樟树茶摊，……”。 */
    function schedule(w, id) {
      return SLOT_WORDS.map((word, slot) => {
        const place = placesAt(w, slot)[id];
        const name = !place
          ? '家里'
          : place === 'yard'
            ? id === 'gui'
              ? '自己家'
              : '你院子边'
            : place === 'field'
              ? '田里'
              : MAPS[mapOfPlace(place)].name;
        return `${word}${slot === 0 ? '在' : '去'}${name}`;
      }).join('，');
    }

    function positions(w) {
      const minute = w.clock.minute;
      const situation = situationOf(w);
      const night = minute >= ROUTINE_DAY.home;
      const r = { value: placesAt(w, night ? null : slotOf(minute)) };
      return ON_MAP.map(id => {
        const place = r.value[id];
        if (!place)
          return {
            id,
            name: PEOPLE[id].name,
            map: null,
            place: null,
            x: 0,
            y: 0,
            dir: 'down',
            visible: false,
            doing: '回家了',
          };
        const map = mapOfPlace(place);
        return {
          id,
          name: PEOPLE[id].name,
          map,
          place,
          ...spot(MAPS[map], `${id}.${place}`),
          visible: true,
          doing: (situation.wet && RAIN_DOING[id]?.[place]) || DOING[id][place],
        };
      });
    }

    queries.define('residents', positions);
    ctx.provide('residents', Object.freeze({ positions, schedule, slotOf }));
  },
};
