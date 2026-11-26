// 「有动静」的几样小动效：落叶、露珠一闪、石缝水汽、落瓣、夜里的萤火。出自 Gemini G-12，原样搬过来，不描边。
// 每样是几帧；几帧怎么轮、停多久、多久来一回、画在东西的哪儿，由世界一侧（world/stir.js）照稿子演。
import { fromText } from './pixel.js';
import { INK } from './items-kit.js';
import { P } from './palette.js';

const MIST = { '~': P.w0, '*': P.w1 };

// prettier-ignore
const FX = {
  // 落叶：两帧左右换着飘
  leaf: [
    ['..L.', '.lG.', '.g..'],
    ['....', 'LlG.', '..g.'],
  ],
  // 露珠一闪：小点 → 十字微亮 → 小点
  glint: [
    ['...', '.w.', '...'],
    ['.w.', 'wzw', '.w.'],
  ],
  // 水汽：两帧往上飘散
  mist: [
    ['..~..', '.~*..', '..~..'],
    ['.~...', '..~*.', '.....'],
  ],
  // 落瓣：一帧，程序让它轻摆着往下落
  petal: [['.q.', 'qp.']],
  // 夜萤：两帧一明一暗
  firefly: [
    ['...', '.z.', '...'],
    ['.L.', 'Lzw', '.L.'],
  ],
};

// 傍晚的露珠反着落日：高光从白换成暖黄（G-12 的意见）
const DUSK = { w: P.y0 };

/** 动效的名字：leaf、glint、glintDusk、mist、petal、firefly。 */
export const STIR_FX = [...Object.keys(FX), 'glintDusk'];

/** 某样动效的几帧小图。 */
export function stirFrames(name) {
  if (name === 'glintDusk') return FX.glint.map(rows => fromText(rows, { ...INK, ...DUSK }));
  if (!FX[name]) throw new Error('没有这样的动静：' + name);
  return FX[name].map(rows => fromText(rows, { ...INK, ...MIST }));
}
