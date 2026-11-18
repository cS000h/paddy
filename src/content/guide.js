// 手记里头几天的小目标。on 是听到哪件事算做到；hint 是还没做到时，手记里那一行底下的小字。
export const GOALS = Object.freeze([
  { id: 'till', on: 'plot.tilled', text: '锄松一格地', hint: '拿锄头，对着菜地按空格' },
  { id: 'sow', on: 'plot.sown', text: '种下第一粒菜种', hint: '换成菜种，对着锄过的地' },
  { id: 'water', on: 'plot.watered', text: '给它浇上水', hint: '水壶空了就去水缸、水井或溪边' },
  { id: 'meet', on: 'person.talked', text: '和乡邻打个招呼', hint: '走到石伯或桂嫂身边按 E' },
  { id: 'drink', on: 'water.drunk', text: '渴了喝口水', hint: '水井、水缸、溪边都能喝' },
  { id: 'eat', on: 'meal.eaten', text: '饿了吃点东西', hint: '打开行囊，米糕拿起来就能吃' },
  {
    id: 'harvest',
    on: 'crop.harvested',
    text: '收第一棵青菜',
    hint: '每天浇水，三个早晨之后就能收',
  },
  { id: 'gift', on: 'gift.given', text: '送一把自己种的菜', hint: '手里有菜的时候找人说话' },
  { id: 'sell', on: 'basket.sold', text: '托阿满卖一回菜', hint: '把菜放进院门边的收菜筐，睡一觉' },
]);
