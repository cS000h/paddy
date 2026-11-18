// 地图四周的林子：一团团树冠挤在一起，深色描边，向光的一面亮，背光的一面暗。
// 画在地面那张大图上（人走不进林子，所以不用跟人比前后）。树冠只长在“林子”格上，
// 上边那排的树冠可以往下多探出几像素（树在人后面，探出来也不挡人），两侧少探一点，下边几乎不探。
import { hash2 } from './pixel.js';
import { P } from './palette.js';

// 一团树冠由几簇叶子拼成，边缘才是一鼓一鼓的
const CLUMPS = [
  [0, 0, 0.62],
  [-0.48, 0.14, 0.5],
  [0.48, 0.12, 0.5],
  [-0.22, -0.4, 0.5],
  [0.26, -0.38, 0.48],
  [0, 0.36, 0.5],
];

/** 在地面图 g 上，按每个像素的地面种类 K(x, y)，把“林子”画成一片树冠。 */
export function canopy(g, K, seed) {
  const wood = (x, y) => K(x, y) === 'thicket';
  // 这一点能不能画树冠：林子里当然能；林子外面看它离林子有多远、在哪个方向
  const room = (x, y) => {
    if (wood(x, y)) return true;
    for (let d = 1; d <= 10; d++) if (wood(x, y - d)) return true;
    for (let d = 1; d <= 5; d++) if (wood(x - d, y) || wood(x + d, y)) return true;
    return wood(x, y + 1) || wood(x, y + 2);
  };
  const crowns = [];
  for (let gy = -10, row = 0; gy < g.h + 16; gy += 13, row++)
    for (let gx = -10 + (row % 2) * 9; gx < g.w + 16; gx += 18) {
      const cx = gx + Math.floor((hash2(gx, gy, seed + 61) - 0.5) * 9);
      const cy = gy + Math.floor((hash2(gx, gy, seed + 62) - 0.5) * 6);
      if (!wood(cx, cy)) continue;
      crowns.push([
        cx,
        cy,
        13 + Math.floor(hash2(gx, gy, seed + 63) * 7),
        hash2(gx, gy, seed + 64),
      ]);
    }
  // 从后往前画：下面的树冠盖住上面的
  crowns.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  for (const [cx, cy, r, tone] of crowns) crown(g, room, cx, cy, r, tone, seed);
}

function crown(g, room, cx, cy, r, tone, seed) {
  const clumps = CLUMPS.map(([dx, dy, k]) => [cx + dx * r, cy + dy * r * 0.9, r * k]);
  const inside = (x, y, grow = 0) =>
    clumps.some(([qx, qy, qr]) => {
      const dx = (x - qx) / (qr + grow);
      const dy = (y - qy) / ((qr + grow) * 0.9);
      return dx * dx + dy * dy <= 1;
    });
  const x0 = Math.floor(cx - r * 1.3) - 2;
  const x1 = Math.ceil(cx + r * 1.3) + 2;
  const y0 = Math.floor(cy - r * 1.2) - 2;
  const y1 = Math.ceil(cy + r * 1.2) + 2;
  // 深色的一圈边，再是树冠本身
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      if (!g.inside(x, y) || !room(x, y)) continue;
      if (inside(x, y)) g.set(x, y, leaf(x, y, clumps, tone, seed));
      else if (inside(x, y, 1.2)) g.set(x, y, P.v5);
    }
}

// 树冠上一点的颜色：每簇叶子左上亮、右下暗，簇和簇之间压一道暗缝，再撒几点碎光
function leaf(x, y, clumps, tone, seed) {
  let best = null;
  for (const [qx, qy, qr] of clumps) {
    const dx = (x - qx) / qr;
    const dy = (y - qy) / (qr * 0.9);
    const d = dx * dx + dy * dy;
    // 靠下（前面）的叶簇盖住靠上的
    if (d <= 1 && (!best || qy > best.qy)) best = { qy, dx, dy, d };
  }
  if (!best) return P.v3;
  const light = -best.dx * 0.55 - best.dy * 0.85;
  const fleck = hash2(x, y, seed + 65);
  if (best.d > 0.82 && best.dy > -0.2) return P.v4; // 叶簇的下沿：暗缝
  if (light > 0.62) return fleck < 0.25 ? P.v1 : tone < 0.3 ? P.v1 : P.v0;
  if (light > 0.18) return fleck < 0.12 ? P.v3 : P.v1;
  if (light > -0.35) return fleck < 0.1 ? P.v1 : P.v2;
  return fleck < 0.15 ? P.v2 : P.v3;
}
