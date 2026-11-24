// 会走路的人：玩家操控的人和按作息走动的村民，用的是同一套走路、朝向和动画。
import { TILE, tileOf, dirTo, findPath, exitToward } from './logic.js';
import { ResidentWork } from './resident-work.js';
import { showEmote } from './emotes.js';
import { GREET } from '../content/resident-work.js';
import { frameOf, ensurePerson } from './textures.js';
import { walkable } from '../content/maps/index.js';

const FOOT_Y = 13; // 人站在一格里时，脚的位置离格子顶边多少像素

export class Walker {
  /** x、y 是格子坐标。 */
  constructor(scene, look, x, y, dir = 'down') {
    ensurePerson(scene, look);
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
    this.emote?.setPosition(x, y - 31);
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
    if (moving && this.sprite.anims.currentAnim?.key !== key) {
      const phase =
        this.moving && this.sprite.anims.isPlaying ? this.sprite.anims.getProgress() : 0;
      this.sprite.play(key);
      this.sprite.anims.setProgress(phase);
    } else if (moving && !this.sprite.anims.isPlaying) this.sprite.play(key);
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

/**
 * 村民：按作息表去该去的位置，到了就面朝规定的方向。换到别处去，是沿路走到那边的路口才不见；
 * 从别处来，是从来路的路口走进来；回家的人走回自家门口。刚进这张图、刚睡醒时直接摆到位。
 */
export class Villager extends Walker {
  constructor(scene, map, id, look, first) {
    super(scene, look, first.x, first.y, first.dir);
    this.id = id;
    this.work = new ResidentWork(this);
    this.map = map;
    this.speed = 30;
    this.plan = first;
    this.doing = first.doing;
    this.commuting = false;
    this.leaving = false;
    this.setVisible(first.visible && first.map === map.id);
  }

  /** 此刻在这张图上、点得着、说得上话（正往路口走、要走了的人不算）。 */
  get present() {
    return this.sprite.visible && !this.leaving;
  }

  /** 时间变了：看看是不是该换地方了。 */
  retime(plan, wet, jump = false) {
    const old = this.plan;
    if (
      !jump &&
      this.wet === wet &&
      ['map', 'place', 'x', 'y', 'dir', 'doing', 'visible'].every(k => plan[k] === old[k])
    )
      return;
    this.wet = wet;
    this.work.reset(plan, wet);
    this.plan = plan;
    this.doing = plan.doing;
    this.commuting = false;
    this.leaving = false;
    const walk = (x, y) => walkable(this.map, x, y);
    const away = p => (p.visible ? p.map : null);
    if (!plan.visible || plan.map !== this.map.id) {
      const door =
        !jump && this.sprite.visible && exitToward(this.map, away(plan), this.id, this.tile);
      const path = door && findPath(walk, this.tile, door);
      if (!path) {
        this.stop();
        this.setVisible(false);
        return;
      }
      this.leaving = true;
      this.walk(path, () => this.setVisible(false));
      return;
    }
    // 从别处来：先站到来路的那个路口，再走过去
    if (!jump && !this.sprite.visible) {
      const door = exitToward(this.map, away(old), this.id, plan);
      if (door && walk(door.x, door.y)) {
        this.place(door);
        this.setVisible(true);
      }
    }
    const settle = () => {
      this.commuting = false;
      this.face(plan.dir);
      this.setVisible(true);
    };
    const path = jump || !this.sprite.visible ? null : findPath(walk, this.tile, plan);
    if (!path) {
      this.place(plan);
      this.stop();
      settle();
      return;
    }
    this.commuting = path.length > 0;
    this.walk(path, settle);
  }

  /** 直接摆到某一格。 */
  place(at) {
    this.px = at.x * TILE + 8;
    this.py = at.y * TILE + FOOT_Y;
    this.sync();
  }

  tick(dt, waiting) {
    if (!this.sprite.visible) return;
    const next = this.path[0];
    const hero = this.scene.player.tile;
    if (waiting || (next && next.x === hero.x && next.y === hero.y)) {
      this.work.hide();
      this.animate(false);
      return;
    }
    if (this.follow(dt)) return;
    const near = Math.max(Math.abs(this.tile.x - hero.x), Math.abs(this.tile.y - hero.y)) <= 2;
    if (near && this.present) this.greet();
    this.work.update(dt);
  }

  /**
   * 今天头一回走到跟前：放下手里的活，转过身看你一眼，头顶冒个记号
   * （content/resident-work.js 的 GREET）。一天一回，换了地图也记得（记在 registry 里）。
   */
  greet() {
    const scene = this.scene;
    const key = this.id + ':' + scene.today;
    const seen = scene.registry.get('greeted') || new Set();
    if (seen.has(key)) return;
    scene.registry.set('greeted', seen.add(key));
    const bond = scene.deps.game.ask('bonds').find(b => b.id === this.id);
    this.turnTo(scene.player);
    this.work.wait = 1.8;
    showEmote(scene, this, bond?.tier === 0 ? GREET.stranger : GREET[bond?.mood]);
  }

  /** 转过身来对着某个人（说话的时候）。 */
  turnTo(other) {
    this.work.hide();
    this.animate(false);
    this.face(dirTo(this.tile, other.tile));
  }
}
