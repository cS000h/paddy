// 衣装、发式和地毯合不合时令、合不合场合（G-40）。只管「合不合」，不管「强不强」：
// 合了冒一句话、乡邻多夸一句、心情好一点；不合只轻轻提一句。不加干活产出、不加钱、不卡好感。
// 唯一实打实的作用：雨天披着蓑衣出门，不算「淋了雨」（接 sim/plugins/comfort.js 的 'body.dry'）。
// 规则在 sim/plugins/attire.js。季节：0 春、1 夏、2 秋、3 冬。
//
// 场合的说法：
//   下地 灶边 赶集 做客 节令 采山 行船 走街 雨天 雪天 寻常
// 其中跟日子挂钩的只有三样：节令（今天过节）、做客（今天有约）、赶集（今天逢集）。
// 雨天、雪天看今天的天；别的场合只是一句旁白的由头。
// warm：thin 单薄、mid 寻常、thick 厚实。衣镜跟前看冷热就看它。

export const COAT_FIT = Object.freeze({
  plain: {
    seasons: [0, 2],
    uses: ['下地'],
    warm: 'mid',
    line: '穿惯了的旧布衫，干活抬手最顺溜。',
  },
  field: {
    seasons: [1],
    uses: ['下地'],
    warm: 'thin',
    line: '麦白短褂透风，烈日下汗干得快。',
  },
  cook: {
    seasons: [],
    uses: ['灶边', '下地'],
    warm: 'mid',
    line: '围裙一系，炒菜溅油、摘菜沾泥都不怕。',
  },
  ink: {
    seasons: [0, 2],
    uses: ['赶集', '做客'],
    warm: 'mid',
    line: '墨青素净耐看，走村串户落落大方。',
  },
  cloud: {
    seasons: [0, 1],
    uses: ['做客', '采山'],
    warm: 'thin',
    line: '白茶衫清清爽爽，站在茶山风里正合适。',
  },
  feast: {
    seasons: [0, 2],
    uses: ['做客', '节令'],
    warm: 'mid',
    line: '藕荷色温润体面，过节做客不失礼数。',
  },
  lotus: {
    seasons: [0, 1],
    uses: ['赶集', '节令'],
    warm: 'thin',
    line: '荷粉衣裙明快轻盈，逛集市看着就喜庆。',
  },
  harvest: {
    seasons: [2],
    uses: ['下地', '赶集'],
    warm: 'thick',
    line: '稻黄棉袄挡秋风，干活赶集两不误。',
  },
  winter: {
    seasons: [2, 3],
    uses: ['节令', '做客'],
    warm: 'thick',
    line: '柿红夹袄暖融融的，过节串门添喜气。',
  },
  plum: {
    seasons: [3],
    uses: ['雪天', '节令'],
    warm: 'thick',
    line: '厚实冬衣裹严实了，大雪天出门也不发抖。',
  },
  hoodie: {
    seasons: [0, 2],
    uses: ['赶集', '走街'],
    warm: 'mid',
    city: true,
    line: '这件城里套头衫松快新鲜，集上人人多瞧两眼。',
  },
  stripe: {
    seasons: [0, 1],
    uses: ['赶集', '行船'],
    warm: 'thin',
    city: true,
    line: '蓝白条纹配溪水，站在渡口倒真亮眼。',
  },
  denim: {
    seasons: [0, 2],
    uses: ['赶集', '下地'],
    warm: 'mid',
    city: true,
    line: '粗实靛蓝短褂耐磨得很，逛集劈柴都扛造。',
  },
  dungarees: {
    seasons: [0, 2],
    uses: ['赶集', '下地'],
    warm: 'mid',
    city: true,
    line: '背带裤兜多利索，逛集装零碎、下地兜种子都顺手。',
  },
  rain: {
    seasons: [],
    uses: ['雨天', '行船', '下地'],
    warm: 'mid',
    line: '蓑衣披严实了，雨点顺着草梢滑落，衣裳干爽。',
  },
  tea: {
    seasons: [0, 1],
    uses: ['采山'],
    warm: 'thin',
    line: '窄袖青竹衫不挂树枝，钻后山林子最利索。',
  },
  bamboo: {
    seasons: [0, 2],
    uses: ['做客', '节令'],
    warm: 'mid',
    line: '竹青长衫清雅周正，赴约做客看着就有书卷气。',
  },
});

