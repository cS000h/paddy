// 界面用的平涂 2D 像素图标（16×16），全部只用调色板里的颜色，和像素世界保持同一套画风。
import { Grid } from './pixel.js';
import { P } from './palette.js';

function blank() {
  return new Grid(16, 16);
}

// 同一碗水从平到洒，三档在小图上也能从水线看出来。
function stressBowl(level) {
  const g = blank();
  g.hline(2, 13, 8, P.e0).rect(3, 9, 10, 2, P.l2).hline(4, 11, 11, P.s3);
  g.hline(5, 10, 12, P.i2).hline(6, 9, 13, P.s4);
  if (level === 'low') return g.hline(3, 12, 7, P.w5).hline(4, 9, 7, P.w2);
  if (level === 'mid') {
    return g.line(3, 7, 6, 4, P.h3).line(6, 4, 9, 7, P.h2).hline(9, 12, 7, P.h3);
  }
  g.line(2, 4, 5, 8, P.c2).line(5, 8, 8, 5, P.c1).line(8, 5, 10, 7, P.c1);
  return g.line(10, 7, 13, 3, P.c2).set(4, 3, P.c0).set(10, 2, P.c1);
}

// 铜钱固定在左边，右边的尖头指出钱是送出去，还是收回来。
function debtCoin(outgoing) {
  const g = blank();
  g.ellipse(4, 8, 3, 4, P.t2).ellipse(4, 7, 3, 3.5, P.y2);
  g.hline(3, 5, 4, P.y0).rect(3, 6, 2, 2, P.t4).set(3, 8, P.y0);
  const tip = outgoing ? 14 : 8;
  const tail = outgoing ? 8 : 14;
  const wing = 11;
  const ink = outgoing ? P.c2 : P.n2;
  return g.hline(tail, tip, 8, ink).line(wing, 5, tip, 8, ink).line(tip, 8, wing, 11, ink);
}

