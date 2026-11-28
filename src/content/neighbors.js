// 乡邻买卖和以物易物（Gemini G-32 回稿；规则在 sim/plugins/neighbors.js）。
//   wants   这户会想要的东西（照 kindOf 比：写 fish 就是各种鱼都要）；每天从当季的里头挑 perDay 样。
//           东西本身有季节的照东西的季节；seasons 给本身不分季节、但这户只在某几季要的（0 春 1 夏 2 秋 3 冬）
//   gives   这户拿得出来换的东西；pairs 是「拿 A 来就换 B」的偏好（稿里写明的那几对）
//           换多少照两样东西的价钱大致相等（见 swapFor），换不出等值的就不换，免得成了刷钱的路子
//   buys    false 的只换不买（小乔是铺子帮工，手头没闲钱）
//   lines   开口问（平常、急着要、随口三种，{items} 换成今天要的东西）、买下、换成、钱不够、今天做够了
export const NEIGHBOR_RULES = Object.freeze({
  perDay: 2,
  dealsPerDay: 2,
  swapCap: 1.25,
  swapMax: 3,
});

export const NEIGHBORS = Object.freeze({
  shi: {
    wants: ['wood', 'seed.qingcai', 'straw', 'pebble', 'tofu'],
    seasons: { pebble: [1, 2] },
    gives: ['veg.qingcai', 'seedPumpkin', 'strip', 'rice'],
    pairs: { wood: 'veg.qingcai', straw: 'seedPumpkin', tofu: 'strip', pebble: 'rice' },
    lines: {
      ask: [
        '你那儿有多余的{items}吗？老汉收一点。',
        '地里正等着用{items}，你手头若有，匀我一份？',
        '顺嘴一问，今儿翻着{items}没？',
      ],
      sold: ['成色实在，钱点清，两不相欠。', '嗯，这{item}扎实，铜板拿好。'],
      swapped: ['拿自家地里的换，谁也不吃亏，好。', '以物换物省铜板，拿着吧。'],
      broke: '手头散钱不多了，拿我这儿的东西跟你换，成不？',
      done: '今儿够使了，明儿再看。',
    },
  },
  gui: {
    wants: ['salt', 'cabbage', 'radish', 'longbean', 'herb', 'chili'],
    seasons: { chili: [2, 3] },
    gives: ['egg', 'pickle', 'cake', 'chicken'],
    pairs: { longbean: 'egg', salt: 'pickle', cabbage: 'cake', chili: 'chicken' },
    lines: {
      ask: [
        '隔壁的，你那儿可有{items}？嫂子正想买点。',
        '哎哟灶上正等{items}下坛呢，快匀嫂子一份！',
        '回头你要是有富余{items}，别急着全卖铺子呀！',
      ],
      sold: ['真水灵！钱塞你手里了，数数够不够！', '好货！比集上摊子挑的还齐整，拿好铜钱！'],
      swapped: ['拿自家鸡蛋腌菜跟你换，两头都划算！', '这买卖做得真舒坦，拿回去趁鲜吃！'],
      broke: '今儿钱匣见底咯，拿嫂子腌菜鸡蛋跟你换行不？',
      done: '今儿买齐啦，再买家里坛子装不下咯！',
    },
  },
  aman: {
    wants: ['veg.qingcai', 'cucumber', 'camphorWood', 'niangao', 'wildPeach'],
    gives: ['bean', 'potato', 'candy', 'salt'],
    pairs: { 'veg.qingcai': 'bean', wildPeach: 'potato', camphorWood: 'candy', cucumber: 'salt' },
    lines: {
      ask: [
        '嘿！你包里有{items}吗？卖我凑凑车筐！',
        '快快快！明早进镇缺{items}，有多少我收多少！',
        '哟，今儿收获不错吧，有{items}记得想着我！',
      ],
      sold: ['痛快！铜板拿好，我这趟板车又有赚头啦！', '好成色！拉进镇上准保抢着要！'],
      swapped: [
        '哈哈换着使最方便，拿去拿去，别跟我客气！',
        '这把换得值！回头我拉菜顺道再给你捎好货！',
      ],
      broke: '哎哟兜里铜板买完货花光了，拿车上东西跟你换呗？',
      done: '今儿车筐塞满啦，明儿再来找你收！',
    },
  },
  qiao: {
    wants: ['fish', 'lotusFlower', 'chestnut', 'berry', 'lotusPod'],
    gives: ['seed.qingcai', 'candy', 'chili', 'bean'],
    pairs: { fish: 'seed.qingcai', berry: 'candy', lotusPod: 'chili', lotusFlower: 'bean' },
    buys: false,
    lines: {
      ask: [
        '悄悄问一句，你手里有{items}不？咱俩换着来？',
        '救命！掌柜闹脾气要{items}，快拿来跟我换！',
        '要是碰见水灵的{items}，记得先留给我瞧一眼呀！',
      ],
      sold: ['私房钱虽然薄，这{item}真值，铜钱拿好！', '买到好东西啦，掌柜肯定高兴坏了！'],
      swapped: ['嘿嘿以物易物最划算，你挑的这包准不亏！', '成交！掌柜替我点过头啦，下回还找你换！'],
      broke: '我这月钱还没发呢，别谈钱，直接拿东西换呗！',
      done: '今儿够啦，再换柜台底下真塞不下了！',
    },
  },
  zhou: {
    wants: ['strip', 'wood', 'willowTwig', 'caltrop', 'wine'],
    seasons: { wood: [2, 3], wine: [2, 3] },
    gives: ['fish.crucian', 'shrimp', 'pebble'],
    pairs: { strip: 'fish.crucian', wine: 'fish.crucian', willowTwig: 'shrimp', caltrop: 'pebble' },
    lines: {
      ask: [
        '小友，手头可有富余的{items}？老头子收点。',
        '船上正缺{items}使呢，你有的话匀老头子一份？',
        '不急，哪天顺路捡着{items}，带渡口来便是。',
      ],
      sold: ['好物件，船钱正好宽裕，拿去买茶喝。', '嗯，顺手得很，这几文铜板收好。'],
      swapped: ['拿刚起网的鲜河货换，比花铜钱实在哩。', '鱼换物、物换情，老头子觉着顶划算。'],
      broke: '散钱买桐油花光喽，拿鱼篓里鲜鱼跟你换，成不？',
      done: '今儿船上备齐啦，歇晌喝茶去喽。',
    },
  },
  yun: {
    wants: ['mugwort', 'pinecone', 'mushroom', 'peachGum', 'malan', 'cicadaShell'],
    gives: ['tea', 'herb', 'chestnut', 'shoot'],
    pairs: {
      mugwort: 'tea',
      peachGum: 'tea',
      pinecone: 'herb',
      mushroom: 'chestnut',
      malan: 'shoot',
    },
    lines: {
      ask: [
        '请问……你手头有{items}吗？山里正好用得上。',
        '炒青正缺{items}……如果你有，能匀我一点吗？',
        '以后上山若翻到{items}，可以拿来换点新茶。',
      ],
      sold: ['成色很干净……钱点好了，谢谢你。', '正好是我要的，铜钱拿好。'],
      swapped: ['拿刚炒好的茶跟你换，希望你喝着顺口。', '这样换真好……谢谢你跑一趟后山。'],
      broke: '铜钱都在镇上换农具了……拿茶或香草跟你换好吗？',
      done: '今天已经够用了……谢谢你。',
    },
  },
});

// 各户共用的话。
export const NEIGHBOR_WORDS = Object.freeze({
  none: '“今天家里什么都不缺。”',
  notWanted: '他今天不要这个',
  far: '走到他跟前再说',
  noSwap: '他家今天拿不出合适的东西跟你换',
});
