// 院里的成就摆件（Gemini G-31 第五节）：得了对口的成就，院里多一件看得见的东西，不加任何数。
// 只有数据；摆不摆、谁看见了说一句在 sim/plugins/achievements.js，画在 world/keepsakes.js。
//   for  哪个成就（编号照游戏里的；回稿里的编号都对得上）
//   at   [左边, 脚下] 像素。挂在屋上的（wall）压在房子前面；放在地上的按脚下前后遮挡。
//   by   进院看见了的村民；look 他说的一句
// 都避开小院翻修六处和彩头台（content/yard-fix.js 的 at）。

// prettier-ignore
export const KEEPSAKES = Object.freeze([
  { id: 'ornHoe', name: '磨亮旧铁锄架', for: 'soil20', at: [112, 128], by: 'shi',
    look: '“锄头磨得发亮，靠在墙根看着就提气。”' },
  { id: 'ornBaskets', name: '一摞青竹菜筐', for: 'harvest30', at: [178, 224], by: 'aman',
    look: '“好家伙，摞这么高一排筐，明儿我多拉趟板车！”' },
  { id: 'ornBowls', name: '灶边一摞青花碗', for: 'servings30', at: [144, 144], by: 'gui',
    look: '“碗摞得齐齐整整，一看就是天天开火的院子。”' },
  { id: 'ornPickleJar', name: '红布封口泡菜坛', for: 'seasonal5', at: [192, 128], by: 'gui',
    look: '“红布扎得紧实，等开坛了我头一个来尝咸淡。”' },
  { id: 'ornHerbBundle', name: '屋檐倒挂干草药束', for: 'book.wild18', at: [84, 100], wall: true,
    by: 'yun', look: '“晒得干透了，风一吹，满院子都是草木清气。”' },
  { id: 'ornCreel', name: '旧竹编鱼篓', for: 'fish10', at: [170, 100], wall: true, by: 'zhou',
    look: '“这鱼篓挂在檐下，倒有几分老渔户的派头了。”' },
  { id: 'ornNet', name: '篱笆晒补鱼网', for: 'book.fish13', at: [64, 240], by: 'zhou',
    look: '“网眼补得密实，往篱笆上一搭，溪湾都认得你。”' },
  { id: 'ornSeedGourd', name: '井边老葫芦瓢架', for: 'water20', at: [320, 304], by: 'shi',
    look: '“井边挂两把老葫芦瓢，舀水顺手，也不怕沤坏。”' },
  { id: 'ornWindchime', name: '门楣青瓷片风铃', for: 'book.river7', at: [108, 100], wall: true,
    by: 'qiao', look: '“把河里捞的碎青瓷串起来，风吹着叮当响，真巧！”' },
  { id: 'ornTeaSet', name: '墙根素陶茶罐托盘', for: 'gift10', at: [96, 128], by: 'yun',
    look: '“备着茶罐和两只小杯，谁串门来都能顺手倒一碗。”' },
]);

/** 小院的院墙里头和院门口（格子，含两头）：村民站在这儿才算「进院看见了」摆件。 */
export const COURT = Object.freeze({ x0: 3, x1: 18, y0: 4, y1: 15 });
