// 把 art 层画好的像素格子交给 Phaser 当贴图，并登记人物的动画。
// 贴图的名字：ground、obj:<种类>:<样子>、soil:<dry|wet>.<拼接>、crop:<阶段>、cursor:<ok|no>、
// icon:<名字>、person:<外观>（每帧一个编号）、shadow、fx:<名字>。
import * as art from '../art/index.js';
import { GROUND } from '../content/maps/index.js';
import { P } from '../art/palette.js';

export function gridToCanvas(grid) {
  const canvas = document.createElement('canvas');
  canvas.width = grid.w;
  canvas.height = grid.h;
  canvas.getContext('2d').putImageData(new ImageData(grid.bytes(), grid.w, grid.h), 0, 0);
  return canvas;
}

const speck = (w, h, color) => {
  const g = new art.Grid(w, h);
  return g.rect(0, 0, w, h, color);
};

// 一团柔和的雾或烟：中间浓、边上淡，用稀疏的点过渡。
function puff(size, color) {
  const g = new art.Grid(size, size);
  const c = size / 2 - 0.5;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - c, y - c) / c;
      if (d < 1) g.wash(x, y, color, Math.max(0, 0.75 * (1 - d * d)));
    }
  return g;
}

export function buildTextures(scene, map) {
  const add = (key, grid) => scene.textures.addCanvas(key, gridToCanvas(grid));
  const tiles = map.ground.map(row => [...row].map(ch => GROUND[ch].id));
  add('ground', art.paintGround(tiles, 7));

  const anchors = {};
  for (const [kind, x, y] of map.objects) {
    const variant = art.variantAt(x, y);
    const key = `obj:${kind}:${variant}`;
    if (anchors[key]) continue;
    const sprite = art.objectSprite(kind, variant);
    add(key, sprite.grid);
    anchors[key] = { ox: sprite.ax / sprite.grid.w, oy: sprite.ay / sprite.grid.h };
  }

  for (const [key, grid] of Object.entries(art.soilSet())) add('soil:' + key, grid);
  art.cropFrames().forEach((grid, stage) => add('crop:' + stage, grid));
  add('cursor:ok', art.cursor(true));
  add('cursor:no', art.cursor(false));
  for (const name of ['hoe', 'seed', 'can', 'hand']) add('icon:' + name, art.icon(name));
  add('shadow', art.personShadow());

  for (const look of art.LOOK_NAMES) {
    const texture = add('person:' + look, art.personSheet(look));
    art.DIRS.forEach((dir, row) =>
      art.POSES.forEach((pose, col) =>
        texture.add(
          row * art.POSES.length + col,
          0,
          col * art.FRAME_W,
          row * art.FRAME_H,
          art.FRAME_W,
          art.FRAME_H,
        ),
      ),
    );
    art.DIRS.forEach((dir, row) => {
      const frame = col => ({ key: 'person:' + look, frame: row * art.POSES.length + col });
      scene.anims.create({
        key: `${look}:walk:${dir}`,
        frames: [1, 2, 3, 0].map(frame),
        frameRate: 8,
        repeat: -1,
      });
    });
  }

  add('fx:dirt', speck(2, 2, P.d2));
  add('fx:clod', speck(2, 2, P.d0));
  add('fx:drop', speck(1, 2, P.w3));
  add('fx:splash', speck(2, 1, P.w0));
  add('fx:seed', speck(1, 1, P.h0));
  add('fx:leaf', speck(2, 2, P.g3));
  add('fx:petal', speck(2, 1, P.p2));
  add('fx:glint', speck(3, 1, P.w0));
  add('fx:smoke', puff(9, P.l1));
  return { anchors };
}

/** 人物贴图里某个朝向、某个姿势是第几帧。 */
export const frameOf = (dir, pose) =>
  art.DIRS.indexOf(dir) * art.POSES.length + art.POSES.indexOf(pose);
