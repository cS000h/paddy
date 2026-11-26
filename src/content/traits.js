// 性情、出身、根骨天资、解闷毛病。照 docs/特质与修正表.md（用户 2026-11-19 的原稿，2026-11-23 定下）。
// 只有数据：谁有哪几样、怎么换算、心烦怎么涨落，由规则插件来管。

/** 六项属性。管“这个人”；本事只管干活。 */
export const ATTRS = Object.freeze({
  renqing: '人情',
  chijia: '持家',
  danliang: '胆量',
  yueli: '阅历',
  xuewen: '学问',
  tige: '体格',
});
// 表里的「全主属性」指前五项：「身子骨舒坦：体格 +2、全主属性 +1」把体格分开写了。
export const MAIN_ATTRS = Object.freeze(['renqing', 'chijia', 'danliang', 'yueli', 'xuewen']);

/**
 * 做法标签。每件活、每个动作贴一两个；性情只认标签：顺着它喜欢的心烦降，违着它不喜欢的心烦涨。
 * 以后加性情，只说它喜欢、不喜欢哪些标签，不用回头改每件事。
 */
// prettier-ignore
export const TAGS = Object.freeze({
  farm: '干农活', build: '建修', toil: '干重活、赶工', rest: '歇息喝茶', meal: '吃顿家常饭',
  gift: '送礼请客', help: '帮衬救济', haggle: '讨价还价', refuse: '推辞不帮', save: '攒钱',
  splurge: '大手花钱', chat: '闲聊', crowd: '凑热闹', alone: '独处', stranger: '搭理生人',
  standout: '当众出头', cheat: '占便宜', gossip: '传闲话', lie: '撒谎', fair: '说公道话',
  pry: '套底细', lose: '吃亏认输', offend: '当面得罪人', quiet: '下棋钓鱼煮茶', rash: '冲动行事',
  hurry: '抢先赶路', wait: '干等', risk: '冒险', guard: '护院守夜', flee: '避开是非',
  home: '在家安稳过', confront: '跟人起冲突', gamble: '贪心冒大险', excel: '拔头筹', yield: '把机会让人',
  trust: '信人、留宿外人', doubt: '疑人、留一手', expose: '识破揭穿', unknown: '吃来历不明的东西',
});

/**
 * 背后的打分值，−100 到 100：村民挑动作时用，玩家不看这些数（照 CK3 的 ai_greed 之类）。
 * 贪、守规矩、爱来往、胆量、记仇、爱折腾、信人、图多。
 */
export const AI_KEYS = Object.freeze([
  'greed',
  'honor',
  'social',
  'bold',
  'vengeful',
  'energy',
  'trust',
  'ambition',
]);

/**
 * 八对性情，每人三个，每对最多一个。同一个性情的人好感 +10，对立的 −10（规则里算）。
 * attrs 对六项的加减；likes、dislikes 顺着、违着的做法标签；ai 背后的打分值；
 * gain、relief 心烦涨、降的倍数；lonely 连着几天没跟人说话心烦就涨。
 */
