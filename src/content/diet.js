// 食为天：食材分四类、近几天吃了什么、口味。分类、名字和话出自 G-30（Gemini），数是 Claude 定的。
// 五谷为养，五果为助，五畜为益，五菜为充。照乡下人的吃法分，不照植物学：豆子、豆腐算荤（素里的荤），
// 土豆、芋头算谷，栗子、菱角、莲蓬算果。规则在 sim/plugins/diet.js。

/** 四类，按册子里排的顺序。note 是饮食页格子底下的小字。 */
export const GROUPS = Object.freeze({
  grain: Object.freeze({ name: '谷', note: '米面薯芋' }),
  veg: Object.freeze({ name: '菜', note: '菜蔬菌笋' }),
  meat: Object.freeze({ name: '荤', note: '肉蛋鱼豆' }),
  fruit: Object.freeze({ name: '果', note: '果子茶饮' }),
});

const words = text => text.trim().split(/\s+/);
/** 哪样东西归哪一类（极品、彩头照原来那样，各种鱼都算「鱼」）。姜、香草、艾草是佐料，不算数。 */
// prettier-ignore
export const GROUP_OF = Object.freeze({
  ...Object.fromEntries(words('rice potato taro cake zongzi mooncake niangao bun yam').map(k => [k, 'grain'])),
  ...Object.fromEntries(
    words(`veg.qingcai shoot shepherd chive cucumber tomato longbean pumpkin mushroom radish cabbage
      malan brake earthEar pickle`).map(k => [k, 'veg']),
  ),
  ...Object.fromEntries(
    words('egg bean tofu fish shrimp crab snail mussel pork chicken mutton bacon saltfish').map(k => [k, 'meat']),
  ),
  ...Object.fromEntries(words('chestnut tea wildPeach peachGum berry lotusPod caltrop melon candy').map(k => [k, 'fruit'])),
});
/** 佐料：下锅提味，不算吃了哪一类。 */
export const SEASONING = Object.freeze(['ginger', 'herb', 'mugwort']);
/** 肉包子是面皮包肉：谷、荤都算。 */
export const ALSO = Object.freeze({ bun: Object.freeze(['meat']) });

/**
 * 膳食结构。每天清早照前几天吃的定一回：近 well 天四类都沾到是「气色好」；某一类连着 lack 天没沾，
 * 出它的小毛病（开局头 lack 天不算）。log 是记几天的账。
 * 效果借「身边风物」（content/modifiers.js 的 diet_*）挂一天，第二天清早再定；嘴燥吃到果就消。
 */
export const DIET = Object.freeze({
  well: 3,
  lack: 4,
  log: 4,
  wellMod: 'diet_well',
  lackMod: Object.freeze({
    grain: 'diet_weak',
    veg: 'diet_fire',
    meat: 'diet_limp',
    fruit: 'diet_dry',
  }),
  chill: 0.7, // 气色好：着凉的机会乘这么多
  fireMood: -3, // 上火：一早心情差这么多
  dryMood: -1, // 嘴燥：吃饭心情少这么多
  newMood: 2, // 头一回吃到这道菜
  tasteMood: 2, // 合口 +，忌口 −
  tasted: 300, // 记多少道吃过的菜
});

/** 头一回得上时底下冒的一句（G-30 三.1）。 */
export const DIET_LINES = Object.freeze({
  diet_well: '这几天吃得顺当，照着井水一瞧，脸膛子都透着亮。',
  diet_weak: '肚子虽不饿，腿肚子却发飘，终究是少吃了几口实诚饭。',
  diet_fire: '嘴角隐隐发紧，看啥都有点心浮气躁，该炒盘青菜败败火了。',
  diet_limp: '拎起锄头觉着沉了不少，肚里刮得慌，该沾点荤腥或豆腐了。',
  diet_dry: '嗓子眼干巴巴的，吃啥都像隔着层砂纸，真想剥个果子润润。',
});
/** 嘴燥消了的那一句。 */
export const DRY_GONE = '一口清甜下去，嗓子眼润了。';

/** 村民看出你气色的话（G-30 三.2），熟了才说。等聊天接上再用。 */
export const DIET_REMARKS = Object.freeze({
  shi: {
    well: '“瞧你这几日精气神足得很，饭食上没亏待自己，好。”',
    ill: '“脸色看着有些干巴，干活归干活，灶上可别太省着。”',
  },
  gui: {
    well: '“哟，这几日气色真水灵！准是灶台没闲着，吃得舒坦！”',
    ill: '“咋瞧着蔫蔫的？是不是光凑合着吃了？明儿来嫂子家喝汤！”',
  },
  aman: {
    well: '“嘿！你今儿看着可真精神，走路都带风！”',
    ill: '“你嘴唇咋起皮了呀？别光埋头忙活，赶紧换换菜色！”',
  },
  qiao: {
    well: '“气色这么好，看来近来伙食讲究得很，难怪干活利索。”',
    ill: '“你这模样看着可不像吃顺了，别省那点菜钱，身子要紧。”',
  },
  zhou: {
    well: '“红光满面的，吃得好睡得香，这才叫过日子嘛。”',
    ill: '“瞧你眉间有点倦色，怕是这几日饭菜太单调，调理调理。”',
  },
  yun: {
    well: '“……你近来气色好多了，看着踏实。”',
    ill: '“你看着有点虚，灶上……莫总吃同几样，伤身子。”',
  },
});

