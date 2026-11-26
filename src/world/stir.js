// 「有动静」：每天清早挑出来的几处翻找点（今天还没翻），隔一阵自己动一下，走过时余光扫得见，
// 但不像「！」那样跳。样子照 Gemini G-12：树落叶、花丛露珠一闪、苇梢一抖冒水汽……夜里换成萤火。
// 地上冒出来的野货也用这里的露珠一闪（ground-finds.js）。
import { groundAt } from '../content/maps/index.js';
import { decorAt, wiggle } from './interactions.js';

// 几样动效怎么演：几帧轮着（seq）、每帧多久（ms）、整段多久（life）、往哪儿飘（dx、dy，像素）、
// 隔多久来一回（every，毫秒的范围）。数照稿子。
const FX = {
  leaf: { seq: [0, 1], ms: 320, life: 1200, dy: 12, drift: 4, every: [3500, 5000] },
  glint: { seq: [0, 1, 0], ms: 180, life: 540, every: [3000, 4500] },
  mist: { seq: [0, 1], ms: 360, life: 1100, dy: -5, every: [4000, 5500] },
  petal: { seq: [0], ms: 300, life: 1200, dy: 10, sway: 1, every: [4000, 6000] },
  firefly: { seq: [0, 1, 0, 0, 1, 0], ms: 280, life: 1680, dy: -2, drift: 3, every: [3000, 4500] },
};

// 十三类翻找点各自的动静：晃不晃（sway），冒哪样、在哪儿冒（at：top 上半截、mid 中上部、
// root 根部、around 四周）。also 是偶尔顺带的第二样。
const KINDS = {
  peach: { sway: true, fx: 'leaf', at: 'top', spring: 'petal' },
  camphor: { fx: 'leaf', at: 'top' },
  broad: { sway: true, fx: 'leaf', at: 'top' },
  pine: { sway: true, fx: 'glint', at: 'mid' },
  willow: { sway: true, fx: 'leaf', at: 'outer' },
  bamboo: { sway: true, fx: 'leaf', at: 'top' },
  flowers: { fx: 'glint', at: 'mid', also: ['petal', 'top'] },
  reeds: { sway: true, fx: 'mist', at: 'root' },
  bush: { sway: true, fx: 'glint', at: 'mid' },
  fern: { fx: 'glint', at: 'mid' },
  rock: { fx: 'glint', at: 'mid' },
  lotus: { fx: 'glint', at: 'mid', also: ['mist', 'around'] },
  yard: { fx: 'glint', at: 'mid' },
};
// 院里的瓜棚是落叶，草垛、稻草人是一闪
const YARD_LEAF = new Set(['trellis']);

const DUSK = 17 * 60; // 酉时起露珠反着暖黄的光
const NIGHT = 19 * 60; // 戌时起看不清落叶，换萤火

const rand = (lo, hi) => lo + Math.random() * (hi - lo);

/** 眼下是白天、傍晚还是夜里。 */
function dayPart(scene) {
  const { minute } = scene.deps.game.ask('clock');
  return minute >= NIGHT ? 'night' : minute >= DUSK ? 'dusk' : 'day';
}

/** 在 (x, y) 演一段动效。name 是 FX 里的一样；傍晚的露珠自动换暖黄。 */
export function stirFx(scene, name, x, y, foot = y) {
  const fx = FX[name];
  const look = name === 'glint' && dayPart(scene) === 'dusk' ? 'glintDusk' : name;
  const sprite = scene.add.image(x, y, `stir:${look}:0`).setDepth(foot + 0.5);
  const dx = fx.drift ? rand(-fx.drift, fx.drift) : 0;
  scene.tweens.addCounter({
    from: 0,
    to: fx.life,
    duration: fx.life,
    onUpdate: tween => {
      const t = tween.getValue();
      const k = t / fx.life;
      const frame = fx.seq[Math.min(fx.seq.length - 1, Math.floor(t / fx.ms))];
      sprite.setTexture(`stir:${look}:${frame}`);
      const sway = fx.sway ? (Math.floor(t / 300) % 2 ? fx.sway : -fx.sway) : 0;
      sprite.setPosition(x + dx * k + sway, y + (fx.dy || 0) * k);
      sprite.setAlpha(k > 0.6 ? (1 - k) / 0.4 : 1);
    },
    onComplete: () => sprite.destroy(),
  });
}

