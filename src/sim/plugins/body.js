// 身体：饥、渴、心情，吃撑了没有，还有吃下去的东西带来的好处（增益）。
// 这些都记在“这个人”名下（vitals[人]）；现在只有自家人有，谁进了这一户就给谁建一份。
//   time.passed       → 肚子慢慢空、口慢慢干；每过一个时辰：消食、心情随饥渴起落
//   day.started       → 一夜过去又饿又渴；睡得早心情好，熬夜心情差
//   action.performed  → 在外头干活出汗，口干得更快
// 饿了、渴了、撑了、没心情，干活都更费体力（'action.cost'）；空着肚子睡，歇不回来（'sleep.restore'）。
// 别的插件要改这些数，一律走 body 服务，每一回都带一句原因，记进流水。
import { is, check } from '../../kernel/schema.js';
import { BODY, BUFFS, moodWord, thirstWord, hungerWord, stuffedWord } from '../../content/body.js';
import { WORK_KINDS } from '../../content/actions.js';

const clamp = n => Math.max(0, Math.min(100, Math.round(n)));
// 从 from 走到 to（一天里的分钟），跨过了几个 every 的整倍数。
const crossed = (from, to, every) =>
  to > from ? Math.floor(to / every) - Math.floor(from / every) : 0;

export const body = {
  id: 'sim.body',
  provides: ['body'],
  requires: ['schema', 'reactions', 'compute', 'queries', 'core'],
  writes: ['vitals'],
  install(ctx) {
    const { schema, reactions, compute, queries, core } = ctx.services;

    const fresh = () => ({ ...BODY.start, stuffed: 0, sweat: 0, buff: null });
    const buffOk = b =>
      b === null ||
      (is.obj(b) &&
        Object.hasOwn(BUFFS, b.type) &&
        is.int(b.left, 1, 99) &&
        (b.why === undefined || is.str(b.why, 40)));

    schema.slice('vitals', {
      initial: (env, world) =>
        Object.fromEntries(
          Object.values(world.households)
            .flatMap(h => h.members)
            .map(id => [id, fresh()]),
        ),
      validate: (all, w) =>
        check([
          [is.obj(all) && Object.keys(all).every(id => Object.hasOwn(w.people, id)), 'whose'],
          [
            Object.values(all).every(
              v =>
                is.int(v.hunger, 0, 100) &&
                is.int(v.thirst, 0, 100) &&
                is.int(v.mood, 0, 100) &&
                is.int(v.stuffed, 0, 3) &&
                is.int(v.sweat, 0, 99) &&
                buffOk(v.buff),
            ),
            'fields',
          ],
        ]),
    });

    // 每一回改动都从这里过，带上原因；quiet 的不记流水（时间流逝这类一直在发生的事）。
    const set = (w, id, k, value, why, quiet = false) => {
      const v = w.vitals[id];
      const before = v[k];
      v[k] = clamp(value);
      if (!quiet) core.log(w, id, k, v[k] - before, why);
    };

    const useBuff = ctx.own((w, id, type) => {
      const b = w.vitals[id]?.buff;
      if (!b || b.type !== type) return false;
      b.left--;
      if (b.left <= 0) w.vitals[id].buff = null;
      return true;
    });

    // 解馋：接下来几回心情变差时，只差一半。
    const mood = ctx.own((w, id, delta, why = null, quiet = false) => {
      if (delta < 0 && w.vitals[id].buff?.type === 'treat') {
        delta = Math.ceil(delta / 2);
        useBuff(w, id, 'treat');
        why = (why || '') + '（解了馋，没那么烦）';
      }
      set(w, id, 'mood', w.vitals[id].mood + delta, why, quiet);
    });

    // 吃得太饱：每超出 15 点，多撑一级（干重活更费劲，过几个时辰才消）。
    const feed = ctx.own((w, id, n, why = null) => {
      const v = w.vitals[id];
      const over = v.hunger + n - 100;
      set(w, id, 'hunger', v.hunger + n, why);
      if (over < 10) return;
      const stuffed = Math.min(3, v.stuffed + Math.ceil(over / 15));
      if (stuffed > v.stuffed) {
        core.log(w, id, 'stuffed', stuffed - v.stuffed, '吃得太饱');
        v.stuffed = stuffed;
      }
    });

    const drink = ctx.own((w, id, n, why = null) => {
      set(w, id, 'thirst', w.vitals[id].thirst + n, why);
    });

    const dry = ctx.own((w, id, n, why = null) => {
      set(w, id, 'thirst', w.vitals[id].thirst - n, why);
    });

    const setBuff = ctx.own((w, id, type, uses, why = null) => {
      w.vitals[id].buff = { type, left: uses, ...(why ? { why } : {}) };
      core.log(w, id, 'buff:' + type, uses, why || BUFFS[type].name);
    });

    // 过了一个时辰：消一点食；耐饿用掉一段；又饿又渴的时候心情往下掉，否则慢慢好起来。
    function slot(w, id) {
      const v = w.vitals[id];
      if (v.stuffed) {
        v.stuffed--;
        core.log(w, id, 'stuffed', -1, '消了点食');
      }
      useBuff(w, id, 'filling');
      if (v.thirst < BODY.parched) mood(w, id, -2, '渴得心烦');
      if (v.hunger < BODY.hungry) mood(w, id, -2, '饿得心慌');
      if (v.thirst >= BODY.parched && v.hunger >= BODY.hungry) mood(w, id, 1, null, true);
    }

    reactions.on(
      'time.passed',
      (s, e) => {
        const w = s.world;
        const { from, minute: to } = e.data;
        for (const [id, v] of Object.entries(w.vitals)) {
          // 耐饿：饿得慢一半
          const every = BODY.hungerEvery * (v.buff?.type === 'filling' ? 2 : 1);
          v.hunger = clamp(v.hunger - crossed(from, to, every));
          const day = crossed(from, Math.min(to, BODY.dusk), BODY.thirstEvery);
          const night = crossed(Math.max(from, BODY.dusk), to, BODY.thirstEveryNight);
          v.thirst = clamp(v.thirst - day - night);
          for (let n = crossed(from, to, BODY.slotMinutes); n > 0; n--) slot(w, id);
        }
      },
      { priority: 12 },
    );

    reactions.on(
      'day.started',
      (s, e) => {
        const w = s.world;
        for (const [id, v] of Object.entries(w.vitals)) {
          v.hunger = clamp(v.hunger - BODY.overnight.hunger);
          v.thirst = clamp(v.thirst - BODY.overnight.thirst);
          v.stuffed = 0;
          v.sweat = 0;
          const bed = e.data.minute;
          if (e.data.late) mood(w, id, -2, '熬夜，早上没精神');
          else if (bed >= BODY.dusk && bed <= BODY.earlyBed) mood(w, id, 2, '睡得早，醒来神清气爽');
        }
        const mine = w.vitals[w.player.controls];
        if (!mine) return;
        const lines = [];
        if (mine.hunger < BODY.hungry + 5) lines.push('肚子咕咕叫了一夜，先弄点吃的。');
        if (mine.thirst < 45) lines.push('早上起来口干舌燥，先喝口水再出门。');
        if (lines.length) core.post(w, { title: '醒来', text: lines.join('') });
      },
      { priority: 12 },
    );

    // 在外头出力气的活会出汗：每花一些体力，水分再掉一点。
    reactions.on(
      'action.performed',
      (s, e) => {
        const d = e.data;
        const v = s.world.vitals[d.who];
        if (!v || !d.outdoor || !d.energy || !WORK_KINDS.includes(d.kind)) return;
        v.sweat += d.energy;
        const n = Math.floor(v.sweat / BODY.sweatEvery);
        v.sweat -= n * BODY.sweatEvery;
        v.thirst = clamp(v.thirst - n);
      },
      { priority: 36 },
    );

    // 轻活（一下只花一两点体力的）每样难处最多加 1 点，免得撒一粒种子比锄一格地还累。
    const weigh = (action, n) => (action.base >= BODY.heavy ? n : Math.min(n, 1));

    compute.tap(
      'action.cost',
      (r, { w, who, action }) => {
        const v = w.vitals[who];
        if (!v || action.base <= 0) return;
        if (v.hunger < BODY.hungry) compute.part(r, 'vitals.hungry', '饿得没劲', weigh(action, 2));
        if (v.mood <= BODY.gloomy) compute.part(r, 'vitals.mood', '提不起劲', 1);
      },
      { priority: 24 },
    );

    compute.tap(
      'action.cost',
      (r, { w, who, action }) => {
        const v = w.vitals[who];
        if (!v || action.base <= 0) return;
        if (v.thirst < BODY.parched) compute.part(r, 'thirst.bad', '渴得难受', weigh(action, 2));
        else if (v.thirst < BODY.thirsty) compute.part(r, 'thirst', '口渴', 1);
        if (v.stuffed && WORK_KINDS.includes(action.kind))
          compute.part(
            r,
            'stuffed',
            v.stuffed >= 3 ? '撑得弯不下腰' : '吃撑了',
            weigh(action, v.stuffed >= 2 ? 2 : 1),
          );
      },
      { priority: 55 },
    );

    compute.tap(
      'sleep.restore',
      (r, { w, who }) => {
        const v = w.vitals[who];
        if (!v) return;
        if (v.hunger < BODY.hungry) compute.part(r, 'sleep.hungry', '空着肚子睡的', -20);
        if (v.thirst < BODY.parched) compute.part(r, 'sleep.thirsty', '渴醒了好几回', -10);
      },
      { priority: 20 },
    );

    queries.define('body', w => {
      const v = w.vitals[w.player.controls];
      const b = v.buff;
      return {
        hunger: v.hunger,
        thirst: v.thirst,
        mood: v.mood,
        stuffed: v.stuffed,
        hungerWord: hungerWord(v.hunger),
        thirstWord: thirstWord(v.thirst),
        moodWord: moodWord(v.mood),
        stuffedWord: stuffedWord(v.stuffed),
        buff: b
          ? {
              type: b.type,
              name: BUFFS[b.type].name,
              left: b.left,
              text: BUFFS[b.type].text(b.left),
            }
          : null,
      };
    });

    ctx.provide(
      'body',
      Object.freeze({
        get: (w, id) => w.vitals[id] || null,
        buff: (w, id) => w.vitals[id]?.buff || null,
        feed,
        drink,
        dry,
        mood,
        setBuff,
        useBuff,
      }),
    );
  },
};
