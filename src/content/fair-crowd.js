// 集场上逛的赶集人（G-33 第三节）：只是画面上的热闹，规则不知道，点不到、不挡路。
// 平常日子两三个人慢慢逛，集日、过节人多；在摊子前站一会儿，再挪到别处。
// 你走近了，偶尔有人自言自语一句（平日、集日、节庆各一套）。
import { outfitLook } from './wardrobe.js';

export const CROWD_RULES = Object.freeze({
  count: { normal: 2, fair: 5, feast: 6 }, // 几个人逛
  linger: [2.5, 7], // 到了一处站几秒再走
  every: [12, 24], // 隔几秒有人说一句
  hear: 5, // 离你几格以内才听得见
});

// 逛的人穿什么：拿布摊上有的衣装发式拼，和过客一样
export const CROWD_LOOKS = Object.freeze([
  outfitLook('hero', 'field', 'crop'),
  outfitLook('hero', 'cook', 'bun'),
  outfitLook('hero', 'tea', 'knot'),
  outfitLook('hero', 'denim', 'cap'),
  outfitLook('hero', 'feast', 'braid'),
  outfitLook('hero', 'bamboo', 'short'),
  outfitLook('hero', 'dungarees', 'pony'),
  outfitLook('hero', 'plum', 'sidebun'),
]);

// 集场上逛的落脚点（格子）：三个摊子跟前、路上几处
export const CROWD_STOPS = Object.freeze([
  [8, 17],
  [14, 17],
  [20, 17],
  [5, 14],
  [11, 14],
  [16, 15],
  [22, 14],
  [9, 19],
  [17, 19],
  [24, 13],
]);

export const CROWD_LINES = Object.freeze({
  normal: [
    '今天只摆了一个摊，顺手买把青菜就回家做饭。',
    '听说石伯家的早稻长得最齐整，真不愧是老把式。',
    '路过杂货铺，瞧见小乔那只猫又趴在窗台晒太阳。',
    '老周今早撑船慢悠悠的，河湾水面平得像面镜子。',
    '刚在院墙外闻见桂嫂家的腌菜香，馋得不行。',
    '平日集场清静，挑东西反倒不用跟人挤。',
  ],
  fair: [
    '五天一回大集，三个摊子摆得满满当当真热闹！',
    '刚瞧见阿满推着满车青菜进村，嗓门隔半条街都听见。',
    '老张案板上那条五花肉真肥，晚一步准叫人割光！',
    '云姑难得下山摆茶摊，我得赶紧抢两包头茬新茶。',
    '孙婶送了我一把葱，还是稻乡的集市有人情味儿！',
    '听茶摊说有人在渡口比鱼赢了外乡客，真的假的？',
    '货郎老陈今儿带了新麦芽糖，买两块哄家里娃去！',
    '钱嫂木盆里那尾大鲤鱼蹦得老高，溅了我一袖子水！',
  ],
  feast: [
    '摊棚都挂起红灯笼和彩旗啦，过节的气氛一下就浓了！',
    '桂嫂说晚上茶摊摆长桌，大伙儿可得早点去占位子！',
    '小乔写字越来越俊了，过节的红纸联全找她讨！',
    '过节肉摊排好长队，割两斤好肉回家给大伙儿解馋！',
    '今儿渡口锣鼓响得欢，老周和阿满怕是早就忙活开啦！',
    '一年到头就盼这几个大日子，全村聚一块儿才踏实！',
  ],
});
export const CROWD_NAME = '赶集的';
