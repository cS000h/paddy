// 小屋里家什的画法（A-39 回稿）：字符画 → 去掉接地影描一道深木色的边 → 再把接地影铺回描边外面。
// 屋里四种降饱和的颜色只在这里用（旧红、紫褐、镜面、旧铜暗草），屋外照旧是 INK 的颜色。
import { Grid, fromText } from './pixel.js';
import { P, SHADOW } from './palette.js';
import { INK } from './items-kit.js';

// prettier-ignore
export const ROOM_LEGEND = {
  ...INK,
  '!': P.ink0, '^': P.ink2, '%': P.paper0,
  '~': P.w0, '*': P.w1, '+': P.w3, '&': P.w4, '=': P.w5,
  '<': P.s0, '>': P.s5,
  // A-39a 的四种室内色
  Q: P.room0, // 旧红：墙上挂的辣椒、印章
  J: P.room1, // 紫褐：衣镜台上的小匣、朱漆桌面压成的深褐
  '?': P.room2, // 镜面
  j: P.room3, // 旧铜与暗草：箱扣、蓑衣、席边
};

/** 木器的外轮廓：深木墨色，比屋外的近黑墨绿暖，屋里不发闷。 */
export const ROOM_LINE = P.room4;

const SHADE = '_';

/**
 * 一张屋里家什的字符画 → {grid, ax, ay, lined}。
 * 描边描在实心的东西外面，影子让给描边；锚点 ay 落在最低一行实心像素下面，影子垂到下一格地上。
 * swap 临时换几种字符的颜色；ax 不给就是正中（饭桌、书案对着左边那一格，传 8）。
 * wall 为真时锚在整张图的底边：挂在墙上的东西（挂钩空着时只有一排木钉）几种样子要对齐。
 */
export function roomSprite(rows, { swap = null, ax = null, wall = false } = {}) {
  const legend = swap ? { ...ROOM_LEGEND, ...swap } : ROOM_LEGEND;
  const body = fromText(
    rows.map(r => r.replaceAll(SHADE, '.')),
    legend,
  );
  const g = new Grid(body.w + 2, body.h + 2).blit(body, 1, 1).outline(ROOM_LINE);
  let bottom = 0;
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === SHADE && !g.opaque(x + 1, y + 1)) g.set(x + 1, y + 1, SHADOW);
      else if (ch !== '.' && ch !== ' ' && ch !== SHADE) bottom = Math.max(bottom, y + 1);
    }),
  );
  return {
    grid: g,
    ax: (ax ?? Math.floor(body.w / 2)) + 1,
    ay: wall ? g.h - 1 : Math.min(bottom + 2, g.h),
    lined: true,
  };
}

/**
 * 地毯在屋里竖着铺（床右边沿长边铺开）：去掉稿里的影子，顺时针转九十度，
 * 中段抽掉 cut 行缩短，再在右下压两像素接地影。返回转好的字符画。
 */
export function turnRug(rows, cut = 14) {
  const plain = rows.map(r => r.replaceAll(SHADE, '.'));
  const w = plain[0].length;
  const h = plain.length;
  // 顺时针：新的第 y 行第 x 列 = 原来第 (h-1-x) 行第 y 列
  let turned = Array.from({ length: w }, (_, y) =>
    Array.from({ length: h }, (_, x) => plain[h - 1 - x][y]).join(''),
  );
  // 先裁掉上下空行，再从正中抽 cut 行（中段是重复的织纹）
  while (turned.length && !/[^.]/.test(turned[0])) turned.shift();
  while (turned.length && !/[^.]/.test(turned.at(-1))) turned.pop();
  const mid = Math.floor((turned.length - cut) / 2);
  turned = [...turned.slice(0, mid), ...turned.slice(mid + cut)];
  // 左右也只留一列空，下面留两行给影子
  const lefts = turned.map(r => r.search(/[^.]/)).filter(i => i >= 0);
  const rights = turned.map(r => r.length - 1 - [...r].reverse().join('').search(/[^.]/));
  const x0 = Math.max(0, Math.min(...lefts) - 1);
  const x1 = Math.max(...rights) + 3;
  const pad = '.'.repeat(x1 + 1);
  const grid = ['', ...turned, '', ''].map(r =>
    (r + pad).slice(x0, x1 + 1).padEnd(x1 - x0 + 1, '.'),
  );
  // 右下两像素的影子：原图往右下挪两格，落在空处的就是影子
  const solid = (x, y) => grid[y]?.[x] !== undefined && grid[y][x] !== '.' && grid[y][x] !== SHADE;
  return grid.map((row, y) =>
    [...row]
      .map((ch, x) =>
        ch === '.' && (solid(x - 2, y - 2) || solid(x - 1, y - 2) || solid(x - 2, y - 1))
          ? SHADE
          : ch,
      )
      .join(''),
  );
}
