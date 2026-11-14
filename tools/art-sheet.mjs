// 不开浏览器，直接把素材和整张场景合成图片，方便改画的时候反复看。
//   npm run art:sheet   → .cache/scene.png（整张地图）、.cache/scene-*.png（局部放大）、.cache/sprites.png（人物和小图）
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as art from '../src/art/index.js';
import { MAPS, GROUND } from '../src/content/maps/index.js';
import { gridToPng, enlarge } from './png.mjs';

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.cache');
mkdirSync(out, { recursive: true });
const { Grid, TILE } = art;

/** 带透明度地贴图（影子是半透明的）。 */
function over(dst, src, dx, dy) {
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      const c = src.data[y * src.w + x];
      const a = (c >>> 24) / 255;
      if (!a || !dst.inside(dx + x, dy + y)) continue;
      const u = dst.get(dx + x, dy + y);
      const ch = s => Math.round(((u >>> s) & 255) * (1 - a) + ((c >>> s) & 255) * a);
      dst.set(dx + x, dy + y, ((255 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)) >>> 0);
    }
}
const crop = (g, x, y, w, h) => {
  const o = new Grid(w, h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) o.data[j * w + i] = g.get(x + i, y + j);
  return o;
};
const frame = (sheet, col, row) =>
  crop(sheet, col * art.FRAME_W, row * art.FRAME_H, art.FRAME_W, art.FRAME_H);

const map = MAPS.yard;
const scene = art.paintGround(
  map.ground.map(row => [...row].map(ch => GROUND[ch].id)),
  7,
);

// 摆几格示范用的地：干的、湿的、各个阶段的菜
const soil = art.soilSet();
const crops = art.cropFrames();
const demo = new Map();
for (let x = 7; x <= 12; x++)
  for (let y = 20; y <= 22; y++)
    demo.set(`${x},${y}`, { wet: y !== 22, stage: y === 22 ? -1 : (x - 7) % 4 });
for (const [key, plot] of demo) {
  const [x, y] = key.split(',').map(Number);
  const has = (dx, dy) => demo.has(`${x + dx},${y + dy}`);
  const mask =
    (has(0, -1) ? 1 : 0) | (has(1, 0) ? 2 : 0) | (has(0, 1) ? 4 : 0) | (has(-1, 0) ? 8 : 0);
  over(scene, soil[`${plot.wet ? 'wet' : 'dry'}.${mask}`], x * TILE, y * TILE);
}

// 物件和人按“脚下的位置”从上到下画，下面的盖住上面的
const draws = [];
for (const [kind, x, y] of map.objects) {
  const s = art.objectSprite(kind, art.variantAt(x, y));
  draws.push({
    y: (y + 1) * TILE,
    x,
    run: () => over(scene, s.grid, x * TILE + 8 - s.ax, (y + 1) * TILE - s.ay),
  });
}
for (const [key, plot] of demo) {
  if (plot.stage < 0) continue;
  const [x, y] = key.split(',').map(Number);
  draws.push({
    y: (y + 1) * TILE - 1,
    x,
    run: () => over(scene, crops[plot.stage], x * TILE, y * TILE - 2),
  });
}
const sheets = Object.fromEntries(art.LOOK_NAMES.map(n => [n, art.personSheet(n)]));
const stand = (look, x, y, row, col = 0) =>
  draws.push({
    y: (y + 1) * TILE - 2,
    x,
    run: () => {
      over(scene, art.personShadow(), x * TILE + 1, (y + 1) * TILE - 6);
      over(scene, frame(sheets[look], col, row), x * TILE, (y + 1) * TILE - art.FRAME_H - 1);
    },
  });
stand('hero', 8, 11, 0);
stand('hero', 13, 19, 2, 1);
stand('shi', 23, 22, 2);
stand('gui', 30, 10, 0);
stand('gui', 29, 14, 1, 1);
draws.sort((a, b) => a.y - b.y || a.x - b.x).forEach(d => d.run());
over(scene, art.cursor(true), 13 * TILE, 20 * TILE);

writeFileSync(path.join(out, 'scene.png'), gridToPng(scene));
const windows = {
  yard: [24, 24, 320, 240],
  neighbour: [300, 30, 330, 240],
  field: [70, 250, 330, 200],
  creek: [440, 150, 264, 300],
};
for (const [name, [x, y, w, h]] of Object.entries(windows))
  writeFileSync(
    path.join(out, `scene-${name}.png`),
    gridToPng(enlarge(crop(scene, x, y, w, h), 3)),
  );

// 人物和小图的总览
const sheet = new Grid(16 * 6 * 3 + 8, 32 * 4 + 44);
for (let i = 0; i < sheet.data.length; i++) sheet.data[i] = 0xffcfe0d5 >>> 0;
art.LOOK_NAMES.forEach((n, i) => over(sheet, sheets[n], i * 98, 0));
['hoe', 'seed', 'can', 'hand', 'coin'].forEach((n, i) => over(sheet, art.icon(n), 4 + i * 20, 134));
crops.forEach((c, i) => over(sheet, c, 110 + i * 20, 134));
[0, 5, 10, 15].forEach((m, i) => {
  over(sheet, soil[`dry.${m}`], 200 + i * 18, 134);
  over(sheet, soil[`wet.${m}`], 200 + i * 18, 152);
});
writeFileSync(path.join(out, 'sprites.png'), gridToPng(enlarge(sheet, 4)));

// 物品图标的总览：按登记的顺序一行 12 个，垫着宣纸的颜色
const perRow = 12;
const icons = new Grid(perRow * 20 + 4, Math.ceil(art.ITEM_ICONS.length / perRow) * 20 + 4);
for (let i = 0; i < icons.data.length; i++) icons.data[i] = 0xffe3f1f6 >>> 0;
art.ITEM_ICONS.forEach((id, i) =>
  over(icons, art.itemIcon(id), 4 + (i % perRow) * 20, 4 + Math.floor(i / perRow) * 20),
);
writeFileSync(path.join(out, 'items.png'), gridToPng(enlarge(icons, 5)));
console.log('写好了：', out);
