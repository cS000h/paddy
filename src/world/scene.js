// 村庄场景：把地面、物件、人摆出来，镜头跟着操控的人，把“意图”变成走路和命令。
// 这里只通过端口（deps.game）碰规则：发命令用 dispatch，问情况用 ask，听结果用 onCommit。
import Phaser from 'phaser';
import { MAPS, walkable, farmable, waterSource, actAt } from '../content/maps/index.js';
import { PEOPLE, ON_MAP } from '../content/people.js';
import { variantAt } from '../art/index.js';
import { buildTextures } from './textures.js';
import { Walker, Villager } from './actors.js';
import { createEffects } from './effects.js';
import { weatherEffects } from './weather.js';
import { refreshPlots } from './plots.js';
import { bindKeyboard, bindPointer } from './input.js';
import { hintFor, touchThing } from './interactions.js';
import { tapAt } from './tap.js';
import { leaveByRoad } from './travel.js';
import { safely } from './safety.js';
import { TILE, facing, dirTo, COMMAND_OF, skyTint } from './logic.js';

// 规则里的事落到画面上：哪种事实，在那一格放哪个动效、出哪个声。
const FEEDBACK = {
  'plot.tilled': ['tilled', 'hoe'],
  'plot.sown': ['sown', 'seed'],
  'plot.watered': ['watered', 'water'],
  'crop.harvested': ['harvested', 'harvest'],
};

export class VillageScene extends Phaser.Scene {
  constructor() {
    super('village');
  }

  init(deps) {
    this.deps = deps; // {game, intents, shell, platform, map}
  }

  // 场景没能搭起来（比如某张地图的素材坏了），世界会是一片空白：记下错，请玩家刷新或导出进度
  create() {
    try {
      this.build();
    } catch (error) {
      this.deps.report(error, 'world:start');
      this.deps.shell.set({ modal: { kind: 'trouble' } });
    }
  }

  build() {
    const { game, intents, shell, map } = this.deps;
    this.map = map;
    this.busy = false;
    this.hintKey = '';
    this.season = null; // 换地图时场景对象是同一个，季节要重新记
    this.roadArmed = false; // 刚到时可能站在路口边，先离开路口再算
    const { anchors } = buildTextures(this, map);
    this.anchors = anchors;
    this.groundImage = this.add.image(0, 0, 'ground').setOrigin(0).setDepth(-1000);
    this.scenery = [];
    for (const [kind, x, y] of map.objects) {
      const key = `obj:${kind}:${variantAt(x, y)}`;
      const a = anchors[key];
      const sprite = this.add
        .image(x * TILE + 8, (y + 1) * TILE, key)
        .setOrigin(a.ox, a.oy)
        .setDepth((y + 1) * TILE);
      this.scenery.push({ sprite, key, kind, look: null });
    }
    this.plots = new Map();
    this.cursor = this.add.image(0, 0, 'cursor:ok').setOrigin(0).setDepth(-800).setVisible(false);
    this.toolIcon = this.add.image(0, 0, 'icon:hoe').setDepth(9200).setVisible(false);

    const hero = game.ask('hero');
    this.player = new Walker(this, hero.look, hero.x, hero.y, hero.dir);
    const minute = game.ask('clock').minute;
    this.villagers = ON_MAP.map(id => new Villager(this, map, id, PEOPLE[id].look, minute));
    this.effects = createEffects(this, map);
    this.weatherFx = weatherEffects(this);

    const camera = this.cameras.main;
    camera.setBounds(0, 0, map.width * TILE, map.height * TILE);
    // 稳稳跟着人走：带缓动的跟随再按整像素取整，走路时整个世界会一抖一抖
    camera.startFollow(this.player.sprite, true, 1, 1, 0, 10);
    camera.setRoundPixels(true);
    const fit = () => this.fit();
    this.scale.on('resize', fit);
    this.fit();

    this.cleanups = [
      () => this.scale.off('resize', fit),
      bindKeyboard(this, intents),
      bindPointer(this, intents, this.deps.platform),
      intents.on('act', () => this.act()),
      intents.on('tap', p => this.tap(p.x, p.y)),
      game.onCommit(facts => this.onFacts(facts)),
    ];
    this.events.once('shutdown', () => this.cleanups.forEach(off => off()));
    this.refreshPlots();
    this.relook();
    this.retime(true);
  }

  /** 有的物件随规则里的状态换样子。现在只有鸡窝：还没搭是一块空地，养了鸡能看见鸡。 */
  relook() {
    const coops = this.scenery.filter(s => s.kind === 'coop');
    if (!coops.length) return;
    const home = this.deps.game.ask('homestead', 'coop');
    const look = !home.coop ? 'site' : home.hens > 0 ? 'hens' : null;
    for (const s of coops) {
      s.look = look;
      const a = this.anchors[look ? s.key + '@' + look : s.key];
      s.sprite.setOrigin(a.ox, a.oy);
      if (this.season !== null) this.dress(s);
    }
  }

