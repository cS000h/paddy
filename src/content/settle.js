// 开局的落脚单（执行方案 M10，文字是 Gemini 的 G-16、G-18 稿）：为什么在这儿落脚、随身带的营生旧物、
// 随家里来的一个性情、你自己的性子、村里一笔旧交情。只有数据；怎么记由成长插件（origin.settle）来管。
// 还没接的：带债的两条缘由和旧账（等 M9 的借和还）、做事攒出性情（等做法标签和心烦）、
// 头三天找上门的事（等局面）。钱和东西的多少都是占位。

/**
 * 落脚缘由。text 落脚单上的说明；first 推门进院的第一句；coins 开局的钱多几个少几个；
 * items 家里多放的东西；friend 跟谁有旧（锁死这一户的旧交情，没有就自己挑）；
 * family 「更容易随家里来」的那几样（FAMILY 的编号），换一户时先从这里抽。
 */
// prettier-ignore
export const REASONS = Object.freeze({
  split: {
    name: '分家单过起灶',
    text: '家里兄弟多、灶头小，长辈拍板分了家。你领了半袋糙米和一把旧锄头搬进借住小屋，往后锅冷锅热全靠自己。',
    first: '灶台虽然小，好歹是自己的窝，先把火生起来再说。',
    gives: '家里多三份米，钱少八文',
    coins: -8, items: { rice: 3 }, friend: null, family: ['proud', 'toil'],
  },
  flood: {
    name: '遭灾避难落脚',
    text: '老家连遭两年水涝，田全泡烂了。你背着破包袱顺官河一路逃难，见稻乡水土安稳，咬牙租下这间小屋重新活命。',
    first: '总算有个遮风挡雨的瓦顶了，活着就有翻身的盼头。',
    gives: '身无长物，钱少十六文',
    coins: -16, items: {}, friend: null, family: ['poor'],
  },
  oldfriend: {
    name: '投奔故交老屋',
    text: '你家老辈早年帮过稻乡石伯一把，如今家里遭变，石伯托人捎话腾出村边小屋给你借住，先落脚再图长远。',
    first: '石伯把院门扫得干干净净，这份人情往后得记着还。',
    gives: '石伯认得你',
    coins: 0, items: {}, friend: 'shi', family: ['kind'],
  },
  town: {
    name: '厌倦镇市归乡',
    text: '在邻县铺子里当了五年伙计，天天看东家脸色算账算得心累。攒下一点微薄工钱，干脆辞工来稻乡租间小屋图个清静。',
    first: '听不见算盘响和东家喊，光闻这稻花风就值了。',
    gives: '多带十六文盘缠',
    coins: 16, items: {}, friend: null, family: ['enough'],
  },
  rest: {
    name: '借屋调养身子',
    text: '前阵子大病一场丢了城里活计，郎中说得找个山清水秀处静养。表亲托后山云姑帮着寻了这间小屋，先养身再谋生。',
    first: '山风带着茶香吹进院子，吸一口气胸口都松快多了。',
    gives: '云姑认得你，家里多两份草药',
    coins: 0, items: { herb: 2 }, friend: 'yun', family: ['boat'],
  },
  keeper: {
    name: '替亲戚看守老院',
    text: '远房姑妈举家迁去外府，舍不得空着老院，叫你来帮着照看房舍菜畦，顺便落脚过日子，隔壁就是爱照应人的桂嫂。',
    first: '院子虽旧，菜畦倒还齐整，隔壁灶屋正飘饭香呢。',
    gives: '桂嫂认得你，家里多两份青菜',
    coins: 0, items: { 'veg.qingcai': 2 }, friend: 'gui', family: [],
  },
});

