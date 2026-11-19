// 地里、林边、溪边、集上的活：蹲下采、抡斧劈柴、舀水、坐下歇、敲钉子、压腌菜、
// 甩竿收竿、掏钱买东西（灶前的几样在 acts-kitchen.js）。一帧 72×56，人朝右，脚下锚点 (22, 51)。
// 面前要碰的东西（草、木墩、坛子、案板）画在帧里；大件（灶、井、鸡窝）是地图上本来就有的，不画。
import { P } from './palette.js';
import { worker, pose, finish, reach } from './worker.js';

const X = 22;
const FEET = 50;
const R = Math.round;

// —— 小物件 ——

/** 采到的东西：草（herb）、蘑菇、栗子、茶叶、竹笋、柴枝。grown 为真画长在地上的样子，否则是拿在手里的。 */
function thing(g, kind, x, y, grown) {
  if (kind === 'mushroom') {
    const caps = grown
      ? [
          [x, y],
          [x + 5, y + 1],
        ]
      : [[x, y]];
    for (const [cx, cy] of caps)
      g.rect(cx, cy - 2, 2, 3, P.l1)
        .ellipse(cx + 0.5, cy - 3, 2.6, 1.5, P.t2)
        .set(cx, cy - 4, P.t0);
  } else if (kind === 'nut') {
    if (grown)
      g.ellipse(x + 3, y - 1, 3.4, 2.4, P.g4)
        .set(x + 1, y - 3, P.g6)
        .set(x + 5, y - 3, P.g6);
    g.ellipse(x + (grown ? 3 : 0), y - (grown ? 1 : 2), 1.6, 1.4, P.t3).set(x, y - 3, P.t1);
  } else if (kind === 'tea') {
    if (grown) {
      g.ellipse(x + 4, y - 7, 7, 6, P.n2).ellipse(x + 3, y - 9, 5, 4, P.n1);
      for (const [dx, dy] of [
        [0, -12],
        [4, -13],
        [7, -10],
      ])
        g.set(x + dx, y + dy, P.g3);
    } else
      g.set(x, y - 2, P.g3)
        .set(x + 1, y - 3, P.g4)
        .set(x - 1, y - 3, P.g3);
  } else if (kind === 'shoot') {
    if (grown) g.ellipse(x + 2, y, 4, 1.5, P.e4);
    g.poly(
      [
        [x, y],
        [x + 4, y],
        [x + 2, y - 7],
      ],
      P.h1,
    ).line(x + 2, y - 7, x + 2, y - 3, P.b2);
    g.set(x + 1, y - 2, P.h3).set(x + 3, y - 4, P.h3);
  } else if (kind === 'wood') {
    g.line(x - 3, y, x + 5, y - 2, P.t3).line(x - 2, y - 2, x + 4, y + 1, P.t2);
  } else {
    if (grown)
      for (const [dx, h] of [
        [-2, 4],
        [0, 6],
        [2, 5],
        [4, 3],
      ])
        g.line(x + dx, y, x + dx + (dx > 0 ? 1 : -1), y - h, dx === 0 ? P.g6 : P.g5);
    g.set(x, y - 3, P.g4)
      .set(x + 1, y - 4, P.g3)
      .set(x - 1, y - 4, P.g4)
      .set(x, y - 5, P.g3);
  }
}

function stump(g, x, y) {
  g.rect(x, y - 6, 11, 6, P.t3)
    .hline(x, x + 10, y - 6, P.t1)
    .hline(x + 1, x + 9, y - 5, P.h1);
  g.hline(x - 1, x + 11, y, P.t4)
    .set(x + 4, y - 4, P.t2)
    .set(x + 6, y - 3, P.t2);
}

// —— 各样活 ——

// 蹲下、伸手、拔起来、站起身，东西拿在手里
function gather(kind) {
  const standing = kind === 'tea';
  const keys = standing
    ? [
        [0, 0, 0, 27, 41],
        [3, 0, 3, 34, 37],
        [6, 0, 4, 36, 36],
        [8, 0, 2, 31, 38],
        [11, 0, 0, 27, 39],
      ]
    : [
        [0, 0, 0, 27, 41],
        [3, 3, 4, 33, 46],
        [5, 5, 6, 36, 49],
        [6, 5, 6, 36, 49],
        [8, 3, 4, 33, 42],
        [11, 0, 1, 28, 38],
      ];
  return (g, f, look) => {
    const [bend, lean, hx, hy] = pose(keys, f);
    const picked = f >= 6;
    if (standing) thing(g, kind, 33, FEET, true);
    else if (!picked) thing(g, kind, 37, FEET - 1, true);
    worker(g, { x: X, feet: FEET, bend, lean, at: [hx, hy], look });
    if (picked) thing(g, kind, hx + 1, hy, false);
    finish(g);
  };
}

