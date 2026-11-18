// 画地图地面用的几支笔：一块矩形、一个椭圆、一条有宽度的弯线（溪、河、小路）。后画的盖住先画的。
// 坐标是格子，左上角是 (0,0)；弯线的点可以带小数。画完用 rows() 取出一行行的地面字符。
// 字符的意思见 kinds.js 的 GROUND。

/** 一张 w×h 的空地，先铺满 fill。 */
export function canvas(w, h, fill = '.') {
  const a = Array.from({ length: h }, () => Array(w).fill(fill));
  const put = (ch, x, y) => {
    if (x >= 0 && y >= 0 && x < w && y < h) a[y][x] = ch;
  };
  const api = {
    rect(ch, x0, y0, x1, y1) {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(ch, x, y);
      return api;
    },
    /** 椭圆：圆心 (cx, cy)，横半径 rx、竖半径 ry。 */
    blob(ch, cx, cy, rx, ry) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
          if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) put(ch, x, y);
      return api;
    },
    /** 沿着一串点画一条宽 width 格的弯线。 */
    stroke(ch, points, width) {
      const r = width / 2;
      for (let i = 1; i < points.length; i++) {
        const [x0, y0] = points[i - 1];
        const [x1, y1] = points[i];
        const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 4);
        for (let s = 0; s <= steps; s++) {
          const cx = x0 + ((x1 - x0) * s) / steps;
          const cy = y0 + ((y1 - y0) * s) / steps;
          for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
            for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
              if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) put(ch, x, y);
        }
      }
      return api;
    },
    /** 只在原来是 from 的格子上换成 ch（比如只把水改成桥）。 */
    swap(ch, from, x0, y0, x1, y1) {
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) if (a[y]?.[x] === from) put(ch, x, y);
      return api;
    },
    rows: () => a.map(row => row.join('')),
  };
  return api;
}
