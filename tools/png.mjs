// 把一块像素格子存成 PNG 文件（只用 Node 自带的 zlib，不需要图像库）。
import zlib from 'node:zlib';
import { Grid } from '../src/art/pixel.js';

/** RGBA 字节 → PNG 文件内容。 */
export function encodePng(w, h, rgba) {
  const stride = w * 4 + 1;
  const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++)
    Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * stride + 1);
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const frame = Buffer.alloc(8 + body.length);
    frame.writeUInt32BE(data.length, 0);
    body.copy(frame, 4);
    frame.writeUInt32BE(zlib.crc32(body) >>> 0, 4 + body.length);
    return frame;
  };
  const head = Buffer.alloc(13);
  head.writeUInt32BE(w, 0);
  head.writeUInt32BE(h, 4);
  head[8] = 8; // 每个通道 8 位
  head[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', head),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** 整数倍放大，像素保持方方正正。 */
export function enlarge(grid, times) {
  const out = new Grid(grid.w * times, grid.h * times);
  for (let y = 0; y < out.h; y++)
    for (let x = 0; x < out.w; x++)
      out.data[y * out.w + x] = grid.data[Math.floor(y / times) * grid.w + Math.floor(x / times)];
  return out;
}

export const gridToPng = grid => encodePng(grid.w, grid.h, grid.bytes());
