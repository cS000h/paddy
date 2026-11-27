// 物品图标（二）：米面蛋豆腐、鱼和肉。每个函数返回一张没描边的 16×16 小图。
import { Grid } from './pixel.js';
import { P } from './palette.js';
import { sketch, ball } from './items-kit.js';

// 一只青花碗，上面堆着东西：heap 是碗口以上的四行。
const bowl = heap =>
  sketch([
    '',
    '',
    ...heap,
    '..CCCCCCCCCCCC..',
    '..wWWWWWWWWWWX..',
    '...wWbbbbbbWX...',
    '...wWWWWWWWWX...',
    '....wWWWWWWX....',
    '.....xXXXXX.....',
    '......AAAA......',
  ]);

export const FISH = [
  '',
  '',
  '',
  '......bbbb....b.',
  '....bbccccb..bb.',
  '...bcccccccbbbb.',
  '..bckcccccccbb..',
  '..bccccccccbbb..',
  '...wwwcccccbbbb.',
  '.....wwwwwb..bb.',
  '.......www....b.',
];

// 一块肉：肥膘在上，瘦肉在下。@ 瘦肉，# 肉里的纹，$ 边上的暗色。
const SLAB = [
  '...wwwwwwwww....',
  '..wWWWWWWWWWw...',
  '..@@@@@@@@@$$...',
  '..@#@@@ww@@@$...',
  '..@@@@w@@@@#$...',
  '..@@@@@@@#@@$...',
  '..@#@@@@@@@$$...',
  '...@@@@@@@@$....',
  '....$$$$$$$.....',
];

export const pantry = {
  rice: () =>
    bowl(['.......ww.......', '.....wwwwww.....', '....wwxwwwww....', '...wwwwwwxwww...']),
  bean: () =>
    bowl(['.......yy.......', '.....yyYyyy.....', '....yYyyyYyy....', '...yyyYyyyyYy...']),
  egg: () => ball(new Grid(16, 16), 8, 8.5, 4, 5, [P.l0, P.k0, P.k1]),

  tofu: () =>
    sketch([
      '',
      '',
      '',
      '....wwwwwwww....',
      '...wwwwwwwwWW...',
      '..wwwwwwwwWWX...',
      '..WWWWWWWWWXX...',
      '..WWWWWWWWWXX...',
      '..WWWWWWWWWXX...',
      '..WWWWWWWWWXX...',
      '..WWWWWWWWWX....',
      '..xxxxxxxxx.....',
    ]),

  fish: () => sketch(FISH),
  // 咸鱼：同一条鱼，晒成了黄褐色，嘴上穿着一根草绳
  saltfish: () => sketch(FISH, { b: P.h3, c: P.h1, w: P.h0 }).vline(2, 2, 5, P.h2).set(3, 2, P.h2),

  pork: () => sketch(['', '', '', ...SLAB], { '@': P.p2, '#': P.p3, $: P.c0 }),
  // 一刀猪肉：更大的一块，挂在铁钩上
  porkSlab: () =>
    sketch(
      [
        '',
        '.......SS.......',
        '......S..S......',
        '.......S........',
        '...wwwwwwwwww...',
        '..wWWWWWWWWWWw..',
        '..@@@@@@@@@@@$..',
        '..@#@@@@ww@@@$..',
        '..@@@ww@@@#@@$..',
        '..@@#@@@@@@@$$..',
        '..@@@@@#@@@@@$..',
        '..@@#@@@@@@#$$..',
        '...$$$$$$$$$$...',
      ],
      { '@': P.p2, '#': P.p3, $: P.c0 },
    ),

  mutton: () =>
    sketch([
      '',
      '',
      '...........ww...',
      '..........wWW...',
      '....rrrrrrwW....',
      '...rrRrrrrrx....',
      '..rrrrrwwrrr....',
      '..rRrrwrrrRr....',
      '..rrrrrrrrrr....',
      '..rrRrrrrRrQ....',
      '...rrrrrrrQ.....',
      '....QQQQQQ......',
    ]),

  lambLeg: () =>
    sketch([
      '',
      '..........ww....',
      '.........wWw....',
      '.........wW.....',
      '........rrx.....',
      '.......rrrR.....',
      '......rrrrR.....',
      '.....rrrrrRQ....',
      '....rrrRrrrQ....',
      '...rrrrrrrRQ....',
      '...rrRrrrrRQ....',
      '...rrrrrrRQ.....',
      '....rRrrRQ......',
      '.....QQQQ.......',
    ]),

  chicken: () =>
    sketch([
      '',
      '',
      '....5555........',
      '...555666.......',
      '..55566666......',
      '..55666667......',
      '..566666677.....',
      '...6666677......',
      '....66777.......',
      '......77w.......',
      '.......wWw......',
      '........wWww....',
      '.........ww.w...',
    ]),

  // 整只鸡：集上买回来的活鸡，脚上捆着草绳
  wholeChicken: () =>
    sketch([
      '',
      '....rr..........',
      '...rwwr.........',
      '...wkwwy........',
      '...wwww.........',
      '....www....ww...',
      '....wwwwwwwwww..',
      '...wwwwxxwwwx...',
      '...wwwxxxxwxx...',
      '...wwwwxxwwx....',
      '....wwwwwwx.....',
      '.....xxxxx......',
      '......y.y.......',
      '.....yy.yy......',
    ]),

  bacon: () =>
    sketch([
      '',
      '.......H........',
      '.......H........',
      '......RRRR......',
      '.....RrrrRQ.....',
      '.....RhhhRQ.....',
      '.....RrrrRQ.....',
      '.....RrrrRQ.....',
      '.....RhhhRQ.....',
      '.....RrrrRQ.....',
      '.....RrrrRQ.....',
      '.....RhhhRQ.....',
      '......RrrQ......',
      '.......QQ.......',
    ]),
};
