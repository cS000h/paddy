// 人头顶冒的小记号：一个小气泡里一个符号。不写字，远远一看就知道他这会儿怎么想——
// 问号（这是谁）、音符（心情好）、省略号（有心事）、心（高兴、喜欢）、感叹（吃了一惊）、汗珠（为难）。
import { Grid } from './pixel.js';
import { P } from './palette.js';

// 7×6 的符号；# 是符号的颜色，o 是亮一点的那一笔
const GLYPHS = {
  question: [P.ink2, ['..###..', '.#...#.', '....#..', '...#...', '.......', '...#...']],
  note: [P.ink2, ['...##..', '...#o#.', '...#...', '...#...', '.###...', '.##....']],
  dots: [P.ink3, ['.......', '.......', '.......', '.#.#.#.', '.......', '.......']],
  heart: [P.c1, ['.##.##.', '#o#####', '#######', '.#####.', '..###..', '...#...']],
  exclaim: [P.c1, ['...#...', '...#...', '...#...', '...#...', '.......', '...#...']],
  sweat: [P.w4, ['...#...', '..#o#..', '.##o##.', '.#####.', '..###..', '.......']],
};

/** 有哪几种记号。 */
export const EMOTES = Object.freeze(Object.keys(GLYPHS));

/** 一个记号：13×12 的小气泡，底下一个尖角指着说话的人。 */
export function emote(kind) {
  const glyph = GLYPHS[kind];
  if (!glyph) throw new Error('没有这种记号：' + kind);
  const g = new Grid(13, 12);
  g.rect(1, 0, 11, 10, P.paper0).rect(0, 1, 13, 8, P.paper0);
  g.hline(1, 11, 0, P.ink3).hline(1, 11, 9, P.ink3).vline(0, 1, 8, P.ink3).vline(12, 1, 8, P.ink3);
  g.set(1, 1, P.ink3).set(11, 1, P.ink3).set(1, 8, P.ink3).set(11, 8, P.ink3);
  g.hline(5, 7, 9, P.paper0).set(5, 10, P.ink3).set(7, 10, P.ink3).set(6, 10, P.paper0);
  g.set(6, 11, P.ink3);
  const [color, rows] = glyph;
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '#') g.set(3 + x, 2 + y, color);
      else if (ch === 'o') g.set(3 + x, 2 + y, P.paper0);
    }),
  );
  return g;
}
