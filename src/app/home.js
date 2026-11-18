// 身边的事：开行囊、吃喝、收拾行囊、打水、睡觉、送礼、收菜筐。
// 过夜要拉一层纸盖住世界再揭开，所以睡觉也放在这里，而不是只发一条命令。
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export function homeActions({ game, shell, run, here, world }) {
  const at = () => ({ at: here() });
  /** 小窗里记着的那一格（水边、田地）。 */
  const spot = () => {
    const m = shell.get().modal;
    return { x: m.x, y: m.y };
  };
  return {
    bag() {
      shell.set({ modal: { kind: 'bag' } });
    },
    eat({ item }) {
      run('eat', { item, ...at() });
    },
    sip() {
      run('sip', at());
    },
    packPut({ item, n }) {
      run('pack.put', { item, n: n === 'all' ? n : Number(n), ...at() });
    },
    packTake({ item, n }) {
      run('pack.take', { item, n, ...at() });
    },
    // 喝水、打水：成了就合上小窗，人在水边弯腰舀一瓢
    drink() {
      const where = spot();
      if (!run('drink', { ...where, ...at() }).ok) return;
      shell.set({ modal: null });
      world.perform('drink', { target: where });
    },
    refill() {
      const where = spot();
      if (!run('farm.refill', { ...where, ...at() }).ok) return;
      shell.set({ modal: null });
      world.perform('drink', { target: where });
    },
    async sleep() {
      shell.set({ modal: null, veil: 1 });
      await wait(650);
      const out = run('sleep', at());
      await wait(350);
      shell.set({ veil: 0 });
      if (!out.ok) return;
      const day = game.ask('clock').day;
      const notes = game.ask('notes', day);
      if (notes.length) shell.set({ modal: { kind: 'notes', day, notes } });
      else shell.toast(`第 ${day} 日的清早。`);
    },
    gift({ to, item, dish }) {
      const modal = shell.get().modal;
      const out = run('gift', { to, item, dish: dish ? Number(dish) : null, ...at() });
      if (!out.ok) return;
      const { line, gain } = out.facts.find(f => f.type === 'gift.given').data;
      shell.set({ modal: { ...modal, line, gain, gifted: true } });
    },
    basketPut({ item, n }) {
      if (run('basket.put', { item, n: Number(n), ...at() }).ok)
        shell.set({ modal: { kind: 'basket' } });
    },
    basketOrder({ item, n }) {
      if (run('basket.order', { item, n: Number(n), ...at() }).ok)
        shell.set({ modal: { kind: 'basket' } });
    },
  };
}
