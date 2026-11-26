// 彩头（Gemini G-06 名单、G-13 图和举起来那一下）：每样收成一个叫得出名字的，很少见。只有数据；
// 怎么抽在 sim/plugins/quality.js：先抽中极品，再按这里的 odds 抽一回彩头。图在 art/prizes.js。
//   item  从哪样收成里出（寻常的编号）       kind  哪样活（farm 种地、fish 钓鱼、forage 采和翻、egg 捡蛋）
//   odds  抽中极品之后再出彩头的机会（百分数），按「一年碰得上几回」分档：天天能收的少，一年采不了几回的多
//   season 只在这几季出（0 春 1 夏 2 秋 3 冬），null 是收成当季就有
//   lift  举过头顶（又大又沉的五样，G-13 审稿定的）；其余捧在胸前看一眼
//   line  图谱里的一句；clue 没找到时的线索
//   got   收到时底下说的一句；say 旁边的村民冒的一句（谁在跟前谁说，都不在就只说 got）

/** 彩头的物品编号：prize. 接名字。 */
export const prizeId = id => 'prize.' + id;

/** 彩头的基准价是寻常的几倍。 */
export const PRIZE_PRICE = 6;

/** 三档：天天能收的、一季收好几回的、一年采不了几回的。 */
const DAILY = 6;
const SEASONAL = 10;
const RARE = 25;

const p = (item, name, kind, odds, more) =>
  Object.freeze({ item, name, kind, odds, season: null, lift: false, ...more });