// prettier-ignore
export const TEMPERS = Object.freeze({
  diligent:   { name: '勤勉', pair: 'work', attrs: { chijia: 1, xuewen: 2, renqing: 1 }, likes: ['farm', 'build'], dislikes: [], relief: 0.5, ai: { energy: 40, ambition: 10 } },
  lazy:       { name: '懒散', pair: 'work', attrs: { chijia: -1, xuewen: -1 }, likes: ['rest'], dislikes: ['toil'], relief: 1.5, ai: { energy: -40, ambition: -10 } },
  generous:   { name: '大方', pair: 'money', attrs: { renqing: 2, chijia: -1 }, likes: ['gift', 'help'], dislikes: ['haggle', 'refuse'], ai: { greed: -40, honor: 10, social: 10 } },
  stingy:     { name: '抠门', pair: 'money', attrs: { chijia: 2, renqing: -2 }, likes: ['haggle', 'save'], dislikes: ['gift', 'splurge'], ai: { greed: 40, social: -10 } },
  gregarious: { name: '热络', pair: 'social', attrs: { renqing: 2, danliang: 1 }, likes: ['chat', 'crowd', 'gift'], dislikes: [], lonely: 3, ai: { social: 50, energy: 10 } },
  shy:        { name: '怕生', pair: 'social', attrs: { xuewen: 1, yueli: 1, renqing: -2 }, likes: ['alone'], dislikes: ['stranger', 'standout'], ai: { social: -50, bold: -10 } },
  honest:     { name: '厚道', pair: 'honesty', attrs: { renqing: 2, yueli: -2 }, likes: ['help', 'fair'], dislikes: ['cheat', 'gossip', 'lie'], ai: { honor: 50, greed: -10, trust: 10 } },
  sly:        { name: '圆滑', pair: 'honesty', attrs: { yueli: 2, renqing: -1 }, likes: ['haggle', 'pry'], dislikes: ['lose', 'offend'], ai: { honor: -40, social: 10 } },
  calm:       { name: '沉稳', pair: 'temper', attrs: { xuewen: 2, yueli: 1 }, likes: ['quiet'], dislikes: ['rash'], ai: { vengeful: -30, bold: -10 } },
  hasty:      { name: '急躁', pair: 'temper', attrs: { danliang: 1, xuewen: -1 }, likes: ['hurry'], dislikes: ['wait'], ai: { vengeful: 30, bold: 20, energy: 10 } },
  brave:      { name: '勇敢', pair: 'courage', attrs: { danliang: 2, tige: 2 }, likes: ['risk', 'standout', 'guard'], dislikes: ['flee'], ai: { bold: 50 } },
  craven:     { name: '怯懦', pair: 'courage', attrs: { yueli: 2, danliang: -2, tige: -2 }, likes: ['flee', 'home'], dislikes: ['risk', 'confront'], ai: { bold: -50 } },
  content:    { name: '知足', pair: 'want', attrs: { xuewen: 1, renqing: 1, danliang: -1 }, likes: ['meal'], dislikes: ['gamble'], relief: 1.15, ai: { ambition: -40, greed: -20 } },
  ambitious:  { name: '要强', pair: 'want', attrs: { renqing: 1, chijia: 1, danliang: 1, yueli: 1, xuewen: 1 }, likes: ['excel'], dislikes: ['lose', 'yield'], gain: 1.25, ai: { ambition: 40, vengeful: 10 } },
  trusting:   { name: '轻信', pair: 'trust', attrs: { renqing: 2, yueli: -2 }, likes: ['stranger', 'trust'], dislikes: ['doubt'], ai: { trust: 50 } },
  paranoid:   { name: '多心', pair: 'trust', attrs: { yueli: 3, renqing: -1 }, likes: ['doubt', 'expose'], dislikes: ['trust', 'unknown'], gain: 1.5, ai: { trust: -50, vengeful: 10 } },
});

/** 性情的一句话：人物页上性情图标底下的小字。照上面的 likes、dislikes 写，改了标签记得一起改。 */
// prettier-ignore
export const TEMPER_DESC = Object.freeze({
  diligent: '闲不住，干完农活心里才踏实', lazy: '能歇就歇，赶工最烦心',
  generous: '爱送礼请客，压价推辞心里难受', stingy: '钱攥得紧，赶集压价最舒坦',
  gregarious: '爱扎堆说话，几天没人聊就闷', shy: '一个人待着自在，见生人发怵',
  honest: '爱帮人说公道话，占便宜撒谎不安', sly: '会说话会议价，最怕吃亏得罪人',
  calm: '下棋钓鱼煮茶，遇事不慌', hasty: '风风火火，干等最难熬',
  brave: '敢冒险爱出头，退缩心里憋屈', craven: '能躲就躲，在家最安稳',
  content: '一顿家常饭就开心，不争不抢', ambitious: '事事想拔头筹，认输最难受',
  trusting: '信人好结交，疑人反倒难受', paranoid: '凡事留一手，识破猫腻才踏实',
});

/** 八对，每对两个性情：前一个、后一个。 */
export const PAIRS = Object.freeze(
  Object.entries(TEMPERS).reduce((all, [id, t]) => {
    (all[t.pair] ||= []).push(id);
    return all;
  }, /** @type {Record<string, string[]>} */ ({})),
);

