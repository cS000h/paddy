// Compute pipelines ("waterfall hooks"). A plugin that wants to change a number another plugin
// owns taps the pipeline instead of editing that plugin:
//   compute.tap('action.cost', (result, env) => { if (...) part(result, 'weather.wet', '雨天', +2); }, {priority: 10})
//   compute.run('action.cost', env, {value: 6, parts: []})
// The same pipeline is used for the UI preview and for the committed action, so "what the
// button says" and "what actually happens" cannot drift apart (0.5 rewrote the cost text with a regex).
// Taps are read-only with respect to game state; the guard verifies this in debug runs.

function part(result, id, label, delta) {
  if (!delta) return result;
  result.value += delta;
  result.parts.push({ id, label, delta });
  return result;
}

function createCompute({ guard = null } = {}) {
  const taps = new Map();
  let counter = 0;
  const api = {
    tap(name, fn, { priority = 50, owner = null } = {}) {
      if (typeof fn !== 'function') throw new TypeError('Tap must be a function');
      if (!taps.has(name)) taps.set(name, []);
      const list = taps.get(name);
      const entry = { fn, priority, owner, order: counter++ };
      list.push(entry);
      list.sort((a, b) => a.priority - b.priority || a.order - b.order);
      return () => {
        const i = list.indexOf(entry);
        if (i >= 0) list.splice(i, 1);
      };
    },
    run(name, env, result) {
      const go = () => {
        for (const entry of taps.get(name) || []) {
          const next = entry.fn(result, env);
          if (next !== undefined) result = next;
        }
        return result;
      };
      return guard && env && env.s ? guard.pure(`compute:${name}`, env.s, go) : go();
    },
    list(name) {
      return (taps.get(name) || []).map(e => e.owner?.id || '?');
    },
    scope(meta, track) {
      return Object.freeze({
        tap: (name, fn, options = {}) => track(api.tap(name, fn, { ...options, owner: meta })),
        run: api.run,
        part,
      });
    },
    part,
  };
  return Object.freeze(api);
}

export { createCompute, part };
