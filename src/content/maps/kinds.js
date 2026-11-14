// 地面和物件的种类表：规则用它判断“能不能走、能不能锄”，画面用它决定画什么。

// 地面字符。walk = 能走；farm = 能锄地；water = 能在旁边打水。
export const GROUND = Object.freeze({
  '.': { id: 'grass', walk: true },
  p: { id: 'earth', walk: true },
  s: { id: 'stone', walk: true },
  f: { id: 'field', walk: true, farm: true },
  b: { id: 'bridge', walk: true },
  w: { id: 'water', walk: false, water: true },
  r: { id: 'paddy', walk: false, water: true },
  '#': { id: 'thicket', walk: false },
});

// 物件种类。foot = 相对锚点格 [dx0, dy0, dx1, dy1] 的占地（挡路）范围；没有 foot 的不挡路。
// act = 走到旁边按互动键时发生什么（由外壳解释）。
export const OBJECTS = Object.freeze({
  'house.hero': { foot: [-3, -4, 3, 0], act: 'door.hero' },
  'house.gui': { foot: [-3, -4, 3, 0], act: 'door.gui' },
  'fence.h': { foot: [0, 0, 0, 0] },
  'fence.v': { foot: [0, 0, 0, 0] },
  'gate.post': { foot: [0, 0, 0, 0] },
  'gate.arch': {},
  vat: { foot: [0, 0, 0, 0], act: 'water' },
  well: { foot: [0, 0, 0, 0], act: 'water' },
  basket: { foot: [0, 0, 0, 0], act: 'basket' },
  table: { foot: [0, 0, 1, 0] },
  haystack: { foot: [0, 0, 1, 0] },
  rack: { foot: [0, 0, 1, 0] },
  jars: { foot: [0, 0, 0, 0] },
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
  flowers: {},
  reeds: {},
});
