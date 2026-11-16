import { PEOPLE, ON_MAP, scheduleAt, DOING, RAIN_DOING } from '../../content/people.js';
import { MAPS, spot } from '../../content/maps/index.js';
import { dateOf } from '../../content/calendar.js';
// 地点选择沿用0.12；人物线与节令的作息覆写留给后续插件走管道。
export const residents = {
  id: 'sim.residents',
  provides: ['residents'],
  requires: ['queries', 'weather', 'compute'],
  writes: [],
  install(ctx) {
    const { queries, weather, compute } = ctx.services;
    function positions(w) {
      const minute = w.clock.minute,
        slot = Math.max(0, Math.min(3, Math.floor((minute - 360) / 180))),
        wet = weather.has(w, 'wet'),
        heavy = weather.has(w, 'heavy'),
        winter = dateOf(w.clock.day).season === 3;
      const places =
        minute >= 1200
          ? { aman: null, gui: 'yard', shi: null, qiao: null, zhou: null, yun: null }
          : {
              aman: heavy && slot > 0 ? 'tea' : ['field', 'tea', 'market', 'tea'][slot],
              gui:
                wet || winter
                  ? ['yard', 'tea', 'yard', 'tea'][slot]
                  : ['yard', 'tea', 'market', 'tea'][slot],
              shi: winter
                ? ['yard', 'field', 'tea', 'yard'][slot]
                : ['field', 'field', wet ? 'yard' : 'tea', 'yard'][slot],
              qiao: ['market', 'market', wet || weather.has(w, 'fog') ? 'market' : 'creek', 'tea'][
                slot
              ],
              zhou: heavy
                ? ['river', 'tea', 'tea', 'tea'][slot]
                : ['river', 'river', winter ? 'tea' : 'river', 'tea'][slot],
              yun: ['hill', 'hill', w.clock.day % 5 === 0 ? 'tea' : 'hill', wet ? 'hill' : 'creek'][
                slot
              ],
            };
      const r = compute.run('resident.positions', { w, slot }, { value: places, parts: [] });
      return ON_MAP.map(id => {
        const place = r.value[id],
          map = place === 'field' ? 'yard' : place;
        const key = id + '.' + place;
        const fallback = scheduleAt(id, minute);
        const at = map
          ? spot(MAPS[map], MAPS[map].spots[key] ? key : fallback.spot)
          : { x: 0, y: 0, dir: 'down' };
        return {
          id,
          name: PEOPLE[id].name,
          map,
          ...at,
          visible: !!place,
          doing: place
            ? (wet && RAIN_DOING[id]?.[place]) || DOING[id]?.[place] || fallback.doing
            : '回家了',
        };
      });
    }
    queries.define('residents', positions);
    ctx.provide('residents', Object.freeze({ positions }));
  },
};
