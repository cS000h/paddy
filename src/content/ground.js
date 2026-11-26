// 地上冒出来的时令野货：每天清早各张图上冒几样，落在树下、竹边、花丛草边，雨后多；走过去就捡起来。
// 跟翻找分开：翻出来的是藏着的材料和小东西，地上冒的是看得见的吃食和落果（G-08 的意见）。
// 只有数据；落在哪儿、怎么捡见 sim/plugins/ground.js。

/**
 * 数都是游戏尺度，先粗，玩过再调。
 *   perMap 每张有野地的图冒几样（最少、最多）；wet 近来下过雨每张图多冒几样；max 全村最多几样。
 */
export const GROUND = Object.freeze({ perMap: [1, 2], wet: 1, max: 12 });

// 一样：冒什么、哪几季（0 春 1 夏 2 秋 3 冬）、落在哪几类东西旁边（content/search.js 的翻找类）、
// 是不是雨后才有、捡起来时那句；soils 给了的，只落在这几种地上（content/maps/kinds.js 的地面）。
const g = (item, seasons, near, line, wet = false, soils = null) =>
  Object.freeze({ item, seasons, near, line, wet, soils });

// 荠菜、马兰头本身是绿的，落在草地上认不出来：只冒在土路边、溪边沙地、林下苔地（G-12 审稿定的）
const BARE = Object.freeze(['earth', 'sand', 'moss']);

export const GROUND_FINDS = Object.freeze([
  g('shepherd', [0, 3], ['flowers', 'bush', 'fern'], '贴地一丛荠菜，掐了嫩的那几棵。', false, BARE),
  g('malan', [0], ['flowers', 'reeds', 'willow'], '路边冒出一撮马兰头，梗还红着。', false, BARE),
  g('mugwort', [0, 1], ['flowers', 'bush'], '顺手掐了几片嫩艾叶，指头一股清苦香。'),
  g('shoot', [0, 1], ['bamboo'], '一夜雨，竹根边拱出一个笋尖。', true),
  g('herb', [0, 1, 2], ['flowers', 'reeds', 'willow'], '溪边的香草长得正好，掐一把。'),
  g('wildPeach', [1], ['peach'], '树底下滚着个熟透的毛桃。'),
  g('berry', [1], ['bush'], '灌木底下落了一捧红莓，挑没摔破的捡。'),
  g('mushroom', [1, 2], ['pine', 'broad', 'fern'], '松针底下撑起几朵小伞，菌子出来了。', true),
  g('chestnut', [2], ['broad'], '刺苞裂开，油亮的栗子掉在草里。'),
  g('pinecone', [2, 3], ['pine'], '松树底下躺着个干松果。'),
]);
