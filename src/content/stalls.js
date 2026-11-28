// 集场路南的摊子（Gemini G-33 回稿）。规则在 sim/plugins/market.js：摊子和杂货铺、茶摊一样是「铺子」，
// 编号是 'stall.<摊>'。平常日子只摆一个（中间那个摊位），集日三个摊位摆满，鱼贩集日一定来。
// 每个摊子卖自己的货、收自己要的东西；收东西的钱是摊主从外头带来的，不走村里各户的钱匣，
// 所以每天每摊收几份照原价（平常 / 集日不同），再收同样多半价，收满就不收了。
//   wares：卖什么（物品编号）；count：平常 / 集日摆几样；takes：收哪几类（kindOf 认的类，各种鱼都是 fish）
//   drop：傍晚收摊前鲜货降一文（照 market.js 的傍晚处理）；fairOnly：只在集日来
//   stripe：篷布两色（art/stalls.js 的字符）；lines：吆喝和买卖时的话

export const STALL_SPOTS = 3; // 集场路南三个摊位（地图 market 上的 stall，从西往东 0、1、2）
export const STALL_MIDDLE = 1; // 平常日子摆在中间那个
export const STALL_TAKES = Object.freeze({ normal: 3, fair: 6 }); // 每摊每天原价收几份

export const STALLS = Object.freeze({
  meat: {
    name: '肉摊',
    owner: '老张',
    who: '外村杀猪汉子，嗓门洪亮，最爱夸自家肉肥瘦匀。',
    wares: ['pork', 'bacon', 'wholeChicken', 'lambLeg', 'porkSlab', 'egg'],
    count: [3, 6],
    takes: ['wood', 'chili', 'ginger', 'radish'],
    drop: true,
    stripe: ['r', '%'],
    lines: {
      hawk: ['现杀的肥瘦猪肉，来晚好条肉没啦！', '好腊肉好鲜肉，割一刀回家炖萝卜！'],
      fair: ['赶集吃肉补身子！今儿连鸡和羊腿都备齐啦！', '大刀落秤绝不短斤少两，乡邻快过来挑！'],
      take: ['这柴和干辣椒干爽，我全收了，铜钱拿好！', '成色实在，下回有好料继续往我肉摊送！'],
      full: '今儿收肉收柴钱匣见底啦，下个集日再收！',
    },
  },
  veg: {
    name: '菜苗时鲜摊',
    owner: '孙婶',
    who: '邻村种菜能手，手脚利落，爱在秤杆上多添一根葱。',
    wares: [
      'seed.qingcai',
      'seedPumpkin',
      'veg.qingcai',
      'chive',
      'cucumber',
      'longbean',
      'radish',
      'cabbage',
      'tofu',
    ],
    count: [4, 8],
    takes: ['veg.qingcai', 'pumpkin', 'potato', 'egg', 'straw'],
    drop: true,
    stripe: ['G', '%'],
    lines: {
      hawk: ['露水嫩菜、新菜种，自家地里现掐的！', '水灵青菜和嫩豆腐，顺手捎一把回家！'],
      fair: ['赶集挑菜苗咯！南瓜种青菜种样样齐全！', '来来来，多抓一把葱不算钱，乡邻过来瞅瞅！'],
      take: ['你家种的菜比我的还水灵！按好价收了！', '土鸡蛋个头真大，铜板点清拿好！'],
      full: '今儿散钱收光啦，下回再收你的。',
    },
  },
  tea: {
    name: '山货茶摊',
    owner: '云姑',
    who: '后山种茶的姑娘，怕生话少，却最懂山货成色。',
    wares: ['tea', 'herb', 'mugwort', 'chestnut', 'mushroom', 'shoot', 'peachGum'],
    count: [3, 6],
    takes: ['mugwort', 'mushroom', 'pinecone', 'cicadaShell', 'malan'],
    drop: false,
    fairOnly: true,
    stripe: ['2', 'W'],
    lines: {
      hawk: ['后山新炒的茶叶……还有晒干的艾草香草。', '刚采的菌子和栗子，需要的过来看看吧。'],
      fair: ['今天集日带了头茬新茶和桃胶，闻着很香的。', '山里采的鲜货都摆在这儿了……不贵。'],
      take: ['这艾草和菌子采得真干净，我收下了。', '松果干爽，炒茶正合适，铜钱给你。'],
      full: '今天钱匣里的铜钱花完了……下次再收好吗？',
    },
  },
  peddler: {
    name: '货郎摊',
    owner: '老陈',
    who: '走十里八乡的摇鼓货郎，什么日用小物件都能从担底摸出来。',
    wares: ['salt', 'chili', 'candy', 'wine', 'niangao', 'cake', 'strip', 'basket'],
    count: [4, 8],
    takes: ['camphorWood', 'pebble', 'lotusPod', 'caltrop', 'wildPeach'],
    drop: false,
    stripe: ['h', '%'],
    lines: {
      hawk: ['叮咚叮咚！盐油干椒麦芽糖，日用小物全有！', '竹篮竹篾旧针线，家里缺啥顺脚瞧一眼！'],
      fair: ['集日大摊开张！外乡好酒年糕全挑来啦！', '拨浪鼓一响好货到，走过路过别错过！'],
      take: ['好樟木块和莲蓬！带回镇上准抢手，钱拿好！', '山野鲜货我最爱收，秤杆给你翘高一星！'],
      full: '今儿收山货把钱匣掏空啦，改天带足铜钱再来！',
    },
  },
  fish: {
    name: '鱼摊',
    owner: '钱嫂',
    who: '下游码头跑鱼鲜的利落妇人，看鱼鳃一捏便知鲜活。',
    wares: ['fish', 'shrimp', 'crab', 'saltfish', 'lotusPod', 'caltrop'],
    count: [3, 6],
    takes: ['fish', 'willowTwig', 'strip'],
    drop: true,
    stripe: ['c', '%'],
    lines: {
      hawk: ['刚出水的活鲫鱼河虾，还扑腾甩尾呢！', '鲜河鱼、晒透的咸鱼，炖汤下饭都绝！'],
      fair: ['集日鲜货满盆！大鲤鱼大肥蟹全捞上来啦！', '瞧这鱼鳃红亮亮的，晚来半刻好鱼全卖光！'],
      take: ['哟，这尾鱼溜得真肥！按鲜活好价收了！', '成色真亮堂，往后钓着大鱼全送我这儿来！'],
      full: '今儿收鱼太多钱匣空啦，留着下回集日我再收！',
    },
  },
});

export const STALL_IDS = Object.freeze(Object.keys(STALLS));
export const stallShop = id => 'stall.' + id;
/** 'stall.fish' → 'fish'；不是摊子（杂货铺、茶摊、乱填的）给 null。 */
export const stallOf = shop =>
  typeof shop === 'string' && shop.startsWith('stall.') && Object.hasOwn(STALLS, shop.slice(6))
    ? shop.slice(6)
    : null;

// 清早的便条：明天赶集、今天赶集（core.post 的标题和正文）
export const FAIR_NOTES = Object.freeze({
  eve: {
    title: '明天赶集',
    text: '茶摊上都在说，明天是集日，路南三个摊子都会摆出来。鱼摊集日收鱼最多。',
  },
  day: { title: '今天赶集', text: '村口一早就热闹起来了，路南摆了三个摊子：{names}。' },
});
