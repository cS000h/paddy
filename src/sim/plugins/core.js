// 世界的底座：存档版本、随机种子、晨间便条、变化流水。
import { is, check } from '../../kernel/schema.js';
import { SKILLS } from '../../content/growth.js';
import { ITEMS } from '../../content/items.js';
import { BUFFS, LEDGER_LABELS } from '../../content/body.js';

export const SAVE_VERSION = 6;

const LEDGER_MAX = 60;

// 流水里的一条，写成给玩家看的字：“饱腹 +14”“米糕 −1”“解馋 ×2”。
function ledgerText(k, d) {
  const [kind, id] = k.split(':');
  if (kind === 'xp') return `${SKILLS[id]?.name || '本事'}经验 ${d > 0 ? '+' : '−'}${Math.abs(d)}`;
  if (kind === 'buff') return `${BUFFS[id]?.name || id} ×${d}`;
  const label =
    kind === 'item' || kind === 'pack' ? ITEMS[id]?.name || id : LEDGER_LABELS[kind] || kind;
  return `${label} ${d > 0 ? '+' : '−'}${Math.abs(d)}`;
}

export const core = {
  id: 'sim.core',
  provides: ['core'],
  requires: ['schema', 'queries'],
  writes: ['meta', 'notes', 'ledger'],
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

    // 流水：玩家看得见的数（体力、饥渴、心情、钱、东西）每变一回记一笔，带一句原因。
    // 画面把上一条命令之后新记的几笔显示出来，玩家就知道“为什么少了、为什么多了”。
    schema.slice('ledger', {
      initial: () => ({ seq: 0, list: [] }),
      validate: l =>
        check([
          [is.int(l.seq), 'seq'],
          [
            is.arr(l.list, LEDGER_MAX) &&
              l.list.every(
                e =>
                  is.int(e.seq, 1) &&
                  e.seq <= l.seq &&
                  is.str(e.who, 20) &&
                  is.str(e.k, 40) &&
                  Number.isInteger(e.d) &&
                  (e.why === null || is.str(e.why, 60)),
              ),
            'list',
          ],
        ]),
    });

    queries.define('notes', (w, day) =>
      w.notes.list.filter(n => day === undefined || n.day === day),
    );

    // 操控的那个人在第 since 笔之后的流水。
    queries.define('ledger', (w, since = 0) =>
      w.ledger.list
        .filter(e => e.seq > since && e.who === w.player.controls)
        .map(e => ({ seq: e.seq, k: e.k, d: e.d, why: e.why, text: ledgerText(e.k, e.d) })),
    );

    // 带种子的随机数：同一个存档、同一串命令，结果永远相同（可回放、可测试）。
    const random = ctx.own(w => {
      w.meta.seed = (Math.imul(w.meta.seed, 1664525) + 1013904223) >>> 0;
      return w.meta.seed / 4294967296;
    });

    ctx.provide(
      'core',
      Object.freeze({
        random,
        /** 按权重挑一个：pairs 是 [[值, 权重], …]。 */
        weighted(w, pairs) {
          const total = pairs.reduce((sum, [, n]) => sum + n, 0);
          let roll = random(w) * total;
          for (const [value, n] of pairs) if ((roll -= n) < 0) return value;
          return pairs[pairs.length - 1][0];
        },
        /** 不消耗随机数的固定挑选（同一天、同一件事总是同一句话）。 */
        stable: (list, key) => list[Math.abs(key | 0) % list.length],
        nextId: ctx.own(w => w.meta.nextId++),
        post: ctx.own((w, { title, text }) => {
          w.notes.list.push({ id: w.meta.nextId++, day: w.clock.day, title, text });
          if (w.notes.list.length > 30) w.notes.list.splice(0, w.notes.list.length - 30);
        }),
        /**
         * 记一笔流水。who 是谁的；k 是哪个数：energy | hunger | thirst | mood | coins |
         * item:<物品>（家里的） | pack:<物品>（身上的） | buff:<增益> | …；d 是变了多少。
         */
        log: ctx.own((w, who, k, d, why = null) => {
          if (!d) return;
          const l = w.ledger;
          l.seq++;
          l.list.push({ seq: l.seq, who, k, d, why: why ? String(why).slice(0, 60) : null });
          if (l.list.length > LEDGER_MAX) l.list.splice(0, l.list.length - LEDGER_MAX);
        }),
      }),
    );
  },
};
