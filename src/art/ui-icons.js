// 界面用的平涂 2D 像素图标（16×16），全部只用调色板里的颜色，和像素世界保持同一套画风。
import { Grid } from './pixel.js';
import { P } from './palette.js';

function blank() {
  return new Grid(16, 16);
}

const MAKERS = {
  // — 左侧书签页签图标 —
  tab_persona() {
    const g = blank();
    g.rect(3, 2, 10, 12, P.g3).hline(4, 11, 2, P.g4).vline(3, 2, 13, P.g5);
    g.hline(6, 10, 5, P.paper0).hline(6, 10, 8, P.paper0).hline(6, 9, 11, P.paper0);
    return g;
  },
  tab_skills() {
    const g = blank();
    g.rect(4, 7, 8, 5, P.g4).hline(3, 12, 6, P.paper0).hline(5, 10, 12, P.g5);
    g.vline(6, 3, 5, P.l2).vline(9, 4, 5, P.l2);
    return g;
  },
  tab_traits() {
    const g = blank();
    g.ellipse(8, 8, 5, 5, P.t2).ellipse(8, 8, 2, 2, P.paper0);
    return g;
  },
  tab_achievements() {
    const g = blank();
    g.rect(4, 3, 8, 10, P.c1).hline(5, 10, 4, P.c0).hline(5, 10, 12, P.c3);
    g.rect(6, 6, 4, 4, P.paper0);
    return g;
  },
  tab_folk() {
    const g = blank();
    g.hline(6, 9, 3, P.t3).rect(5, 4, 6, 7, P.y1).hline(6, 9, 11, P.t3);
    g.vline(7, 5, 10, P.y0).vline(8, 12, 13, P.c1);
    return g;
  },

  // — 五维属性图标 —
  stat_farm() {
    const g = blank();
    g.poly(
      [
        [8, 2],
        [13, 7],
        [3, 7],
      ],
      P.t2,
    );
    g.rect(4, 7, 8, 6, P.l1).rect(7, 9, 2, 4, P.t3).hline(3, 12, 13, P.g4);
    return g;
  },
  stat_cook() {
    const g = blank();
    g.rect(3, 8, 10, 5, P.ink2).hline(2, 13, 7, P.ink3).hline(5, 10, 13, P.ink1);
    g.vline(6, 3, 5, P.l2).vline(9, 4, 5, P.l2);
    return g;
  },
  stat_craft() {
    const g = blank();
    g.line(4, 13, 10, 7, P.t2).line(5, 13, 11, 7, P.t3);
    g.poly(
      [
        [6, 3],
        [12, 3],
        [12, 7],
        [9, 6],
      ],
      P.a2,
    );
    return g;
  },
  stat_social() {
    const g = blank();
    g.ellipse(5.5, 6, 2.5, 2.5, P.c1).ellipse(10.5, 6, 2.5, 2.5, P.c1);
    g.poly(
      [
        [3, 7],
        [13, 7],
        [8, 13],
      ],
      P.c1,
    ).set(5, 5, P.c0);
    return g;
  },
  stat_insight() {
    const g = blank();
    g.rect(4, 2, 8, 12, P.g5).rect(5, 3, 6, 10, P.g4);
    g.hline(6, 9, 5, P.paper0).hline(6, 9, 7, P.paper0).hline(6, 8, 9, P.paper0);
    return g;
  },

  // — 性情与物象图标 —
  trait_sickle() {
    const g = blank();
    g.line(11, 13, 8, 8, P.t2).line(12, 13, 9, 8, P.t3);
    g.poly(
      [
        [4, 4],
        [11, 3],
        [11, 6],
        [6, 7],
      ],
      P.a3,
    ).hline(5, 10, 4, P.l2);
    return g;
  },
  trait_tea() {
    const g = blank();
    g.rect(4, 7, 8, 5, P.l0).hline(5, 10, 8, P.g4).hline(4, 11, 12, P.l3);
    g.vline(6, 4, 6, P.l2).vline(9, 3, 6, P.l2);
    return g;
  },
  trait_stone() {
    const g = blank();
    g.ellipse(8, 8, 4.5, 4.5, P.ink2).ellipse(7, 6.5, 1.5, 1.2, P.a2);
    return g;
  },
  trait_spark() {
    const g = blank();
    g.poly(
      [
        [8, 2],
        [10, 6],
        [14, 8],
        [10, 10],
        [8, 14],
        [6, 10],
        [2, 8],
        [6, 6],
      ],
      P.g3,
    );
    g.rect(7, 7, 2, 2, P.paper0);
    return g;
  },

  // — 身边风物图标 —
  mod_bird() {
    const g = blank();
    g.poly(
      [
        [3, 5],
        [8, 8],
        [13, 4],
        [10, 10],
        [6, 11],
      ],
      P.i3,
    );
    g.hline(6, 9, 9, P.paper0).set(12, 4, P.c1);
    return g;
  },
  mod_tea() {
    const g = blank();
    g.rect(4, 7, 8, 5, P.l1).hline(5, 10, 8, P.g4).hline(3, 12, 12, P.l3);
    g.vline(7, 4, 6, P.l2).vline(9, 5, 6, P.l2);
    return g;
  },
  mod_clover() {
    const g = blank();
    g.ellipse(6, 6, 2.2, 2.2, P.g3).ellipse(10, 6, 2.2, 2.2, P.g3);
    g.ellipse(6, 10, 2.2, 2.2, P.g4).ellipse(10, 10, 2.2, 2.2, P.g4);
    g.vline(8, 10, 14, P.g5);
    return g;
  },
  mod_cloud() {
    const g = blank();
    g.ellipse(6, 9, 3, 2.5, P.a2).ellipse(10, 9, 3, 2.5, P.a2).ellipse(8, 7, 3, 2.5, P.a3);
    return g;
  },

  // — 头顶像素气泡左侧小卷感叹号 —
  scroll_exclaim() {
    const g = blank();
    g.rect(3, 3, 10, 10, P.h1).hline(2, 13, 3, P.h3).hline(2, 13, 12, P.h3);
    g.rect(4, 4, 8, 8, P.l1);
    g.vline(8, 5, 8, P.c1).set(8, 10, P.c1);
    return g;
  },
};

export const UI_ICONS = Object.freeze(Object.keys(MAKERS));

/** 画一张 16×16 描边平涂像素图标。 */
export function uiIcon(id) {
  const make = MAKERS[id];
  if (!make) throw new Error('没有这个界面图标：' + id);
  return new Grid(16, 16).blit(make(), 0, 0).outline(P.ink1);
}
