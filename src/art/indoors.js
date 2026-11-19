// 屋里的家什和村里的几样台子。每个函数返回 {grid, ax, ay}，ax、ay 是脚下那一格的底边中点。
import { Grid } from './pixel.js';
import { P, SHADOW } from './palette.js';
const wrap = (g, ax = g.w / 2) => ({ grid: g, ax, ay: g.h });
export const indoors = {
  // 木床靠着后墙：床头板、叠在床头的被头、一床拼布被，被面一块块拼的布，针脚压着缝。
  bed() {
    const g = new Grid(40, 44);
    g.ellipse(20, 41, 19, 2, SHADOW);
    g.rect(2, 6, 36, 35, P.t1).rect(4, 8, 32, 31, P.t0).rect(2, 0, 36, 9, P.t0);
    g.hline(3, 36, 1, P.e0).hline(3, 36, 7, P.t1).rect(2, 0, 3, 41, P.t1).rect(35, 0, 3, 41, P.t1);
    g.rect(6, 9, 28, 8, P.l1).hline(6, 33, 16, P.l2);
    g.rect(7, 10, 12, 5, P.l0)
      .rect(21, 10, 12, 5, P.l0)
      .hline(8, 17, 14, P.l2)
      .hline(22, 31, 14, P.l2);
    const patches = [P.i0, P.g2, P.p1, P.h0, P.w1, P.u0, P.l1, P.p2];
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 4; col++)
        g.rect(6 + col * 7, 18 + row * 5, 7, 5, patches[(row * 3 + col * 5) % patches.length]);
    for (let x = 6; x < 34; x += 7) g.vline(x, 18, 37, P.ink5);
    for (let y = 18; y < 38; y += 5) g.hline(6, 33, y, P.ink5);
    g.rect(6, 17, 28, 2, P.l0).hline(6, 33, 37, P.t1);
    return wrap(g);
  },
  // 木格窗：浅木窗框，方格的窗格子，糊着窗纸，透进来的是暖白的天光。下面空出一截，窗在墙的上半段。
  roomWindow() {
    const g = new Grid(32, 38);
    g.rect(1, 2, 30, 24, P.t1).rect(3, 4, 26, 20, P.paper0).rect(4, 5, 12, 9, P.l0);
    for (let x = 8; x < 28; x += 5) g.vline(x, 4, 23, P.t0);
    for (let y = 8; y < 24; y += 5) g.hline(3, 28, y, P.t0);
    g.vline(15, 4, 23, P.t1).vline(16, 4, 23, P.e1);
    g.rect(0, 0, 32, 3, P.t0).hline(1, 30, 0, P.e0).rect(0, 26, 32, 3, P.t0).hline(1, 30, 28, P.t1);
    return wrap(g);
  },
  // 饭桌底下的一张草席：稻草编的人字纹，四边包着布。
  rug() {
    const g = new Grid(46, 20);
    g.rect(0, 1, 46, 18, P.h2).rect(2, 3, 42, 14, P.h0);
    for (let y = 3; y < 17; y++)
      for (let x = 2; x < 44; x++) if ((x + (y % 4 < 2 ? y : -y)) % 4 === 0) g.set(x, y, P.h1);
    g.hline(2, 43, 3, P.y0);
    return wrap(g);
  },
  // 后墙上挂的一幅字画：上下两根木杆、浅色的裱边、纸上几笔远山，一方小红印。
  scroll() {
    const g = new Grid(16, 40);
    g.line(8, 0, 4, 3, P.ink2).line(8, 0, 12, 3, P.ink2);
    g.rect(1, 3, 14, 2, P.t1).rect(2, 5, 12, 23, P.paper2).rect(4, 7, 8, 18, P.paper0);
    g.line(4, 19, 7, 14, P.ink3).line(7, 14, 9, 17, P.ink3).line(9, 17, 11, 15, P.ink4);
    g.hline(5, 10, 21, P.ink4).set(6, 10, P.ink2).set(6, 11, P.ink2).set(7, 12, P.ink2);
    g.rect(10, 22, 2, 2, P.c1).rect(1, 28, 14, 2, P.t1);
    return wrap(g);
  },
  // 后墙上挂着晒干的东西：一串红辣椒、两根玉米，挂在一颗木钉上。
  hangings() {
    const g = new Grid(18, 36);
    g.rect(8, 0, 3, 2, P.t1).vline(9, 2, 5, P.h2);
    for (let i = 0; i < 6; i++) {
      const y = 5 + i * 3;
      g.rect(5 + (i % 2), y, 3, 3, i % 3 === 2 ? P.c2 : P.c1).set(5 + (i % 2), y, P.c0);
      g.set(8 + (i % 2), y + 1, P.g6);
    }
    g.ellipse(13, 15, 2.5, 6, P.y1).vline(12, 10, 20, P.y2).vline(14, 11, 19, P.y0);
    g.line(13, 6, 11, 10, P.h2).line(13, 6, 15, 10, P.h1);
    g.ellipse(4, 17, 2, 5, P.y2).vline(4, 13, 21, P.y1);
    return wrap(g);
  },
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
    // 木方桌：桌面几块拼板，一把土茶壶两只青花杯，南北各一条长凳
    wood() {
      const g = new Grid(32, 26);
      g.ellipse(16, 23, 15, 2, SHADOW);
      g.rect(5, 0, 22, 3, P.t0).hline(5, 26, 0, P.e0);
      g.rect(2, 4, 28, 12, P.t1).rect(3, 4, 26, 10, P.e1).hline(3, 28, 4, P.e0);
      g.vline(11, 5, 13, P.e2).vline(20, 5, 13, P.e2);
      g.rect(3, 16, 3, 4, P.t1).rect(26, 16, 3, 4, P.t1);
      g.ellipse(12, 9, 3.5, 2.5, P.u1).set(11, 8, P.u0).hline(10, 13, 11, P.u2);
      g.line(15, 8, 17, 7, P.u1).rect(11, 6, 2, 1, P.u2);
      for (const x of [20, 24]) g.rect(x, 8, 3, 3, P.l0).hline(x, x + 2, 8, P.i1);
      g.rect(5, 19, 22, 3, P.t0)
        .hline(5, 26, 19, P.e0)
        .rect(6, 22, 2, 2, P.t1)
        .rect(24, 22, 2, 2, P.t1);
      return { grid: g, ax: 8, ay: 24 };
    },
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