/**
 * 出身线：开局一级，对口的本事练到 LINE_UP_AT 那几级时各升一级（暂定）。
 * pure 纯主修：主属性 +2/+4/+6/+8，对口本事经验 +10%～+40%；dual 细分双修：主属性 +1/+3/+5/+6，副属性 +1/+1/+2/+3。
 * 「烧火丫头/小子」照不分男女的说法写成「烧火帮手」。
 */
export const LINE_BONUS = Object.freeze({
  pure: Object.freeze({ main: [2, 4, 6, 8], xp: [0.1, 0.2, 0.3, 0.4] }),
  dual: Object.freeze({ main: [1, 3, 5, 6], sub: [1, 1, 2, 3] }),
});
export const LINE_UP_AT = Object.freeze([2, 4, 5]);
// prettier-ignore
export const LINES_OF_ORIGIN = Object.freeze({
  farmer:    { name: '农桑庄户', kind: 'pure', main: 'chijia', skill: 'farm', titles: ['笨手庄户', '勤快庄户', '持家好手', '田庄大掌柜'], note: '种田与家业上限' },
  cook:      { name: '灶台帮工', kind: 'dual', main: 'chijia', sub: 'xuewen', skill: 'cook', titles: ['烧火帮手', '切配帮厨', '掌勺好手', '十里名厨'], note: '做菜与菜谱领悟' },
  neighbor:  { name: '乡邻热面', kind: 'pure', main: 'renqing', skill: 'social', titles: ['嘴笨生客', '熟络乡邻', '八面玲珑', '十里体面人'], note: '送礼、名声与说和' },
  teahouse:  { name: '茶楼跑堂', kind: 'dual', main: 'renqing', sub: 'yueli', skill: 'social', titles: ['端茶学徒', '机灵堂倌', '掌柜心腹', '镇上大东家'], note: '茶摊情报与留客' },
  hunter:    { name: '山野猎采', kind: 'dual', main: 'danliang', sub: 'tige', skill: 'forage', titles: ['怯步生手', '熟路山客', '敢闯汉子', '镇山好把式'], note: '后山探索与抗险' },
  boatman:   { name: '渡口船家', kind: 'dual', main: 'danliang', sub: 'yueli', skill: 'forage', titles: ['撑篙学徒', '熟水船工', '跑江老大', '河湾把头'], note: '渡口外客与远行' },
  peddler:   { name: '行脚货郎', kind: 'pure', main: 'yueli', skill: 'social', titles: ['懵懂挑夫', '走村货郎', '精明客商', '跑码头的行家'], note: '鉴货、议价与稀罕物' },
  broker:    { name: '牙行媒人', kind: 'dual', main: 'yueli', sub: 'renqing', skill: 'social', titles: ['跑腿小厮', '牵线牙人', '老练中人', '金牌大媒'], note: '说亲、拉纤与打听底细' },
  scholar:   { name: '耕读传家', kind: 'pure', main: 'xuewen', skill: 'sky', titles: ['粗通文墨', '识字书生', '博闻秀才', '宿学先生'], note: '看天时、读书与教娃' },
  herbalist: { name: '医馆药童', kind: 'dual', main: 'xuewen', sub: 'chijia', skill: 'forage', titles: ['晒药小童', '抓药伙计', '游方郎中', '仁心大夫'], note: '辨草药、治风寒与养生' },
});

/**
 * 根骨天资，会遗传（传家时用）。有 line 的是分级的一条线，同一条线只能有一个，lv 正的越高越强、负的是短板；
 * 没有 line 的是单条的。firstMeet 初见好感，sameTrait 同有这一条的人互相好感，xp 全部本事的经验倍数，
 * hook 以后事件和规则认的钩子（多睡、易着凉、偷听……），现在只登记。
 */
