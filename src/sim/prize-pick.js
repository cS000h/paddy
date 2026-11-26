// 抽中极品之后，再看出不出彩头（名单和机会在 content/prizes.js）。纯函数，随机数由 quality 插件传进来。
import { PRIZES, PRIZE_OF } from '../content/prizes.js';

/** 这样收成在这一季、这个随机数（0–1）下出不出彩头：出了返回彩头的名字，没出返回 null。 */
export function prizeFor(item, season, r) {
  const id = PRIZE_OF[item];
  const def = PRIZES[id];
  if (!def || (def.season && !def.season.includes(season))) return null;
  return r * 100 < def.odds ? id : null;
}
