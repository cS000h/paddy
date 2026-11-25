// 流动过客与熟人册：赶上赶集或换季刷出过客，站在茶摊、杂货铺或渡口的实处；
// 玩家走到跟前才能聊闲话、办托付（规则校验站位 at）。满意后记入熟人册，下回优先再来。
//   visitor.talk    {id, at}        → visitor.talked {id, name, line, known}
//   visitor.fulfill {id, dish?, at} → visitor.fulfilled {id, name, coins, item, line}
import { ENCOUNTER_WORDS as words } from '../../content/encounters.js';
import { is, check } from '../../kernel/schema.js';
import { refuse } from '../../kernel/dispatch.js';
import {
  VISITOR_ROLES,
  VISITOR_SPOTS,
  VISITOR_SURNAMES,
  VISITOR_GIVEN,
  VISITOR_TRAITS,
  ROLE_IDS,
} from '../../content/visitors.js';
import { MAPS } from '../../content/maps/index.js';
import { ITEMS } from '../../content/items.js';
import { near } from './people.js';

const MAX_ACTIVE = 4;
const MAX_BOOK = 12;
const DIRS = ['up', 'down', 'left', 'right'];

export const visitors = {
  id: 'sim.visitors',
  provides: ['visitors'],
  requires: [
    'schema',
    'commands',
    'queries',
    'reactions',
    'core',
    'people',
    'store',
    'pack',
    'kitchen',
    'body',
    'modifiers',
  ],
  writes: ['visitors'],
  install(ctx) {
    const { schema, commands, queries, reactions, core, people, store, pack, kitchen, body } =
      ctx.services;
    const { modifiers } = ctx.services;

    const activeOk = v =>
      is.obj(v) &&
      is.str(v.id, 30) &&
      is.str(v.name, 20) &&
      Object.hasOwn(VISITOR_ROLES, v.role) &&
      is.str(v.look, 40) &&
      Object.hasOwn(MAPS, v.map) &&
      is.int(v.x, 0, 99) &&
      is.int(v.y, 0, 99) &&
      DIRS.includes(v.dir) &&
      is.arr(v.traits, 2) &&
      v.traits.every(t => VISITOR_TRAITS.includes(t)) &&
      is.int(v.until, 1) &&
      is.int(v.rel, 0, 99) &&
      is.int(v.talkedDay, 0) &&
      typeof v.done === 'boolean';

    const bookOk = b =>
      is.obj(b) &&
      is.str(b.id, 30) &&
      is.str(b.name, 20) &&
      Object.hasOwn(VISITOR_ROLES, b.role) &&
      is.arr(b.traits, 2) &&
      b.traits.every(t => VISITOR_TRAITS.includes(t)) &&
      is.int(b.rel, 1, 99) &&
      is.int(b.visits, 1, 99);

    const makeStarter = () => {
      const role = VISITOR_ROLES.scholar;
      const pos = VISITOR_SPOTS[role.spot][0];
      return {
        id: 'v_1',
        name: '林先生',
        role: 'scholar',
        look: role.look,
        map: role.spot,
        x: pos.x,
        y: pos.y,
        dir: pos.dir,
        traits: ['爱茶', '爱吃'],
        until: 3,
        rel: 0,
        talkedDay: 0,
        done: false,
      };
    };

    schema.slice('visitors', {
      initial: () => ({ day: 1, active: [makeStarter()], book: [] }),
      validate: v =>
        check([
          [is.obj(v), 'obj'],
          [is.int(v.day, 1), 'day'],
          [
            is.arr(v.active, MAX_ACTIVE) &&
              v.active.every(activeOk) &&
              new Set(v.active.map(x => x.id)).size === v.active.length,
            'active',
          ],
          [
            is.arr(v.book, MAX_BOOK) &&
              v.book.every(bookOk) &&
              new Set(v.book.map(x => x.id)).size === v.book.length,
            'book',
          ],
        ]),
    });

    const pick = (w, list) => list[Math.floor(core.random(w) * list.length)];

    function placeFor(w, mapId) {
      const list = VISITOR_SPOTS[mapId] || VISITOR_SPOTS.tea;
      const free = list.filter(
        p => !w.visitors.active.some(v => v.map === mapId && v.x === p.x && v.y === p.y),
      );
      return free.length ? free[0] : list[0];
    }

    function spawnOne(w) {
      const usedIds = new Set(w.visitors.active.map(v => v.id));
      const returning = w.visitors.book.filter(b => !usedIds.has(b.id));
      if (returning.length && core.random(w) < 0.6) {
        const old = pick(w, returning);
        const role = VISITOR_ROLES[old.role];
        const pos = placeFor(w, role.spot);
        old.visits = Math.min(99, old.visits + 1);
        return {
          id: old.id,
          name: old.name,
          role: old.role,
          look: role.look,
          map: role.spot,
          x: pos.x,
          y: pos.y,
          dir: pos.dir,
          traits: [...old.traits],
          until: w.clock.day + role.stay,
          rel: old.rel,
          talkedDay: 0,
          done: false,
        };
      }
      const roleId = pick(w, ROLE_IDS);
      const role = VISITOR_ROLES[roleId];
      const pos = placeFor(w, role.spot);
      const name = pick(w, VISITOR_SURNAMES) + pick(w, VISITOR_GIVEN);
      const t1 = pick(w, VISITOR_TRAITS);
      let t2 = pick(w, VISITOR_TRAITS);
      if (t2 === t1) t2 = VISITOR_TRAITS[(VISITOR_TRAITS.indexOf(t1) + 1) % VISITOR_TRAITS.length];
      return {
        id: 'v_' + core.nextId(w),
        name,
        role: roleId,
        look: role.look,
        map: role.spot,
        x: pos.x,
        y: pos.y,
        dir: pos.dir,
        traits: [t1, t2],
        until: w.clock.day + role.stay,
        rel: 0,
        talkedDay: 0,
        done: false,
      };
    }

    function remember(w, v) {
      const entry = w.visitors.book.find(b => b.id === v.id);
      if (entry) {
        entry.rel = Math.max(entry.rel, v.rel);
        return;
      }
      if (w.visitors.book.length >= MAX_BOOK) w.visitors.book.shift();
      w.visitors.book.push({
        id: v.id,
        name: v.name,
        role: v.role,
        traits: [...v.traits],
        rel: Math.max(1, v.rel),
        visits: 1,
      });
    }

    function nearVisitor(w, input) {
      const v = w.visitors.active.find(x => x.id === input.id);
      if (!v) refuse('这位过客已经离开村子了');
      const me = people.place(w, input.at);
      if (me.map !== v.map || !near(me, v)) refuse(`走到${v.name}跟前再说话`);
      return v;
    }

    // 清早刷新过客：清理已离开的；赶上五日一集、换季首日或村里空了时新来 2 位。
    reactions.on(
      'day.started',
      s => {
        const w = s.world;
        const day = w.clock.day;
        w.visitors.day = day;
        w.visitors.active = w.visitors.active.filter(v => v.until >= day);
        const fair = day % 5 === 0 || day % 14 === 1;
        if (fair || (w.visitors.active.length === 0 && day % 2 === 0)) {
          while (w.visitors.active.length < 2) w.visitors.active.push(spawnOne(w));
        }
      },
      { priority: 50 },
    );

    commands.register('visitor.talk', ({ draft, input, fact }) => {
      const w = draft.world;
      const v = nearVisitor(w, input);
      if (v.talkedDay === w.clock.day) refuse(`今天已经和${v.name}聊过了，明天再来`);
      const who = people.who(w);
      const role = VISITOR_ROLES[v.role];
      v.talkedDay = w.clock.day;
      v.rel = Math.min(99, v.rel + 1);
      body.mood(w, who, 2, `和${v.name}聊闲话`);
      if (v.rel >= 2) remember(w, v);
      if (v.rel === 2) modifiers.add(w, who, 'visitor_word', 5, `听${v.name}说起外村见闻`);
      fact('visitor.talked', {
        who,
        id: v.id,
        name: v.name,
        rel: v.rel,
        known: w.visitors.book.some(b => b.id === v.id),
        line: role.talkLine,
      });
    });

    commands.register('visitor.fulfill', ({ draft, input, fact }) => {
      const w = draft.world;
      const v = nearVisitor(w, input);
      if (v.done) refuse(`${v.name}的这件事已经帮完了`);
      const who = people.who(w);
      const role = VISITOR_ROLES[v.role];
      if (role.need.kind === 'dish') {
        const dishId = input.dish;
        if (!is.int(dishId, 1)) refuse('先做好一份热饭菜再来送给过客');
        kitchen.take(w, who, dishId);
      } else {
        pack.use(w, who, role.need.item, role.need.n, `交给${v.name}`);
      }
      v.done = true;
      v.rel = Math.min(99, v.rel + 2);
      remember(w, v);
      const rw = role.reward;
      if (rw.coins) store.earn(w, rw.coins, `${v.name}的谢礼`);
      if (rw.item) pack.deliver(w, who, rw.item, rw.n, `${v.name}的谢礼`);
      if (rw.mod) modifiers.add(w, who, rw.mod, null, `帮了${v.name}`);
      body.mood(w, who, 4, `帮了${v.name}`);
      const itemName = rw.item ? ITEMS[rw.item].name : '';
      const line = `${v.name}连声道谢，留下 ${rw.coins} 文${itemName ? `和 ${rw.n} 份${itemName}` : ''}，说下回赶集还来找你。`;
      fact('visitor.fulfilled', {
        who,
        id: v.id,
        name: v.name,
        coins: rw.coins || 0,
        item: rw.item || null,
        line,
      });
    });

    queries.define('visitors', w => ({
      active: w.visitors.active.map(v => {
        const role = VISITOR_ROLES[v.role];
        return {
          id: v.id,
          name: v.name,
          role: v.role,
          look: v.look,
          map: v.map,
          x: v.x,
          y: v.y,
          dir: v.dir,
          title: role.title,
          spot: role.spot,
          spotName: role.spotName,
          talkLine: role.talkLine,
          greeting: v.done ? words.visitorDone : words.visitorNeed(role.need.text),
          traits: v.traits,
          rel: v.rel,
          left: Math.max(1, v.until - w.clock.day + 1),
          talkedToday: v.talkedDay === w.clock.day,
          done: v.done,
          returning: w.visitors.book.some(b => b.id === v.id),
          need: role.need,
          rewardCoins: role.reward.coins,
          rewardItem: role.reward.item ? ITEMS[role.reward.item].name : null,
          rewardN: role.reward.n || 0,
        };
      }),
      book: w.visitors.book.map(b => ({
        id: b.id,
        name: b.name,
        title: VISITOR_ROLES[b.role].title,
        traits: b.traits,
        rel: b.rel,
        visits: b.visits,
        // 人物页和乡邻名册要画这个人：同一种来意的过客穿戴一样
        role: b.role,
        look: VISITOR_ROLES[b.role].look,
      })),
    }));

    ctx.provide('visitors', Object.freeze({ active: w => w.visitors.active }));
  },
};
