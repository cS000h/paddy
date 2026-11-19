// 场景与动作触发的随机小事，供 content/events.js 合并导出。
// 每件小事带默认发生地（触发时要是主角就在现场，则落在主角脚边）。
export const SCENE_MAP = Object.freeze({
  scene_tea_merchant: {
    id: 'scene_tea_merchant',
    trigger: 'tea',
    spot: { map: 'tea', x: 11, y: 12, place: '樟树茶摊', hint: '茶桌边好像有人在说外头的事' },
    title: '茶摊听闻',
    text: '樟树下坐着位歇脚的走村货客，正说起外头集市抢手的吃食。',
    choices: [
      { label: '安静听完', mood: 3, line: '伴着茶香听完一段闲话，心里舒心。' },
      {
        label: '添壶茶细问',
        cost: { coins: 4 },
        check: { stat: 'social', dc: 3 },
        onOk: {
          mod: 'tea_fame',
          give: { item: 'seed.qingcai', n: 2 },
          delay: { id: 'delay_visitor_back', days: 4 },
          line: '货客聊得投机，塞给你两包好菜种，说改天再来找你。',
        },
        onFail: { mod: 'awkward_talk', line: '货客只管喝茶赶路，没多说什么。' },
      },
      {
        label: '「熟面孔」托人搭话',
        reqTrait: 'familiar',
        mod: 'visitor_word',
        coins: 8,
        line: '街坊一句话就把两边说熟了，货客爽快给了你一笔消息钱。',
      },
    ],
  },
  scene_forage_patch: {
    id: 'scene_forage_patch',
    trigger: 'forage',
    spot: { map: 'creek', x: 10, y: 11, place: '溪边林下', hint: '溪边草丛里好像藏着好东西' },
    title: '林边好去处',
    text: '拨开一丛湿润的蕨草，树根底下藏着一片还没被人动过的鲜嫩野物。',
    choices: [
      { label: '顺手采一点', give: { item: 'herb', n: 1 }, line: '拣最嫩的摘了一把，清香扑鼻。' },
      {
        label: '往深处细找',
        check: { stat: 'insight', dc: 3 },
        onOk: {
          mod: 'keen_eye',
          give: { item: 'herb', n: 2 },
          line: '眼力真不错，顺着土缝又找出两把新鲜香草。',
        },
        onFail: { mod: 'rain_damp', line: '草露水太重，走了一圈鞋脚全湿，只好先退回来。' },
      },
      {
        label: '「独行」慢慢寻',
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
    spot: { map: 'yard', x: 10, y: 11, place: '灶台边', hint: '灶台边飘出的饭香引来了人' },
    title: '灶香飘出院墙',
    text: '锅盖一掀，热气带着饭菜香飘出篱笆，路过的孩子停在门口探头看。',
    choices: [
      { label: '笑着招呼一声', mood: 3, line: '饭菜出锅颜色正，自己闻着都开心。' },
      {
        label: '再收一把火候',
        check: { stat: 'cook', dc: 3 },
        onOk: { mod: 'hearth_warm', mood: 5, line: '最后一把火收得真漂亮，院里满是香味。' },
        onFail: { mod: 'burnt_hand', line: '锅边太热，端锅时不小心烫了一下指尖。' },
      },
      {
        label: '「灶边人」盛勺尝鲜',
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
    spot: { map: 'yard', x: 6, y: 18, place: '菜地边', hint: '菜地土里好像翻出了什么' },
    title: '土里的小惊喜',
    text: '收完这一茬菜，锄头碰到硬东西，扒开泥土居然是几枚旧钱和肥厚腐土。',
    choices: [
      { label: '擦净收好', coins: 6, line: '洗去泥土，平白多了 6 文零钱。' },
      {
        label: '把肥土翻匀',
        check: { stat: 'farm', dc: 3 },
        onOk: {
          mod: 'good_harvest',
          coins: 5,
          line: '土翻得又深又匀，接下来几茬菜肯定长得旺。',
        },
        onFail: { mod: 'spring_tired', line: '土块太板结，翻完觉得胳膊有点发酸。' },
      },
      {
        label: '「雨中行者」理两畦',
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
    spot: { map: 'market', x: 14, y: 13, place: '村口杂货铺', hint: '杂货铺外新倒出一筐零碎货' },
    title: '集口挑货',
    text: '杂货铺外的竹筐里新倒出一堆时令零碎，摊主说看中了可以按捆拿。',
    choices: [
      { label: '挑一份稳的', give: { item: 'bean', n: 1 }, line: '挑了一把饱满豆子，划算又实在。' },
      {
        label: '掂量成色讲价',
        check: { stat: 'social', dc: 3 },
        onOk: {
          coins: 8,
          mod: 'visitor_word',
          line: '你眼光准、说话和气，摊主笑着按实在价算了。',
        },
        onFail: { mod: 'awkward_talk', line: '价钱没说拢，只好摆摆手走开。' },
      },
      {
        label: '「自己动手」挑好料',
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
    spot: { map: 'hill', x: 13, y: 8, place: '后山凉亭', hint: '山边凉亭下好像有人在避风' },
    title: '树下避风',
    text: '山风突然紧了一阵，林边亭子底下站着位避风的过路人，正揉着肩膀看天。',
    choices: [
      { label: '一起歇口气', energy: 6, line: '在亭子里站了一会儿，风势小了不少。' },
      {
        label: '指条近路',
        check: { stat: 'insight', dc: 3 },
        onOk: {
          mod: 'kind_heart',
          coins: 7,
          line: '对方照你指的小路省了半个时辰，硬塞给你几文茶钱。',
        },
        onFail: { mod: 'awkward_talk', line: '话说岔了路口，两人比划半天才明白过来。' },
      },
      {
        label: '「耐寒」迎风回村',
        reqTrait: 'coldproof',
        mod: 'good_harvest',
        mood: 4,
        line: '这点风对你不算什么，步子稳稳当当。',
      },
    ],
  },
});
