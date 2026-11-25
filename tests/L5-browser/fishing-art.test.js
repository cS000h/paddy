import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { root, launch, serve, shot } from './browser.js';

// 两段玩法还没接规则时，直接检查美术帧；这两张是素材样张，不会伪造一局渔获。
test('三处水面的动作帧、物品图标与矮屏尺寸', async t => {
  const browser = await launch();
  if (!browser) return t.skip('本机没有可用的 Chrome');
  const server = await serve(root);
  try {
    await mkdir(path.join(root, '.cache'), { recursive: true });
    for (const [screen, width, height] of [
      ['desktop', 1280, 720],
      ['phone', 844, 390],
    ]) {
      const page = await browser.newPage({ viewport: { width, height } });
      await page.goto(`http://127.0.0.1:${server.address().port}/src/art/pixel.js`);
      await page.setContent(`<meta charset="utf-8"><style>
        *{box-sizing:border-box}body{margin:0;background:#ece4d0;color:#34423f;
        height:100vh;display:grid;place-content:center;font-family:serif}
        main{display:grid;grid-template-columns:repeat(2,auto);gap:12px}
        figure{width:498px;margin:0;background:#f6f1e3;padding:8px;border:1px solid #a3885e}
        .tight figure{width:378px}figcaption{font-size:16px;margin-bottom:5px}section{display:flex;justify-content:space-around;
        align-items:center;height:80%}i{text-align:center;font-style:normal}
        i canvas{width:36px;image-rendering:pixelated;display:block;margin:auto}
        </style><main></main>`);
      await page.addStyleTag({ url: '/src/panels/fishing.css' });
      const result = await page.evaluate(async tight => {
        document.body.className = tight ? 'tight' : '';
        const { paintFishing, fishingCue } = await import('/src/panels/fishing.js');
        const { fishItems } = await import('/src/art/fish-items.js');
        const { P } = await import('/src/art/palette.js');
        const main = document.querySelector('main');
        const figure = title => {
          const f = document.createElement('figure');
          const c = document.createElement('figcaption');
          c.textContent = title;
          f.append(c);
          main.append(f);
          return f;
        };
        const image = (spot, state) => {
          const c = document.createElement('canvas');
          c.className = 'fishing-water';
          paintFishing(c, spot, state);
          return c;
        };
        for (const [spot, label, state] of [
          ['yard', '院边小溪 · 看漂', { action: 'wait' }],
          [
            'creek',
            '溪边竹径 · 遛鱼',
            { action: 'fight', progress: 0.45, tension: 89, running: true, size: 'big' },
          ],
          ['river', '河湾渡口 · 出水', { action: 'landed', progress: 0.55, item: 'fish.carp' }],
        ])
          figure(label).append(image(spot, state));
        const items = document.createElement('section');
        figure('鱼与钓饵').append(items);
        const palette = new Set([0, ...Object.values(P)]);
        const icons = Object.values(fishItems).map((draw, i) => {
          const grid = draw().outline(P.ink1);
          if (grid.w !== 16 || grid.h !== 16 || !grid.data.every(c => palette.has(c)))
            throw Error('图标越界');
          const c = document.createElement('canvas');
          c.width = c.height = 16;
          c.getContext('2d').putImageData(new ImageData(grid.bytes(), 16, 16), 0, 0);
          const tag = document.createElement('i');
          tag.append(c, ['鲫鱼', '白条', '鲤鱼', '草鱼', '昂刺鱼', '鳜鱼', '蚯蚓'][i]);
          items.append(tag);
          return c.toDataURL();
        });
        const cues = [];
        const platform = { audio: { play: id => cues.push(id) }, haptic: () => cues.push('震动') };
        for (const cue of ['nod', 'bite', 'reel', 'snap', 'splash']) fishingCue(platform, cue);
        const moving = ['nod', 'bite', 'drag', 'hook', 'snap', 'slack', 'landed'].every(
          action =>
            image('yard', { action, progress: 0 }).toDataURL() !==
            image('yard', { action, progress: 0.55 }).toDataURL(),
        );
        const rect = main.querySelector('canvas').getBoundingClientRect();
        return { size: [rect.width, rect.height], icons: new Set(icons).size, moving, cues };
      }, screen === 'phone');
      assert.ok(result.size[0] >= (screen === 'phone' ? 360 : 480) && result.size[1] >= 110);
      assert.equal(result.icons, 7);
      assert.ok(result.moving);
      assert.deepEqual(result.cues, ['nod', 'bite', '震动', 'reel', 'snap', 'splash']);
      await shot(page, `a05-art-${screen}.png`);
      await page.evaluate(async () => {
        const { paintFishing } = await import('/src/panels/fishing.js');
        const f = document.querySelector('figure');
        f.querySelector('figcaption').textContent = '院边小溪 · 咬钩沉漂';
        paintFishing(f.querySelector('canvas'), 'yard', { action: 'bite', progress: 0.24 });
      });
      await shot(page, `a05-bite-${screen}.png`);
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
});
