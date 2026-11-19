// 按窗台、灶口和家具的世界坐标画一张透明像素图。只在光照条件变化时重画。
import { Grid, mix, hex } from './pixel.js';
import { P } from './palette.js';

const clamp = n => Math.max(0, Math.min(1, n));
const onFloor = (map, x, y, tile) => {
  const ground = map.ground[Math.floor(y / tile)]?.[Math.floor(x / tile)];
  return ground === 'o' || ground === 'q';
};
function paint(g, x, y, color, alpha) {
  const under = g.get(x, y);
  if (!under) return g.wash(x, y, color, alpha);
  const coverage = alpha + ((1 - alpha) * (under >>> 24)) / 255;
  const rgb = mix(under, color, alpha / coverage) & 0xffffff;
  g.set(x, y, (Math.round(coverage * 255) << 24) | rgb);
}

function windowLight(g, map, cx, sill, tile, light) {
  const { direct, diffuse, height, slope } = light;
  const reach = 32 + (1 - height) * 28;
  const warm = height > 0.65 ? P.paper0 : P.h0;
  // 窗纸比窗框更早反映天色；夜里只留一层青灰，保留木格原色。
  for (let y = 4; y <= 23; y++)
    for (let x = 3; x <= 28; x++) {
      if ([8, 13, 15, 16, 18, 23].includes(x) || [8, 13, 18, 23].includes(y)) continue;
      paint(g, cx - 16 + x, sill - 38 + y, P.w5, 0.67 * (1 - diffuse));
    }
  // 天空漫射光贴近窗脚。直射光斜投到木板上，窗棂在其中留下两道横影和三道竖影。
  for (let dy = 0; dy <= 72; dy++)
    for (let dx = -69; dx <= 69; dx++) {
      const x = cx + dx,
        y = sill + dy;
      if (!onFloor(map, x, y, tile)) continue;
      const haze = clamp(1 - Math.hypot(dx / 31, dy / 40));
      if (haze > 0) paint(g, x, y, P.w0, haze * haze * 0.54 * diffuse);
      const v = (dy - 8) / reach,
        u = (dx - dy * slope) / (26 + v * 11) + 0.5;
      if (v <= 0 || v >= 1 || u <= 0 || u >= 1 || direct === 0) continue;
      const edge = clamp(Math.min(u, 1 - u) * 25) * clamp(Math.min(v, 1 - v) * 24);
      const gap = Math.min(
        Math.min(Math.abs(u - 0.25), Math.abs(u - 0.5), Math.abs(u - 0.75)) * 34,
        Math.min(Math.abs(v - 0.34), Math.abs(v - 0.67)) * reach,
      );
      const alpha = direct * edge * (0.82 - 0.22 * v) * (0.22 + 0.78 * clamp(gap - 0.22));
      paint(g, x, y, warm, alpha);
    }
}

const CAST = {
  bed: [15, 7],
  table: [12, 5],
  cupboard: [10, 6],
  workbench: [8, 4],
  bookshelf: [8, 6],
  vat: [6, 4],
  stove: [12, 5],
};
function furnitureShadow(g, map, cx, foot, tile, shape, light) {
  const [width, h] = shape;
  const len = h * (1.5 - light.height * 0.5);
  for (let dy = 0; dy <= len; dy++)
    for (let dx = -width - 8; dx <= width + 8; dx++) {
      if (!onFloor(map, cx + dx, foot + dy, tile)) continue;
      const t = dy / len;
      const edge = clamp((width * (1 - t * 0.25) - Math.abs(dx - light.slope * dy)) * 0.7);
      if (edge) paint(g, cx + dx, foot + dy, P.ink2, edge * (1 - t) * (0.14 + 0.3 * light.direct));
    }
}
function hearth(g, map, cx, foot, tile, strength) {
  for (let dy = -7; dy <= 22; dy++)
    for (let dx = -25; dx <= 25; dx++) {
      if (!onFloor(map, cx + dx, foot + dy, tile)) continue;
      const fall = clamp(1 - Math.hypot(dx / 25, (dy - 3) / 20));
      if (fall) paint(g, cx + dx, foot + dy, P.y0, strength * fall * fall * 0.88);
    }
}

export function roomLight(map, tile, light) {
  const g = new Grid(map.width * tile, map.height * tile);
  for (const [kind, x, y] of map.objects)
    if (kind === 'roomWindow') windowLight(g, map, (x + 0.5) * tile, (y + 1) * tile, tile, light);
  for (const [kind, x, y] of map.objects) {
    const cx = (x + 0.5) * tile,
      foot = (y + 1) * tile;
    if (CAST[kind]) furnitureShadow(g, map, cx, foot - 1, tile, CAST[kind], light);
    if (kind === 'stove') hearth(g, map, cx + 3, foot, tile, light.embers);
  }
  return g;
}

// 油盏画在茶壶旁的空处。灯座属于桌面，灯焰随环境渐亮。
export function oilLamp() {
  const g = new Grid(9, 7);
  g.ellipse(4, 5, 3.4, 1.2, P.t3)
    .hline(2, 6, 4, P.h2)
    .hline(1, 7, 3, P.u1)
    .hline(2, 6, 2, P.h1)
    .set(4, 1, P.t4);
  return g;
}
export function lampFlame() {
  const g = new Grid(7, 8);
  g.rect(2, 5, 3, 2, P.c0).set(3, 3, P.y1).set(4, 2, P.h1).vline(3, 4, 6, P.y0).set(3, 5, P.l0);
  return g;
}
export function lightSources(map, tile) {
  return map.objects.flatMap(([kind, x, y, data]) => {
    const cx = (x + 0.5) * tile,
      foot = (y + 1) * tile;
    if (data?.oilLamp) return [{ kind: 'lamp', x: cx - 3, y: foot - 16, foot }];
    if (kind === 'stove') return [{ kind: 'embers', x: cx + 3, y: foot - 5, foot }];
    return [];
  });
}
// 光照颜色在世界坐标里渐变。人物走到灯下，衣袖和桌面会一起接到暖光。
export function roomExposure(map, tile, light, sources) {
  const g = new Grid(map.width * tile, map.height * tile);
  g.data.fill(hex(light.tint));
  for (const source of sources) {
    const lamp = source.kind === 'lamp';
    const rx = lamp ? 57 : 30,
      ry = lamp ? 47 : 23;
    const warmth = lamp ? light.lamp : light.embers;
    if (!warmth) continue;
    for (let dy = -ry; dy <= ry; dy++)
      for (let dx = -rx; dx <= rx; dx++) {
        const x = source.x + dx,
          y = source.y + dy;
        if (!onFloor(map, x, y, tile)) continue;
        const d = Math.hypot(dx / rx, dy / ry);
        if (d >= 1) continue;
        const fall = (1 - d) * (1 - d) * (1 + 2 * d);
        g.wash(x, y, lamp ? P.h0 : P.y1, warmth * fall);
      }
  }
  return g;
}
