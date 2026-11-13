// L0 工具检查：格式和类型。它们要启动外部工具，比较慢，所以标 slow，`npm run test:all` 才跑。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const run = (...args) => spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });

test('全部文件符合 Prettier 的格式（不合就运行 npm run format）', () => {
  const out = run('node_modules/prettier/bin/prettier.cjs', '--check', '.');
  assert.equal(out.status, 0, out.stdout + out.stderr);
});

test('规则一侧通过类型检查（kernel、sim、port、content）', () => {
  const out = run('node_modules/typescript/bin/tsc', '-p', 'tsconfig.json', '--noEmit');
  assert.equal(out.status, 0, out.stdout + out.stderr);
});
