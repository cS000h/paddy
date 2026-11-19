// 在世界里把一件活演出来：人走到东西旁边、侧过身，换成那个动作的帧一帧帧地放（art/acts.js），
// 东西本身也跟着动（灶膛起火冒烟、锅上冒热气、木屑飞、水花），放完换回走路的样子。
// 规则早在开演之前就结算好了，这里只是把已经发生的事演给玩家看：演的时候人不能走动，
// 点一下或按互动键就快进到结尾；出了岔子最多十几秒也一定收场，人不会被卡在那儿。
import { actionTexture, placeAction } from './action-texture.js';
import { walkable, groundAt } from '../content/maps/index.js';
import { TILE, sideSpot } from './logic.js';
import { SCRIPTS } from './scripts.js';

const SPARE = 3000; // 算好的时长再多等一会儿，还没演完就强行收场

/** 站在 spot 时，左右哪一边四格之内有水（钓鱼甩竿朝那边）；两边都没有返回 null。 */
function towardWater(map, spot) {
  for (let d = 1; d <= 4; d++)
    for (const [dx, face] of [
      [-d, 'left'],
      [d, 'right'],
    ])
      if (groundAt(map, spot.x + dx, spot.y)?.id === 'water') return face;
  return null;
}

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
      .setDepth(9100);
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
        .setDepth(9100),
    ];
  }

  // 每一步开始时，东西那边跟着做的事。period 是这个动作放一遍多久，times 是放几遍
  const AROUND = {
    fire: at => show.lasting.push(...fire(at)),
    steam: at => show.lasting.push(...steam(at)),
    chips: (at, period, times) => {
      for (let k = 0; k < times; k++)
        scene.time.delayedCall(k * period, () => scene.effects.chips(at.x, at.y));
    },
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
    placeAction(s.sprite, info, s.face);
    const times = next.times || 1;
    s.sprite.play(times > 1 ? { key: info.key, repeat: times - 1 } : info.key);
    const period = (info.frames * 1000) / info.fps;
    if (!s.fast && next.around && AROUND[next.around])
      scene.guard(() => AROUND[next.around](s.target, period, times));
    if (!s.fast && next.sound) scene.deps.platform.audio.play(next.sound);
    s.timer?.remove();
    s.timer = scene.time.delayedCall(s.fast ? 0 : lasting(next, info), step);
  }

  function begin() {
    const s = show;
    const p = scene.player;
    p.face(s.face);
    p.setVisible(false);
    s.px = Math.round(p.px);
    s.sprite = scene.add.sprite(s.px, Math.round(p.py), '__DEFAULT').setDepth(p.py);
    step();
  }

  function finish() {
    const s = show;
    if (!s) return;
    show = null;
    s.timer?.remove();
    s.watchdog?.remove();
    for (const thing of s.lasting) {
      if (thing.stop) thing.stop();
      scene.tweens.killTweensOf(thing);
      scene.time.delayedCall(thing.stop ? 1800 : 0, () => thing.destroy());
    }
    s.sprite?.destroy();
    const p = scene.player;
    p.setVisible(true);
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
      const steps = typeof script === 'string' ? SCRIPTS[script] : script;
      if (!steps?.length) return then?.();
      if (show) finish();
      const p = scene.player;
      const walk = (x, y) => walkable(scene.map, x, y);
      const spot = target
        ? sideSpot(walk, p.tile, target)
        : { ...p.tile, face: p.dir === 'left' ? 'left' : 'right', path: [] };
      scene.busy = true;
      show = { steps, i: 0, target: target || p.tile, then, look: p.look, lasting: [] };
      show.face = water ? towardWater(scene.map, spot) || spot.face : spot.face;
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
      if (!show || show.walking) return;
      show.fast = true;
      show.timer?.remove();
      step();
    },

    /** 换地图、场景关掉时：马上收场。 */
    stop() {
      if (show) finish();
    },
  };
}
