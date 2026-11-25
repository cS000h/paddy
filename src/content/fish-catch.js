// 钓上来的不是鱼（Gemini G-09）。只有数据，规则在 sim/plugins/fishing.js。
//
// 两种来路：
//   FISH_THINGS 有东西来咬、按时提了竿，偶尔拉上来的是河虾、毛蟹、瓷片……（占咬钩的一成上下）。
//               照钓鱼那样看漂、遛，只是不量长短、不记纪录。
//   FISH_JUNK   浮漂沉下去你提晚了，鱼跑了，钩子倒挂上一团水草、一块石头。只在提晚了时有，
//               所以接连两竿都是这些的时候不多；空欢喜不进正常咬钩的那一份。

/**
 * 咬钩时偶尔拉上来的东西。
 *   item   物品编号；n 一回几份
 *   spots  在哪处钓点、各有几份（跟同一处别的东西比）
 *   season 各季的倍数 [春, 夏, 秋, 冬]；dusk 清早傍晚的倍数；wet 近来下过雨的倍数
 *   heft   遛起来当几寸长的鱼算（越沉收得越慢）；runs 会不会挣两下
 *   line   拉上来时那句
 */
export const FISH_THINGS = Object.freeze({
  shrimp: {
    id: 'shrimp',
    item: 'shrimp',
    n: 1,
    spots: { yard: 3, creek: 3 },
    season: [1.2, 1.2, 0.5, 0],
    dusk: 1.6,
    wet: 1,
    heft: 2,
    runs: 0,
    line: '钩上挂着只青壳河虾，两根须直弹！',
  },
  snail: {
    id: 'snail',
    item: 'snail',
    n: 2,
    spots: { yard: 2, creek: 1.5 },
    season: [1, 1, 0.4, 0],
    dusk: 1,
    wet: 2,
    heft: 1,
    runs: 0,
    line: '钩尖挂上来两颗带泥的青螺蛳。',
  },
  mussel: {
    id: 'mussel',
    item: 'mussel',
    n: 1,
    spots: { river: 1.5, yard: 0.6 },
    season: [1, 1, 0.4, 0],
    dusk: 1,
    wet: 1,
    heft: 7,
    runs: 0,
    line: '沉甸甸的还以为是大鱼，原是只老河蚌。',
  },
  crab: {
    id: 'crab',
    item: 'crab',
    n: 1,
    spots: { river: 2, creek: 1 },
    season: [0, 0.3, 1.6, 0.2],
    dusk: 1.6,
    wet: 1.6,
    heft: 4,
    runs: 1,
    line: '这家伙死夹着饵不松钳，拉上来还吐泡！',
  },
  shard: {
    id: 'shard',
    item: 'shard',
    n: 1,
    spots: { river: 0.5, creek: 0.4 },
    season: [1, 1, 1, 1],
    dusk: 1,
    wet: 3,
    heft: 2,
    runs: 0,
    line: '泥沙里带出块青釉瓷片，花纹还清清楚楚。',
  },
  oldCoin: {
    id: 'oldCoin',
    item: 'oldCoin',
    n: 1,
    spots: { river: 0.4 },
    season: [1, 1, 1, 1],
    dusk: 1,
    wet: 1,
    heft: 1,
    runs: 0,
    line: '钩挂住一枚带绿锈的旧铜钱，冲冲还能认字。',
  },
  shuttle: {
    id: 'shuttle',
    item: 'shuttle',
    n: 1,
    spots: { yard: 0.3, creek: 0.3 },
    season: [1, 1, 1, 0.5],
    dusk: 0.5,
    wet: 0.5,
    heft: 2,
    runs: 0,
    line: '捞上来一只绕着麻线的木梭，像是谁掉的。',
  },
});

/** 提竿晚了，钩子倒挂上来的东西。spots 同上；season 不写就是一年到头都有；wet 只在近来下过雨时有。 */
const junk = (item, spots, line, more = {}) =>
  Object.freeze({ item, spots, line, season: null, wet: false, ...more });

export const FISH_JUNK = Object.freeze([
  junk('waterweed', { yard: 3, creek: 3, river: 3 }, '沉得吓人，拉出水是一大团滴水的水草。'),
  junk('pebble', { yard: 1.5, creek: 1.5 }, '挂了半天底，扯上来块圆溜溜的石头。'),
  junk('willowTwig', { yard: 1.2, creek: 1.2 }, '线缠住一截嫩柳条，甩得水花四溅。', {
    season: [0, 1],
  }),
  junk('oldSandal', { river: 1.5, yard: 1 }, '谁家冲下来的破草鞋，泡得沉甸甸的。', { wet: true }),
]);

/**
 * 别人掉了的东西：还给失主，他说的话比寻常送礼的那句重（情分照最爱吃的那一道算）；
 * thanks 是失主回送的东西。钓上来的木梭，和走图翻找碰上的八样失物（G-08 小事 1–8）。
 * 失物一件只有一回，不进图鉴。
 */
const lost = (owner, line, thanks = null) => Object.freeze({ owner, line, thanks });
export const FOUND_OWNERS = Object.freeze({
  shuttle: lost('gui', '桂嫂一拍大腿：“哎哟，上午漂线掉水里急死我了，多亏你！”'),
  pipe: lost('zhou', '老周摩挲着铜烟锅：“我还当掉河里了呢！多亏你眼尖，拿两条小鱼去。”', {
    item: 'fish.crucian',
    n: 2,
  }),
  kite: lost('qiao', '小乔把风筝护在胸前：“没撕破！我画掌柜画了三晚，糖你拿着！”', {
    item: 'candy',
    n: 1,
  }),
  thimble: lost('gui', '桂嫂把顶针套回手指：“可找着了！没它纳不匀鞋底，拿罐脆萝卜去！”', {
    item: 'pickle',
    n: 1,
  }),
  purse: lost('aman', '阿满一把拍上你肩：“救命恩人哪！少一文我都得赔工钱，回头请你吃包子！”'),
  stripKnife: lost('shi', '石伯拿袖口擦擦刀背：“没崩口。跟了我四十年的老刀，这几根篾你拿去。”', {
    item: 'strip',
    n: 3,
  }),
  sachet: lost('yun', '云姑攥紧布袋，低声道：“原来掉蕨丛里了……谢你没拆开……这把茶你拿着。”', {
    item: 'tea',
    n: 1,
  }),
  bell: lost('qiao', '小乔捏着小铃铛直晃：“掌柜没铃总悄声吓我！麦芽糖请你吃！”', {
    item: 'candy',
    n: 1,
  }),
  tally: lost('aman', '阿满拍着脑门直喘气：“就说少了一块！算错账桂嫂得骂死我，多亏你！”'),
});
