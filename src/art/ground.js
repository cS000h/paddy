// 地面：整张地图的地面一次画成一幅画，而不是用一格格重复的图块拼。
// 这样草地有大片的浓淡、路和草的边界弯弯曲曲、石板大小不一，看不出棋盘格。
// 输入只有“每一格是哪种地面”，所以规则认的格子和画出来的地面是同一份数据。
import { Grid, noise, hash2 } from './pixel.js';
import { P } from './palette.js';
import { canopy } from './canopy.js';
import { INTERIOR, interiorColor } from './interior.js';

export const TILE = 16;

// 这些地面之间的边界画成自然的曲线；菜地、水田、桥是人修的，边界保持平直。
const SOFT = new Set(['grass', 'earth', 'stone', 'water', 'thicket', 'sand', 'moss']);
const WET = new Set(['water', 'paddy']);
const GREEN = new Set(['grass', 'thicket', 'moss']);
const BARE = new Set(['earth', 'stone', 'field', 'sand']);

/**
 * @param {string[][]} tiles 每一格的地面种类：grass、earth、stone、field、bridge、water、paddy、thicket、
 *   sand（河滩）、moss（林下苔地）；屋里还有 boards、flags、wall、void（见 interior.js）
 * @param {number} seed
 * @returns {Grid} 宽高是格子数乘以 16 的一幅地面
 */
