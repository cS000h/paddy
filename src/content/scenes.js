// 局面池（执行方案 M11「写局面，不写剧本」）：只写要什么样的人、在哪儿、什么时候，到时候从村里找人；
// 你能怎么做就是几个选项，选了当场兑现，顺手给那一样性情攒几分（content/leaning.js 的 pick）。
// 只有数据；规则在 sim/plugins/scenes.js。现在池子里有四种：
//   door 头三天找上门的事（G-27 第三节）；year 天时年景的小局面（G-28 下卷）；
//   feast 大日子上人碰人（G-28 上卷）；hope 村民的盼头攒到一半，你能帮、不管、使绊子（G-29）。
// 审稿时定的：
//   「债主讨头一笔利钱」只给带债开局，带债那两条等借和还（M9），先不接；
//   中秋「债主与欠债人同桌」也等 M9；选项、旁白里的「她」「他」「汉子」改成不分男女的说法；
//   Gemini 只给了旁白、没给开口那一句的几件（多找三文钱的小乔、旱年井口的阿满、好年分菜的桂嫂），
//   开口那句是 Claude 补的，标了「补」；端午抢鼓、中秋灯谜、除夕对子没过检定的那句也是 Claude 补的。
//   盼头里「帮一把」没过检定，照样往前推一点（帮了总比没帮强）。

/**
 * 一件局面：kind 哪一种；a 找谁来演（村民编号，或 {tempers} 有这几样性情之一的人），b 另一个人（可没有）；
 * place、spot、slots 那人这几段站在哪儿（不写就在原处，说上话就能碰上）；doing 看人页上那一句；
 * say 他开口那一句（轮换），bsay b 插的那一句（说话时并在前头），story 碰上那一下冒在画面下方的旁白；
 * opts 你能怎么做；echo 第二天谁见面提一句 [谁, 话]（'a' 就是演 a 的那位）。
 *
 * 一个选项：key、label 按钮字；temper 给哪一样性情攒分；tags 贴哪些做法标签（心烦照性情涨落）；
 * cost 用掉什么 {物品: 份}，coins 钱（负的是出），gain 得什么 [物品, 份]，energy 出力气（搭把手）；
 * mood 心情；like 谁记下什么来由 [[谁, 来由]]（'a'、'b'、'all' 全村，或村民编号；来由见 content/opinion.js）；
 * seen 被谁看见 [谁, 心里那句]；news 顺嘴捎来一条村里的事；hope 盼头往前推几分（负的是往后拖）；
 * reply 对方回的话，story 旁白；check 看哪一项 {attr, near 差一点, ok 成了, bad 没成}（ok、bad 里能再写上面这些）。
 * 话里的 {a}、{b} 换成演的人的名字。
 */
