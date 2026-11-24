// 人物设定表。这是全工程唯一的人物来源：新增或改名先改这里，不要在别处另起人物。
// 六位村民沿用《稻间》0.12 的设定；`look` 对应 src/art/people.js 里的外观。
// 人物不画近脸、不定长相，只有远处的小人。

export const HERO = 'hero';

// likes：爱吃哪一种好处的饭菜（见 content/body.js 的 BUFFS）；taste：一句话说口味；
// treats：收到会特别高兴的东西（物品的键）。
// seal：和他说话时，对话框里那枚名字印上刻的字（人物不画脸，用印代替）。
// prettier-ignore
export const PEOPLE = Object.freeze({
  hero: { id: 'hero', name: '你', role: '借住小院的后生', look: 'hero' },
  shi: { id: 'shi', favorite: '土豆炖豆子', name: '石伯', role: '种了一辈子地', look: 'shi', seal: '石', hobby: '编竹筐、看天',
    likes: 'hearty', taste: '扎实顶饱的饭菜', treats: ['tea', 'bean', 'strip'] },
  gui: { id: 'gui', favorite: '青菜蛋花汤', name: '桂嫂', role: '隔壁邻居', look: 'gui', seal: '桂', hobby: '腌菜、纳鞋底、听戏',
    likes: 'warm', taste: '热乎乎的汤', treats: ['ginger', 'egg', 'herb'] },
  aman: { id: 'aman', favorite: '蛋炒饭', name: '阿满', role: '送菜的', look: 'aman', seal: '满', hobby: '哼小调、跟人抬杠',
    likes: 'hearty', taste: '扎实顶饱的家常饭', treats: ['cake', 'melon', 'pickle'] },
  qiao: { id: 'qiao', favorite: '香草烤土豆', name: '小乔', role: '杂货铺帮工', look: 'qiao', seal: '乔', hobby: '画画、跟猫斗智',
    likes: 'fresh', taste: '带香草味的清爽吃食', treats: ['melon', 'cake', 'fish'] },
  zhou: { id: 'zhou', favorite: '姜丝鱼汤', name: '老周', role: '渡口撑船的', look: 'zhou', seal: '周', hobby: '讲古、补网、哼渔歌',
    likes: 'warm', taste: '热汤，最好带点姜', treats: ['ginger', 'pickle', 'tea'] },
  yun: { id: 'yun', favorite: '南瓜粥', name: '云姑', role: '后山种茶的', look: 'yun', seal: '云', hobby: '唱山歌、认草药',
    likes: 'treat', taste: '甜糯的东西', treats: ['chestnut', 'mushroom', 'cake'] },
});

// 过节的吃食，谁收到都高兴。
export const FESTIVE = Object.freeze(['zongzi', 'mooncake', 'niangao']);

// 住在村里、会在地图上走动的人。
export const ON_MAP = Object.freeze(['shi', 'gui', 'aman', 'qiao', 'zhou', 'yun']);

// 村民的人物档案（执行方案「已定的事」第 11 条）：三个性情、出身线和级、根骨天资。
// 主角的在开局时定；过客的照身份推出来（sim/plugins/persona.js）。性情和出身的名字见 content/traits.js。
// prettier-ignore
export const PERSONA = Object.freeze({
  shi:  { tempers: ['diligent', 'honest', 'stingy'], line: ['farmer', 3], innate: [] },
  gui:  { tempers: ['gregarious', 'generous', 'ambitious'], line: ['cook', 3], innate: ['gourmet'] },
  aman: { tempers: ['gregarious', 'honest', 'hasty'], line: ['peddler', 2], innate: [] },
  qiao: { tempers: ['gregarious', 'sly', 'ambitious'], line: ['teahouse', 2], innate: [] },
  zhou: { tempers: ['calm', 'content', 'trusting'], line: ['boatman', 4], innate: ['steady'] },
  yun:  { tempers: ['diligent', 'shy', 'paranoid'], line: ['herbalist', 2], innate: [] },
});

// 作息（沿用 0.12）。白天按开始的钟点分四段：06、09、12、15 点；到 `home` 点钟，
// 除了 `stay` 里的人都回家，从画面上消失。
export const ROUTINE_DAY = Object.freeze({
  slots: Object.freeze([6 * 60, 9 * 60, 12 * 60, 15 * 60]),
  home: 20 * 60,
  stay: Object.freeze({ gui: 'yard' }),
});