// 发式只给一句旁白和偶尔一句夸，不扣体感（G-40 一·3）
export const HAIR_FIT = Object.freeze({
  plain: { seasons: [], uses: ['寻常'], line: '随手理顺的头发，自在省心。' },
  short: { seasons: [1], uses: ['下地'], line: '脖子后头透风，大热天干活不捂汗。' },
  tail: { seasons: [], uses: ['下地', '灶边'], line: '头发束紧了，低头炒菜锄地不挡眼。' },
  loose: { seasons: [2, 3], uses: ['做客'], line: '头发披在肩上暖和，串门看着也柔和。' },
  crop: { seasons: [0, 1], uses: ['赶集'], line: '碎发轻巧灵动，逛集市风一吹挺精神。' },
  bob: { seasons: [0, 2], uses: ['做客'], line: '头发梳得服帖整齐，去乡邻家做客很得体。' },
  pony: { seasons: [1], uses: ['下地', '采山'], line: '高高扎起一束，跑山路甩竿都痛快。' },
  braid: { seasons: [0, 2], uses: ['赶集', '做客'], line: '辫子编得匀实，走村逛集看着秀气。' },
  knot: { seasons: [], uses: ['灶边', '采山'], line: '挽成一团不散落，烧灶采草都不沾灰。' },
  twins: { seasons: [], uses: ['赶集', '节令'], line: '双结俏皮喜庆，赶集过节看着就欢实。' },
  doublebun: {
    seasons: [0, 1],
    uses: ['节令', '做客'],
    line: '两个小髻扎着红头绳，过节见人讨喜。',
  },
  bun: { seasons: [], uses: ['节令', '做客'], line: '盘髻端庄稳重，过节赴约最显体面。' },
  cap: {
    seasons: [],
    uses: ['下地', '灶边', '采山'],
    line: '青布一包，落叶泥灰和灶烟全挡在外面。',
  },
  sidebun: { seasons: [0, 1], uses: ['赶集', '做客'], line: '侧边小髻配木梳，逛集串门温婉俏丽。' },
  topknot: {
    seasons: [],
    uses: ['下地', '行船', '采山'],
    line: '高高束在头顶，迎着溪风山风也不吹乱。',
  },
});

// 衣镜跟前的一句（G-40 二）。按 ORDER 从前往后，先对上哪一种就说哪一种；两句按日子轮着说。
export const MIRROR = Object.freeze({
  hot: [
    '外头日头毒着呢，裹这么厚出门，走两步准出一身汗。',
    '镜里看着暖和，可外头热浪直扑脸，换件轻薄的透透气吧。',
  ],
  cold: [
    '天这么凉，穿得单薄出门，风一吹胳膊准起鸡皮疙瘩。',
    '寒气正重，这身衣裳挡不住风，还是套件夹袄暖袄稳妥。',
  ],
  rain: [
    '窗外淅淅沥沥下着雨，不披件蓑衣出门，衣摆准湿透。',
    '雨丝飘得密，衣箱里有蓑衣的话，出门顺手披上吧。',
  ],
  apron: [
    '身上还系着灶房的靛蓝围裙呢，出门逛村要不要解下来？',
    '围裙上还沾着点灶火气，也就去隔壁串门还行，赶集换一身吧。',
  ],
  feast: [
    '过节穿得喜庆周正，进村见着乡邻也有精气神。',
    '一年难得几回好日子，这一身应景又体面，正合适。',
  ],
  guest: [
    '今儿跟乡邻有约，这身清清爽爽，上门做客不失礼数。',
    '照镜子理平衣角，干干净净赴约去，人家看着也舒心。',
  ],
  fair: [
    '今儿逢集，这身衣裳利落精神，逛街买货看着就体面。',
    '镜里齐齐整整，趁着集日热闹，出门准能赢几句夸。',
  ],
  fine: [
    '不冷不热，这身衣裳正合今天的天气，出门干活自在。',
    '镜里看着利索舒坦，寻常日子就该这么穿，顺心。',
  ],
});
// 不冷不热、没有场合、衣裳也合这一季的，说 fine；别的情形落到这件衣裳自己那一句
export const MIRROR_ORDER = Object.freeze([
  'rain',
  'cold',
  'hot',
  'apron',
  'feast',
  'guest',
  'fair',
]);

// 节令、有约、逢集那天穿得合场合：今天头一个搭话的乡邻多夸一句，心情 +1（一天一回，不卡好感）
export const DRESSED = Object.freeze({
  mood: 1,
  why: '穿得体面，乡邻夸了一句',
  any: ['今儿打扮得真精神！', '哟，这一身穿得周正，看着就喜气。'],
  // 城里成衣在乡下算新鲜：这三位见了另有一句（G-40 一·3）
  city: {
    aman: '这身跟县城戏台画报上似的，真洋气！',
    gui: '这靛蓝粗布倒是真结实，城里的手艺？',
    qiao: '这衣裳样子新鲜，回头让我照着画两笔！',
  },
});

// 地毯合不合时令（G-40 五，只扩地毯）：跟床铺一个路数，清早醒来按今天的季节给心情加减。
// 地毯比床轻一档，只 ±1。default 旧蒲草席不挑季节。
export const RUG_SEASON = Object.freeze({
  bamboo: Object.freeze({
    fit: [1],
    miss: [3],
    good: '赤脚踩在细竹席上清凉顺滑，屋里暑气散了一半',
    bad: '天这么冷，踩着竹席脚底凉飕飕的',
  }),
  stripe: Object.freeze({
    fit: [3],
    miss: [1],
    good: '厚实布毯隔住了地底寒气，踩上去脚底板暖融融的',
    bad: '大热天踩着厚布毯，脚底板闷得慌',
  }),
  embroidered: Object.freeze({
    fit: [3],
    miss: [1],
    good: '厚实绒毯隔住了地底寒气，踩上去脚底板暖融融的',
    bad: '大热天踩着厚绒毯，脚底板闷得慌',
  }),
  mood: 1,
});
