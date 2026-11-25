// 掌火小窗中间那一幅灶台特写（160×52，按原始像素放大看）：后墙、灶台、灶膛里的火、锅和锅里的菜，
// 炒的时候火头窜进锅里，汤白了冒白气，要焦了冒灰烟。
// 灶膛火苗四档（快灭、小火、中火、旺火）各两帧、火头窜锅两帧，照 Gemini G-11 的像素图原样搬过来；
// 锅和菜沿用 cooking-frames.js。
import { Grid, fromText } from './pixel.js';
import { P } from './palette.js';
import { cookingFrame, COOK_FRAMES } from './cooking-frames.js';

export const SCENE = Object.freeze({ w: 160, h: 52 });

// G-11 的火苗只用了这几样颜色（都在调色板里）
const INK = {
  R: P.c1,
  D: P.c2,
  K: P.c3,
  P: P.c0,
  W: P.t4,
  w: P.t3,
  Y: P.y1,
  y: P.y0,
  G: P.y2,
  S: P.s3,
  s: P.s2,
  O: P.paper0,
};
const sprite = rows => fromText(rows, INK);

// prettier-ignore
const OUT = [[
  '........................', '........................', '........................', '........................',
  '.............s..........', '.............s..........', '............S...........', '............S...........',
  '............S...........', '........................', '..........DDD...........', '..........DGD...........',
  '......wwwKDDDKKwww......', '....WWwwwKKKKKKwwwWW....', '....WWWWWWWWWWWWWWWW....', '........................',
], [
  '........................', '........................', '........................', '..........s.............',
  '..........s.............', '...........S............', '...........S............', '...........S............',
  '...........S............', '........................', '...........DDD..........', '...........DYD..........',
  '......wwwKKDDDKwww......', '....WWwwwKKKKKKwwwWW....', '....WWWWWWWWWWWWWWWW....', '........................',
]];

// prettier-ignore
const LOW = [[
  '........................', '........................', '........................', '........................',
  '........................', '........................', '........................', '...........R............',
  '..........RRR...........', '..........RYRR..........', '.........RYYYR..........', '........DRyyyYRD........',
  '......wwRYyyyYYRww......', '....WWwwDDDDDDDDwwWW....', '....WWWWWWWWWWWWWWWW....', '........................',
], [
  '........................', '........................', '........................', '........................',
  '........................', '........................', '........................', '............R...........',
  '...........RRR..........', '..........RRYR..........', '..........RYYYR.........', '........DRYyyyRD........',
  '......wwRYYyyyYRww......', '....WWwwDDDDDDDDwwWW....', '....WWWWWWWWWWWWWWWW....', '........................',
]];

// prettier-ignore
const MID = [[
  '........................', '........................', '........................', '........Y...............',
  '...............D........', '.........D...RDD........', '.........DRRRRDDD.......', '........DDRRRRRDD.......',
  '........DRRYRRRDD.......', '........DRRYYRRDDD......', '.......DRRYYYYRRDD......', '.......DRRyyyyRRDD......',
  '......DRRYyyyyYRRDD.....', '....WWDRRYyyyyYYRDDW....', '....WWWWWWWWWWWWWWWW....', '........................',
], [
  '........................', '........................', '........................', '..............Y.........',
  '................D.......', '........D.....RDD.......', '........DD..RRRDD.......', '........DDRRRRRDDD......',
  '.......DDDRRYRRRDD......', '.......DDRRYYYRRDD......', '.......DDRRYYYRRDD......', '.......DRRyyyyYRDDD.....',
  '......DDRRyyyyYRRDD.....', '....WWDRRYyyyyYYRDDW....', '....WWWWWWWWWWWWWWWW....', '........................',
]];

