// 测试运行器：TESTING.md 里的那张表就是测试清单，这里按表执行。
//   node tools/test.mjs                 跑表里的全部测试
//   node tools/test.mjs --tag fast      只跑带 fast 标签的
//   node tools/test.mjs --level L2,L3   只跑某几层
//   node tools/test.mjs --scope sim     只跑某个范围
//   node tools/test.mjs --list          只列出会跑哪些
// 不在表里的测试文件不会被执行，而 L0 的登记检查会因此报错——所以加测试必须先登记。
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 读 TESTING.md 里“测试清单”那张表。返回 [{id, level, scope, tags, file, what}]。 */
export function readRegistry(file = path.join(root, 'TESTING.md')) {
  const rows = [];
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const cells = line.split('|').map(c => c.trim());
    if (cells.length < 8 || !/^L\d-\d{2}$/.test(cells[1])) continue;
    rows.push({
      id: cells[1],
      level: cells[2],
      scope: cells[3],
      tags: cells[4].split(/[\s,]+/).filter(Boolean),
      file: cells[5].replace(/`/g, ''),
      what: cells[6],
    });
  }
  return rows;
}

function main(argv) {
  const option = name => {
    const i = argv.indexOf('--' + name);
    return i >= 0 ? (argv[i + 1] || '').split(',').filter(Boolean) : null;
  };
  const levels = option('level');
  const tags = option('tag');
  const scopes = option('scope');
  const selected = readRegistry().filter(
    r =>
      (!levels || levels.includes(r.level)) &&
      (!tags || tags.some(t => r.tags.includes(t))) &&
      (!scopes || scopes.includes(r.scope)),
  );
  if (argv.includes('--list')) {
    for (const r of selected)
      console.log(
        `${r.id}  ${r.level}  ${r.scope.padEnd(8)} ${r.tags.join(',').padEnd(22)} ${r.file}`,
      );
    console.log(`共 ${selected.length} 个测试文件`);
    return 0;
  }
  const missing = selected.filter(r => !existsSync(path.join(root, r.file)));
  if (missing.length) {
    console.error(
      'TESTING.md 里登记了、但文件不存在：\n' + missing.map(r => `  ${r.id} ${r.file}`).join('\n'),
    );
    return 1;
  }
  if (!selected.length) {
    console.error('没有符合条件的测试');
    return 1;
  }
  const files = selected.map(r => r.file);
  const run = spawnSync(process.execPath, ['--test', ...files], { cwd: root, stdio: 'inherit' });
  return run.status ?? 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  process.exit(main(process.argv.slice(2)));
