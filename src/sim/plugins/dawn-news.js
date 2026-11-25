// 清早便条多三样：夜里刚熟了几畦菜、鸡窝里有几个蛋、清早哪几处鱼口好。
// 只看夜里各插件算完的结果（菜长了、鸡下了蛋），写一张便条；不改别人的数据。
import { CROPS } from '../../content/items.js';
import { FISH_SPOTS } from '../../content/fishing.js';

export const dawnNews = {
  id: 'sim.dawnNews',
  requires: ['reactions', 'core', 'store', 'fishing'],
  install(ctx) {
    const { reactions, core, store, fishing } = ctx.services;
    reactions.on(
      'day.started',
      s => {
        const w = s.world;
        const lines = [];
        // 刚好长到熟的那一天算「夜里熟了」，前几天就熟了没收的不再提
        const ripe = Object.values(w.land.yard.plots).filter(
          p => p.crop && p.age === CROPS[p.crop].days,
        ).length;
        if (ripe) lines.push(`夜里菜地熟了${ripe}畦，能收了。`);
        const eggs = w.homesteads[store.id(w)]?.eggs || 0;
        if (eggs) lines.push(`鸡窝里有${eggs}个蛋。`);
        const good = Object.keys(FISH_SPOTS).filter(spot => fishing.mood(w, spot) === 'good');
        if (good.length)
          lines.push(
            `清早${good.map(s => FISH_SPOTS[s].name.replace('钓点', '')).join('、')}鱼口好。`,
          );
        if (lines.length) core.post(w, { title: '院里院外', text: lines.join('') });
      },
      { priority: 90 },
    );
  },
};
