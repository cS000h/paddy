// 食物带来的好处独立挂到计算管道，用到时才消耗。
export const foodEffects = {
  id: 'sim.foodEffects',
  requires: ['compute', 'reactions', 'body', 'people'],
  writes: [],
  install(ctx) {
    const { compute, reactions, body, people } = ctx.services;
    compute.tap(
      'action.cost',
      (r, { w, who, action }) => {
        if (body.buff(w, who)?.type === 'hearty' && action.kind === 'farm' && action.base > 0)
          compute.part(r, 'buff.hearty', '踏实', -1);
      },
      { priority: 60 },
    );
    compute.tap(
      'action.cost',
      (r, { w, who, action }) => {
        const type = body.buff(w, who)?.type;
        if (!['warm', 'cool'].includes(type) || !action.outdoor) return;
        const extra = r.parts
          .filter(
            p =>
              (type === 'warm' && ['weather.wet', 'trait.rainwalker'].includes(p.id)) ||
              (p.id === 'body.comfort' &&
                (type === 'warm' ? /冷/.test(p.label) : /热/.test(p.label))),
          )
          .reduce((n, p) => n + p.delta, 0);
        if (extra > 0) compute.part(r, 'buff.' + type, type === 'warm' ? '暖身' : '清凉', -extra);
      },
      { priority: 60 },
    );
    compute.tap(
      'body.feel',
      (r, { w, who }) => {
        const type = body.buff(w, who)?.type;
        if (type === 'warm' && r.value < 18) compute.part(r, 'buff.warm', '热汤暖身', 3);
        if (type === 'cool' && r.value >= 26) compute.part(r, 'buff.cool', '凉菜解暑', -3);
      },
      { priority: 20 },
    );
    compute.tap(
      'chill.chance',
      (r, { w, who }) => {
        if (body.buff(w, who)?.type === 'warm') r.value *= 0.3;
      },
      { priority: 60 },
    );
    for (const [pipe, type, label, kinds] of [
      ['action.yield', 'fresh', '清爽', ['forage', 'fish']],
      ['relation.gain', 'guest', '好客', null],
      ['xp.gain', 'alert', '提神', null],
    ])
      compute.tap(
        pipe,
        (r, { w, who = people.who(w), action }) => {
          if (body.buff(w, who)?.type === type && (!kinds || kinds.includes(action?.kind)))
            compute.part(r, 'buff.' + type, label, 1);
        },
        { priority: 60 },
      );
    reactions.on(
      'action.performed',
      (s, e) => {
        const id = e.data.who,
          b = body.buff(s.world, id);
        if (b && e.data.applied.includes('buff.' + b.type)) body.useBuff(s.world, id, b.type);
      },
      { priority: 30 },
    );
  },
};
