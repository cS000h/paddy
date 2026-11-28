// 小院翻修（G-23 备选 B「一处一桩人情事」，加上 C 的彩头台）。规则在 sim/plugins/yard-fix.js。
// 定下的：每处只有没修、修好两样；谁都能自己修，落脚木工老鲁当天在村里就请他搭手，材料省一半、不用检定；
// 彩头台只要鹅卵石和稻草，有青瓷片多一圈嵌边；不衰减；修好不加效率，只多一个招人进院的由头。
// 材料照 G-23 第五节的「多、少」：多是 3 份，少是 1 份（暂定，等村志跑起来再调）。
// 话照 Gemini G-25 回稿。审稿时定的：自己动手的检定没过只花力气、不扣材料，能再试；
// 挂架上挂什么按季节换（春柳条、夏艾草、秋冬干菜）；彩头台上的彩头还照 G-06 摆满日子，不另做收回。
// 进院的十二件小事先接没有选项的那几件，带选项的等 M10 做事攒性情时再接。

/**
 * 六处：name 名字，cost 材料，coins 铜钱，check 自己动手看哪一项（null 不检定），
 * at 修好的样子画在小院哪一格（左上那一格；图在 art/yard-fix.js），
 * open 走到跟前看一眼时说的，help 老鲁搭手时说的，fail 没修成，near 差一点，
 * done 修好那一下，passer 路过的村民说的一句。
 */
// prettier-ignore
export const YARD_FIX = Object.freeze({
  bench: {
    name: '檐下长凳', cost: { camphorWood: 3, wood: 1 }, coins: 2, check: 'tige', at: [10, 9],
    open: '雨点顺檐角直淌，若在檐下搭条长凳垂帘，雨天也有处歇脚。',
    help: '“好一块樟木！我替你推两刨子，省一半木料还稳当。”',
    fail: '凳腿略晃了半寸，回头还得垫块木楔再紧一紧。',
    near: '樟木沉得很——体格再壮实些，就能一个人刨平钉牢。',
    done: '檐下多了一条温润樟木长凳，风吹竹帘轻晃，看着真舒坦。',
    passer: ['zhou', '“你这檐下长凳真妥帖，老头子下回遇急雨正好来歇脚！”'],
  },
  well: {
    name: '井边石台', cost: { pebble: 3, strip: 1 }, coins: 0, check: 'chijia', at: [18, 18],
    open: '水井边踩出一圈滑溜溜的烂泥，拿鹅卵石铺一圈排水台才好。',
    help: '“顺手帮把石槽顺直咯，保准十年不积水。”',
    fail: '边角两块石头有点翘，还得重新垫点细土。',
    near: '石块大小不匀——持家再熟些，就能拼得严丝合缝。',
    done: '井栏旁铺开一圈亮净溪石台，打水灌壶再也不沾泥点。',
    passer: ['gui', '“井边铺了鹅卵石清爽多了！明儿我端筐萝卜来借水洗洗！”'],
  },
  coop: {
    name: '竹编鸡窝', cost: { strip: 3, straw: 3, wood: 1 }, coins: 0, check: 'chijia', at: [16, 12],
    open: '旧鸡窝草顶塌了一角，里头潮乎乎的，得拿竹篾编个结实顶棚。',
    help: '“小活一桩，我帮你把木框钉牢，刮大风也吹不歪。”',
    fail: '顶棚扎得略松，再顺两根竹篾压紧就好。',
    near: '竹篾老往外弹——持家再熟些，就能编得密实。',
    done: '竹编鸡窝又干爽又结实，母鸡钻进去舒服地抖了抖羽毛。',
    passer: ['shi', '“竹顶密实稻草干爽，这鸡窝搭得像个过日子的样儿。”'],
  },
  platform: {
    name: '院角彩头台', cost: { pebble: 1, straw: 3 }, coins: 0, check: null, at: [11, 10],
    extra: 'shard', // 有青瓷片就嵌一圈边，没有也能修
    open: '院角空着可惜，垒石台垫稻草，收了彩头正好摆上。',
    help: '“台角我给你收齐了，摆再沉的瓜王也压不塌！”',
    done: '院角石台齐整亮堂，就等着摆上全村最出彩的收成。',
    doneExtra: '台沿嵌了一圈温润的青瓷片。',
    passer: ['aman', '“好家伙，院角垒出这么体面的台子，快把大南瓜王搬上去！”'],
  },
  rack: {
    name: '篱笆门竹挂架', cost: { willowTwig: 3, strip: 1, pinecone: 1 }, coins: 0, check: 'chijia', at: [11, 14],
    open: '旧篱笆门松垮了，拿柳条重扎一道，门边再支个竹挂架。',
    help: '“门轴我给你削圆了，开起来一点不吱呀响！”',
    fail: '门闩略微歪了点，再削一根竹销子插紧就行。',
    near: '柳条老打滑——持家再熟些，就能编出整齐门框。',
    done: '院门焕然一新，右侧两层竹挂架正好晾艾草、挂干菜。',
    passer: ['yun', '“篱笆门编得真齐整……架上挂上艾草，风一吹满路清香。”'],
  },
  shed: {
    name: '灶边柴棚', cost: { wood: 3, straw: 3, camphorWood: 1 }, coins: 0, check: 'tige', at: [13, 9],
    open: '柴堆直接搁地上容易返潮，灶边搭个架空小柴棚，雨天烧火才利索。',
    help: '“坡顶斜度给你算好了，大雨浇下来一滴不漏进柴里。”',
    fail: '草顶铺得略薄，得多添两把稻草压严实。',
    near: '棚顶梁有点沉——体格再壮实些，就能稳稳架上。',
    done: '灶边多了座齐腰高的干柴棚，往后雨天掌火再不怕湿柴冒烟。',
    passer: ['qiao', '“你这小院越拾掇越像画了，回头我带炭笔来写生行不？”'],
  },
});