// prettier-ignore
const HIGH = [[
  '........................', '....y.......D..P...Y....', '............DD....D.....', '......D....DRD...DD.....',
  '......DDRRRRRRR..DD.....', '.....DDDRRRYRRRRRDDD....', '.....DDRRRRYYRRRRDDD....', '.....DDRRRYYYRRRRDDD....',
  '.....DDRRRYYyYRRRRDD....', '....DDRRRYYyyYRRRRDD....', '....DDRRRYYyyyYRRRDD....', '....DDRRYYyOOyYYRRDDD...',
  '...DDRRRYYyOOyyYRRRDD...', '...DDRRYYyyOOyyYYRRDD...', '....WWWWWWWWWWWWWWWW....', '........................',
], [
  '................P.......', '.....y.....D......Y.....', '...........DR....D......', '.......D..DRRRR..D......',
  '.......D.RRRRRRRRDD.....', '......DDRRRRYRRRRDD.....', '......DDRRRYYRRRRDD.....', '.....DDRRRRYyYRRRRD.....',
  '.....DDRRRYYyYRRRRDD....', '.....DDRRRYyyyYRRRDD....', '....DDRRRYYyyyYRRRDD....', '....DDRRYYyOOyYYRRRD....',
  '...DDRRRYYyOOyyYRRRDD...', '...DDRRYYyyOOyyYYRRDD...', '....WWWWWWWWWWWWWWWW....', '........................',
]];

// prettier-ignore
const FLARE_ROWS = [[
  '................................', '................................', '............y..D......y.........', '..............DDD...............',
  '.....y........DDD.......D.......', '.............DDDRD.....DD.......', '.......D.....DDDRR....DDDD......', '......DDD...DDDRRRD..DDDDD..y...',
  '......DDDR..DDDRYRR.DDDDRDD.....', '.....DDDRRRDDDRYYYRRDDDRRDD.....', '....DDDDRRRRDDYYYYYRDRRRRDDD....', '....DDDRRRRRYYYYYYYYRRRRRDDD....',
  '...DDDDRRRRYYYYYYYYYYRRRRDDDD...', '...DDDRRRRRYYYYyYYYYYYRRRDDDD...', '...DDDRRRRRYYYYyyyyyYYRRRDDDD...', '...DDDRRRRYYYYyyyyyyYYRRRRDDD...',
  '...DDDRRRRYYYYyyyyyyYYRRRRDDD...', '....DDRRRRYYYYyyyyyyYYRRRRDD....', '....DDRRRRYYYyOOOOyyYYYRRRDD....', '....DDRRRYYYYyOOOOyyYYYRRRDD....',
  '....DDRRRYYYyyOOOOyyYYYRRRDD....', '....DDRRRYYYyyyyyyyyYYYDDDDD....', '..........DDDDDDDDDDDDD.........', '................................',
], [
  '................................', '................................', '................D......y........', '............y..DD...............',
  '......y........DRD.....D........', '..............DDRD....DDD.......', '.......D.....DDRRRD..DDDD...y...', '......DDD....DDRRRD..DDDDD......',
  '......DDD.R.DDDRRYRDDDDDDD......', '.....DDDDRRRDDRRYYYDDDDDRDD.....', '.....DDDRRRRDDRYYYYYDDRRRDDD....', '....DDDDRRRRRYYYYYYYYRRRRDDD....',
  '....DDDRRRRRYYYYYYYYYYRRRDDDD...', '...DDDRRRRRYYYYyYYYYYYRRRDDDD...', '...DDDRRRRRYYYYyyyYYYYRRRDDDD...', '...DDDRRRRRYYYyyyyyyYYRRRRDDD...',
  '...DDDRRRRYYYYyyyyyyYYRRRRDDD...', '....DDRRRRYYYYyyyyyyYYYRRRDD....', '....DDRRRRYYYyOOOOyyYYYRRRDD....', '....DDRRRRYYYyOOOOyyYYYRRRDD....',
  '....DDRRRYYYyyOOOOyyYYYRRRDD....', '....DDRRRYYYyyyyyyyyYYYDDDDD....', '..........DDDDDDDDDDDDD.........', '................................',
]];

/** 灶膛火苗：四档各两帧（24×16）。 */
export const FLAMES = Object.freeze({
  out: OUT.map(sprite),
  low: LOW.map(sprite),
  mid: MID.map(sprite),
  high: HIGH.map(sprite),
});
/** 火头窜进锅里：两帧（32×24）。 */
export const FLARE = Object.freeze(FLARE_ROWS.map(sprite));

