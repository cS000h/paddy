// 内嵌字体：从霞鹜文楷 GB 屏幕版里只裁出游戏用到的字，存成 src/panels/fonts/wenkai.woff2。
// 手机上不一定有好看的中文字体，所以字体跟着游戏走；只裁用到的字，单文件版才不会太大。
//
// 什么时候跑：加了新的中文字以后（L1 的字体检查会报出缺哪些字）。
// 要先准备：
//   1. Python 装好 fonttools 和 brotli：pip install fonttools brotli
//   2. 原字体放在 .cache/fonts/LXGWWenKaiGBScreen.ttf，下载地址：
//      https://github.com/lxgw/LxgwWenKai-Screen/releases （LXGWWenKaiGBScreen.ttf）
// 然后：npm run font:subset（Python 不叫 python 时，用环境变量 PYTHON 指定）
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, '.cache', 'fonts', 'LXGWWenKaiGBScreen.ttf');
const out = path.join(root, 'src', 'panels', 'fonts');

/** 游戏里会显示的字：src 下的脚本和样式、index.html 里出现的全部字符，加上常用标点。 */
export function usedCharacters() {
  const walk = dir =>
    readdirSync(dir).flatMap(name => {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) return walk(full);
      return /\.(js|css|html)$/.test(name) ? [full] : [];
    });
  const chars = new Set();
  // ASCII 可见字符：数字、字母、括号这些也用这套字体，写出来的数才和汉字一个样子。
  for (let c = 0x20; c < 0x7f; c++) chars.add(String.fromCharCode(c));
  for (const ch of '，。、：；！？“”‘’（）《》「」『』…—·×−°％～') chars.add(ch);
  for (const file of [...walk(path.join(root, 'src')), path.join(root, 'index.html')])
    for (const ch of readFileSync(file, 'utf8')) if (ch.codePointAt(0) >= 0x20) chars.add(ch);
  return [...chars].sort((a, b) => a.codePointAt(0) - b.codePointAt(0)).join('');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!existsSync(source)) {
    console.error(
      `缺原字体：${source}\n下载 LXGWWenKaiGBScreen.ttf：https://github.com/lxgw/LxgwWenKai-Screen/releases`,
    );
    process.exit(1);
  }
  const text = usedCharacters();
  const list = path.join(out, 'chars.txt');
  writeFileSync(list, text + '\n');
  const python = process.env.PYTHON || 'python';
  const run = spawnSync(
    python,
    [
      '-m',
      'fontTools.subset',
      source,
      `--text-file=${list}`,
      '--flavor=woff2',
      '--no-hinting',
      '--desubroutinize',
      `--output-file=${path.join(out, 'wenkai.woff2')}`,
    ],
    { encoding: 'utf8' },
  );
  if (run.status !== 0) {
    console.error(run.stderr || run.error);
    console.error(
      '裁字体失败：确认 Python 装了 fonttools 和 brotli（pip install fonttools brotli）',
    );
    process.exit(1);
  }
  const size = statSync(path.join(out, 'wenkai.woff2')).size;
  console.log(`裁好了：${[...text].length} 个字，wenkai.woff2 ${(size / 1024).toFixed(0)} KB`);
}
