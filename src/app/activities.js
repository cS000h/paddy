// 采集点、钓点和院里家务的按钮。做完说什么由规则写在事实的 line 里，这里只负责摆到小窗上。
import { timingValue } from '../shell/timing.js';

const lineOf = (facts, ...types) => facts.find(f => types.includes(f.type))?.data.line || '';

export function activityActions({ shell, run, here }) {
  const fishing = () => shell.set({ modal: { kind: 'fish', started: performance.now() } });
  function reel(value) {
    const out = run('fish.reel', { value, at: here() });
    if (!out.ok) return;
    const line = lineOf(out.facts, 'fish.caught', 'fish.missed');
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
      if (out.ok)
        shell.set({ modal: { ...m, line: lineOf(out.facts, 'forage.finished', 'home.worked') } });
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
