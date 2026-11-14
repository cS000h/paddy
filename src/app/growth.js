export function growthActions({ game, shell, run }) {
  const edit = patch => shell.set({ modal: { ...shell.get().modal, ...patch } });
  return {
    book() {
      shell.set({ modal: { kind: 'book', tab: 'skills', page: 0 } });
    },
    bookTab({ tab }) {
      edit({ tab, page: 0 });
    },
    bookPage({ page }) {
      edit({ page: Number(page) });
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
    const achieved = facts.filter(f => f.type === 'achievement.earned');
    const leveled = facts.filter(f => f.type === 'skill.leveled');
    const traits = facts.filter(f => f.type === 'trait.gained');
    const messages = [
      ...achieved.map(f => '成就落印：' + f.data.name),
      ...leveled.map(f => f.data.name + '到了「' + f.data.title + '」'),
      ...traits.map(f => '新特质：' + f.data.name),
    ];
    if (messages.length) shell.toast(messages.join('；'));
  });
}
