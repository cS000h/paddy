// 地面和物件的种类表：规则用它判断“能不能走、能不能锄”，画面用它决定画什么。

// 地面字符。walk = 能走；farm = 能锄地；water = 能在旁边打水；drink = 能喝（喝的是哪种水）。
export const GROUND = Object.freeze({
  o: { id: 'boards', walk: true },
  q: { id: 'flags', walk: true }, // 屋里灶边铺的青石板
  v: { id: 'wall', walk: false },
  x: { id: 'void', walk: false }, // 屋子外头，留白
  '.': { id: 'grass', walk: true },
  p: { id: 'earth', walk: true },
  s: { id: 'stone', walk: true },
  f: { id: 'field', walk: true, farm: true },
  b: { id: 'bridge', walk: true },
  w: { id: 'water', walk: false, water: true, drink: 'creek' },
  r: { id: 'paddy', walk: false, water: true },
  '#': { id: 'thicket', walk: false },
  a: { id: 'sand', walk: true }, // 河滩、溪边的沙地
  m: { id: 'moss', walk: true }, // 竹林、松林底下的苔地
});

// 物件种类。foot = 相对锚点格 [dx0, dy0, dx1, dy1] 的占地（挡路）范围；没有 foot 的不挡路。
// act = 走到旁边按互动键时发生什么（由外壳解释）；drink = 能喝的水（见 content/body.js 的 DRINKS）。
export const OBJECTS = Object.freeze({
  bed: { foot: [-1, -1, 1, 0], act: 'sleep' },
  roomWindow: { floor: true },
  scroll: { floor: true, act: 'furnish' }, // 后墙上挂的字画；走到跟前能换屋里六处摆设
  sill: { floor: true }, // 东窗下的窗台摆件
  hangings: { floor: true }, // 后墙上挂的干辣椒、玉米
  rug: { floor: true },
  dresser: { act: 'wardrobe', foot: [0, 0, 0, 0] },
  // A-39 整屋图新添的三件：先只摆着好看，碗架跟着干净碗盘的多少换样子；挂钩、木箱的用处等后面那步再接
  dishRack: { foot: [0, 0, 0, 0] }, // 后墙脚的竹碗架
  hook: { foot: [0, 0, 0, 0] }, // 门边墙上挂蓑衣斗笠的木钉
  chest: { foot: [0, 0, 0, 0] }, // 床尾的旧木箱
  desk: { foot: [0, 0, 1, 0] }, // 右前角的矮书案，读书仍到书架跟前
  boat: {},
  route: { act: 'travel' },
  teaCounter: { foot: [-1, 0, 1, 0], act: 'tea' },
  marketCounter: { foot: [-1, 0, 1, 0], act: 'market' },
  'house.hero': { foot: [-3, -4, 3, 0], act: 'door.hero' },
  'house.gui': { foot: [-3, -4, 3, 0], act: 'door.gui' },
  'fence.h': { foot: [0, 0, 0, 0] },
  'fence.v': { foot: [0, 0, 0, 0] },
  'gate.post': { foot: [0, 0, 0, 0] },
  'gate.arch': {},
  vat: { foot: [0, 0, 0, 0], act: 'water', drink: 'vat' },
  well: { foot: [0, 0, 0, 0], act: 'water', drink: 'well' },
  forage: { act: 'outing' },
  woodpile: { foot: [0, 0, 0, 0], act: 'outing' },
  shootPatch: { act: 'outing' },
  mushroomPatch: { act: 'outing' },
  teaBush: { foot: [0, 0, 0, 0], act: 'outing' },
  nutPatch: { act: 'outing' },
  fishing: { act: 'outing' },
  coop: { foot: [0, 0, 0, 0], act: 'housework' },
  workbench: { foot: [0, 0, 0, 0], act: 'housework' },
  pickleJar: { foot: [0, 0, 0, 0], act: 'housework' },
  bookshelf: { foot: [0, 0, 0, 0], act: 'shelf' },
  stove: { foot: [0, 0, 0, 0], act: 'kitchen' },
  cupboard: { foot: [0, 0, 0, 0], act: 'store' },
  basket: { foot: [0, 0, 0, 0] },
  table: { foot: [0, 0, 1, 0], act: 'housework' },
  haystack: { foot: [0, 0, 1, 0] },
  rack: { foot: [0, 0, 1, 0] },
  clothRack: { foot: [0, 0, 1, 0], act: 'cloth' }, // 集上的布摊：晾衣架上挂着成衣
  jars: { foot: [0, 0, 0, 0] },
  trellis: {
    parts: [
      ['rear', -9],
      ['front', 0],
    ],
  }, // 棚下可以穿行，旧存档的站位也依然能走。
  scarecrow: { foot: [0, 0, 0, 0] },
  sign: { foot: [0, 0, 0, 0], act: 'sign' },
  'tree.broad': { foot: [0, 0, 0, 0] },
  'tree.camphor': { foot: [0, 0, 0, 0] },
  'tree.peach': { foot: [0, 0, 0, 0] },
  'tree.willow': { foot: [0, 0, 0, 0] },
  'tree.pine': { foot: [0, 0, 0, 0] },
  bamboo: { foot: [0, 0, 0, 0] },
  bush: { foot: [0, 0, 0, 0] },
  rock: { foot: [0, 0, 0, 0] },
  flowers: { sortOffset: -6 },
  reeds: { sortOffset: -5 },
  // 各地的标志物（art/landmarks.js）
  lantern: { foot: [0, 0, 0, 0] },
  stall: { foot: [-1, 0, 1, 0], act: 'stall' },
  pavilion: { foot: [-1, -1, 1, 0], act: 'housework' },
  lotus: { floor: true },
  shrine: { foot: [0, 0, 0, 0], act: 'sign' },
  cart: { foot: [0, 0, 1, 0] },
  stones: { floor: true },
  netRack: { foot: [0, 0, 1, 0] },
  // 人家门口、摊子旁边的零碎（art/props-village.js）
  barrels: { foot: [0, 0, 0, 0] },
  firewood: { foot: [0, 0, 0, 0] },
  sacks: { foot: [0, 0, 0, 0] },
  trays: { floor: true },
  fern: { sortOffset: -5 },
  stool: { sortOffset: -10 },
  bench: { foot: [0, 0, 1, 0] },
  rockPile: { foot: [0, 0, 0, 0] },
  crates: { foot: [0, 0, 0, 0] },
});