export const FIX_IDS = Object.freeze(Object.keys(YARD_FIX));

/** 请老鲁搭手：他今天在村里，材料省一半（往上取整），不用检定。自己动手检定的坎。 */
export const FIX_HELP = Object.freeze({ passer: 'carpenter', name: '老鲁', dc: 5, near: 15 });

/** 挂架上按季节挂什么（春夏秋冬），图在 art/yard-fix.js。 */
export const RACK_SEASON = Object.freeze([
  'rackWillow',
  'rackMugwort',
  'rackDriedVeg',
  'rackDriedVeg',
]);

/**
 * 修好以后招进院来的人（G-25 第三节）。每处可以有几件，从上往下看头一件对得上的：
 * when 什么时候（wet 下不下雨、slots 一天第几段、seasons 哪几季、every 隔几天一回），
 * who 谁来（按顺序挑第一个此刻在外头的），doing 看人页上那一句（各件不同），
 * say 跟他说话时先说的一句，gift 留下什么，news 顺嘴捎来一条村里的事，borrow 借走什么，
 * mood 你心情涨多少。一处一天一回。彩头台不招一个人，招一圈围观的（院里摆着彩头的那几天，午后）。
 */
// prettier-ignore
export const YARD_GUESTS = Object.freeze({
  bench: [
    { when: { wet: true, slots: [1, 2] }, who: ['zhou', 'aman', 'gui', 'qiao'],
      doing: '进院躲雨，坐在檐下长凳上',
      say: '“雨来得急，借你檐下长凳躲半刻！这雨一停河湾大鱼准浮头！”',
      gift: ['shepherd', 1] },
  ],
  well: [
    { when: { wet: false, slots: [0, 1] }, who: ['gui'],
      doing: '借你的井水洗萝卜',
      say: '“井台铺得真亮堂，借你一桶凉水洗萝卜！顺嘴告诉你——”',
      news: true, gift: ['radish', 1] },
    { when: { wet: false, slots: [2], seasons: [1, 2] }, who: ['aman'],
      doing: '舀桶井水冲把脸',
      say: '“热坏了！借你青石台舀桶井水冲把脸！哎哟真凉快！”',
      gift: ['bean', 1] },
  ],
  coop: [
    { when: { wet: false, slots: [0] }, who: ['gui'],
      doing: '隔着篱笆夸你的鸡窝',
      say: '“瞧你这竹顶鸡窝编得多精神，母鸡毛都亮了！”', mood: 1 },
    { when: { wet: false, slots: [2] }, who: ['qiao'],
      doing: '抱着掌柜隔篱看母鸡',
      say: '“掌柜别扑！人家的鸡窝编得结实着呢，钻不进去！”', mood: 2 },
  ],
  platform: [{ when: { slots: [2] } }],
  rack: [
    { when: { wet: false, slots: [3] }, who: ['yun'],
      doing: '站在竹挂架前看你晾的草药',
      say: '“路过闻见艾草香……你晒得真匀，一点没发黑。”', mood: 2 },
    { when: { wet: false, slots: [0], every: 3 }, who: ['shi'],
      doing: '顺手替你按紧门闩',
      say: '“你的柳条门倒挺经吹，门闩我帮按紧了。干菜挂背风面才晒得透。”' },
  ],
  shed: [
    { when: { wet: true, slots: [0, 3] }, who: ['gui', 'aman'],
      doing: '来借两根干柴引火',
      say: '“雨下得我家柴全潮了，借你棚里两根干柴引火！”',
      borrow: ['wood', 1] },
  ],
});

/** 院里摆着彩头时围观的人说的一句：[头一回看见, 看了几天以后]（G-25 第四节）。 */
// prettier-ignore
export const PLATFORM_LOOK = Object.freeze({
  shi:  ['“好沉一颗彩头！摆在院角石台上，全村田头都跟着长脸。”', '“天天路过瞅一眼，越看越扎实，今年准保风调雨顺。”'],
  gui:  ['“哎哟真喜庆！垫着金稻草往石台上一放，整条巷都亮堂了！”', '“邻村来串门的都夸你院角那颗彩头，嫂子听着也得意！”'],
  aman: ['“好家伙！这彩头摆在门口，我拉车路过都忍不住多看两眼！”', '“哈哈，每天早起看一眼你家石台，干活都添三分精神！”'],
  qiao: ['“哇！摆在石台上像镇店之宝似的，借我画进小册子呗？”', '“掌柜天天蹲在石台边晒太阳，怕是把它当自家宝贝啦！”'],
  zhou: ['“老头子活这么大岁数，头回见人把好彩头供得这么雅致！”', '“风吹日晒依然水灵，地气养人，你这小院聚福气哩。”'],
  yun:  ['“真好看……摆在石台上，院子一下子暖和起来了。”', '“每次下山路过看见它，心里都会悄悄高兴一下呢。”'],
});
