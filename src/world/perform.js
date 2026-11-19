// 在世界里把一件活演出来：人走到东西旁边、侧过身，换成那个动作的帧一帧帧地放（art/acts.js），
// 东西本身也跟着动（灶膛起火冒烟、锅上冒热气、木屑飞、水花），放完换回走路的样子。
// 规则早在开演之前就结算好了，这里只是把已经发生的事演给玩家看：演的时候人不能走动，
// 点一下或按互动键就快进到结尾；出了岔子最多十几秒也一定收场，人不会被卡在那儿。
import { actionTexture, playBody, supportedAct } from './action-texture.js';
import { walkable } from '../content/maps/index.js';
import { TILE, sideSpot, bankSpot } from './logic.js';
import { SCRIPTS } from './scripts.js';

const SPARE = 3000; // 算好的时长再多等一会儿，还没演完就强行收场

export function createPerformer(scene) {
  let show = null;

  function fire(at) {
    const x = at.x * TILE + 8;
    const y = (at.y + 1) * TILE;
    const flame = scene.add
      .image(x, y - 5, 'fx:flame')
      .setOrigin(0.5, 1)
      .setDepth(y + 1);
    scene.tweens.add({
      targets: flame,
      scaleY: { from: 0.75, to: 1.2 },
      scaleX: { from: 1.1, to: 0.85 },
      duration: 140,
      yoyo: true,
      repeat: -1,
    });
    const embers = scene.add
      .particles(x, y - 9, 'fx:ember', {
        speedY: { min: -40, max: -18 },
        speedX: { min: -8, max: 8 },
        lifespan: 520,
        frequency: 140,
        alpha: { start: 1, end: 0 },
      })
      .setDepth(y + 2);
    const smoke = scene.add
      .particles(x + 2, y - 30, 'fx:smoke', {
        speedY: { min: -22, max: -12 },
        speedX: { min: 2, max: 9 },
        scale: { start: 0.5, end: 1.5 },
        alpha: { start: 0.55, end: 0 },
        lifespan: 2400,
        frequency: 260,
      })
      .setDepth((at.y + 1) * TILE + 1);
    return [flame, embers, smoke];
  }

  function steam(at) {
    const x = at.x * TILE + 8;
    const y = (at.y + 1) * TILE - 22;
    return [
      scene.add
        .particles(x, y, 'fx:steam', {
          x: { min: -4, max: 4 },
          speedY: { min: -26, max: -14 },
          scale: { start: 0.6, end: 1.4 },
          alpha: { start: 0.8, end: 0 },
          lifespan: 1300,
          frequency: 160,
        })
        .setDepth((at.y + 1) * TILE + 1),
    ];
  }

  // 每一步开始时，东西那边跟着做的事。period 是这个动作放一遍多久，times 是放几遍
  function cue(delay, fn) {
    const s = show;
    s.cues.push(
      scene.time.delayedCall(delay, () =>
        scene.guard(() => {
          if (show === s) fn();
        }),
      ),
    );
  }
  const AROUND = {
    fire: at => show.lasting.push(...fire(at)),
    steam: at => show.lasting.push(...steam(at)),
    chips: (at, period, times) => {
      for (let k = 0; k < times; k++) cue(k * period + 680, () => scene.effects.chips(at.x, at.y));
    },
    drawWater: (at, period) => cue((period * 5) / 12, () => scene.effects.splashAt(at.x, at.y)),
    splash: at => scene.effects.splashAt(at.x, at.y),
  };

  /** 一步要放多久（毫秒）。 */
  const lasting = (next, info) => next.ms ?? ((next.times || 1) * info.frames * 1000) / info.fps;

  function step() {
    const s = show;
    if (!s) return;
    const next = s.steps[s.i++];
    if (!next) return finish();
    const info = actionTexture(scene, next.act, s.look);
    const times = next.times || 1;
    playBody(s.sprite, info, scene.player, s.face, times);
    const period = (info.frames * 1000) / info.fps;
    if (next.around && AROUND[next.around])
      scene.guard(() => AROUND[next.around](s.target, period, times));
    if (next.sound) scene.deps.platform.audio.play(next.sound);
    s.timer?.remove();
    s.timer = scene.time.delayedCall(lasting(next, info), step);
  }

  function begin() {
    const s = show;
    const p = scene.player;
    p.face(s.face);
    p.sprite.setAlpha(0);
    s.sprite = scene.add.sprite(Math.round(p.px), Math.round(p.py), '__DEFAULT').setDepth(p.py);
    step();
  }

  function finish() {
    const s = show;
    if (!s) return;
    show = null;
    s.timer?.remove();
    s.watchdog?.remove();
    for (const timer of s.cues) timer.remove();
    for (const thing of s.lasting) {
      if (thing.stop) thing.stop();
      scene.tweens.killTweensOf(thing);
      scene.time.delayedCall(thing.stop ? 1800 : 0, () => thing.destroy());
    }
    if (s.walking) scene.player.stop();
    s.sprite?.destroy();
    const p = scene.player;
    p.sprite.setAlpha(1);
    p.setPose(null);
    scene.busy = false;
    scene.hintKey = '';
    if (s.then) scene.guard(s.then);
  }

  return {
    get active() {
      return !!show;
    },

    /**
     * 演一场。script 是 scripts.js 里的名字，或者直接给一串步子 [{act, times?, ms?, around?, sound?}, …]；
     * target：要对着的那一格（不给就原地朝当前方向）；water：站好以后朝着水那一边（钓鱼）；
     * then：演完以后做什么。
     */
    play(script, { target = null, water = false, then = null } = {}) {
      let steps = typeof script === 'string' ? SCRIPTS[script] : script;
      if (!steps?.length) return then?.();
      const continuous = water && show?.water && !!show.sprite;
      if (show) finish();
      const p = scene.player;
      const walk = (x, y) => walkable(scene.map, x, y);
      const bank = target && water && bankSpot(scene.map, p.tile, target);
      const spot =
        bank ||
        (target
          ? sideSpot(walk, p.tile, target)
          : { ...p.tile, face: p.dir === 'left' ? 'left' : 'right', path: [] });
      steps = steps.map(s => ({ ...s, act: supportedAct(scene.map, spot, s.act) }));
      steps = [...(continuous ? [] : [{ act: 'readyHands' }]), ...steps, { act: 'lowerHands' }];
      scene.busy = true;
      show = {
        steps,
        i: 0,
        water,
        target: bank?.water || target || p.tile,
        then,
        look: p.look,
        lasting: [],
        cues: [],
      };
      show.face = spot.face;
      const total = steps.reduce(
        (sum, next) => sum + lasting(next, actionTexture(scene, next.act, p.look)),
        0,
      );
      show.watchdog = scene.time.delayedCall(total + spot.path.length * 300 + SPARE, () =>
        scene.guard(finish),
      );
      if (!spot.path.length) return begin();
      show.walking = true;
      p.walk(spot.path, () => {
        if (!show) return;
        show.walking = false;
        scene.guard(begin);
      });
    },

    /** 每帧调用：还在往那儿走的时候带着人走。 */
    update(dt) {
      if (show?.walking && !scene.player.follow(dt)) scene.player.animate(false);
    },

    /** 点一下：快进到结尾（规则早已结算，跳过的只是动画）。 */
    skip() {
      if (show && !show.walking) finish();
    },

    /** 换地图、场景关掉时：马上收场。 */
    stop() {
      if (show) finish();
    },
  };
}
