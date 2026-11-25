// 钓鱼时碰上的小事（Gemini 的 G-09 回稿，「小事」一节的 9 件）。
// 一竿收了（钓上、空竿、跑了）以后，偶尔碰上一件（机会见 FISHING_EVENT），落在主角身边，一天最多一件。
// when 跟翻找小事一样（见 content/events-search.js），maps 是钓点（yard 溪湾、creek 竹影、river 渡口），
// 另有 weather：只在哪几种天碰上。
// 「接下来几竿」鱼口好、提竿宽、鱼惊了，做成只管今天的身边风物（fish_luck、fish_steady、fish_spooked）；
// use 是这个做法要用掉身上的一样东西，没有就做不了。
// 回稿里「花 10 分钟」「下一竿必定是底栖鱼」先没接。

/** 钓完一竿碰上一件小事的机会（百分数）。 */
export const FISHING_EVENT = 12;

const SPOT = Object.freeze({ place: '钓点边', hint: '水边好像有点动静' });
const ev = (id, when, title, text, choices) =>
  Object.freeze({ id, trigger: 'fishing', once: false, spot: SPOT, when, title, text, choices });

// prettier-ignore
const LIST = [
  ev('fish_zhou_boat', { maps: ['river'], weather: ['sunny', 'cloudy'], periods: ['dawn', 'day'] },
    '老周撑船过',
    '老周撑着乌篷小船贴岸滑过，看了一眼你的浮漂，慢悠悠拿竹篙指了指前头水草边：“往那儿甩半尺，深一拃。”',
    [
      { label: '照他说的移半尺', mod: 'fish_luck', bond: 'zhou',
        line: '浮漂往水草边一落，稳稳立住了。老周点点头，撑船走远了。' },
      { label: '请他停船聊两句', mood: 2, give: { item: 'worm', n: 2 },
        line: '聊了几句天气和鱼情，老周顺手递来两条蚯蚓。' },
    ]),
  ev('fish_kingfisher', { maps: ['yard', 'creek'], weather: ['sunny'], periods: ['dawn'] },
    '翠鸟来抢鱼',
    '芦苇尖上蹲着只青绿小翠鸟，盯紧了你脚边半露在水里的鱼篓，翅膀一收就要往里扎。',
    [
      { label: '赶紧盖紧鱼篓', mood: 1, line: '篓盖一扣，翠鸟扑了个空，悻悻飞走了。' },
      { label: '扔点碎饵给它', check: { attr: 'yueli', dc: 5 },
        onOk: { mod: 'fish_luck', line: '翠鸟叼了饵往深潭那边一扎，你看清了鱼群在哪儿。' },
        onFail: { mood: 1, line: '翠鸟吃完就飞走了，倒也看得人高兴。' } },
    ]),
  ev('fish_weed', { maps: ['creek', 'river'] },
    '线缠老水草',
    '提竿时水底死沉，线不知绕在了哪根老水草根上，硬扯怕是要把钩线一块儿崩断。',
    [
      { label: '顺着水势慢慢松线', check: { attr: 'chijia', dc: 5 },
        onOk: { give: { item: 'shrimp', n: 1 }, line: '线解开了，还顺手带起一只躲在草里的河虾。' },
        onFail: { mod: 'fish_spooked', line: '磨了好一阵才扯开，水底的鱼都惊跑了。' } },
      { label: '咬牙使劲往回拽', check: { attr: 'tige', dc: 5 },
        onOk: { give: { item: 'waterweed', n: 1 }, line: '连根拔起一大团水草，省事。' },
        onFail: { mod: 'fish_spooked', energy: -2, line: '扯断一截线，水花溅了一身，鱼也惊了。' } },
    ]),
  ev('fish_washing', { maps: ['yard'], weather: ['sunny', 'cloudy'], periods: ['day'] },
    '对岸槌衣声',
    '桂嫂端着木盆在溪对岸的青石板上槌衣裳，棒槌“梆梆”几下，水面一圈圈波纹荡过来，浮漂直晃。',
    [
      { label: '笑着喊她慢点槌', check: { attr: 'renqing', dc: 5 },
        onOk: { bond: 'gui', mood: 1, line: '桂嫂不好意思地笑笑，换去下游洗了，还夸你脾气好。' },
        onFail: { mod: 'fish_spooked', line: '她嘴上答应，手没停。这一片的鱼都惊了。' } },
      { label: '收竿换个地方', line: '你收了竿。竹影那边的钓点清静，鱼口另算。' },
    ]),
  ev('fish_fog', { maps: ['river'], weather: ['fog'], periods: ['dawn'] },
    '浓雾里听桨声',
    '白雾压在水面上，十步外看不清岸。忽听见远处一声轻响，像是大鱼翻身拍水，又像谁家竹篙点地。',
    [
      { label: '往声响处远甩一竿', check: { attr: 'danliang', dc: 5 },
        onOk: { mod: 'fish_luck', mood: 2, line: '浮漂一落，水下就有了动静。那一片有鱼。' },
        onFail: { energy: -3, line: '钩子挂到水底的烂木头，费了好大劲才扯回来。' } },
      { label: '收近浮漂守岸边', mod: 'fish_steady', line: '守着浅水慢慢钓，心里踏实。' },
    ]),
  ev('fish_basket', { maps: ['yard', 'river'], wet: true },
    '上游漂来竹篓',
    '上游顺着浑水漂下来一只半沉的旧竹篓，卡在岸边芦苇丛里打转，里头隐约还有动静。',
    [
      { label: '拿竿梢勾过来瞧瞧', check: { attr: 'danliang', dc: 5 },
        onOk: { give: { item: 'shrimp', n: 2 }, line: '勾上岸一倒，蹦出两只肥河虾。' },
        onFail: { give: { item: 'waterweed', n: 1 }, line: '篓底早烂了，只捞起一团水草。' } },
      { label: '记下模样问石伯', bond: 'shi', give: { item: 'strip', n: 1 },
        line: '石伯一听就认出是自家冲跑的旧篓，塞给你一把竹篾。' },
    ]),
  ev('fish_sketch', { maps: ['creek'], weather: ['sunny'], periods: ['day'] },
    '小乔蹲边写生',
    '小乔抱着画板和猫「掌柜」蹲在竹荫里，歪着头描你甩竿的影子。掌柜伏在草里，眼睛死盯着你的浮漂。',
    [
      { label: '稳稳坐着当回画样', bond: 'qiao', mood: 3, mod: 'fish_steady',
        line: '你坐得稳稳的。小乔画完给你看，竹竿画得比人还像。' },
      { label: '给掌柜喂条小鱼', use: { item: 'fish.bleak', n: 1 }, bond: 'qiao', mood: 2,
        line: '掌柜叼着鱼呼噜呼噜，小乔笑得画笔都抖了。' },
    ]),
  ev('fish_sink', { maps: ['river'], weather: ['overcast', 'cloudy'], periods: ['dusk'] },
    '浮漂无风自沉',
    '水面平得像面镜子，浮漂却像被什么慢慢按下去似的，连沉两回又浮起来，半天不见浪花。',
    [
      { label: '认认水色再下饵', check: { attr: 'xuewen', dc: 5 },
        onOk: { mod: 'fish_luck', line: '是冷水暖水交汇的地方。换了深浅，底下的鱼该来了。' },
        onFail: { line: '只当是暗流，没多想。' } },
      { label: '换条新蚯蚓守底', use: { item: 'worm', n: 1 }, mod: 'fish_luck',
        line: '新蚯蚓沉到底，浮漂又轻轻点了两下。' },
    ]),
  ev('fish_duck_egg', { maps: ['yard'], weather: ['sunny', 'cloudy'], periods: ['dusk'] },
    '芦苇里滚出鸭蛋',
    '水边芦苇丛里窸窣一响，不知哪家的麻鸭扑棱棱游远了，草窝边露出一枚沾着水珠的青壳蛋。',
    [
      { label: '捡起来问问桂嫂', check: { attr: 'renqing', dc: 5 },
        onOk: { bond: 'gui', give: { item: 'egg', n: 1 },
          line: '桂嫂说是阿满家走丢的鸭子，回头她去说一声，又塞给你一个鸡蛋当谢礼。' },
        onFail: { give: { item: 'egg', n: 1 }, line: '问了一圈没人认领，蛋归你了。' } },
      { label: '悄悄揣进自己行囊', give: { item: 'egg', n: 1 }, line: '你把蛋揣进了行囊。' },
    ]),
];

export const FISHING_EVENTS = Object.freeze(Object.fromEntries(LIST.map(e => [e.id, e])));
