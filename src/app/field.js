export function fieldActions({ game, shell, run, here, world }) {
  return {
    weather() {
      shell.set({ modal: { kind: 'weather' } });
    },
    skyLook() {
      run('sky.look', { at: here() });
    },
    seeds() {
      shell.set({ modal: { kind: 'seeds' } });
    },
    seedChoose({ seed }) {
      shell.set({ seed, tool: 'seed', modal: null });
    },
    field() {
      const t = world.scene().target();
      if (!game.ask('farm.detail', t.x, t.y))
        return shell.toast('走到锄过的地边，面朝那格地再查看。');
      shell.set({ modal: { kind: 'field', x: t.x, y: t.y } });
    },
    fieldCare({ kind }) {
      const m = shell.get().modal;
      run('farm.care', { kind, x: m.x, y: m.y, at: here() });
    },
  };
}