export function paintGround(tiles, seed = 1) {
  const rows = tiles.length;
  const cols = tiles[0].length;
  const g = new Grid(cols * TILE, rows * TILE);
  const tileAt = (tx, ty) =>
    tiles[Math.max(0, Math.min(rows - 1, ty))][Math.max(0, Math.min(cols - 1, tx))];

  // 第一步：每个像素属于哪种地面。自然地面的边界用噪声推歪几个像素。
  const kinds = new Array(g.w * g.h);
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      const hard = tileAt(x >> 4, y >> 4);
      let kind = hard;
      if (SOFT.has(hard)) {
        const dx = Math.round((noise(x, y, 7, seed + 11) - 0.5) * 7);
        const dy = Math.round((noise(x, y, 7, seed + 23) - 0.5) * 7);
        const moved = tileAt((x + dx) >> 4, (y + dy) >> 4);
        if (SOFT.has(moved)) kind = moved;
      }
      kinds[y * g.w + x] = kind;
    }
  const K = (x, y) =>
    kinds[Math.max(0, Math.min(g.h - 1, y)) * g.w + Math.max(0, Math.min(g.w - 1, x))];
  const around = (x, y, d, test) =>
    test(K(x, y - d)) || test(K(x, y + d)) || test(K(x - d, y)) || test(K(x + d, y));

  // 第二步：底色（大片的浓淡）和边缘（岸线、田埂、草压在路上的影子）。
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      const kind = K(x, y);
      const patch = noise(x, y, 26, seed + 1);
      const band = noise(x * 0.35, y, 7, seed + 2);
      const fleck = hash2(x, y, seed + 3);
      let c;
      if (INTERIOR.has(kind)) {
        // 屋里的地板、石板、墙和屋外的暗处（interior.js）
        c = interiorColor(kind, x, y, K, seed);
      } else if (kind === 'grass') {
        // 橄榄绿的草地：大片的浓淡边界清楚，深的一块块像云影，再撒零星的亮点
        const blot = noise(x, y, 11, seed + 4);
        c = patch < 0.24 ? P.m1 : patch < 0.8 ? P.m2 : P.m3;
        if (blot > 0.84) c = c === P.m1 ? P.m2 : P.m3;
        if (blot > 0.93) c = P.m4;
        if (band > 0.9 && c === P.m2) c = P.m1;
        if (fleck < 0.004) c = P.m4;
        else if (fleck > 0.996) c = P.m0;
        if (around(x, y, 1, k => WET.has(k))) c = P.m5;
        else if ((BARE.has(K(x, y + 1)) || BARE.has(K(x + 1, y))) && fleck < 0.7) c = P.m4;
      } else if (kind === 'moss') {
        // 林下：比草地深一层，青里带一点褐，日影斑驳
        c = patch < 0.45 ? P.m2 : patch < 0.85 ? P.m3 : P.m4;
        if (band > 0.88) c = P.m2;
        if (fleck < 0.01) c = P.m6;
        else if (fleck > 0.995) c = P.j2;
        if (around(x, y, 1, k => WET.has(k))) c = P.m5;
      } else if (kind === 'sand') {
        // 河滩：浅浅的沙色，近水处湿成深一号，零星有石子
        c = patch < 0.5 ? P.e1 : P.j0;
        if (band > 0.82) c = P.j1;
        if (fleck < 0.006) c = P.q2;
        if (around(x, y, 1, k => WET.has(k))) c = P.j3;
        else if (around(x, y, 2, k => WET.has(k))) c = P.j2;
      } else if (kind === 'thicket') {
        // 林子底下：树冠之间露出来的暗处（树冠另画，见 canopy.js）
        c = patch < 0.5 ? P.v4 : P.v5;
      } else if (kind === 'earth' || kind === 'stone') {
        // 黄土：亮一块暗一块，踩实的地方颜色深；挨着草的边压一道影子
        const worn = noise(x, y, 9, seed + 5);
        c = patch < 0.35 ? P.j0 : patch < 0.75 ? P.j1 : P.j2;
        if (worn > 0.84) c = c === P.j0 ? P.j1 : P.j2;
        if (fleck < 0.004) c = P.j3;
        if (around(x, y, 1, k => WET.has(k))) c = P.j4;
        else if ((GREEN.has(K(x, y - 1)) || GREEN.has(K(x - 1, y))) && fleck < 0.75) c = P.j3;
        else if ((GREEN.has(K(x, y + 1)) || GREEN.has(K(x + 1, y))) && fleck < 0.35) c = P.j0;
      } else if (kind === 'field') {
        // 没翻的田：比路深一层的土色，隐约几道垄沟
        c = patch < 0.3 ? P.j1 : P.j2;
        const furrow = (y + (patch > 0.7 ? 1 : 0)) % 9;
        if (furrow === 0 && band < 0.68) c = P.j3;
        else if (furrow === 1 && band < 0.5) c = P.j1;
        if (fleck < 0.006) c = P.j3;
        if (around(x, y, 1, k => k !== 'field')) c = P.j4;
        else if (around(x, y, 2, k => k !== 'field'))
          c = K(x, y - 2) !== 'field' || K(x - 2, y) !== 'field' ? P.j0 : P.j3;
      } else if (kind === 'paddy') {
        c = patch < 0.85 ? P.x1 : P.x2;
        if (band > 0.9 && patch < 0.4) c = P.x0;
        // 迎光侧是长草的堤顶，背光侧露出泥壁，水线留一圈青亮反光。
        const grassLip = around(x, y, 2, k => k !== 'paddy');
        if (grassLip) c = band < 0.65 ? P.m3 : P.m2;
        else if (K(x, y - 4) !== 'paddy' || K(x - 3, y) !== 'paddy') c = P.j4;
        else if (around(x, y, 4, k => k !== 'paddy')) c = P.x0;
      } else if (kind === 'water') {
        // 越往中间越深；北岸压在水上一道暗影，别的岸边是一圈浅水
        const deep = !around(x, y, 9, k => k !== 'water');
        const mid = !around(x, y, 5, k => k !== 'water');
        const land = k => !WET.has(k) && k !== 'bridge';
        c = deep ? P.x4 : mid ? P.x3 : P.x2;
        if (land(K(x, y - 1)) || land(K(x, y - 2))) c = P.x5;
        else if (around(x, y, 1, land)) c = fleck < 0.8 ? P.x1 : P.x0;
        if (K(x, y - 1) === 'bridge' || K(x, y - 2) === 'bridge' || K(x, y - 3) === 'bridge')
          c = P.x5;
      } else {
        c = bridgeColor(x, y, K, seed);
      }
      g.set(x, y, c);
    }

  slabs(g, K, seed);
  for (let ty = 0; ty < rows; ty++)
    for (let tx = 0; tx < cols; tx++) details(g, K, tileAt(tx, ty), tx, ty, seed);
  canopy(g, K, seed);
  return g;
}