/** 那件东西身上的哪一点：上半截、中上部、根部、四周、上半截偏外。 */
function placeOn(sprite, at) {
  const w = sprite.displayWidth;
  const h = sprite.displayHeight;
  const side = Math.random() < 0.5 ? -1 : 1;
  const foot = sprite.y;
  if (at === 'top') return [sprite.x + rand(-w * 0.3, w * 0.3), foot - h * rand(0.6, 0.8)];
  if (at === 'outer') return [sprite.x + side * w * rand(0.3, 0.45), foot - h * rand(0.5, 0.7)];
  if (at === 'root') return [sprite.x + rand(-w * 0.3, w * 0.3), foot - 3];
  if (at === 'around') return [sprite.x + side * w * rand(0.45, 0.6), foot - rand(1, 4)];
  return [sprite.x + rand(-w * 0.25, w * 0.25), foot - h * rand(0.45, 0.65)];
}

/** 石头挨着水，或者正下着雨，才冒水汽；平时一闪（审稿的定案）。 */
function rockMist(scene, x, y) {
  if (scene.weather?.tags?.includes('wet')) return true;
  return [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ].some(([dx, dy]) => groundAt(scene.map, x + dx, y + dy).water);
}

/** 一处有动静的地方这一回演什么：[[动效, 在哪儿], …]，和要不要晃一下。 */
function cueFor(scene, spot, decor, part) {
  const k = KINDS[spot.kind] || KINDS.bush;
  if (part === 'night' && spot.kind !== 'rock') return { sway: false, fx: [['firefly', 'around']] };
  let fx = k.fx;
  if (spot.kind === 'peach' && scene.deps.game.ask('clock').season === 0) fx = k.spring;
  if (spot.kind === 'yard' && YARD_LEAF.has(decor.kind)) fx = 'leaf';
  if (spot.kind === 'rock' && rockMist(scene, spot.x, spot.y)) return { fx: [['mist', 'root']] };
  const list = [[fx, fx === 'leaf' && spot.kind === 'yard' ? 'top' : k.at]];
  if (k.also && Math.random() < 0.4) list.push(k.also);
  return { sway: k.sway, fx: list };
}

/** 世界一侧的「有动静」：每处各数各的时候，到了就演一回。每一帧调 frame(delta)。 */
export function createStir(scene) {
  const next = new Map(); // 翻找点 → 还有多久演下一回
  let lookIn = 0;
  let spots = [];

  function frame(delta) {
    if (scene.map.indoor) return;
    // 名单一秒问一回就够：翻过的、新一天挑出来的都跟得上
    lookIn -= delta;
    if (lookIn <= 0) {
      lookIn = 1000;
      spots = scene.deps.game.ask('search.spots', scene.map.id).filter(s => s.cue && !s.done);
    }
    const part = spots.length ? dayPart(scene) : 'day';
    for (const s of spots) {
      const key = `${scene.map.id}:${s.x},${s.y}`;
      const decor = decorAt(scene, s.x, s.y);
      if (!decor) continue;
      if (!next.has(key)) next.set(key, rand(0, 2000)); // 刚进图时错开，别几处一齐动
      const left = next.get(key) - delta;
      if (left > 0) {
        next.set(key, left);
        continue;
      }
      const cue = cueFor(scene, s, decor, part);
      next.set(key, rand(...FX[cue.fx[0][0]].every));
      if (cue.sway) wiggle(scene, decor, 1);
      for (const [name, at] of cue.fx) {
        const [x, y] = placeOn(decor.sprite, at);
        stirFx(scene, name, x, y, decor.sprite.y);
      }
    }
  }

  return { frame };
}
