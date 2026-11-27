// 全村地图：选中的地方再点一次，就走过去。
import { routeTo } from '../content/maps/index.js';

export function travelActions({ shell, run, here, game }) {
  const goTo = ({ to }) => {
    shell.set({ modal: null });
    run('travel.to', { to, at: here() });
  };
  return {
    map() {
      shell.set({ modal: { kind: 'map' } });
    },
    mapPick({ to }) {
      const modal = shell.get().modal;
      const from = game.ask('hero').map;
      if (modal?.pick === to && to !== from && routeTo(from, to)) return goTo({ to });
      shell.set({ modal: { ...modal, pick: to } });
    },
    goTo,
  };
}