/** 营生旧物：一条出身线一件，挑了哪件就是哪条出身线（content/traits.js 的 LINES_OF_ORIGIN）。 */
// prettier-ignore
export const KEEPSAKES = Object.freeze({
  sickle:  { name: '磨亮旧镰', line: 'farmer',    text: '家里传了两代的割稻镰，握着就知道田埂怎么走。' },
  spatula: { name: '老铁锅铲', line: 'cook',      text: '在镇上饭铺掌了三年灶，离店时师父留给你的念想。' },
  giftbox: { name: '红漆礼盒', line: 'neighbor',  text: '逢年过节走街串巷提礼用的，装过不知多少家常点心。' },
  towel:   { name: '白布搭肩', line: 'teahouse',  text: '从前在县城茶楼端壶跑堂，往肩头一搭手脚就利索。' },
  basket:  { name: '旧藤背篓', line: 'hunter',    text: '进山采笋挖药背了多年，沾着晒不散的松针泥土味。' },
  float:   { name: '黄铜浮漂', line: 'boatman',   text: '家里老船拆解时独独留下的，见着水色就认得深浅。' },
  bell:    { name: '小铜货铃', line: 'peddler',   text: '走十里八乡串村时挂在担头，响一声村里狗都不叫。' },
  abacus:  { name: '乌木算盘', line: 'broker',    text: '昔日在牙行替人估价说媒随身揣着，一拨便知轻重。' },
  poems:   { name: '半旧诗册', line: 'scholar',   text: '祖父留下的农书兼闲诗，翻到哪页都能闻见旧墨香。' },
  grinder: { name: '小铜药碾', line: 'herbalist', text: '在医馆抓药捣草磨出来的老物件，识得百草凉热。' },
});

/** 随家里来的性情：从哪儿来、哪个性情、落脚单上那一句，和违着它时心烦的那一句（等心烦接上再用）。 */
// prettier-ignore
export const FAMILY = Object.freeze({
  toil:   { from: '爹一辈子起早贪黑', temper: 'diligent',  text: '打小爹就教导天亮不起身要挨饿，闲着浑身发痒。', against: '大白天闲晃啥也没干，心里总像压着块石头。' },
  poor:   { from: '家里穷怕了',       temper: 'stingy',    text: '小时候一粒米掉地上都要捡起来吹干净再吃。', against: '这一笔花得太敞亮了，越想越觉着肉疼心烦。' },
  kind:   { from: '娘常念叨不占便宜', temper: 'honest',    text: '娘临行前反复叮嘱，宁可吃点亏也别昧良心。', against: '占了这点小便宜心里发虚，总觉着对不住人。' },
  burned: { from: '家里出过被骗的事', temper: 'paranoid',  text: '家里早年吃过熟人暗亏，逢事总要多留个心眼。', against: '啥都没问清就轻信了人家，越琢磨越坐立不安。' },
  fiery:  { from: '爹是个炮仗脾气',   temper: 'hasty',     text: '随了爹的急性子，事儿没个准信就浑身不痛快。', against: '磨磨蹭蹭拖了半天没结果，真叫人憋得慌。' },
  enough: { from: '祖母总说别跟人比', temper: 'content',   text: '家里长辈总念叨平安温饱就是福，别太折腾。', against: '硬跟人争这口气累得慌，图啥呢，心里真烦。' },
  proud:  { from: '家里受过白眼',     temper: 'ambitious', text: '早年借钱受尽冷眼，打那起便发誓绝不低人一头。', against: '刚才低声下气退了一步，越想越觉着窝囊。' },
  boat:   { from: '家里老辈行船出身', temper: 'calm',      text: '老辈常说风浪越大越得稳住舵，慌神最误事。', against: '刚才冲动没想周全就拍板，心里直打鼓。' },
});

/**
 * 村里的旧交情（G-16 的「旧交情」，六位村民各一条）。note 落脚单上那一句，hello 头回说话时他提起的，
 * 都照原稿。旧账那六条等 M9 的借和还。
 */
// prettier-ignore
export const OLD_TIES = Object.freeze({
  shi:  { note: '年幼时帮石伯抢收过一场暴雨稻，他一直记着。', hello: '是你呀！当年暴雨抢稻数你跑得快，地荒了喊我一声。' },
  gui:  { note: '你娘从前教过桂嫂腌脆萝卜的方子，她念到现在。', hello: '哎哟这不是故人家的娃吗！你娘那腌菜方子嫂子还用着呢！' },
  aman: { note: '小时候和阿满一块儿在溪边烤红薯，烫掉过半块皮。', hello: '哎哟真是你！还记得咱俩烤糊红薯被追着跑那回不？' },
  qiao: { note: '曾帮小乔从屋顶抱下过差点摔着的猫「掌柜」。', hello: '恩人来啦！掌柜刚才还冲你摇尾巴，它可记你的好呢！' },
  zhou: { note: '以前帮老周修补过破渔网，换听了他一下午老故事。', hello: '这不是帮老头子补网的小友吗？今儿风平，来渡口坐坐！' },
  yun:  { note: '曾在后山帮云姑捡回滚下石阶的整筐嫩茶芽。', hello: '是你呀……上回多亏你帮我捡回茶芽，一直想谢你呢。' },
});