let wall = null;
/** 后墙和灶台，不动的那一层（画一次就留着）。 */
function backdrop() {
  if (wall) return wall;
  const g = new Grid(SCENE.w, SCENE.h);
  // 后墙：白粉墙，淡淡的砖缝
  g.rect(0, 0, SCENE.w, 32, P.paper0);
  for (const y of [7, 15, 23]) g.hline(0, SCENE.w - 1, y, P.paper1);
  for (let row = 0; row < 4; row++)
    for (let x = row % 2 ? 12 : 2; x < SCENE.w; x += 22) g.vline(x, row * 8, row * 8 + 6, P.paper1);
  // 灶台：石灰抹的台面和立面
  g.rect(0, 32, SCENE.w, 20, P.s0)
    .hline(0, SCENE.w - 1, 32, P.s2)
    .hline(0, SCENE.w - 1, 33, P.s1)
    .hline(0, SCENE.w - 1, 51, P.s2);
  for (const x of [22, 46, 114, 138]) g.vline(x, 37, 48, P.s1);
  // 灶膛口：砖沿、里头黑
  g.rect(63, 35, 34, 17, P.s3).rect(64, 36, 32, 16, P.s4).rect(66, 37, 28, 15, P.ink0);
  wall = g;
  return wall;
}

// 锅和菜一组八帧，按这一锅缓存几组
const pots = new Map();
function potFrame(selection, frame, served = false) {
  const key = JSON.stringify([selection.method, selection.items, selection.base, frame, served]);
  if (!pots.has(key)) {
    if (pots.size >= 64) pots.delete(pots.keys().next().value);
    pots.set(key, cookingFrame(selection, frame, served));
  }
  return pots.get(key);
}

/** 贴上来；半透明的（影子）照浓淡盖在底下的颜色上。 */
function paste(g, src, dx, dy) {
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      const c = src.data[y * src.w + x];
      const a = c >>> 24;
      if (!a) continue;
      if (a === 255) g.set(dx + x, dy + y, c);
      else g.wash(dx + x, dy + y, c, a / 255);
    }
}

/** 锅上冒的一缕：白气或灰烟，tick 往上飘。 */
function puffs(g, tick, light, dark) {
  for (let k = 0; k < 3; k++) {
    const age = (tick + k * 5) % 15;
    const x = 68 + k * 10 + (Math.floor(age / 3) % 2);
    const y = 14 - age;
    g.rect(x, y, 3, 2, light)
      .set(x + 1, y - 1, light)
      .set(x + 3, y + 1, dark);
  }
}

/**
 * 这一帧的灶台。selection 是这锅菜（做法、食材）；view 是画面要的样子：
 * level 灶膛火的档（out/low/mid/high，null 是没生火），flare 火头窜进锅里，empty 锅里还没下料，
 * served 菜盛出来摆在灶上，steam 冒白气，smoke 冒灰烟。tick 是第几拍（每拍一百多毫秒），
 * 火苗、锅铲、烟气跟着换帧。
 * @param {{method?: string, items?: string[], base?: string}} selection
 * @param {{level?: null|'out'|'low'|'mid'|'high', flare?: boolean, empty?: boolean, served?: boolean, steam?: boolean, smoke?: boolean}} view
 * @param {number} tick
 */
export function stoveScene(selection, view = {}, tick = 0) {
  const g = new Grid(SCENE.w, SCENE.h);
  g.blit(backdrop(), 0, 0);
  tick = Math.max(0, Math.floor(tick) || 0);
  const flip = Math.floor(tick / 2) % 2;
  const level = view.level === undefined ? 'low' : view.level;
  if (level) g.blit(FLAMES[level][flip], 68, 36);
  // 旺火映红了灶膛口的砖沿
  if (level === 'high' || view.flare) g.hline(64, 95, 36, P.c2).hline(63, 96, 35, P.c1);
  const pot = view.empty ? { ...selection, items: [] } : selection;
  const served = !!view.served;
  paste(g, potFrame(pot, served ? 0 : tick % COOK_FRAMES, served), 48, served ? -6 : -11);
  if (view.flare) g.blit(FLARE[flip], 64, -8);
  if (view.steam) puffs(g, tick, P.paper0, P.s1);
  if (view.smoke) puffs(g, tick + 3, P.s3, P.s4);
  return g;
}
