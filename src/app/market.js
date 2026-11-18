// 柜台买卖和茶摊上的几件事。
export function marketActions({ game, shell, run, here }) {
  const trade = (type, item) =>
    run(type, { shop: shell.get().modal.shop || 'market', item, at: here() });
  return {
    marketBuy({ item }) {
      trade('market.buy', item);
    },
    marketSell({ item }) {
      trade('market.sell', item);
    },
    teaDo({ kind }) {
      const r = run('tea.do', { kind, at: here() });
      if (r.ok)
        shell.set({
          modal: { ...shell.get().modal, line: r.facts.find(f => f.type === 'tea.done').data.line },
        });
    },
  };
}
