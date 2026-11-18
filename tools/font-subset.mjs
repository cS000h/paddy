// 内嵌字体：从思源宋体（Noto Serif SC）里只裁出游戏用到的字，存成 src/panels/fonts/ 下的 FONT_FILE。
// 稻间 0.12 的正文就是这套宋体；手机上不一定装着，所以字体跟着游戏走。只裁用到的字，单文件版才不会太大。
// 原字体是可变字重的，只留 400–700 这一段：正文 400，标题 600，印上的字 700，一个文件全有。
//
// 什么时候跑：加了新的中文字以后（L1 的字体检查会报出缺哪些字）。
// 要先准备：
//   1. Python 装好 fonttools 和 brotli：pip install fonttools brotli
//   2. 原字体 NotoSerifSC-VF.ttf 放在 .cache/fonts/（Windows 装了思源宋体时直接从 C:\Windows\Fonts 取）。
//      下载：https://github.com/notofonts/noto-cjk/tree/main/Serif/Variable/TTF/Subset
// 然后：npm run font:subset（Python 不叫 python 时，用环境变量 PYTHON 指定）
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const FONT_FILE = 'noto-serif-sc.woff2';

const root = fileURLToPath(new URL('../', import.meta.url));
const cache = path.join(root, '.cache', 'fonts');
const SOURCES = [
  path.join(cache, 'NotoSerifSC-VF.ttf'),
  path.join(process.env.WINDIR || 'C:\\Windows', 'Fonts', 'NotoSerifSC-VF.ttf'),
];
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

function python(args) {
  const run = spawnSync(process.env.PYTHON || 'python', args, { encoding: 'utf8' });
  if (run.status === 0) return;
  console.error(run.stderr || run.error);
  console.error('裁字体失败：确认 Python 装了 fonttools 和 brotli（pip install fonttools brotli）');
  process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const source = SOURCES.find(existsSync);
  if (!source) {
    console.error(
      `缺原字体 NotoSerifSC-VF.ttf，放到 ${cache}\n下载：https://github.com/notofonts/noto-cjk`,
    );
    process.exit(1);
  }
  // 先把字重收窄到 400–700（存一份在 .cache，下回直接用），再裁字
  mkdirSync(cache, { recursive: true });
  const narrowed = path.join(cache, 'NotoSerifSC-400-700.ttf');
  if (!existsSync(narrowed) || statSync(narrowed).mtimeMs < statSync(source).mtimeMs)
    python(['-m', 'fontTools.varLib.instancer', source, 'wght=400:700', '-o', narrowed]);
  const text = usedCharacters();
  const list = path.join(out, 'chars.txt');
  writeFileSync(list, text + '\n');
  python([
    '-m',
    'fontTools.subset',
    narrowed,
    `--text-file=${list}`,
    '--flavor=woff2',
    '--no-hinting',
    '--desubroutinize',
    '--layout-features=*',
    `--output-file=${path.join(out, FONT_FILE)}`,
  ]);
  const size = statSync(path.join(out, FONT_FILE)).size;
  console.log(`裁好了：${[...text].length} 个字，${FONT_FILE} ${(size / 1024).toFixed(0)} KB`);
}
