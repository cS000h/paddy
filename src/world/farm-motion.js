import { farmFrame } from '../art/index.js';
import { gridToCanvas } from './textures.js';

// 手碰到土时才交给规则结算。期间换菜种或工具，不改变已经起手的动作。
export function swing(scene, tool, hit) {
  const p = scene.player;
  const key = 'farm:' + p.look + ':' + tool + ':' + p.dir;
  for (let i = -1; i <= 4; i++) {
    if (!scene.textures.exists(key + i))
      scene.textures.addCanvas(key + i, gridToCanvas(farmFrame(p.look, tool, p.dir, i)));
  }
  p.stop();
  const sprite = scene.add
    .image(p.px, p.py, key + -1)
    .setOrigin(24 / 49, 36 / 55)
    .setDepth(p.py);
  scene.busy = true;
  p.sprite.setVisible(false);
  [60, 140, 225, 320, 390].forEach((ms, i) =>
    scene.time.delayedCall(ms, () =>
      scene.guard(() => {
        sprite.setTexture(key + i);
        if (i === 2) hit();
      }),
    ),
  );
  scene.time.delayedCall(445, () => {
    scene.busy = false;
    p.sprite.setVisible(true);
    scene.hintKey = '';
    scene.guard(() => sprite.destroy());
  });
}
