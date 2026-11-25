import { daylight } from '../art/daylight.js';
import { worldLighting } from './room-light.js';
import { changeMap } from './doorway.js';
import { DEPTH, sceneryParts } from './depth.js';
// 村庄场景：把地面、物件、人摆出来，镜头跟着操控的人，把“意图”变成走路和命令。
// 这里只通过端口（deps.game）碰规则：发命令用 dispatch，问情况用 ask，听结果用 onCommit。
import Phaser from 'phaser';
import { MAPS, walkable, farmable } from '../content/maps/index.js';
import { PEOPLE } from '../content/people.js';
import { variantAt } from '../art/index.js';
import { CSS } from '../art/palette.js';
import { buildTextures, ensurePerson } from './textures.js';
import { Walker, Villager } from './actors.js';
import { createEffects } from './effects.js';
import { weatherEffects } from './weather.js';
import { fieldInspection } from './field-inspection.js';
import { refreshPlots } from './plots.js';
import { repeatField, bindAction, bindKeyboard, bindPointer } from './input.js';
import { hintFor, touchThing, drawWater, poke } from './interactions.js';
import { swing } from './farm-motion.js';
import { tapAt } from './tap.js';
import { leaveByRoad } from './travel.js';
import { createAmbient } from './ambient.js';
import { createPerformer } from './perform.js';
import { createFieldExtras } from './visitors-events.js';
import { smartTarget, blockedByActor } from './target.js';
import { showEmote } from './emotes.js';
import { AFTER } from '../content/resident-work.js';
import { safely } from './safety.js';
import { TILE, dirTo, COMMAND_OF, fitView } from './logic.js';