// prettier-ignore
const TEMPER_MAKERS = {
  temper_diligent() {
    return blank().line(3, 13, 11, 3, P.t2).line(4, 13, 12, 3, P.t0)
      .line(8, 3, 13, 7, P.s4).rect(11, 6, 3, 3, P.s2).hline(11, 13, 9, P.ink2);
  },
  temper_lazy() {
    return blank().line(2, 3, 5, 9, P.b2).line(3, 3, 6, 9, P.h1)
      .hline(5, 13, 9, P.b3).hline(6, 13, 10, P.h2).line(6, 10, 4, 13, P.t2)
      .line(10, 10, 12, 13, P.t2);
  },
  temper_generous() {
    return blank().ellipse(5, 9, 3, 4, P.i1).ellipse(5, 6, 3, 1, P.i3)
      .ellipse(10, 4, 2, 2, P.y2).set(10, 4, P.t4).ellipse(13, 9, 1, 1, P.y1);
  },
  temper_stingy() {
    return blank().ellipse(8, 10, 4, 3, P.i2).rect(6, 3, 4, 4, P.i1)
      .hline(5, 10, 6, P.c1).line(10, 6, 12, 9, P.c2).vline(6, 9, 11, P.i0);
  },
  temper_gregarious() {
    return blank().rect(2, 3, 7, 5, P.g3).rect(4, 8, 2, 2, P.g3)
      .rect(8, 7, 6, 5, P.c0).set(11, 12, P.c1).hline(4, 7, 5, P.g7).hline(9, 12, 9, P.c2);
  },
  temper_shy() {
    return blank().rect(3, 3, 10, 10, P.t3).rect(4, 4, 8, 8, P.i3)
      .rect(4, 4, 5, 8, P.i1).vline(6, 4, 11, P.i2).set(10, 8, P.k0);
  },
  temper_honest() {
    const g = blank().vline(8, 2, 12, P.t3).hline(5, 11, 13, P.t2).hline(2, 13, 4, P.h2);
    for (const x of [3,12]) g.vline(x, 5, 8, P.t1).hline(x-2,x+2,9,P.y2).hline(x-1,x+1,10,P.h3);
    return g;
  },
  temper_sly() {
    return blank().vline(8, 3, 12, P.t3).hline(5, 11, 13, P.t2).line(2, 7, 13, 3, P.h2)
      .vline(3, 7, 10, P.t1).hline(1, 5, 11, P.y2).vline(12, 4, 6, P.t1).hline(10, 14, 7, P.h3);
  },
  temper_calm() {
    return blank().ellipse(8, 9, 5, 3, P.n2).ellipse(7, 8, 4, 2, P.s2)
      .hline(2, 13, 13, P.w4).hline(6, 9, 7, P.s0);
  },
  temper_hasty() {
    return blank().line(8, 2, 10, 4, P.i1).ellipse(11, 6, 2, 2, P.s3)
      .line(2, 7, 5, 11, P.w4).line(5, 11, 8, 8, P.w5).line(8, 8, 10, 11, P.w3)
      .line(10, 11, 14, 7, P.w4).hline(4, 12, 13, P.w5);
  },
  temper_brave() {
    return blank().vline(4, 2, 13, P.t3).rect(5, 3, 6, 5, P.c1)
      .hline(9, 14, 4, P.c0).hline(10, 13, 6, P.c2).hline(5, 7, 4, P.y0);
  },
  temper_craven() {
    return blank().line(2, 8, 8, 3, P.t2).line(8, 3, 14, 8, P.t2)
      .rect(4, 8, 8, 5, P.paper2).rect(7, 9, 4, 4, P.t4).vline(8, 9, 12, P.c2);
  },
  temper_content() {
    return blank().ellipse(8, 8, 5, 2, P.paper0).hline(2, 13, 9, P.i1)
      .rect(4, 10, 8, 2, P.i0).hline(6, 9, 12, P.i3).hline(5, 7, 7, P.e1);
  },
  temper_ambitious() {
    return blank().rect(2, 10, 4, 3, P.g4).rect(6, 7, 4, 6, P.g5)
      .rect(10, 5, 4, 8, P.g6).vline(11, 1, 5, P.t3).hline(12, 14, 2, P.c1);
  },
  temper_trusting() {
    return blank().rect(3, 3, 9, 10, P.t4).rect(4, 4, 7, 8, P.paper1)
      .line(8, 5, 13, 3, P.t2).rect(9, 5, 5, 7, P.t0).line(8, 12, 13, 10, P.t2).set(10, 8, P.t4);
  },
  temper_paranoid() {
    return blank().ellipse(8, 6, 3, 4, P.s4).ellipse(8, 6, 1, 2, 0)
      .rect(3, 7, 10, 6, P.h2).hline(4, 11, 8, P.y0).rect(7, 9, 2, 2, P.t4).set(8, 11, P.t4);
  },
};

