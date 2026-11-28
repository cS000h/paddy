// 拿在手里的东西画在人身上：提着鱼、端着碗、拎着篮子，下雨下雪在外头撑着伞（晴天收着拎在手上）。
// 底栏选了哪一格（shell 的 held），这里就照那一格画一个小图，跟着人走、跟着朝向换手。
// 只是画面：拿着什么、能做什么，都还是规则那边说了算（world/interactions.js 的 heldHint、heldGift）。
import * as art from '../art/index.js';
import { P } from '../art/palette.js';
import { ITEMS } from '../content/items.js';
import { gridToCanvas } from './textures.js';

// 手的位置：相对人脚下那一点（人物原点）。朝上时东西在身前，被身子挡住，画在人后面。
const HAND = {
  down: { x: 5, y: -9, behind: false },
  up: { x: -5, y: -9, behind: true },
  left: { x: -6, y: -9, behind: false },
  right: { x: 6, y: -9, behind: false },
};

// 一只小碗：碗口一圈白，里头一点饭菜色，墨线描边。端着的饭菜都画成它，太细的器型在手上看不清。
export function bowl() {
  const g = new art.Grid(12, 9);
  g.ellipse(6, 3, 5, 2, P.l0).ellipse(6, 3, 4, 1, P.y1);
  g.rect(2, 4, 9, 2, P.l0).ellipse(6, 6, 4, 2, P.l0).hline(4, 8, 8, P.l1);
  return g.outline(P.ink1);
}

function iconOf(id) {
  const item = ITEMS[id];
  if (item?.prize) return art.prizeIcon(item.prize);
  if (item?.fine) return art.fineItemIcon(item.fine);
  return art.itemIcon(id);
}

/** 这一格画成什么：贴图名和怎么摆。没得画（找不到图）的返回 null。 */
function lookOf(slot) {
  if (slot.slot === 'dish') return { key: 'held:bowl', make: bowl, scale: 0.75 };
  // 鱼篓提出来的是最大的那条鱼，竹篮就是篮子本身
  const id =
    slot.slot === 'creel'
      ? [...slot.members].sort((a, b) => (b.sell || 0) - (a.sell || 0))[0]?.id
      : slot.slot === 'basket'
        ? 'basket'
        : slot.id;
  if (!id || !art.ITEM_ICONS.includes(ITEMS[id]?.fine || id)) return null;
  if (id === 'umbrella')
    return { key: 'held:umbrella', make: () => iconOf(id), scale: 1, over: true };
  return { key: 'held:' + id, make: () => iconOf(id), scale: 0.5 };
}

export class HeldItem {
  constructor(scene) {
    this.scene = scene;
    this.key = null;
    this.look = null;
    this.sprite = scene.add.image(0, 0, '__DEFAULT').setOrigin(0.5, 1).setVisible(false);
  }

  /** 每一帧调用：照底栏选中的那一格换图，摆到人手上。 */
  frame() {
    const { game, shell } = this.scene.deps;
    const player = this.scene.player;
    // 手上端着热菜时，双手捧着那一碗，底栏选了什么都先不画
    const dish = game.ask('table').hands.length > 0;
    const held = dish ? 'hands:dish' : shell.get().held;
    if (held !== this.key) {
      this.key = held;
      const slot = dish
        ? { slot: 'dish' }
        : held && game.ask('pack', this.scene.at()).slots.find(s => s.key === held);
      this.look = slot ? lookOf(slot) : null;
      if (this.look) {
        const { key, make, scale } = this.look;
        if (!this.scene.textures.exists(key))
          this.scene.textures.addCanvas(key, gridToCanvas(make()));
        this.sprite.setTexture(key).setScale(scale);
      }
    }
    const busy = this.scene.performer.active || player.pose || !player.sprite.visible;
    if (!this.look || busy) return this.sprite.setVisible(false);
    const s = player.sprite;
    // 走路时手跟着一上一下
    const bob = player.moving ? Math.round(Math.sin(this.scene.time.now / 90)) : 0;
    const wet = ['snow', 'drizzle', 'rain', 'storm'].includes(this.scene.weather?.code);
    const over = this.look.over && wet && !this.scene.map.indoor;
    this.sprite.setScale(this.look.over && !over ? 0.5 : this.look.scale);
    if (over) {
      this.sprite.setPosition(s.x, s.y - 26).setDepth(player.py + 1);
    } else {
      const hand = HAND[player.dir] || HAND.down;
      this.sprite
        .setPosition(s.x + hand.x, s.y + hand.y + 4 + bob)
        .setDepth(player.py + (hand.behind ? -0.25 : 0.25));
    }
    this.sprite.setVisible(true);
  }

  /** 东西的数目变了（吃掉一个、送出去一条），下一帧重新挑图。 */
  refresh() {
    this.key = undefined;
  }

  destroy() {
    this.sprite.destroy();
  }
}
