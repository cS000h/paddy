import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorage } from '../../src/platform/storage.js';
const memory = () => {
  const map = new Map();
  return {
    getItem: k => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
    removeItem: k => map.delete(k),
  };
};
test('坏 JSON 不会被当成空档，无法写入明确返回失败', () => {
  const backend = memory();
  backend.setItem('dao.save.v1', '{坏了');
  const store = createStorage(() => backend);
  assert.throws(() => store.load(), /停止自动覆盖/);
  assert.equal(store.raw(), '{坏了');
  for (const text of ['null', '0', 'false', '[]']) {
    backend.setItem('dao.save.v1', text);
    assert.throws(() => store.load(), /停止自动覆盖/);
    assert.equal(store.raw(), text);
  }
  const denied = createStorage(() => {
    throw new Error('denied');
  });
  assert.equal(denied.load(), null);
  assert.match(denied.status(), /没有开放/);
  assert.equal(denied.save({}), false);
  assert.match(denied.status(), /没有写入成功/);
});
test('清早的备份留两份，新的在前；备份写不进去不影响主存档', () => {
  const backend = memory();
  const store = createStorage(() => backend);
  assert.deepEqual(store.dawns(), []);
  for (const day of [2, 3, 4]) assert.equal(store.saveDawn({ day }), true);
  assert.deepEqual(
    store.dawns().map(t => JSON.parse(t).day),
    [4, 3],
  );
  store.saveDawn({ day: 4 }); // 同一份不重复挪
  assert.deepEqual(
    store.dawns().map(t => JSON.parse(t).day),
    [4, 3],
  );
  const set = backend.setItem;
  backend.setItem = (k, v) => {
    if (k.includes('dawn')) throw new Error('full');
    set(k, v);
  };
  assert.equal(store.saveDawn({ day: 5 }), false);
  assert.equal(store.save({ day: 5 }), true);
  assert.deepEqual(store.load(), { day: 5 });
});

test('导入保留替换前原档，备份写不进去就不替换原档', () => {
  const backend = memory();
  const store = createStorage(() => backend);
  store.save({ day: 4 });
  store.save({ day: 8 }, true);
  assert.deepEqual(JSON.parse(store.raw(true)), { day: 4 });
  assert.deepEqual(store.load(), { day: 8 });
  const set = backend.setItem;
  backend.setItem = (k, v) => {
    if (k.endsWith('before-restore')) throw new Error('full');
    set(k, v);
  };
  assert.equal(store.save({ day: 9 }, true), false);
  assert.deepEqual(store.load(), { day: 8 });
});