// prettier-ignore
export const INNATE = Object.freeze({
  bright1:    { name: '灵光', line: 'wit', lv: 1, attrs: { xuewen: 2 } },
  bright2:    { name: '聪慧', line: 'wit', lv: 2, attrs: { xuewen: 4, yueli: 2 } },
  bright3:    { name: '天生我才', line: 'wit', lv: 3, attrs: { xuewen: 6, yueli: 3 }, xp: 0.2 },
  dull:       { name: '木讷', line: 'wit', lv: -1, attrs: { xuewen: -2, yueli: -1 } },
  sturdy1:    { name: '壮实', line: 'build', lv: 1, attrs: { tige: 3 } },
  sturdy2:    { name: '筋骨硬朗', line: 'build', lv: 2, attrs: { tige: 5, danliang: 1 } },
  sturdy3:    { name: '天生神力', line: 'build', lv: 3, attrs: { tige: 8, danliang: 2 }, hook: 'heavyWorkCheap' },
  frail1:     { name: '纤弱', line: 'build', lv: -1, attrs: { tige: -2 } },
  frail2:     { name: '体弱多病', line: 'build', lv: -2, attrs: { tige: -5 }, hook: 'catchesCold' },
  fair1:      { name: '周正', line: 'looks', lv: 1, firstMeet: 5 },
  fair2:      { name: '清秀', line: 'looks', lv: 2, attrs: { renqing: 1 }, firstMeet: 12 },
  fair3:      { name: '国色天香', line: 'looks', lv: 3, attrs: { renqing: 2 }, firstMeet: 25 },
  plain1:     { name: '相貌平平', line: 'looks', lv: -1, firstMeet: -5 },
  plain2:     { name: '歪瓜裂枣', line: 'looks', lv: -2, attrs: { danliang: 1 }, firstMeet: -15 },
  fertile:    { name: '好生养', line: 'kin', lv: 1, hook: 'fertile' },
  barren:     { name: '子息淡薄', line: 'kin', lv: -1, hook: 'adoption' },
  gourmet:    { name: '食神', attrs: { yueli: 1 }, hook: 'tasteRecipe' },
  sharpEar:   { name: '顺风耳', attrs: { yueli: 2 }, hook: 'overhear' },
  steady:     { name: '手稳', attrs: { chijia: 1, tige: 1 }, hook: 'steadyHand' },
  petFriend:  { name: '招猫逗狗', attrs: { renqing: 1 }, hook: 'pets' },
  lefty:      { name: '左撇子', attrs: { xuewen: 1, yueli: 1 }, sameTrait: 15, hook: 'eldersFrown' },
  stutter:    { name: '结巴', attrs: { renqing: -2 }, sameTrait: 10 },
  nightBlind: { name: '夜盲', hook: 'nightBlind' },
});

/** 解闷毛病：心烦满了从两三个里挑一个，一直带着；做 relief 那件事心烦大降。 */
// prettier-ignore
export const COPING = Object.freeze({
  drink:    { name: '贪杯', attrs: { chijia: -1, tige: -1 }, relief: 'drink', note: '喝顿黄酒大幅降压' },
  gluttony: { name: '暴食', attrs: { chijia: -1 }, relief: 'feast', hook: 'hungerFaster', note: '吃道大菜或零嘴大幅降压' },
  recluse:  { name: '闭门谢客', attrs: { renqing: -2, xuewen: 1 }, relief: 'shutIn', note: '独处半日不出院大幅降压' },
  grumble:  { name: '大倒苦水', attrs: { yueli: -1 }, relief: 'vent', hook: 'leaksFamily', note: '找熟人唠半天嗑大幅降压' },
  spree:    { name: '乱买', relief: 'spree', hook: 'impulseBuy', note: '花一笔铜钱买小玩意降压' },
  outburst: { name: '无名火起', attrs: { renqing: -2, danliang: 1 }, relief: 'outburst', hook: 'hurtsBystanders', note: '发作一次立刻降压，但扣身旁人好感' },
});

/**
 * 原先开局两选给的六个旧特质换成了什么：存档升级用它；它们的好处（歇息多回体力之类）
 * 也照它挂在性情和出身线上，册子里写在那个性情底下。
 * 做出来的六个（雨中行者等）照旧，叫「历练」，不在这里。
 */
export const OLD_TRAITS = Object.freeze({
  easygoing: { temper: 'content' },
  handy: { temper: 'diligent' },
  slowwarm: { temper: 'calm' },
  lively: { temper: 'gregarious' },
  solitary: { temper: 'shy' },
  curious: { line: 'scholar' },
});
// 换过来不满三个性情也不补：开局草案二里，第三个性情本来就是头半个月做出来的。
