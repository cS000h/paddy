// 村庄场景：把地面、物件、人摆出来，镜头跟着操控的人，把“意图”变成走路和命令。
// 这里只通过端口（deps.game）碰规则：发命令用 dispatch，问情况用 ask，听结果用 onCommit。
import Phaser from 'phaser';
import { buildTextures } from './textures.js';
import { Walker, Villager } from './actors.js';
import { createEffects } from './effects.js';
import { bindKeyboard, bindPointer } from './input.js';
import {
  TILE,
  tileOf,
  facing,
  dirTo,
  findPath,
  standBeside,
  bestTool,
  COMMAND_OF,
  toolVerb,
  skyTint,
} from './logic.js';
import { walkable, farmable, waterSource, actAt, spot } from '../content/maps/index.js';
import { PEOPLE, ON_MAP } from '../content/people.js';

const ACT_HINT = {
  'door.hero': '回屋歇息',
  'door.gui': '敲敲门',
  water: '打水',
  basket: '看看收菜筐',
  sign: '看路牌',
};

export class VillageScene extends Phaser.Scene {
  constructor() {
    super('village');
  }

  init(deps) {
    this.deps = deps; // {game, intents, shell, platform, map}
  }

  create() {
    const { game, intents, shell, map } = this.deps;
    this.map = map;
    this.busy = false;
    this.hintKey = '';
    const { anchors } = buildTextures(this, map);
    this.add.image(0, 0, 'ground').setOrigin(0).setDepth(-1000);
    for (const [kind, x, y] of map.objects) {
      const key = `obj:${kind}:${(x * 7 + y * 13) % 4}`;
      const a = anchors[key];
      this.add
        .image(x * TILE + 8, (y + 1) * TILE, key)
        .setOrigin(a.ox, a.oy)
        .setDepth((y + 1) * TILE);
    }
    this.plots = new Map();
    this.cursor = this.add.image(0, 0, 'cursor:ok').setOrigin(0).setDepth(-800).setVisible(false);
    this.toolIcon = this.add.image(0, 0, 'icon:hoe').setDepth(9200).setVisible(false);

    const hero = game.ask('hero');
    this.player = new Walker(this, hero.look, hero.x, hero.y, hero.dir);
    const minute = game.ask('clock').minute;
    this.villagers = ON_MAP.map(id => new Villager(this, map, id, PEOPLE[id].look, minute));
    this.effects = createEffects(this, map);

    const camera = this.cameras.main;
    camera.setBounds(0, 0, map.width * TILE, map.height * TILE);
    camera.startFollow(this.player.sprite, true, 0.14, 0.14, 0, 10);
    camera.setRoundPixels(true);
    this.scale.on('resize', () => this.fit());
    this.fit();

    this.cleanups = [
      bindKeyboard(this, intents),
      bindPointer(this, intents, this.deps.platform),
      intents.on('act', () => this.act()),
      intents.on('tap', p => this.tap(p.x, p.y)),
      game.onCommit(facts => this.onFacts(facts)),
    ];
    this.events.once('shutdown', () => this.cleanups.forEach(off => off()));
    this.refreshPlots();
    this.retime(true);
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

  update(time, delta) {
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
    if (this.deps.shell.get().tool === 'can' && waterSource(this.map, t.x, t.y))
      return { kind: 'water', ...t };
    return { kind: 'plot', ...t };
  }

  updateHint() {
    const { game, shell } = this.deps;
    const t = this.target();
    const tool = shell.get().tool;
    const key = `${t.kind}:${t.x},${t.y}:${tool}:${game.revision()}`;
    if (key === this.hintKey) return;
    this.hintKey = key;
    let hint = null;
    if (t.kind === 'person') hint = { text: `和${PEOPLE[t.person.id].name}说话`, ok: true };
    else if (t.kind === 'thing') hint = { text: ACT_HINT[t.thing.act], ok: true };
    else if (t.kind === 'water') {
      const reason = game.ask('farm.why', 'refill', t.x, t.y, this.at());
      hint = { text: reason || '打水', ok: !reason };
    } else if (farmable(this.map, t.x, t.y)) {
      const reason = game.ask('farm.why', tool, t.x, t.y, this.at());
      hint = { text: reason || toolVerb(tool), ok: !reason };
    }
    const old = shell.get().hint;
    if (old?.text !== hint?.text || old?.ok !== hint?.ok) shell.set({ hint });
    this.cursor.setVisible(!!hint).setPosition(t.x * TILE, t.y * TILE);
    if (hint) this.cursor.setTexture(hint.ok ? 'cursor:ok' : 'cursor:no');
  }

  /** 对面前的东西做该做的事。 */
  act() {
    const { game, shell, platform } = this.deps;
    if (this.busy || shell.paused()) return;
    platform.audio.unlock();
    const t = this.target();
    if (t.kind === 'person') return this.talk(t.person);
    if (t.kind === 'thing') return this.touch(t.thing);
    if (t.kind === 'water') return this.swing('can', t, () => this.send('farm.refill', t));
    if (!farmable(this.map, t.x, t.y)) return undefined;
    const tool = shell.get().tool;
    const reason = game.ask('farm.why', tool, t.x, t.y, this.at());
    if (reason) return this.refuse(reason);
    return this.swing(tool, t, () => this.send(COMMAND_OF[tool], t));
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
      hit();
    });
    this.time.delayedCall(390, () => {
      p.setPose(null);
      icon.setVisible(false);
      this.busy = false;
      this.hintKey = '';
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
      modal: { kind: 'talk', who: person.id, line: said.line, doing: person.doing },
    });
  }

  touch(thing) {
    const { shell, platform } = this.deps;
    this.player.face(dirTo(this.player.tile, thing));
    if (thing.act === 'water')
      return this.swing('can', thing, () => this.send('farm.refill', thing));
    platform.audio.play('talk');
    if (thing.act === 'door.hero') return shell.set({ modal: { kind: 'sleep' } });
    if (thing.act === 'basket') return shell.set({ modal: { kind: 'basket' } });
    if (thing.act === 'sign') return shell.set({ modal: { kind: 'sign', text: thing.text } });
    return shell.set({
      modal: { kind: 'sign', text: '门虚掩着，屋里飘出饭菜的香味。桂嫂大概在灶上忙。' },
    });
  }

  /** 点了世界里的一个位置：走过去；那儿有事可做就做。 */
  tap(wx, wy) {
    const { game, shell, platform } = this.deps;
    if (this.busy || shell.paused()) return;
    platform.audio.unlock();
    const walk = (x, y) => walkable(this.map, x, y);
    const from = this.player.tile;
    const person = this.villagers.find(
      v => v.sprite.visible && Math.abs(v.px - wx) < 9 && wy < v.py + 3 && wy > v.py - 28,
    );
    const tile = person ? person.tile : tileOf(wx, wy);
    const thing = !person && actAt(this.map, tile.x, tile.y);
    const farm = !person && !thing && farmable(this.map, tile.x, tile.y);
    const water = !person && !thing && waterSource(this.map, tile.x, tile.y);
    if (!person && !thing && !farm && !water) {
      const path = findPath(walk, from, tile);
      if (path) this.player.walk(path);
      return;
    }
    const stand = standBeside(walk, from, tile);
    if (!stand) return;
    this.player.walk(stand.path, () => {
      this.player.face(stand.dir);
      if (farm) {
        // 手指点地：当前工具不合适就自动换成合适的那一件
        const at = this.at();
        const why = (tool, x, y) => game.ask('farm.why', tool, x, y, at);
        if (why(shell.get().tool, tile.x, tile.y)) {
          const better = bestTool(why, tile.x, tile.y);
          if (better) shell.set({ tool: better });
        }
      } else if (water && shell.get().tool !== 'can') shell.set({ tool: 'can' });
      this.hintKey = '';
      this.act();
    });
  }

  /** 规则里发生了事：给反馈、重画变了的东西。 */
  onFacts(facts) {
    const { platform } = this.deps;
    let plots = false;
    for (const f of facts) {
      const d = f.data;
      if (f.type === 'plot.tilled')
        (this.effects.tilled(d.x, d.y), platform.audio.play('hoe'), (plots = true));
      else if (f.type === 'plot.sown')
        (this.effects.sown(d.x, d.y), platform.audio.play('seed'), (plots = true));
      else if (f.type === 'plot.watered')
        (this.effects.watered(d.x, d.y), platform.audio.play('water'), (plots = true));
      else if (f.type === 'crop.harvested')
        (this.effects.harvested(d.x, d.y), platform.audio.play('harvest'), (plots = true));
      else if (f.type === 'can.refilled')
        (this.effects.refilled(d.x * TILE + 8, d.y * TILE + 8), platform.audio.play('refill'));
      else if (f.type === 'time.passed') this.retime(false);
      else if (f.type === 'day.started') {
        const bed = spot(this.map, 'hero.bed');
        this.player.stop();
        this.player.px = bed.x * TILE + 8;
        this.player.py = bed.y * TILE + 13;
        this.player.face('down');
        this.player.sync();
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
    const { minute } = this.deps.game.ask('clock');
    this.deps.shell.set({ tint: skyTint(minute) });
    for (const v of this.villagers) v.retime(minute, jump);
    this.effects.setCooking((minute >= 660 && minute < 780) || (minute >= 1020 && minute < 1140));
  }

  /** 按规则里的田地状态重画每一格：土的干湿和拼接、作物的阶段。 */
  refreshPlots() {
    const list = this.deps.game.ask('farm.plots', this.map.id);
    const has = new Set(list.map(p => p.x + ',' + p.y));
    for (const [key, sprites] of this.plots) {
      if (has.has(key)) continue;
      sprites.soil.destroy();
      sprites.crop.destroy();
      this.plots.delete(key);
    }
    for (const p of list) {
      const key = p.x + ',' + p.y;
      const mask =
        (has.has(`${p.x},${p.y - 1}`) ? 1 : 0) |
        (has.has(`${p.x + 1},${p.y}`) ? 2 : 0) |
        (has.has(`${p.x},${p.y + 1}`) ? 4 : 0) |
        (has.has(`${p.x - 1},${p.y}`) ? 8 : 0);
      let sprites = this.plots.get(key);
      if (!sprites) {
        sprites = {
          soil: this.add
            .image(p.x * TILE, p.y * TILE, 'soil:dry.0')
            .setOrigin(0)
            .setDepth(-900),
          crop: this.add.image(p.x * TILE + 8, (p.y + 1) * TILE - 2, 'crop:0').setOrigin(0.5, 1),
          stage: -2,
        };
        sprites.crop.setDepth((p.y + 1) * TILE - 3);
        this.plots.set(key, sprites);
      }
      sprites.soil.setTexture(`soil:${p.wet ? 'wet' : 'dry'}.${mask}`);
      sprites.crop.setVisible(p.stage >= 0);
      if (p.stage >= 0) sprites.crop.setTexture('crop:' + p.stage);
      if (p.stage > sprites.stage && sprites.stage !== -2) this.effects.pop(sprites.crop);
      sprites.stage = p.stage;
    }
  }
}
