// 身边的事：开行囊、吃喝、收拾行囊、打水、睡觉、送礼。
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
    /** 彩头的别的用处：南瓜王、双黄蛋摆在院里，红鲤放回河里（sim/plugins/prizes.js）。 */
    prizeUse({ item }) {
      const out = run('prize.use', { item, ...at() });
      const f = out.ok && out.facts.find(x => x.type === 'prize.used');
      if (f) {
        shell.set({ modal: null });
        shell.toast(f.data.line, true);
      }
    },
    packPut({ item, n }) {
      run('pack.put', { item, n: n === 'all' ? n : Number(n), ...at() });
    },
    packTake({ item, n }) {
      run('pack.take', { item, n, ...at() });
    },
    fittingTab({ tab }) {
      shell.set({ modal: { ...shell.get().modal, tab, showMissing: false } });
    },
    fittingMissing() {
      const modal = shell.get().modal;
      shell.set({ modal: { ...modal, showMissing: !modal.showMissing } });
    },
    fittingPick({ id }) {
      const m = shell.get().modal;
      shell.set({ modal: { ...m, [m.tab === 'hair' ? 'hair' : 'coat']: id } });
    },
    fittingWear() {
      const m = shell.get().modal;
      const { worn } = game.ask('wardrobe');
      if (
        run('wardrobe.wear', { ...at(), coat: m.coat ?? worn.coat, hair: m.hair ?? worn.hair }).ok
      )
        shell.set({ modal: null });
    },
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
      world.perform('refill', { target: where });
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
      const gifts = out.facts.filter(f => f.type === 'gift.returned').map(f => f.data);
      if (notes.length) shell.set({ modal: { kind: 'notes', day, notes, gifts } });
      else shell.toast(`第 ${day} 日的清早。`);
    },
  };
}