// 抡起斧子，落在木墩上的柴上，柴劈成两半，木屑飞起来
function chop(g, f, look) {
  const [bend, lean, hx, hy] = pose(
    [
      [0, 0, 0, 28, 39],
      [3, 0, -2, 20, 24],
      [5, 0, -1, 22, 22],
      [6, 1, 3, 36, 38],
      [7, 2, 5, 40, 44],
      [9, 2, 5, 40, 44],
      [11, 0, 1, 29, 39],
    ],
    f,
  );
  stump(g, 40, FEET);
  if (f < 7)
    g.rect(43, FEET - 13, 5, 7, P.t1)
      .vline(43, FEET - 13, FEET - 7, P.t3)
      .hline(43, 47, FEET - 13, P.h1);
  else
    g.line(41, FEET - 7, 43, FEET - 12, P.t1)
      .line(42, FEET - 7, 44, FEET - 12, P.t3)
      .line(49, FEET - 7, 47, FEET - 12, P.t1)
      .line(48, FEET - 7, 46, FEET - 12, P.t3);
  const shoulder = worker(g, {
    x: X,
    feet: FEET,
    bend,
    lean,
    at: [hx, hy],
    far: [hx - 1, hy + 1],
    look,
  });
  const tip = reach(shoulder, [hx, hy], 8);
  g.line(hx, hy, ...tip, P.t2);
  g.rect(tip[0] - 1, tip[1] - 2, 3, 4, P.s4).set(tip[0], tip[1] - 2, P.s1);
  finish(g);
  if (f >= 7 && f <= 10)
    for (const [dx, dy] of [
      [-4, -3],
      [5, -5],
      [8, -2],
      [-1, -7],
    ]) {
      const u = (f - 6) / 4;
      g.set(R(45 + dx * u * 2), R(FEET - 9 + dy * u * 2 + 6 * u * u), P.h1);
    }
}

// 弯腰拿瓢舀水，举到嘴边喝一口
function scoop(g, f, look, fill = false) {
  const [bend, lean, hx, hy] = pose(
    [
      [0, 0, 0, 27, 41],
      [3, 2, 4, 35, 44],
      [5, 3, 5, 37, 46],
      [7, 1, 2, 30, 36],
      [9, 0, 0, 26, 31],
      [11, 0, 0, 26, 31],
    ],
    f,
  );
  if (fill) {
    const cy = f > 6 ? Math.max(hy, 39) : hy;
    worker(g, { x: X, feet: FEET, bend, lean, at: [hx, cy], look });
    g.rect(hx, cy + 1, 7, 5, P.i2).rect(hx + 1, cy + 2, 5, 3, P.i1);
    g.line(hx + 5, cy + 3, hx + 9, cy, P.i2).hline(hx + 1, hx + 4, cy - 1, P.i2);
    finish(g);
    return;
  }
  worker(g, { x: X, feet: FEET, bend, lean, at: [hx, hy], look });
  g.ellipse(hx + 3, hy + 1, 2.6, 1.6, P.h1)
    .hline(hx + 1, hx + 5, hy, P.h2)
    .line(hx, hy, hx - 2, hy + 2, P.h3);
  finish(g);
  if (f >= 6 && f <= 7) g.set(hx + 3, hy + 4, P.w2).set(hx + 4, hy + 6, P.w1);
}

// 坐下歇一会儿；cup 为真时手里一盏茶，举到嘴边；没有茶就抬手搭个凉棚，看看天
function sit(cup, seated = true) {
  return (g, f, look) => {
    const [hx, hy] = cup
      ? pose(
          [
            [0, 31, 44],
            [4, 27, 33],
            [8, 27, 33],
            [11, 31, 44],
          ],
          f,
        )
      : pose(
          [
            [0, 31, 44],
            [3, 29, 37],
            [5, 27, 29],
            [8, 27, 29],
            [11, 31, 44],
          ],
          f,
        );
    worker(g, { x: X, feet: FEET, at: [hx, hy], sitting: seated, look });
    if (cup) g.rect(hx + 1, hy - 3, 3, 3, P.l1).hline(hx + 1, hx + 3, hy - 3, P.i2);
    finish(g);
    if (cup && f >= 3 && f <= 9) g.set(hx + 2, hy - 5 - (f % 2), P.l2).set(hx + 3, hy - 7, P.l1);
  };
}

