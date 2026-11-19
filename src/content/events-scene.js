// 场景与动作触发的随机小事，供 content/events.js 合并导出。
export const SCENE_MAP = Object.freeze({
  // — 场景与动作随机（6 个） —
  scene_tea_merchant: {
    id: 'scene_tea_merchant',
    trigger: 'tea',
    title: '茶摊听闻',
    text: '樟树下坐着位歇脚的走村货客，正和旁边人说起外头集市抢手的吃食。',
    choices: [
      {
        label: '安静喝茶听个热闹',
        mood: 3,
        line: '伴着茶香听完一段闲话，心里舒心。',
      },
      {
        label: '花 4 文添壶茶细打听',
        cost: { coins: 4 },
        check: { stat: 'social', dc: 3 },
        onOk: {
          mod: 'tea_fame',
          give: { item: 'seed.qingcai', n: 2 },
          delay: { id: 'delay_visitor_back', days: 4 },
          line: '货客聊得投机，临走塞给你两包好菜种，说改天再来找你。',
        },
        onFail: {
          mod: 'awkward_talk',
          line: '货客只管喝茶赶路，没多说什么。',
        },
      },
      {
        label: '「熟面孔」顺口托街坊搭话',
        reqTrait: 'familiar',
        mod: 'visitor_word',
        coins: 8,
        line: '街坊一句话就把两边说熟了，货客爽快买下你手边的小消息。',
      },
    ],
  },
  scene_forage_patch: {
    id: 'scene_forage_patch',
    trigger: 'forage',
    title: '林边好去处',
    text: '拨开一丛湿润的蕨草，你看见树根底下藏着一片还没被人动过的鲜嫩野物。',
    choices: [
      {
        label: '顺手采一点带回去',
        give: { item: 'herb', n: 1 },
        line: '拣最嫩的摘了一把，放进行囊里清香扑鼻。',
      },
      {
        label: '再往深处细找一圈',
        check: { stat: 'insight', dc: 3 },
        onOk: {
          mod: 'keen_eye',
          give: { item: 'herb', n: 2 },
          line: '眼力真不错，顺着土缝又找出两把香草。',
        },
        onFail: {
          mod: 'rain_damp',
          line: '草露水太重，走了一圈鞋脚全湿，只好先退回来。',
        },
      },
      {
        label: '「独行」按自己的步子慢慢寻',
        reqTrait: 'solitary',
        mod: 'keen_eye',
        mood: 4,
        give: { item: 'wood', n: 2 },
        line: '林子里安静自在，顺手还捡了两大捆干柴。',
      },
    ],
  },
  scene_cook_aroma: {
    id: 'scene_cook_aroma',
    trigger: 'cook',
    title: '灶香飘出院墙',
    text: '锅盖一掀，热气带着饭菜香飘出篱笆，路过的孩子不禁停在门口探头看。',
    choices: [
      {
        label: '笑着打个招呼，先看好锅里',
        mood: 3,
        line: '饭菜出锅颜色正，自己闻着都开心。',
      },
      {
        label: '顺势再收一把火候提香',
        check: { stat: 'cook', dc: 3 },
        onOk: {
          mod: 'hearth_warm',
          mood: 5,
          line: '最后一把火收得真漂亮，院里满是香味。',
        },
        onFail: {
          mod: 'burnt_hand',
          line: '锅边太热，端锅时不小心烫了一下指尖。',
        },
      },
      {
        label: '「灶边人」盛一小勺让人尝个鲜',
        reqTrait: 'hearth',
        mod: 'tea_fame',
        mood: 5,
        line: '尝过的人连声夸手艺好，你的厨艺名声在村里传开了。',
      },
    ],
  },
  scene_farm_coin: {
    id: 'scene_farm_coin',
    trigger: 'farm',
    title: '土里的小惊喜',
    text: '地里正干着活，脚边的土里露出一点硬东西，扒开一看，居然是几枚带着青印的旧钱和肥厚腐土。',
    choices: [
      {
        label: '擦干净收进口袋',
        coins: 6,
        line: '洗去泥土，平白多了 6 文零钱。',
      },
      {
        label: '顺手把这片肥土翻匀',
        check: { stat: 'farm', dc: 3 },
        onOk: {
          mod: 'good_harvest',
          coins: 5,
          line: '土翻得又深又匀，接下来几茬菜肯定长得旺。',
        },
        onFail: {
          mod: 'spring_tired',
          line: '土块太板结，翻完觉得胳膊有点发酸。',
        },
      },
      {
        label: '「雨中行者」趁土润多理两畦',
        reqTrait: 'rainwalker',
        mod: 'good_harvest',
        mood: 3,
        line: '趁着土气正好理顺了田埂，干起活来格外顺手。',
      },
    ],
  },
  scene_market_scale: {
    id: 'scene_market_scale',
    trigger: 'market',
    title: '集口挑货',
    text: '杂货铺外的竹筐里新倒出一堆时令零碎，摊主说看中了可以按捆拿。',
    choices: [
      {
        label: '挑一份稳稳的带走',
        give: { item: 'bean', n: 1 },
        line: '挑了一把颗粒饱满的豆子，划算又实在。',
      },
      {
        label: '仔细掂量成色再讲价',
        check: { stat: 'social', dc: 3 },
        onOk: {
          coins: 8,
          mod: 'visitor_word',
          line: '你眼光准、说话也和气，摊主笑着按实在价算了。',
        },
        onFail: {
          mod: 'awkward_talk',
          line: '价钱没说拢，气氛有点干，只好摆摆手走开。',
        },
      },
      {
        label: '「自己动手」挑些好料回去加工',
        reqTrait: 'handy',
        mod: 'craft_spark',
        give: { item: 'wood', n: 2 },
        line: '挑到两根纹理真好的木料，心里已经想到怎么用。',
      },
    ],
  },
  scene_rain_shelter: {
    id: 'scene_rain_shelter',
    trigger: 'forage',
    title: '树下避风',
    text: '山风突然紧了一阵，林边亭子底下站着位避风的过路人，正揉着肩膀看天。',
    choices: [
      {
        label: '点点头一起歇口气',
        energy: 6,
        line: '在亭子里站了一会儿，风势小了不少。',
      },
      {
        label: '搭话指一条好走的近路',
        check: { stat: 'insight', dc: 3 },
        onOk: {
          mod: 'kind_heart',
          coins: 7,
          line: '对方照你指的小路省了半个时辰，硬塞给你几文茶钱。',
        },
        onFail: {
          mod: 'awkward_talk',
          line: '话说岔了路口，两人比划半天才明白过来。',
        },
      },
      {
        label: '「耐寒」迎风照常赶回村里',
        reqTrait: 'coldproof',
        mod: 'good_harvest',
        mood: 4,
        line: '这点风对你不算什么，步子稳稳当当。',
      },
    ],
  },
});
