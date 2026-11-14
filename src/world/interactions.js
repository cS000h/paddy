// 地点交互集中在这里；这里只开面板，规则仍由端口决定。
import { dirTo } from './logic.js';
export const ACT_HINT = {
  'door.hero': '回屋歇息',
  outing: '找些东西',
  housework: '看看能做什么',
  'door.gui': '敲敲门',
  water: '喝水、打水',
  store: '收拾橱柜',
  basket: '看看收菜筐',
  sign: '看路牌',
  kitchen: '生火做饭',
};
export function touchThing(scene, thing) {
  const { shell, platform } = scene.deps;
  scene.player.face(dirTo(scene.player.tile, thing));
  platform.audio.play('talk');
  if (['outing', 'housework'].includes(thing.act))
    return shell.set({
      modal: { kind: 'activity', station: thing.station, label: thing.label, group: thing.act },
    });
  const kind = {
    water: 'water',
    store: 'store',
    basket: 'basket',
    kitchen: 'kitchen',
    'door.hero': 'sleep',
  }[thing.act];
  if (kind) return shell.set({ modal: { kind, x: thing.x, y: thing.y } });
  return shell.set({
    modal: { kind: 'sign', text: thing.text || '门虚掩着，屋里飘出饭菜的香味。桂嫂大概在灶上忙。' },
  });
}
