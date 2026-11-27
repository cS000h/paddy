// 钓鱼和买东西沿用做活动作的脚下锚点。
import { base } from './acts-work.js';
import { P } from './palette.js';
import { worker, pose, finish } from './worker.js';

const X = base.ax;
const FEET = base.ay - 1;
const R = Math.round;

// 钓鱼：甩竿（cast）、等着（wait，循环）、收竿（reel：fish 为真时钓上一条）
const ROD = {
  cast: [
    [0, 20, 6],
    [3, 14, 8],
    [5, 46, 16],
    [7, 56, 24],
  ],
  wait: [
    [0, 56, 24],
    [3, 56, 26],
    [5, 56, 24],
  ],
};
function rod(stage, fish = false) {
  return (g, f, look) => {
    const [tx, ty] =
      stage === 'reel'
        ? pose(
            [
              [0, 56, 24],
              [4, 30, 4],
              [7, 18, 6],
              [9, 20, 8],
            ],
            f,
          )
        : pose(ROD[stage], f);
    worker(g, { x: X, feet: FEET, at: [29, 36], far: [27, 37], look });
    g.line(30, 36, tx, ty, P.t3).line(31, 36, R((30 + tx) / 2), R((36 + ty) / 2), P.t2);
    finish(g);
    if (stage === 'cast' && f < 5) return;
    const bob = stage === 'wait' ? (f % 3 === 1 ? 1 : 0) : 0;
    const [bx, by] =
      stage === 'reel'
        ? pose(
            [
              [0, 66, 46],
              [4, 40, 18],
              [7, 24, 14],
              [9, 24, 16],
            ],
            f,
          )
        : [66, 46 + bob];
    g.line(tx, ty, bx, by - 1, P.ink4);
    if (stage === 'reel' && fish && f >= 2) {
      g.ellipse(bx, by + 2, 1.5, 3, P.s3)
        .set(bx, by + 5, P.s4)
        .set(bx - 1, by + 6, P.s4)
        .set(bx, by, P.s1);
    } else g.set(bx, by, P.c1).set(bx, by - 1, P.l0);
    if (stage !== 'reel')
      g.hline(bx - 3 - bob, bx - 2, by + 1, P.w0).hline(bx + 2, bx + 3 + bob, by + 1, P.w0);
  };
}

// 掏钱：手伸到柜台上，铜钱落下；接过一包东西，收在怀里
function pay(g, f, look) {
  const [hx, hy] = pose(
    [
      [0, 28, 40],
      [3, 36, 35],
      [5, 37, 35],
      [7, 36, 36],
      [9, 30, 38],
      [11, 29, 39],
    ],
    f,
  );
  worker(g, { x: X, feet: FEET, lean: f > 2 && f < 8 ? 2 : 0, at: [hx, hy], look });
  if (f >= 6)
    g.rect(hx - 1, hy - 4, 6, 5, P.l1)
      .hline(hx - 1, hx + 4, hy - 2, P.c2)
      .vline(hx + 2, hy - 4, hy, P.c2);
  finish(g);
  if (f >= 3 && f <= 6)
    for (let i = 0; i < 3; i++)
      g.set(hx + 2 + i * 2, hy + (f - 3) * 2 + i, P.y1).set(
        hx + 3 + i * 2,
        hy + (f - 3) * 2 + i,
        P.y2,
      );
}

export const ERRAND_ACTS = {
  cast: { ...base, frames: 8, fps: 10, draw: rod('cast') },
  wait: { ...base, frames: 6, fps: 4, loop: true, draw: rod('wait') },
  reel: { ...base, frames: 10, fps: 10, draw: rod('reel', true) },
  miss: { ...base, frames: 10, fps: 10, draw: rod('reel', false) },
  pay: { ...base, frames: 12, fps: 9, draw: pay },
};
