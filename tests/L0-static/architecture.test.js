// L0 分层检查：谁可以引用谁。规则写在 AGENTS.md 的“分层”一节，这里是它的自动执行。
//   kernel  ← 什么都不依赖
//   content ← 什么都不依赖（纯数据）
//   sim     ← kernel, content
//   port    ← sim, content
//   art     ← 什么都不依赖（纯像素运算）
//   platform← 什么都不依赖（运行环境的差异：存储、生命周期、设备）
//   world   ← port, content, art, platform, phaser
//   panels  ← port, content, art, platform
//   app     ← port, content, art, platform, world, panels
// 另外：规则一侧（kernel/sim/port/content/art）不许碰浏览器、时钟和无种子的随机数。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = path.join(root, 'src');

const MAY_IMPORT = {
  kernel: [],
  content: [],
  sim: ['kernel', 'content'],
  port: ['sim', 'content'],
  art: [],
  platform: [],
  world: ['port', 'content', 'art', 'platform'],
  panels: ['port', 'content', 'art', 'platform'],
  app: ['port', 'content', 'art', 'platform', 'world', 'panels'],
};
const PACKAGES = { world: ['phaser'] };
const PURE = ['kernel', 'content', 'sim', 'port', 'art'];
const FORBIDDEN_IN_PURE = [
  /\bdocument\./,
  /\bwindow\./,
  /\blocalStorage\b/,
  /\bMath\.random\(/,
  /\bDate\.now\(/,
  /\bsetTimeout\(/,
  /\brequestAnimationFrame\(/,
];
const MAX_LINES = 400;

function files(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...files(full));
    else if (name.endsWith('.js')) out.push(full);
  }
  return out;
}
const layerOf = file => path.relative(src, file).split(path.sep)[0];
const rel = file => path.relative(root, file).split(path.sep).join('/');
const all = files(src);

test('src 下只有规定的这几层', () => {
  for (const layer of new Set(all.map(layerOf)))
    assert.ok(layer in MAY_IMPORT, `src/${layer} 不是规定的层`);
});

test('每一层只引用它被允许引用的层', () => {
  const problems = [];
  for (const file of all) {
    const layer = layerOf(file);
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(
      /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|import\s*['"]([^'"]+)['"]/g,
    )) {
      const target = m[1] || m[2] || m[3];
      if (!target.startsWith('.')) {
        if (!(PACKAGES[layer] || []).includes(target.split('/')[0]))
          problems.push(`${rel(file)} 引用了外部包 ${target}`);
        continue;
      }
      const resolved = path.resolve(path.dirname(file), target);
      if (!resolved.startsWith(src)) problems.push(`${rel(file)} 引用了 src 之外的 ${target}`);
      else if (layerOf(resolved) !== layer && !MAY_IMPORT[layer].includes(layerOf(resolved)))
        problems.push(`${rel(file)}（${layer}）不能引用 ${layerOf(resolved)}：${target}`);
    }
  }
  assert.deepEqual(problems, []);
});

test('规则一侧不碰浏览器、时钟和无种子的随机数', () => {
  const problems = [];
  for (const file of all.filter(f => PURE.includes(layerOf(f)))) {
    const code = readFileSync(file, 'utf8')
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    for (const pattern of FORBIDDEN_IN_PURE)
      if (pattern.test(code)) problems.push(`${rel(file)} 用了 ${pattern.source}`);
  }
  assert.deepEqual(problems, []);
});

test(`单个源文件不超过 ${MAX_LINES} 行`, () => {
  const long = all
    .map(f => [rel(f), readFileSync(f, 'utf8').split('\n').length])
    .filter(([, n]) => n > MAX_LINES);
  assert.deepEqual(long, []);
});
