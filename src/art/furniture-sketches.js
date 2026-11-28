// A-39b 回稿的小屋家具字符画（6 处，每处 4 张）。原样那张只有窗台、挂轴用，别的原样用 A-39a（room-sketches.js）。
// 照稿原样抄，改的话改稿再抄。字符同 art/room-kit.js 的 ROOM_LEGEND，'_' 是接地影。
import { SKETCHES_A } from './furniture-sketches-a.js';
import { SKETCHES_B } from './furniture-sketches-b.js';
import { SKETCHES_C } from './furniture-sketches-c.js';

// 键是「处_样」：bed_quilt、corner_lamp……分三个文件放（床和饭桌、挂轴和窗台、地毯和屋角）
export const FURNITURE_SKETCHES = Object.freeze({ ...SKETCHES_A, ...SKETCHES_B, ...SKETCHES_C });
