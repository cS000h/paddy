// 给当前存档版本生成一份样本存档：tests/fixtures/save-v<版本>.json。
// 什么时候用：改了世界的数据结构、把 SAVE_VERSION 加一之后，先切回旧代码运行一次本脚本
// （或者保留已有的旧样本），再为新版本运行一次。已有的样本不会被覆盖。
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createGame } from '../src/port/game.js';
import { SAVE_VERSION } from '../src/sim/index.js';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'tests', 'fixtures');
const file = path.join(dir, `save-v${SAVE_VERSION}.json`);
if (existsSync(file)) {
  console.log('已经有了，不覆盖：', file);
  process.exit(0);
}

// 玩出一个“什么都沾一点”的世界：种着菜、认识了人、欠着回礼、筐里有货、托了种子。
const game = createGame({ seed: 20261113 });
const spot = (x, y) => ({ x, y, at: { x, y: y - 1, dir: 'down' } });
const run = (type, input) => {
  const out = game.dispatch(type, input);
  if (!out.ok) throw new Error(`${type} 被拒绝：${out.reason}`);
};
for (const x of [6, 7, 8])
  for (const step of ['farm.till', 'farm.sow', 'farm.water']) run(step, spot(x, 19));
for (let day = 0; day < 3; day++) {
  run('sleep', {});
  if (day < 2) for (const x of [6, 7, 8]) run('farm.water', spot(x, 19));
}
run('farm.harvest', spot(6, 19));
run('farm.harvest', spot(7, 19));
run('talk', { to: 'shi' });
run('gift', { to: 'gui', item: 'veg.qingcai' });
run('basket.put', { item: 'veg.qingcai', n: 1 });
run('basket.order', { item: 'seed.qingcai', n: 4 });
run('clock.advance', { minutes: 90 });

mkdirSync(dir, { recursive: true });
writeFileSync(file, JSON.stringify(game.save(), null, 2) + '\n');
console.log('写好了：', file);