// 每人一张作息：从上往下看，`when` 里的情形全都对得上的那一条就是今天的去处，
// 没写 `when` 的是平常日子。`go` 是四段时间各去哪儿：
// field 自家院外的田、yard 小院、tea 樟树茶摊、market 杂货铺、creek 溪边、river 渡口、hill 后山。
// 情形：wet 下雨、heavy 大雨、fog 起雾、winter 冬天、fair 集日。
// prettier-ignore
export const ROUTINES = Object.freeze({
  aman: [
    { when: ['heavy'], go: ['field', 'tea', 'tea', 'tea'] },
    { go: ['field', 'tea', 'market', 'tea'] },
  ],
  gui: [
    { when: ['wet'], go: ['yard', 'tea', 'yard', 'tea'] },
    { when: ['winter'], go: ['yard', 'tea', 'yard', 'tea'] },
    { go: ['yard', 'tea', 'market', 'tea'] },
  ],
  shi: [
    { when: ['winter'], go: ['yard', 'field', 'tea', 'yard'] },
    { when: ['wet'], go: ['field', 'field', 'yard', 'yard'] },
    { go: ['field', 'field', 'tea', 'yard'] },
  ],
  qiao: [
    { when: ['wet'], go: ['market', 'market', 'market', 'tea'] },
    { when: ['fog'], go: ['market', 'market', 'market', 'tea'] },
    { go: ['market', 'market', 'creek', 'tea'] },
  ],
  zhou: [
    { when: ['heavy'], go: ['river', 'tea', 'tea', 'tea'] },
    { when: ['winter'], go: ['river', 'river', 'tea', 'tea'] },
    { go: ['river', 'river', 'river', 'tea'] },
  ],
  yun: [
    { when: ['fair', 'wet'], go: ['hill', 'hill', 'tea', 'hill'] }, // 集日去摆茶叶摊
    { when: ['fair'], go: ['hill', 'hill', 'tea', 'creek'] },
    { when: ['wet'], go: ['hill', 'hill', 'hill', 'hill'] },
    { go: ['hill', 'hill', 'hill', 'creek'] },
  ],
});

/** 作息里的去处在哪张地图上：田在小院那张图里，其余去处就是地图的名字。 */
export const mapOfPlace = place => (place === 'field' ? 'yard' : place);

// 0.12 留存的初见和日常台词；像素版的开场按地点和处境从 encounters.js 选。
// `gift` 是收到自家种的菜时说的；`treat` 是收到合心意的东西、`thanks` 是收到别的东西时说的，
// 里面的 {n} 换成那样东西的名字。
export const LINES = Object.freeze({
  aman: {
    first: '“菜筐装满了，走路都得斜着走。你说，黄瓜为什么就不能长直点？”',
    daily: [
      '“菜筐装满了，走路都得斜着走。你说，黄瓜为什么就不能长直点？”',
      '“你刚回来，可能还不知道：谁家的豆子先熟，问我准没错。”',
    ],
    gift: '“给我的？谢啦！等送完这趟菜就吃。”',
    treat: '“{n}！你怎么知道我好这口？”',
    thanks: '“给我的？那我揣兜里，路上吃。”',
  },
  qiao: {
    first: '“店里的猫又把账本占了。要不你来劝劝它？”',
    daily: [
      '“店里的猫又把账本占了。要不你来劝劝它？”',
      '“你知道吗，这只猫叫‘掌柜’。它真觉得这店是它的。”',
    ],
    gift: '“谢谢！回去可得躲着掌柜吃。”',
    treat: '“{n}！我可得收好，回去慢慢吃！”',
    thanks: '“谢啦，我收好了。”',
  },
  zhou: {
    first: '“这条河啊，从山里来，往海里去。我在这儿撑了四十年船，它一天也没歇过。”',
    daily: [
      '“这条河啊，从山里来，往海里去。我在这儿撑了四十年船，它一天也没歇过。”',
      '“想学钓鱼？先学坐得住。坐不住的人，鱼都看得出来。”',
    ],
    gift: '“给我的？好，好。”他小心接过{n}，“等收了网再吃。”',
    treat: '“{n}好，老头子正缺这个。”',
    thanks: '“给我的？好，好，我收着。”',
  },
  yun: {
    first: '“你……你是新搬来的吧？我叫云姑，住在山上。”她说完就低下头，继续干活了。',
    daily: [
      '“我小时候跟奶奶在山上采药。她说草木都认人，你对它好，它就长给你看。”',
      '“山歌？我……我只在没人的时候唱。”',
    ],
    gift: '“谢谢……”她把{n}小心收进竹篓，“我留着慢慢吃。”',
    treat: '“{n}……”她眼睛亮了一下，“谢谢。”',
    thanks: '“谢谢……”她小心地收进竹篓。',
  },
  shi: {
    first: '“住下了？”他直起腰看了看你那块地，“土是好土。先锄，再下种，浇透。”',
    daily: [
      '“种地急不来。今天急，明天也长不快。”',
      '“别看土面干就猛浇。扒开一点看看，底下还润着呢。”',
      '“春雨贵如油。下的时候，别嫌它烦。”',
      '他朝你那畦菜看了一会儿：“还行。”在他嘴里，这已经算夸了。',
      '“书上写的，是我记的。地里的事，是地教的。”',
    ],
    gift: '他接过去掂了掂，没说话，嘴角动了一下。',
    treat: '他接过{n}看了看，点点头：“好东西。”',
    thanks: '“嗯。”他收下了，没多说什么。',
  },
  gui: {
    first: '“哟，可算见着了！水缸是我给你挑满的，被子也拿出来晒过了。缺什么就隔着墙喊一声。”',
    daily: [
      '“吃饭了没有？一看就没好好吃。我灶上还有半锅粥，别跟我客气。”',
      '“天凉了，夜里被子盖严实点。你们年轻人，就爱踢被子。”',
      '“有心事就说出来，憋着多难受。我嘴严得很——好吧，也没那么严。”',
      '“菜要趁嫩收。老了就只能腌了，腌菜我倒是拿手。”',
    ],
    gift: '“自己种的？”她凑近闻了闻，“真水灵！晚上给你端碗菜汤过去。”',
    treat: '“{n}好啊，正用得上。你这孩子，心细。”',
    thanks: '“哎，跟我还客气什么。”',
  },
});

