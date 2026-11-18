// 灶台小窗的按钮：挑食材、调料、做法、刀工，掌火出锅，翻菜谱，吃饭端饭。
// 挑选中的东西只放在小窗的状态里，按下“做”才发给规则。
import { timingValue } from '../shell/timing.js';
export function kitchenActions({ game, shell, run, here }) {
  const edit = patch => shell.set({ modal: { ...shell.get().modal, ...patch } });
  const input = () => {
    const m = shell.get().modal;
    return {
      items: m.items || [],
      spices: m.spices || [],
      method: m.method || 'stew',
      cut: m.cut || null,
      at: here(),
    };
  };
  function cook(heat = null) {
    const out = run('cook', { ...input(), heat });
    if (out.ok) {
      const line = out.facts.find(f => f.type === 'meal.cooked').data.line;
      shell.set({ modal: { kind: 'kitchen', line } });
    }
  }
  return {
    cookCut({ cut }) {
      edit({ cut: cut || null });
    },
    cookRecipe({ name }) {
      const r = game.ask('kitchen', here()).recipes.find(r => r.name === name);
      if (r)
        shell.set({
          modal: { kind: 'kitchen', items: r.items, spices: r.spices, method: r.method },
        });
    },
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
