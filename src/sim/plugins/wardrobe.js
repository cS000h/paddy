// 衣装和发式：单独的一个插件。每个人身上穿的（worn）、每户衣箱里有的（owned）都在这里；
// 人的样子经过 'person.look' 计算管道，所以拿掉这个插件，人人都穿回原衣，别的玩法照常。
//   wardrobe.wear {coat, hair, at}  在小屋衣镜跟前换上衣箱里有的            → wardrobe.worn
//   wardrobe.buy {kind, id, at}     在集上布摊买一件成衣、学一种发式          → wardrobe.got {how: 'buy'}
//   到野外找菜、捡柴、劈篾、采菌、采茶、钓鱼时，有几成碰上一样还没有的   → wardrobe.got {how: 'find'}
// 哪一样怎么得到、几文钱、几成碰上，都写在 content/wardrobe.js 的 GET 里。
import { ENCOUNTER_WORDS as words } from '../../content/encounters.js';
import { registerResidentOptions } from '../resident-options.js';
import { is } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import { PEOPLE } from '../../content/people.js';
import { COATS, HAIR, GET, outfitLook } from '../../content/wardrobe.js';
import { MAPS, actAt } from '../../content/maps/index.js';
import { dateOf, isFairDay } from '../../content/calendar.js';
import { near } from './people.js';

const KINDS = ['coat', 'hair'];
const TABLE = { coat: COATS, hair: HAIR };
const nameOf = (kind, id) => (kind === 'coat' ? COATS[id] : HAIR[id][0]);
const starting = kind => Object.keys(GET[kind]).filter(id => GET[kind][id].start);
// 野外的哪件活，看哪条事实：找菜、捡柴这些发 forage.finished，钓鱼不管钓没钓上都算
const OUTINGS = {
  'forage.finished': d => d.id,
  'fish.caught': () => 'fish',
  'fish.missed': () => 'fish',
};

function clothOptions({ ask, person, at }) {
  if (person.place !== 'market') return [];
  const cloth = ask('wardrobe', at).stall.wares.filter(i => !i.owned);
  return cloth.length
    ? [
        {
          key: 'cloth',
          label: '布摊今天挂着什么？',
          line: words.cloth(cloth.slice(0, 3).map(i => i.name + ' ' + i.price + '文')),
        },
      ]
    : [];
}

