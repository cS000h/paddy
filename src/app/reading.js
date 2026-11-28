// 书架小窗的按钮：坐下读一回、随手翻两页、托老陈捎书、翻见闻（规则在 sim/plugins/reading.js）。
export function readingActions({ shell, run, here }) {
  const edit = patch => shell.set({ modal: { ...shell.get().modal, ...patch } });
  return {
    shelfTab({ tab }) {
      edit({ tab, line: '' });
      if (tab === 'news') run('news.look', { at: here() });
    },
    bookRead({ id }) {
      const out = run('book.read', { id, at: here() });
      if (!out.ok) return;
      const r = out.facts.find(f => f.type === 'book.read').data;
      edit({ line: [r.sit, r.line, r.after].filter(Boolean).join(' ') });
    },
    bookSkim() {
      const out = run('book.skim', { at: here() });
      if (out.ok) edit({ line: out.facts.find(f => f.type === 'book.skimmed').data.line });
    },
    bookBuy({ id }) {
      const out = run('book.buy', { id, at: here() });
      if (out.ok) edit({ line: out.facts.find(f => f.type === 'book.bought').data.line });
    },
  };
}