// 石桥：顺着走的方向铺的长条石，上下两条矮石栏。
function bridgeColor(x, y, K, seed) {
  if (K(x, y - 1) !== 'bridge' || K(x, y + 1) !== 'bridge') return P.o0;
  if (K(x, y - 2) !== 'bridge') return P.q0;
  if (K(x, y + 2) !== 'bridge') return P.q3;
  if (y % 10 === 4) return P.q3;
  if ((x + (Math.floor(y / 10) % 2) * 12) % 24 === 0) return P.q3;
  return hash2(x >> 3, Math.floor(y / 10), seed + 41) < 0.4 ? P.q2 : P.q1;
}

// 石板路：一块块大小不一的青石板，只铺在石路的像素上，所以路边自然是参差的。
function slabs(g, K, seed) {
  const heights = [13, 12, 14];
  for (let y0 = 0, row = 0; y0 < g.h; y0 += heights[row % 3], row++) {
    const h = heights[row % 3];
    for (let x0 = -((row * 7) % 13); x0 < g.w;) {
      const w = 16 + Math.floor(hash2(x0, row, seed + 31) * 13);
      const tone = hash2(x0, row, seed + 32);
      const body = tone < 0.25 ? P.q0 : tone < 0.85 ? P.q1 : P.q2;
      for (let y = y0 + 1; y < y0 + h; y++)
        for (let x = x0 + 1; x < x0 + w; x++) {
          if (!g.inside(x, y) || K(x, y) !== 'stone') continue;
          const cornerX = x === x0 + 1 || x === x0 + w - 1;
          const cornerY = y === y0 + 1 || y === y0 + h - 1;
          if (cornerX && cornerY) continue;
          const fleck = hash2(x, y, seed + 33);
          let c = body;
          if (y === y0 + 1 || x === x0 + 1) c = body === P.q0 ? P.l2 : P.q0;
          else if (y === y0 + h - 1 || x === x0 + w - 1) c = P.q3;
          else if (fleck < 0.02) c = P.q3;
          else if (fleck > 0.994) c = P.m4;
          g.set(x, y, c);
        }
      x0 += w;
    }
  }
}

const TUFTS = [
  [
    [0, 1, 'm5'],
    [1, 0, 'm5'],
    [2, 1, 'm6'],
    [3, 0, 'm5'],
    [4, 1, 'm5'],
  ],
  [
    [0, 0, 'm0'],
    [1, 1, 'm5'],
    [2, 0, 'm0'],
    [1, 0, 'm4'],
  ],
  [
    [0, 0, 'm5'],
    [2, 1, 'm5'],
    [1, 2, 'm4'],
  ],
  [
    [0, 1, 'm4'],
    [1, 0, 'm6'],
    [2, 1, 'm4'],
  ],
];
const BLOOMS = ['l0', 'p2', 'y1', 'p1'];