const MAKERS = {
  ...TEMPER_MAKERS,
  // — 左侧书签页签图标 —
  tab_ledger() {
    return blank()
      .rect(3, 2, 10, 12, P.t2)
      .rect(5, 3, 7, 10, P.paper1)
      .vline(6, 4, 11, P.c2)
      .hline(8, 10, 5, P.ink2)
      .hline(8, 10, 8, P.ink2);
  },
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
  // 摊开的线装小册：图鉴
  tab_catalog() {
    const g = blank();
    g.rect(2, 4, 6, 9, P.paper0).rect(8, 4, 6, 9, P.paper1).vline(8, 4, 12, P.t3);
    g.hline(3, 6, 6, P.ink2).hline(3, 6, 9, P.ink2).hline(9, 12, 6, P.ink2).set(11, 9, P.g4);
    return g.hline(2, 13, 13, P.t3);
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

  // — 得了一项成就：一束压弯了的稻子（原先是一枚朱砂方印，用户嫌方正的印难看） —
  award_rice() {
    const g = blank();
    g.line(4, 15, 7, 5, P.g5).line(5, 11, 2, 8, P.g4).set(1, 7, P.g3);
    const grains = [
      [7, 3],
      [9, 2],
      [11, 3],
      [12, 5],
      [12, 7],
      [12, 9],
      [11, 11],
    ];
    grains.forEach(([x, y], i) => g.rect(x, y, 2, 2, i % 2 ? P.y2 : P.y1));
    return g;
  },

  // 六项：待客的茶、算盘、火把、行囊、打开的书、练力气的石锁。
  attr_renqing() {
    const g = blank();
    for (const [x, y, clay] of [
      [2, 7, P.i1],
      [8, 5, P.n1],
    ]) {
      g.hline(x, x + 5, y, P.t4).hline(x + 1, x + 4, y, P.h2);
      g.rect(x, y + 1, 6, 2, clay).hline(x + 1, x + 4, y + 3, P.l2);
      g.hline(x + 2, x + 3, y + 4, clay).set(x + 1, y + 1, P.l0);
    }
    return g;
  },
  attr_chijia() {
    const g = blank();
    g.rect(2, 3, 12, 10, P.t4).rect(3, 4, 10, 8, P.paper1).hline(2, 13, 3, P.t1);
    for (const [x, y] of [
      [4, 9],
      [7, 10],
      [10, 9],
    ]) {
      g.vline(x + 1, 4, 11, P.h3)
        .hline(x, x + 2, 5, P.t2)
        .hline(x, x + 2, y, P.c2);
    }
    return g.hline(3, 12, 7, P.t3);
  },
  attr_danliang() {
    const g = blank();
    g.line(4, 13, 8, 8, P.t3).line(5, 13, 9, 8, P.t1);
    g.ellipse(9, 7, 3.2, 2.6, P.c2).line(7, 6, 9, 2, P.c1);
    g.line(9, 6, 11, 3, P.c1).vline(11, 3, 7, P.c1).line(8, 8, 10, 5, P.y1);
    return g.line(6, 8, 9, 10, P.ink2);
  },
  attr_yueli() {
    const g = blank();
    g.line(3, 13, 12, 3, P.t3).line(3, 12, 12, 2, P.t1);
    g.line(9, 4, 10, 6, P.c3).set(11, 5, P.c1);
    g.ellipse(10, 9, 3.4, 3.2, P.i2).hline(8, 11, 7, P.i1);
    return g.line(8, 9, 9, 11, P.i0).set(12, 10, P.i3);
  },
  attr_xuewen() {
    const g = blank();
    g.rect(2, 4, 12, 9, P.i3).rect(2, 3, 5, 8, P.paper0).rect(8, 3, 5, 8, P.paper1);
    g.vline(7, 4, 12, P.t1).hline(3, 5, 5, P.ink3).hline(3, 5, 7, P.ink3);
    return g.vline(10, 4, 7, P.c2).set(11, 4, P.c0).hline(9, 11, 9, P.ink3);
  },
  attr_tige() {
    const g = blank();
    g.rect(5, 2, 6, 6, P.s4).rect(6, 4, 4, 3, 0).hline(6, 9, 2, P.s1);
    g.rect(3, 8, 10, 5, P.s3).hline(4, 11, 7, P.s2).hline(3, 12, 8, P.s1);
    return g.hline(4, 11, 13, P.s5).vline(11, 9, 12, P.s4).set(5, 10, P.s2);
  },
  stress_low: () => stressBowl('low'),
  stress_mid: () => stressBowl('mid'),
  stress_high: () => stressBowl('high'),
  debt_owe: () => debtCoin(true),
  debt_owed: () => debtCoin(false),
  heard() {
    const g = blank();
    g.ellipse(9, 6, 3.5, 4.2, P.k2).ellipse(9, 6, 2, 2.5, P.t2);
    g.ellipse(8, 10, 2.2, 2.5, P.k2).line(7, 9, 10, 6, P.k0).set(9, 4, P.k0);
    return g.line(2, 4, 4, 5, P.n2).hline(1, 3, 7, P.n2).line(2, 10, 4, 9, P.n2);
  },
};

export const UI_ICONS = Object.freeze(Object.keys(MAKERS));

/** 画一张 16×16 描边平涂像素图标。 */
export function uiIcon(id) {
  const make = MAKERS[id];
  if (!make) throw new Error('没有这个界面图标：' + id);
  return new Grid(16, 16).blit(make(), 0, 0).outline(P.ink1);
}
