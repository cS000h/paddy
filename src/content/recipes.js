// 0.12 的菜谱、做法、火候七档。掌火的节拍在 cook-fire.js。
// prettier-ignore
// prettier-ignore
export const METHODS={stew:'煮',fry:'炒',roast:'烤',mix:'拌'};
// prettier-ignore
export const HEAT={stew:{word:'文火慢炖'},fry:{word:'旺火快炒'},roast:{word:'中火慢烤'}};
// prettier-ignore
export const QUALITY={
  great:{name:'拿手',prefix:'拿手',full:1.25,uses:1,mood:3,xp:2,line:'火候正好，香气一下子就出来了。'},
  good:{name:'恰好',prefix:'',full:1.1,uses:0,mood:2,xp:1,line:'火候刚刚好。'},
  plain:{name:'家常',prefix:'',full:1,uses:0,mood:1,xp:0,line:'稳稳当当，是家常的味道。'},
  under:{name:'欠点火',prefix:'夹生的',full:.85,uses:-1,mood:0,xp:0,line:'火小了点，有几口还夹生。'},
  over:{name:'火大了',prefix:'焦边',full:.85,uses:-1,mood:0,xp:0,line:'火大了些，锅底起了一层焦边。'},
  raw:{name:'没熟透',prefix:'半生的',full:.6,uses:-9,mood:-1,xp:0,line:'火候差得远，吃着还是生的。'},
  burnt:{name:'糊了',prefix:'糊了的',full:.6,uses:-9,mood:-1,xp:0,line:'一股焦糊味，锅底黑了一片。'},
};
// prettier-ignore
/** @type {[string, string, string[], string[]?][]} */
// prettier-ignore
export const RECIPES=[
  ['白粥','stew',['rice']],['蛋炒饭','fry',['rice','egg']],['青菜蛋炒饭','fry',['rice','egg','veg.qingcai']],['炭烤饭团','roast',['rice']],
  ['炒鸡蛋','fry',['egg']],['蛋花汤','stew',['egg']],['茶叶蛋','stew',['egg','tea']],['豆子饭','stew',['rice','bean']],
  ['土豆炖豆子','stew',['potato','bean']],['香草烤土豆','roast',['potato','herb']],['炭烤土豆','roast',['potato']],['清炒土豆丝','fry',['potato']],
  ['土豆汤','stew',['potato']],['姜茶','stew',['ginger']],['香草茶','stew',['herb']],
  ['鱼汤','stew',['fish']],['香草烤鱼','roast',['fish','herb']],['炭烤鱼','roast',['fish']],['鱼片粥','stew',['rice','fish']],['姜丝鱼汤','stew',['fish','ginger']],['三鲜汤','stew',['fish','mushroom','egg']],
  ['油焖春笋','fry',['shoot']],['春笋蛋花汤','stew',['shoot','egg']],['笋丁焖饭','stew',['rice','shoot']],['笋丝炒蛋','fry',['shoot','egg']],
  ['荠菜粥','stew',['rice','shepherd']],['荠菜炒蛋','fry',['shepherd','egg']],['韭菜炒蛋','fry',['chive','egg']],
  ['青菜蛋花汤','stew',['veg.qingcai','egg']],['清炒时蔬','fry',['veg.qingcai']],['青菜汤','stew',['veg.qingcai']],['青菜焖饭','stew',['rice','veg.qingcai']],['春笋菌菇汤','stew',['shoot','mushroom']],
  ['凉拌黄瓜','mix',['cucumber']],['黄瓜炒蛋','fry',['cucumber','egg']],['黄瓜拌番茄','mix',['cucumber','tomato']],['番茄炒蛋','fry',['tomato','egg']],
  ['番茄蛋花汤','stew',['tomato','egg']],['糖拌番茄','mix',['tomato']],['干煸豆角','fry',['longbean']],['豆角焖饭','stew',['rice','longbean']],['薄荷凉饮','mix',['herb']],
  ['南瓜粥','stew',['rice','pumpkin']],['烤南瓜','roast',['pumpkin']],['烤栗子','roast',['chestnut']],['栗子焖饭','stew',['rice','chestnut']],
  ['栗子炖南瓜','stew',['pumpkin','chestnut']],['菌子汤','stew',['mushroom']],['炒菌子','fry',['mushroom']],['芋头羹','stew',['taro']],
  ['萝卜汤','stew',['radish']],['凉拌萝卜丝','mix',['radish']],['萝卜鱼汤','stew',['fish','radish']],['白菜豆子煲','stew',['cabbage','bean']],
  ['醋溜白菜','fry',['cabbage']],['白菜蛋花汤','stew',['cabbage','egg']],['芋头焖饭','stew',['rice','taro']],
  ['肉片汤','stew',['pork']],['红烧肉','stew',['pork'],['soy']],['小炒肉','fry',['pork'],['chili']],['糖醋里脊','fry',['pork'],['sugar','vinegar']],['炭烤肉串','roast',['pork']],
  ['青菜炒肉片','fry',['pork','veg.qingcai']],['韭菜炒肉丝','fry',['pork','chive']],['土豆炖肉','stew',['pork','potato']],['春笋烧肉','stew',['pork','shoot']],['芋头扣肉','stew',['pork','taro'],['soy']],
  ['白菜炖肉','stew',['pork','cabbage']],['豆角焖肉','stew',['pork','longbean']],['南瓜蒸肉','stew',['pork','pumpkin']],['肉末豆腐','fry',['pork','tofu']],['肉丝蛋炒饭','fry',['rice','pork','egg']],
  ['清炖鸡汤','stew',['chicken']],['红烧鸡块','stew',['chicken'],['soy']],['辣子鸡','fry',['chicken'],['chili']],['烤鸡','roast',['chicken']],['叫花鸡','roast',['chicken','herb']],
  ['土豆烧鸡','stew',['chicken','potato']],['栗子焖鸡','stew',['chicken','chestnut']],['菌菇炖鸡','stew',['chicken','mushroom']],['姜葱炒鸡','fry',['chicken','ginger'],['scallion']],
  ['羊肉汤','stew',['mutton']],['萝卜炖羊肉','stew',['mutton','radish']],['葱爆羊肉','fry',['mutton'],['scallion']],['炭烤羊肉串','roast',['mutton']],['姜母羊肉煲','stew',['mutton','ginger'],['wine']],
  ['红烧鱼','stew',['fish'],['soy']],['糖醋鱼','fry',['fish'],['sugar','vinegar']],['豆腐鱼汤','stew',['fish','tofu']],
  ['家常豆腐','fry',['tofu'],['soy']],['小葱拌豆腐','mix',['tofu'],['scallion']],['青菜豆腐汤','stew',['veg.qingcai','tofu']],['白菜豆腐煲','stew',['cabbage','tofu']],
  ['腊肉炒笋','fry',['bacon','shoot']],['腊肉焖饭','stew',['rice','bacon']],['腊肉炒青菜','fry',['bacon','veg.qingcai']],['蒸咸鱼','stew',['saltfish']],['咸鱼焖饭','stew',['rice','saltfish']],
  ['酸辣土豆丝','fry',['potato'],['vinegar','chili']],['糖醋萝卜','mix',['radish'],['sugar','vinegar']],['拍黄瓜','mix',['cucumber'],['vinegar']],['葱花炒蛋','fry',['egg'],['scallion']],
  ['辣炒豆角','fry',['longbean'],['chili']],['酱香芋头','stew',['taro'],['soy']],
  // G-30 补的家常搭配（和已有的重了的、拿姜当调料的照游戏里的改过；马兰头不能生拌，那道没收）
  ['河蚌豆腐汤','stew',['mussel','tofu','ginger'],['wine']],['腌笃鲜','stew',['bacon','shoot','pork'],['wine']],
  ['芋头烧肉','stew',['pork','taro'],['soy','sugar']],['番茄炖土豆','stew',['tomato','potato'],['scallion','sugar']],
  ['桃胶野桃甜羹','stew',['peachGum','wildPeach'],['sugar']],['莲蓬菱角甜汤','stew',['lotusPod','caltrop'],['sugar']],
  ['咸鱼炖豆腐','stew',['saltfish','tofu','ginger'],['chili']],['荠菜鸡蛋汤','stew',['shepherd','egg'],['scallion']],
  ['豆子炖肉','stew',['bean','pork'],['soy','wine']],['辣炒螺蛳','fry',['snail'],['chili','wine']],
  ['葱油河虾','fry',['shrimp'],['scallion','wine']],['青菜炒菌子','fry',['veg.qingcai','mushroom'],['soy']],
  ['肉末炒豆角','fry',['pork','longbean'],['soy','chili']],['地耳炒蛋','fry',['earthEar','egg'],['scallion']],
  ['腊肉炒蕨菜','fry',['bacon','brake'],['chili']],['姜葱炒毛蟹','fry',['crab','ginger'],['scallion']],
  ['腊肉菜饭','fry',['rice','bacon','veg.qingcai'],['soy']],['土豆炒肉片','fry',['potato','pork'],['soy','scallion']],
  ['葱香煎豆腐','fry',['tofu'],['soy','scallion']],['香辣烤鱼','roast',['fish','ginger'],['chili']],
  ['香辣烤羊肉','roast',['mutton'],['chili','scallion']],['糖烤芋头','roast',['taro'],['sugar']],
  ['糖烤栗子','roast',['chestnut'],['sugar']],['酱烤春笋','roast',['shoot'],['soy']],
  ['酸辣拍黄瓜','mix',['cucumber'],['vinegar','chili']],
];

