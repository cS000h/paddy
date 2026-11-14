// 四季使用同一套像素位置，只换现有调色板里的颜色。
import { Grid } from './pixel.js';
import { P } from './palette.js';
const COLORS = [
  {},
  { g0: 'g1', g1: 'g2', g2: 'g3', g3: 'g4', g4: 'g5', p1: 'g2', p2: 'g3' },
  { g0: 'h0', g1: 'h0', g2: 'h1', g3: 'h2', g4: 'e3', g5: 'e4', p1: 'y1', p2: 'c0' },
  { g0: 'l0', g1: 'l1', g2: 's0', g3: 's1', g4: 's2', g5: 's3', p1: 'l0', p2: 's0' },
];
export function seasonGrid(grid, season) {
  const swaps = new Map(Object.entries(COLORS[season]).map(([a, b]) => [P[a], P[b]]));
  const out = new Grid(grid.w, grid.h);
  grid.data.forEach((c, i) => {
    out.data[i] = swaps.get(c) ?? c;
  });
  return out;
}
