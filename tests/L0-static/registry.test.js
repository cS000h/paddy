// L0 登记检查：TESTING.md 的测试清单和实际的测试文件必须一一对应。
// 加了测试没登记、登记了却没有文件、层级或标签写错，都会在这里报错。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readRegistry } from '../../tools/test.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const LEVELS = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'];
const SCOPES = ['repo', 'kernel', 'content', 'sim', 'port', 'art', 'world', 'panels', 'app'];
const TAGS = [
  'fast',
  'slow',
  'static',
  'unit',
  'rules',
  'contract',
  'save',
  'replay',
  'golden',
  'browser',
];

function testFiles(dir = path.join(root, 'tests')) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...testFiles(full));
    else if (name.endsWith('.test.js'))
      out.push(path.relative(root, full).split(path.sep).join('/'));
  }
  return out.sort();
}

const rows = readRegistry();

test('每个测试文件都登记在 TESTING.md 里，登记的文件都存在', () => {
  assert.deepEqual(rows.map(r => r.file).sort(), testFiles());
});

test('编号不重复，层级、范围、标签都用规定的写法，文件放在对应层级的文件夹里', () => {
  assert.equal(new Set(rows.map(r => r.id)).size, rows.length, '编号重复');
  for (const r of rows) {
    assert.ok(LEVELS.includes(r.level), `${r.id} 的层级 ${r.level} 不认识`);
    assert.ok(r.id.startsWith(r.level + '-'), `${r.id} 的编号应以 ${r.level}- 开头`);
    assert.ok(
      r.file.startsWith(`tests/${r.level}-`),
      `${r.id} 的文件应放在 tests/${r.level}-…/ 里`,
    );
    assert.ok(SCOPES.includes(r.scope), `${r.id} 的范围 ${r.scope} 不认识`);
    assert.ok(
      r.tags.length > 0 && r.tags.every(t => TAGS.includes(t)),
      `${r.id} 的标签 ${r.tags} 里有不认识的`,
    );
    assert.ok(
      r.tags.includes('fast') !== r.tags.includes('slow'),
      `${r.id} 必须标 fast 或 slow 之一`,
    );
    assert.ok(r.what.length >= 6, `${r.id} 要写清楚验证什么`);
  }
});
