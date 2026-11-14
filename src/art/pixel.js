// 像素画的底层工具：一块像素格子（Grid）加上画点、线、椭圆、多边形、描边这些操作。
// 这里没有浏览器的东西，在 Node 里也能跑，所以素材可以在测试里检查、在工具里导出成图片。
// 颜色是一个 32 位整数（内存里按 R、G、B、A 排），0 表示透明。

/** '#rrggbb' → 颜色整数。alpha 是 0–255。 */
export function hex(text, alpha = 255) {
  const n = parseInt(text.slice(1), 16);
  return ((alpha << 24) | ((n & 0xff) << 16) | (n & 0xff00) | (n >>> 16)) >>> 0;
}

const R = c => c & 0xff;
const G = c => (c >>> 8) & 0xff;
const B = c => (c >>> 16) & 0xff;
const A = c => c >>> 24;
const pack = (r, g, b, a = 255) => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;

/** 两种颜色按比例混合，t = 0 得到 a，t = 1 得到 b。 */
export function mix(a, b, t) {
  const m = (x, y) => Math.round(x + (y - x) * t);
  return pack(m(R(a), R(b)), m(G(a), G(b)), m(B(a), B(b)), m(A(a), A(b)));
}

/** 带种子的随机数发生器：同一个种子画出来的东西永远一样。 */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 整数坐标 → [0,1) 的固定随机数（不依赖调用顺序）。 */
export function hash2(x, y, seed = 0) {
  let h =
    Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** 平滑的二维噪声，值在 0–1 之间。scale 越大，色块越大。 */
export function noise(x, y, scale, seed = 0) {
  const fx = x / scale;
  const fy = y / scale;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const ease = t => t * t * (3 - 2 * t);
  const sx = ease(fx - x0);
  const sy = ease(fy - y0);
  const a = hash2(x0, y0, seed);
  const b = hash2(x0 + 1, y0, seed);
  const c = hash2(x0, y0 + 1, seed);
  const d = hash2(x0 + 1, y0 + 1, seed);
  return a + (b - a) * sx + (c - a + (a - b + d - c) * sx) * sy;
}

export class Grid {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = new Uint32Array(w * h);
  }

  inside(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  get(x, y) {
    return this.inside(x, y) ? this.data[y * this.w + x] : 0;
  }

  set(x, y, c) {
    if (this.inside(x, y)) this.data[y * this.w + x] = c;
    return this;
  }

  opaque(x, y) {
    return A(this.get(x, y)) > 0;
  }

  /** 把颜色 c 以 alpha（0–1）的浓度盖在已有颜色上；底下是透明的就画成半透明。 */
  wash(x, y, c, alpha) {
    if (!this.inside(x, y)) return this;
    const under = this.data[y * this.w + x];
    this.data[y * this.w + x] = A(under)
      ? mix(under, (c & 0xffffff) | (A(under) << 24), alpha)
      : pack(R(c), G(c), B(c), Math.round(255 * alpha));
    return this;
  }

  rect(x, y, w, h, c) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c);
    return this;
  }

  hline(x0, x1, y, c) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, c);
    return this;
  }

  vline(x, y0, y1, c) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.set(x, y, c);
    return this;
  }

  line(x0, y0, x1, y1, c) {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
    return this;
  }

  /** 实心椭圆。test 可以再加一个条件（比如“只画在已有像素上”）。 */
  ellipse(cx, cy, rx, ry, c, test = null) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / (rx + 0.35);
        const dy = (y - cy) / (ry + 0.35);
        if (dx * dx + dy * dy <= 1 && (!test || test(x, y))) this.set(x, y, c);
      }
    return this;
  }

  /** 实心多边形，points 是 [[x, y], …]。 */
  poly(points, c) {
    const ys = points.map(p => p[1]);
    for (let y = Math.min(...ys); y <= Math.max(...ys); y++) {
      const xs = [];
      for (let i = 0; i < points.length; i++) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[(i + 1) % points.length];
        if (y1 === y2) continue;
        if (y >= Math.min(y1, y2) && y < Math.max(y1, y2))
          xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2)
        this.hline(Math.round(xs[i]), Math.round(xs[i + 1]), y, c);
    }
    return this;
  }

  /** 把另一块格子贴上来（透明的地方不贴）。 */
  blit(src, dx, dy, { flipX = false } = {}) {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const c = src.data[y * src.w + (flipX ? src.w - 1 - x : x)];
        if (A(c)) this.set(dx + x, dy + y, c);
      }
    return this;
  }

  /** 描边：凡是透明、又挨着不透明像素的地方，涂上 c。keep(x, y) 可以筛掉不想描的位置。 */
  outline(c, keep = null) {
    const src = this.data.slice();
    const solid = (x, y) => this.inside(x, y) && A(src[y * this.w + x]) > 200;
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (A(src[y * this.w + x])) continue;
        const touches = solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1);
        if (touches && (!keep || keep(x, y))) this.data[y * this.w + x] = c;
      }
    return this;
  }

  /** 对每个不透明像素调用 fn(x, y, color)；fn 返回颜色就替换。 */
  each(fn) {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const c = this.data[y * this.w + x];
        if (!A(c)) continue;
        const next = fn(x, y, c);
        if (next !== undefined) this.data[y * this.w + x] = next;
      }
    return this;
  }

  /** RGBA 字节，可以直接交给浏览器的 ImageData 或 PNG 编码器。 */
  bytes() {
    return new Uint8ClampedArray(this.data.buffer, this.data.byteOffset, this.data.byteLength);
  }
}

/** 用字符画定义小图：rows 是一行行字符，legend 把字符对到颜色；'.' 和空格是透明。 */
export function fromText(rows, legend) {
  const grid = new Grid(Math.max(...rows.map(r => r.length)), rows.length);
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.' || ch === ' ') return;
      if (!(ch in legend)) throw new Error('字符画里用了没定义的字符 ' + ch);
      grid.set(x, y, legend[ch]);
    }),
  );
  return grid;
}
