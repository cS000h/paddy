// 手记里头几天的小目标。on 是听到哪件事算做到；hint 是还没做到时，手记里那一行底下的小字，
// 手记合上时也显示在左上角的“下一步”里。{do} 由画面换成这台设备的说法（按空格，或点右下印章）。
export const GOALS = Object.freeze([
  {
    id: 'till',
    on: 'plot.tilled',
    text: '锄松一格地',
    hint: '出院门往南过石板路就是菜地，对着地{do}',
  },
  {
    id: 'water',
    on: 'plot.watered',
    text: '润一格土',
    hint: '面朝干土{do}，水壶空了去井边打水',
  },
  { id: 'sow', on: 'plot.sown', text: '种下第一粒菜种', hint: '面朝润过的空地{do}' },
  {
    id: 'meet',
    on: 'person.talked',
    text: '和乡邻打个招呼',
    hint: '石伯常在田边，桂嫂在东边自家门口，走到跟前{do}',
  },
  {
    id: 'forage',
    on: 'search.found',
    text: '路边翻出一样野货',
    hint: '叶子一晃、草里一闪的地方今天有动静，走到跟前{do}',
  },
  { id: 'drink', on: 'water.drunk', text: '渴了喝口水', hint: '水井、水缸、溪边都能喝' },
  { id: 'eat', on: 'meal.eaten', text: '饿了吃点东西', hint: '打开行囊，米糕拿起来就能吃' },
  {
    id: 'harvest',
    on: 'crop.harvested',
    text: '收第一棵青菜',
    hint: '每天浇水，三个早晨之后就能收',
  },
  { id: 'gift', on: 'gift.given', text: '送一把自己种的菜', hint: '手里有菜的时候找人说话' },
  {
    id: 'sell',
    on: ['market.sold', 'neighbor.sold'],
    text: '卖一回东西',
    hint: '把菜拿到村口杂货铺，或者卖给想要的乡邻',
  },
]);
