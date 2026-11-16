// 会走路的人：玩家操控的人和按作息走动的村民，用的是同一套走路、朝向和动画。
import { TILE, tileOf, dirTo, findPath } from './logic.js';
import { frameOf } from './textures.js';
import { scheduleAt } from '../content/people.js';
import { spot, walkable } from '../content/maps/index.js';

const FOOT_Y = 13; // 人站在一格里时，脚的位置离格子顶边多少像素

export class Walker {
  /** x、y 是格子坐标。 */
  constructor(scene, look, x, y, dir = 'down') {
    this.scene = scene;
    this.look = look;
    this.dir = dir;
    this.px = x * TILE + 8;
    this.py = y * TILE + FOOT_Y;
    this.speed = 68;
    this.path = [];
    this.moving = false;
    this.pose = null;
    this.onArrive = null;
    this.shadow = scene.add.image(0, 0, 'shadow').setOrigin(0.5, 0.5);
    this.sprite = scene.add
      .sprite(0, 0, 'person:' + look, frameOf(dir, 'stand'))
      .setOrigin(0.5, 30 / 32);
    this.sync();
  }

  /** 脚下是哪一格。 */
  get tile() {
    return tileOf(this.px, this.py - 2);
  }

  sync() {
    const x = Math.round(this.px);
    const y = Math.round(this.py);
    this.sprite.setPosition(x, y).setDepth(this.py);
    this.shadow.setPosition(x, y).setDepth(this.py - 0.5);
  }

  setVisible(visible) {
    this.sprite.setVisible(visible);
    this.shadow.setVisible(visible);
  }

  face(dir) {
    this.dir = dir;
    if (!this.moving && !this.pose) this.sprite.setFrame(frameOf(dir, 'stand'));
  }

  /** 摆一个姿势（抬手、落手）；传 null 回到站立。 */
  setPose(pose) {
    this.pose = pose;
    this.moving = false;
    this.sprite.anims.stop();
    this.sprite.setFrame(frameOf(this.dir, pose || 'stand'));
  }

  animate(moving) {
    if (this.pose) return;
    const key = `${this.look}:walk:${this.dir}`;
    if (moving && this.sprite.anims.currentAnim?.key !== key) this.sprite.play(key);
    else if (moving && !this.sprite.anims.isPlaying) this.sprite.play(key);
    else if (!moving && this.moving) {
      this.sprite.anims.stop();
      this.sprite.setFrame(frameOf(this.dir, 'stand'));
    }
    this.moving = moving;
  }

  /** 朝 (vx, vy) 走 dt 秒。blocked(px, py) 判断脚踩在那儿行不行；两个方向分开试，所以会贴着墙滑。 */
  step(vx, vy, dt, blocked) {
    const length = Math.hypot(vx, vy);
    if (!length) {
      this.animate(false);
      return false;
    }
    const scale = (this.speed * dt) / Math.max(1, length);
    this.dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : vy > 0 ? 'down' : 'up';
    let moved = false;
    if (vx && !blocked(this.px + vx * scale, this.py)) {
      this.px += vx * scale;
      moved = true;
    }
    if (vy && !blocked(this.px, this.py + vy * scale)) {
      this.py += vy * scale;
      moved = true;
    }
    this.animate(moved);
    this.sync();
    return moved;
  }

  /** 沿着一串格子走；走完调用 then。 */
  walk(path, then = null) {
    this.path = path || [];
    this.onArrive = then;
    if (!this.path.length) this.arrive();
  }

  stop() {
    this.path = [];
    this.onArrive = null;
    this.animate(false);
  }

  arrive() {
    this.animate(false);
    const then = this.onArrive;
    this.onArrive = null;
    if (then) then();
  }

  /** 每一帧调用：还有路就接着走。 */
  follow(dt) {
    if (!this.path.length) return false;
    const next = this.path[0];
    const tx = next.x * TILE + 8;
    const ty = next.y * TILE + FOOT_Y;
    const dx = tx - this.px;
    const dy = ty - this.py;
    const distance = Math.hypot(dx, dy);
    const reach = this.speed * dt;
    if (distance <= reach) {
      this.px = tx;
      this.py = ty;
      this.path.shift();
      this.sync();
      if (!this.path.length) this.arrive();
      return true;
    }
    this.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    this.px += (dx / distance) * reach;
    this.py += (dy / distance) * reach;
    this.animate(true);
    this.sync();
    return true;
  }
}

/** 村民：按作息表去该去的位置，到了就面朝规定的方向；“回家了”就从画面上消失。 */
export class Villager extends Walker {
  constructor(scene, map, id, look, minute) {
    const first = scene.deps.game.ask('residents').find(p => p.id === id);
    super(scene, look, first.x, first.y, first.dir);
    this.id = id;
    this.map = map;
    this.speed = 30;
    this.plan = first;
    this.doing = first.doing;
    this.setVisible(first.visible && first.map === map.id);
  }

  /** 时间变了：看看是不是该换地方了。 */
  retime(minute, jump = false) {
    const plan = this.scene.deps.game.ask('residents').find(p => p.id === this.id);
    if (!jump && JSON.stringify(plan) === JSON.stringify(this.plan)) return;
    this.plan = plan;
    this.doing = plan.doing;
    const goal = plan;
    const offstage = !plan.visible || plan.map !== this.map.id;
    if (offstage) {
      this.stop();
      this.setVisible(false);
      return;
    }
    const settle = () => {
      this.face(goal.dir);
      this.setVisible(!offstage);
    };
    const path = jump ? null : findPath((x, y) => walkable(this.map, x, y), this.tile, goal);
    if (!path) {
      this.px = goal.x * TILE + 8;
      this.py = goal.y * TILE + FOOT_Y;
      this.path = [];
      this.sync();
      settle();
      return;
    }
    this.setVisible(true);
    this.walk(path, settle);
  }

  /** 转过身来对着某个人（说话的时候）。 */
  turnTo(other) {
    if (!this.path.length) this.face(dirTo(this.tile, other.tile));
  }
}
