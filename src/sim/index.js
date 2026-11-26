// 规则层的组装：把内核的几样东西接起来，再按依赖顺序装上规则插件。
// 新增一块玩法 = 在 plugins/ 里加一个插件文件，再把它列进 PLUGINS。
import { createEvents } from '../kernel/events.js';
import { createSchema } from '../kernel/schema.js';
import { createReactions } from '../kernel/reactions.js';
import { createCompute } from '../kernel/compute.js';
import { createQueries } from '../kernel/queries.js';
import { createGuard } from '../kernel/guard.js';
import { createDispatcher } from '../kernel/dispatch.js';
import { createPluginHost } from '../kernel/plugin-host.js';
import { core, SAVE_VERSION } from './plugins/core.js';
import { clock } from './plugins/clock.js';
import { people } from './plugins/people.js';
import { household } from './plugins/household.js';
import { body } from './plugins/body.js';
import { pack } from './plugins/pack.js';
import { water } from './plugins/water.js';
import { quality } from './plugins/quality.js';
import { prizes } from './plugins/prizes.js';
import { land } from './plugins/land.js';
import { interactions } from './plugins/interactions.js';
import { social } from './plugins/social.js';
import { basket } from './plugins/basket.js';
import { cooking } from './plugins/cooking.js';
import { foodEffects } from './plugins/food-effects.js';
import { comfort } from './plugins/comfort.js';
import { moods } from './plugins/moods.js';
import { weather } from './plugins/weather.js';
import { gathering } from './plugins/gathering.js';
import { fishing } from './plugins/fishing.js';
import { search } from './plugins/search.js';
import { catalog } from './plugins/catalog.js';
import { ground } from './plugins/ground.js';
import { dawnNews } from './plugins/dawn-news.js';
import { homestead } from './plugins/homestead.js';
import { growth } from './plugins/growth.js';
import { persona } from './plugins/persona.js';
import { growthPerks } from './plugins/growth-perks.js';
import { achievements } from './plugins/achievements.js';
import { residents } from './plugins/residents.js';
import { teahouse } from './plugins/teahouse.js';
import { market } from './plugins/market.js';
import { guide } from './plugins/guide.js';
import { visits } from './plugins/visits.js';
import { opinion } from './plugins/opinion.js';
import { modifiers } from './plugins/modifiers.js';
import { events } from './plugins/events.js';
import { visitors } from './plugins/visitors.js';
import { fairMatch } from './plugins/fair-match.js';
import { wardrobe } from './plugins/wardrobe.js';

export { SAVE_VERSION };
// 顺序有讲究：后面的插件建自己的数据时，可以读前面的（比如身体和行囊按“户里有谁”来建）。
export const PLUGINS = Object.freeze([
  core,
  clock,
  people,
  household,
  body,
  pack,
  water,
  weather,
  comfort,
  gathering,
  fishing,
  search,
  catalog,
  ground,
  dawnNews,
  homestead,
  cooking,
  foodEffects,
  quality,
  prizes,
  land,
  moods,
  social,
  basket,
  persona,
  growth,
  growthPerks,
  achievements,
  residents,
  market,
  teahouse,
  guide,
  visits,
  opinion,
  modifiers,
  events,
  visitors,
  fairMatch,
  wardrobe,
  interactions,
]);

/**
 * @param {object} [options]
 * @param {number} [options.seed]      新开一局用的随机种子
 * @param {object|null} [options.state] 读档得到的 {revision, world}；没有就新开一局
 * @param {boolean} [options.debug]    打开写入检查（测试里总是开着，正常游玩关着）
 * @param {(outcome: object) => void} [options.onCommit] 每条命令成功后调用一次
 * @param {(error: unknown, command: object) => void} [options.onError] 命令出错（不是被拒绝）时调用，调试用
 * @param {ReadonlyArray<object>} [options.plugins]
 */
export function createSim({
  seed = 1,
  state = null,
  debug = false,
  onCommit = null,
  onError = null,
  plugins = PLUGINS,
} = {}) {
  const guard = debug ? createGuard() : null;
  const events = createEvents();
  const schema = createSchema();
  const reactions = createReactions({ guard });
  const compute = createCompute({ guard });
  const queries = createQueries({ guard });
  const dispatcher = createDispatcher({
    initialState: { revision: 0, world: null },
    problems: s => (s.world ? schema.problems(s.world) : ['world is missing']),
    events,
    reactions,
    guard,
    onCommit,
    onError,
  });
  const host = createPluginHost({
    services: { schema, reactions, compute, queries, commands: dispatcher.commands },
    events,
    guard,
  });
  host.start([...plugins]);
  dispatcher.adopt(state || { revision: 0, world: schema.initial({ seed }) });
  dispatcher.verify();
  return Object.freeze({ dispatcher, events, queries, schema, compute, host });
}
