// 院里院外做事的地方：野菜丛、笋、菌子、茶垄、栗子、枯木、钓点，和院里的木墩、鸡窝、腌菜坛。
// 每个函数返回 {grid, ax, ay}；ax、ay 是“脚下那一格的底边中点”在图里的位置。
import { Grid, rng, fromText } from './pixel.js';
import { P, SHADOW } from './palette.js';
import { INK } from './items-kit.js';

const made = (grid, ax, ay) => ({ grid, ax, ay });
const art = rows => fromText(rows, INK);

// 一棵笋：尖上带褐，一层层笋壳往下裹。cx 是中线，base 是底边，h 是高。
function shoot(g, cx, base, h) {
  for (let t = 0; t < h; t++) {
    const y = base - h + 1 + t;
    const half = Math.floor(t * 0.36);
    for (let x = cx - half; x <= cx + half; x++) {
      const side = x - cx;
      let c = side < 0 ? P.h0 : side === 0 ? P.h1 : P.h2;
      if ((t + Math.abs(side) * 2) % 4 === 3) c = P.u1; // 笋壳的边
      if (t < 2) c = P.u2;
      g.set(x, y, c);
    }
    g.set(cx + half, y, t < 2 ? P.u2 : P.h3);
  }
}

// 一朵菌子：伞盖在上，白柄在下。
function mushroom(g, cx, top, r) {
  g.rect(cx - 1, top + r, 2, r + 1, P.l1).vline(cx, top + r, top + r * 2, P.l2);
  g.ellipse(cx, top + r - 1, r, r * 0.6, P.u1);
  g.hline(cx - r + 1, cx + r - 1, top + r, P.u2).hline(cx - r + 1, cx - 1, top + r - 2, P.u0);
}

// 一颗带刺的栗苞。open 的裂开了，露出里面的栗子。
function burr(g, cx, cy, open) {
  g.ellipse(cx, cy, 2.5, 2.5, P.g5);
  for (const [dx, dy] of [
    [-3, 0],
    [3, 0],
    [0, -3],
    [0, 3],
    [-2, -2],
    [2, -2],
    [-2, 2],
    [2, 2],
  ])
    g.set(cx + dx, cy + dy, P.g7);
  g.set(cx - 1, cy - 1, P.g3);
  if (open)
    g.rect(cx - 1, cy, 3, 2, P.t2)
      .set(cx - 1, cy, P.t0)
      .set(cx + 1, cy + 1, P.t4);
}

