// 菜苗保留相同轮廓语法；架上瓜豆、割后韭菜与结球蔬菜一眼可分。
import { Grid } from './pixel.js';
import { P } from './palette.js';
import { cropFrames } from './tiles.js';
export function cropSet(id) {
  const frames = cropFrames();
  if (id === 'qingcai') return frames;
  return frames.map((base, stage) => {
    if (stage < 2) return base;
    const g = new Grid(16, 16);
    if (['cucumber', 'longbean'].includes(id)) {
      g.line(3, 15, 5, 1, P.t2).line(13, 15, 11, 1, P.t2).hline(3, 13, 4, P.t0);
      g.line(5, 13, 10, 3, P.g6).ellipse(6, 7, 3, 2, P.g4).ellipse(10, 5, 3, 2, P.g3);
      if (stage === 3)
        for (const x of [5, 9, 12])
          g.rect(x, 7, id === 'cucumber' ? 2 : 1, 6, id === 'cucumber' ? P.g7 : P.g5);
    } else if (id === 'chive') {
      for (let x = 3; x < 14; x += 2)
        g.line(8, 14, x, stage === 3 ? 2 : 6, x % 4 === 1 ? P.g3 : P.g6);
      g.hline(6, 10, 14, P.l1);
    } else if (id === 'pumpkin') {
      g.line(2, 12, 14, 10, P.g6).ellipse(5, 9, 4, 3, P.g4).ellipse(11, 9, 3, 2, P.g3);
      if (stage === 3)
        g.ellipse(8, 11, 5, 4, P.y2).ellipse(8, 11, 3, 4, P.y1).line(8, 7, 9, 5, P.g6);
    } else if (id === 'radish') {
      g.ellipse(8, 11, 3, 3, P.l1).line(8, 13, 8, 15, P.l0);
      g.line(8, 9, 5, 3, P.g5)
        .line(8, 9, 11, 3, P.g6)
        .ellipse(5, 4, 2, 2, P.g3)
        .ellipse(11, 4, 2, 2, P.g4);
    } else {
      g.ellipse(8, 9, 6, stage === 3 ? 6 : 4, P.g6)
        .ellipse(8, 9, 5, 5, P.g3)
        .ellipse(8, 8, 3, 5, P.g1)
        .line(8, 5, 8, 14, P.l1);
    }
    return g;
  });
}
