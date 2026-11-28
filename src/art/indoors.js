// 屋里的家什和村里的几样台子。每个函数返回 {grid, ax, ay}，ax、ay 是脚下那一格的底边中点。
import { Grid } from './pixel.js';
import { P, SHADOW } from './palette.js';
import { roomSprite, turnRug, ROOM_LEGEND } from './room-kit.js';
import { ROOM_SKETCHES as R } from './room-sketches.js';
import { FURNITURE_SKETCHES } from './furniture-sketches.js';
import { RUG_AX } from './furniture.js';
const wrap = (g, ax = g.w / 2) => ({ grid: g, ax, ay: g.h });
export const indoors = {
  // 以下几件照 A-39a 原样稿（art/room-sketches.js）：斜上方看下来、深木描边、右下接地影。
  // 床靠西墙：床头两根柱头，拼布被平铺，床尾薄沿托住布被。
  bed: () => roomSprite(R.bed),
  // 木格窗：上下各一排步步锦折线，中段透光。
  roomWindow: () => roomSprite(R.roomWindow),
  // 衣镜：椭圆镜盘、两侧转轴，下面一张带抽屉的木案。
  dresser: () => roomSprite(R.dresser),
  // 草席：竖着铺在床右边，玩家下床就踩到席上。
  rug: () => roomSprite(turnRug(R.rug), { ax: RUG_AX }),
  // 后墙上的素白旧纸轴（A-39b 的原样；A-39a 那张墨竹和换样里的墨竹中堂重了，原样就用素纸）。
  scroll: () => roomSprite(FURNITURE_SKETCHES.scroll_default),
  // 后墙上挂着一串干辣椒、一串蒜头；辣椒压成旧红，不抢眼。
  hangings: () => roomSprite(R.hangings, { swap: { r: ROOM_LEGEND.Q, Q: ROOM_LEGEND.J } }),
  route() {
    const g = new Grid(22, 30);
    g.rect(9, 8, 3, 21, P.t3).rect(1, 4, 20, 10, P.t1).hline(2, 19, 5, P.t0);
    g.line(5, 9, 16, 9, P.ink1).line(13, 6, 16, 9, P.ink1).line(13, 12, 16, 9, P.ink1);
    return wrap(g);
  },
  teaCounter() {
    const g = new Grid(52, 45);
    g.rect(3, 7, 3, 36, P.t3).rect(46, 7, 3, 36, P.t3);
    g.rect(1, 3, 50, 9, P.i2)
      .rect(2, 3, 48, 4, P.i0)
      .rect(5, 27, 42, 14, P.t2)
      .rect(3, 24, 46, 4, P.t0);
    for (const x of [10, 21, 34]) g.ellipse(x, 22, 4, 2, P.l1).rect(x - 2, 21, 4, 2, P.w4);
    return wrap(g);
  },
  marketCounter() {
    const g = new Grid(52, 36);
    g.ellipse(26, 33, 25, 2, SHADOW).rect(3, 16, 46, 16, P.t2).rect(1, 14, 50, 4, P.t0);
    for (const x of [8, 23, 38]) g.ellipse(x, 10, 7, 4, P.h2).ellipse(x, 9, 6, 3, P.h0);
    g.ellipse(8, 8, 4, 3, P.g4).ellipse(23, 8, 4, 3, P.l1).ellipse(38, 8, 4, 3, P.e2);
    return wrap(g);
  },
  boat() {
    const g = new Grid(58, 35);
    g.ellipse(29, 28, 28, 5, P.w4).ellipse(29, 21, 26, 9, P.t3).ellipse(29, 18, 24, 7, P.t0);
    g.ellipse(29, 18, 20, 5, P.t2)
      .rect(18, 12, 3, 12, P.t0)
      .rect(38, 12, 3, 12, P.t0)
      .line(9, 4, 45, 31, P.t3);
    return wrap(g);
  },
};

// 同一种物件在屋里换一副样子（地图数据里写 look）：饭桌是木方桌，出门的路口是门洞。
export const indoorLooks = {
  table: {
    // 旧榆木方桌（A-39a）：受光的桌面占大半，下面只露桌沿和短腿；对着左边那一格
    wood: () => roomSprite(R.table, { ax: 8 }),
  },
  route: {
    // 门洞：两根门框、一道门槛石，门外的天光落在门口的草垫上
    door() {
      const g = new Grid(32, 22);
      g.rect(4, 6, 24, 12, P.e0).rect(6, 8, 20, 8, P.y0);
      g.rect(9, 9, 14, 6, P.h1).hline(9, 22, 9, P.h0).hline(9, 22, 14, P.h2);
      g.rect(0, 0, 4, 20, P.t1)
        .vline(3, 0, 19, P.t0)
        .rect(28, 0, 4, 20, P.t1)
        .vline(28, 0, 19, P.t0);
      g.rect(2, 18, 28, 4, P.s1).hline(2, 29, 18, P.l0).hline(2, 29, 21, P.s2);
      return { grid: g, ax: 8, ay: 22 };
    },
  },
};
