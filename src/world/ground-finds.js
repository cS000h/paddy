// 地上冒出来的时令野货：照规则里的落点（查询 ground）把图标摆在地上，隔一阵闪一下；
// 人走到那一格上就捡起来（命令 ground.pick），捡到时闪光、响一声、冒那句话。临时的样子，等 A-06。
import { itemIcon, groundArt, hasGroundArt } from '../art/index.js';
import { gridToCanvas } from './textures.js';
import { DEPTH } from './depth.js';
import { TILE } from './logic.js';
import { stirFx } from './stir.js';

const GLINT_EVERY = 4500; // 四五秒在右上角闪一下，远远扫得见、不扎眼（G-12）

export function createGroundFinds(scene) {
  const sprites = new Map();
  let glintIn = GLINT_EVERY;
  let lastTile = '';

  const keyOf = (x, y) => `${x},${y}`;
  function texture(item) {
    const key = 'ground:' + item;
    if (!scene.textures.exists(key))
      scene.textures.addCanvas(
        key,
        gridToCanvas(hasGroundArt(item) ? groundArt(item) : itemIcon(item)),
      );
    return key;
  }

  /** 照规则里的最新落点摆一遍：多的收掉，少的补上。 */
  function sync() {
    const list = scene.map.indoor ? [] : scene.deps.game.ask('ground', scene.map.id);
    const keep = new Set(list.map(g => keyOf(g.x, g.y) + ':' + g.item));
    for (const [k, s] of sprites)
      if (!keep.has(k)) {
        s.destroy();
        sprites.delete(k);
      }
    for (const g of list) {
      const k = keyOf(g.x, g.y) + ':' + g.item;
      if (sprites.has(k)) continue;
      // 单画的落地图正好一格大、自带影子，原样铺在那一格上；没单画的用行囊图标缩小立着
      const own = hasGroundArt(g.item);
      const sprite = scene.add
        .image(g.x * TILE + 8, g.y * TILE + (own ? 16 : 12), texture(g.item))
        .setOrigin(0.5, 1)
        .setScale(own ? 1 : 0.75)
        .setDepth(DEPTH.weeds + 1);
      sprites.set(k, sprite);
    }
  }

  /** 每一帧：踩到有东西的那一格就捡；隔一阵让地上的东西闪一下，远远看得见。 */
  function frame(delta) {
    if (!sprites.size) return;
    glintIn -= delta;
    if (glintIn <= 0) {
      glintIn = GLINT_EVERY;
      for (const s of sprites.values()) stirFx(scene, 'glint', s.x + 5, s.y - 11, s.y);
    }
    const t = scene.player.tile;
    const here = keyOf(t.x, t.y);
    if (here === lastTile || scene.deps.shell.paused()) return;
    lastTile = here;
    if (![...sprites.keys()].some(k => k.startsWith(here + ':'))) return;
    const out = scene.deps.game.dispatch('ground.pick', { at: scene.at(), x: t.x, y: t.y });
    if (!out.ok) scene.refuse(out.reason);
  }

  /** 捡到了：那儿闪光，极品多一圈金环、手机震两下。 */
  function onFacts(facts) {
    const { platform, shell } = scene.deps;
    let changed = false;
    for (const f of facts) {
      if (f.type === 'ground.picked') {
        const d = f.data;
        scene.effects.found(d.x * TILE + 8, d.y * TILE + 6, d.fine);
        platform.audio.play(d.fine ? 'fine' : 'harvest');
        if (d.fine) platform.haptic([14, 60, 24]);
        shell.toast(d.line, d.fine);
        changed = true;
      } else if (f.type === 'day.started' || f.type === 'person.travelled') changed = true;
    }
    if (changed) sync();
  }

  function destroy() {
    for (const s of sprites.values()) s.destroy();
    sprites.clear();
  }

  return { sync, frame, onFacts, destroy };
}
