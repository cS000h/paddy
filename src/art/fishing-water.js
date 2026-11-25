// 水面横幅按整数像素绘制。景物固定，近岸留在左侧，鱼影游近时距离也跟着缩短。
import { Grid, hash2 } from './pixel.js';
import { P } from './palette.js';
import { fishItems } from './fish-items.js';

const W = 160,
  H = 52;
const backdrops = new Map();
const round = Math.round;

function reeds(g, x, y, height) {
  g.line(x, y, x - 3, y - height, P.b4);
  g.line(x, y - 1, x + 3, y - height + 2, P.b3);
  g.line(x - 2, y - height + 3, x - 3, y - height - 1, P.h3);
  g.line(x + 1, y - 4, x + 6, y - 9, P.g5);
}

function bank(g, spot) {
  if (spot === 'river') {
    for (const x of [123, 145]) {
      g.rect(x, 6, 3, 7, P.t3).vline(x, 7, 11, P.t1);
      g.hline(x - 2, x + 4, 14, P.w2);
    }
    g.rect(119, 4, 41, 3, P.t2);
    for (let x = 120; x < W; x += 6) g.hline(x, x + 4, 4, P.t0);
  } else if (spot === 'creek') {
    for (const x of [11, 17, 30, 130, 134, 151]) {
      g.line(x, 7, x + 2, -2, P.b4);
      g.line(x + 1, 3, x - 4, 1, P.g5).line(x + 2, 2, x + 7, 0, P.b2);
    }
  } else {
    for (let x = 13; x < 63; x += 7) g.rect(x, 2, 2, 5, P.t1);
    g.hline(12, 62, 4, P.t0);
  }
}

function background(spot) {
  if (backdrops.has(spot)) return backdrops.get(spot);
  const g = new Grid(W, H);
  g.rect(0, 0, W, H, P.w1).rect(0, 17, W, 17, P.w2).rect(0, 34, W, 18, P.w3);
  for (let x = 0; x < W; x++) {
    const shore = round(3 + 2 * Math.sin(x / 13) + 2 * Math.cos(x / 30));
    g.vline(x, 0, shore, P.g2).set(x, shore + 1, P.g4);
    g.vline(x, shore + 2, shore + 3, P.w0);
    for (const y of [17, 34]) {
      const depth = round(2 * Math.sin(x / 9 + y) + Math.cos(x / 4));
      g.vline(x, y - 3, y + depth, y === 17 ? P.w1 : P.w2);
    }
  }
  for (let i = 0; i < 100; i++) {
    const x = Math.floor(hash2(i, 2) * W),
      y = 9 + Math.floor(hash2(i, 3) * 42);
    g.hline(x, x + 1 + Math.floor(hash2(i, 4) * 6), y, y < 26 ? P.w0 : P.w2);
  }
  // 远岸的树丛与倒影只占上沿，让漂在浅色水里读得清。
  const trees = spot === 'creek' ? [45, 51, 56, 107, 114] : [68, 74, 82, 109, 114];
  for (const x of trees) {
    const crown = 3 + Math.floor(hash2(x, 8) * 3);
    g.rect(x, 1, 2, 4, P.e4)
      .ellipse(x, 0, crown, 3, P.g4)
      .ellipse(x - 1, -1, crown - 1, 2, P.g3);
    g.hline(x - 2, x + 2, 7, P.w2);
  }
  bank(g, spot);
  g.poly(
    [
      [0, 29],
      [6, 32],
      [9, 38],
      [16, 43],
      [24, 47],
      [32, 52],
      [0, 52],
    ],
    P.e2,
  );
  g.poly(
    [
      [0, 30],
      [4, 34],
      [9, 42],
      [23, 49],
      [27, 52],
      [0, 52],
    ],
    P.g3,
  );
  for (const [x, y, h] of [
    [3, 36, 15],
    [6, 39, 12],
    [10, 43, 11],
    [14, 46, 9],
    [19, 48, 8],
  ])
    reeds(g, x, y, h);
  backdrops.set(spot, g);
  return g;
}

