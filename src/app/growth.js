// 开局两选、小册子的翻页，以及成就、升级、新特质的提示。
export function growthActions({ game, shell, run }) {
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
      shell.set({ modal: { kind: 'origin' } });
    },
    originPick({ id }) {
      const m = shell.get().modal;
      if (!m.route) edit({ route: id });
      else if (run('origin.choose', { route: m.route, reply: id }).ok) {
        shell.set({ modal: null });
        shell.toast('小院的日子，就从今天开始。');
      }
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
    if (messages.length) shell.toast(messages.join('；'));
  });
}
