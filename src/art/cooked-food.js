// 锅里是熟料的小轮廓。每种只留一个辨认点，比如鱼皮的青线和豆腐的切面。
import { Grid, fromText } from './pixel.js';
import { P } from './palette.js';

// prettier-ignore
const shapes = {
  rice: ['...aa...', '.aabbba.', 'ababbaba', 'bbbabbcc', '.cccccc.'],
  egg: ['...aa...', '.aabbaa.', 'abbbabca', 'bcabbbbc', '.ccbacc.'],
  leaf: ['.....aa.', '..a.abb.', '.abbbbc.', 'abbabcc.', '.aabbc..', '..abc...', '.cc.....'],
  cube: ['..aaaa..', 'aaaaaab.', 'bbbbbbc.', 'bbbbccc.', '.bbccc..'],
  slice: ['..cccc..', '.caaaac.', 'caabaabc', 'cabaaabc', '.cabbcc.', '..cccc..'],
  fish: ['...cccccc.', '.ccabbabcc', 'aabaabbbbc', '.bbbbcccc.', '..cccc....'],
  meat: ['..aaaaa..', '.bbbbbbac', 'aaaaaabcc', '.bbbbccc.'],
  bean: ['.aa..aa.', 'abcbabcc', '.cc..cc.'],
  wedge: ['....a..', '...aab.', '..aaabb', '.aabbbc', 'abbbccc', '.ccccc.'],
  mushroom: ['..aaaa..', '.abbbba.', 'abbcbbbc', '.ccabcc.', '...ab...'],
  stem: ['....a..a', '...ab.ab', '..ab.ab.', '.ab.ab..', '.c..c...'],
  chestnut: ['...c...', '..aba..', '.abbba.', 'abbbbcc', 'aaabccc', '.aaaaa.'],
  taro: ['..aaaa..', '.acaaba.', 'abaaaabc', '.baacabc', '..bbbcc.'],
  ginger: ['.....aa.', '.aa.aab.', 'abbaaabc', '.bbabcc.', '..bbc...'],
  mint: ['.ab...a.', '.abbaaab', '..bccab.', '...acbc.', '..ac....'],
  tea: ['.....ac.', '...abb..', '..abc...', 'abb..aa.', 'cc..abc.'],
  onionLeaf: ['....a..a', '.a.ab.ab', '.abb.abc', '..bc.bc.', '...c....'],
  beanPod: ['......aa', '....aabc', '...abc..', '.aabc...', 'abc.....'],
  cabbage: ['...aaaa.', '.aabbaba', 'abbaaabb', 'bababcbb', '.abcbbc.', '..aac...'],
  tomato: ['....a...', '...aba..', '..abbab.', '.abbaabc', 'bbabbabc', '.cccccc.'],
  meatStripe: ['..ccbcc..', '.aabaaab.', 'bbbcbbccc', 'aaabaaac.', '.cccccc..'],
  chicken: ['...aa...', '.aabaa..', 'abbbbabb', '.aabbbbc', '...cccbc'],
  lamb: ['...aaab..', '.abbbaab.', 'abbaabbbc', '.abbbccc.', '..ccc....'],
  shrimp: ['...aaa..', '.aabbba.', 'ab...bba', 'bc...abc', '.c..abc.', '..ccc...'],
  crab: ['a.a..a.a', '.abaaba.', 'aabbbbaa', '.bbbbbc.', 'a.cccc.a'],
};