// prettier-ignore
export const SCENES = Object.freeze({
  // —— 头三天找上门的事（G-27 第三节）——
  'door.salt': {
    kind: 'door', a: 'gui', place: 'yard', spot: 'gate.0', slots: [0, 1, 2],
    doing: '端着空盐罐站在你院门口',
    say: ['“新邻居，盐罐见底借半勺盐？顺嘴跟你说句村里新鲜事……”', '“借点盐应应急！刚听见茶摊说阿满和石伯的事，你可别外传……”'],
    gossip: ['听说阿满上回帮镇上垫菜钱差点被拖黄，急得在茶摊拍桌子呢！', '还有呀，石伯嫌杂货铺新菜种贵了一文，跟小乔拌了半晌嘴！'],
    opts: [
      { key: 'chat', label: '借盐也跟着细聊', temper: 'gregarious', tags: ['chat'], cost: { salt: 1 },
        reply: '“哈哈我就爱跟爽快人唠嗑！盐明儿还你，咱常走动！”', like: [['a', 'warm']], gossip: true },
      { key: 'quiet', label: '借盐，笑笑不接话', temper: 'calm', cost: { salt: 1 },
        reply: '“哟，你倒嘴严稳当！行，盐收着，嫂子不耽误你干活。”', like: [['a', 'helped']] },
      { key: 'hush', label: '劝别往外头乱传', temper: 'honest', tags: ['fair'], cost: { salt: 1 },
        reply: '“哎呀说得对，都是自家乡邻，嫂子这张嘴以后收敛些！”', like: [['a', 'helped'], ['aman', 'fair'], ['shi', 'fair']] },
      { key: 'pry', label: '顺嘴反套更多底细', temper: 'paranoid', tags: ['pry'], cost: { salt: 1 },
        reply: '“瞧你打听得这么细，放心吧，咱村人大多实在着呢！”', news: true },
    ],
    echo: ['aman', '“昨儿桂嫂是不是去你院门口唠嗑了？她那大喇叭全村都听得见！”'],
  },
  'door.coins': {
    kind: 'door', a: 'qiao', place: 'market', slots: [0, 1, 2, 3],
    doing: '低头数着钱匣里的铜板',
    say: ['“咦，钱匣对不上数……刚才是不是多找了谁？”'], // 补
    story: ['刚出杂货铺两步，低头一数，小乔忙乱间竟多找了你三文钱。', '小乔正忙着抱下货架上的掌柜，塞进你手心的铜板多出了三文。'],
    extra: 3, // 碰上那一下多到手的钱
    opts: [
      { key: 'back', label: '当场转身退还', temper: 'honest', tags: ['fair'], coins: -3,
        reply: '“哎哟多亏你提醒！差点又叫掌柜害我赔工钱！”', like: [['a', 'helped'], ['shi', 'fair']],
        seen: ['shi', '“不贪小便宜，是个实在人。”'] },
      { key: 'pocket', label: '揣进兜里直接走', temper: 'stingy', tags: ['cheat'],
        story: '三文钱滑进兜里，背后传来小乔嘀咕对不上账的声音。', like: [['yun', 'sly']],
        seen: ['yun', '“多拿了零钱没还……往后得多留神。”'] },
      { key: 'later', label: '先忙活，晚些再还', temper: 'calm', coins: -3,
        reply: '“哎呀刚才急得我满头汗，你真细心还专程跑一趟！”', like: [['a', 'helped']],
        seen: ['zhou', '“记在心上不忘还，稳妥。”'] },
      { key: 'joke', label: '开个玩笑递回去', temper: 'gregarious', tags: ['chat'], coins: -3, mood: 2,
        reply: '“哈哈拿我打趣呢！三文钱收好，谢你嘴甜手也实诚！”', like: [['a', 'warm'], ['aman', 'warm']],
        seen: ['aman', '“新邻居真对脾气，以后准合得来！”'] },
    ],
    echo: ['qiao', '“昨儿那三文钱真悬，往后铺子算账我可得把掌柜按牢！”'],
  },
  'door.ferry': {
    kind: 'door', a: 'zhou', place: 'river', slots: [1, 2],
    doing: '在渡口对着一筐沉货发愁',
    say: ['“这位乡邻！这筐沉货老头子一人抬不上船，快来搭把手！”', '“渡口人手不够，眼看起风了，能帮老头子拉一把纤绳不？”'],
    opts: [
      { key: 'lift', label: '上前用力帮着抬', temper: 'diligent', tags: ['help'], energy: true,
        check: { attr: 'tige', near: '货筐太沉了——体格再壮实些，就能一把抬上船。',
          ok: { reply: '“好力气！多谢这位乡邻，这两条鲜鱼拿去熬汤！”', gain: ['fish.crucian', 2], like: [['a', 'pitched']] },
          bad: { reply: '“慢着点别闪着腰！歇口气，咱俩慢慢挪上去。”', like: [['a', 'helped']] } } },
      { key: 'call', label: '喊附近街坊来帮', temper: 'sly',
        reply: '“哈哈叫来阿满一起抬，一下就稳了，你倒机灵！”', like: [['a', 'helped']] },
      { key: 'away', label: '装没听见低头走', temper: 'lazy', tags: ['refuse'],
        story: '你加快脚步离开渡口，身后老周叹口气自己慢慢挪货筐。', like: [['a', 'shunned']] },
    ],
    echo: ['zhou', '“昨儿渡口多亏热心人帮衬，河湾水稳，今儿鱼口准好。”'],
  },

  // —— 天时年景的小局面（G-28 下卷）——
  'year.flood': {
    kind: 'year', a: 'shi', place: 'field', slots: [1, 2],
    doing: '在田头急着喊人挖沟',
    say: ['“菜地积水齐脚踝，再不挖沟排水，明儿全烂根！”'],
    opts: [
      { key: 'dig', label: '冒雨下泥帮挖深沟', temper: 'diligent', tags: ['help'], energy: true,
        check: { attr: 'tige', near: '泥巴太沉粘铁锹——体格再壮实些，就能一气挖通。',
          ok: { story: '浑水哗哗涌进溪沟，保住大半菜畦，乡邻齐声道谢。', like: [['all', 'helped']] },
          bad: { story: '挖了一半脚滑跌坐泥里，大伙儿拉你起来换手继续挖。', like: [['a', 'helped']] } } },
      { key: 'straw', label: '搬稻草柴捆垫埂', temper: 'calm', cost: { straw: 1 },
        story: '垫高了自家田埂，自家菜保住了，旁人地里仍积着水。' },
      { key: 'home', label: '雨太大，回屋不管', temper: 'lazy', tags: ['home'], mood: -2,
        story: '雨下了一宿，次日清早低洼菜地烂了大半片。', like: [['a', 'shunned']] },
    ],
  },
  'year.drought': {
    kind: 'year', a: 'aman', place: 'tea', slots: [1, 2],
    doing: '在井口排队等着打水',
    say: ['“井口排老长的队，前头那位硬多打两桶，大伙儿都急了！”'], // 补
    story: ['公井水位落得深，前头有人硬多打两桶，排队的乡邻立刻吵起来。'],
    opts: [
      { key: 'fair', label: '按户定桶数说和', temper: 'honest', tags: ['fair'],
        check: { attr: 'renqing', near: '大伙儿晒得火气大——人情再高些，就能劝服众人轮流打。',
          ok: { story: '众人点头按户轮流各打两桶，井口秩序很快稳了下来。', like: [['all', 'fair']] },
          bad: { story: '前头的人嘴硬不让，吵了半晌才各自拎桶散开。' } } },
      { key: 'fill', label: '趁空先灌满自家桶', temper: 'stingy', tags: ['cheat'],
        story: '灌满自家水桶快步走开，背后传来几句嘀咕。', like: [['a', 'cool']] },
      { key: 'river', label: '绕远去河湾挑水', temper: 'generous', tags: ['help', 'yield'], energy: true,
        story: '肩头沉了些，井边街坊夸你懂让着老人。', like: [['all', 'praised']] },
    ],
  },
  'year.pest': {
    kind: 'year', a: 'shi', place: 'field', slots: [2, 3],
    doing: '抱着干艾草在田头张罗熏虫',
    say: ['“虫群顺风扑过来了，趁风向赶紧点烟熏虫！”'],
    story: ['虫群顺风扑向菜畦，石伯抱来干艾草直喊人。'],
    opts: [
      { key: 'smoke', label: '上风口点火熏田', temper: 'diligent', tags: ['help'],
        check: { attr: 'chijia', near: '烟往反方向散了——持家再熟些，就能找准上风口。',
          ok: { story: '清苦艾烟漫过菜畦，虫群嗡嗡散逃，全村保住大半嫩苗。', like: [['all', 'helped']] },
          bad: { story: '呛得自己直咳嗽，烟散得太快只赶走小半虫子。', mood: -1 } } },
      { key: 'hens', label: '放母鸡下地啄虫', temper: 'sly',
        story: '母鸡咯咯追着肥虫跑，省了烟熏工夫鸡还吃饱了。', like: [['a', 'helped']] },
      { key: 'alone', label: '只顾自家地不凑伙', temper: 'shy', tags: ['alone'], energy: true,
        story: '你闷头捉完自家菜叶上的虫，天已全黑。' },
    ],
  },
  'year.good': {
    kind: 'year', a: 'gui', place: 'tea', slots: [1, 2],
    doing: '在樟树下张罗着分余菜',
    say: ['“今年菜多得吃不完，大伙儿快来商量商量怎么分！”'], // 补
    story: ['今年丰收菜多得吃不完，街坊把余菜堆在樟树下商量怎么分。'],
    opts: [
      { key: 'feast', label: '提议摆一顿丰收宴', temper: 'generous', tags: ['crowd'], mood: 3,
        story: '满村老少围坐吃了个痛快，笑声飘到河湾对岸。', like: [['all', 'warm']] },
      { key: 'sell', label: '帮联系货客整批卖', temper: 'sly', tags: ['haggle'],
        check: { attr: 'renqing', near: '货客压价压得紧——人情再高些，就能谈出好价钱。',
          ok: { story: '整批瓜菜卖出体面价钱，各户都分到一笔额外铜钱。', coins: 6, like: [['all', 'helped']] },
          bad: { story: '货客没给高价，大伙儿干脆各自挑回去晒成干菜。' } } },
      { key: 'dry', label: '各自领回晒干过冬', temper: 'calm',
        story: '石伯连连点头夸懂过日子，各家竹匾很快铺满干菜。', gain: ['pickle', 1], like: [['shi', 'praised']] },
    ],
  },

  // —— 大日子上人碰人（G-28 上卷），站在节令聚人的地方 ——
  'sheshu.dish': {
    kind: 'feast', feast: 'sheshu', a: { tempers: ['ambitious'] }, b: { tempers: ['ambitious'] },
    say: ['“我这道春笋焖肉火候足，大伙儿先动筷尝尝！”'],
    bsay: '“哼，比鲜亮还得看我这盘头茬青菜，谁压谁一头还不一定！”',
    opts: [
      { key: 'both', label: '两道都夹一口夸', temper: 'sly',
        story: '两人被你夸得眉开眼笑，各自往你碗里多夹一筷。', like: [['a', 'praised'], ['b', 'praised']] },
      { key: 'judge', label: '挑一道评高低', temper: 'honest', tags: ['fair'],
        story: '赢的一方得意大笑，输的一方嘴上认输眼神却憋着劲。', like: [['a', 'praised'], ['b', 'cool']] },
    ],
  },
  'sheshu.toast': {
    kind: 'feast', feast: 'sheshu', a: { tempers: ['gregarious'] },
    say: ['“今年春社热闹，让这位乡邻起个头说两句吉利话！大伙儿都瞧着呢！”'],
    opts: [
      { key: 'toast', label: '端碗祝风调雨顺', temper: 'brave', tags: ['standout'],
        story: '满桌齐声附和叫好，石伯也跟着点了点头。', like: [['all', 'praised']] },
      { key: 'sit', label: '红着脸摆手坐下', temper: 'shy',
        story: '热络街坊笑着替你干了这碗，桌上一片哄笑。' },
    ],
  },
  'duanwu.drum': {
    kind: 'feast', feast: 'duanwu', a: { tempers: ['hasty'] }, b: { tempers: ['calm'] },
    say: ['“咚咚咚！快点划呀，对面船头都咬上来了！”'],
    bsay: '“瞎猛划桨要打架，稳住节奏船才走得直！”',
    opts: [
      { key: 'rush', label: '紧跟鼓点带头加速', temper: 'hasty', tags: ['hurry'], energy: true,
        check: { attr: 'tige', near: '桨太沉了——体格再壮实些，就能一路领着冲。',
          ok: { story: '桨叶翻飞水花四溅，岸上呐喊声震得耳膜响。', like: [['a', 'praised']] },
          bad: { story: '一桨下去溅了自己一身水，船头还是慢了半拍。', mood: -1 } } }, // 没成那句补
      { key: 'steady', label: '高声喊齐大家节奏', temper: 'calm',
        story: '全船桨落得齐刷刷的，船尾掌舵老人连连点头。', like: [['b', 'praised']] },
    ],
  },
  'duanwu.zongzi': {
    kind: 'feast', feast: 'duanwu', a: { tempers: ['generous'] }, b: { tempers: ['stingy', 'paranoid'] },
    say: ['“刚出锅的腊肉粽，拿着吃，端午图个喜庆！”'],
    bsay: '“无功不受禄，白吃你粽子回头欠人情，我不要！”',
    opts: [
      { key: 'swap', label: '替回塞把自家艾草', temper: 'honest', tags: ['help'], cost: { mugwort: 1 },
        story: '礼尚往来两头舒坦，两人笑着一块儿看起了龙舟。', like: [['a', 'helped'], ['b', 'helped']] },
      { key: 'tease', label: '笑着打趣别扫兴', temper: 'gregarious', tags: ['chat'],
        story: '周围乡邻跟着起哄，{b}抹不开面子总算接下了粽子。', like: [['a', 'warm']] },
    ],
  },
  'zhongqiu.riddle': {
    kind: 'feast', feast: 'zhongqiu', a: { tempers: ['sly', 'ambitious'] }, b: { tempers: ['paranoid', 'hasty'] },
    say: ['“冤枉！全村老老少少都能猜，你猜不出别赖我出偏题！”'],
    bsay: '“这谜面拐七八道弯，分明是不想舍出那两块糖！”',
    opts: [
      { key: 'solve', label: '上前猜中撑场面', temper: 'ambitious', tags: ['excel'],
        check: { attr: 'xuewen', near: '谜面绕了好几道——学问再深些，就能一口说中。',
          ok: { story: '谜底一出口众人齐拍手，质疑的人挠着头服了气。', gain: ['candy', 1], like: [['a', 'praised']] },
          bad: { story: '你琢磨半天也没猜中，只好跟着大伙儿一块儿笑。' } } }, // 没成那句补
      { key: 'ease', label: '劝大家图乐呵', temper: 'content',
        story: '大伙儿笑笑继续抬头赏月，灯笼摇得暖融融的。', like: [['b', 'praised']] },
    ],
  },
  'dongzhi.cake': {
    kind: 'feast', feast: 'dongzhi', a: { tempers: ['lazy', 'sly'] }, b: { tempers: ['diligent'] },
    say: ['“嘿嘿刚出笼的最软糯，我替大伙儿先尝块大的！”'],
    bsay: '“舂米揉团时不见影，出笼倒是跑得比谁都快。”',
    opts: [
      { key: 'speak', label: '替干活的人说话', temper: 'honest', tags: ['fair'],
        story: '{a}红着脸把大块让给舂米的人，众人暗暗点头。', like: [['b', 'fair'], ['a', 'cool']] },
      { key: 'share', label: '把自家份掰一半', temper: 'generous', tags: ['gift'],
        story: '一人一块谁也没缺，蒸笼边很快又笑成一团。', like: [['a', 'warm'], ['b', 'warm']] },
    ],
  },
  'dongzhi.tale': {
    kind: 'feast', feast: 'dongzhi', a: { tempers: ['trusting'] }, b: { tempers: ['paranoid'] },
    say: ['“早年冬至夜河湾结厚冰，底下大鱼能顶破冰面跳上来！”'],
    bsay: '“河水那么急哪结得住厚冰？您怕是记岔了糊弄人吧。”',
    opts: [
      { key: 'humor', label: '帮长者圆一句', temper: 'gregarious', tags: ['chat'],
        story: '{a}乐呵呵继续讲下去，火盆边暖和又热闹。', like: [['a', 'warm']] },
      { key: 'verify', label: '认真核对河湾水情', temper: 'paranoid', tags: ['doubt'],
        story: '大伙儿顺着聊起往年冬汛，倒也长了几分见识。', like: [['b', 'praised']] },
    ],
  },
  'chuxi.couplet': {
    kind: 'feast', feast: 'chuxi', a: { tempers: ['ambitious'] }, b: { tempers: ['ambitious'] },
    say: ['“‘五谷丰登’得先给我写，我家今年收成最旺！”'],
    bsay: '“先来后到！我排前头，这红纸墨汁归我头一副！”',
    opts: [
      { key: 'verse', label: '另拟一副好对子', temper: 'calm', tags: ['fair'],
        check: { attr: 'xuewen', near: '平仄差了一点——学问再深些，就能对得两头称妙。',
          ok: { story: '你念出“一畦青菜知时节”，两人一听拍案叫绝不再争。', like: [['a', 'praised'], ['b', 'praised']] },
          bad: { story: '你憋了半天没想出好句，两人只好猜拳定了先后。' } } }, // 没成那句补
      { key: 'ink', label: '帮忙磨墨催快写', temper: 'diligent', tags: ['help'],
        story: '磨匀浓墨两副一气写完，谁也没耽误回家贴门。', like: [['a', 'helped'], ['b', 'helped']] },
    ],
  },
  'chuxi.table': {
    kind: 'feast', feast: 'chuxi', a: { tempers: ['generous'] }, b: { tempers: ['shy'] },
    say: ['“大年三十一个人啃干粮像啥话？过来添双筷子的事！”'],
    bsay: '“我、我就不打扰你们一家子团圆了……”',
    opts: [
      { key: 'invite', label: '端菜邀着一块去', temper: 'generous', tags: ['gift', 'crowd'],
        story: '一桌热菜冒着白汽，鞭炮声里谁也没觉着孤单。', like: [['a', 'warm'], ['b', 'warm']] },
      { key: 'lamp', label: '留盏灯陪着守岁', temper: 'honest',
        story: '两户檐下油灯隔墙亮着，清静却透着踏实暖意。', like: [['b', 'warm']] },
    ],
  },

  // —— 村民的盼头攒到一半（G-29 第一节第 5 条）：说上话就能插手 ——
  'hope.aman': {
    kind: 'hope', a: 'aman', story: ['阿满正对着缺角的木料发愁，铜板差一截。'],
    opts: [
      { key: 'help', label: '匀钱帮凑木料', temper: 'generous', tags: ['help'], coins: -6, hope: 30,
        reply: '“好伙计！新车打好头一个拉你兜风！”', like: [['a', 'backed']] },
      { key: 'leave', label: '鼓励两句慢慢攒', temper: 'content',
        reply: '“哈哈没事儿，我多跑两趟早市自己也能凑齐！”' },
      { key: 'spoil', label: '抢先买走好樟木', temper: 'stingy', tags: ['cheat'], coins: -4, gain: ['camphorWood', 1], hope: -25,
        reply: '“哎哟那块老樟木我盯半个月了，你咋全包圆啦！”', like: [['a', 'hindered']] },
    ],
  },
  'hope.gui': {
    kind: 'hope', a: 'gui', story: ['桂嫂攥着信纸眼巴巴望过来，灶上还缺两样好菜料。'],
    opts: [
      { key: 'help', label: '帮写家书凑菜料', temper: 'honest', tags: ['help'],
        check: { attr: 'xuewen', near: '措辞略生硬——学问再高些，就能把慈母心意写透。',
          ok: { reply: '“写得真贴心，嫂子记你一辈子情！”', hope: 30, like: [['a', 'backed']] },
          bad: { reply: '“字歪点不要紧，心意到了就好。”', hope: 10, like: [['a', 'helped']] } } }, // 没成那句补
      { key: 'leave', label: '宽慰两句各忙各', temper: 'shy',
        reply: '“也是，我找小乔写信一样成，不耽误你干活。”' },
      { key: 'spoil', label: '茶摊传话嫌铺张', temper: 'paranoid', tags: ['gossip'], hope: -25,
        reply: '“谁在背后嚼舌根？我疼自家娃花自己钱，碍着谁了！”', like: [['a', 'hindered']] },
    ],
  },
  'hope.shi': {
    kind: 'hope', a: 'shi', story: ['石伯揉着酸痛膝盖，想腾半天工夫整理农谚却放不下地里活。'],
    opts: [
      { key: 'help', label: '帮锄草理纸页', temper: 'diligent', tags: ['farm', 'help'], energy: true,
        check: { attr: 'tige', near: '地里杂草太密——体格再壮实些，就能一气帮着清完。',
          ok: { reply: '“嗯，地齐整了，老汉今晚能多抄三页。”', hope: 30, like: [['a', 'backed']] },
          bad: { reply: '“歇着吧，剩下的老汉慢慢拔。”', hope: 10, like: [['a', 'helped']] } } }, // 没成那句补
      { key: 'leave', label: '嘱咐保重膝盖', temper: 'calm',
        reply: '“不妨事，老汉慢慢磨，总能抄完。”' },
      { key: 'spoil', label: '笑老农谚早不准', temper: 'ambitious', tags: ['offend'], hope: -25,
        reply: '“哼，地不欺人！你不信便罢，老汉也不稀罕拿给你看。”', like: [['a', 'hindered']] },
    ],
  },
  'hope.qiao': {
    kind: 'hope', a: 'qiao', story: ['小乔正愁没人看铺子抽不开身去练字，急得直抓耳。'],
    opts: [
      { key: 'help', label: '替看半晌铺子', temper: 'gregarious', tags: ['help'],
        check: { attr: 'chijia', near: '货架账目有点乱——持家再熟些，就能稳稳替着看店。',
          ok: { reply: '“太够意思啦！等招牌挂上头一个请你喝头茶！”', hope: 30, like: [['a', 'backed']] },
          bad: { reply: '“账有点乱也不怕，我回来再理，多谢你啦！”', hope: 10, like: [['a', 'helped']] } } }, // 没成那句补
      { key: 'leave', label: '夸两句掌柜就走', temper: 'content',
        reply: '“哼，我自己抽晚饭后练，照样写得漂亮！”' },
      { key: 'spoil', label: '当众笑只会画猫', temper: 'sly', tags: ['offend'], hope: -25,
        reply: '“好哇你也看扁我！走开，别挡着我算账！”', like: [['a', 'hindered']] },
    ],
  },
  'hope.zhou': {
    kind: 'hope', a: 'zhou', story: ['老周独个儿推不动老渡船，满头大汗直喘气。'],
    opts: [
      { key: 'help', label: '挽袖帮翻船刷油', temper: 'honest', tags: ['help'], energy: true,
        check: { attr: 'tige', near: '船身湿透太沉——体格再壮实些，就能一把掀翻。',
          ok: { reply: '“好力气！晾两天就能下水，老头子真心谢你！”', hope: 30, like: [['a', 'backed']] },
          bad: { reply: '“不急不急，咱俩歇口气再推一回。”', hope: 10, like: [['a', 'helped']] } } }, // 没成那句补
      { key: 'leave', label: '劝等天晴慢慢修', temper: 'lazy',
        reply: '“呵呵不急，老头子再等两个过路后生搭把手。”' },
      { key: 'spoil', label: '趁急低价逼卖船', temper: 'stingy', tags: ['cheat'], hope: -25,
        reply: '“这船跟了我半辈子，多少钱老头子也不卖！”', like: [['a', 'hindered']] },
    ],
  },
  'hope.yun': {
    kind: 'hope', a: 'yun', story: ['云姑抱着红纸茶罐站在石阶边，手心直冒汗不敢往下走。'],
    opts: [
      { key: 'help', label: '陪着下山壮胆', temper: 'brave', tags: ['help'],
        check: { attr: 'renqing', near: '太紧张迈不开步——人情再高些，就能安稳陪着走下山。',
          ok: { reply: '“有你陪着，我好像没那么害怕了……走吧。”', hope: 30, like: [['a', 'backed']] },
          bad: { reply: '“谢谢你……我、我再缓一缓。”', hope: 10, like: [['a', 'helped']] } } }, // 没成那句补
      { key: 'leave', label: '夸茶香祝顺当', temper: 'calm',
        reply: '“谢谢……我再鼓鼓勇气，晚些自己下去。”' },
      { key: 'spoil', label: '喊大伙儿上山围观', temper: 'hasty', tags: ['rash'], hope: -25,
        reply: '“别、别叫这么多人来！我还没准备好！”', like: [['a', 'hindered']] },
    ],
  },
});

/** 局面里的选项：在找人页上归在哪一组。 */
export const SCENE_GROUP = '眼前的事';

/** 头三天找上门的事哪天来：第几天 → 哪一件（多找三文钱不排日子，头三天头一回在铺子买东西就碰上）。 */
export const DOOR_DAYS = Object.freeze({ 1: 'door.salt', 2: 'door.ferry' });
export const DOOR_UNTIL = 3;

/** 盼头那一件挂几天（攒到一半那天起）。 */
export const HOPE_STAY = 4;

/** 局面里出力气算哪一件事（content/actions.js）。 */
export const SCENE_ACTION = 'pitchIn';

/** 局面里的检定：坎多高（content/events.js 的 checkChance），差几成算「差一点」。 */
export const SCENE_CHECK = Object.freeze({ dc: 5, near: 15 });
