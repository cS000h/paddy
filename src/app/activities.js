import { FIND_TEXT, ACTIVITY_TEXT, REST_TEXT } from '../content/life-text.js';
import { ITEMS } from '../content/items.js';
import { timingValue } from '../shell/timing.js';
export function activityActions({ game, shell, run, here }) {
  const fishing = () => shell.set({ modal: { kind: 'fish', started: performance.now() } });
  function reel(value) {
    const result = run('fish.reel', { value, at: here() });
    if (!result.ok) return;
    const catch_ = result.facts.find(f => f.type === 'fish.caught');
    const line = catch_
      ? `浮漂一沉，你手腕一抖，${catch_.data.n > 1 ? '一下子拉上来' + catch_.data.n + '条鱼' : '一条巴掌长的鲫鱼'}在草地上蹦跶。`
      : '可钩上空空的，鱼饵也被啃光了。你重新挂上饵，看着河面发了会儿呆。';
    shell.set({
      modal: { kind: 'activity', station: 'fish', label: '溪湾钓点', group: 'outing', line },
    });
  }
  return {
    activity({ id }) {
      const m = shell.get().modal;
      if (id === 'fish') {
        if (run('fish.cast', { at: here() }).ok) fishing();
        return;
      }
      const out = run(m.group === 'outing' ? 'gather' : 'homestead', { id, at: here() });
      if (!out.ok) return;
      const found = out.facts.find(f => f.type === 'forage.finished')?.data;
      const eggs = out.facts.find(f => f.type === 'eggs.collected')?.data;
      let line = ACTIVITY_TEXT[id] || FIND_TEXT[found?.item] || '';
      if (id === 'forage') line = FIND_TEXT[found.item];
      if (id === 'sticks')
        line =
          found.n > 1
            ? '你在竹林边捡了一大捆枯枝，用草绳一扎，扛在肩上，沉甸甸的。'
            : '枯枝都潮着，你挑干一点的捡了一小捆。';
      if (id === 'rest') line = REST_TEXT[game.ask('hero').map] || REST_TEXT.yard;
      if (id === 'stars' && game.ask('weather').tags.includes('wet'))
        line = '雨顺着瓦沟淌下来，在檐下滴成一排。隔壁桂嫂家的灯还亮着。';
      line = line.replaceAll('{n}', String(found?.n || eggs?.n || 0));
      if (found) line += `（${ITEMS[found.item].name} ×${found.n}，已收好）`;
      shell.set({ modal: { ...m, line } });
    },
    resumeFish: fishing,
    fishReel() {
      reel(timingValue(performance.now() - shell.get().modal.started));
    },
    fishGiveUp() {
      reel(0);
    },
  };
}
