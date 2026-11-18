// L1 内嵌字体：游戏里会显示的每个字都在裁好的字体里，不然那个字会换成手机自带的字体，一句话里两种字。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { usedCharacters, FONT_FILE } from '../../tools/font-subset.mjs';

const fonts = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/panels/fonts');

test('界面字体：用到的字都裁进了字体，字体和许可证都在', () => {
  const covered = new Set(readFileSync(path.join(fonts, 'chars.txt'), 'utf8'));
  const missing = [...usedCharacters()].filter(ch => !covered.has(ch));
  assert.deepEqual(
    missing,
    [],
    `这些字还没裁进字体，运行 npm run font:subset：${missing.join('')}`,
  );
  const size = statSync(path.join(fonts, FONT_FILE)).size;
  assert.ok(size > 50_000 && size < 1_200_000, `字体大小不对劲：${size}`);
  assert.match(readFileSync(path.join(fonts, 'OFL.txt'), 'utf8'), /SIL Open Font License/);
});
