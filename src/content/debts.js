// 借、还、帮、传、拿（执行方案 M9）的数和话。规则在 sim/plugins/ledger.js。
// 开口借钱、还钱、赖账的话在 content/purse-lines.js（G-20）；这里是答应不答应、接济、传闲话、顺手拿的话。
// 这些话 G-01、G-02 交到之前先由 Claude 写着占位（标「补」），交稿后照稿换。

/**
 * 数：
 *   term 借多少天还；grace 过了日子再拖几天就算赖账；keep 借出去以后自己手里至少留几文
 *   lend 答应借的坎：好感 − 贪心/4 + 守信/10 + 信人/10，过了 full 借足，过了 half 借一半
 *   ask 村民手头紧找你借：好感至少几分、最多借几文、问过一回隔几天再问、头几天不来、开口的几成把握、
 *     对你的好感加 lean 还不比村里最肯借的那位差，就先来找你
 *   hero 你开口借的两档；late 你过了日子还没还，好感掉一回
 *   relief 接济：给的人手里至少几文、给几文、对那户好感至少几分；你接济给几文
 *   take 顺手拿：心烦至少几分、拿几文；gossip 茶摊上爱来往的人传一件不想让人知道的事
 */
export const LEDGER = Object.freeze({
  term: 7,
  grace: 5,
  keep: 10,
  lend: { full: 12, half: 0 },
  ask: { opinion: -5, max: 20, again: 8, from: 4, odds: 0.7, lean: 10 },
  hero: [10, 20],
  relief: { has: 30, give: 6, opinion: 8, hero: 5 },
  take: { stress: 25, coins: 6 },
  keepDebts: 24,
});

/** 接话里这一组叫什么。 */
export const LEDGER_GROUP = '钱和人情';
export const GOSSIP_GROUP = '闲话';

/** 你开口借钱，对方怎么答：yes 借足、half 只借一半、no 不借（补）。 */
// prettier-ignore
export const LEND_REPLY = Object.freeze({
  shi:  { yes: '“拿去用，写个日子就成，到时候记得送来。”', half: '“家里也紧，先匀你一半，多的实在拿不出。”', no: '“不是我抠，地里正等钱用，这回真借不了。”' },
  gui:  { yes: '“嗐，邻里邻居的，拿着！别跟嫂子客气。”', half: '“嫂子手头就这些，先拿一半应应急。”', no: '“哎哟这几天我自己都掐着用，下回、下回！”' },
  aman: { yes: '“够意思！拿去，啥时候宽裕啥时候还。”', half: '“兜里就剩这点了，先分你一半！”', no: '“我比你还穷呢，车轮子都等着钱换！”' },
  qiao: { yes: '“行呀，记我小本上了，到日子可别让我上门哦。”', half: '“钱匣不是我的，自己的私房先借你一半。”', no: '“哎呀不巧，学画的钱一文都动不得。”' },
  zhou: { yes: '“老头子这儿还有些，拿去，不急。”', half: '“船钱还得留着修船，先给你一半吧。”', no: '“老头子这阵子也难，对不住啊。”' },
  yun:  { yes: '“……嗯，你拿去吧，记得还就好。”', half: '“我、我只能拿出这些……一半，行吗？”', no: '“对不起……茶锅还等着换，真拿不出。”' },
});

/** 村民找你借，你答了以后他说的一句：full 借足、half 只借一半、none 不借（补）。 */
// prettier-ignore
export const ASK_REPLY = Object.freeze({
  shi:  { full: '“记着了，到日子一文不少送来。”', half: '“一半也是情分，剩下的我再想法子。”', none: '“……也是，谁家都不宽裕。”' },
  gui:  { full: '“好人哪！嫂子记你一辈子！”', half: '“够了够了，余下的我卖蛋凑。”', none: '“哟，那嫂子再去别家问问。”' },
  aman: { full: '“够哥们！跑两趟车就还你！”', half: '“成，一半也顶大用！”', none: '“唉，那我再去茶摊碰碰运气。”' },
  qiao: { full: '“就知道你最爽快！到日子准还。”', half: '“一半呀……行吧，总比没有强。”', none: '“这么小气，往后买东西可没折扣了哦。”' },
  zhou: { full: '“多谢小友，老头子记下了。”', half: '“够修个大概了，多谢多谢。”', none: '“不要紧，老头子再想想办法。”' },
  yun:  { full: '“谢、谢谢……我一定按日子还。”', half: '“……嗯，够先应急了，谢谢你。”', none: '“打扰了……我再想别的法子。”' },
});

