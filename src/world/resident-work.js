import { walkable } from '../content/maps/index.js';
import { actionTexture, playBody, supportedAct } from './action-texture.js';
import { findPath, plotToll, sideSpot } from './logic.js';

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
      plan.visible && plan.map === p.map.id && !plan.waiting && !plan.atDoor
        ? RESIDENT_WORK[p.id + '.' + plan.place]
        : null;
    this.act = (wet && this.job?.rain) || this.job?.act;
    this.inspectDir = null;
    this.stopIndex = 0;
    this.wait = this.job?.delay ?? 0.6;
  }

  // 看见工位表里登记过的事（比如在他眼前落籽），走到那一格旁边看看。同一天只看一回；
  // 看归看，地和种子仍归玩家照料。谁会看、看什么，写在 content/resident-work.js。
  notice(type, plot, day) {
    const p = this.actor;
    if (
      this.job?.notice?.[type] !== 'inspect' ||
      p.map.id !== plot.map ||
      !p.present ||
      this.visitDay === day
    )
      return;
    const hero = p.scene.player.tile;
    // 站到地边看，不站到旁边那格菜畦上；走过去也绕开种上的地
    const toll = plotToll(p.scene, p.map);
    const spot = sideSpot(
      (x, y) =>
        walkable(p.map, x, y) &&
        (x !== hero.x || y !== hero.y) &&
        (x !== plot.x || y !== plot.y) &&
        !toll?.(x, y),
      p.tile,
      plot,
      toll,
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
    }
  }

  update(dt) {
    if (!this.job) return;
    const p = this.actor;
    this.wait -= dt;
    if (this.wait > 0) return;
    const dir = this.inspectDir || p.plan.dir;
    const work = supportedAct(p.map, p.tile, this.act);
    if (!this.image?.visible) {
      p.face(dir === 'left' ? 'left' : 'right');
      this.phase = 'ready';
      this.play('readyHands', dir);
      return;
    }
    if (this.phase === 'ready' || this.phase === 'rest') {
      this.phase = 'work';
      this.play(work, dir);
      return;
    }
    if (this.phase === 'work') {
      // 不换回站立帧：休息时手落在原处，杯子、凳子也还在。
      this.phase = 'rest';
      this.wait = 1.3;
      if (this.job.stops) {
        this.phase = 'leave';
        this.play('lowerHands', dir);
      }
      return;
    }
    this.hide();
    this.wait = 0.45;
    const stops = this.job.stops;
    this.stopIndex = this.inspectDir ? 0 : (this.stopIndex + 1) % stops.length;
    this.inspectDir = null;
    const [dx, dy] = stops[this.stopIndex];
    const goal = { x: p.plan.x + dx, y: p.plan.y + dy };
    const toll = plotToll(p.scene, p.map);
    if (toll?.(goal.x, goal.y)) return; // 落脚点让人锄成了地，就在原处接着干
    const path = findPath((x, y) => walkable(p.map, x, y), p.tile, goal, 4000, toll);
    if (path) p.walk(path, () => p.face(p.plan.dir));
  }

  play(act, dir) {
    const p = this.actor;
    const s = actionTexture(p.scene, act, p.look);
    this.image ??= p.scene.add.sprite(0, 0, s.key);
    playBody(this.image, s, p, dir);
    p.sprite.setAlpha(0);
    this.wait = s.frames / s.fps;
  }
}
