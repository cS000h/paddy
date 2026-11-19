import { DEPTH } from './depth.js';
// 世界里的风和小生灵：草木随风轻摆、灯笼晃，蝴蝶和蜻蜓飞，鸟群掠过，鱼跃出水，树叶飘落，
// 夜里有萤火，下雨时水面一圈圈涟漪。都只是画面，规则不知道；出不出来看地方、季节、天气和钟点。
// 小生灵只在镜头附近生，离得远了就收掉，数目封顶，手机上也不费力。
import { TILE } from './logic.js';

// 各种草木随风摆的幅度（度）。绕着脚下转，所以是树冠、竹梢在摆。
const SWAY = {
  bamboo: 2.4,
  'tree.willow': 1.6,
  'tree.broad': 0.6,
  'tree.peach': 0.9,
  'tree.camphor': 0.4,
  'tree.pine': 0.5,
  reeds: 4,
  flowers: 3.5,
  bush: 1,
  teaBush: 0.8,
};
const FLY_COLORS = ['white', 'yellow', 'pink'];
const LEAF_TINT = [0xa6c189, 0x89ab70, 0xd8a24a, 0xc9c4b0]; // 春夏绿，秋天黄，冬天灰白

const rand = (a, b) => a + Math.random() * (b - a);
const pick = list => list[Math.floor(Math.random() * list.length)];

/**
 * @param {Phaser.Scene} scene 村庄场景（用它的 add、tweens、cameras、scenery）
 * @param {object} map 这张地图（content/maps）
 */
