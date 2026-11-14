// 物品图标（三）：种子、材料、手艺活、工具。每个函数返回一张没描边的 16×16 小图。
import { sketch } from './items-kit.js';

// 一只种子袋，袋子上画着种出来是什么：mark 是 4 行、每行 6 个字符的小图。
const pouch = mark =>
  sketch([
    '',
    '......TTTT......',
    '.....T....T.....',
    '......HHHH......',
    '.....HhhhhH.....',
    '....HhhhhhhH....',
    '...HhhhhhhhhH...',
    ...mark.map(row => `...Hh${row.replace(/\./g, 'h')}hH...`),
    '...HhhhhhhhhH...',
    '....HhhhhhhH....',
    '.....HHHHHH.....',
  ]);

export const things = {
  'seed.qingcai': () => pouch(['..g...', '.gGg..', '..g.g.', '...gGg']),
  seedCuke: () => pouch(['....gy', '...Gg.', '..Gg..', 'gGg...']),
  seedBean: () => pouch(['.....D', '...DD.', '.DD...', 'D.....']),
  seedPumpkin: () => pouch(['..D...', '.oooo.', 'oooooo', '.oooo.']),
  seedRadish: () => pouch(['.gGg..', '..ww..', '..ww..', '..w...']),
  seedCabbage: () => pouch(['.lll..', 'llGll.', 'wlllw.', '.www..']),
  seedChive: () => pouch(['g.g.g.', 'g.g.g.', 'g.g.g.', 'L.L.L.']),

  // 一捆柴：左头是劈开的茬口，中间一道草绳
  wood: () =>
    sketch([
      '',
      '',
      '',
      '..nttttttttttT..',
      '.nnuuuuhhuuuuTT.',
      '.nttttthhttttuT.',
      '.nnuuuuhhuuuuTT.',
      '.nttttthhttttuT.',
      '.nnuuuuhhuuuuTT.',
      '..ttttthhtttuT..',
      '...uuuuhhuuTT...',
    ]),

  log: () =>
    sketch([
      '',
      '',
      '',
      '',
      '...nnn..........',
      '..nntnnuuuuuuu..',
      '.nntttnuTuuuTuT.',
      '.ntnnntuuuuuuuT.',
      '.nntttnuuTuuuuT.',
      '..nntnnuuuuuTuT.',
      '...nnnTTTTTTTT..',
    ]),

  ash: () =>
    sketch([
      '',
      '',
      '',
      '',
      '.......ss.......',
      '......saas......',
      '.....ssaAas.....',
      '....saasaaAs....',
      '...ssaaAasaAs...',
      '..saaAasaaAaAS..',
      '..SAAAAAAAAAAS..',
    ]),

  compost: () =>
    sketch([
      '',
      '',
      '',
      '',
      '.......88.......',
      '......8g88......',
      '.....888F88.....',
      '....8g889889....',
      '...88899g88F9...',
      '..8898g8898998..',
      '..999999999999..',
    ]),

  // 竹篾：一把劈好的细篾条，拦腰扎着
  strip: () =>
    sketch([
      '',
      '............11..',
      '..........1122..',
      '........112233..',
      '......112233....',
      '....11hh33......',
      '...11hh233......',
      '..1122h33.......',
      '.112233.........',
      '.2233...........',
      '.33.............',
    ]),

  basket: () =>
    sketch([
      '',
      '.....jjjjjj.....',
      '....j......j....',
      '...j........j...',
      '...j........j...',
      '..HhjhjhjhjhjH..',
      '..HjhjhjhjhjhH..',
      '..HhjhjhjhjhjH..',
      '...HhjhjhjhjH...',
      '...HjhjhjhjhH...',
      '....HhjhjhjH....',
      '.....HHHHHH.....',
    ]),

  // 菜包：蓝印花布包起来的一包
  parcel: () =>
    sketch([
      '',
      '',
      '......b..b......',
      '.....bCbbCb.....',
      '......bCCb......',
      '....bbbCCbbb....',
      '...bbwbbbbwbb...',
      '..bbbbbwbbbbCb..',
      '..bwbbbbbbwbCC..',
      '..bbbbwbbbbbCC..',
      '...bbbbbwbbCC...',
      '....CCCCCCCC....',
    ]),

  umbrella: () =>
    sketch([
      '',
      '.......R........',
      '.....yyYyy......',
      '...yyyyYyyyy....',
      '..yyyYyYyYyyy...',
      '.yyyyYyYyYyyyy..',
      '.yYyyYyYyYyyYy..',
      '.Y..Y..T..Y..Y..',
      '.......T........',
      '.......T........',
      '.......T........',
      '.......T........',
      '.....T.T........',
      '......TT........',
    ]),

  flask: () =>
    sketch([
      '',
      '.......uu.......',
      '......uuuu......',
      '.....H2222H.....',
      '....H.1223.H....',
      '....H.1223.H....',
      '....H.4444.H....',
      '....H.1223.H....',
      '.....H1223H.....',
      '......1223......',
      '......4444......',
      '......1223......',
      '......1223......',
      '.......33.......',
    ]),
};
