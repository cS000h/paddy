// 柜台买卖、布摊和茶摊上的几件事。买卖成了，人在柜台前掏钱、接过东西（小窗开着，世界里照样看得见）。
export function marketActions({ shell, run, here, world }) {
  const trade = (type, item) => {
    const out = run(type, { shop: shell.get().modal.shop || 'market', item, at: here() });
    if (out.ok) world.perform('trade');
    return out;
  };
  return {
    marketBuy({ item }) {
      trade('market.buy', item);
    },
    marketSell({ item }) {
      trade('market.sell', item);
    },
    // 布摊：买一件成衣、学一种发式（规则在 sim/plugins/wardrobe.js）
    clothTab({ tab }) {
      shell.set({ modal: { ...shell.get().modal, tab } });
    },
    clothBuy({ kind, id }) {
      if (run('wardrobe.buy', { kind, id, at: here() }).ok) world.perform('trade');
    },
    teaDo({ kind }) {
      const r = run('tea.do', { kind, at: here() });
      if (r.ok) world.perform('sip');
      if (r.ok)
        shell.set({
          modal: { ...shell.get().modal, line: r.facts.find(f => f.type === 'tea.done').data.line },
        });
    },
  };
}
