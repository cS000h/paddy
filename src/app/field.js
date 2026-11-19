// 看天、挑菜种、查看和照料面前那一格地。
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
      shell.set({ seed, tool: 'seed', manualTool: true, modal: null });
    },
    field() {
      const t = world.scene().target();
      if (!game.ask('farm.detail', t.x, t.y)) {
        // 从“菜单”里点进来的：菜单收起来，人才看得见提示里说的那格地
        if (shell.get().modal?.kind === 'menu') shell.set({ modal: null });
        return shell.toast('走到锄过的地边，面朝那格地再查看。');
      }
      shell.set({ modal: { kind: 'field', x: t.x, y: t.y } });
    },
    fieldCare({ kind }) {
      const m = shell.get().modal;
      run('farm.care', { kind, x: m.x, y: m.y, at: here() });
    },
  };
}