// 刀工沿用 0.12：合适的切法放宽火候三格；切丝多花一点体力。
export const CUTS = {
  chunk: { name: '切块', word: '块', fit: ['stew', 'roast'], tip: '炖、烤合适；炒不透，拌不入味' },
  shred: {
    name: '切丝',
    word: '丝',
    fit: ['fry', 'mix'],
    tip: '炒、拌合适，费工夫；一炖就烂，一烤就焦',
  },
  slice: {
    name: '切片',
    word: '片',
    fit: ['fry', 'stew', 'mix'],
    tip: '炒、煮、拌都行；烤着容易干',
  },
};

/**
 * 一锅饭的份数和饱腹。饱腹守恒：一锅的饱腹是下锅食材加起来（再乘火候、当季），平分到几份里；
 * 锅不会凭空多出粮食。放几样出几份写在 servings 里（下标是食材数），每份最多 cap。
 */
export const POT = Object.freeze({ servings: [0, 1, 1, 2], cap: 40 });

/**
 * 滋味：调料、火候、照不照菜谱管的是好不好吃，不管分量。分数照下面加减，再按 stars 换成一到三分：
 * 分数到 stars[0] 是二分，到 stars[1] 是三分。三分的菜吃了心情多 1、增益多管 1 回，送人多一分情面；
 * 一分的心情少 1、增益少管 1 回。
 */
