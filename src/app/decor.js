// 小屋里换摆设：置办一样、换上收着的（规则在 sim/plugins/decor.js）；换上那句旁白留在小窗里。
export function decorActions({ shell, run, here }) {
  const change = (type, slot, style) => {
    const r = run(type, { slot, style, at: here() });
    if (!r.ok) return;
    const fact = r.facts.find(f => f.type === 'decor.changed');
    shell.set({ modal: { ...shell.get().modal, line: fact.data.line } });
  };
  return {
    decorBuy({ slot, style }) {
      change('decor.buy', slot, style);
    },
    decorSet({ slot, style }) {
      change('decor.set', slot, style);
    },
  };
}