// prettier-ignore
export const PRIZES = Object.freeze({
  frostBokChoy: p('veg.qingcai', '霜心青菜', 'farm', DAILY, {
    line: '外叶墨绿挂银霜，菜心透出鹅黄亮色。',
    clue: '秋天的青菜，地养得好',
    season: [2],
    got: '叶边挂着细霜，菜心亮得像块鹅黄玉。',
    say: { gui: '哟，霜心都结出来了！清炒比放糖还甜！', shi: '菜帮厚实，没虫眼，拿去镇上能多挣些。' },
  }),
  firstCutChive: p('chive', '头刀紫根韭', 'farm', DAILY, {
    line: '翠绿嫩韭，根头裹一截紫红衣。',
    clue: '开春头一茬韭菜',
    season: [0],
    got: '镰刀刚落，辛香就扑满袖口，根头裹着紫红衣。',
    say: { shi: '正经头刀紫根韭！这味儿地道，别贱卖了。', aman: '配你家鸡蛋炒一盘，我能扒三大碗饭！' },
  }),
  twinCucumber: p('cucumber', '并蒂黄瓜', 'farm', SEASONAL, {
    line: '一个瓜蒂吊着两根，顶花都还开着。',
    clue: '夏天的黄瓜藤上',
    got: '一个瓜蒂吊着两根嫩瓜，顶上的小黄花还开着。',
    say: { gui: '哎哟，并蒂黄瓜！成双的好彩头！', zhou: '早年谁家摘着并蒂瓜，都要请邻里喝碗凉茶。' },
  }),
  longBean: p('longbean', '尺半长豆', 'farm', SEASONAL, {
    line: '拉直过尺半，还嫩得掐出水。',
    clue: '夏秋的豆角架上',
    got: '顺着藤一扯再扯，拽出根能绕手两圈的嫩长豆。',
    say: { aman: '好家伙，这豆角都能当绳子捆柴禾了！', shi: '肥水足、架子搭得好，才长得出这号长豆。' },
  }),
  pumpkinKing: p('pumpkin', '南瓜王', 'farm', SEASONAL, {
    line: '扁圆金黄，比寻常大出一大圈。',
    clue: '南瓜地，肥水要足',
    lift: true,
    got: '双手合抱才搬离地，这颗怕是全村的南瓜王！',
    say: { shi: '咚咚响，实心！种了一辈子地也没抱过这么沉的！', aman: '快抬我板车上，推去村口转一圈！' },
  }),
  jadeRadish: p('radish', '玉白好彩头', 'farm', SEASONAL, {
    lift: true,
    line: '瓷白胖实，几乎没有须根。',
    clue: '秋冬的萝卜地',
    got: '使劲一拔，带出根瓷白胖实的大萝卜，真拔了个好彩头！',
    say: { gui: '这菜头又白又顺溜，开年摆灶头最吉利！', zhou: '拔着好彩头，明儿出门准顺风顺水！' },
  }),
  goldenCabbage: p('cabbage', '金心大白菜', 'farm', SEASONAL, {
    line: '包得紧滚滚，顶上露出金黄菜心。',
    clue: '冬天的白菜地',
    season: [3],
    lift: true,
    got: '抱起来沉甸甸的，掰开外叶，里头裹着颗金黄菜心！',
    say: { gui: '好沉一颗金心菜！腌酸菜全村谁也比不过！', qiao: '外白里金，像包了块金元宝！' },
  }),
  doubleYolkEgg: p('egg', '双黄大鸡蛋', 'egg', DAILY, {
    line: '大一圈的蛋，对光一照两个黄。',
    clue: '自家鸡窝，鸡要喂好',
    lift: true,
    got: '稻草窝里摸出颗沉甸甸的大蛋，对光一照，竟是双黄！',
    say: { gui: '双黄蛋！好事成双，准有喜事登门！', shi: '母鸡养得壮才下得出双黄，鸡窝收拾得妥当。' },
  }),
  goldenRedCarp: p('fish.carp', '金鳞红鲤', 'fish', SEASONAL, {
    line: '通体朱红，背鳍尾鳍镶浅金边。',
    clue: '渡口深水，钓鲤鱼时',
    lift: true,
    got: '水面哗啦一跃，钓上条朱红发亮的大红鲤！',
    say: { zhou: '哎哟，金鳞红鲤！见一回整月行船都顺当！', aman: '红得跟灯笼似的，放回河里准添福气！' },
  }),
  goldenWinterShoot: p('shoot', '金衣冬笋', 'forage', RARE, {
    line: '胖墩墩裹着金黄笋衣，一点不苦。',
    clue: '冬天的竹林',
    season: [3],
    got: '刨开松土，滚出颗金灿灿、胖墩墩的实心冬笋！',
    say: { shi: '没见着日头的金衣冬笋，一点不苦！', gui: '配腊肉炖一锅，鲜得人要舔碗！' },
  }),
  goldenPineMushroom: p('mushroom', '金边松乳菇', 'forage', RARE, {
    line: '暖褐伞面一圈金环，肥厚没虫眼。',
    clue: '松林雨后',
    got: '松针底下顶出朵肥厚的松乳菇，伞边还带着雨珠。',
    say: { yun: '松乳菇，没生虫……熬成菌油能香一整季。', shi: '镇上茶客爱这个，晒干了更卖得上价。' },
  }),
  preQingmingTea: p('tea', '明前雀舌', 'forage', RARE, {
    line: '带白毫的独芽，形如小雀舌。',
    clue: '清明前的后山茶园',
    season: [0],
    got: '掐下头一撮带白毫的明前嫩芽，清香凉进肺腑。',
    say: { yun: '明前雀舌……我采十年茶也没攒过这么齐的。', zhou: '得用山泉水泡，一口能鲜到后晌午。' },
  }),
  twinChestnut: p('chestnut', '双仁大油栗', 'forage', RARE, {
    line: '油亮大栗，一壳里挤着两瓣仁。',
    clue: '秋天的栗子林',
    got: '剥开毛球滚出颗油亮大栗，一捏，里头竟是双仁！',
    say: { aman: '油光锃亮！拿糖砂一炒，香得勾人魂儿！', qiao: '好大一颗，油亮得像漆器！' },
  }),
  nineNodePerilla: p('herb', '九节紫苏', 'forage', SEASONAL, {
    line: '茎节分明，满株紫红不杂绿。',
    clue: '溪边的香草丛',
    got: '刚折下来，满手浓得化不开的紫苏香，整株紫得发亮。',
    say: { gui: '这紫苏香得正！烧河鲜放两片，腥气全没了！', yun: '九节全紫的……晒干留着冬天煮茶也好。' },
  }),
});

/** 寻常的编号 → 这样收成的彩头叫什么（一样收成只有一个彩头）。 */
export const PRIZE_OF = Object.freeze(
  Object.fromEntries(Object.entries(PRIZES).map(([id, d]) => [d.item, id])),
);

/** 收到彩头时底下横着说的话。 */
export const prizeLine = id => PRIZES[id].got + '得了彩头「' + PRIZES[id].name + '」！';

/** 图谱里的「彩头」一页。 */
export const PRIZE_PAGE = Object.freeze({
  id: 'prize',
  name: '彩头',
  head: '每样收成里最了不起的那一个，可遇不可求',
  done: '十四样彩头都见过了，全村没人比得上你。',
});