export const wildProps = {
  // 溪边野菜：几丛贴着地长的荠菜，顶着细白的花
  forage: () => {
    const g = new Grid(26, 14);
    g.ellipse(13, 12, 11, 1.5, SHADOW);
    g.blit(
      art([
        '........w.........w.......',
        '.......wDw.......wDw......',
        '...G....D....G....D....G..',
        '..GgG...D...GgG...D...GgG.',
        '...gD.M.D.M..g..M.D.M..g..',
        '.M..DMgMDMgM.DM.MgDgM.D...',
        'MgM.DgggDgggMDgMgggDggMD..',
        '.MgMDDgDDDgDMDDgMgDDDgMDM.',
        '..MggDDDDDDggMDDggDDDDggM.',
        '...MMgDDDDgMM.MMMgDDDgMM..',
        '.....MMDDMM......MMDMM....',
      ]),
      0,
      1,
    );
    return made(g, 13, 14);
  },

  // 竹林边的笋：一大一小拱出土，脚边落着几片竹叶
  shootPatch: () => {
    const g = new Grid(24, 20);
    g.ellipse(12, 18, 10, 1.5, SHADOW).ellipse(11, 17, 9, 2, P.d1).hline(4, 18, 18, P.d2);
    g.hline(5, 12, 16, P.d0);
    shoot(g, 9, 17, 14);
    shoot(g, 17, 17, 8);
    g.line(1, 15, 4, 13, P.b3).line(20, 12, 23, 14, P.b2).set(2, 13, P.b1);
    return made(g, 12, 20);
  },

  // 松针底下的菌子
  mushroomPatch: () => {
    const g = new Grid(24, 15);
    const r = rng(7);
    g.ellipse(12, 13, 10, 1.5, SHADOW);
    for (let i = 0; i < 16; i++) {
      const x = 2 + Math.floor(r() * 20);
      const y = 10 + Math.floor(r() * 4);
      g.hline(x, x + 2, y, i % 3 ? P.e4 : P.t2);
    }
    mushroom(g, 7, 2, 4);
    mushroom(g, 15, 5, 3);
    mushroom(g, 20, 8, 2);
    return made(g, 12, 15);
  },

  // 一蓬茶树：深绿的老叶托着一层嫩黄的新芽
  teaBush: () => {
    const g = new Grid(30, 20);
    const r = rng(19);
    g.ellipse(15, 18, 13, 1.5, SHADOW);
    g.ellipse(15, 11, 13, 7, P.g6).ellipse(13, 9, 10, 5, P.g5).ellipse(10, 7, 5, 2.5, P.g4);
    for (let i = 0; i < 40; i++) {
      const x = 3 + Math.floor(r() * 24);
      const y = 4 + Math.floor(r() * 9);
      if (g.opaque(x, y)) g.set(x, y, y < 8 ? P.b0 : i % 3 ? P.g3 : P.g7);
    }
    for (let x = 4; x < 27; x++) if (g.opaque(x, 17)) g.set(x, 17, P.g7);
    g.rect(14, 17, 2, 2, P.t3);
    return made(g, 15, 20);
  },

  // 栗子树下：落了一地带刺的栗苞，有的裂开了
  nutPatch: () => {
    const g = new Grid(26, 14);
    g.ellipse(13, 12, 11, 1.5, SHADOW);
    for (const [x, y, c] of [
      [3, 11, P.e3],
      [10, 12, P.h2],
      [17, 11, P.e3],
      [22, 10, P.h3],
    ])
      g.hline(x, x + 2, y, c).set(x + 1, y - 1, c);
    burr(g, 6, 7, true);
    burr(g, 14, 5, false);
    burr(g, 20, 8, true);
    return made(g, 13, 14);
  },

  // 林边的枯木：一截倒下的树干，长了青苔，脚边散着枯枝
  woodpile: () => {
    const g = new Grid(30, 16);
    g.ellipse(15, 14, 13, 1.5, SHADOW);
    g.rect(5, 5, 22, 7, P.t3).hline(5, 26, 5, P.t2).hline(5, 26, 11, P.t4);
    for (const x of [10, 15, 21]) g.vline(x, 7, 9, P.t4);
    g.ellipse(4, 8, 3, 3.5, P.t1).ellipse(4, 8, 1.5, 2, P.t0).set(4, 8, P.t2);
    g.line(20, 5, 23, 1, P.t3).line(24, 1, 26, 0, P.t2);
    g.hline(8, 13, 4, P.g4).hline(16, 18, 4, P.g5).set(9, 5, P.g4).set(12, 5, P.g3);
    g.line(2, 13, 9, 14, P.t2).line(12, 13, 20, 14, P.t1).line(18, 12, 26, 13, P.t2);
    return made(g, 15, 16);
  },

  // 钓点：岸边一块石头，一根竹竿架在树杈上，脚边一只鱼篓
  fishing: () => {
    const g = new Grid(30, 28);
    g.ellipse(13, 25, 11, 2, SHADOW);
    g.ellipse(15, 22, 9, 3.5, P.s2).ellipse(14, 21, 8, 2.5, P.s1).hline(9, 14, 20, P.s0);
    g.hline(8, 22, 24, P.s4);
    // 鱼篓
    g.rect(2, 17, 7, 7, P.h1).hline(2, 8, 17, P.h3).hline(3, 7, 24, P.h3).rect(4, 15, 3, 2, P.h2);
    for (let y = 18; y < 24; y++) for (let x = 2; x < 9; x++) if ((x + y) % 2) g.set(x, y, P.h2);
    // 树杈和竹竿
    g.vline(13, 13, 22, P.t3)
      .set(12, 12, P.t3)
      .set(14, 12, P.t3)
      .set(11, 11, P.t2)
      .set(15, 11, P.t2);
    g.line(6, 20, 27, 2, P.b3).line(6, 19, 27, 1, P.b1);
    // 钓线和浮漂
    g.vline(28, 2, 17, P.ink4).rect(27, 18, 3, 2, P.c1).hline(27, 29, 17, P.paper0);
    return made(g, 13, 28);
  },

  // 木墩：劈柴、编篾都在这儿。墩上嵌着一把斧头，旁边靠着一捆篾条
  workbench: () => {
    const g = new Grid(28, 26);
    g.ellipse(13, 23, 12, 2, SHADOW);
    // 劈好的柴
    g.rect(1, 19, 6, 2, P.t1).rect(2, 21, 6, 2, P.t2).hline(1, 6, 19, P.t0).set(7, 22, P.t4);
    // 木墩
    g.rect(7, 13, 13, 9, P.t3).vline(7, 13, 21, P.t2).vline(19, 13, 21, P.t4);
    for (const x of [10, 13, 16]) g.vline(x, 15, 21, P.t4);
    g.ellipse(13, 22, 6.5, 1.5, P.t4).ellipse(13, 13, 6.5, 2.5, P.t1).ellipse(13, 13, 4, 1.5, P.t0);
    g.set(13, 13, P.t2);
    // 斧头
    g.line(15, 12, 20, 3, P.t2).line(16, 12, 21, 3, P.t4).rect(12, 9, 4, 3, P.s3);
    g.hline(12, 15, 9, P.s1).set(11, 10, P.s4).set(11, 11, P.s4);
    // 靠着的一捆篾条
    g.line(22, 22, 25, 4, P.b1).line(23, 22, 26, 4, P.b2).line(24, 22, 27, 5, P.b3);
    g.hline(23, 26, 13, P.h2).hline(23, 26, 14, P.h3);
    return made(g, 13, 25);
  },

  // 鸡窝：柴搭的矮棚，稻草铺顶，门洞里垫着草
  coop: () => {
    const g = new Grid(30, 28);
    g.ellipse(15, 25, 13, 2, SHADOW);
    g.rect(4, 13, 22, 12, P.t2)
      .vline(4, 13, 24, P.t1)
      .vline(25, 13, 24, P.t4)
      .hline(4, 25, 24, P.t4);
    for (const x of [8, 12, 18, 22]) g.vline(x, 14, 23, P.t3);
    g.rect(11, 16, 8, 9, P.ink1).hline(12, 17, 15, P.ink1).hline(11, 18, 24, P.h3);
    g.hline(11, 18, 23, P.h1).hline(12, 16, 22, P.h0).set(13, 21, P.h1).set(17, 22, P.h2);
    // 草顶：两面坡，檐口压着一道暗边
    for (let y = 3; y <= 13; y++) {
      const half = 2 + (y - 3) * 1.25;
      for (let x = Math.round(15 - half); x <= Math.round(15 + half); x++)
        g.set(x, y, (x * 3 + y * 5) % 7 === 0 ? P.h3 : x > 15 ? P.h2 : P.h1);
    }
    g.hline(2, 28, 13, P.h3).hline(13, 17, 3, P.h0).hline(12, 18, 4, P.h0);
    g.line(6, 10, 9, 6, P.h0).line(20, 7, 24, 11, P.h3);
    return made(g, 15, 27);
  },

  // 腌菜坛：一大一小两只坛子，蒙着蓝布，压着石头
  pickleJar: () => {
    const g = new Grid(26, 24);
    g.ellipse(13, 22, 11, 1.5, SHADOW);
    for (const [cx, cy, r] of [
      [9, 14, 7],
      [20, 17, 4.5],
    ]) {
      g.ellipse(cx, cy, r, r, P.t3).ellipse(cx - r * 0.35, cy - 1, r * 0.4, r * 0.6, P.t2);
      g.ellipse(cx + r * 0.5, cy + 1, 1, r * 0.5, P.t4);
      const top = Math.round(cy - r);
      const half = Math.round(r * 0.6);
      g.rect(cx - half, top - 1, half * 2 + 1, 3, P.i1).hline(cx - half, cx + half, top + 2, P.i3);
      g.hline(cx - half, cx + half, top - 1, P.i0)
        .set(cx - half + 1, top, P.l0)
        .set(cx + 1, top, P.l0);
      g.ellipse(cx, top - 3, half - 1, 1.5, P.s2).hline(cx - half + 2, cx, top - 4, P.s0);
    }
    return made(g, 13, 24);
  },
};