// 每一格里的小东西：草丛、野花、石子、秧苗、水纹。位置由格子坐标决定，所以每次画都一样。
function details(g, K, kind, tx, ty, seed) {
  const r = n => hash2(tx, ty, seed + 50 + n);
  const ox = tx * TILE;
  const oy = ty * TILE;
  const put = (x, y, color, only) => {
    if (K(x, y) === only) g.set(x, y, P[color]);
  };
  if (kind === 'grass') {
    if (r(1) < 0.34) {
      const x = ox + 1 + Math.floor(r(2) * 10);
      const y = oy + 2 + Math.floor(r(3) * 11);
      for (const [dx, dy, color] of TUFTS[Math.floor(r(4) * TUFTS.length)])
        put(x + dx, y + dy, color, 'grass');
    }
    if (r(5) < 0.08) {
      const x = ox + 3 + Math.floor(r(6) * 10);
      const y = oy + 3 + Math.floor(r(7) * 10);
      const petal = BLOOMS[Math.floor(r(8) * BLOOMS.length)];
      for (const [dx, dy] of [
        [0, -1],
        [-1, 0],
        [1, 0],
        [0, 1],
      ])
        put(x + dx, y + dy, petal, 'grass');
      put(x, y, 'y2', 'grass');
    }
  } else if (kind === 'moss') {
    // 蕨叶和落下的松针
    if (r(1) < 0.4) {
      const x = ox + 2 + Math.floor(r(2) * 11);
      const y = oy + 3 + Math.floor(r(3) * 10);
      for (const [dx, dy, color] of [
        [0, 0, 'm6'],
        [-1, -1, 'm5'],
        [1, -1, 'm5'],
        [-2, -2, 'm5'],
        [2, -2, 'm5'],
        [0, -2, 'm6'],
      ])
        put(x + dx, y + dy, color, 'moss');
    }
    if (r(4) < 0.25) put(ox + Math.floor(r(5) * 14), oy + Math.floor(r(6) * 14), 'j3', 'moss');
  } else if (kind === 'sand') {
    // 石子、贝壳
    for (let i = 0; i < 2; i++)
      if (r(7 + i) < 0.3) {
        const x = ox + 2 + Math.floor(r(9 + i) * 12);
        const y = oy + 2 + Math.floor(r(11 + i) * 12);
        put(x, y, i ? 'q2' : 'q3', 'sand');
        put(x + 1, y, 'q1', 'sand');
      }
  } else if (kind === 'earth') {
    if (r(1) < 0.16) {
      const x = ox + 2 + Math.floor(r(2) * 11);
      const y = oy + 2 + Math.floor(r(3) * 11);
      put(x, y, 'j0', 'earth');
      put(x + 1, y, 'j0', 'earth');
      put(x, y + 1, 'j4', 'earth');
      put(x + 1, y + 1, 'j3', 'earth');
    }
  } else if (kind === 'field') {
    // 每格四角点一下，隐约看得出格子，方便对准。
    put(ox, oy, 'j3', 'field');
    put(ox + 15, oy, 'j3', 'field');
    if (r(1) < 0.5) {
      const x = ox + 3 + Math.floor(r(2) * 9);
      const y = oy + 3 + Math.floor(r(3) * 9);
      put(x, y, 'j3', 'field');
      put(x + 1, y - 1, 'j0', 'field');
    }
  } else if (kind === 'paddy') {
    for (const [sx, sy] of [
      [4, 6],
      [12, 6],
      [4, 13],
      [12, 13],
    ]) {
      const x = ox + sx + Math.floor(r(sx + sy) * 2);
      const y = oy + sy;
      const clear = [
        [0, 0],
        [-1, -1],
        [1, -1],
        [0, -2],
        [0, 1],
      ].every(
        ([dx, dy]) =>
          K(x + dx, y + dy) === 'paddy' && [P.x0, P.x1, P.x2].includes(g.get(x + dx, y + dy)),
      );
      if (!clear) continue;
      g.set(x, y, P.v2)
        .set(x - 1, y - 1, P.v1)
        .set(x + 1, y - 1, P.v1)
        .set(x, y - 1, P.v2)
        .set(x, y - 2, P.v0);
      g.set(x, y + 1, P.x3);
    }
  } else if (kind === 'water') {
    for (let i = 0; i < 2; i++) {
      if (r(30 + i) > 0.6) continue;
      const x = ox + Math.floor(r(32 + i) * 9);
      const y = oy + 2 + Math.floor(r(34 + i) * 12);
      const len = 3 + Math.floor(r(36 + i) * 5);
      const open = [P.x2, P.x3, P.x4];
      if (!open.includes(g.get(x - 1, y)) || !open.includes(g.get(x + len, y))) continue;
      const color = r(38 + i) < 0.65 ? P.x0 : P.x5;
      for (let dx = 0; dx < len; dx++) if (open.includes(g.get(x + dx, y))) g.set(x + dx, y, color);
    }
  }
}