  /** 按窗口大小挑一个整数倍的放大倍数：横向至少看得到 17 格，纵向至少 10 格。 */
  fit() {
    const { width, height } = this.scale.gameSize;
    const zoom = Math.max(
      2,
      Math.min(6, Math.floor(Math.min(width / (17 * TILE), height / (10 * TILE)))),
    );
    this.cameras.main.setZoom(zoom);
  }

  blocked(px, py) {
    const ok = (x, y) => walkable(this.map, Math.floor(x / TILE), Math.floor(y / TILE));
    return !(ok(px - 4, py - 5) && ok(px + 4, py - 5) && ok(px - 4, py) && ok(px + 4, py));
  }

  /** 给规则报告的站位。 */
  at() {
    return { ...this.player.tile, dir: this.player.dir };
  }

  /** 跑一段可能出错的画面代码：出错交给 report，这一帧的其余部分照常画完。 */
  guard(fn) {
    return safely(this.deps.report, fn);
  }

  update(time, delta) {
    this.guard(() => this.frame(time, delta));
  }

  frame(time, delta) {
    this.weatherFx.update(time, this.map.indoor ? 'sunny' : this.deps.game.ask('weather').code);
    const dt = Math.min(0.05, delta / 1000);
    const { intents, shell } = this.deps;
    for (const v of this.villagers) v.follow(dt);
    if (shell.paused() || this.busy) {
      this.player.animate(false);
      return;
    }
    const move = intents.move();
    if (move.x || move.y) {
      this.player.path = [];
      this.player.onArrive = null;
      this.player.step(move.x, move.y, dt, (x, y) => this.blocked(x, y));
      leaveByRoad(this, true);
    } else if (!this.player.follow(dt)) this.player.animate(false);
    this.updateHint();
  }

  /** 面前有什么可以互动的：村民、物件，或者一格地。 */
  target() {
    const here = this.player.tile;
    const t = facing(here.x, here.y, this.player.dir);
    const person = this.villagers.find(
      v => v.sprite.visible && Math.abs(v.tile.x - t.x) + Math.abs(v.tile.y - t.y) === 0,
    );
    if (person) return { kind: 'person', person, ...t };
    const thing = actAt(this.map, t.x, t.y);
    if (thing) return { kind: 'thing', thing, ...t };
    if (waterSource(this.map, t.x, t.y)) return { kind: 'water', ...t };
    return { kind: 'plot', ...t };
  }

  updateHint() {
    const { game, shell } = this.deps;
    const t = this.target();
    const key = `${t.kind}:${t.x},${t.y}:${shell.get().tool}:${game.revision()}`;
    if (key === this.hintKey) return;
    this.hintKey = key;
    const hint = hintFor(this, t);
    const old = shell.get().hint;
    if (old?.text !== hint?.text || old?.ok !== hint?.ok || old?.verb !== hint?.verb)
      shell.set({ hint });
    this.cursor.setVisible(!!hint).setPosition(t.x * TILE, t.y * TILE);
    if (hint) this.cursor.setTexture(hint.ok ? 'cursor:ok' : 'cursor:no');
  }

  /** 操控的人头顶在画面上的哪一点（画面坐标，像素）：面板把冒出来的字摆在那儿。 */
  headOnScreen() {
    const camera = this.cameras.main;
    const view = camera.worldView;
    return {
      x: (this.player.px - view.x) * camera.zoom,
      y: (this.player.py - 30 - view.y) * camera.zoom,
    };
  }

  /** 对面前的东西做该做的事。 */
  act() {
    const { game, shell, platform } = this.deps;
    if (this.busy || shell.paused()) return;
    platform.audio.unlock();
    const t = this.target();
    if (t.kind === 'person') return this.talk(t.person);
    if (t.kind === 'thing') return this.touch(t.thing);
    if (t.kind === 'water') return shell.set({ modal: { kind: 'water', x: t.x, y: t.y } });
    if (!farmable(this.map, t.x, t.y)) return undefined;
    const tool = shell.get().tool;
    const reason = game.ask('farm.why', tool, t.x, t.y, this.at(), shell.get().seed);
    if (reason) return this.refuse(reason);
    return this.swing(tool, t, () => this.send(COMMAND_OF[tool], t, { seed: shell.get().seed }));
  }

  send(type, t, extra = {}) {
    const out = this.deps.game.dispatch(type, { x: t.x, y: t.y, at: this.at(), ...extra });
    if (!out.ok) this.refuse(out.reason);
    return out;
  }

