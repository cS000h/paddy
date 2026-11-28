// 集场路南的摊棚，各摊一副样子：两根竹竿撑一片两色条纹的布篷，案板上摆着自家的货（G-33 字符画），
// 右边竹竿上挂一面写着字的竖幡。没摆摊的那天只剩空架子。锚点和原来的蓝白摊棚一样，在中间那格的底边。
import { Grid, fromText } from './pixel.js';
import { P, SHADOW } from './palette.js';
import { INK } from './items-kit.js';
import { STALL_SKETCHES as S } from './stall-sketches.js';

const LEGEND = {
  ...INK,
  '!': P.ink0,
  '^': P.ink2,
  '%': P.paper0,
  '~': P.w0,
  '*': P.w1,
  '?': P.w2,
  '+': P.w3,
  '&': P.w4,
  '=': P.w5,
  '<': P.s0,
  '>': P.s5,
};

// 各摊：篷布两色（字符）、案板、竖幡
const LOOKS = {
  meat: { stripe: ['r', '%'], goods: 'stallMeat', banner: 'bannerMeat' },
  veg: { stripe: ['G', '%'], goods: 'stallVeg', banner: 'bannerVeg' },
  tea: { stripe: ['2', 'W'], goods: 'stallTea', banner: 'bannerTea' },
  peddler: { stripe: ['h', '%'], goods: 'stallPeddler', banner: 'bannerPeddler' },
  fish: { stripe: ['c', '%'], goods: 'stallFish', banner: 'bannerFish' },
};
export const STALL_LOOKS = Object.freeze([...Object.keys(LOOKS), 'empty']);

const W = 60; // 原来 48 宽；右边多出 12 挂竖幡
const H = 40;

/** 竹竿、案板和影子：每副样子都有。 */
function frame() {
  const g = new Grid(W, H);
  g.ellipse(25, 38, 21, 2, SHADOW);
  for (const x of [5, 41]) g.rect(x, 10, 2, 28, P.b3).vline(x, 10, 37, P.b2);
  g.rect(3, 26, 42, 4, P.t1).hline(3, 44, 26, P.t0).hline(3, 44, 29, P.t3);
  g.rect(4, 30, 40, 7, P.t2).hline(4, 43, 36, P.t4).vline(4, 30, 36, P.t3).vline(43, 30, 36, P.t4);
  for (let x = 8; x < 42; x += 8) g.vline(x, 31, 35, P.t3);
  return g;
}

/** 布篷：上窄下宽的一片，6 像素一道条纹，下沿一道深一点的边。 */
function awning(g, [a, b]) {
  const [ca, cb] = [LEGEND[a], LEGEND[b]];
  for (let y = 5; y <= 12; y++) {
    const inset = Math.max(0, 7 - y);
    for (let x = 1 + inset; x <= 46 - inset; x++)
      g.set(x, y, Math.floor((x + 3) / 6) % 2 ? ca : cb);
  }
  for (let x = 1; x <= 46; x++) if ((x + 3) % 6 !== 0) g.set(x, 13, ca);
  g.hline(7, 40, 4, P.ink1).hline(3, 44, 12, ca);
}

/** 一副摊棚：look 是摊子编号，或 'empty'（今天没人摆）。 */
export function stallLook(look) {
  const g = frame();
  const l = LOOKS[look];
  if (!l) return { grid: g, ax: 24, ay: H };
  awning(g, l.stripe);
  // 案板上的货：40×10，底边落在案板面上（y=26）
  g.blit(fromText(S[l.goods], LEGEND), 4, 17);
  // 竖幡：12×24，挂在右边竹竿外侧
  g.blit(fromText(S[l.banner], LEGEND), 46, 12);
  return { grid: g, ax: 24, ay: H };
}
