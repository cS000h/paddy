// 小屋里的家什（A-39a 原样稿，字符画在 room-sketches.js）：橱柜、书架，新添的碗架、门边挂钩、床头旧木箱、矮书案，
// 还有屋里那副坛子和小凳（屋外的坛子、小凳照旧是 props.js 的画法）。床、窗、衣镜这些在 indoors.js。
import { roomSprite } from './room-kit.js';
import { ROOM_SKETCHES as R } from './room-sketches.js';

/** 平常的样子。 */
export const roomMakers = {
  // 橱柜：靠在右窗下，受光的顶板，两扇对开的门、铜拉手
  cupboard: () => roomSprite(R.cupboard),
  // 书架：上层立书、下层平放线装册，右边码着一摞
  bookshelf: () => roomSprite(R.bookshelf),
  // 竹碗架：两层晾碗，平常是空着的样子；晾着几只碗盘换下面的样子
  dishRack: () => roomSprite(R.dishRack_empty),
  // 门边墙上一排木钉。屋子南边画面上是敞开的、没有墙，光秃秃一排木钉会悬在半空，平常就画挂着蓑衣；
  // 空着、挂蓑衣加斗笠两副等挂钩的用处接上以后照规则换
  hook: () => roomSprite(R.hook_coat, { wall: true }),
  // 床尾的旧木箱，合着
  chest: () => roomSprite(R.chest_closed),
  // 右前角的矮书案，桌上摊开一册书；对着左边那一格
  desk: () => roomSprite(R.desk, { ax: 8 }),
};

/** 换样子：{物件: {样子: 画法}}，交给 index.js 的 OBJECT_LOOKS。 */
export const roomLooks = {
  dishRack: {
    empty: () => roomSprite(R.dishRack_empty),
    some: () => roomSprite(R.dishRack_some),
    full: () => roomSprite(R.dishRack_full),
  },
  hook: {
    empty: () => roomSprite(R.hook_empty, { wall: true }),
    coat: () => roomSprite(R.hook_coat, { wall: true }),
    full: () => roomSprite(R.hook_full, { wall: true }),
  },
  chest: { open: () => roomSprite(R.chest_open) },
  jars: { room: () => roomSprite(R.jars) },
  stool: { room: () => roomSprite(R.stool) },
};
