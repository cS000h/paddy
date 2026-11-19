// 流动过客配置：六种乡土身份原型、落脚坐标、现成衣装发式外观、当下诉求与回报。
// 每次赶集或换季刷出，站在茶摊、杂货铺或渡口；走到跟前才能搭话办事。
import { outfitLook } from './wardrobe.js';

// 各处可站立的过客点位：能站人，不和乡邻在那张图上的去处重在一格（L1 内容测试会查）。
// 杂货铺门前那两格原先和阿满、桂嫂下午站的地方重了，人叠在一起，过客也点不中。
export const VISITOR_SPOTS = Object.freeze({
  tea: [
    { x: 11, y: 12, dir: 'down' },
    { x: 14, y: 13, dir: 'left' },
    { x: 10, y: 13, dir: 'right' },
  ],
  market: [
    { x: 11, y: 13, dir: 'down' },
    { x: 17, y: 13, dir: 'down' },
    { x: 14, y: 13, dir: 'down' },
  ],
  river: [
    { x: 13, y: 11, dir: 'down' },
    { x: 15, y: 16, dir: 'left' },
    { x: 11, y: 12, dir: 'right' },
  ],
});

export const VISITOR_ROLES = Object.freeze({
  peddler: {
    id: 'peddler',
    title: '走村货客',
    spot: 'market',
    spotName: '村口杂货铺',
    look: outfitLook('hero', 'field', 'crop'),
    stay: 2,
    talkLine: '“跑了三个村子，数你们稻乡的水土最养人，有好菜记得留我一份。”',
    need: { kind: 'item', item: 'veg.qingcai', n: 1, text: '想收 1 份新鲜青菜' },
    reward: { coins: 12, item: 'seed.qingcai', n: 2, mod: 'visitor_word' },
  },
  healer: {
    id: 'healer',
    title: '过路大夫',
    spot: 'tea',
    spotName: '樟树茶摊',
    look: outfitLook('hero', 'tea', 'knot'),
    stay: 2,
    talkLine: '“天色换得快，喝碗热茶、吃口暖胃的饭，比什么药都管用。”',
    need: { kind: 'item', item: 'herb', n: 1, text: '想寻 1 份山野香草' },
    reward: { coins: 10, item: 'cake', n: 1, mod: 'kind_heart' },
  },
  scholar: {
    id: 'scholar',
    title: '采风书生',
    spot: 'tea',
    spotName: '樟树茶摊',
    look: outfitLook('hero', 'feast', 'tail'),
    stay: 3,
    talkLine: '“听说稻乡的灶台手艺一绝，要是能尝一口家常热饭，写进游记里定好看。”',
    need: { kind: 'dish', text: '想尝 1 份刚做好的热饭菜' },
    reward: { coins: 16, item: 'rice', n: 2, mod: 'tea_fame' },
  },
  grocer: {
    id: 'grocer',
    title: '邻村菜客',
    spot: 'market',
    spotName: '村口杂货铺',
    look: outfitLook('hero', 'cook', 'bun'),
    stay: 2,
    talkLine: '“赶集日人多货杂，能稳稳拿出好鸡蛋和时令菜的，都是行家。”',
    need: { kind: 'item', item: 'egg', n: 1, text: '想收 1 份新鲜鸡蛋' },
    reward: { coins: 14, item: 'salt', n: 2, mod: 'good_harvest' },
  },
  carpenter: {
    id: 'carpenter',
    title: '落脚木工',
    spot: 'river',
    spotName: '河湾渡口',
    look: outfitLook('hero', 'rain', 'plain'),
    stay: 3,
    talkLine: '“顺水路过来修船板，正缺两根顺手的干木柴，也想听听村里手艺人的讲究。”',
    need: { kind: 'item', item: 'wood', n: 2, text: '想换 2 份干柴木料' },
    reward: { coins: 12, item: 'bean', n: 2, mod: 'craft_spark' },
  },
  matchmaker: {
    id: 'matchmaker',
    title: '走亲媒人',
    spot: 'tea',
    spotName: '樟树茶摊',
    look: outfitLook('hero', 'winter', 'braid'),
    stay: 2,
    talkLine: '“走南走北看多了，踏实种地、会做热饭的人，在哪儿都叫人喜欢。”',
    need: { kind: 'dish', text: '想品 1 份拿手家常菜' },
    reward: { coins: 15, item: 'cake', n: 2, mod: 'tea_fame' },
  },
});

export const VISITOR_SURNAMES = Object.freeze(['林', '高', '周', '宋', '何', '许', '方', '白']);
export const VISITOR_GIVEN = Object.freeze(['老伯', '大娘', '后生', '姑娘', '大伯', '先生']);
export const VISITOR_TRAITS = Object.freeze([
  '热心',
  '爱吃',
  '爱说话',
  '识货',
  '细心',
  '爽快',
  '爱茶',
  '重义',
]);
export const ROLE_IDS = Object.freeze(Object.keys(VISITOR_ROLES));
