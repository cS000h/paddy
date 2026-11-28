// A-39a 回稿：小屋原样家具和三件新家具（碗架、门边挂钩、床头旧木箱）、矮书案的字符画。照稿原样抄，改的话改稿再抄。
// 字符同 art/room-kit.js 的 ROOM_LEGEND；'_' 是接地影（半透明墨）。分两个文件放。挂轴、窗台的原样在 A-39b 那份里。
import { ROOM_SKETCHES_A } from './room-sketches-a.js';
import { ROOM_SKETCHES_B } from './room-sketches-b.js';

export const ROOM_SKETCHES = Object.freeze({ ...ROOM_SKETCHES_A, ...ROOM_SKETCHES_B });
