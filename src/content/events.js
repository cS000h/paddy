import { SCENE_MAP } from './events-scene.js';
// 随机事件配置表：晨起小事、场景遇事、过几天后续。
// 每件小事落在具体地点（spot），玩家走到跟前在底部对话条里处理。

/** 检定成功率（15%–95%）：面板显示与规则结算共用同一套公式。 */
export const checkChance = (statValue, dc) =>
  Math.max(15, Math.min(95, 50 + (statValue - dc) * 12));

export const EVENTS = Object.freeze({
  // — 晨起小事（6 个，各自落在院里或屋里的具体位置） —
  morning_swallow: {
    id: 'morning_swallow',
    trigger: 'morning',
    spot: { map: 'yard', x: 8, y: 11, place: '屋檐下', hint: '屋檐下好像有鸟雀在动' },
    title: '檐下新泥',
    text: '屋檐角多了一小团湿泥，有鸟雀来回叼草，像要在檐下做窝。',
    choices: [
      { label: '留个清静', mood: 3, line: '你轻手轻脚走开，心里觉得院子热闹了些。' },
      {
        label: '搭木板挡雨',
        check: { stat: 'craft', dc: 3 },
        onOk: {
          mod: 'kind_heart',
          delay: { id: 'delay_swallow', days: 3 },
          line: '木板钉得稳稳当当，鸟雀绕着檐下飞了一圈。',
        },
        onFail: { mod: 'spring_tired', line: '木凳有点晃，忙活半天出一身汗，总算挂住了。' },
      },
      {
        label: '「早起的人」细看动静',
        reqTrait: 'earlybird',
        mod: 'keen_eye',
        mood: 4,
        line: '晨光清亮，你顺手把院角也收拾干净，一天都有精神。',
      },
    ],
  },
  morning_rice_damp: {
    id: 'morning_rice_damp',
    trigger: 'morning',
    spot: { map: 'cottage', x: 12, y: 7, place: '屋里橱柜边', hint: '屋里米缸边好像有点潮味' },
    title: '米缸受潮',
    text: '掀开橱柜边的小缸盖，闻到一点潮气，缸底的米像是受了湿。',
    choices: [
      {
        label: '摊开慢慢晾',
        mood: 2,
        mod: 'hearth_warm',
        line: '把米摊开晒在风口，心里踏实多了。',
      },
      {
        label: '生火烤干缸身',
        check: { stat: 'cook', dc: 3 },
        onOk: {
          mod: 'hearth_warm',
          give: { item: 'rice', n: 1 },
          line: '火候拿捏得刚好，还从缸角扫出一把好米。',
        },
        onFail: { mod: 'burnt_hand', line: '缸沿烤得太烫，不小心沾了一下手背。' },
      },
      {
        label: '「自己动手」顺手理柜',
        reqTrait: 'handy',
        mod: 'craft_spark',
        give: { item: 'salt', n: 1 },
        line: '手脚顺手，把橱柜理得清清爽爽，还在角落翻出一包盐。',
      },
    ],
  },
  morning_well_rope: {
    id: 'morning_well_rope',
    trigger: 'morning',
    spot: { map: 'yard', x: 17, y: 18, place: '井边', hint: '井边好像有动静，去看看井绳吧' },
    title: '井绳发毛',
    text: '辘轳上的麻绳磨出一截毛边，再使劲拉怕是要断。',
    choices: [
      { label: '先轻手打水', mood: 1, line: '放慢手劲打了一桶水，记着回头再换新绳。' },
      {
        label: '拆开重新拧紧',
        check: { stat: 'craft', dc: 3 },
        onOk: {
          mod: 'craft_spark',
          delay: { id: 'delay_well_thanks', days: 3 },
          line: '麻绳拧得紧实又顺手，邻里来打水准能看出来。',
        },
        onFail: { mod: 'spring_tired', line: '绳子缠得有点别扭，费了好大劲才理顺。' },
      },
      {
        label: '「随和」喊街坊搭手',
        reqTrait: 'easygoing',
        mod: 'tea_fame',
        mood: 4,
        line: '两三句话就有人过来搭手，一会儿就把井绳理好了。',
      },
    ],
  },
  morning_ants_rain: {
    id: 'morning_ants_rain',
    trigger: 'morning',
    spot: { map: 'yard', x: 6, y: 18, place: '菜地边', hint: '菜地边土坡上好像有动静' },
    title: '墙根搬家',
    text: '菜地边土坡上，一串小虫排成行往高处爬，风里带着点土腥味。',
    choices: [
      { label: '记在心里', mood: 2, line: '心里先有了准备，做事不慌不忙。' },
      {
        label: '顺沟看水路',
        check: { stat: 'farm', dc: 3 },
        onOk: { mod: 'good_harvest', line: '把堵住的土块扒开，菜地透气不少。' },
        onFail: { mod: 'rain_damp', line: '脚下一滑踩进湿泥里，裤脚沾了不少水气。' },
      },
      {
        label: '「好问」看云记一笔',
        reqTrait: 'curious',
        mod: 'keen_eye',
        give: { item: 'herb', n: 1 },
        line: '边看天色边在路边采了一把新鲜香草，摸清了村里天气的门道。',
      },
    ],
  },
  morning_cat_gate: {
    id: 'morning_cat_gate',
    trigger: 'morning',
    spot: { map: 'yard', x: 8, y: 14, place: '院门口', hint: '院门口好像有动静' },
    title: '篱笆外的花猫',
    text: '小乔那只花猫蹲在院门口晒太阳，听见脚步声也不躲，只抬头看你。',
    choices: [
      { label: '摸摸脑袋', mood: 4, line: '花猫眯着眼睛蹭了蹭你的手，心情轻快起来。' },
      {
        label: '拿点吃食逗它',
        check: { stat: 'social', dc: 2 },
        onOk: {
          mod: 'kind_heart',
          give: { item: 'egg', n: 1 },
          line: '花猫吃得开心，临走前在草窝边扒拉出一只鸡蛋。',
        },
        onFail: { mod: 'awkward_talk', line: '花猫闻了闻转身就走，留你站在门口有点好笑。' },
      },
      {
        label: '「慢热」安静陪会儿',
        reqTrait: 'slowwarm',
        energy: 8,
        mood: 5,
        line: '谁也没打扰谁，晒了一会儿太阳，精神足了不少。',
      },
    ],
  },
  morning_parcel: {
    id: 'morning_parcel',
    trigger: 'morning',
    spot: { map: 'yard', x: 9, y: 14, place: '院门口', hint: '院门口好像夹着张纸条' },
    title: '门缝里的小纸条',
    text: '院门缝夹着半张纸，写着村口今天有外乡人经过，想打听新鲜菜的价钱。',
    choices: [
      { label: '收好纸条', coins: 4, line: '折好纸条收起来，还拾到几文零钱。' },
      {
        label: '算准菜价搭话',
        check: { stat: 'insight', dc: 3 },
        onOk: {
          coins: 10,
          mod: 'visitor_word',
          delay: { id: 'delay_tea_tip', days: 2 },
          line: '你心里门儿清，几句话就把行情说透了。',
        },
        onFail: { mod: 'awkward_talk', line: '一时没算准份量，说得不太顺口，只好作罢。' },
      },
      {
        label: '「爱热闹」去村口看看',
        reqTrait: 'lively',
        mod: 'tea_fame',
        coins: 6,
        line: '一早就在村口和人聊得火热，消息灵通了不少。',
      },
    ],
  },
  ...SCENE_MAP,
  // — 过几天伏笔后续（4 个） —
  delay_swallow: {
    id: 'delay_swallow',
    trigger: 'delayed',
    spot: { map: 'yard', x: 8, y: 11, place: '屋檐下', hint: '屋檐下叫个不停，去看看吧' },
    title: '檐下有了新邻居',
    text: '前几天挡过雨的小窝搭好了，院里鸟声清脆，地里的虫子也少了些。',
    choices: [
      { label: '笑着开工', mod: 'good_harvest', mood: 6, line: '院子热闹好看，干活更有劲头了。' },
      {
        label: '撒几粒碎米',
        cost: { coins: 2 },
        mod: 'kind_heart',
        mood: 8,
        line: '小鸟落在窗台上啄米，整日心情舒畅。',
      },
    ],
  },
  delay_well_thanks: {
    id: 'delay_well_thanks',
    trigger: 'delayed',
    spot: { map: 'yard', x: 17, y: 18, place: '井边', hint: '井边好像放着东西' },
    title: '井边留下的谢礼',
    text: '前几天修好的井绳很顺手，井台上多了一小袋米和字条，是邻里凑的谢意。',
    choices: [
      {
        label: '欢喜收下',
        give: { item: 'rice', n: 2 },
        mod: 'tea_fame',
        mood: 5,
        line: '好名声在村里传开了，大伙儿都记着你的好。',
      },
      { label: '记在心里', coins: 6, mod: 'kind_heart', line: '邻里和气，心里暖烘烘的。' },
    ],
  },
  delay_tea_tip: {
    id: 'delay_tea_tip',
    trigger: 'delayed',
    spot: { map: 'market', x: 13, y: 13, place: '村口杂货铺', hint: '村口那边好像有人找你' },
    title: '行情用上了',
    text: '前两天打听到的集市消息用上了，村口有人照你说的价钱收走了多余菜蔬。',
    choices: [
      { label: '收下顺手钱', coins: 14, mood: 4, line: '消息灵通果然管用，手头宽裕了不少。' },
      {
        label: '再打听下季行情',
        coins: 8,
        mod: 'visitor_word',
        line: '一面有进账又涨了见识，两头都好。',
      },
    ],
  },
  delay_visitor_back: {
    id: 'delay_visitor_back',
    trigger: 'delayed',
    spot: { map: 'tea', x: 13, y: 13, place: '樟树茶摊', hint: '樟树茶摊那边好像有你的口信' },
    title: '货客捎来的回信',
    text: '上次在樟树茶摊聊得投机的货客托人捎来干货和几文钱，说下回赶集再来喝茶。',
    choices: [
      {
        label: '收下干货',
        give: { item: 'cake', n: 2 },
        coins: 8,
        mod: 'tea_fame',
        line: '外乡熟客都记挂着你，日子越过越有盼头。',
      },
      {
        label: '留菜种备换货',
        give: { item: 'seed.qingcai', n: 3 },
        mod: 'visitor_word',
        line: '多了几条路子，往后赶集更有看头。',
      },
    ],
  },
});

export const MORNING_EVENTS = Object.freeze(
  Object.values(EVENTS)
    .filter(e => e.trigger === 'morning')
    .map(e => e.id),
);
export const SCENE_EVENTS = Object.freeze(
  Object.values(EVENTS)
    .filter(e => !['morning', 'delayed'].includes(e.trigger))
    .map(e => e.id),
);
