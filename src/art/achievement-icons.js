// 成就七类的小图标（Gemini G-10 回稿附图「成就图标」，24×24，照 PNG 逐像素转成字符画）。
// 种地（土垄青苗）、做饭（铁锅热气）、钓鱼（浮漂游鱼）、采集翻找（竹篮山货）、人情（粗瓷茶碗）、
// 日子（暖黄窗灯）、图鉴（摊开线装小册）。拿到了一张，没拿到一张淡的影子。颜色都在调色板里。
import { Grid, fromText } from './pixel.js';
import { P } from './palette.js';

// prettier-ignore
const INK = {
  A: P.g1, B: P.g5, C: P.g3, D: P.g7, E: P.t2, F: P.t3,
  G: P.t4, H: P.s1, I: P.s2, J: P.s3, K: P.ink0, L: P.ink1,
  M: P.ink2, N: P.c1, O: P.y1, P: P.paper0, Q: P.w5, R: P.y2,
  S: P.w4, T: P.w1, U: P.w3, V: P.t1, W: P.w0, X: P.w2,
  Y: P.y0, Z: P.h3, a: P.paper1,
};

// prettier-ignore
const ROWS = {
  farm: {
    on: [
      '', '', '', '',
      '', '...........AA', '...........AA.....B', '.....B.....AA.CCCCB',
      '.....BCCCC.AA.CCCCB', '.....BCCCC.DD.CCCCB', '.....BCCCC.DDBBBB', '.......BBBBDD..B',
      '........B..DD', '...........DD', '...........DD', '...........DD',
      '......EEEEEDDEEEEE', '....FFEEEEEEEEEEEEFF', '....FFFFFFFFFFFFFFFF', '....FFFFFFFFFFFFFFFF',
      '....FGGGGGGGGGGGGGGF', '.....GGGGGGGGGGGGGG', '', '',
    ],
    off: [
      '', '', '', '',
      '', '...........HH', '...........HH.....I', '.....I.....HH.HHHHI',
      '.....IHHHH.HH.HHHHI', '.....IHHHH.JJ.HHHHI', '.....IHHHH.JJIIII', '.......IIIIJJ..I',
      '........I..JJ', '...........JJ', '...........JJ', '...........JJ',
      '......IIIIIJJIIIII', '....IIIIIIIIIIIIIIII', '....IIIIIIIIIIIIIIII', '....IIIIIIIIIIIIIIII',
      '....IJJJJJJJJJJJJJJI', '.....JJJJJJJJJJJJJJ', '', '',
    ],
  },
  cook: {
    on: [
      '', '', '', '........II',
      '........II....II', '........IHH...II', '........IHH..HHI', '.........HH..HHI',
      '.........HH..HH', '.............HH', '', '..FFKKKKKKKKKKKKKKKKFF',
      '..FFKKKKKKKKKKKKKKKKFF', '.....LMMMMMMMMMMMML', '.....LMMMMMMMMMMMML', '.....LLLLLLLLLLLLLL',
      '.....LLLLLLLLLLLLLL', '.......KKKKKKKKKK', '.......KKKKKKKKKK', '........NNOOOONN',
      '........NNOOOONN', '........NNNNNNNN', '', '',
    ],
    off: [
      '', '', '', '........HH',
      '........HH....HH', '........HHH...HH', '........HHH..HHH', '.........HH..HHH',
      '.........HH..HH', '.............HH', '', '..IIJJJJJJJJJJJJJJJJII',
      '..IIJJJJJJJJJJJJJJJJII', '.....JJJJJJJJJJJJJJ', '.....JJJJJJJJJJJJJJ', '.....JJJJJJJJJJJJJJ',
      '.....JJJJJJJJJJJJJJ', '.......JJJJJJJJJJ', '.......JJJJJJJJJJ', '........IIHHHHII',
      '........IIHHHHII', '........IIIIIIII', '', '',
    ],
  },
  fish: {
    on: [
      '', '', '', '',
      '.....NN', '.....NN', '.....NN', '.....PP',
      '.....PP', '.....PP............QQ', '.....RR...SSSSSSS..QQ', '.....RMM.QQTTTTTSQQQQ',
      '........MQQKTTTTSQQ', '.........QQTTTTTSQQ', '.........QQTTTTTSQQQQ', '..........SSSSSSS..QQ',
      '...................QQ', '', '...UUUUUUUUUUUUUUUUUU', '...UUSSSSSSSSSSSSSSUU',
      '...UUSSSSSSSSSSSSSSUU', '.....SSSSSSSSSSSSSS', '', '',
    ],
    off: [
      '', '', '', '',
      '.....II', '.....II', '.....II', '.....HH',
      '.....HH', '.....HH............II', '.....II...IIIIIII..II', '.....IJJ.IIHHHHHIIIII',
      '........JIIJHHHHIII', '.........IIHHHHHIII', '.........IIHHHHHIIIII', '..........IIIIIII..II',
      '...................II', '', '...HHHHHHHHHHHHHHHHHH', '...HHIIIIIIIIIIIIIIHH',
      '...HHIIIIIIIIIIIIIIHH', '.....IIIIIIIIIIIIII', '', '',
    ],
  },
  forage: {
    on: [
      '', '', '', '',
      '.......FFFFFFFFFF', '......FFFFFFFFFFFF', '......FF.CC.....FF', '......FFBCCBEEEEFF',
      '......FFBCCBEEEEFF', '......FFBBBBEPPEFF', '....EEEEEEEEEEEEEEEE', '....EEEEEEEEEEEEEEEE',
      '....EVVVFVVVFVVFVVVE', '.....FFFFFFFFFFFFFF', '.....VVVFVVVFVVFVVV', '.....VVVFVVVFVVFVVV',
      '.....FFFFFFFFFFFFFF', '.....VVVFVVVFVVFVVV', '.....VVVFVVVFVVFVVV', '.....VFFFFFFFFFFFFV',
      '......FFFFFFFFFFFF', '', '', '',
    ],
    off: [
      '', '', '', '',
      '.......IIIIIIIIII', '......IIIIIIIIIIII', '......II.HH.....II', '......IIIHHIIIIIII',
      '......IIIHHIIIIIII', '......IIIIIIIHHIII', '....IIIIIIIIIIIIIIII', '....IIIIIIIIIIIIIIII',
      '....IIIIIIIIIIIIIIII', '.....IIIIIIIIIIIIII', '.....IIIIIIIIIIIIII', '.....IIIIIIIIIIIIII',
      '.....IIIIIIIIIIIIII', '.....IIIIIIIIIIIIII', '.....IIIIIIIIIIIIII', '.....IIIIIIIIIIIIII',
      '......IIIIIIIIIIII', '', '', '',
    ],
  },
  social: {
    on: [
      '', '', '', '.............I',
      '..........I..I', '..........I..I', '..........I..I', '..........I',
      '', '', '....SSSSSSSSSSSSSSSS', '....SWWWWWWWWWWWWWWS',
      '....SXXXXXXXXXXXXXXS', '.....XXXXXXXXXXXXXX', '.....XXXXXXXXXXXXXX', '.....XXXXXXXXXXXXXX',
      '.....XXUUUUUUUUUUXX', '.......UUUUUUUUUU', '.......UQQQQQQQQU', '........QQQQQQQQ',
      '........QQQQQQQQ', '', '', '',
    ],
    off: [
      '', '', '', '.............H',
      '..........H..H', '..........H..H', '..........H..H', '..........H',
      '', '', '....IIIIIIIIIIIIIIII', '....IHHHHHHHHHHHHHHI',
      '....IHHHHHHHHHHHHHHI', '.....HHHHHHHHHHHHHH', '.....HHHHHHHHHHHHHH', '.....HHHHHHHHHHHHHH',
      '.....HHHHHHHHHHHHHH', '.......HHHHHHHHHH', '.......HIIIIIIIIH', '........IIIIIIII',
      '........IIIIIIII', '', '', '',
    ],
  },
  days: {
    on: [
      '', '', '...........GG', '...........GG',
      '...........GG', '.......FFFFFFFFFF', '.......FFFFFFFFFF', '......FFFFFEEFFFFF',
      '......FYYYYEEYYYYF', '......FYOOOEEOOOYF', '......FYOOPEEPOOYF', '......FYOOPEEPOOYF',
      '......FYOOPEEPOOYF', '......FYOOPEEPOOYF', '......FYOOPEEPOOYF', '......FYOOOEEOOOYF',
      '......FYYYYEEYYYYF', '......FFFFFEEFFFFF', '...........ZZ', '...........ZZ',
      '...........ZZ', '...........ZZ', '', '',
    ],
    off: [
      '', '', '...........JJ', '...........JJ',
      '...........JJ', '.......IIIIIIIIII', '.......IIIIIIIIII', '......IIIIIIIIIIII',
      '......IHHHHIIHHHHI', '......IHHHHIIHHHHI', '......IHHHHIIHHHHI', '......IHHHHIIHHHHI',
      '......IHHHHIIHHHHI', '......IHHHHIIHHHHI', '......IHHHHIIHHHHI', '......IHHHHIIHHHHI',
      '......IHHHHIIHHHHI', '......IIIIIIIIIIII', '...........II', '...........II',
      '...........II', '...........II', '', '',
    ],
  },
  book: {
    on: [
      '', '', '', '',
      '', '...FFFFFFFFFFFFFFFFFF', '...FPPPPPPPGGaaaaaaaF', '...FPPPPPPPGGaaaaaaaF',
      '...FPMMMMMPGGaaaaaaaF', '...FPPPPPPPGGaBBBBaaF', '...FPPPPPPPGGaBCCBaaF', '...FPMMMMMMGGaBCCBaaF',
      '...FPPPPPPPGGaBCCBaaF', '...FPPPPPPPGGaBDBBaaF', '...FPMMMMPPGGaaDaaaaF', '...FPPPPPPPGGaaDaaaaF',
      '...FPPPPPPPGGaaaaaaaF', '...FPPPPPPPGGaaaaaaaF', '...FFFFFFFFGGFFFFFFFF', '...FFFFFFFFFFFFFFFFFF',
      '', '', '', '',
    ],
    off: [
      '', '', '', '',
      '', '...IIIIIIIIIIIIIIIIII', '...IHHHHHHHJJHHHHHHHI', '...IHHHHHHHJJHHHHHHHI',
      '...IHJJJJJHJJHHHHHHHI', '...IHHHHHHHJJHIIIIHHI', '...IHHHHHHHJJHIHHIHHI', '...IHJJJJJJJJHIHHIHHI',
      '...IHHHHHHHJJHIHHIHHI', '...IHHHHHHHJJHIJIIHHI', '...IHJJJJHHJJHHJHHHHI', '...IHHHHHHHJJHHJHHHHI',
      '...IHHHHHHHJJHHHHHHHI', '...IHHHHHHHJJHHHHHHHI', '...IIIIIIIIJJIIIIIIII', '...IIIIIIIIIIIIIIIIII',
      '', '', '', '',
    ],
  },
};

/** 成就的七类，页签上照这个顺序。 */
export const ACHIEVEMENT_ICON_KINDS = Object.freeze(Object.keys(ROWS));

/** 一类成就的图标：earned 为真是拿到了的那张。24×24。 */
export function achievementIcon(kind, earned) {
  const rows = ROWS[kind];
  if (!rows) throw new Error('没有这一类成就：' + kind);
  return new Grid(24, 24).blit(fromText(rows[earned ? 'on' : 'off'], INK), 0, 0);
}
