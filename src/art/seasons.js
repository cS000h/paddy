// 四季使用同一套像素位置，只换现有调色板里的颜色。
import { Grid } from './pixel.js';
import { P } from './palette.js';
// 野外那几组（m 草、v 树冠）：夏天深一层；秋天草黄、树冠亮处泛金；冬天草上盖雪、树冠顶上积雪。
const COLORS = [
  {},
  {
    ...{ g0: 'g1', g1: 'g2', g2: 'g3', g3: 'g4', g4: 'g5', p1: 'g2', p2: 'g3' },
    ...{ m0: 'm1', m1: 'm2', m2: 'm3', m3: 'm4', m4: 'm5', v0: 'v1', v1: 'v2' },
  },
  {
    ...{ g0: 'h0', g1: 'h0', g2: 'h1', g3: 'h2', g4: 'e3', g5: 'e4', p1: 'y1', p2: 'c0' },
    ...{ m0: 'h0', m1: 'h1', m2: 'h2', m3: 'h3', m4: 'e4', m5: 'e5', v0: 'y1', v1: 'h2', v2: 'e4' },
  },
  {
    ...{ g0: 'l0', g1: 'l1', g2: 's0', g3: 's1', g4: 's2', g5: 's3', p1: 'l0', p2: 's0' },
    ...{ m0: 'l0', m1: 'l1', m2: 'l1', m3: 's0', m4: 's1', m5: 's2', m6: 's3' },
    ...{ v0: 'l0', v1: 'l1', v2: 's1', x0: 'l0', x1: 'w1' },
  },
];
export function seasonGrid(grid, season) {
  const swaps = new Map(Object.entries(COLORS[season]).map(([a, b]) => [P[a], P[b]]));
  const out = new Grid(grid.w, grid.h);
  grid.data.forEach((c, i) => {
    out.data[i] = swaps.get(c) ?? c;
  });
  return out;
}
