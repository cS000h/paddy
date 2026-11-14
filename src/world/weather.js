// 天气只改变表现，不参与规则随机数；粒子位置由时间和序号决定。
import { P } from '../art/palette.js';
const rgb = c => ((c & 255) << 16) | (c & 65280) | ((c >>> 16) & 255);
export function weatherEffects(scene) {
  const g = scene.add.graphics().setDepth(9500).setScrollFactor(0);
  return {
    update(time, code) {
      g.clear();
      const z = scene.cameras.main.zoom,
        w = scene.scale.width / z,
        h = scene.scale.height / z;
      if (code === 'fog') {
        g.fillStyle(rgb(P.l0), 0.14);
        for (let i = 0; i < 5; i++)
          g.fillEllipse(((time / 140 + i * 73) % (w + 100)) - 50, 25 + i * 29, 140, 35);
      } else if (['snow', 'drizzle', 'rain', 'storm'].includes(code)) {
        const snow = code === 'snow',
          n = code === 'drizzle' ? 35 : 75;
        g.fillStyle(rgb(snow ? P.l0 : P.w2), snow ? 0.85 : 0.5);
        for (let i = 0; i < n; i++) {
          const x = (i * 47 + time / (snow ? 170 : 75)) % (w + 12);
          const y = (i * 29 + time / (snow ? 65 : 12)) % (h + 12);
          g.fillRect(Math.floor(x), Math.floor(y), snow ? 2 : 1, snow ? 2 : 5);
        }
      }
    },
  };
}
