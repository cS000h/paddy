// G-34 回稿的小屋家具字符画（6 处，每处 4 张；原样那张只有窗台用，别的原样照旧画法）。照稿原样抄，改的话改稿再抄。
// 调色板字符同 art/items-kit.js 的 INK 加 yard-fix 的几个（art/furniture.js 的 LEGEND）。
import { SKETCHES_A } from './furniture-sketches-a.js';
import { SKETCHES_B } from './furniture-sketches-b.js';
import { SKETCHES_C } from './furniture-sketches-c.js';

// 键是「处_样」：bed_quilt、corner_lamp……分三个文件放（床和饭桌、挂轴和窗台、地毯和屋角）
export const FURNITURE_SKETCHES = Object.freeze({ ...SKETCHES_A, ...SKETCHES_B, ...SKETCHES_C });
