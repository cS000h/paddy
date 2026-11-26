// 走图翻找碰上的小事（Gemini 的 G-08 回稿，「小事」一节的 20 件）。
// 有动静的地方翻一下，偶尔碰上一件（机会见 content/search.js 的 SEARCH.event），落在主角身边。
// when：在哪几张图（maps）、翻的哪一类（kinds，见 SEARCH_KINDS）、哪几季（seasons，0 春 … 3 冬）、
//       哪个时段（periods，见 PERIODS）、要不要近来下过雨（wet: true 要，false 不要），
//       rainTomorrow 明天真会下雨才碰得上。不写就是不挑。
// once：一辈子只碰上一回（失物）。
// 做法的结果除了晨起小事那几样，还有：
//   bond 跟谁多一份交情（熟悉 +2，对方记一条「帮过一把」）；
//   grey 昧下人家的东西：当时在这张图上、看得见你的乡邻各记一条「见你昧下人家的东西」，不扣全村；
//   blame 不管有没有人看见，这个人都知道了，也记一条；
//   foresee 看出了明天的天；energy 是负数就是累着了。
// 照核对记录改过的：失物做成一次性的、不进图鉴；溪蟹只看不捉（说不准是不是保护的）；
// 蚂蚁搬家改成知道明天下雨；钱数和体力往小里定，跟晨起小事一个量级。

// 落在主角身边，没有固定的默认地方；底部对话条上的「在哪儿」就说跟前
const SPOT = Object.freeze({ place: '跟前', hint: '翻着翻着，碰上一件事' });
const lost = (id, when, title, text, choices) =>
  Object.freeze({ id, trigger: 'search', once: true, spot: SPOT, when, title, text, choices });
const small = (id, when, title, text, choices) =>
  Object.freeze({ id, trigger: 'search', once: false, spot: SPOT, when, title, text, choices });

