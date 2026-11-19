// 屋里的地面和墙。布局照「场景与物件参考 / 农家堂屋与灶房」：木地板、灶边的石板、后墙的梁柱和白灰墙；
// 颜色走水墨的清淡路子：屋外留白（纸色），墙和梁柱用细墨线勾、浅木色填，地板是浅木色，
// 像一幅界画，而不是参考图那种深色的游戏画面。每个函数按“这个像素是哪种地面”给颜色，由 ground.js 统一调用。
import { noise, hash2 } from './pixel.js';
import { P } from './palette.js';

/** 这几种地面归这里画。 */
export const INTERIOR = new Set(['void', 'wall', 'boards', 'flags']);

const RIM = 5; // 墙头连同两道墨线一共几个像素
const POSTS = 80; // 后墙上每隔多少像素立一根柱子

/** @param {string} kind @param {(x: number, y: number) => string} K 每个像素的地面种类 */
export function interiorColor(kind, x, y, K, seed) {
  if (kind === 'void') return voidColor(x, y, K);
  if (kind === 'wall') return wallColor(x, y, K, seed);
  const c = kind === 'flags' ? flagColor(x, y, seed) : boardColor(x, y, seed);
  return shade(x, y, K, c);
}

// 屋外留白。挨着屋子的一圈是墙头：贴屋里一道墨线、浅色的墙头、外沿一道淡墨线，再往外一抹淡淡的晕。
function voidColor(x, y, K) {
  for (let d = 1; d <= RIM + 1; d++) {
    for (let i = -d; i <= d; i++) {
      if (
        K(x + i, y - d) !== 'void' ||
        K(x + i, y + d) !== 'void' ||
        K(x - d, y + i) !== 'void' ||
        K(x + d, y + i) !== 'void'
      )
        return [P.ink3, P.l1, P.l1, P.l2, P.ink4, P.paper2][d - 1];
    }
  }
  return P.paper1;
}

// 后墙：白灰墙，顶上一道横梁、半腰一道横木、脚下一道踢脚板、每隔一段一根柱子，都是浅木色，墨线勾边。
function wallColor(x, y, K, seed) {
  const run = (dx, dy) => {
    let n = 0;
    while (n < 400 && K(x + dx * (n + 1), y + dy * (n + 1)) === 'wall') n++;
    return n;
  };
  const top = run(0, -1);
  const bottom = run(0, 1);
  const post = Math.min(run(-1, 0) % POSTS, run(1, 0));
  if (top <= 3) return [P.ink3, P.t0, P.t0, P.ink4][top];
  if (bottom <= 3) return [P.ink3, P.e2, P.e2, P.ink4][bottom];
  if (post <= 4) return [P.ink4, P.t0, P.e2, P.t0, P.ink4][post];
  if (top >= 17 && top <= 19) return [P.ink4, P.t0, P.ink4][top - 17];
  // 梁下、脚下各压一点淡影，墙面几道淡淡的刷痕
  if (top <= 5 || bottom <= 5) return P.l1;
  if (hash2(x, y, seed + 52) < 0.006) return P.l2;
  return noise(x * 0.4, y, 6, seed + 51) > 0.82 ? P.l1 : P.l0;
}

// 木地板：横铺的浅色长条板，板缝和板头接缝错开、颜色很淡，木纹顺着板走，零星几个木节。
function boardColor(x, y, seed) {
  const row = Math.floor(y / 8);
  const ry = y % 8;
  const shift = Math.floor(hash2(row, 7, seed + 61) * 48);
  if (ry === 7) return P.e2;
  if ((x + shift) % 48 === 0) return P.e3;
  const tone = hash2(Math.floor((x + shift) / 48), row, seed + 62);
  let c = tone < 0.45 ? P.e0 : P.e1;
  if (noise(x * 0.18, y * 1.6, 5, seed + 63) > 0.78) c = c === P.e0 ? P.e1 : P.e2;
  if (hash2(x, y, seed + 64) < 0.002) c = P.e3;
  return c;
}

// 灶边的石板：一行行大小不一的浅色石板，石缝细，每块左上沿迎光。
function flagColor(x, y, seed) {
  const row = Math.floor(y / 10);
  const ry = y % 10;
  let x0 = -((row * 7) % 13);
  let w = 0;
  for (;;) {
    w = 12 + Math.floor(hash2(x0, row, seed + 71) * 7);
    if (x < x0 + w) break;
    x0 += w;
  }
  const rx = x - x0;
  if (ry === 0 || rx === 0) return P.s2;
  if (ry === 1 || rx === 1) return P.l0;
  if (hash2(x, y, seed + 72) < 0.008) return P.s2;
  return hash2(x0, row, seed + 73) < 0.4 ? P.s1 : P.s0;
}

// 贴着后墙和墙头的地面淡淡暗一层：墙挡了一点光。
function shade(x, y, K, c) {
  const wall = K(x, y - 1) === 'wall' || K(x, y - 2) === 'wall';
  const side = K(x - 1, y) === 'void' || K(x + 1, y) === 'void' || K(x, y + 1) === 'void';
  if (!wall && !side) return c;
  if (c === P.e0) return P.e1;
  if (c === P.e1) return P.e2;
  if (c === P.s0 || c === P.l0) return P.s1;
  return c;
}
