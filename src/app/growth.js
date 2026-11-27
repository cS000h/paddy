import { REASONS } from '../content/settle.js';
import { FIRST_SHEET, rollSheet, cycleSheet } from '../shell/settle.js';
// 开局的落脚单、小册子的翻页，以及成就、升级、新特质的提示。
// 正式玩时落脚单随机抽一户；调试和测试（网址带 ?debug）时开局固定是同一户，结果才对得上
const firstSheet = debug => (debug ? { ...FIRST_SHEET } : rollSheet(Math.random));

export function growthActions({ game, shell, run, debug = false }) {
  const edit = patch => shell.set({ modal: { ...shell.get().modal, ...patch } });
  return {
    book() {
      shell.set({ modal: { kind: 'book', tab: 'persona', page: 0 } });
    },
    bookTab({ tab }) {
      edit({ tab, page: 0 });
    },
    bookWho({ who }) {
      shell.set({ modal: { kind: 'book', tab: 'persona', who: who || null, attr: null } });
    },
    bookAttr({ attr }) {
      edit({ attr: shell.get().modal.attr === attr ? null : attr });
    },
    ledgerWho({ who }) {
      edit({ ledgerWho: who });
    },
    bookKind({ kind }) {
      edit({ achKind: kind || null, page: 0 });
    },
    bookPage({ page }) {
      edit({ page: Number(page) });
    },
    bookShelf({ shelf }) {
      edit({ shelf, entry: null, page: 0 });
    },
    bookEntry({ item }) {
      edit({ entry: item || null });
    },
    bookMod({ mod }) {
      edit({ mod });
    },
    // 憋不住了：在册子的人物页挑一个解闷的法子
    cope({ coping }) {
      const out = run('stress.cope', { coping });
      const f = out.ok && out.facts.find(x => x.type === 'stress.coped')?.data;
      if (f) shell.toast(`染上了「${f.name}」：${f.line}`, true);
    },
    origin() {
      shell.set({ modal: { kind: 'origin', sheet: firstSheet(debug) } });
    },
    originRoll() {
      edit({ sheet: rollSheet(Math.random) });
    },
    originCycle({ key, dir }) {
      edit({ sheet: cycleSheet(shell.get().modal.sheet, key, Number(dir)) });
    },
    originSettle() {
      const sheet = shell.get().modal.sheet;
      if (!run('origin.settle', sheet).ok) return;
      shell.set({ modal: null });
      const me = game.ask('persona');
      const tempers = me.tempers.map(t => t.name).join('、');
      shell.toast(
        `${REASONS[sheet.reason].first}（性情：${tempers}；出身：${me.line.name}）`,
        true,
      );
    },
  };
}
export function growthNotices(game, shell) {
  game.onCommit(facts => {
    const leveled = facts.filter(f => f.type === 'skill.leveled');
    const traits = facts.filter(f => f.type === 'trait.gained');
    const messages = [
      ...leveled.map(f => f.data.name + '到了「' + f.data.title + '」'),
      ...traits.map(f => '新特质：' + f.data.name),
    ];
    if (messages.length) shell.toast(messages.join('；'), true);
    // 心烦：涨过一档、用毛病解了闷才说一句；顺着违着性子的那句留给以后的旁白（A-03）
    const vex = facts.find(
      f => f.type === 'stress.changed' && f.data.line && (f.data.crossed || !f.data.tag),
    );
    if (vex) shell.toast(vex.data.line);
    const snapped = facts.find(f => f.type === 'stress.snapped');
    if (snapped) shell.toast(snapped.data.line + '翻开册子的「人物」页，挑一个法子。', true);
  });
}