export const wardrobe = {
  id: 'sim.wardrobe',
  requires: ['schema', 'commands', 'reactions', 'compute', 'queries', 'core', 'people', 'store'],
  writes: ['wardrobe'],
  install(ctx) {
    registerResidentOptions(ctx, 'qiao', clothOptions);
    const { schema, commands, reactions, compute, queries, core, people, store } = ctx.services;
    schema.slice('wardrobe', {
      initial: (env, w) => ({
        worn: Object.fromEntries(
          Object.keys(w.people).map(id => [id, { coat: 'plain', hair: 'plain' }]),
        ),
        owned: Object.fromEntries(
          Object.keys(w.households).map(id => [
            id,
            { coat: starting('coat'), hair: starting('hair') },
          ]),
        ),
      }),
      validate: (s, w) => {
        if (!is.obj(s) || !is.keyedBy(s.worn, Object.keys(PEOPLE))) return 'worn';
        if (!is.keyedBy(s.owned, Object.keys(w.households))) return 'owned';
        for (const p of Object.values(s.worn))
          if (
            !is.obj(p) ||
            KINDS.some(k => typeof p[k] !== 'string' || !Object.hasOwn(TABLE[k], p[k]))
          )
            return 'worn piece';
        for (const [home, box] of Object.entries(s.owned)) {
          const fine =
            is.obj(box) &&
            KINDS.every(
              k =>
                is.arr(box[k], Object.keys(TABLE[k]).length) &&
                new Set(box[k]).size === box[k].length &&
                box[k].every(id => typeof id === 'string' && Object.hasOwn(TABLE[k], id)),
            );
          if (!fine) return 'owned piece';
          // 身上穿的得是自家衣箱里有的
          for (const id of w.households[home].members)
            if (KINDS.some(k => !box[k].includes(s.worn[id]?.[k])))
              return 'wearing what is not owned';
        }
        return true;
      },
    });

    const homeOf = (w, id) =>
      Object.keys(w.households).find(k => w.households[k].members.includes(id));
    /** 这个人家里的衣箱；不属于哪一户（乡邻）就是 null。 */
    const boxOf = (w, id) => {
      const home = homeOf(w, id);
      return home ? w.wardrobe.owned[home] : null;
    };
    const owns = (w, id, kind, piece) => !!boxOf(w, id)?.[kind].includes(piece);
    const got = (w, emit, who, kind, id, how, line) => {
      boxOf(w, who)[kind].push(id);
      emit('wardrobe.got', { who, kind, id, name: nameOf(kind, id), how, line });
    };

    /** 布摊今天摆哪几样：平日常备的，换季添的，赶集那天再加城里来的成衣。 */
    const stall = w => {
      const { season } = dateOf(w.clock.day);
      const fair = isFairDay(w.clock.day);
      return KINDS.flatMap(kind =>
        Object.entries(GET[kind])
          .filter(
            ([, way]) =>
              way.buy && (!way.seasons || way.seasons.includes(season)) && (!way.fair || fair),
          )
          .map(([id, way]) => ({
            kind,
            id,
            name: nameOf(kind, id),
            price: way.buy,
            with: way.with || null,
            fair: !!way.fair,
          })),
      );
    };
    const nearStall = (w, at) => {
      const p = people.me(w);
      return MAPS[p.map].objects.some(
        ([, x, y]) => actAt(MAPS[p.map], x, y)?.act === 'cloth' && near(at || p, { x, y }),
      );
    };

    commands.register('wardrobe.wear', ({ draft, input, fact }) => {
      const w = draft.world;
      const p = people.place(w, input.at);
      const { coat, hair } = input;
      if (
        typeof coat !== 'string' ||
        typeof hair !== 'string' ||
        !Object.hasOwn(COATS, coat) ||
        !Object.hasOwn(HAIR, hair)
      )
        refuse('衣镜里没有这一款');
      const mirror = MAPS[p.map].objects.find(([kind]) => kind === 'dresser');
      if (!mirror || !near(p, { x: mirror[1], y: mirror[2] })) refuse('到小屋的衣镜跟前再换');
      const who = people.who(w);
      if (!owns(w, who, 'coat', coat)) refuse(`衣箱里还没有${COATS[coat]}`);
      if (!owns(w, who, 'hair', hair)) refuse(`还不会梳${HAIR[hair][0]}`);
      w.wardrobe.worn[who] = { coat, hair };
      fact('wardrobe.worn', { who, coat, hair });
    });

    commands.register('wardrobe.buy', ({ draft, input, fact }) => {
      const w = draft.world;
      people.place(w, input.at);
      if (!nearStall(w)) refuse('走到布摊跟前再挑');
      const ware = stall(w).find(x => x.kind === input.kind && x.id === input.id);
      if (!ware) refuse('布摊上今天没有这一样');
      const who = people.who(w);
      if (owns(w, who, ware.kind, ware.id))
        refuse(ware.kind === 'coat' ? '衣箱里已经有了' : '已经会梳了');
      store.pay(w, ware.price, '买' + ware.name);
      const line =
        ware.kind === 'coat'
          ? `买下了${ware.name}。回小屋照着衣镜换上。`
          : `学会了梳${ware.name}。回小屋照着衣镜梳上。`;
      got(w, fact, who, ware.kind, ware.id, 'buy', line);
    });

    // 野外做活时碰上：每做一回只看一次运气，碰上的是这件活底下第一样还没有的
    for (const [type, outing] of Object.entries(OUTINGS))
      reactions.on(
        type,
        (s, e, emit) => {
          const w = s.world;
          const who = e.data.who || people.who(w);
          if (!boxOf(w, who)) return;
          const act = outing(e.data);
          for (const kind of KINDS)
            for (const [id, way] of Object.entries(GET[kind])) {
              if (way.find !== act || owns(w, who, kind, id)) continue;
              if (core.random(w) < way.chance) got(w, emit, who, kind, id, 'find', way.line);
              return;
            }
        },
        { priority: 70 },
      );

    compute.tap('person.look', (result, env) => {
      const worn = env.w.wardrobe.worn[env.who];
      if (worn) result.value = outfitLook(result.value, worn.coat, worn.hair);
    });

    queries.define('wardrobe', (w, at) => {
      const who = people.who(w);
      const list = kind =>
        Object.keys(TABLE[kind]).map(id => ({
          id,
          name: nameOf(kind, id),
          owned: owns(w, who, kind, id),
          way: JSON.parse(JSON.stringify(GET[kind][id])),
        }));
      return {
        worn: { ...w.wardrobe.worn[who] },
        coat: list('coat'),
        hair: list('hair'),
        stall: {
          near: nearStall(w, at || null),
          fair: isFairDay(w.clock.day),
          wares: stall(w).map(x => ({ ...x, owned: owns(w, who, x.kind, x.id) })),
        },
      };
    });
  },
};