// 同一个物件在不同情形下的另一副样子（世界按规则里的状态来挑）。
export const wildLooks = {
  coop: {
    // 还没搭：院角留着的空地，插了四根桩子，堆着一抱稻草
    site: () => {
      const g = new Grid(30, 16);
      g.ellipse(15, 13, 13, 2, SHADOW).ellipse(15, 12, 11, 2.5, P.e1);
      for (const [x, y] of [
        [5, 7],
        [24, 7],
        [7, 12],
        [22, 12],
      ])
        g.vline(x, y - 4, y, P.t3).set(x, y - 5, P.t1);
      g.ellipse(15, 9, 5, 2.5, P.h1).hline(11, 18, 8, P.h0).hline(12, 19, 11, P.h3);
      g.line(11, 7, 13, 5, P.h2).line(17, 6, 19, 8, P.h2);
      return made(g, 15, 16);
    },
    // 养了鸡：门洞里卧着一只白母鸡
    hens: () => {
      const s = wildProps.coop();
      s.grid
        .ellipse(15, 21, 3, 2, P.l0)
        .rect(16, 18, 3, 3, P.l0)
        .set(17, 17, P.c1)
        .set(19, 19, P.y2);
      s.grid.set(18, 19, P.ink0).hline(13, 15, 22, P.l2);
      return s;
    },
  },
};
