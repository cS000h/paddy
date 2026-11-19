// 田边的手上活：人蹲下，指尖捻土，托起土块看一眼，再放回田里。
import { worker, pose, finish } from './worker.js';
import { P } from './palette.js';

function feelSoil(g, f, look) {
  const [bend, lean, x, y] = pose(
    [
      [0, 0, 0, 23, 24],
      [3, 4, 3, 27, 33],
      [5, 5, 4, 31, 37],
      [8, 3, 2, 26, 24],
      [11, 3, 2, 26, 24],
      [14, 0, 0, 23, 24],
    ],
    f,
  );
  worker(g, { x: 18, feet: 38, bend, lean, at: [x, y], look });
  if (f >= 5 && f < 13) g.rect(x + 1, y - 1, 3, 2, P.wet1).set(x + 2, y - 1, P.d0);
  finish(g);
}

// 肘和肩跟着手伸出去。晾布是高处的动作，补网和拨算盘都在膝前。
function chores(name) {
  return (g, f, look) => {
    const lift = f <= 6 ? f : 12 - f;
    const x = 23 + lift;
    const y = name === 'hangCloth' ? 25 - lift * 2 : 30 - lift;
    worker(g, {
      x: 15,
      feet: 39,
      at: [x, y],
      far: [23, y + 2],
      bend: name === 'hangCloth' ? 0 : 2,
      sitting: name === 'mendNet',
      look,
    });
    if (name === 'hangCloth') {
      g.line(22, y + 1, x + 7, y - 1, P.l1)
        .rect(x, y, 8, 10, P.i1)
        .vline(x + 5, y + 1, y + 9, P.i2);
      g.hline(x, x + 7, y + 8, P.l2);
    } else if (name === 'mendNet') {
      for (let k = 0; k < 4; k++) {
        g.line(x - 4 + k * 3, y + 1, x + k * 3, y + 10, P.h2);
        g.line(x + k * 3, y + 1, x - 4 + k * 3, y + 10, P.t2);
      }
    } else if (name === 'countBeads') {
      g.rect(22, 28, 14, 8, P.t3).rect(23, 29, 12, 6, P.h1);
      for (let i = 0; i < 4; i++) {
        const rod = 24 + i * 3;
        g.vline(rod, 29, 34, P.t2).rect(
          rod,
          30 + (i === 2 ? Math.floor(lift / 3) : i % 2),
          2,
          2,
          P.ink2,
        );
      }
    } else {
      g.ellipse(26, 32, 7, 3, P.h2).ellipse(26, 30, 5, 2, P.g5);
      g.line(x, y, x + 2, y - 3, P.g4);
    }
    finish(g);
  };
}

const chore = name => ({ w: 48, h: 44, ax: 15, ay: 40, frames: 13, fps: 6, draw: chores(name) });

export const FIELD_ACTS = {
  hangCloth: chore('hangCloth'),
  sortGreens: chore('sortGreens'),
  mendNet: chore('mendNet'),
  countBeads: chore('countBeads'),
  feelSoil: { w: 48, h: 44, ax: 18, ay: 39, frames: 15, fps: 6, draw: feelSoil },
};
