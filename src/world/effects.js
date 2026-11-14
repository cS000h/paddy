// 画面上的反馈和气氛：土块、水滴、收菜时的一跳、飘落的花瓣、炊烟、水面的闪光。
// 都是“看得见、不影响规则”的东西；规则里发生了什么事（事实），这里就给什么反馈。
import { TILE } from './logic.js';

export function createEffects(scene, map) {
  const burst = (texture, config) =>
    scene.add.particles(0, 0, texture, { emitting: false, ...config }).setDepth(9000);

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
  const leaves = burst('fx:leaf', {
    speed: { min: 20, max: 60 },
    angle: { min: 220, max: 320 },
    gravityY: 200,
    lifespan: 420,
  });

  const centre = (x, y) => [x * TILE + 8, y * TILE + 9];

  // 桃树下慢慢飘落的花瓣
  for (const [kind, x, y] of map.objects) {
    if (kind !== 'tree.peach') continue;
    scene.add
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
  }

  // 水面上一闪一闪的光
  const glints = [];
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(Math.random() * map.width);
    const y = Math.floor(Math.random() * map.height);
    if (map.ground[y][x] !== 'w') continue;
    const glint = scene.add
      .image(x * TILE + 3 + Math.random() * 9, y * TILE + 3 + Math.random() * 10, 'fx:glint')
      .setDepth(-900)
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
  const smoke = scene.add
    .particles(gui[1] * TILE + 40, (gui[2] + 1) * TILE - 88, 'fx:smoke', {
      speedY: { min: -14, max: -8 },
      speedX: { min: 2, max: 7 },
      scale: { start: 0.5, end: 1.5 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 3200,
      frequency: 420,
    })
    .setDepth(9000);
  smoke.stop();

  return {
    tilled(x, y) {
      const [px, py] = centre(x, y);
      dirt.explode(7, px, py);
      clod.explode(4, px, py);
    },
    sown(x, y) {
      const [px, py] = centre(x, y);
      seeds.explode(5, px, py - 6);
    },
    watered(x, y) {
      const [px, py] = centre(x, y);
      drops.explode(9, px, py - 10);
      scene.time.delayedCall(180, () => splash.explode(6, px, py));
    },
    harvested(x, y) {
      const [px, py] = centre(x, y);
      leaves.explode(6, px, py - 2);
      const veg = scene.add.image(px, py - 4, 'crop:3').setDepth(9100);
      scene.tweens.add({
        targets: veg,
        y: py - 26,
        alpha: { from: 1, to: 0 },
        duration: 520,
        ease: 'Cubic.easeOut',
        onComplete: () => veg.destroy(),
      });
    },
    refilled(px, py) {
      splash.explode(8, px, py - 4);
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
      if (on && !smoke.emitting) smoke.start();
      else if (!on && smoke.emitting) smoke.stop();
    },
  };
}
