// 小屋衣镜的成衣与梳好的发式。原衣、原发沿用人物设定。
export const COATS = Object.freeze({
  plain: '原衣',
  hoodie: '鼠尾草绿卫衣',
  stripe: '海军条纹衫',
  denim: '水洗牛仔外套',
  dungarees: '焦糖背带裤',
  field: '麦白短褂',
  tea: '青竹采茶衫',
  cook: '靛蓝围裙',
  rain: '芦黄蓑衣',
  winter: '柿红夹袄',
  feast: '藕荷长衫',
  bamboo: '竹青长衫',
  lotus: '荷粉衣裙',
  ink: '墨青短衫',
  harvest: '稻黄暖袄',
  cloud: '云白茶衫',
  plum: '朱红冬衣',
});
export const HAIR = Object.freeze({
  plain: ['原发', 0],
  crop: ['层次碎发', 0],
  bob: ['内扣直发', 1],
  pony: ['高马尾', 3],
  knot: ['松丸子头', 2],
  loose: ['披发', 3],
  tail: ['束发', 2],
  bun: ['盘髻', 2],
  braid: ['垂辫', 3],
  twins: ['双结', 2],
  topknot: ['束顶高髻', 2],
  sidebun: ['侧梳小髻', 2],
  short: ['清爽短发', 0],
  doublebun: ['双小髻', 2],
  cap: ['青布包头', 1],
});
export function outfitLook(base, coat, hair) {
  return coat === 'plain' && hair === 'plain' ? base : [base, coat, hair, HAIR[hair][1]].join('/');
}
