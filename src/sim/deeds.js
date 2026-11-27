// 动作登记表：每个动作能不能做、多想做、做了改什么。数在 content/deeds.js；谁什么时候打分在
// sim/plugins/deeds.js。规则里先问 can 再 perform，perform 里不再拒绝（反应里不许拒绝，见 AGENTS.md）。
// 以后玩家这边的同一个动作，就是接话里的一个选项：同一个 can、同一个 perform。
import { DEEDS } from '../content/deeds.js';
import { TEMPERS, AI_KEYS } from '../content/traits.js';

/** 一个人背后的打分值：三个性情的加起来，限在 −100 到 100。 */
export function aiOf(/** @type {any} */ p) {
  const out = Object.fromEntries(AI_KEYS.map(k => [k, 0]));
  for (const t of p?.tempers || [])
    for (const [k, n] of Object.entries(TEMPERS[t].ai || {})) out[k] += n;
  for (const k of AI_KEYS) out[k] = Math.max(-100, Math.min(100, out[k]));
  return out;
}

/**
 * 多想做：基础分＋打分值×权重＋好感×权重＋心烦×权重＋起伏。
 * @param {any} def 动作（content/deeds.js 里的一条）
 * @param {any} ai  做的人的打分值
 * @param {{opinion?: number, stress?: number, roll?: number}} at 处境：对对方的好感、自己的心烦、0 到 1 的起伏
 * @param {number} jitter 起伏有多大
 */
export function scoreOf(def, ai, at, jitter) {
  let n = def.base;
  for (const [k, wt] of Object.entries(def.ai || {})) n += (ai[k] || 0) * wt;
  n += (at.opinion || 0) * (def.opinion || 0);
  n += (at.stress || 0) * (def.stress || 0);
  n += ((at.roll ?? 0.5) * 2 - 1) * jitter;
  return Math.round(n);
}

/** 这个人隔了够不够天数，才又对同一个人做同一件事（从见闻里查；见闻淡掉了就算隔够了）。 */
export function rested(/** @type {any} */ w, /** @type {string} */ id, a, b) {
  const since = w.clock.day - DEEDS[id].again;
  return !w.witness.list.some(
    (/** @type {any} */ x) => x.act === id && x.who === a && x.to === b && x.day > since,
  );
}

/**
 * 每个动作怎么查能不能做、做了改什么。api 是插件给的几样服务（opinion、purse、stress）。
 * can(w, a, b, api) → true 或一句做不了的原因；perform(w, a, b, api) 改世界。
 */
export const DEED_RULES = Object.freeze({
  chat: {
    can: (w, a, b) => (b && b !== a) || '旁边没人',
    perform(w, a, b, api) {
      api.opinion.note(w, b, a, 'chat');
      api.opinion.note(w, a, b, 'chat');
      api.stress.apply(w, b, DEEDS.chat.tags);
    },
  },
  treat: {
    can(w, a, b, api) {
      if (!b || b === a) return '旁边没人';
      const house = api.purse.houseOf(a);
      const { coins, keep } = DEEDS.treat;
      return (house && api.purse.coins(w, house) >= coins + keep) || '手头没钱';
    },
    perform(w, a, b, api) {
      api.purse.move(w, api.purse.houseOf(a), -DEEDS.treat.coins);
      api.opinion.note(w, b, a, 'gift');
    },
  },
  withdraw: {
    can: () => true,
    perform() {},
  },
});