export const FLAVOR = Object.freeze({
  base: 1,
  quality: Object.freeze({ great: 2, good: 1, plain: 0, under: -1, over: -1, raw: -2, burnt: -2 }),
  named: 1, // 照菜谱做的
  fit: 1, // 调料放得对路（放了两勺只算一回）
  clash: -1, // 每一勺不对路的
  seasonal: 1,
  stars: Object.freeze([2, 4]),
  words: Object.freeze(['', '寻常', '有滋味', '好滋味']),
});

/**
 * 调料跟什么对路：做法对得上，并且食材里有一样带着这些标签（没写标签的不挑食材）。
 * 照菜谱放的调料一律算对路。
 */
// prettier-ignore
export const SPICE_FIT = Object.freeze({
  soy:      { methods: ['stew', 'fry', 'roast'], tags: ['meat', 'umami', 'staple', 'soft', 'fishy'] },
  vinegar:  { methods: ['fry', 'mix'], tags: ['green', 'crisp', 'raw', 'staple', 'fishy'] },
  sugar:    { methods: ['fry', 'mix', 'roast', 'stew'], tags: ['sweet', 'sour', 'meat', 'fishy', 'crisp'] },
  chili:    { methods: ['fry', 'stew', 'roast'], tags: ['meat', 'staple', 'green', 'umami', 'fishy'] },
  scallion: { methods: ['fry', 'mix', 'stew'], tags: [] },
  wine:     { methods: ['stew', 'fry', 'roast'], tags: ['meat', 'fishy'] },
});

/**
 * 吃腻了：最近吃的 window 顿里，同一道菜（不算火候前缀）已经吃过几回，就照下标打折饱腹、扣心情。
 * 换着花样吃不吃亏，一道菜吃到底会越吃越没味。
 */
export const TIRED = Object.freeze({
  window: 6,
  full: Object.freeze([1, 0.85, 0.7, 0.55]),
  mood: Object.freeze([0, -1, -2, -3]),
  words: Object.freeze(['', '又是这个', '有点吃腻了', '吃腻了']),
});
