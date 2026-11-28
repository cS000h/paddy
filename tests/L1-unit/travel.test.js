import test from 'node:test';
import assert from 'node:assert/strict';
import { createShellState } from '../../src/shell/state.js';
import { travelActions } from '../../src/app/travel.js';

function pick(...places) {
  const shell = createShellState();
  const calls = [];
  const actions = travelActions({
    shell,
    game: { ask: () => ({ map: 'yard' }) },
    run: (...args) => calls.push(args),
    here: () => undefined,
  });
  actions.map();
  for (const to of places) actions.mapPick({ to });
  return { modal: shell.get().modal, calls };
}

test('点茶摊一次只选中', () => {
  assert.deepEqual(pick('tea'), { modal: { kind: 'map', pick: 'tea' }, calls: [] });
});
test('再点茶摊就关图出发', () => {
  assert.deepEqual(pick('tea', 'tea'), {
    modal: null,
    calls: [['travel.to', { to: 'tea', at: undefined }]],
  });
});
test('再点所在的院子就保持选中', () => {
  assert.deepEqual(pick('yard', 'yard'), { modal: { kind: 'map', pick: 'yard' }, calls: [] });
});
test('点另一处只换选中', () => {
  assert.deepEqual(pick('tea', 'market'), { modal: { kind: 'map', pick: 'market' }, calls: [] });
});

test('路口一截路都算出口：路牌两边各一格、往里一格；门只认门口那格', async () => {
  const { exitAt } = await import('../../src/world/travel.js');
  const { MAPS } = await import('../../src/content/maps/index.js');
  const to = (map, x, y) => exitAt(MAPS[map], { x, y })?.door.to ?? null;
  // 村口集场西边的路牌在 (1, 14)，往西出去
  assert.deepEqual(
    [to('market', 1, 14), to('market', 1, 13), to('market', 1, 15), to('market', 2, 14)],
    ['yard', 'yard', 'yard', 'yard'],
  );
  assert.equal(to('market', 3, 14), null, '离路口两格就不算');
  assert.equal(to('market', 1, 12), null);
  // 小屋的门：旁边一格不算
  assert.equal(to('cottage', 8, 12), 'yard');
  assert.equal(to('cottage', 7, 12), null);
});
