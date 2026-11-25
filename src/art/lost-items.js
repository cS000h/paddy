// 走图翻找碰上的八样失物（G-08 小事 1–8）的小图。先按回稿里的描写画个样子，等美术回稿再换。
import { sketch } from './items-kit.js';

// prettier-ignore
export const lostItems = {
  pipe: () => sketch([
    '', '', '', '..........YY', '.........YzzY', '.........YzYY', '........TYY',
    '.......Tt', '......Tt', '.....Tt', '....rr', '...rTt', '..kT', '..k',
  ]),
  kite: () => sketch([
    '', '', '.......w', '......wWw', '.....wWkWw', '....wWkkkWw', '...wWWkkWWWw',
    '....wWkWkWw', '.....wWWWw', '......wWw', '.......w', '.......x', '........x',
    '.......x', '......x',
  ]),
  thimble: () => sketch([
    '', '', '', '', '......xxxx', '.....xWxWxx', '....xWxWxWXx', '....xxWxWxXx',
    '....xWxWxWXx', '....xxWxWxXx', '...XXXXXXXXXX', '...XsssssssSX', '....XXXXXXXX',
    '.........bb', '..........bb',
  ]),
  purse: () => sketch([
    '', '', '', '.......rr', '......h..h', '.....hhhhhh', '....hjjjjjjh',
    '...hjjjjFFjjh', '...hjjjjFFjjh', '...hjjjjjjjjh', '...hjjjjjjjHh', '....hjjjjjHh',
    '.....hhhhhh',
  ]),
  stripKnife: () => sketch([
    '', '', '', '...xx', '..xWWx', '..xWWWx', '...xWWWx', '....xWWWx',
    '.....xWWWx', '......xWWx', '.......XXT', '........TuT', '.........TuT',
    '..........TuT', '...........TT',
  ]),
  sachet: () => sketch([
    '', '', '', '.......cc', '......c..c', '......cccc', '.....cbbbbc',
    '....cbbbbbbc', '....cbbqpbbc', '....cbqOqbbc', '....cbbqbbbc', '....cbbbbbCc',
    '.....cbbbCc', '......cccc',
  ]),
  bell: () => sketch([
    '', '', '....rrrrr', '...r.....r', '..r.......r', '..r.......r', '...r.....r',
    '....rr.rr', '......r', '.....YYY', '....YzzYY', '....YzYYY', '....YYYYY',
    '.....YkY',
  ]),
  tally: () => sketch([
    '', '', '', '.....TTTTT', '....TuuuuuT', '....Tu.k.uT', '....TuuuuuT',
    '....TkkkuuT', '....TuuuuuT', '....TkkuuuT', '....TuuuuuT', '....TkkkkuT',
    '....TuuuuuT', '....TkkuuuT', '.....TTTTT',
  ]),
};
