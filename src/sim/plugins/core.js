// 世界的底座：存档版本、随机种子、晨间便条。
import { is, check } from '../../kernel/schema.js';

export const SAVE_VERSION = 1;

export const core = {
  id: 'sim.core',
  provides: ['core'],
  requires: ['schema', 'queries'],
  writes: ['meta', 'notes'],
  install(ctx) {
    const { schema, queries } = ctx.services;

    schema.slice('meta', {
      initial: env => ({ version: SAVE_VERSION, seed: env.seed >>> 0, nextId: 1 }),
      validate: m =>
        check([
          [m.version === SAVE_VERSION, 'version'],
          [is.int(m.seed, 0, 0xffffffff), 'seed'],
          [is.int(m.nextId, 1), 'nextId'],
        ]),
    });

    // 便条：隔夜发生的事（回礼、卖菜的钱、捎来的种子），早上给玩家看。
    schema.slice('notes', {
      initial: () => ({ list: [] }),
      validate: n =>
        (is.arr(n.list, 30) &&
          n.list.every(
            x => is.int(x.id, 1) && is.int(x.day, 1) && is.str(x.title, 40) && is.str(x.text),
          )) ||
        'list',
    });

    queries.define('notes', (w, day) =>
      w.notes.list.filter(n => day === undefined || n.day === day),
    );

    ctx.provide(
      'core',
      Object.freeze({
        // 带种子的随机数：同一个存档、同一串命令，结果永远相同（可回放、可测试）。
        random: ctx.own(w => {
          w.meta.seed = (Math.imul(w.meta.seed, 1664525) + 1013904223) >>> 0;
          return w.meta.seed / 4294967296;
        }),
        post: ctx.own((w, { title, text }) => {
          w.notes.list.push({ id: w.meta.nextId++, day: w.clock.day, title, text });
          if (w.notes.list.length > 30) w.notes.list.splice(0, w.notes.list.length - 30);
        }),
      }),
    );
  },
};
