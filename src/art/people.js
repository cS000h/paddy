// 人物。每个人是一张“纸娃娃”：头、身子、胳膊、腿分开画，按姿势挪一挪位置，最后统一描边。
// 一帧 16×32。一行一个朝向（下、左、右、上），一行六帧：站、迈左、站、迈右、抬手、落手。
// 人物只画成远处的小人：两点眼睛，没有五官细节，也不做近脸。
import { clothed, coats } from './garments.js';
import { hairLayer } from './hairstyles.js';
import { Grid } from './pixel.js';
import { P } from './palette.js';

export const FRAME_W = 16;
export const FRAME_H = 32;
export const POSES = ['stand', 'walkA', 'stand', 'walkB', 'raise', 'strike'];
export const DIRS = ['down', 'left', 'right', 'up'];

const LOOKS = {
  hero: {
    hair: P.a0,
    hairLight: P.u2,
    cloth: P.i1,
    shade: P.i2,
    trim: P.l1,
    sash: P.i3,
    pants: P.ink2,
    shoe: P.ink0,
  },
  shi: {
    hair: P.a3,
    hairLight: P.a2,
    cloth: P.u0,
    shade: P.u1,
    trim: P.l2,
    sash: P.u2,
    pants: P.ink3,
    shoe: P.h2,
    hat: true,
    beard: true,
  },
  gui: {
    hair: P.a1,
    hairLight: P.a0,
    cloth: P.l1,
    shade: P.l3,
    trim: P.i2,
    sash: P.i3,
    pants: P.u1,
    shoe: P.ink1,
    scarf: true,
    apron: true,
  },
};

// 新村民沿用同一张远景纸娃娃，不增加近脸细节。
Object.assign(LOOKS, {
  aman: { ...LOOKS.hero, cloth: P.g4, shade: P.g6, sash: P.t3, hat: true },
  qiao: { ...LOOKS.gui, cloth: P.p1, shade: P.p3, trim: P.l0, scarf: false },
  zhou: { ...LOOKS.shi, cloth: P.i2, shade: P.i3, pants: P.t3, hat: false },
  yun: { ...LOOKS.gui, cloth: P.n0, shade: P.n2, trim: P.i0, apron: false },
});

// 头的轮廓：从头顶往下 12 行，每行的 [左, 右]。
const HEAD = [
  [4, 11],
  [3, 12],
  [2, 13],
  [2, 13],
  [2, 13],
  [2, 13],
  [2, 13],
  [2, 13],
  [2, 13],
  [2, 13],
  [3, 12],
  [4, 11],
];
const SIDE_HEAD = [
  [5, 11],
  [4, 12],
  [3, 12],
  [3, 13],
  [3, 13],
  [3, 13],
  [3, 13],
  [3, 13],
  [3, 13],
  [3, 12],
  [4, 12],
  [5, 11],
];

function legs(g, L, pose, xs, drop) {
  const lift = pose === 'walkA' ? [1, 0] : pose === 'walkB' ? [0, 1] : [0, 0];
  g.hline(xs[0], xs[1] + 1, 25 + drop, L.pants);
  xs.forEach((x, i) => {
    g.rect(x, 26 + drop, 2, 3 - lift[i] - drop, L.pants);
    g.hline(x - (i === 0 ? 1 : 0), x + (i === 0 ? 1 : 2), 29 - lift[i], L.shoe);
  });
}

function head(g, L, top, outline, face) {
  outline.forEach(([x0, x1], row) =>
    g.hline(x0, x1, top + row, row < 4 ? L.hair : face ? P.k0 : L.hair),
  );
  g.hline(5, 8, top + 1, L.hairLight);
}

function hat(g, top) {
  const rows = [
    [7, 8],
    [6, 9],
    [5, 10],
    [3, 12],
    [2, 13],
    [1, 14],
    [0, 15],
  ];
  rows.forEach(([x0, x1], i) => g.hline(x0, x1, top - 3 + i, i === 6 ? P.h3 : P.h1));
  for (let i = 1; i < 6; i++)
    g.set(rows[i][0], top - 3 + i, P.h0).set(rows[i][1], top - 3 + i, P.h2);
}