export function createAmbient(scene, map) {
  const tiles = { water: [], green: [] };
  map.ground.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === 'w') tiles.water.push([x, y]);
      else if (ch === '.' || ch === 'm') tiles.green.push([x, y]);
    }),
  );
  const trees = scene.scenery.filter(s => s.kind.startsWith('tree.') || s.kind === 'bamboo');
  let now = { minute: 600, season: 0, wet: false, snow: false };
  const critters = [];
  let nextBirds = rand(4000, 9000);
  let nextFish = rand(1500, 3500);
  let nextLeaf = rand(800, 2000);
  let nextRipple = 0;

  // —— 草木随风摆、灯笼晃 ——
  for (const s of scene.scenery) {
    const amp = SWAY[s.kind];
    if (!amp) continue;
    scene.tweens.add({
      targets: s.sprite,
      angle: { from: -amp / 2, to: amp / 2 },
      duration: rand(1700, 3200),
      delay: rand(0, 1600),
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }
  for (const [kind, x, y] of map.objects) {
    if (kind !== 'lantern') continue;
    // 钩子在灯笼柱图里 (14, 7)，图的脚下中点是 (8, 36)
    const globe = scene.add
      .image(x * TILE + 14, (y + 1) * TILE - 29, 'fx:lantern')
      .setOrigin(0.5, 0)
      .setDepth((y + 1) * TILE + 1);
    scene.tweens.add({
      targets: globe,
      angle: { from: -9, to: 9 },
      duration: rand(1300, 1900),
      delay: rand(0, 900),
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  const view = () => scene.cameras.main.worldView;
  const inView = ([x, y], pad = 2) => {
    const v = view();
    const px = x * TILE + 8;
    const py = y * TILE + 8;
    return (
      px > v.x - pad * TILE &&
      px < v.right + pad * TILE &&
      py > v.y - pad * TILE &&
      py < v.bottom + pad * TILE
    );
  };
  const day = () => now.minute >= 6 * 60 && now.minute < 18 * 60;
  const night = () => now.minute >= 19 * 60 + 30 || now.minute < 5 * 60;
  const count = type => critters.filter(c => c.type === type).length;

  function add(type, texture, x, y, extra) {
    const sprite = scene.add
      .image(x, y, texture)
      .setDepth(type === 'bird' ? DEPTH.sky : type === 'dragonfly' ? DEPTH.waterInsect : y + 2);
    const c = { type, sprite, x, y, vx: 0, vy: 0, t: rand(0, 1000), ...extra };
    critters.push(c);
    return c;
  }
  const remove = c => {
    c.sprite.destroy();
    critters.splice(critters.indexOf(c), 1);
  };

  // 蝴蝶：在花草间慢慢地飘，翅膀一张一合
  function butterfly() {
    const spots = tiles.green.filter(t => inView(t, 0));
    if (!spots.length) return;
    const [tx, ty] = pick(spots);
    const color = pick(FLY_COLORS);
    add('fly', `fx:fly.${color}.0`, tx * TILE + 8, ty * TILE, {
      color,
      home: [tx * TILE + 8, ty * TILE],
      target: null,
    });
  }
  // 蜻蜓：贴着水面，一下一下地点
  function dragonfly() {
    const spots = tiles.water.filter(t => inView(t, 0));
    if (!spots.length) return;
    const [tx, ty] = pick(spots);
    add('dragonfly', 'fx:dragonfly.0', tx * TILE + 8, ty * TILE + 8, {
      home: [tx * TILE + 8, ty * TILE + 8],
      target: null,
      rest: 0,
    });
  }
  // 一群鸟从镜头一边掠到另一边
  function birds(fromX = null, fromY = null) {
    const v = view();
    const leftToRight = fromX === null ? Math.random() < 0.5 : true;
    const n = fromX === null ? Math.floor(rand(3, 6)) : 3;
    const y0 = fromY ?? v.y + rand(10, v.height * 0.35);
    const x0 = fromX ?? (leftToRight ? v.x - 20 : v.right + 20);
    for (let i = 0; i < n; i++) {
      const b = add('bird', 'fx:bird.0', x0 - (leftToRight ? i * 9 : -i * 9), y0 + rand(-6, 6), {
        vx: (leftToRight ? 1 : -1) * rand(46, 60),
        vy: fromX === null ? rand(-3, 3) : rand(-28, -18),
      });
      b.sprite.setFlipX(!leftToRight);
    }
  }
  // 小鱼跃出水面，落回去时一圈涟漪
  function fishJump() {
    const spots = tiles.water.filter(t => inView(t, 0));
    if (!spots.length) return;
    const [tx, ty] = pick(spots);
    const x = tx * TILE + rand(3, 13);
    const y = ty * TILE + rand(6, 12);
    ripple(x, y);
    const fish = scene.add.image(x, y, 'fx:fish').setDepth(DEPTH.fish);
    const dir = Math.random() < 0.5 ? -1 : 1;
    fish.setFlipX(dir < 0);
    scene.tweens.add({
      targets: fish,
      x: x + dir * 10,
      y: { value: y - 9, duration: 260, ease: 'Quad.easeOut', yoyo: true },
      angle: { from: -40 * dir, to: 40 * dir },
      duration: 520,
      onComplete: () => {
        ripple(fish.x, y);
        fish.destroy();
      },
    });
  }
  function ripple(x, y) {
    const ring = scene.add
      .image(x, y, 'fx:ripple')
      .setDepth(DEPTH.ripple)
      .setAlpha(0.9)
      .setScale(0.4);
    scene.tweens.add({
      targets: ring,
      scale: 1.4,
      alpha: 0,
      duration: 900,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy(),
    });
  }
  // 树叶从树梢飘下来，一路左右荡
  function leaf(x = null, y = null, texture = 'fx:leaf', tint = null) {
    let px = x;
    let py = y;
    if (px === null) {
      const near = trees.filter(s => inView([s.sprite.x / TILE, s.sprite.y / TILE], 1));
      if (!near.length) return;
      const s = pick(near);
      px = s.sprite.x + rand(-12, 12);
      py = s.sprite.y - s.sprite.displayHeight * rand(0.5, 0.85);
    }
    const bit = scene.add
      .image(px, py, texture)
      .setDepth(py + 24)
      .setTint(tint ?? (texture === 'fx:leaf' ? LEAF_TINT[now.season] : 0xffffff));
    scene.tweens.add({
      targets: bit,
      y: py + rand(26, 46),
      duration: rand(1800, 2600),
      ease: 'Sine.easeIn',
    });
    scene.tweens.add({
      targets: bit,
      x: px + rand(-10, 10),
      duration: 600,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
    });
    scene.tweens.add({
      targets: bit,
      alpha: 0,
      delay: 1500,
      duration: 900,
      onComplete: () => bit.destroy(),
    });
  }
  // 萤火：夜里在草上慢慢浮动，一明一暗
  function firefly() {
    const spots = tiles.green.filter(t => inView(t, 0));
    if (!spots.length) return;
    const [tx, ty] = pick(spots);
    const c = add('firefly', 'fx:firefly', tx * TILE + rand(0, 16), ty * TILE + rand(0, 16), {
      home: [tx * TILE + 8, ty * TILE + 8],
    });
    c.sprite.setBlendMode('ADD');
  }

  function steer(c, speed, dt, wobble) {
    const [hx, hy] = c.home;
    if (!c.target || Math.hypot(c.target[0] - c.x, c.target[1] - c.y) < 4)
      c.target = [hx + rand(-40, 40), hy + rand(-28, 20)];
    const dx = c.target[0] - c.x;
    const dy = c.target[1] - c.y;
    const d = Math.hypot(dx, dy) || 1;
    const nx = c.x + (dx / d) * speed * dt;
    const ny = c.y + (dy / d) * speed * dt + Math.sin(c.t * 0.012) * wobble * dt;
    if (
      c.type === 'dragonfly' &&
      ![-4, 4].every(
        offset => map.ground[Math.floor(ny / TILE)]?.[Math.floor((nx + offset) / TILE)] === 'w',
      )
    ) {
      c.target = null;
      return;
    }
    c.x = nx;
    c.y = ny;
    if (c.type !== 'dragonfly') c.sprite.setDepth(ny + 2);
    c.sprite.setPosition(Math.round(c.x), Math.round(c.y));
    c.sprite.setFlipX(dx < 0);
  }

  return {
    /** 钟点、季节、天气变了（场景在 retime 里告诉它）。 */
    setTime(minute, season, weatherTags = []) {
      now = {
        minute,
        season,
        wet: weatherTags.includes('wet'),
        snow: weatherTags.includes('snow'),
      };
    },
    /** 惊起几只鸟（摇树、拨芦苇时）。x、y 是世界坐标。 */
    scare(x, y) {
      birds(x, y);
    },
    /** 碰了一下树或花：飘下几片叶子或花瓣（texture），tint 给了就染成那个颜色。 */
    shed(x, y, n = 4, texture = 'fx:leaf', tint = null) {
      for (let i = 0; i < n; i++) leaf(x + rand(-12, 12), y + rand(-10, 8), texture, tint);
    },
    update(time, dtMs) {
      if (map.indoor) return;
      const dt = dtMs / 1000;
      const outside = !now.wet && !now.snow;
      const warm = now.season === 0 || now.season === 1;
      // 该有多少只：白天晴好的春夏有蝴蝶，夏秋水边有蜻蜓，夏夜有萤火
      const want = {
        fly: day() && outside && warm ? 4 : 0,
        dragonfly: day() && outside && now.season !== 3 && tiles.water.length ? 3 : 0,
        firefly: night() && now.season === 1 ? 10 : night() && now.season === 2 ? 4 : 0,
      };
      if (count('fly') < want.fly && Math.random() < 0.02) butterfly();
      if (count('dragonfly') < want.dragonfly && Math.random() < 0.02) dragonfly();
      if (count('firefly') < want.firefly && Math.random() < 0.05) firefly();
      nextBirds -= dtMs;
      if (nextBirds < 0) {
        nextBirds = rand(14000, 28000);
        if (day() && !now.snow) birds();
      }
      nextFish -= dtMs;
      if (nextFish < 0 && tiles.water.length) {
        nextFish = rand(2600, 6000);
        if (!now.snow) fishJump();
      }
      nextLeaf -= dtMs;
      if (nextLeaf < 0) {
        nextLeaf = now.season === 2 ? rand(500, 1300) : rand(2200, 4500);
        if (now.season !== 3) leaf();
      }
      nextRipple -= dtMs;
      if (now.wet && nextRipple < 0 && tiles.water.length) {
        nextRipple = rand(60, 160);
        const spot = pick(tiles.water.filter(t => inView(t, 0)) || []);
        if (spot) ripple(spot[0] * TILE + rand(1, 15), spot[1] * TILE + rand(1, 15));
      }
      const v = view();
      for (const c of [...critters]) {
        c.t += dtMs;
        if (c.type === 'fly') {
          steer(c, 16, dt, 18);
          c.sprite.setTexture(`fx:fly.${c.color}.${Math.floor(c.t / 120) % 2}`);
          if (!want.fly && Math.random() < 0.01) remove(c);
        } else if (c.type === 'dragonfly') {
          if (c.rest > 0) c.rest -= dtMs;
          else {
            steer(c, 70, dt, 0);
            if (Math.random() < 0.01) c.rest = rand(300, 900);
          }
          c.sprite.setTexture(`fx:dragonfly.${Math.floor(c.t / 50) % 2}`);
          if (!want.dragonfly && Math.random() < 0.01) remove(c);
        } else if (c.type === 'bird') {
          c.x += c.vx * dt;
          c.y += c.vy * dt + Math.sin(c.t * 0.01) * 0.2;
          c.sprite.setPosition(Math.round(c.x), Math.round(c.y));
          c.sprite.setTexture(`fx:bird.${Math.floor(c.t / 150) % 2}`);
          if (c.x < v.x - 60 || c.x > v.right + 60 || c.y < v.y - 60) remove(c);
          continue;
        } else if (c.type === 'firefly') {
          steer(c, 6, dt, 4);
          c.sprite.setAlpha(0.35 + 0.65 * Math.abs(Math.sin(c.t * 0.0025)));
          if (!want.firefly && Math.random() < 0.02) remove(c);
        }
        // 离镜头太远的收掉，下回在近处再生
        if (c.x < v.x - 120 || c.x > v.right + 120 || c.y < v.y - 120 || c.y > v.bottom + 120)
          remove(c);
      }
    },
  };
}
