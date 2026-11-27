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