function scarf(g, top, x0, x1) {
  for (let row = 0; row < 4; row++)
    for (
      let x = x0 + (row === 0 ? 2 : row === 1 ? 1 : 0);
      x <= x1 - (row === 0 ? 2 : row === 1 ? 1 : 0);
      x++
    )
      g.set(x, top + row, (x + row * 2) % 3 === 0 ? P.l0 : P.i2);
}

function torso(g, L, x0, x1, drop) {
  g.rect(x0, 17 + drop, x1 - x0 + 1, 8, L.cloth);
  g.vline(x1, 17 + drop, 24 + drop, L.shade).hline(x0, x1, 24 + drop, L.shade);
  g.hline(x0, x1, 22 + drop, L.sash);
}

// 正面和背面
function facing(g, L, pose, back) {
  const drop = pose === 'strike' ? 1 : 0;
  const top = 5 + drop;
  legs(g, L, pose, [5, 9], drop);
  torso(g, L, 4, 11, drop);
  if (!back) {
    g.set(6, 17 + drop, L.trim)
      .set(7, 18 + drop, L.trim)
      .set(8, 19 + drop, L.trim);
    g.set(9, 17 + drop, L.trim).set(8, 18 + drop, L.trim);
    if (L.apron) {
      g.rect(5, 20 + drop, 6, 5, P.i1);
      for (const [x, y] of [
        [6, 21],
        [9, 21],
        [7, 23],
        [10, 23],
      ])
        g.set(x, y + drop, P.l0);
    }
  }
  // 胳膊：站着垂在两边，走路一前一后，抬手举过肩，落手伸到身前
  const arm = (x, from, to, hand) => {
    g.rect(x, from, 2, to - from + 1, L.cloth).vline(x + (x < 8 ? 0 : 1), from, to, L.shade);
    g.rect(x, hand, 2, 1, P.k1);
  };
  if (pose === 'raise') {
    arm(2, 13, 18, 12);
    arm(12, 13, 18, 12);
  } else if (pose === 'strike') {
    g.line(3, 18 + drop, 6, 23 + drop, L.cloth).line(2, 18 + drop, 5, 23 + drop, L.shade);
    g.line(12, 18 + drop, 9, 23 + drop, L.cloth).line(13, 18 + drop, 10, 23 + drop, L.shade);
    if (!back) g.rect(6, 24 + drop, 4, 1, P.k1);
  } else if (pose === 'ready') {
    arm(3, 18, 20, 21);
    arm(11, 18, 20, 21);
  } else {
    const swing = pose === 'walkA' ? [-1, 1] : pose === 'walkB' ? [1, -1] : [0, 0];
    arm(2, 17, 21 + swing[0], 22 + swing[0]);
    arm(12, 17, 21 + swing[1], 22 + swing[1]);
  }
  head(g, L, top, HEAD, !back);
  if (back) {
    g.hline(5, 10, top + 11, P.k1);
    if (L.scarf) g.ellipse(7.5, top + 8, 2, 2, L.hair);
  } else {
    g.hline(2, 13, top + 4, L.hair)
      .set(6, top + 4, P.k0)
      .set(9, top + 4, P.k0)
      .set(10, top + 4, P.k0);
    g.vline(2, top + 5, top + 7, L.hair).vline(13, top + 5, top + 7, L.hair);
    g.vline(5, top + 6, top + 7, P.ink0).vline(10, top + 6, top + 7, P.ink0);
    g.set(4, top + 8, P.k2)
      .set(11, top + 8, P.k2)
      .hline(4, 11, top + 11, P.k1);
    if (L.beard) {
      g.hline(5, 10, top + 9, P.a2)
        .hline(5, 10, top + 10, P.a2)
        .hline(6, 9, top + 11, P.a2);
      g.hline(7, 8, top + 12, P.a3);
    }
  }
  if (L.hat) hat(g, top);
  if (L.scarf) scarf(g, top, 2, 13);
}

