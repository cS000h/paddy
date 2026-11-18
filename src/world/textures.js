// 把 art 层画好的像素格子交给 Phaser 当贴图，并登记人物的动画。
// 贴图的名字：ground、obj:<种类>:<样子>、soil:<dry|wet>.<拼接>、crop:<阶段>、cursor:<ok|no>、
// mark:<weeds|bugs>（地里的毛病）、icon:<名字>、person:<外观>（每帧一个编号）、shadow、fx:<名字>。
import * as art from '../art/index.js';
import { GROUND } from '../content/maps/index.js';
import { CROPS } from '../content/items.js';
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
  const add = (key, grid) => {
    if (scene.textures.exists(key)) {
      if (!key.startsWith('ground')) return scene.textures.get(key);
      scene.textures.remove(key);
    }
    return scene.textures.addCanvas(key, gridToCanvas(grid));
  };
  const tiles = map.ground.map(row => [...row].map(ch => GROUND[ch].id));
  const ground = art.paintGround(tiles, 7);
  add('ground', ground);
  for (let season = 0; season < 4; season++)
    add('ground:' + season, art.seasonGrid(ground, season));

  const anchors = {};
  for (const [kind, x, y] of map.objects) {
    const variant = art.variantAt(x, y);
    const key = `obj:${kind}:${variant}`;
    if (anchors[key]) continue;
    // 平常的样子，加上它随状态换的几副样子（键是“物件@样子”）
    for (const look of [null, ...art.objectLooks(kind)]) {
      const name = look ? key + '@' + look : key;
      const sprite = art.objectSprite(kind, variant, look);
      add(name, sprite.grid);
      for (let season = 0; season < 4; season++)
        add(name + ':' + season, art.seasonGrid(sprite.grid, season));
      anchors[name] = { ox: sprite.ax / sprite.grid.w, oy: sprite.ay / sprite.grid.h };
    }
  }

  for (const [key, grid] of Object.entries(art.soilSet())) add('soil:' + key, grid);
  for (const id of Object.keys(CROPS))
    art.cropSet(id).forEach((g, stage) => add(`crop:${id}:${stage}`, g));
  art.cropFrames().forEach((grid, stage) => add('crop:' + stage, grid));
  for (const name of art.PLOT_MARKS) add('mark:' + name, art.plotMark(name));
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
      if (scene.anims.exists(`${look}:walk:${dir}`)) return;
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
  add('fx:steam', puff(7, P.l0));
  add('fx:lantern', art.lanternGlobe());
  for (const [name, grid] of Object.entries(art.critters())) add('fx:' + name, grid);
  // 做活时的小东西：灶膛里的火苗、火星、木屑、铜钱
  add('fx:flame', flame());
  add('fx:ember', speck(1, 1, P.c0));
  add('fx:chip', speck(2, 1, P.h1));
  add('fx:coin', speck(2, 2, P.y1).set(1, 1, P.y2));
  add('fx:hen', art.hen());
  return { anchors };
}

// 一簇火苗：外红、里黄、芯白，下宽上尖
function flame() {
  const g = new art.Grid(7, 9);
  g.poly(
    [
      [0, 8],
      [1, 4],
      [3, 0],
      [5, 4],
      [6, 8],
    ],
    P.c1,
  );
  g.poly(
    [
      [1, 8],
      [2, 5],
      [3, 2],
      [4, 5],
      [5, 8],
    ],
    P.y1,
  );
  return g.vline(3, 5, 8, P.y0).set(3, 7, P.l0);
}

/** 人物贴图里某个朝向、某个姿势是第几帧。 */
export const frameOf = (dir, pose) =>
  art.DIRS.indexOf(dir) * art.POSES.length + art.POSES.indexOf(pose);