const VOID = CSS.paper1; // 屋子外头留白，和 art/interior.js 里屋外的纸色一样

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
    this.heldPlot = null;
    this.fineUntil = 0;
    this.destination = null;
    this.busy = false;
    this.hintKey = '';
    this.season = null; // 换地图时场景对象是同一个，季节要重新记
    this.roadArmed = false; // 刚到时可能站在路口边，先离开路口再算
    const { anchors } = buildTextures(this, map);
    this.anchors = anchors;
    this.groundImage = this.add.image(0, 0, 'ground').setOrigin(0).setDepth(DEPTH.terrain);
    this.scenery = [];
    for (const [kind, x, y, data] of map.objects) {
      const key = `obj:${kind}:${variantAt(x, y)}`;
      // 地图数据可以指定换一副样子（屋里的木方桌、门洞），见 art/index.js 的 OBJECT_LOOKS
      const bottom = (y + 1) * TILE;
      for (const { look, depth } of sceneryParts(kind, bottom, data?.look)) {
        const texture = look ? key + '@' + look : key;
        const a = anchors[texture];
        const sprite = this.add
          .image(x * TILE + 8, bottom, texture)
          .setOrigin(a.ox, a.oy)
          .setDepth(depth);
        this.scenery.push({ sprite, key, kind, look, x, y });
      }
    }
    this.plots = new Map();
    this.cursor = this.add
      .image(0, 0, 'cursor:ok')
      .setOrigin(0)
      .setDepth(DEPTH.cursor)
      .setVisible(false);
    const hero = game.ask('hero');
    this.player = new Walker(this, hero.look, hero.x, hero.y, hero.dir);
    this.approaching = null;
    this.villagers = game
      .ask('residents')
      .map(p => new Villager(this, map, p.id, PEOPLE[p.id].look, p));
    this.lighting = worldLighting(this, map);
    this.effects = createEffects(this, map);
    this.weatherFx = weatherEffects(this);
    this.ambient = createAmbient(this, map);
    this.performer = createPerformer(this);
    this.extras = createFieldExtras(this);
    const camera = this.cameras.main;
    // 屋里看得比屋子大时，四周留白，像画在纸上的一间屋
    if (map.indoor) camera.setBackgroundColor(VOID);
    // 稳稳跟着人走：带缓动的跟随再按整像素取整，走路时整个世界会一抖一抖
    camera.startFollow(this.player.sprite, true, 1, 1, 0, 10);
    camera.setRoundPixels(true);
    const fit = () => this.fit();
    this.scale.on('resize', fit);
    this.fit();
    this.inspectField = fieldInspection(this);
    this.cleanups = [
      () => this.scale.off('resize', fit),
      bindKeyboard(this, intents),
      bindPointer(this, intents, this.deps.platform),
      ...bindAction(this, intents),
      intents.on('tap', p => this.tap(p.x, p.y)),
      game.onCommit(facts => this.onFacts(facts)),
      () => this.performer.stop(),
      () => this.extras.destroy(),
    ];
    this.events.once('shutdown', () => this.cleanups.forEach(off => off()));
    this.refreshPlots();
    this.relook();
    this.retime(true);
    this.extras.sync();
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
  /** 按窗口大小定放大倍数和镜头能走到哪儿（见 logic.js 的 fitView）。 */
  fit() {
    const { width, height } = this.scale.gameSize;
    const { zoom, bounds } = fitView(width, height, this.map);
    this.cameras.main.setZoom(zoom).setBounds(...bounds);
  }
  blocked(px, py) {
    const ok = (x, y) => walkable(this.map, Math.floor(x / TILE), Math.floor(y / TILE));
    return (
      !(ok(px - 4, py - 5) && ok(px + 4, py - 5) && ok(px - 4, py) && ok(px + 4, py)) ||
      blockedByActor(this, px, py)
    );
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
    this.inspectField();
    this.ambient.update(time, delta);
    this.extras.frame(delta);
    this.weatherFx.update(time, this.map.indoor ? 'sunny' : this.weather.code);
    const dt = Math.min(0.05, delta / 1000);
    const { intents, shell } = this.deps;
    if (!shell.paused()) {
      for (const v of this.villagers) v.tick(dt, this.approaching === v);
    }
    this.performer.update(dt);
    const move = intents.move();
    // 演着一件活时推摇杆、按方向键：戏就此收场，人照着走
    if ((move.x || move.y) && this.performer.active && !shell.paused()) this.performer.stop();
    if (this.busy) return;
    if (shell.paused()) {
      this.player.animate(false);
      return;
    }
    if (move.x || move.y) {
      this.approaching = null;
      this.player.path = [];
      this.player.onArrive = null;
      this.player.step(move.x, move.y, dt, (x, y) => this.blocked(x, y));
      leaveByRoad(this, true);
    } else if (!this.player.follow(dt)) this.player.animate(false);
    this.updateHint();
    repeatField(this);
  }
  /** 面前或身边一圈有什么可以互动的（见 target.js）。 */
  target() {
    return smartTarget(this);
  }

  updateHint() {
    const { game, shell } = this.deps;
    const t = this.target();
    const { tool, seed, manualTool } = shell.get();
    const key = [t.kind, t.person?.id, t.x, t.y, tool, seed, manualTool, game.revision()].join(':');
    if (key === this.hintKey) return;
    this.hintKey = key;
    const hint = hintFor(this, t);
    const old = shell.get().hint;
    if (
      old?.text !== hint?.text ||
      old?.ok !== hint?.ok ||
      old?.verb !== hint?.verb ||
      old?.tool !== hint?.tool ||
      old?.care !== hint?.care
    )
      shell.set({ hint });
    this.cursor.setVisible(!!hint).setPosition(t.x * TILE, t.y * TILE);
    if (hint) this.cursor.setTexture(hint.ok ? 'cursor:ok' : 'cursor:no');
  }

  /** 操控的人头顶在画面上的哪一点（画面坐标，像素）：面板把冒出来的字摆在那儿。 */
  headOnScreen(actor = this.player) {
    const camera = this.cameras.main;
    const view = camera.worldView;
    return {
      x: (actor.px - view.x) * camera.zoom,
      y: (actor.py - 30 - view.y) * camera.zoom,
    };
  }

  /** 对面前的东西做该做的事。 */
  act(hold = false) {
    const { game, shell, platform } = this.deps;
    // 正在演一件活：按一下就快进（开着小窗时这一下是给小窗的，比如钓鱼时提竿）
    if (this.performer.active) return shell.paused() ? undefined : this.performer.skip();
    if (this.busy || shell.paused()) return;
    platform.audio.unlock();
    const t = this.target();
    const here = this.player.tile;
    if (t.x !== here.x || t.y !== here.y) this.player.face(dirTo(here, t));
    if (t.kind === 'person') return this.talk(t.person);
    if (t.kind === 'visitor') return this.extras.interactVisitor(t.visitor);
    if (t.kind === 'pulse') return this.extras.interactEvent(t.pulse);
    if (t.kind === 'thing') return this.touch(t.thing);
    if (t.kind === 'water') return drawWater(this, t);
    if (t.kind === 'decor') return poke(this, t.decor);
    if (!farmable(this.map, t.x, t.y)) return undefined;
    const action = hintFor(this, t);
    if (!action.ok) return this.refuse(action.text);
    const tool = action.tool;
    if (!tool) return shell.set({ modal: { kind: 'field', x: t.x, y: t.y } });
    const seed = shell.get().seed;
    if (hold) this.heldPlot = { x: t.x, y: t.y, tool, next: this.time.now + 745 };
    return swing(this, tool, () => this.send(COMMAND_OF[tool], t, { seed }));
  }

  send(type, t, extra = {}) {
    const out = this.deps.game.dispatch(type, { x: t.x, y: t.y, at: this.at(), ...extra });
    if (!out.ok) this.refuse(out.reason);
    return out;
  }

  refuse(reason) {
    this.heldPlot = null;
    this.deps.shell.toast(reason);
    this.deps.platform.audio.play('no');
    this.tweens.add({ targets: this.cursor, alpha: { from: 0.2, to: 1 }, duration: 90, repeat: 2 });
  }

  talk(person) {
    const { game, shell, platform } = this.deps;
    person.turnTo(this.player);
    this.player.face(dirTo(this.player.tile, person.tile));
    const line = game.ask('resident.greeting', person.id, person.commuting);
    if (!line) return;
    platform.audio.play('talk');
    shell.set({
      modal: {
        kind: 'talk',
        who: person.id,
        line,
        walking: person.commuting,
        anchor: this.headOnScreen(person),
      },
    });
  }

  touch(thing) {
    return touchThing(this, thing);
  }

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
        changeMap(this, MAPS[d.to]);
        return;
      }
      if (f.type === 'wardrobe.worn') {
        const p = this.player;
        p.look = this.deps.game.ask('hero').look;
        ensurePerson(this, p.look);
        p.sprite.setTexture('person:' + p.look);
        p.setPose(null);
      }
      if (FEEDBACK[f.type]) {
        const [effect, sound] = FEEDBACK[f.type];
        // 收到极品：菜蹦得高、冒金星，换一串往上走的响；头一回还在底下说说它有什么用
        if (d.fine) this.fineUntil = this.time.now + 1200;
        this.effects[effect](d.x, d.y, d.crop, d.fine);
        platform.audio.play(d.fine ? 'fine' : sound);
        platform.haptic(d.fine ? [14, 60, 24] : undefined);
        if (d.line) this.deps.shell.toast(d.line);
        const day = this.deps.game.ask('clock').day;
        for (const v of this.villagers) v.work.notice(f.type, d, day);
        plots = true;
      } else if (f.type === 'gift.given' || f.type === 'person.talked') {
        // 收下喜欢的东西、聊得熟了一层，头上冒个心；平常收下东西冒个音符
        const v = this.villagers.find(p => p.id === d.to && p.present);
        const gift = f.type === 'gift.given';
        const liked = d.liked || d.favorite;
        const kind = gift ? (liked ? AFTER.liked : AFTER.plain) : d.gained && AFTER.closer;
        if (v) showEmote(this, v, kind);
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
    this.extras.onFacts(facts);
    if (plots) this.refreshPlots();
    this.hintKey = '';
  }

  /** 时间变了：天色、村民的去向、炊烟。 */
  retime(jump) {
    const { minute, season, day } = this.deps.game.ask('clock');
    this.today = day;
    this.weather = this.deps.game.ask('weather');
    this.ambient.setTime(minute, season, this.weather.tags);
    this.effects.setSky(season, minute, this.weather.tags);
    // 换季才换贴图：每十分钟一次的走时也把上百个物件的贴图重设一遍，手机上会顿一下
    if (season !== this.season) {
      this.season = season;
      this.groundImage.setTexture('ground:' + season);
      for (const s of this.scenery) this.dress(s);
    }
    const light = daylight(minute, this.weather.code, !!this.map.indoor);
    this.lighting(light, minute, this.weather.code);
    const residents = this.deps.game.ask('residents');
    const wet = this.weather.tags.includes('wet');
    for (const v of this.villagers)
      v.retime(
        residents.find(p => p.id === v.id),
        wet,
        jump,
      );
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
