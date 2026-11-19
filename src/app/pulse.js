// 走到跟前处理小事、和过客搭话办事的按钮动作，以及去处提示。
export function pulseActions({ shell, run, here }) {
  return {
    eventPick({ choice }) {
      const out = run('event.choose', { choice: Number(choice), at: here() });
      if (!out.ok) return;
      const f = out.facts.find(x => x.type === 'pulse.resolved')?.data;
      shell.set({ modal: null });
      if (f?.line) shell.toast(f.line);
    },
    visitorTalk({ id }) {
      const out = run('visitor.talk', { id, at: here() });
      if (!out.ok) return;
      const f = out.facts.find(x => x.type === 'visitor.talked')?.data;
      shell.set({ modal: { kind: 'visitor', id, line: f?.line || '' } });
    },
    visitorFulfill({ id, dish }) {
      const input = dish ? { id, dish: Number(dish), at: here() } : { id, at: here() };
      const out = run('visitor.fulfill', input);
      if (!out.ok) return;
      const f = out.facts.find(x => x.type === 'visitor.fulfilled')?.data;
      shell.set({ modal: { kind: 'visitor', id, line: f?.line || '' } });
    },
  };
}

export function pulseNotices(game, shell) {
  let hinted = '';
  game.onCommit(() => {
    const ev = game.ask('events').active;
    if (!ev) {
      hinted = '';
      return;
    }
    const key = `${ev.id}:${ev.day}`;
    if (key !== hinted) {
      hinted = key;
      shell.toast(ev.hint);
    }
  });
}