// 昨天真的收过礼、今早已送出回礼，再见面才接这一句。
export const AFTER_RETURN = Object.freeze({
  shi: '“那包菜种收着了？先匀匀撒一垄，挤着长不大。”',
  gui: '“碗你留着。等那几粒种子长成了，咱们再烧一碗菜汤。”',
  aman: '“门边那把青菜趁嫩吃！早上顺路给你放的。”',
  qiao: '“袋子上的猫爪是我描的。豆子可得收好，掌柜惦记着呢。”',
  zhou: '“早上的鲫鱼还鲜吧？天刚亮就收了网。”',
  yun: '“那包新茶……水晾一小会儿再泡，叶子就舒开了。”',
});

export const SHI_FIRST_FIELD = {
  dry: '石伯用鞋尖拨开田埂：“你那边已经下种了。籽旁边还是干的，给它吃口水。”',
  wet: '石伯看了看你的菜畦：“水吃进土里了。今晚让它歇着，明早再来看。”',
};

// 回礼：收了你的菜，第二天早上会留下点东西（0.12 的“回音”）。
export const RETURN_GIFT = Object.freeze({
  aman: {
    item: 'veg.qingcai',
    n: 2,
    text: '门边放着一把还带露水的青菜，叶子底下压着张纸条：“昨天的饭香！菜拿去吃，别客气——满”',
  },
  qiao: {
    item: 'bean',
    n: 1,
    text: '门把手上挂着一小袋豆子，袋子上画了只猫爪印。',
  },
  zhou: {
    item: 'fish',
    n: 2,
    text: '门口的竹篮里躺着两条鲫鱼，鳃还一张一合。篮柄上缠着一截渔线。',
  },
  yun: {
    item: 'tea',
    n: 1,
    text: '窗台上放着一小包新茶，用干荷叶包着，系了根草绳。闻着清清的。',
  },
  shi: {
    item: 'seed.qingcai',
    n: 3,
    text: '窗台上多了一小包菜种，纸包折得方方正正，没写名字。你知道是石伯。',
  },
  gui: {
    item: 'seed.qingcai',
    n: 2,
    text: '门槛上搁着一只粗瓷碗，碗底压着一小包菜种。隔着墙，桂嫂喊：“碗不急着还！”',
  },
});

// 0.12原有的各地点动作描述。
export const DOING = {
  aman: {
    field: '蹲在田埂上看菜',
    tea: '坐着剥茶叶蛋',
    market: '在铺子里核对菜账',
    yard: '在门口歇脚',
    river: '推着板车给老周送菜',
  },
  gui: {
    yard: '隔着墙在晾衣裳',
    tea: '和街坊说着话',
    market: '挑着鸡蛋',
  },
  shi: {
    field: '弯腰看土',
    tea: '端着茶杯不说话',
    yard: '在檐下编竹筐',
  },
  qiao: {
    market: '趴在柜台上算账',
    creek: '在溪边踩水',
    tea: '给茶摊送货',
  },
  zhou: {
    river: '蹲在船头补网',
    tea: '端着茶碗讲古',
  },
  yun: {
    hill: '在茶垄间采茶',
    tea: '在集上摆茶叶摊',
    creek: '在溪边洗茶篓',
  },
};
export const RAIN_DOING = {
  gui: {
    yard: '在屋檐下择菜',
  },
  shi: {
    yard: '在檐下听雨',
  },
  qiao: {
    market: '和猫一起看雨',
  },
  aman: {
    tea: '在棚子下拧衣角的水',
  },
  zhou: {
    river: '披着蓑衣坐在船篷下',
  },
  yun: {
    hill: '在茶棚下拣茶',
  },
};