// prettier-ignore
const LIST = [
  lost('search_pipe', { maps: ['river'], kinds: ['reeds'], periods: ['dusk'] },
    '草丛里的铜烟袋',
    '苇根干土上横着一根磨得油亮的竹杆铜锅烟袋，烟嘴缠着半圈旧红线，像是撑船人歇脚时滑落的。',
    [
      { label: '收起来找失主', give: { item: 'pipe', n: 1 }, mood: 1,
        line: '你把烟袋擦干净收好。这么老的物件，丢了的人心里准空落落的。' },
      { label: '先揣兜里留着', coins: 5, grey: true, mood: -1,
        line: '你把烟袋揣进兜里，回头在杂货铺换了几文钱。' },
    ]),
  lost('search_kite', { maps: ['market'], kinds: ['peach'], periods: ['day'], wet: false },
    '枝头挂着的风筝',
    '桃树高枝上挂着一只白宣纸糊的燕子风筝，纸面上用墨画了只歪头小猫，风筝线断了半截垂下来。',
    [
      { label: '踮脚勾下来', check: { attr: 'tige', dc: 5 },
        onOk: { give: { item: 'kite', n: 1 }, line: '稳稳勾了下来，风筝一点没破。这猫画得真像小乔家的掌柜。' },
        onFail: { give: { item: 'kite', n: 1 }, mood: -1, line: '勾是勾下来了，扯破了一小角。还回去时得赔个不是。' } },
      { label: '不管它走开', mood: 1, line: '风筝还挂在枝头，风一吹轻轻晃。' },
    ]),
  lost('search_thimble', { maps: ['tea'], kinds: ['camphor'], periods: ['dawn', 'day'] },
    '树洞边的旧银顶针',
    '老樟树根凹槽里闪着一点银亮，扒开落叶是一枚磨出深凹痕的旧银顶针，边上还缠着两寸蓝布线。',
    [
      { label: '拿去问桂嫂', give: { item: 'thimble', n: 1 }, mood: 1,
        line: '蓝布线，纳鞋底的。村里做针线活最勤的是桂嫂，回头拿去问问她。' },
      { label: '揣进荷包换钱', coins: 4, grey: true, mood: -1,
        line: '银顶针在杂货铺换了几文钱。' },
    ]),
  lost('search_purse', { maps: ['creek'], kinds: ['bamboo'], periods: ['dawn'] },
    '竹叶底下的粗麻荷包',
    '竹径转弯处的竹叶底下压着一只打着补丁的粗麻荷包，掂起来哗啦响，里头装着十几文铜钱和一张揉皱的菜账条。',
    [
      { label: '原封不动送还', give: { item: 'purse', n: 1 }, mood: 1,
        line: '菜账条上记着各家的菜，是阿满替村里卖菜收的钱。你系好袋口收起来。' },
      { label: '抽几文再还', check: { attr: 'renqing', dc: 5 },
        onOk: { coins: 3, give: { item: 'purse', n: 1 }, mood: -2,
          line: '你抽了三文，把袋口照原样系好。钱是到手了，心里却发虚。' },
        onFail: { give: { item: 'purse', n: 1 }, mood: -1,
          line: '手刚伸进荷包，竹径那头传来阿满的喊声，你赶紧原样系好。' } },
      { label: '整只吞下', coins: 15, grey: true, mood: -2,
        line: '十几文钱倒进自己口袋，荷包塞进了竹丛深处。' },
    ]),
  lost('search_knife', { maps: ['creek'], kinds: ['rock'], periods: ['day'] },
    '石缝里的竹篾刀',
    '溪边垫脚石缝里卡着一把磨得雪亮的弯嘴篾刀，木柄包着厚厚一层汗渍，一看就是老手艺人的家伙什。',
    [
      { label: '擦净泥水送还', give: { item: 'stripKnife', n: 1 }, mood: 1,
        line: '你把刀擦干净收好。村里编竹器的老手艺人，就是石伯了。' },
      { label: '留着自己用', coins: 6, grey: true, mood: -1,
        line: '好刀省下一笔买工具的钱。你把它别在了腰后。' },
    ]),
  lost('search_sachet', { maps: ['hill'], kinds: ['fern'], wet: true },
    '蕨丛里的素布药囊',
    '湿蕨叶底下压着一只淡青粗布小药囊，袋口系得紧实，隔着布闻得出艾叶和薄荷香，边角绣着一朵小茶花。',
    [
      { label: '拿去还给云姑', give: { item: 'sachet', n: 1 }, mood: 1,
        line: '茶花绣得细，是后山云姑的针脚。你没拆开，原样收好。' },
      { label: '拆开看看卖钱', coins: 4, grey: true, mood: -1,
        line: '里头是配好的驱虫草药，还有一枚旧铜扣。草药换了几文钱。' },
    ]),
  lost('search_bell', { maps: ['yard', 'market'], kinds: ['bush'], periods: ['dusk'] },
    '灌木挂住的红头绳',
    '带刺灌木梢头缠着一根崭新的朱红丝头绳，尾端系着颗圆滚滚的小铜铃，轻轻一碰叮当响。',
    [
      { label: '细心解开送还', check: { attr: 'chijia', dc: 5 },
        onOk: { give: { item: 'bell', n: 1 }, line: '一根一根解开，丝线一点没勾毛。这铃铛像是猫项圈上的。' },
        onFail: { give: { item: 'bell', n: 1 }, mood: -1, line: '解得急了，扯断两根丝。还回去时怕是要叫人惋惜。' } },
      { label: '留着逗猫或卖钱', coins: 3, grey: true,
        line: '铃铛叮当响，你揣进了兜里。' },
    ]),
  lost('search_tally', { maps: ['yard'], kinds: ['yard'], periods: ['dawn'] },
    '瓜棚下的记账牌',
    '昨儿阿满推板车来收菜，瓜棚石凳缝里落下块巴掌大的杉木记账牌，上头用炭笔歪歪扭扭记着各家斤两。',
    [
      { label: '收好了还给阿满', give: { item: 'tally', n: 1 }, mood: 1,
        line: '全村托他卖菜的明细都在上头，丢了账可算不清。你把木牌揣好。' },
      { label: '悄悄抹掉几笔账', check: { attr: 'xuewen', dc: 6 },
        onOk: { coins: 6, give: { item: 'tally', n: 1 }, mood: -3,
          line: '改得跟原笔迹一模一样，可良心一直不安。' },
        onFail: { give: { item: 'tally', n: 1 }, blame: 'aman', mood: -2,
          line: '炭迹糊成一团。这块牌子还回去，阿满一眼就看得出来。' } },
    ]),
  small('search_nest', { maps: ['yard', 'market'], kinds: ['peach', 'broad', 'camphor', 'pine', 'willow'], seasons: [3] },
    '树梢上的旧鸟窝',
    '光秃秃的枝杈上留着一只早就空了的旧草窝，风一吹摇摇晃晃，窝沿里似乎卡着一点亮晶晶的碎铜片。',
    [
      { label: '爬树够出来', check: { attr: 'tige', dc: 5 },
        onOk: { coins: 3, give: { item: 'wood', n: 1 }, line: '稳稳够了下来：三文旧铜钱，外加一把干草枝。' },
        onFail: { energy: -5, mood: -1, line: '脚底一滑蹭破了袖口，空手下来了。' } },
      { label: '用竹竿轻挑', coins: 1, give: { item: 'wood', n: 1 },
        line: '挑落一小把干柴和一文旧铜钱，稳妥不费力。' },
      { label: '留着不动', mood: 2, line: '说不定开春还有雀儿回来修窝。' },
    ]),
  small('search_crab', { maps: ['creek'], kinds: ['rock'], seasons: [1, 2], wet: true },
    '石缝里的青蟹',
    '掀开溪边湿石头，底下横着一只巴掌大的青壳溪蟹，正举着两只大螯咔嗒咔嗒冲你示威。',
    [
      { label: '按住看个仔细', check: { attr: 'danliang', dc: 5 },
        onOk: { mood: 3, line: '从背壳按住它，看清了青壳上的花纹，又轻轻放回石缝。' },
        onFail: { energy: -2, mood: -1, line: '指头被夹了一口，溪蟹一溜烟钻回水底。' } },
      { label: '放回石头让它走', mood: 1, give: { item: 'snail', n: 2 },
        line: '石头轻轻盖回去，顺手在旁边摸到两颗螺蛳。' },
    ]),
  small('search_dew', { maps: ['tea'], kinds: ['lotus'], seasons: [1], periods: ['dawn'] },
    '荷叶上的露水珠',
    '满塘荷叶托着滚圆清亮的大露珠，晨风一吹晃悠悠的。老辈说荷叶露水泡茶最清火。',
    [
      { label: '拿竹筒接满一筒', check: { attr: 'chijia', dc: 5 },
        onOk: { bond: 'yun', mood: 2, line: '接满一筒清露，给后山的云姑送去泡茶，她难得笑了笑。' },
        onFail: { mood: -1, line: '手一抖，露水全泼进塘里，白湿了袖子。' } },
      { label: '掬一口润润嗓子', energy: 4, line: '清凉甘甜，精神一振。' },
    ]),
  small('search_duck', { maps: ['river'], kinds: ['reeds'], seasons: [0], periods: ['dawn'] },
    '苇丛里的野鸭蛋',
    '深苇丛里压出一处圆窝，里头卧着两颗泛青的蛋，不知是村里跑散的麻鸭下的，还是水鸟的窝。',
    [
      { label: '先辨认是不是家鸭窝', check: { attr: 'yueli', dc: 5 },
        onOk: { bond: 'zhou', mood: 2, line: '窝边的绒羽是老周家跑散的麻鸭。你把蛋捧去还给老周，他直道谢。' },
        onFail: { line: '拿不准是不是野鸟窝，不敢乱动，转身离开。' } },
      { label: '离远些别惊动它', mood: 2, line: '你悄悄退出苇丛，没碰那两颗蛋。' },
    ]),
  small('search_coins', { maps: ['tea'], kinds: ['camphor'], periods: ['dusk'] },
    '老樟树下的旧铜钱',
    '老树盘根错节的缝隙里嵌着两枚长满绿锈的旧铜钱，不知是多少年前歇脚的茶客掉进去的。',
    [
      { label: '拿小树枝抠出来', coins: 2, line: '费了点工夫抠出两文，擦净还能花。' },
      { label: '留在树根讨个吉利', mood: 2, line: '不动旧钱，拍拍手离开，心里舒畅。' },
    ]),
  small('search_wasps', { maps: ['hill'], kinds: ['bush'], seasons: [1, 2], wet: false },
    '灌木里的蜂窝',
    '刚扒开半人高的灌木，里头嗡嗡作响，竟挂着只拳头大的灰纸蜂窝，几只马蜂正绕着窝口打转。',
    [
      { label: '屏住气慢慢退开', check: { attr: 'danliang', dc: 5 },
        onOk: { give: { item: 'berry', n: 2 }, line: '毫发无伤退到一边，还在旁边摘到两颗野莓。' },
        onFail: { energy: -6, mood: -2, line: '慌乱中碰响了树枝，手背被蛰了一下，火辣辣地疼。' } },
      { label: '回头叫云姑来熏走', bond: 'yun',
        line: '你把蜂窝的位置告诉了云姑，免得采茶人被蛰。她点点头记下了。' },
    ]),
  small('search_cat', { maps: ['yard'], kinds: ['yard'], seasons: [2, 3], wet: false },
    '草垛打盹的掌柜',
    '草垛暖窝里蜷着一团毛茸茸的身影，正是小乔家的猫「掌柜」，呼噜呼噜晒太阳，爪边还压着半根干鱼尾。',
    [
      { label: '拿点吃的换它挪窝', give: { item: 'egg', n: 1 }, bond: 'qiao',
        line: '掌柜蹭蹭你裤脚跑回铺子去了，窝底还摸出一颗自家母鸡下的蛋。' },
      { label: '替它掖点干草', mood: 2, bond: 'qiao',
        line: '你悄悄退开。小乔听说了，笑说掌柜往后要认你当半个主人。' },
    ]),
  small('search_stele', { maps: ['creek'], kinds: ['rock'], periods: ['day'] },
    '竹径边的断桥石碑',
    '半截青石旧碑埋在荒草里，上头刻着几行被青苔盖住的模糊小字，像是早年修溪桥时留的记事。',
    [
      { label: '拂净青苔辨认碑文', check: { attr: 'xuewen', dc: 5 },
        onOk: { bond: 'zhou', give: { item: 'moss', n: 1 },
          line: '认出是当年乡邻合资修桥的旧事。讲给爱听古的老周，他听得直点头。' },
        onFail: { give: { item: 'moss', n: 1 }, line: '字迹斑驳认不全，只刮下一片好青苔。' } },
      { label: '拍拍泥土继续赶路', give: { item: 'moss', n: 1 }, line: '顺手揭了一小块青苔。' },
    ]),
  small('search_toadstools', { maps: ['hill'], kinds: ['pine'], seasons: [1, 2], wet: true },
    '松林里的野菌群',
    '湿松针里钻出一大片颜色花哨的伞菌，红白相间，中间却混着两三朵灰褐厚实的寻常野菌。',
    [
      { label: '仔细挑出能吃的几朵', check: { attr: 'yueli', dc: 6 },
        onOk: { give: { item: 'mushroom', n: 2 }, line: '稳稳挑出两朵新鲜菌子，花哨的一朵没碰。' },
        onFail: { line: '越看越拿不准，宁可空手也不乱采。' } },
      { label: '拿棍子划个圈提醒别人', bond: 'yun',
        line: '在毒菌旁插根枯枝做记号。云姑路过见了，夸你细心。' },
    ]),
  small('search_ants', { maps: ['yard'], kinds: ['peach'], seasons: [1], wet: false, rainTomorrow: true },
    '桃树下的蚂蚁搬家',
    '桃树根边黑压压一条长队，成群蚂蚁正衔着白卵往高处树缝里搬。老辈说「蚂蚁搬家蛇过道，明日必有大雨到」。',
    [
      { label: '留心记下天象', check: { attr: 'yueli', dc: 5 },
        onOk: { foresee: true, mood: 3, line: '错不了，明天要下雨。晒着的东西得早点收。' },
        onFail: { mood: 1, line: '只觉得稀奇，看了一会儿就走了。' } },
      { label: '绕开蚁队别踩着', give: { item: 'wood', n: 1 }, line: '顺手在旁边捡了两根干桃枝当柴。' },
    ]),
  small('search_loofah', { maps: ['yard'], kinds: ['yard'], seasons: [2], periods: ['day'] },
    '瓜棚上的老丝瓜',
    '枯黄的瓜藤缠得死紧，底下藏着两根长老了的大丝瓜，敲上去干爽空心，正好搓成刷锅的丝瓜瓤。',
    [
      { label: '拆藤取丝瓜瓤', check: { attr: 'chijia', dc: 5 },
        onOk: { bond: 'gui', mood: 2, line: '剥出两只白净结实的丝瓜瓤，送一只给桂嫂刷锅，她直夸你会过日子。' },
        onFail: { energy: -4, line: '藤蔓拉断，把棚架拽松了，又花力气重新绑好。' } },
      { label: '连藤扯下来当柴', give: { item: 'wood', n: 2 }, line: '扯下一大抱干藤，够烧两回火。' },
    ]),
  small('search_fireflies', { maps: ['river', 'creek'], kinds: ['reeds', 'flowers'], seasons: [1], periods: ['night'] },
    '苇塘夜里的流萤',
    '夜风凉爽，苇梢和野花丛里忽明忽暗浮起几十点黄绿小星子，成群萤火虫正贴着水面慢慢飞。',
    [
      { label: '站着静静看一会儿', energy: 4, mood: 3, line: '暑气全消，心里也静了。' },
      { label: '轻扑一只带给小乔看', check: { attr: 'tige', dc: 5 },
        onOk: { bond: 'qiao', mood: 2, line: '拿竹筒装了一只给小乔写生，看罢放飞。她高兴得直拍手。' },
        onFail: { mood: 1, line: '一扑全飞散了，只带回一身夜露。' } },
    ]),
];

export const SEARCH_EVENTS = Object.freeze(Object.fromEntries(LIST.map(e => [e.id, e])));
