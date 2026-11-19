// 人物五维底子属性、特质属性加成，以及按天倒计时的时限修正表。
// 纯数据，供 sim.modifiers 与面板共读。

export const STATS = Object.freeze({
  farm: { id: 'farm', name: '农务', skill: 'farm', desc: '下地干活、照料菜地与农事判断' },
  cook: { id: 'cook', name: '灶艺', skill: 'cook', desc: '掌火切菜、做饭提味与灶房小事' },
  craft: { id: 'craft', name: '手艺', skill: 'craft', desc: '编竹修补、动手置办与挑货眼力' },
  social: { id: 'social', name: '交际', skill: 'social', desc: '待人接物、茶摊闲话与议价说和' },
  insight: {
    id: 'insight',
    name: '见识',
    skill: 'sky',
    alt: 'forage',
    desc: '看天识路、山野采集与遇事留心',
  },
});

// 现有十二个长期特质对应的五维属性加成（有得有失，贴合人物性格）。
export const TRAIT_STATS = Object.freeze({
  easygoing: { social: 2 },
  handy: { cook: 2 },
  slowwarm: { insight: 1, craft: 1 },
  lively: { social: 2 },
  solitary: { insight: 2 },
  curious: { insight: 2 },
  rainwalker: { farm: 1, insight: 1 },
  coldproof: { farm: 1 },
  heatproof: { farm: 1 },
  hearth: { cook: 2 },
  earlybird: { farm: 1, craft: 1 },
  familiar: { social: 2 },
});

// 时限修正：kind 为 good（青绿增益）或 bad（暖褐减益），days 为默认持续天数。
export const MODIFIERS = Object.freeze({
  good_meal: {
    name: '好饭提劲',
    kind: 'good',
    days: 3,
    desc: '吃了拿手热饭，干活省力，农务与灶艺 +1',
    stats: { farm: 1, cook: 1 },
    cost: -1,
  },
  tea_fame: {
    name: '茶摊好名声',
    kind: 'good',
    days: 10,
    desc: '村里人提起你都说好，交际 +2，说话送礼更投缘',
    stats: { social: 2 },
    relation: 1,
  },
  craft_spark: {
    name: '手艺顺了手',
    kind: 'good',
    days: 7,
    desc: '手上越做越顺，手艺 +2，长本事多得 1 点经验',
    stats: { craft: 2 },
    xp: 1,
  },
  good_harvest: {
    name: '地气顺手',
    kind: 'good',
    days: 5,
    desc: '照料得当，农务 +2，收菜时多收 1 份',
    stats: { farm: 2 },
    yieldFarm: 1,
  },
  kind_heart: {
    name: '人情暖心',
    kind: 'good',
    days: 6,
    desc: '帮了乡邻一把，交际 +2，睡醒多歇回 5 点体力',
    stats: { social: 2 },
    sleep: 5,
  },
  keen_eye: {
    name: '眼力见长',
    kind: 'good',
    days: 5,
    desc: '出门留心细处，见识 +2，采集钓鱼多得 1 份',
    stats: { insight: 2 },
    yieldForage: 1,
  },
  hearth_warm: {
    name: '灶火顺手',
    kind: 'good',
    days: 5,
    desc: '灶台打理稳当，灶艺 +2，睡醒多歇回 6 点体力',
    stats: { cook: 2 },
    sleep: 6,
  },
  visitor_word: {
    name: '外村见闻',
    kind: 'good',
    days: 7,
    desc: '听过客说起外头的事，见识 +2，交际 +1',
    stats: { insight: 2, social: 1 },
  },
  spring_tired: {
    name: '身子发沉',
    kind: 'bad',
    days: 3,
    desc: '没太歇过来，农务 −1，干重活多费 1 点体力',
    stats: { farm: -1 },
    cost: 1,
  },
  awkward_talk: {
    name: '话没说圆',
    kind: 'bad',
    days: 3,
    desc: '刚才一时没接住话头，交际 −1',
    stats: { social: -1 },
  },
  burnt_hand: {
    name: '烫着了手',
    kind: 'bad',
    days: 3,
    desc: '手背有点发红，灶艺 −1，手艺 −1',
    stats: { cook: -1, craft: -1 },
  },
  rain_damp: {
    name: '衣裳受潮',
    kind: 'bad',
    days: 2,
    desc: '沾了湿气，农务 −1，睡醒少歇回 6 点体力',
    stats: { farm: -1 },
    sleep: -6,
  },
});
