// 点击前再向规则询问一次。命令仍走各玩法自己的入口，费用、物品和关系只结算一次。
export function encounterActions({ game, shell, run, here, world }) {
  const current = () => {
    const m = shell.get().modal;
    return m && ['talk', 'visitor'].includes(m.kind) ? m : null;
  };
  const edit = (m, change) => shell.set({ modal: { ...m, ...change } });
  return {
    encounterMenu({ group = '', picker }) {
      const m = current();
      if (m) edit(m, { open: true, group, field: picker === 'field', pending: null });
    },
    encounterPick({ key, confirm }) {
      const m = current();
      if (!m) return;
      const at = here();
      const row = game
        .ask('interaction.options', m.who || m.id, at, m.walking)
        .find(o => o.key === key);
      if (!row || row.reason)
        return edit(m, { line: row?.reason || '这件事眼下做不了了。', pending: null, group: '' });
      if (row.confirm && confirm !== 'yes') return edit(m, { pending: key });
      if (row.confirm && m.pending !== key) return;
      if (!row.command)
        return edit(m, { line: row.line, field: row.plot || false, group: '', pending: null });
      const out = run(row.command, { ...row.input, at });
      if (!out.ok) return edit(m, { line: out.reason, pending: null, group: '' });
      const result = out.facts.find(f => f.type === row.result)?.data;
      const line = result?.line || row.line;
      if (row.command === 'visit.meet') {
        shell.set({ modal: null });
        world.perform('sip', { then: () => shell.toast(line) });
        return;
      }
      edit(m, {
        line: line || m.line,
        favorite: result?.favorite === true ? result.dish : result?.favorite,
        pending: null,
        group: '',
        open: true,
      });
    },
  };
}
