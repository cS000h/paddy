// 世界里的小生灵：蝴蝶、蜻蜓、飞鸟、跃出水面的小鱼、夜里的萤火、水面的涟漪。
// 都是几个像素的小图，每种两帧（扇翅）。世界让它们飞、跳、闪；规则不知道它们。
import { Grid } from './pixel.js';
import { P } from './palette.js';

const draw = (w, h, dots) => {
  const g = new Grid(w, h);
  for (const [x, y, c] of dots) g.set(x, y, c);
  return g;
};

// 蝴蝶：翅膀张开、收拢两帧；三种颜色
const WINGS = {
  white: [P.l0, P.ink4],
  yellow: [P.y0, P.y2],
  pink: [P.p1, P.p3],
};
function butterfly([wing, spot], open) {
  if (open)
    return draw(7, 5, [
      [0, 0, wing],
      [1, 0, wing],
      [5, 0, wing],
      [6, 0, wing],
      [0, 1, wing],
      [1, 1, spot],
      [2, 1, wing],
      [4, 1, wing],
      [5, 1, spot],
      [6, 1, wing],
      [1, 2, wing],
      [2, 2, wing],
      [3, 2, P.ink1],
      [4, 2, wing],
      [5, 2, wing],
      [2, 3, wing],
      [3, 3, P.ink1],
      [4, 3, wing],
    ]);
  return draw(7, 5, [
    [2, 0, wing],
    [4, 0, wing],
    [2, 1, wing],
    [3, 1, P.ink1],
    [4, 1, wing],
    [3, 2, P.ink1],
    [2, 2, spot],
    [4, 2, spot],
    [3, 3, P.ink1],
  ]);
}

// 蜻蜓：细长的青身子，两对透亮的翅膀上下扇
function dragonfly(up) {
  const body = [0, 1, 2, 3, 4, 5, 6, 7].map(x => [x, 2, x < 2 ? P.n2 : P.i2]);
  const wings = up
    ? [
        [2, 0, P.w0],
        [3, 0, P.w1],
        [5, 0, P.w0],
        [6, 0, P.w1],
        [2, 1, P.w1],
        [5, 1, P.w1],
      ]
    : [
        [2, 3, P.w1],
        [5, 3, P.w1],
        [2, 4, P.w0],
        [3, 4, P.w1],
        [5, 4, P.w0],
        [6, 4, P.w1],
      ];
  return draw(9, 5, [...body, [8, 2, P.n3], ...wings]);
}

// 飞鸟：远处的一只小雀，翅膀上下扇
function bird(up) {
  return up
    ? draw(7, 4, [
        [0, 0, P.ink2],
        [1, 1, P.ink1],
        [2, 2, P.ink1],
        [3, 2, P.ink0],
        [4, 2, P.ink1],
        [5, 1, P.ink1],
        [6, 0, P.ink2],
      ])
    : draw(7, 4, [
        [0, 2, P.ink2],
        [1, 2, P.ink1],
        [2, 2, P.ink1],
        [3, 2, P.ink0],
        [4, 2, P.ink1],
        [5, 2, P.ink1],
        [6, 2, P.ink2],
        [2, 3, P.ink2],
        [4, 3, P.ink2],
      ]);
}

const fish = () =>
  draw(7, 3, [
    [1, 0, P.w4],
    [2, 0, P.w5],
    [3, 0, P.w5],
    [0, 1, P.w5],
    [1, 1, P.w2],
    [2, 1, P.l0],
    [3, 1, P.w3],
    [4, 1, P.w4],
    [5, 1, P.w5],
    [6, 0, P.w4],
    [6, 2, P.w4],
    [1, 2, P.w4],
    [2, 2, P.w5],
    [3, 2, P.w4],
  ]);

const firefly = () =>
  draw(3, 3, [
    [1, 0, P.y1],
    [0, 1, P.y1],
    [1, 1, P.y0],
    [2, 1, P.y1],
    [1, 2, P.y1],
  ]);

const ripple = () => new Grid(11, 5).ellipse(5, 2, 5, 2, P.w0).ellipse(5, 2, 4, 1, null);

/** 全部小生灵的图：{名字: Grid}。名字是世界里用的贴图名（去掉 fx: 前缀）。 */
export function critters() {
  const out = {};
  for (const [name, colors] of Object.entries(WINGS)) {
    out[`fly.${name}.0`] = butterfly(colors, true);
    out[`fly.${name}.1`] = butterfly(colors, false);
  }
  out['dragonfly.0'] = dragonfly(true);
  out['dragonfly.1'] = dragonfly(false);
  out['bird.0'] = bird(true);
  out['bird.1'] = bird(false);
  out.fish = fish();
  out.firefly = firefly();
  out.ripple = ripple();
  return out;
}
