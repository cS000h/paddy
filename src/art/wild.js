// 采集点有各自的轮廓，和背包里的物品图标相呼应。
import { Grid } from './pixel.js';
import { P, SHADOW } from './palette.js';
import { plants } from './items-plants.js';
import { pantry } from './items-pantry.js';
import { things } from './items-things.js';
const patch = make => () => {
  const g = new Grid(28, 24);
  g.ellipse(14, 21, 12, 2, SHADOW).ellipse(13, 19, 11, 3, P.g2);
  g.blit(make(), 3, 3).blit(make(), 12, 7);
  return { grid: g, ax: 14, ay: 24 };
};
export const wildProps = {
  forage: patch(plants.herb),
  shootPatch: patch(plants.shoot),
  mushroomPatch: patch(plants.mushroom),
  teaBush: patch(plants.tea),
  nutPatch: patch(plants.chestnut),
  woodpile: patch(things.log),
  pickleJar: patch(pantry.pickle),
  fishing: () => {
    const g = new Grid(28, 36);
    g.ellipse(13, 33, 10, 2, SHADOW)
      .line(5, 32, 15, 3, P.b3)
      .line(15, 3, 25, 25, P.paper2)
      .rect(23, 24, 3, 5, P.c1)
      .rect(23, 23, 3, 2, P.paper0);
    return { grid: g, ax: 14, ay: 36 };
  },
  workbench: () => {
    const g = new Grid(28, 28);
    g.ellipse(14, 25, 13, 2, SHADOW)
      .rect(4, 14, 3, 11, P.t3)
      .rect(22, 14, 3, 11, P.t3)
      .rect(1, 10, 26, 6, P.t1)
      .hline(1, 26, 10, P.t0)
      .line(6, 5, 18, 12, P.b1)
      .line(9, 4, 22, 10, P.b3)
      .rect(3, 7, 5, 3, P.r2);
    return { grid: g, ax: 14, ay: 28 };
  },
  coop: () => {
    const g = new Grid(32, 32);
    g.ellipse(16, 29, 15, 2, SHADOW)
      .rect(4, 12, 24, 17, P.t2)
      .rect(8, 16, 16, 11, P.t4)
      .ellipse(16, 26, 10, 3, P.h1)
      .rect(3, 10, 26, 4, P.h2)
      .rect(6, 7, 20, 4, P.h1)
      .rect(10, 4, 12, 4, P.h0)
      .ellipse(17, 23, 4, 2, P.paper0);
    return { grid: g, ax: 16, ay: 32 };
  },
};