  refuse(reason) {
    this.deps.shell.toast(reason);
    this.deps.platform.audio.play('no');
    this.tweens.add({ targets: this.cursor, alpha: { from: 0.2, to: 1 }, duration: 90, repeat: 2 });
  }

  /** 挥一下工具：抬手、落手，落手的那一刻真正生效。 */
  swing(tool, t, hit) {
    this.busy = true;
    const p = this.player;
    p.face(dirTo(p.tile, t));
    p.setPose('raise');
    const tx = t.x * TILE + 8;
    const ty = t.y * TILE + 8;
    const icon = this.toolIcon.setTexture('icon:' + tool).setVisible(true);
    icon
      .setPosition(p.px, p.py - 34)
      .setAngle(-50)
      .setFlipX(p.dir === 'left');
    this.tweens.add({
      targets: icon,
      x: (p.px + tx) / 2,
      y: (p.py - 20 + ty) / 2,
      angle: 30,
      duration: 190,
      delay: 110,
      ease: 'Quad.easeIn',
    });
    this.time.delayedCall(150, () => {
      p.setPose('strike');
      this.guard(hit);
    });
    // 收手一定要把 busy 放下，否则这一下出了错，人就再也做不了事
    this.time.delayedCall(390, () => {
      this.busy = false;
      this.hintKey = '';
      this.guard(() => {
        p.setPose(null);
        icon.setVisible(false);
      });
    });
  }

  talk(person) {
    const { game, shell, platform } = this.deps;
    person.turnTo(this.player);
    this.player.face(dirTo(this.player.tile, person.tile));
    const out = game.dispatch('talk', { to: person.id, at: this.at() });
    if (!out.ok) return this.refuse(out.reason);
    platform.audio.play('talk');
    const said = out.facts.find(f => f.type === 'person.talked').data;
    return shell.set({
      modal: {
        kind: 'talk',
        who: person.id,
        line: said.line,
        doing: person.doing,
        gain: said.gain,
      },
    });
  }

  touch(thing) {
    return touchThing(this, thing);
  }

  /** 点了世界里的一个位置：走过去；那儿有事可做就做。 */
  /** 点了世界里的一个位置：走过去；那儿有事可做就做（见 tap.js）。 */
  tap(wx, wy) {
    tapAt(this, wx, wy);
  }

  /** 规则里发生了事：给反馈、重画变了的东西。 */
  onFacts(facts) {
    const { platform } = this.deps;
    let plots = false;
    for (const f of facts) {
      const d = f.data;
      if (f.type === 'person.travelled') {
        this.player.stop();
        this.deps.shell.toast(d.name);
        this.scene.restart({ ...this.deps, map: MAPS[d.to] });
        return;
      }
      if (FEEDBACK[f.type]) {
        const [effect, sound] = FEEDBACK[f.type];
        this.effects[effect](d.x, d.y);
        platform.audio.play(sound);
        plots = true;
      } else if (f.type === 'can.refilled') {
        this.effects.refilled(d.x * TILE + 8, d.y * TILE + 8);
        platform.audio.play('refill');
      } else if (f.type === 'home.worked') {
        this.relook();
        this.retime(false);
      } else if (f.type === 'plot.cared' || f.type === 'weather.changed') {
        plots = true;
        this.retime(false);
      } else if (f.type === 'time.passed') this.retime(false);
      else if (f.type === 'day.started') {
        const hero = this.deps.game.ask('hero');
        const bed = { x: hero.x, y: hero.y };
        this.player.stop();
        this.player.px = bed.x * TILE + 8;
        this.player.py = bed.y * TILE + 13;
        this.player.face('down');
        this.player.sync();
        this.relook();
        this.retime(true);
        platform.audio.play('day');
        plots = true;
      }
    }
    if (plots) this.refreshPlots();
    this.hintKey = '';
  }

  /** 时间变了：天色、村民的去向、炊烟。 */
  retime(jump) {
    const { minute, season } = this.deps.game.ask('clock');
    // 换季才换贴图：每十分钟一次的走时也把上百个物件的贴图重设一遍，手机上会顿一下
    if (season !== this.season) {
      this.season = season;
      this.groundImage.setTexture('ground:' + season);
      for (const s of this.scenery) this.dress(s);
    }
    this.deps.shell.set({ tint: this.map.indoor ? '#ffffff' : skyTint(minute) });
    for (const v of this.villagers) v.retime(minute, jump);
    this.effects.setCooking((minute >= 660 && minute < 780) || (minute >= 1020 && minute < 1140));
  }

  /** 按季节和样子给一个物件换上贴图。 */
  dress(s) {
    s.sprite.setTexture((s.look ? s.key + '@' + s.look : s.key) + ':' + this.season);
  }

  refreshPlots() {
    refreshPlots(this);
  }
}
