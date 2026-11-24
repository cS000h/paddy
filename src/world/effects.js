import { DEPTH } from './depth.js';
// 画面上的反馈和气氛：土块、水滴、收菜时的一跳、飘落的花瓣、炊烟、水面的闪光。
// 都是“看得见、不影响规则”的东西；规则里发生了什么事（事实），这里就给什么反馈。
import { actAt } from '../content/maps/index.js';
import { TILE } from './logic.js';

export function createEffects(scene, map) {
  // 同时在两块地上扬土，各自属于自己的接地点，后一次不能把前一次的粒子提到前景。
  const burst =
    (texture, config) =>
    (count, px, py, foot = py) => {
      const emitter = scene.add
        .particles(px, py, texture, { emitting: false, ...config })
        .setDepth(foot + 0.25);
      emitter.once('complete', () => emitter.destroy());
      emitter.explode(count);
    };

  const dirt = burst('fx:dirt', {
    speed: { min: 25, max: 70 },
    angle: { min: 200, max: 340 },
    gravityY: 260,
    lifespan: 380,
  });
  const clod = burst('fx:clod', {
    speed: { min: 20, max: 55 },
    angle: { min: 210, max: 330 },
    gravityY: 240,
    lifespan: 320,
  });
  const drops = burst('fx:drop', {
    speedY: { min: 30, max: 70 },
    speedX: { min: -14, max: 14 },
    gravityY: 120,
    lifespan: 300,
  });
  const splash = burst('fx:splash', {
    speed: { min: 8, max: 26 },
    angle: { min: 180, max: 360 },
    lifespan: 260,
    alpha: { start: 1, end: 0 },
  });
  const seeds = burst('fx:seed', {
    speedY: { min: 20, max: 50 },
    speedX: { min: -18, max: 18 },
    gravityY: 200,
    lifespan: 260,
  });
  const chips = burst('fx:chip', {
    speed: { min: 30, max: 80 },
    angle: { min: 200, max: 340 },
    gravityY: 280,
    lifespan: 420,
  });
  const leaves = burst('fx:leaf', {
    speed: { min: 20, max: 60 },
    angle: { min: 220, max: 320 },
    gravityY: 200,
    lifespan: 420,
  });
  // 收到极品时四下迸开的金星，和一圈一闪就散的金环
  const sparkle = burst('fx:coin', {
    speed: { min: 50, max: 95 },
    angle: { min: 0, max: 360 },
    gravityY: 70,
    lifespan: { min: 420, max: 640 },
    alpha: { start: 1, end: 0 },
    scale: { start: 1.4, end: 0.3 },
  });
  const ring = (px, py, depth) => {
    const r = scene.add.circle(px, py, 6).setStrokeStyle(1.5, 0xeacb6e).setDepth(depth);
    scene.tweens.add({
      targets: r,
      scale: 3.4,
      alpha: { from: 1, to: 0 },
      duration: 460,
      ease: 'Cubic.easeOut',
      onComplete: () => r.destroy(),
    });
  };

  const centre = (x, y) => [x * TILE + 8, y * TILE + 9];

  const petals = [];
  // 桃树下慢慢飘落的花瓣
  for (const [kind, x, y] of map.objects) {
    if (kind !== 'tree.peach') continue;
    const emitter = scene.add
      .particles(x * TILE + 8, y * TILE - 26, 'fx:petal', {
        x: { min: -14, max: 14 },
        y: { min: -8, max: 8 },
        speedX: { min: 4, max: 12 },
        speedY: { min: 6, max: 14 },
        lifespan: 3600,
        frequency: 900,
        alpha: { start: 1, end: 0 },
      })
      .setDepth((y + 1) * TILE + 1);
    petals.push(emitter);
  }

  // 水面上一闪一闪的光
  const glints = [];
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(Math.random() * map.width);
    const y = Math.floor(Math.random() * map.height);
    if (map.ground[y][x] !== 'w') continue;
    const glint = scene.add
      .image(x * TILE + 3 + Math.random() * 9, y * TILE + 3 + Math.random() * 10, 'fx:glint')
      .setDepth(DEPTH.reflection)
      .setAlpha(0);
    scene.tweens.add({
      targets: glint,
      alpha: 0.9,
      x: glint.x + 3,
      duration: 900 + Math.random() * 900,
      delay: Math.random() * 2400,
      yoyo: true,
      repeat: -1,
      repeatDelay: 600 + Math.random() * 2000,
    });
    glints.push(glint);
  }

  // 桂嫂家的炊烟：做饭的钟点才冒
  const gui = map.objects.find(([kind]) => kind === 'house.gui');
  const smoke = gui
    ? scene.add
        .particles(gui[1] * TILE + 40, (gui[2] + 1) * TILE - 88, 'fx:smoke', {
          speedY: { min: -14, max: -8 },
          speedX: { min: 2, max: 7 },
          scale: { start: 0.5, end: 1.5 },
          alpha: { start: 0.8, end: 0 },
          lifespan: 3200,
          frequency: 420,
        })
        .setDepth((gui[2] + 1) * TILE + 1)
    : null;
  smoke?.stop();

  return {
    setSky(season, minute, tags) {
      const clear = !tags.includes('snow') && !tags.includes('wet');
      for (const emitter of petals) emitter.emitting = season === 0 && clear;
      for (const glint of glints) glint.setVisible(clear && minute >= 360 && minute < 1080);
    },
    tilled(x, y) {
      const [px, py] = centre(x, y);
      dirt(7, px, py);
      clod(4, px, py);
    },
    sown(x, y) {
      const [px, py] = centre(x, y);
      seeds(5, px, py - 6, py);
    },
    watered(x, y) {
      const [px, py] = centre(x, y);
      drops(9, px, py - 10, py);
      scene.time.delayedCall(180, () => splash(6, px, py));
    },
    harvested(x, y, crop, fine = false) {
      const [px, py] = centre(x, y);
      leaves(6, px, py - 2, py);
      const veg = scene.add.image(px, py - 4, 'crop:' + crop + ':3').setDepth(py + 1);
      if (!fine) {
        scene.tweens.add({
          targets: veg,
          y: py - 26,
          alpha: { from: 1, to: 0 },
          duration: 520,
          ease: 'Cubic.easeOut',
          onComplete: () => veg.destroy(),
        });
        return;
      }
      // 极品：蹦得更高，放大一下，在半空停一停，四下冒金星，再淡掉
      veg.setDepth(py + 2);
      scene.tweens.chain({
        targets: veg,
        tweens: [
          { y: py - 34, scale: 1.35, duration: 300, ease: 'Back.easeOut' },
          { scale: 1.2, duration: 160, ease: 'Sine.easeInOut' },
          { y: py - 44, alpha: 0, duration: 380, delay: 360, ease: 'Cubic.easeIn' },
        ],
        onComplete: () => veg.destroy(),
      });
      scene.time.delayedCall(240, () => {
        ring(px, py - 34, py + 3);
        sparkle(12, px, py - 34, py + 3);
      });
      scene.time.delayedCall(560, () => sparkle(6, px, py - 36, py + 3));
    },
    /** 拍了拍草垛、稻草人、芦苇：扑起一阵草屑。 */
    straw(px, py) {
      seeds(9, px, py);
    },
    /** 劈柴、敲钉子：那一格上木屑飞起来。 */
    chips(x, y) {
      const [px, py] = centre(x, y);
      chips(8, px, py - 4, py);
    },
    /** 舀水、下竿：那一格溅起水花。 */
    splashAt(x, y) {
      const [px, py] = centre(x, y);
      const source = actAt(map, x, y)?.kind;
      const rise = source === 'well' ? 12 : source === 'vat' ? 10 : 0;
      splash(8, px, py - rise, py);
    },
    /** 一格新长出来的东西轻轻弹一下。 */
    pop(target) {
      scene.tweens.add({
        targets: target,
        scaleY: { from: 0.6, to: 1 },
        duration: 260,
        ease: 'Back.easeOut',
      });
    },
    /** 做饭的钟点让烟囱冒烟。 */
    setCooking(on) {
      if (!smoke) return;
      if (on && !smoke.emitting) smoke.start();
      else if (!on && smoke.emitting) smoke.stop();
    },
  };
}