/** 吃腻了三档、头一回吃到新菜的旁白（G-30 三.3、三.4），按天挑一句。 */
export const TIRED_LINES = Object.freeze([
  Object.freeze([]),
  Object.freeze([
    '又是这道菜，虽还算顺口，已没头回香了。',
    '筷子伸出去顿了顿，明儿该换个花样了。',
    '还是老味道，凑合填个肚子倒也行。',
  ]),
  Object.freeze([
    '才扒了两口，嘴里就觉着发腻。',
    '闻着味儿都熟过头了，咽下去不太爽利。',
    '越嚼越没滋味，真想换口别的清清嘴。',
  ]),
  Object.freeze([
    '实在吃不下去了，多看一眼碗里都发愁。',
    '满嘴都是这股老味，勉强咽了两口就放筷。',
    '吃得心里直发堵，再也不想连续做这个了。',
  ]),
]);
export const NEW_DISH_LINES = Object.freeze([
  '哎呀，这新法子做出来还真香！',
  '头一回尝到这味儿，忍不住多扒两口饭。',
  '鲜气顺着喉咙往下滑，这趟灶没白烧。',
  '原来这几样凑一块儿这么对味，记下了！',
  '刚入口就眼前一亮，连碗底都想舔干净。',
]);

/**
 * 口味（G-30 四.1，另加了「实在」「脆爽」「软糯」三样给村民用）。一道菜沾不沾这个口味，
 * 规则照 sim/taste.js 判：辣只认干辣椒；腥是带腥的食材又没放姜、黄酒压住。
 */
export const TASTES = Object.freeze({
  spicy: '嗜辣',
  sweet: '喜甜',
  sour: '爱酸',
  salty: '重口',
  umami: '贪鲜',
  meaty: '爱荤',
  plain: '清淡',
  fishy: '怕腥', // 只当忌口用
  staple: '实在',
  crisp: '脆爽',
  soft: '软糯',
});

/**
 * 六位村民的口味。和他们最爱的那道菜对过（G-30 拿不准的第 1 条）：桂嫂最爱青菜蛋花汤，不忌清淡改忌腥；
 * 老周撑船、最爱姜丝鱼汤，爱鲜和软糯；云姑最爱南瓜粥，爱清淡和甜。
 */
export const VILLAGER_TASTES = Object.freeze({
  shi: { likes: ['salty', 'staple'], dislikes: ['sweet'] },
  gui: { likes: ['spicy', 'meaty'], dislikes: ['fishy'] },
  aman: { likes: ['sweet', 'sour'], dislikes: ['fishy'] },
  qiao: { likes: ['umami', 'crisp'], dislikes: ['salty'] },
  zhou: { likes: ['umami', 'soft'], dislikes: ['spicy'] },
  yun: { likes: ['plain', 'sweet'], dislikes: ['meaty'] },
});

/** 主角的口味从性情和出身线来（G-30 四.3）。热络、灶台帮工照 G-30 的头一样。船家吃惯了鱼，不怕腥。 */
export const TEMPER_TASTES = Object.freeze({
  hasty: { likes: ['spicy'] },
  calm: { likes: ['plain'] },
  ambitious: { likes: ['salty'] },
  content: { likes: ['sweet'] },
  generous: { likes: ['meaty'] },
  gregarious: { likes: ['spicy'] },
  shy: { dislikes: ['fishy'] },
  paranoid: { dislikes: ['fishy'] },
});
export const LINE_TASTES = Object.freeze({
  boatman: { likes: ['umami'], clears: ['fishy'] },
  hunter: { likes: ['umami'] },
  farmer: { likes: ['salty'] },
  cook: { likes: ['sour'] },
  scholar: { likes: ['plain'] },
  peddler: { likes: ['spicy'] },
});

/** 吃到合口、忌口时的旁白（G-30 四.4）。 */
export const TASTE_LINES = Object.freeze({
  like: Object.freeze([
    '正合胃口！这口下去浑身都舒坦。',
    '就是这个味儿，吃得人心里美滋滋的。',
    '越吃越顺嘴，恨不得把碗底都刮干净。',
  ]),
  dislike: Object.freeze([
    '这味儿实在不对脾气，勉强咽了。',
    '皱着眉扒了两口，下回可别这么搭了。',
    '嘴里直犯别扭，填个肚子就算了。',
  ]),
});

/** 送饭送到对方爱吃的、忌口的，对方说的（G-30 四.4；桂嫂、老周、云姑照改过的口味改了几句）。 */
export const GIFT_TASTE = Object.freeze({
  shi: {
    like: '“咸香实在，这菜下饭！你有心了。”',
    dislike: '“好意我领了，只是这甜口……我实在吃不惯。”',
  },
  gui: {
    like: '“哎哟香得我直咽口水！还是你懂嫂子爱吃这口！”',
    dislike: '“这腥气没压住呀，下回记得切两片姜！”',
  },
  aman: {
    like: '“哇！酸酸甜甜的太好吃啦，你手艺真绝！”',
    dislike: '“呃……这腥气有点冲，我、我慢慢吃吧。”',
  },
  qiao: {
    like: '“这鲜劲儿拿捏得真准，比镇上馆子都不差！”',
    dislike: '“太咸太糙了点，我这嘴挑，先放着慢慢吃吧。”',
  },
  zhou: {
    like: '“鲜得很，软和顺口，正合我这老肠胃，多谢啦。”',
    dislike: '“哎哟好辣！我这老嗓子可扛不住这股火气。”',
  },
  yun: {
    like: '“……清清淡淡，又带点甜，合我胃口。谢谢你。”',
    dislike: '“太油腻了，我吃不得……别浪费，你自己留着吧。”',
  },
});
