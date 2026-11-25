// 原图四周留给物品册统一描边。短高的背、尾叉和触须都直接落在像素格上。
// 后七种鱼和钓上来的河虾、毛蟹、杂物出自 Gemini G-09（原图在设计资料 G-09_交稿/图标），照像素原样搬过来。
import { sketch } from './items-kit.js';
import { P } from './palette.js';

// G-09 的图用到几样共用字符表里没有的颜色（水青、墨灰），在这里补上
const RIVER = {
  '!': P.ink0,
  '^': P.ink2,
  '%': P.paper0,
  '~': P.w0,
  '*': P.w1,
  '?': P.w2,
  '+': P.w3,
  '&': P.w4,
  '=': P.w5,
  '<': P.s0,
  '>': P.s5,
};

// prettier-ignore
export const fishItems = {
  'fish.crucian': () => sketch([
    '', '', '', '.......SS', '......AAAs', '.....Asssss', '..A..assswsS',
    '..sAasswwswkW', '...ssswWwwWww', '..AA.assWWWw', '..A...aWXxx',
    '.......SSx', '.........A',
  ]),
  'fish.bleak': () => sketch([
    '', '', '', '', '', '.........A', '..a....AAsss', '...Asasswwwwsk',
    '....swwwwWWwww', '...A...Xsxx', '..A......A',
  ]),
  'fish.carp': () => sketch([
    '', '', '', '.......HHH', '.....HjHHjj', '..j.jyyyjyjj', '..Hjyyjyjyjjy',
    '...jyjyjyjyiky', '..Hjyjyjyhiiyy', '..j..jyyhiiij.j', '......jhihj..j',
    '.......Hj..j..j', '..........j',
  ]),
  'fish.grass': () => sketch([
    '', '', '', '', '........443', '.......44333', '.4...44333333',
    '.34.4333232323', '..3432232222k2', '..33222221i1i1', '.34...3221ii1',
    '.4.....4..3',
  ]),
  'fish.yellowcat': () => sketch([
    '', '', '', '', '......H', '..H..jjj...H', '..j.HjyjHjjjH',
    '...Hjjyjjyykyj', '..jjjyyyyyzhyy', '..H...jyyhhh..j', '......HH..h.j..j',
    '.........h...j', '............j',
  ]),
  'fish.mandarin': () => sketch([
    '', '', '', '......D.D.D', '......D4D4D', '.....4434434', '..4.4D334D334',
    '..443333D33k32', '...33D333D322', '..44.33D3322.2', '..4...32221222',
    '......4D3..4', '........4',
  ]),
  // —— G-09
  'fish.sleeper': () => sketch(['', '', '', '......UU', '.....UTTU..U', '....UTTTuUUTU', '...UTuuTTuuTTU', '..U!jTTuTuuTUTU', '..UuuTTuuTTuuTU', '..UijjjijjjTTU', '...UiiijjiiTU', '....UUiiiiUU', '......UUUU'], RIVER),
  'fish.bitterling': () => sketch(['', '', '', '.......==', '.....==**==', '....=**OO**=', '...=!~*OO*++=', '..=****OO++*==', '..=**OOOOO++*=', '...=**OOO++*=', '....=*****==', '.....==**=', '.......=='], RIVER),
  'fish.topmouth': () => sketch(['', '', '', '', '', '......>>>>', '....>>AAAAS..S', '...>!AkkkkkASS', '..><<<AAAA<<kS', '...><<<<<<>>SS', '.....>>>>>...S'], RIVER),
  'fish.bream': () => sketch(['', '', '......^^^^', '.....^aaaa^', '....^a<aa<a^', '...^a<aaaa<a^.S', '..^!aaa<<<aaaSS', '..^<a<<<<<<aaS', '..^<<<<<<<<aaSS', '...^<<<<<<aa^.S', '....^<<<<<a^', '.....^aaaa^', '......^^^^'], RIVER),
  'fish.culter': () => sketch(['', '', '', '', '...=', '..==+++++', '..=!+~~~~+++..^', '...=~~~~~~~~+^^', '....=~~~~~~~+^', '.....=~~~~~~+^^', '......==++++..^'], RIVER),
  'fish.yellowtail': () => sketch(['', '', '', '', '......====', '....==????==.y', '...=!?<<<<?=yy', '..=<<<<<<<<?yy', '..=<<<<<<<<?Yy', '...=???????=yy', '.....======..y'], RIVER),
  'fish.catfish': () => sketch(['', '', '', '', '....k', '...k.kkkk', '..k.k^^^^kk', '...ky^^^^^^kkk', '..k.k^^SS^^^^kk', '...k.kaaaSS^^^k', '......kkkaaSSkk', '.........kkkk'], RIVER),
  shrimp: () => sketch(['', '', '........&&', '......&&..&', '.....&..**+&', '....&..!**+&', '......****+', '.......++**', '........++*o', '.......++**oo', '......&.&.*o', '.....&...&'], RIVER),
  crab: () => sketch(['', '', '...uu......uu', '..ugg......ggu', '...u.TggggT.u', '..T.TggVVggT.T', '.T..TgVVVVgT..T', '..T.TggVVggT.T', '...TTggggggTT', '..T..TggggT..T', '.T..T.TTTT.T..T', '....T......T'], RIVER),
  waterweed: () => sketch(['', '', '.......gg', '.....ggGGgg', '....gVVggGGg', '...gVGggVVGGg', '..gVVgGGgVVgg', '..gVggVVggVGg', '...ggVGGggVVg', '....ggVVggGg', '.....gVVgg', '......ggg'], RIVER),
  oldSandal: () => sketch(['', '', '', '.........TTT', '.......TThhhT', '......ThhT..hT', '.....ThhTTThhT', '....ThhThhhTT', '...ThhhThhTT', '..ThhThhhTT', '..ThhThhTT', '...TThhTT', '....TTTT'], RIVER),
  shard: () => sketch(['', '', '', '......====', '.....=****==', '....=**&****=', '...=**&&&***=', '...=**&**&**=', '....=****&**=', '.....=****==', '......=ss==', '.......=='], RIVER),
  oldCoin: () => sketch(['', '', '', '.....HHHHHH', '....HYYYYYYH', '...HYYggggYH', '...HYg....gYH', '...HYg....gYH', '...HYYYggYYYH', '....HYYYYYYH', '.....HHHHHH'], RIVER),
  shuttle: () => sketch(['', '', '', '', '..........UU', '........UUuuU', '......UUuf%uuU', '.....Uufff%uU', '....Uuf%%ffuU', '...UuuuffuUU', '..UUuuUUU', '...UUU'], RIVER),
  worm: () => sketch([
    '', '', '', '', '....7p7', '...7p..O', '..Op...p....7', '..pO...Op..p7',
    '...7p...p7pO', '....7p....O', '.....Op7', '.......O7',
  ]),
};
