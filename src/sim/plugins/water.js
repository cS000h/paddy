// 喝水。水井、水缸、溪边都能喝（水田里的水不能喝）；身上带着竹筒水壶，就能随时喝几口，
// 在水边喝的时候顺手灌满。取自《稻间》0.12 的 teahouse.js；茶摊的茶等茶摊做出来再搬。
//   drink {x, y, at}  对着挨着的水喝           → water.drunk {source, line}
//   sip   {at}        喝一口竹筒水壶里的水     → water.drunk {source: 'flask', line}
// “为什么喝不了”只写在 why() 一处：命令用它拒绝，画面用同一个它来提示。
import { is } from '../../kernel/schema.js';
import { BODY, DRINKS, FLASK_REFILL } from '../../content/body.js';
import { MAPS, drinkSource } from '../../content/maps/index.js';
import { near } from './people.js';

export const water = {
  id: 'sim.water',
  provides: ['water'],
  requires: ['commands', 'queries', 'people', 'body', 'pack'],
  writes: [],
  install(ctx) {
    const { commands, queries, people, body, pack } = ctx.services;

    const full = (w, id) => body.get(w, id).thirst >= BODY.notThirsty;
    const flaskWants = (w, id) => pack.flask.has(w, id) && pack.flask.left(w, id) < BODY.flaskSips;

    // 对着 (x, y) 喝水为什么不行；能喝（或者能给水壶灌水）返回 null。只读。
    function why(w, x, y, at = null) {
      const id = people.who(w);
      const p = people.me(w);
      if (!is.int(x, 0, 999) || !is.int(y, 0, 999) || !near(at || p, { x, y }))
        return '够不着，走近一点';
      if (!drinkSource(MAPS[p.map], x, y)) return '这儿的水不能喝';
      return full(w, id) && !flaskWants(w, id) ? '不渴，喝不下了' : null;
    }

    commands.register('drink', ({ draft, input, fact }) => {
      const w = draft.world;
      const p = people.place(w, input.at);
      const id = people.who(w);
      const reason = why(w, input.x, input.y);
      if (reason) return { ok: false, reason };
      const source = drinkSource(MAPS[p.map], input.x, input.y);
      const thirsty = !full(w, id);
      if (thirsty) body.drink(w, id, DRINKS[source].amount, '喝了水');
      const filled = pack.flask.fill(w, id);
      const line = thirsty
        ? DRINKS[source].line + (filled ? FLASK_REFILL : '')
        : '你把竹筒水壶按进水里，咕嘟咕嘟灌满了。';
      fact('water.drunk', { who: id, source, x: input.x, y: input.y, line });
      return undefined;
    });

    const whySip = (w, id) => {
      if (!pack.flask.has(w, id)) return '身上没带竹筒水壶';
      if (pack.flask.left(w, id) < 1) return '水壶空了，到井边、溪边灌满';
      return full(w, id) ? '不渴，喝不下了' : null;
    };

    commands.register('sip', ({ draft, input, fact }) => {
      const w = draft.world;
      people.place(w, input.at);
      const id = people.who(w);
      const reason = whySip(w, id);
      if (reason) return { ok: false, reason };
      pack.flask.sip(w, id);
      body.drink(w, id, DRINKS.flask.amount, '喝了口水壶里的水');
      fact('water.drunk', { who: id, source: 'flask', line: DRINKS.flask.line });
      return undefined;
    });

    queries.define('drink.why', (w, x, y, at) => why(w, x, y, at));

    ctx.provide('water', Object.freeze({ why }));
  },
};