// 蹲着敲钉子：小锤一下一下落在木板上
function hammer(g, f, look) {
  const [hx, hy] = pose(
    [
      [0, 30, 40],
      [2, 29, 33],
      [3, 36, 44],
      [5, 29, 33],
      [6, 36, 44],
      [8, 29, 33],
      [9, 36, 44],
      [11, 30, 40],
    ],
    f,
  );
  g.rect(33, FEET - 3, 16, 3, P.t1)
    .hline(33, 48, FEET - 3, P.h1)
    .hline(33, 48, FEET - 1, P.t3);
  g.set(37, FEET - 3, P.s4).set(44, FEET - 3, P.s4);
  const shoulder = worker(g, {
    x: X,
    feet: FEET,
    bend: 4,
    lean: 4,
    at: [hx, hy],
    far: [40, FEET - 4],
    look,
  });
  const tip = reach(shoulder, [hx, hy], 5);
  g.line(hx, hy, ...tip, P.t2).rect(tip[0] - 1, tip[1] - 1, 3, 2, P.s4);
  finish(g);
}

// 往坛子里压菜：手里一把青菜塞进坛口，压实，盖上盖
function press(g, f, look) {
  const [hx, hy] = pose(
    [
      [0, 30, 40],
      [3, 37, 36],
      [5, 38, 40],
      [7, 37, 36],
      [9, 38, 39],
      [11, 33, 38],
    ],
    f,
  );
  g.ellipse(40, FEET - 6, 6, 6, P.e4)
    .ellipse(39, FEET - 8, 4, 3, P.e3)
    .rect(36, FEET - 13, 9, 2, P.t3);
  if (f >= 10) g.ellipse(40, FEET - 14, 5, 1.5, P.t2);
  worker(g, { x: X, feet: FEET, bend: 2, lean: 4, at: [hx, hy], look });
  if (f < 6)
    g.set(hx + 1, hy - 1, P.g4)
      .set(hx + 2, hy - 2, P.g5)
      .set(hx, hy - 2, P.g3);
  finish(g);
}

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

/** 这些活的帧：尺寸、帧数、每秒几帧、脚下锚点、画法；loop 为真的会一直循环到被换掉。 */
export const base = { w: 72, h: 56, ax: X, ay: FEET + 1 };
export const WORK_ACTS = {
  'gather:herb': { ...base, frames: 12, fps: 9, draw: gather('herb') },
  'gather:mushroom': { ...base, frames: 12, fps: 9, draw: gather('mushroom') },
  'gather:nut': { ...base, frames: 12, fps: 9, draw: gather('nut') },
  'gather:tea': { ...base, frames: 12, fps: 9, draw: gather('tea') },
  'gather:shoot': { ...base, frames: 12, fps: 9, draw: gather('shoot') },
  'gather:wood': { ...base, frames: 12, fps: 9, draw: gather('wood') },
  chop: { ...base, frames: 12, fps: 10, draw: chop },
  fillCan: { ...base, frames: 12, fps: 9, draw: (g, f, look) => scoop(g, f, look, true) },
  scoop: { ...base, frames: 12, fps: 9, draw: scoop },
  sit: { ...base, frames: 12, fps: 5, draw: sit(false) },
  standSip: { ...base, frames: 12, fps: 6, draw: sit(true, false) },
  shadeEyes: { ...base, frames: 12, fps: 5, draw: sit(false, false) },
  sip: { ...base, frames: 12, fps: 6, draw: sit(true) },
  hammer: { ...base, frames: 12, fps: 10, draw: hammer },
  press: { ...base, frames: 12, fps: 8, draw: press },
  cast: { ...base, frames: 8, fps: 10, draw: rod('cast') },
  wait: { ...base, frames: 6, fps: 4, loop: true, draw: rod('wait') },
  reel: { ...base, frames: 10, fps: 10, draw: rod('reel', true) },
  miss: { ...base, frames: 10, fps: 10, draw: rod('reel', false) },
  pay: { ...base, frames: 12, fps: 9, draw: pay },
};
