import { walkable } from '../content/maps/index.js';
import { actionTexture, placeAction } from './action-texture.js';
import { findPath, sideSpot } from './logic.js';

import { RESIDENT_WORK } from '../content/resident-work.js';

export class ResidentWork {
  constructor(actor) {
    this.actor = actor;
    this.image = null;
    this.job = null;
  }

  reset(plan, wet) {
    this.hide();
    const p = this.actor;
    this.job =
      plan.visible && plan.map === p.map.id ? RESIDENT_WORK[p.id + '.' + plan.place] : null;
    this.act = (wet && this.job?.rain) || this.job?.act;
    this.inspectDir = null;
    this.stopIndex = 0;
    this.wait = p.id === 'aman' ? 2.1 : 0.6;
  }

  // 在田里看见落籽，走到新种的那格旁看看。同一天在场时只看一回，地和种子仍归玩家照料。
  inspectSowing(plot, day) {
    const p = this.actor;
    if (
      p.id !== 'shi' ||
      p.plan.place !== 'field' ||
      p.map.id !== plot.map ||
      !p.sprite.visible ||
      this.visitDay === day
    )
      return;
    const hero = p.scene.player.tile;
    const spot = sideSpot(
      (x, y) =>
        walkable(p.map, x, y) && (x !== hero.x || y !== hero.y) && (x !== plot.x || y !== plot.y),
      p.tile,
      plot,
    );
    if (Math.abs(spot.x - plot.x) !== 1 || spot.y !== plot.y) return;
    this.visitDay = day;
    this.hide();
    this.wait = 0;
    this.inspectDir = spot.face;
    p.walk(spot.path, () => p.face(spot.face));
  }

  hide() {
    if (this.image?.visible) {
      this.image.setVisible(false);
      this.actor.sprite.setAlpha(1);
      this.actor.shadow.setAlpha(1);
    }
  }

  update(dt) {
    if (!this.job) return;
    const p = this.actor;
    this.wait -= dt;
    if (this.wait > 0) return;
    if (this.image?.visible) {
      this.hide();
      this.wait = 1.3;
      const stops = this.job.stops;
      if (!stops) return;
      this.stopIndex = this.inspectDir ? 0 : (this.stopIndex + 1) % stops.length;
      this.inspectDir = null;
      const [dx, dy] = stops[this.stopIndex];
      const goal = { x: p.plan.x + dx, y: p.plan.y + dy };
      const path = findPath((x, y) => walkable(p.map, x, y), p.tile, goal);
      if (path) p.walk(path, () => p.face(p.plan.dir));
      return;
    }
    const s = actionTexture(p.scene, this.act, p.look);
    this.image ??= p.scene.add.sprite(0, 0, s.key);
    placeAction(this.image, s, this.inspectDir || p.plan.dir)
      .setPosition(Math.round(p.px), Math.round(p.py))
      .setDepth(p.py)
      .setVisible(true)
      .play(s.key);
    p.sprite.setAlpha(0);
    p.shadow.setAlpha(0);
    this.wait = s.frames / s.fps + 0.35;
  }
}