/** 你上门还钱时对方说的（补）。 */
// prettier-ignore
export const PAID_BACK = Object.freeze({
  shi: '“按日子送来，好。往后再缺，开口。”', gui: '“哎呀还专门送来！下回缺了还找嫂子。”',
  aman: '“讲究！往后有事你说话。”', qiao: '“一文不差，我小本上划掉啦。”',
  zhou: '“不急的，不急的。收下了。”', yun: '“……嗯，收到了，谢谢你记着。”',
});

/** 你过了日子还没还，对方见面先说的一句（补）。 */
// prettier-ignore
export const YOU_LATE = Object.freeze({
  shi: '“前些天借你的钱，日子可过了。”', gui: '“那笔钱……嫂子不是催，就是提一句。”',
  aman: '“那几文钱，你手头宽了记得给我啊。”', qiao: '“小本上你那笔还没划呢～”',
  zhou: '“那钱……老头子不急，你宽裕了再说。”', yun: '“那个……上回的钱，日子过了……”',
});

/** 院门口的痕迹：村民清早还钱、接济放下的东西（补）。 */
export const DOOR_NOTES = Object.freeze({
  repay: { title: '院门口一串钱', text: '{a}一早把欠你的{n}文钱送来了：{line}' },
  late: { title: '{a}还没还钱', text: '欠你的{n}文到了日子，{a}托人捎话：{line}' },
  welsh: { title: '{a}赖着不还', text: '{a}欠你的{n}文拖了好些天，村里已经有人在说了。' },
  heroLate: { title: '欠{a}的钱', text: '借{a}的{n}文到日子了，记得上门还。' },
  heroWelsh: { title: '欠钱不还传开了', text: '借{a}的{n}文拖了太久，茶摊上有人在说你赖账。' },
  shopShort: {
    title: '铺子钱匣少了几文',
    text: '小乔一早对账，钱匣里少了几文，她说怕是夜里老鼠拖的。',
  },
});

/** 手头紧的人站到你院门口等着（补）。 */
export const ASK_DOING = '站在你院门口，像是有话要说';

/** 传闲话：说之前那半句（补）。{line} 是那件事。 */
export const GOSSIP_LEAD = Object.freeze({
  heard: '{a}压低了声音：“{line}，你可别往外说。”',
  told: '你把听来的一件事说给{a}听：{line}。',
  nothing: '你想了想，没什么{a}不知道的事可说。',
  honest: '{a}皱了皱眉：“背后说人，不大好吧。”',
  keen: '{a}凑近了些：“真的？我还真不知道。”',
});

/** 接济、借钱、还钱、赖账、顺手拿在见闻里怎么说（合进 content/deeds.js 的 OTHER_DOINGS）。 */
export const LEDGER_DOINGS = Object.freeze({
  borrow: { line: '{a}向{b}借了钱', fade: 20, secret: true },
  repay: { line: '{a}把欠{b}的钱还上了', fade: 10, secret: false },
  welsh: { line: '{a}欠{b}的钱拖着不还', fade: 40, secret: false },
  relief: { line: '{a}往{b}家门口放了一篮东西', fade: 14, secret: false },
  reliefQuiet: { line: '不知是谁往{b}家门口放了一篮东西', fade: 14, secret: false },
  take: { line: '{a}趁没人从{place}顺手拿了几文', fade: 30, secret: true },
});

/** 接话选项上的字。 */
export const LEDGER_LABELS = Object.freeze({
  borrow: '借{n}文钱',
  repay: '还上{n}文',
  dun: '讨那{n}文钱',
  lendFull: '借出{n}文',
  lendHalf: '只借一半',
  lendNone: '这回借不了',
  relieve: '接济{n}文',
  gossip: '说件听来的事',
});
