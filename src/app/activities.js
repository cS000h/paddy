// 采集点、钓点和院里干家务的按钮。挑了一件活就合上小窗，人走过去在世界里做给你看
// （world 的 work / perform），做完冒一句话；钓鱼先甩竿，浮漂在水里时底下一条看时机的横条。
import { timingValue } from '../shell/timing.js';

const spotOf = m => (m && m.x !== undefined ? { x: m.x, y: m.y } : null);

export function activityActions({ shell, run, here, world }) {
  // 钓鱼时对着哪一格；waiting 为真时人正举着竿等，看时机的横条关了（没收竿）就把竿收起来
  let fishingAt = null;
  let waiting = false;
  const fishing = () => {
    waiting = true;
    shell.set({ modal: { kind: 'fish', started: performance.now() } });
  };
  shell.subscribe(state => {
    if (!waiting || state.modal?.kind === 'fish') return;
    waiting = false;
    world.stopPerforming();
  });

  function reel(value) {
    waiting = false;
    shell.set({ modal: null });
    const out = run('fish.reel', { value, at: here() });
    const caught = out.ok && out.facts.some(f => f.type === 'fish.caught');
    const line =
      out.ok &&
      (out.facts.find(f => f.type === 'wardrobe.got')?.data.line ??
        out.facts.find(f => f.type === 'fish.caught' || f.type === 'fish.missed')?.data.line);
    world.perform(caught ? 'reel' : 'miss', {
      target: fishingAt,
      water: true,
      then: () => line && shell.toast(line),
    });
    if (out.ok) fishingAt = null;
  }

  return {
    activity({ id }) {
      const m = shell.get().modal;
      if (id === 'fish') {
        if (!run('fish.cast', { at: here() }).ok) return;
        fishingAt = spotOf(m);
        shell.set({ modal: null });
        world.perform('cast', { target: fishingAt, water: true });
        fishing();
        return;
      }
      shell.set({ modal: null });
      world.work(m.group, id, spotOf(m));
    },
    resumeFish() {
      fishingAt = spotOf(shell.get().modal) || fishingAt;
      world.perform('cast', { target: fishingAt, water: true });
      fishing();
    },
    fishReel() {
      reel(timingValue(performance.now() - shell.get().modal.started));
    },
    fishGiveUp() {
      reel(0);
    },
  };
}
