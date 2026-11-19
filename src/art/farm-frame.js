// 脚底固定在 (24,36)。肩、手、工具和落点用同一套坐标，四个朝向都够得到相邻田格。
import { Grid } from './pixel.js';
import { P } from './palette.js';
import { personFrame, lookColors } from './people.js';

export function farmFrame(look, tool, dir, phase) {
  if (phase === -1 || phase === 4) {
    return new Grid(49, 55).blit(personFrame(look, dir, 'ready'), 16, 6);
  }
  const left = dir === 'left';
  const facing = left ? 'right' : dir;
  const side = facing === 'right';
  const forward = facing === 'down' ? 1 : -1;
  const reach = [0, 0.45, 1, 0.4][phase];
  const bend = Math.round(reach * (tool === 'can' ? 2 : 5));
  const g = new Grid(49, 55);
  const shirt = lookColors(look);
  const body = personFrame(look, facing, phase === 0 && tool === 'hoe' ? 'raise' : 'strike');
  // 屈膝时把上身往田里送，裤脚始终留在原地。
  for (let y = 0; y < body.h; y++) {
    const lean = y < 24 ? 1 : Math.max(0, (30 - y) / 6);
    const shift = Math.round(lean * bend);
    const row = y + 6 + shift * (facing === 'up' ? 0 : 1);
    for (let x = 0; x < body.w; x++) {
      const color = body.get(x, y);
      if (color) g.set(x + 16 + (side ? shift : 0), row, color);
    }
  }

  const x = side ? 29 + Math.round(8 * reach) : 27;
  const y = 22 + (side ? 0 : forward * 2) + Math.round(reach * (side ? 9 : forward > 0 ? 16 : -1));
  const endX = side ? 40 : 25;
  const endY = side ? 31 : 31 + forward * 16;
  if (tool === 'hoe') {
    const tipX = Math.round((side ? 20 : 30) * (1 - reach) + endX * reach);
    const tipY = Math.round(6 * (1 - reach) + endY * reach);
    g.line(x, y, tipX, tipY, P.t4).line(x + 1, y, tipX + 1, tipY, P.t1);
    g.line(tipX - 3, tipY, tipX + 3, tipY + 1, P.ink1);
    g.line(tipX - 3, tipY + 1, tipX - 3, tipY + 4, P.s4);
  } else if (tool === 'can') {
    g.rect(x - 4, y - 3, 8, 7, P.i3).rect(x - 3, y - 2, 6, 5, P.i1);
    g.line(x - 3, y - 3, x - 1, y - 6, P.i3).hline(x - 1, x + 2, y - 6, P.i3);
    const spoutX = side ? x + 6 : x + 3;
    const spoutY = y + (phase === 2 ? 3 : -3);
    g.line(x + 2, y, spoutX, spoutY, P.i2);
    if (phase === 2) {
      g.line(spoutX, spoutY + 1, endX, endY, P.w2);
      g.set(endX + 2, endY - 1, P.w0).set(endX - 2, endY, P.w0);
    }
  } else if (tool === 'seed') {
    g.ellipse(22, 28 + bend, 3, 4, P.h2).hline(20, 23, 25 + bend, P.t3);
    if (phase === 2) g.set(endX, endY, P.h0).set(endX + 2, endY - 2, P.h1);
  } else {
    // 另一只手托住菜叶，随主手收向身前。
    g.line(x - 3, y + 3, endX - 3, endY, shirt.shade);
    g.rect(endX - 3, endY - 1, 2, 2, P.k1);
  }
  g.line(side ? 26 + bend : 29, 24 + bend, x, y, shirt.shade).rect(x, y, 2, 2, P.k1);
  return left ? new Grid(g.w, g.h).blit(g, 0, 0, { flipX: true }) : g;
}
