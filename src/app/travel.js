// 全村地图：打开、点一个地方看看、走过去。
export function travelActions({ shell, run, here }) {
  return {
    map() {
      shell.set({ modal: { kind: 'map' } });
    },
    mapPick({ to }) {
      shell.set({ modal: { ...shell.get().modal, pick: to } });
    },
    goTo({ to }) {
      shell.set({ modal: null });
      run('travel.to', { to, at: here() });
    },
  };
}
