// 原图四周留给物品册统一描边。短高的背、尾叉和触须都直接落在像素格上。
import { sketch } from './items-kit.js';

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
  worm: () => sketch([
    '', '', '', '', '....7p7', '...7p..O', '..Op...p....7', '..pO...Op..p7',
    '...7p...p7pO', '....7p....O', '.....Op7', '.......O7',
  ]),
};
