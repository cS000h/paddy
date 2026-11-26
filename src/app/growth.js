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
  });
}
