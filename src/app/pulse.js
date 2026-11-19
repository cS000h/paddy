// 随机随机事件与流动过客的按钮动作与提示。
export function pulseActions({ game, shell, run }) {
  return {
    event() {
      shell.set({ modal: { kind: 'event' } });
    },
    eventPick({ choice }) {
      const out = run('event.choose', { choice: Number(choice) });
      if (!out.ok) return;
      const f = out.facts.find(x => x.type === 'pulse.resolved')?.data;
      shell.set({
        modal: f
          ? { kind: 'event', title: f.title, success: f.success, line: f.line }
          : null,
      });
    },
    visitors() {
      shell.set({ modal: { kind: 'visitors' } });
    },
    visitorTalk({ id }) {
      const out = run('visitor.talk', { id });
      if (!out.ok) return;
      const f = out.facts.find(x => x.type === 'visitor.talked')?.data;
      shell.set({ modal: { kind: 'visitors', line: f?.line || '' } });
    },
    visitorFulfill({ id, dish }) {
      const input = dish ? { id, dish: Number(dish) } : { id };
      const out = run('visitor.fulfill', input);
      if (!out.ok) return;
      const f = out.facts.find(x => x.type === 'visitor.fulfilled')?.data;
      shell.set({ modal: { kind: 'visitors', line: f?.line || '' } });
    },
  };
}

export function pulseNotices(game, shell) {
  game.onCommit(facts => {
    if (facts.some(f => f.type === 'day.started') && game.ask('events').active) {
      shell.toast('清早村里有件小事，点「小事」看看');
    }
  });
}