function spray(g, x, y, p, amount) {
  const lift = Math.sin(Math.PI * p);
  for (let i = 0; i < amount; i++) {
    const side = i % 2 ? 1 : -1;
    const dx = round(side * (3 + (i + 2) * p)),
      dy = round((4 + (i % 5)) * lift);
    g.rect(x + dx, y - dy, 2, 2, P.w0);
  }
  const width = round(3 + 10 * p);
  g.hline(x - width, x - width + 3, y + 1, P.w0).hline(x + width - 3, x + width, y + 1, P.w0);
}

// progress 是本段从起到收的比例。收线时直接使用规则给的距离与张力。
export function fishingFrame(
  spot,
  {
    action = 'wait',
    progress = 0,
    distance = 70,
    tension = 0,
    running = false,
    size = 'mid',
    item = 'fish.crucian',
  } = {},
) {
  const g = new Grid(W, H).blit(background(spot), 0, 0);
  const p = Math.max(0, Math.min(1, progress)),
    wave = Math.sin(Math.PI * p);
  const fight = action === 'fight',
    landed = action === 'landed';
  const x = fight
    ? round(32 + distance * 0.95)
    : landed
      ? round(81 - 48 * p)
      : action === 'drag'
        ? round(81 + 25 * Math.min(1, 4 * p))
        : 81;
  const y = fight ? round(37 - distance * 0.08) : 29;
  const pull = action === 'hook' ? wave : 0;
  const bend = fight ? tension / 100 : 0;
  const tipX = round(53 + 5 * bend - 10 * pull),
    tipY = round(8 + 13 * bend - 10 * pull);
  for (let i = 0; i < tipX; i++) {
    const u = i / tipX;
    const v = round(4 + (tipY - 4) * u - 3 * Math.sin(Math.PI * u));
    g.line(i, v, i + 1, v, P.t3);
    if (u < 0.75) g.set(i, v + 1, u < 0.4 ? P.t1 : P.h2);
  }
  if (fight || action === 'slack') {
    const tail = action === 'slack' ? round(22 * p) : 0;
    const fx = x + tail,
      fy = y + 3;
    const length = size === 'big' ? 9 : size === 'small' ? 4 : 6;
    g.ellipse(fx, fy, length, 2, P.w4);
    g.poly(
      [
        [fx + length - 1, fy],
        [fx + length + 4, fy - 3],
        [fx + length + 4, fy + 3],
      ],
      P.w4,
    );
    if (running || action === 'slack') spray(g, fx, fy - 1, p, size === 'big' ? 12 : 7);
  }
  const dive =
    action === 'nod' ? round(3 * wave) : action === 'bite' ? round(15 * Math.min(1, 4 * p)) : 0;
  const floatY = y + dive - round(13 * pull);
  const lineColor = bend > 0.78 ? P.c2 : bend > 0.5 ? P.t2 : P.ink3;
  const lineY = landed ? round(y - 3 - 17 * wave) : fight ? y : Math.min(y, floatY - 8);
  const midX = round((tipX + x) / 2),
    midY = round((tipY + lineY) / 2 + 5 * (1 - bend));
  g.line(tipX, tipY, midX, midY, lineColor);
  if (action !== 'snap') g.line(midX, midY, x, lineY, lineColor);
  else {
    g.line(midX + round(7 * p) + 2, midY + round(4 * p), x, y, P.ink4);
    spray(g, x, y, p, 9);
  }
  if (!fight && !landed && !['slack', 'snap'].includes(action)) {
    for (let i = 0; i < 13; i++) {
      const row = floatY - 12 + i;
      if (row > y) break;
      g.rect(
        x - (i > 6 ? 1 : 0),
        row,
        i > 6 ? 3 : 2,
        1,
        i < 3 ? P.c2 : i < 6 ? P.l0 : i < 9 ? P.c1 : P.h1,
      );
    }
    const width = round(4 + 5 * wave);
    g.hline(x - width, x - 2, y + 1, P.w0).hline(x + 2, x + width, y + 1, P.w0);
  }
  if (landed) {
    spray(g, 81, y, p, 10);
    const fish = (fishItems[item] || fishItems['fish.crucian'])().outline(P.ink2);
    g.blit(fish, x - 8, round(y - 9 - 17 * wave));
  }
  return g;
}
