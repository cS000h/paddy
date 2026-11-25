// 采集点和院里干家务的按钮：挑了一件活就合上小窗，人走过去在世界里做给你看（world 的 work / perform），
// 做完冒一句话。钓鱼另有一个小窗（panels/fishing.js）：挑饵下竿 → 看漂 → 遛鱼 → 出鱼，
// 这一竿完了小窗不关，换成结果（拉上来的鱼、跑了、没钓着），可以接着再下一竿。规则见 sim/plugins/fishing.js。

const spotOf = m => (m && m.x !== undefined ? { x: m.x, y: m.y } : null);

export function activityActions({ game, shell, run, here, world }) {
  // 钓鱼：对着哪一格、这一竿下竿的时刻、遛鱼时按下松开的记录；人举着竿时小窗被关了，就把竿收了
  let fishingAt = null;
  let waiting = false;
  let timer = null;
  let presses = [];
  const modal = () => shell.get().modal;

  shell.subscribe(state => {
    if (!waiting || state.modal?.kind === 'fishing') return;
    waiting = false;
    clearTimeout(timer);
    world.stopPerforming();
    // 小窗是被关掉的（点了外面、按了取消）：浮漂还在水里就收竿
    setTimeout(() => {
      if (game.ask('fishing', here()).bout) run('fish.quit', { at: here() });
    });
  });

  /** 这一竿完了：人收竿；小窗换成结果。衣装这类顺带碰上的事照旧冒一句话。 */
  function finish(out) {
    waiting = false;
    clearTimeout(timer);
    const m = modal();
    if (!out.ok) return void shell.set({ modal: null });
    const caught = out.facts.find(f => f.type === 'fish.caught')?.data;
    const lost = out.facts.find(f => f.type === 'fish.lost')?.data;
    const other = out.facts.find(f => f.type.startsWith('fish.') && f.data.line)?.data.line;
    const aside = out.facts.find(f => f.type === 'wardrobe.got')?.data.line || null;
    world.perform(caught ? 'reel' : 'miss', { target: fishingAt, water: true });
    if (m?.kind !== 'fishing') return void (aside && shell.toast(aside));
    const next = { ...m, started: performance.now(), events: null, aside };
    if (caught) return void shell.set({ modal: { ...next, phase: 'caught', catch: caught } });
    shell.set({
      modal: { ...next, phase: lost ? 'lost' : 'missed', why: lost?.why || null, line: other },
    });
  }

  function hook(t) {
    clearTimeout(timer);
    const out = run('fish.hook', { at: here(), t });
    const hooked = out.ok && out.facts.find(f => f.type === 'fish.hooked');
    if (!hooked) return finish(out);
    presses = [];
    shell.set({
      modal: {
        ...modal(),
        phase: 'fight',
        started: performance.now(),
        size: hooked.data.size,
        leap: !!hooked.data.leap,
      },
    });
    return undefined;
  }

  return {
    activity({ id }) {
      const m = modal();
      shell.set({ modal: null });
      world.work(m.group, id, spotOf(m));
    },
    fishCast({ bait }) {
      const m = modal();
      const out = run('fish.cast', { at: here(), bait: bait || null });
      if (!out.ok) return;
      fishingAt = spotOf(m) || fishingAt;
      world.perform('cast', { target: fishingAt, water: true });
      const { bout, spot } = game.ask('fishing', here());
      waiting = true;
      shell.set({
        modal: {
          ...m,
          phase: 'float',
          spot: spot?.id || 'yard',
          bait: bait || null,
          started: performance.now(),
          events: bout.float.events,
          catch: null,
          line: null,
          aside: null,
        },
      });
      // 到头了还没提竿：这一竿就算没提
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (modal()?.kind === 'fishing' && modal().phase === 'float') hook(-1);
      }, bout.float.end + 300);
    },
    fishHook() {
      const m = modal();
      if (m?.phase === 'float') hook(Math.round(performance.now() - m.started));
    },
    fishPress({ down }) {
      const m = modal();
      if (m?.phase !== 'fight') return;
      const t = Math.max(presses.at(-1)?.[0] ?? 0, Math.round(performance.now() - m.started));
      presses.push([Math.min(t, 30000), down ? 1 : 0]);
    },
    /** 遛到第 t 毫秒是什么样子（面板每一帧问一次）。 */
    fishState(t) {
      return game.ask('fish.fight', presses, t);
    },
    fishLand() {
      finish(run('fish.land', { at: here(), log: presses }));
    },
    /** 看漂、遛鱼时收竿：这一竿不要了，小窗关上。 */
    fishQuit() {
      waiting = false;
      clearTimeout(timer);
      if (game.ask('fishing', here()).bout) run('fish.quit', { at: here() });
      shell.set({ modal: null });
      world.perform('miss', { target: fishingAt, water: true });
    },
  };
}
