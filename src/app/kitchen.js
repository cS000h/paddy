import { timingValue } from '../shell/timing.js';
export function kitchenActions({ game, shell, run, here }) {
  const edit = patch => shell.set({ modal: { ...shell.get().modal, ...patch } });
  const input = () => {
    const m = shell.get().modal;
    return { items: m.items || [], spices: m.spices || [], method: m.method || 'stew', at: here() };
  };
  function cook(heat = null) {
    const out = run('cook', { ...input(), heat });
    if (out.ok) {
      const d = out.facts.find(f => f.type === 'meal.cooked').data;
      shell.set({ modal: { kind: 'kitchen' } });
      shell.toast(`${d.servings}份${d.name}出锅了。`);
    }
  }
  return {
    cookPick({ item }) {
      const items = shell.get().modal.items || [];
      if (items.includes(item)) edit({ items: items.filter(k => k !== item) });
      else if (items.length < 3) edit({ items: [...items, item] });
      else shell.toast('一锅最多三样食材');
    },
    cookSpice({ item }) {
      const spices = shell.get().modal.spices || [];
      if (spices.length < 2) edit({ spices: [...spices, item] });
      else shell.toast('最多两勺调料');
    },
    cookClearSpice() {
      edit({ spices: [] });
    },
    cookMethod({ method }) {
      edit({ method });
    },
    cookPlain() {
      cook();
    },
    cookHeat() {
      const data = input();
      if (data.method === 'mix') return cook();
      edit({ kind: 'heat', ...data, started: performance.now() });
    },
    cookFinish() {
      cook(timingValue(performance.now() - shell.get().modal.started));
    },
    backKitchen() {
      edit({ kind: 'kitchen' });
    },
    recipes() {
      shell.set({ modal: { kind: 'recipes', page: 0 } });
    },
    recipePage({ page }) {
      edit({ page: Number(page) });
    },
    dishEat({ id }) {
      run('dish.eat', { id: Number(id), at: here() });
    },
    dishPack({ id }) {
      run('dish.pack', { id: Number(id), at: here() });
    },
    dishStore({ id }) {
      run('dish.store', { id: Number(id), at: here() });
    },
  };
}
