// 手记：头几天的小目标。它不指挥别的插件，只听已经发生的事，记下哪一条做到了。
// 目标写在 content/guide.js：新增一条 = 在 GOALS 里加一行，写明“听到哪件事算做到”。
import { is } from '../../kernel/schema.js';
import { GOALS } from '../../content/guide.js';

export const guide = {
  id: 'sim.guide',
  provides: ['guide'],
  requires: ['schema', 'reactions', 'queries'],
  writes: ['guide'],
  install(ctx) {
    const { schema, reactions, queries } = ctx.services;

    schema.slice('guide', {
      initial: () => ({ done: {} }),
      validate: g =>
        (is.obj(g.done) &&
          Object.entries(g.done).every(
            ([id, day]) => GOALS.some(q => q.id === id) && is.int(day, 1),
          )) ||
        'done',
    });

    // on 可以是一件事，也可以是几件事里随便哪件（卖给铺子、卖给乡邻都算「卖一回东西」）
    for (const goal of GOALS)
      for (const on of [goal.on].flat())
        reactions.on(
          on,
          (s, e, emit) => {
            const done = s.world.guide.done;
            if (done[goal.id]) return;
            done[goal.id] = s.world.clock.day;
            emit('guide.done', { id: goal.id, text: goal.text });
          },
          { priority: 90 },
        );

    queries.define('guide', w =>
      GOALS.map(g => ({ id: g.id, text: g.text, hint: g.hint, done: !!w.guide.done[g.id] })),
    );

    ctx.provide('guide', Object.freeze({}));
  },
};