// 侧面（朝右；朝左是它的镜像）
function side(g, L, pose) {
  const drop = pose === 'strike' ? 1 : 0;
  const top = 5 + drop;
  if (pose === 'walkA' || pose === 'walkB') {
    const front = pose === 'walkA';
    g.rect(5, 25, 3, front ? 3 : 4, L.pants).hline(4, 7, front ? 28 : 29, L.shoe);
    g.rect(8, 25, 3, front ? 4 : 3, L.pants).hline(8, 11, front ? 29 : 28, L.shoe);
  } else {
    g.rect(6, 25 + drop, 4, 4 - drop, L.pants).hline(6, 10, 29, L.shoe);
  }
  torso(g, L, 5, 10, drop);
  if (L.apron)
    g.rect(8, 20 + drop, 3, 5, P.i1)
      .set(9, 21 + drop, P.l0)
      .set(10, 23 + drop, P.l0);
  if (pose === 'raise') {
    g.line(8, 18, 11, 13, L.shade).line(9, 18, 12, 13, L.cloth).rect(11, 11, 2, 2, P.k1);
  } else if (pose === 'strike') {
    g.rect(9, 19 + drop, 5, 2, L.cloth)
      .hline(9, 13, 20 + drop, L.shade)
      .rect(13, 19 + drop, 2, 2, P.k1);
  } else {
    const swing = pose === 'ready' ? 3 : pose === 'walkA' ? 2 : pose === 'walkB' ? -2 : 0;
    g.line(7, 18, 7 + swing, 22, L.shade).line(8, 18, 8 + swing, 22, L.shade);
    g.rect(7 + swing, 23, 2, 1, P.k1);
  }
  SIDE_HEAD.forEach(([x0, x1], row) => {
    g.hline(x0, x1, top + row, L.hair);
    if (row >= 4) g.hline(row < 9 ? 8 : 6, x1, top + row, P.k0);
  });
  g.hline(5, 8, top + 1, L.hairLight);
  g.vline(11, top + 6, top + 7, P.ink0)
    .set(10, top + 8, P.k2)
    .set(7, top + 7, P.k1);
  g.hline(6, 11, top + 11, P.k1);
  if (L.beard) g.rect(9, top + 9, 4, 2, P.a2).hline(10, 12, top + 11, P.a2);
  if (L.hat) hat(g, top);
  if (L.scarf) {
    scarf(g, top, 3, 13);
    g.ellipse(3.5, top + 6, 1.5, 2, L.hair);
  }
}

/** 画一帧。 */
export function personFrame(look, dir, pose) {
  const [base, coat, style, length] = look.split('/');
  const L = LOOKS[base];
  if (!L) throw new Error('没有这个外观：' + look);
  const g = new Grid(FRAME_W, FRAME_H);
  if (dir === 'down' || dir === 'up') facing(g, L, pose, dir === 'up');
  else side(g, L, pose);
  g.outline(P.ink1);
  const view = dir === 'left' ? 'right' : dir;
  const dressed = coat && coat !== 'plain' ? clothed(g, coat, view, pose) : g;
  if (style && style !== 'plain') {
    dressed.blit(hairLayer({ style, length: Number(length), part: 'side' }, view, pose), 0, 0);
  }
  return dir === 'left' ? new Grid(FRAME_W, FRAME_H).blit(dressed, 0, 0, { flipX: true }) : dressed;
}

/** 一个人的整张图：4 行朝向 × 6 列姿势。 */
export function personSheet(look) {
  const sheet = new Grid(FRAME_W * POSES.length, FRAME_H * DIRS.length);
  DIRS.forEach((dir, row) =>
    POSES.forEach((pose, col) =>
      sheet.blit(personFrame(look, dir, pose), col * FRAME_W, row * FRAME_H),
    ),
  );
  return sheet;
}

export const LOOK_NAMES = Object.keys(LOOKS);

/** 一个外观的几样颜色（衣、衣影、腰带、裤、鞋……）；做活的人（worker.js）按它给身子上色。 */
export function lookColors(look) {
  const [base, coat] = look.split('/');
  const original = LOOKS[base] || LOOKS.hero;
  if (!coat || coat === 'plain') return original;
  const [cloth, shade, trim, pants] = coats[coat];
  return { ...original, cloth, shade, trim, pants, sash: trim };
}
