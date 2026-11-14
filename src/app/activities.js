import { timingValue } from '../shell/timing.js';
export function activityActions({ game, shell, run, here }) {
  const fishing = () => shell.set({ modal: { kind: 'fish', started: performance.now() } });
  function reel(value) {
    const result = run('fish.reel', { value, at: here() });
    if (!result.ok) return;
    const catch_ = result.facts.find(f => f.type === 'fish.caught');
    shell.set({ modal: { kind: 'activity', station: 'fish', label: '溪湾钓点', group: 'outing' } });
    shell.toast(catch_ ? `钓上来${catch_.data.n}条鱼！` : '鱼脱钩了，水面又静下来。');
  }
  return {
    activity({ id }) {
      const m = shell.get().modal;
      if (id === 'fish') {
        if (run('fish.cast', { at: here() }).ok) fishing();
        return;
      }
      const out = run(m.group === 'outing' ? 'gather' : 'homestead', { id, at: here() });
      if (out.ok)
        shell.toast(m.group === 'outing' ? '找到了，已经收好。' : '忙完这件事，心里踏实。');
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
