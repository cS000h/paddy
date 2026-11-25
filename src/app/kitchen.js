// 灶台小窗的按钮：挑食材、调料、做法、刀工，掌火出锅，翻菜谱，吃饭端饭。
// 挑选中的东西只放在小窗的状态里，按下“做”才发给规则。
// 亲自掌火时按的每一下（下料、翻锅、添柴、翻面）记在小窗里，出锅时连同时刻一起交给规则判火候。
import { FIRE } from '../content/cook-fire.js';
export function kitchenActions({ game, shell, run, here, world }) {
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
  function cook(log = null) {
    const m = shell.get().modal;
    const out = run('cook', { ...input(), log });
    if (!out.ok && m?.kind === 'heat') edit({ finishing: false });
    if (out.ok) {
      const { line, ids } = out.facts.find(f => f.type === 'meal.cooked').data;
      // 合上小窗，在灶前把这顿饭做一遍给人看：切菜、添柴生火、翻炒、盛出来；做完再回到灶台
      const stove = m.x !== undefined ? { x: m.x, y: m.y } : null;
      const back = { kind: 'kitchen', line, servedId: ids[0], x: m.x, y: m.y };
      shell.set({ modal: null });
      world.perform('cook:' + (m.method || 'stew'), {
        target: stove,
        then: () => shell.set({ modal: back }),
      });
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
      edit({ kind: 'heat', ...data, started: performance.now(), log: [], finishing: false });
    },
    /** 掌火时按了一下：记下第几毫秒按的哪个键。 */
    firePress({ key }) {
      const m = shell.get().modal;
      const log = m?.log || [];
      if (m?.kind !== 'heat' || m.finishing || log.length >= FIRE.presses - 1) return;
      const t = Math.min(60000, Math.round(performance.now() - m.started));
      edit({ log: [...log, [Math.max(t, log.at(-1)?.[0] ?? 0), key]] });
    },
    /** 出锅：把按的记录交给规则判火候。 */
    cookFinish() {
      const m = shell.get().modal;
      if (m?.kind !== 'heat' || m.finishing) return;
      const log = m.log || [];
      const t = Math.min(60000, Math.round(performance.now() - m.started));
      edit({ finishing: true });
      cook([...log, [Math.max(t, log.at(-1)?.[0] ?? 0), 'serve']]);
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
