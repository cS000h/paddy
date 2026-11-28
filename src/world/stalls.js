// 集场路南的摊棚：今天哪个摊位上是哪个摊子，问规则（查询 stalls），照着换那副样子（art/stalls.js）。
// 没摆摊的摊位只剩空架子；集日换挂彩旗灯笼的那副。摊棚是地图上的物件，换样子的办法和鸡窝一样（scene.dress）。
import { isFairDay } from '../content/calendar.js';

export function syncStalls(scene) {
  const stalls = scene.scenery.filter(s => s.kind === 'stall');
  if (!stalls.length) return;
  const out = scene.deps.game.ask('stalls');
  const fair = isFairDay(scene.deps.game.ask('clock').day) ? '.fair' : '';
  for (const s of stalls) {
    const spot = scene.map.objects.find(([k, x, y]) => k === 'stall' && x === s.x && y === s.y)?.[3]
      ?.spot;
    const look = spot !== undefined && out[spot] ? out[spot] + fair : 'empty';
    if (s.look === look) continue;
    s.look = look;
    const a = scene.anchors[s.key + '@' + look];
    s.sprite.setOrigin(a.ox, a.oy);
    if (scene.season !== null) scene.dress(s);
    else s.sprite.setTexture(s.key + '@' + look);
  }
}
