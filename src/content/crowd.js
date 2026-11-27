// 集日收尾：有热闹的地方村民绕过去围一圈；比完鱼第二天，钓客到你院门口来。
// 规则在 sim/crowd.js（谁围过去）和 sim/plugins/match-visit.js（钓客上门）。
// 上门的台词是 Claude 写的占位，等 Gemini 出（G-07 的后续）再换。

/**
 * 谁会围过去：爱来往（打分值 social）高过 min 的人，从高到低最多 max 个；
 * 本来就在那儿的人不算数，正在赴约的人不挪。
 */
export const CROWD = Object.freeze({
  min: 0,
  max: 3,
  river: Object.freeze(['crowd.0', 'crowd.1', 'crowd.2', 'crowd.3']),
  gate: Object.freeze(['gate.0', 'gate.1', 'gate.2', 'gate.3']),
});

/** 围过去以后，看人页上「在做什么」那一句。 */
export const CROWD_DOING = Object.freeze({
  match: '挤在渡口看比鱼',
  aroma: '循着香味站在你院门口',
  prize: '在院门口看你台上摆的彩头',
});

/** 围过来那一下冒在画面下方的一句：{names} 是来的人。 */
export const CROWD_LINES = Object.freeze({
  match: '{names}听说渡口在比鱼，都围了过来。',
  aroma: '{names}循着香味，站到了你院门口。',
  prize: '{names}停在院门口，探着头看台上的彩头。',
});

/** 钓客上门：比完的第二天清早到午时前，站在院门口。 */
export const MATCH_VISIT = Object.freeze({
  until: 12 * 60,
  spot: Object.freeze({ map: 'yard', x: 9, y: 16, dir: 'up' }),
  tea: 2, // 请他进院喝碗茶
});

/**
 * 他为什么来（看昨天怎么收场）：win 认输来讨教、lose 来约下回、tie 来再定一局、
 * caught 钱胖子被识破来赔不是、wronged 被冤枉了来讨个说法、tea 输了请过他茶来还人情。
 * say 是他站在门口说的话，opts 是你能怎么答（tea 花几文请他进院坐）。占位。
 */
// prettier-ignore
export const VISIT_TEXT = Object.freeze({
  win: {
    he: '“昨儿那三竿，服气。路过来认个门，顺道问问你下的什么饵。”',
    qian: '“昨儿让你占了上风，今儿特意绕过来瞧瞧，你这院子也不怎么样嘛。”',
  },
  lose: {
    he: '“昨儿承让了。你那手遛鱼的劲还差半口气，下个集日再来。”',
    qian: '“昨儿那几文押钱，我拿去打了壶酒。下个集日还敢来不？”',
  },
  tie: {
    he: '“打平最磨人。下个集日，咱们再分个高低。”',
    qian: '“打平就是没输，你说是不是？下回再来。”',
  },
  caught: { qian: '“昨儿……是我不地道。往后集日我不玩那暗篓了，这几个蛋你收着。”' },
  wronged: { qian: '“昨儿当着那么多人验我的篓，我钱胖子丢的这张脸，你说怎么算？”' },
  tea: {
    he: '“昨儿那碗茶喝得舒坦。给你捎了一尾鲫鱼，算我还的。”',
    qian: '“昨儿你请的那碗茶，我记着呢。拿着，河边捡的，不值钱。”',
  },
});

/** 你怎么答：一行一个；line 是答完他说的，gift 是他留下的东西。占位。 */
// prettier-ignore
export const VISIT_OPTS = Object.freeze({
  tea:   { label: '请他进院喝碗茶', line: '他在院里坐了一盏茶的工夫，说了些河上的事才走。', mood: 2, title: 'fish_steady' },
  thank: { label: '谢他走这一趟', line: '他摆摆手，沿着石板路往渡口去了。', mood: 1, gift: true },
  sorry: { label: '赔个不是', line: '他哼了一声，脸色缓了些：“下回看准了再说。”', pay: 2 },
  firm:  { label: '我没看错人', line: '他把篓子一甩：“行，咱们集日上见。”' },
  pardon: { label: '这事就算了', line: '他搓着手直点头，把鸡蛋往你手里一塞就走了。', mood: 2, gift: true },
});

/** 他留下的东西：请过茶的那一回、钱胖子赔不是那一回。[物品, 份数]。 */
export const VISIT_GIFT = Object.freeze({
  tea: Object.freeze({ he: ['fish.crucian', 1], qian: ['pebble', 2] }),
  caught: Object.freeze({ qian: ['egg', 2] }),
});

/** 每种来意能答哪几样。 */
export const VISIT_CHOICES = Object.freeze({
  win: ['tea', 'thank'],
  lose: ['tea', 'thank'],
  tie: ['tea', 'thank'],
  caught: ['pardon', 'firm'],
  wronged: ['sorry', 'firm'],
  tea: ['thank'],
});
