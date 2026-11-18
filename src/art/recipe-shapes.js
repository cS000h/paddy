// 几道菜靠整条鱼、整枚蛋或包叶的轮廓来认，不能只用切好的料块。
import { fromText } from './pixel.js';
import { P } from './palette.js';

// prettier-ignore
const silhouettes = {
  wholeFish: [
    '..........dd.............','.......dddccddd.......cc.','....dddbbbbbbbcdd....ccb.',
    '..ddabbaabbbbbbbbd..ccbb.','.abdababaabbaabbbbddbbbb.','aabbbbbaabbbaabbbbbbbbc..',
    '.aaaabbbbaabbbaabbbccbb..','...aaaabbbbbbbbbcc...cc..','......caaaaabbcc.........','.........cccc............',
  ],
  teaEgg: ['....bbb...','..bbabab..','.bbbbaabb.','.babbabbb.','bbbaabbcbb','bbaabbcbbb','bbbabbbccb','.bbabcbbb.','.bbbbaabc.','..ccbbbc..','....ccc...'],
  belly: ['...bbbbbb..','..bbaaaaab.','.bbabbbabb.','aaaabbabcc.','bbbbbbbccc.','aaaabbbccc.','bbbbbbcccc.','.cccccccc..'],
  drum: ['.....bbbb....','...bbaabbb...','..bbaabbbbc..','.bbbbbbbbbcc.','.bbbbbbbbbcc.','..bbbbbbbbc..','....ccccba...','........aaa..','.........aaaa','..........aad'],
  wrapped: ['.......ccc........','.....ccabbcc......','...ccaabbbbcc.....','..cabbbbabbbbc....','.cbbbabbbabbabc...','cbbabbbbcbbabbac..','.cbbbbbccbabbbcc..','..ccbbccbbbbccc...','....cccccccc......'],
  chestnut: ['....c....','...bbc...','..babbb..','.babbbbc.','.bbabbcc.','aaaabbccc','.aaaaaac.','..ccccc..'],
  potato: ['....aaaa...','..aaaabaa..','.abbbabbbb.','abbbabbbabc','bbbabbabbbc','.bbabbbbcc.','..ccccccc..'],
  pumpkin: ['.....aa....','...aaaab...','..aaababb..','.aaabbaabb.','aaaaababbbc','bbbbbbbbbcc','cccccccccc.'],
  cucumber: ['...cc....','.ccbabc..','caaabbbc.','.ababacc.','..cccc..'],
  brothEgg: ['.....aa....','..aabbba...','.abb..aba..','aa.....bbaa','.......abb.'],
  beanPod: ['.....aa..','....abaa.','...acbc..','..abbc...','.abcc....','abc......'],
  shreds: ['......aaaa..','...aaabbc...','.aabbc...aa.','....aaabbbc.','..abbc......','aac.........'],
};

// prettier-ignore
const specials = {
  '茶叶蛋': {egg:'teaEgg'}, '小葱拌豆腐': {tofu:'block'}, '肉末豆腐': {pork:'crumb'},
  '红烧肉':{pork:'belly'}, '芋头扣肉':{pork:'belly'}, '辣子鸡':{chicken:'crisp'},
  '红烧鸡块':{chicken:'crisp'}, '烤鸡':{chicken:'drum'}, '叫花鸡':{chicken:'wrapped'},
  '炭烤鱼':{fish:'wholeFish'}, '香草烤鱼':{fish:'wholeFish'}, '红烧鱼':{fish:'wholeFish'},
  '糖醋鱼':{fish:'wholeFish'}, '蒸咸鱼':{saltfish:'wholeFish'},
  '炭烤土豆':{potato:'potato'}, '香草烤土豆':{potato:'potato'}, '烤南瓜':{pumpkin:'pumpkin'},
  '烤栗子':{chestnut:'chestnut'}, '拍黄瓜':{cucumber:'cucumber'},
  '清炒土豆丝':{potato:'shreds'}, '酸辣土豆丝':{potato:'shreds'}, '凉拌萝卜丝':{radish:'shreds'},
  '韭菜炒肉丝':{pork:'shreds'}, '肉丝蛋炒饭':{pork:'shreds'}, '笋丝炒蛋':{shoot:'shreds'},
  '姜丝鱼汤':{ginger:'shreds'}, '干煸豆角':{longbean:'beanPod'}, '辣炒豆角':{longbean:'beanPod'},
};

// prettier-ignore
const colors = {
  fish:['paper1','w3','w5','ink2'], saltfish:['e0','h1','h3','t3'], egg:['h0','t1','t3','e2'],
  pork:['k0','c0','t3','t4'], chicken:['h0','h2','t3','paper1'], potato:['h0','h1','t2','t3'],
  pumpkin:['y0','y2','g6','g7'],chestnut:['h1','t2','t3','t4'],cucumber:['g0','g3','g6','g7'],
  radish:['l0','paper1','s3','g3'], shoot:['h0','h1','t1','h3'], ginger:['y0','h1','t1','t2'],
  longbean:['b1','g5','g7','b4'],
};

export function signature(base, id, cut) {
  const fixed = specials[base]?.[id];
  if (cut && ['wholeFish', 'drum', 'potato', 'cucumber', 'pumpkin'].includes(fixed)) return null;
  if (fixed === 'shreds' && cut && cut !== 'shred') return null;
  if (fixed) return fixed;
  if (base?.includes('蛋花') && id === 'egg') return 'brothEgg';
  return null;
}

export function specialPiece(form, id, quality, spices = []) {
  if (!silhouettes[form]) return null;
  let [a, b, c, d] = colors[id].map(k => P[k]);
  if (form === 'wrapped') [a, b, c] = [P.b1, P.g5, P.n3];
  if (form === 'brothEgg') [a, b, c] = [P.y0, P.y1, P.h2];
  if (form === 'belly') [a, b, c] = [P.h0, P.t2, P.t4];
  if (form === 'wholeFish' && spices.includes('soy')) [a, b, c] = [P.h1, P.t1, P.t3];
  if (form === 'wholeFish' && spices.includes('sugar') && spices.includes('vinegar'))
    [a, b, c] = [P.k1, P.c0, P.c2];
  if (quality === 'burnt') [a, b, c] = [P.t1, P.t3, P.ink0];
  if (quality === 'over') c = P.t4;
  if (quality === 'under') b = a;
  if (quality === 'raw') [b, c] = [a, P.s2];
  return fromText(silhouettes[form], { a, b, c, d });
}
