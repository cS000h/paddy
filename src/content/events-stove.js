// 灶边的小事（Gemini 的 G-11 回稿，「灶边的小事」5 件）。
// 一锅出了锅以后，偶尔碰上一件（机会见 STOVE_EVENT），落在主角身边，一天最多一件。
// when 跟翻找小事一样（见 content/events-search.js），另有 weather（哪几种天）、
// methods（做法：fry 炒、stew 炖、roast 烤、mix 拌）、fish（锅里有鱼才碰上）。
// 回稿写的是掌火掌到一半碰上，改火候、改窗口；眼下做饭是出锅那一下一次结算的，接不进半路，
// 先改成出锅以后的事：灶膛里余下的烟、闻香来的人。「本锅火候加一档」这类先没接。

/** 出一锅碰上一件小事的机会（百分数）。 */
export const STOVE_EVENT = 15;

const SPOT = Object.freeze({ place: '灶台边', hint: '灶台那边好像有动静' });
const ev = (id, when, title, text, choices) =>
  Object.freeze({ id, trigger: 'stove', once: false, spot: SPOT, when, title, text, choices });

// prettier-ignore
const LIST = [
  ev('stove_cat', { fish: true, weather: ['sunny', 'cloudy'] },
    '掌柜盯鱼锅',
    '院门虚掩着，小乔那只花猫「掌柜」悄没声溜进来，蹲在灶台脚下仰着头，两只眼珠子死死跟着锅里的鱼转。',
    [
      { label: '撕块鱼边喂它', mood: 2, bond: 'qiao',
        line: '掌柜叼着鱼边一溜烟跑了。傍晚小乔来寻猫，笑着跟你道谢。' },
      { label: '轻拍灶沿把它哄走', check: { attr: 'renqing', dc: 5 },
        onOk: { mood: 1, line: '掌柜喵了一声，乖乖蹲到远处看热闹。' },
        onFail: { mood: -1, line: '它蹭了你一脚，围着灶台转了三圈才走。' } },
    ]),
  ev('stove_smoke', { wet: true, methods: ['fry', 'stew', 'roast'] },
    '湿柴冒浓烟',
    '灶膛里剩下那根柴受了潮，滋滋冒水汽，浓白烟顺着灶口往外涌，呛得眼睛直酸。',
    [
      { label: '抓把干松针塞进去', use: { item: 'pineNeedles', n: 1 }, mood: 2,
        line: '松针一引，火苗蹿起来，烟一下就散了。' },
      { label: '拿火钳扒空通风', check: { attr: 'chijia', dc: 5 },
        onOk: { mood: 1, line: '扒空了灶膛，浓烟散去，余火转旺。' },
        onFail: { energy: -2, mood: -1, line: '呛得直咳嗽，眼泪都出来了。' } },
    ]),
  ev('stove_gui', { weather: ['sunny', 'cloudy'], periods: ['dusk'], methods: ['fry', 'stew', 'roast'] },
    '桂嫂隔墙闻香',
    '菜刚出锅，院墙那头就传来桂嫂的嗓门：“哎哟，今儿烧的什么好菜，隔着墙都能闻着香！”',
    [
      { label: '喊她盛一碗尝尝', bond: 'gui', give: { item: 'pickle', n: 1 },
        line: '桂嫂端着碗尝了一口直咂嘴，回头塞给你一罐腌菜。' },
      { label: '跟她讨教两句', check: { attr: 'xuewen', dc: 5 },
        onOk: { mod: 'craft_spark', line: '她隔着墙说了收汁的窍门：“别收太干。”你记下了。' },
        onFail: { line: '隔着墙没听清，应了两声就算了。' } },
    ]),
  ev('stove_downdraft', { weather: ['overcast', 'storm', 'drizzle', 'rain'], methods: ['stew'] },
    '灶膛起倒烟',
    '屋檐外刮过一阵闷风，烟囱抽不动气，灶口猛地吐出一股灰烟，灶膛里的余火忽明忽暗。',
    [
      { label: '拉两下风箱压回去', check: { attr: 'tige', dc: 5 },
        onOk: { mood: 1, line: '风箱一拉，气顺了，火苗稳稳回正。' },
        onFail: { mod: 'burnt_hand', line: '拉得太猛，火舌窜出灶口，燎了一下手背。' } },
      { label: '先把灶门掩上', line: '掩上灶门，等风过去，烟慢慢散了。' },
    ]),
  ev('stove_zhou', { fish: true, methods: ['stew'], periods: ['dusk'] },
    '老周路过讨热汤',
    '老周收了渡船路过院门口，闻见鱼汤味停住脚，搓着手笑道：“这天儿喝口热鱼汤最舒坦，你这火候看着稳啊。”',
    [
      { label: '留他进院喝碗头汤', bond: 'zhou', mood: 2,
        line: '老周捧着碗喝得直哈气，说明早去哪处钓，鱼口准好。' },
      { label: '请教两句炖鱼诀窍', check: { attr: 'yueli', dc: 5 },
        onOk: { mod: 'craft_spark', line: '“汤白前别盖死锅盖。”老周说完，背着手走了。' },
        onFail: { mood: 1, line: '聊了几句河上的事，心里松快。' } },
    ]),
];

export const STOVE_EVENTS = Object.freeze(Object.fromEntries(LIST.map(e => [e.id, e])));
