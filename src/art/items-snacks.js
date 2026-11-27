// 物品图标（六）：调料和零嘴。每个函数返回一张没描边的 16×16 小图。
import { P } from './palette.js';
import { sketch } from './items-kit.js';

// 一只瓶子：@ 是瓶身的颜色，# 是暗的那一边。
const bottle = (body, dark) =>
  sketch(
    [
      '',
      '.......tt.......',
      '.......tt.......',
      '......#@@#......',
      '......#@@#......',
      '.....#@@@@#.....',
      '....#@@@@@@#....',
      '....#@wwww@#....',
      '....#@wrrw@#....',
      '....#@wwww@#....',
      '....#@@@@@@#....',
      '....#@@@@@@#....',
      '....########....',
    ],
    { '@': body, '#': dark },
  );

// 一只扎着布口的坛子：^ 是封口布的颜色，% 是布上的花，坛身上贴一块 3 行的标签。
const jar = (cloth, fleck, label) =>
  sketch(
    [
      '',
      '',
      '.....^^^^^^.....',
      '....^%^^^^%^....',
      '.....hhhhhh.....',
      '....uuuuuuuu....',
      '...tuuuuuuuuT...',
      `..tuu${label[0]}uuuT..`,
      `..tuu${label[1]}uuuT..`,
      `..tuu${label[2]}uuuT..`,
      '..tuuuuuuuuuuT..',
      '...tuuuuuuuuT...',
      '....TTTTTTTT....',
    ],
    { '^': cloth, '%': fleck },
  );

export const snacks = {
  salt: () =>
    sketch([
      '',
      '',
      '',
      '......wwww......',
      '.....wwwwww.....',
      '....TTTTTTTT....',
      '...tuuuuuuuuT...',
      '...tuuwwwwuuT...',
      '...tuuwkkwuuT...',
      '...tuuwwwwuuT...',
      '...tuuuuuuuuT...',
      '....tuuuuuuT....',
      '.....TTTTTT.....',
    ]),
  soy: () => bottle(P.t4, P.ink0),
  vinegar: () => bottle(P.t2, P.t3),
  wine: () => jar(P.c1, P.c2, ['wwwww', 'wkkkw', 'wwwww']),
  pickle: () => jar(P.i1, P.i0, ['DgDgD', 'gDgDg', 'DgDgD']),

  sugar: () =>
    sketch([
      '',
      '',
      '',
      '',
      '.....wwww.......',
      '....wwwwWx......',
      '....wwwwWx..ww..',
      '..wwwWWWWxwwwWx.',
      '.wwwwWxxxxwwwWx.',
      '.wwwwWx..wWWWWx.',
      '.wWWWWx...xxxx..',
      '..xxxx..........',
    ]),

  cake: () =>
    sketch([
      '',
      '',
      '',
      '.....wwwwww.....',
      '....wwwrwwWx....',
      '....wwwwwwWx....',
      '....WWWWWWWx....',
      '...wwwwwwwwwx...',
      '..wwwwwwwwwWWx..',
      '..wwwwwwwwwWWx..',
      '..WWWWWWWWWWWx..',
      '..xxxxxxxxxxxx..',
    ]),

  melon: () =>
    sketch([
      '',
      '',
      '',
      '',
      '.rrrrrrrrrrrrrr.',
      '.wrrrkrrrrkrrrw.',
      '.gwrrrrrrrrrrwg.',
      '..gwrrrkrrrrwg..',
      '..VgwrrrrrrwgV..',
      '...VgwwwwwwgV...',
      '....VggggggV....',
      '.....VVVVVV.....',
    ]),

  zongzi: () =>
    sketch([
      '',
      '',
      '.......V........',
      '......VgV.......',
      '......VgDV......',
      '.....VggDV......',
      '.....VhhhhV.....',
      '....VgggDDV.....',
      '....VggggDDV....',
      '...VhhhhhhhV....',
      '...VgggggDDDV...',
      '..VggggggDDDV...',
      '..VVVVVVVVVVV...',
    ]),

  mooncake: () =>
    sketch([
      '',
      '',
      '',
      '....yyyyyyyy....',
      '...yzzyyyyyyy...',
      '..yzyYYyyYYyyy..',
      '..yyYyyYYyyYyy..',
      '..yyYyyYYyyYyy..',
      '..YyyYYyyYYyyY..',
      '..jYyyyyyyyyYj..',
      '..jjYYYYYYYYjj..',
      '...jjjjjjjjjj...',
    ]),

  niangao: () =>
    sketch([
      '',
      '',
      '',
      '...wwwwwwwwww...',
      '..wwwwrrwwwwWx..',
      '..WWWWrrWWWWWx..',
      '...wwwrrwwwwww..',
      '..wwwwrrwwwwWx..',
      '..WWWWrrWWWWWx..',
      '...wwwrrwwwww...',
      '..wwwwrrwwwwWx..',
      '..WWWWrrWWWWWx..',
      '...xxxxxxxxxx...',
    ]),

  bun: () =>
    sketch([
      '',
      '',
      '',
      '......wwww......',
      '....wwwXwwww....',
      '...wwwXwXwwWw...',
      '..wwwXwwwXwwWw..',
      '..wwXwwwwwXwWW..',
      '..wwwwwwwwwwWW..',
      '..WwwwwwwwwWWW..',
      '...WWWWWWWWWW...',
      '....xxxxxxxx....',
    ]),

  yam: () =>
    sketch([
      '',
      '',
      '',
      '...mmm..........',
      '..mNyyymm.......',
      '..myyzyyymm.....',
      '..NyyzzyyyymN...',
      '...myyyzzyyyym..',
      '....mmyyyzyyyN..',
      '......mmyyyymN..',
      '........mmNNN...',
    ]),

  candy: () =>
    sketch([
      '',
      '',
      '.....yyyy.......',
      '....yzzyyY......',
      '...yzyyyyyY.....',
      '...yzyyyyYY.....',
      '...yyyyyyYY.....',
      '....yyyyYY......',
      '.....YYYY.......',
      '.......tt.......',
      '........tt......',
      '.........tt.....',
      '..........tt....',
    ]),
};