// prettier-ignore
const foods = {
  rice: ['rice','l0','paper1','e2'], egg: ['egg','y0','y1','h2'],
  'veg.qingcai': ['leaf','g1','g4','g6'], potato: ['cube','h0','h1','t1'],
  herb: ['mint','b1','g4','g6'], bean: ['bean','h0','t1','t3'],
  shoot: ['wedge','e0','h1','h3'], shepherd: ['leaf','g2','g4','g7'],
  chive: ['onionLeaf','g2','g5','g7'], cucumber: ['slice','g0','b1','g6'],
  tomato: ['tomato','p1','c0','c2'], longbean: ['beanPod','b1','b3','b4'],
  pumpkin: ['wedge','y0','y2','g6'], chestnut: ['chestnut','h1','t1','t3'],
  mushroom: ['mushroom','e1','t1','t3'], taro: ['taro','l0','paper2','u1'],
  radish: ['slice','l0','paper1','s3'], cabbage: ['cabbage','g0','g2','g5'],
  ginger: ['ginger','e0','h1','e4'], tea: ['tea','g3','n1','n3'],
  tofu: ['cube','l0','paper1','e2'], fish: ['fish','l0','paper2','w5'],
  saltfish: ['fish','e0','h1','h3'], pork: ['meat','k0','k2','u2'],
  chicken: ['chicken','l0','k0','t1'], mutton: ['lamb','k0','c0','u2'],
  bacon: ['meatStripe','e0','c0','t3'],
  // 路边翻到、捡到的野货（G-08）：先借现成的轮廓换颜色，A-06 再看要不要另画
  wildPeach: ['tomato','k0','p2','c1'], peachGum: ['bean','y0','y1','y2'],
  mugwort: ['mint','g2','g4','s3'], malan: ['leaf','g2','g5','c2'],
  berry: ['bean','c0','c1','c2'], brake: ['stem','b1','g4','g6'],
  snail: ['chestnut','s1','s3','s5'], mussel: ['slice','k0','e1','u2'],
  lotusPod: ['bean','l0','g0','g3'], caltrop: ['wedge','l0','paper1','c3'],
  earthEar: ['cabbage','g4','g6','g7'],
  // 钓鱼时拉上来的河鲜（G-09）：煮熟了都发红
  shrimp: ['shrimp','k1','c0','c2'], crab: ['crab','c0','c1','c3'],
};

export const COOKED_ITEMS = Object.keys(foods);

export function morsel(id, cut, quality = 'plain') {
  const [shape, light, mid, shade] = foods[id] || foods.potato;
  let rows = shapes[shape];
  if (cut === 'shred')
    rows = ['.....aa.', '..aaabbc', '.abbc...', '....aab.', '.aaabbc.', 'abbc....'];
  if (cut === 'slice')
    rows = ['...aaaa.', '.aabbbbc', '.cccccc.', '...aaaa.', '.abbbbbc', '.cccccc.'];
  if (cut === 'chunk') rows = shapes.cube;
  const c = { a: P[light], b: P[mid], c: P[shade] };
  if (quality === 'burnt') Object.assign(c, { b: P.t3, c: P.t4 });
  if (quality === 'over') c.c = P.t3;
  if (quality === 'raw' || quality === 'under') c.b = P[light];
  const bit = fromText(rows, c);
  if (cut && cut !== 'shred') {
    if (id === 'cucumber' || id === 'pumpkin') bit.hline(2, 5, bit.h - 1, P.g6);
    if (id === 'bacon' || id === 'pork') bit.hline(2, 5, 2, c.a);
    if (id === 'taro') bit.set(3, 1, c.c).set(5, 3, c.c);
    if (id === 'fish' || id === 'saltfish') bit.hline(2, 5, 1, c.c);
  }
  return bit;
}

// 一松一紧的两枚饭团，中间的火印也跟着翻面。
export function riceBall(turn) {
  const g = new Grid(13, 12);
  g.poly(
    [
      [1, 8],
      [4, 3],
      [6, 1],
      [8, 1],
      [12, 8],
      [11, 10],
      [3, 11],
      [1, 10],
    ],
    P.t2,
  )
    .poly(
      [
        [1, 8],
        [5, 2],
        [7, 1],
        [9, 4],
        [11, 8],
        [9, 9],
        [3, 9],
      ],
      P.paper1,
    )
    .line(4, 5, 6, 2, P.l0)
    .hline(3, 9, 9, P.h1);
  if (turn) g.line(5, 7, 7, 5, P.t1).line(8, 7, 9, 6, P.t1);
  return g;
}
