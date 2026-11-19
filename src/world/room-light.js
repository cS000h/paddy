// 画面里只有环境光参与正片叠底。地板上的窗影、桌灯和人物各守自己的遮挡顺序。
import { roomLight, roomExposure, lightSources, oilLamp, lampFlame } from '../art/room-light.js';
import { P } from '../art/palette.js';
import { gridToCanvas } from './textures.js';
import { TILE } from './logic.js';
import { DEPTH } from './depth.js';

const duration = 640;
const asRgb = packed => ((packed & 255) << 16) | (packed & 65280) | ((packed >>> 16) & 255);
const channel = (rgb, shift) => (rgb >> shift) & 255;
const shadePaper = rgb =>
  [16, 8, 0].reduce(
    (sum, k) => sum + (Math.round((channel(asRgb(P.paper1), k) * channel(rgb, k)) / 255) << k),
    0,
  );
const between = (a, b, t) =>
  [16, 8, 0].reduce(
    (sum, k) => sum + (Math.round(channel(a, k) + (channel(b, k) - channel(a, k)) * t) << k),
    0,
  );

// 复用两张来源画布和一张游戏贴图；时辰或天气改变时才短暂上传，静止时没有逐帧开销。
function layer(scene, name, w, h, depth, mode) {
  const tex = scene.textures.exists(name)
    ? scene.textures.get(name)
    : scene.textures.createCanvas(name, w, h);
  scene.add.image(0, 0, name).setOrigin(0).setDepth(depth).setBlendMode(mode);
  const source = () => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  };
  const from = source(),
    to = source(),
    ctx = tex.context;
  return {
    prepare(grid) {
      from.getContext('2d').clearRect(0, 0, w, h);
      from.getContext('2d').drawImage(tex.canvas, 0, 0);
      to.getContext('2d').putImageData(new ImageData(grid.bytes(), w, h), 0, 0);
    },
    draw(t) {
      ctx.save();
      ctx.clearRect(0, 0, w, h);
      if (t < 1) {
        ctx.globalAlpha = 1 - t;
        ctx.drawImage(from, 0, 0);
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = t;
      ctx.drawImage(to, 0, 0);
      ctx.restore();
      tex.refresh();
    },
  };
}
function tableLamps(scene, sources) {
  const lamps = sources.filter(s => s.kind === 'lamp');
  if (lamps.length)
    for (const [key, draw] of [
      ['lamp:bowl', oilLamp],
      ['lamp:flame', lampFlame],
    ])
      if (!scene.textures.exists(key)) scene.textures.addCanvas(key, gridToCanvas(draw()));
  return lamps.map(s => {
    scene.add
      .image(s.x, s.y, 'lamp:bowl')
      .setOrigin(0.5, 1)
      .setDepth(s.foot + 0.05);
    return scene.add
      .image(s.x, s.y - 5, 'lamp:flame')
      .setOrigin(0.5, 1)
      .setDepth(s.foot + 0.1);
  });
}
export function worldLighting(scene, map) {
  const w = map.width * TILE,
    h = map.height * TILE;
  const sources = map.indoor ? lightSources(map, TILE) : [];
  const lamps = tableLamps(scene, sources);
  const floor =
    map.indoor && layer(scene, 'light:floor:' + map.id, w, h, DEPTH.floor + 1, 'NORMAL');
  const exposure =
    map.indoor && layer(scene, 'light:exposure:' + map.id, w, h, DEPTH.weather + 1, 'MULTIPLY');
  const sky =
    !map.indoor &&
    scene.add
      .rectangle(0, 0, w, h, 0xffffff)
      .setOrigin(0)
      .setDepth(DEPTH.weather + 1)
      .setBlendMode('MULTIPLY');
  let last = '',
    tween,
    current = 0xffffff;
  return (light, minute, weather) => {
    const key = minute + ':' + weather;
    if (key === last) return;
    tween?.stop();
    const start = current,
      end = parseInt(light.tint.slice(1), 16),
      was = lamps[0]?.alpha || 0;
    if (floor) {
      floor.prepare(roomLight(map, TILE, light));
      exposure.prepare(roomExposure(map, TILE, light, sources));
    }
    let drawn = -1;
    const draw = t => {
      current = between(start, end, t);
      if (sky) sky.setFillStyle(current);
      if (!floor) return;
      scene.cameras.main.setBackgroundColor(shadePaper(current));
      for (const lamp of lamps) lamp.setAlpha(was + (light.lamp - was) * t);
      const frame = Math.floor(t * 12);
      if (frame === drawn) return;
      drawn = frame;
      floor.draw(frame / 12);
      exposure.draw(frame / 12);
    };
    if (last)
      tween = scene.tweens.addCounter({
        from: 0,
        to: 1,
        duration,
        onUpdate: tw => draw(tw.getValue()),
      });
    else draw(1);
    last = key;
  };
}
