// 人物设定表。这是全工程唯一的人物来源：新增或改名先改这里，不要在别处另起人物。
// 六位村民沿用《稻间》0.12 的设定；`look` 对应 src/art/people.js 里的外观。
// 人物不画近脸、不定长相，只有远处的小人。

export const HERO = 'hero';

// likes：爱吃哪一种好处的饭菜（见 content/body.js 的 BUFFS）；taste：一句话说口味；
// treats：收到会特别高兴的东西（物品的键）。
// prettier-ignore
export const PEOPLE = Object.freeze({
  hero: { id: 'hero', name: '你', role: '借住小院的后生', look: 'hero' },
  shi: { id: 'shi', favorite: '土豆炖豆子', name: '石伯', role: '种了一辈子地', look: 'shi', hobby: '编竹筐、看天',
    likes: 'hearty', taste: '扎实顶饱的饭菜', treats: ['tea', 'bean', 'strip'] },
  gui: { id: 'gui', favorite: '青菜蛋花汤', name: '桂嫂', role: '隔壁邻居', look: 'gui', hobby: '腌菜、纳鞋底、听戏',
    likes: 'warm', taste: '热乎乎的汤', treats: ['ginger', 'egg', 'herb'] },
  aman: { id: 'aman', favorite: '蛋炒饭', name: '阿满', role: '送菜的', look: null, hobby: '哼小调、跟人抬杠',
    likes: 'hearty', taste: '扎实顶饱的家常饭', treats: ['cake', 'melon', 'pickle'] },
  qiao: { id: 'qiao', favorite: '香草烤土豆', name: '小乔', role: '杂货铺帮工', look: null, hobby: '画画、跟猫斗智',
    likes: 'fresh', taste: '带香草味的清爽吃食', treats: ['melon', 'cake', 'fish'] },
  zhou: { id: 'zhou', favorite: '姜丝鱼汤', name: '老周', role: '渡口撑船的', look: null, hobby: '讲古、补网、哼渔歌',
    likes: 'warm', taste: '热汤，最好带点姜', treats: ['ginger', 'pickle', 'tea'] },
  yun: { id: 'yun', favorite: '南瓜粥', name: '云姑', role: '后山种茶的', look: null, hobby: '唱山歌、认草药',
    likes: 'treat', taste: '甜糯的东西', treats: ['chestnut', 'mushroom', 'cake'] },
});

// 过节的吃食，谁收到都高兴。
export const FESTIVE = Object.freeze(['zongzi', 'mooncake', 'niangao']);

// 已经出现在地图上的人。其余四位等对应的地方做出来再登场。
export const ON_MAP = Object.freeze(['shi', 'gui']);

// 一天里人在哪儿：从 `from` 分钟起，去地图上叫 `spot` 的位置，做 `doing` 这件事。
export const SCHEDULES = Object.freeze({
  shi: [
    { from: 0, spot: 'shi.field', doing: '弯腰看土' },
    { from: 11 * 60 + 30, spot: 'shi.rest', doing: '在树荫下歇晌' },
    { from: 14 * 60, spot: 'shi.field', doing: '顺着垄沟慢慢走' },
    { from: 18 * 60, spot: 'shi.lane', doing: '背着手看天' },
    { from: 20 * 60, spot: 'shi.home', doing: '回去了' },
  ],
  gui: [
    { from: 0, spot: 'gui.door', doing: '在门口择菜' },
    { from: 9 * 60, spot: 'gui.rack', doing: '晾衣裳' },
    { from: 11 * 60, spot: 'gui.door', doing: '灶上忙着，炊烟起来了' },
    { from: 14 * 60, spot: 'gui.lane', doing: '在路口纳鞋底' },
    { from: 17 * 60 + 30, spot: 'gui.door', doing: '喊人回家吃饭' },
    { from: 20 * 60 + 30, spot: 'gui.home', doing: '回屋了' },
  ],
});

/** 某个人此刻按作息该在哪儿。 */
export function scheduleAt(id, minute) {
  const plan = SCHEDULES[id];
  if (!plan) return null;
  let current = plan[0];
  for (const entry of plan) if (minute >= entry.from) current = entry;
  return current;
}

// 说话。`first` 只在头一回见面时说；之后从 `daily` 里按天轮着说。台词取自 0.12。
// `gift` 是收到自家种的菜时说的；`treat` 是收到合心意的东西、`thanks` 是收到别的东西时说的，
// 里面的 {n} 换成那样东西的名字。
export const LINES = Object.freeze({
  shi: {
    first: '“住下了？”他直起腰看了看你那块地，“土是好土。先锄，再下种，浇透。”',
    daily: [
      '“种地急不来。今天急，明天也长不快。”',
      '“别看土面干就猛浇。扒开一点看看，底下还润着呢。”',
      '“春雨贵如油。下的时候，别嫌它烦。”',
      '他朝你那畦菜看了一会儿：“还行。”在他嘴里，这已经算夸了。',
      '“书上写的，是我记的。地里的事，是地教的。”',
    ],
    gift: '他接过去掂了掂，没说话，嘴角动了一下。',
    treat: '他接过{n}看了看，点点头：“好东西。”',
    thanks: '“嗯。”他收下了，没多说什么。',
  },
  gui: {
    first: '“哟，可算见着了！水缸是我给你挑满的，被子也拿出来晒过了。缺什么就隔着墙喊一声。”',
    daily: [
      '“吃饭了没有？一看就没好好吃。我灶上还有半锅粥，别跟我客气。”',
      '“天凉了，夜里被子盖严实点。你们年轻人，就爱踢被子。”',
      '“有心事就说出来，憋着多难受。我嘴严得很——好吧，也没那么严。”',
      '“菜要趁嫩收。老了就只能腌了，腌菜我倒是拿手。”',
    ],
    gift: '“自己种的？”她凑近闻了闻，“真水灵！晚上给你端碗菜汤过去。”',
    treat: '“{n}好啊，正用得上。你这孩子，心细。”',
    thanks: '“哎，跟我还客气什么。”',
  },
});

// 回礼：收了你的菜，第二天早上会留下点东西（0.12 的“回音”）。
export const RETURN_GIFT = Object.freeze({
  shi: {
    item: 'seed.qingcai',
    n: 3,
    text: '窗台上多了一小包菜种，纸包折得方方正正，没写名字。你知道是石伯。',
  },
  gui: {
    item: 'seed.qingcai',
    n: 2,
    text: '门槛上搁着一只粗瓷碗，碗底压着一小包菜种。隔着墙，桂嫂喊：“碗不急着还！”',
  },
});
