// Write guard. With the guard on (tests, or ?debug in the browser) each listener / command / hook
// runs against a before-and-after comparison of world slices, and an undeclared write throws,
// which rolls back the whole transaction. It costs JSON copies, so it is off in normal play.
//
// New in 稻: a write is judged against the innermost owner that is running. When plugin A calls a
// service function that plugin B wrapped with ctx.own(), the slices B changes are checked against
// B's `writes` and excused for A. So a plugin declares only the slices it changes itself.

function createGuard({ shared = [] } = {}) {
  const always = new Set(shared);
  const frames = []; // one per check in progress, outermost first

  const freezeKeys = s => {
    const out = {};
    if (s.world) for (const k of Object.keys(s.world)) out[k] = JSON.stringify(s.world[k]);
    const rootRest = { ...s };
    delete rootRest.world;
    delete rootRest.revision;
    out['@root'] = JSON.stringify(rootRest);
    out['@hasWorld'] = String(!!s.world);
    return out;
  };

  // Returns the slices this owner changed (all of them allowed), or throws.
  function check(owner, before, state, excused) {
    const after = freezeKeys(state);
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    const created = before['@hasWorld'] === 'false';
    const changed = [];
    for (const key of keys) {
      if (before[key] === after[key]) continue;
      if (created && !key.startsWith('@')) continue; // a brand-new world counts as one write to "world"
      const slice = key === '@hasWorld' ? 'world' : key;
      changed.push(slice);
      if (always.has(slice) || excused.has(slice)) continue;
      if (!owner) throw new Error(`Anonymous code changed "${slice}"`);
      if (!owner.writes.includes(slice))
        throw new Error(`${owner.id} changed "${slice}" without declaring writes:['${slice}']`);
    }
    return changed;
  }

  return Object.freeze({
    run(owner, state, fn) {
      if (!state || typeof state !== 'object') return fn();
      const before = freezeKeys(state);
      const frame = { excused: new Set() };
      frames.push(frame);
      let result;
      try {
        result = fn();
      } finally {
        frames.pop();
      }
      const changed = check(owner, before, state, frame.excused);
      for (const outer of frames) for (const slice of changed) outer.excused.add(slice);
      return result;
    },
    // Read-only code (compute hooks, queries) may not change anything at all.
    pure(label, state, fn) {
      if (!state || typeof state !== 'object') return fn();
      const before = JSON.stringify(state);
      const result = fn();
      if (JSON.stringify(state) !== before)
        throw new Error(`${label} must be read-only but changed state`);
      return result;
    },
  });
}

export { createGuard };
