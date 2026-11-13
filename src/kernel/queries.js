// Read-only queries. Each rule plugin defines the questions it can answer about its own slices
// (“which plots are wet?”, “why can't I sow here?”), and the port asks them by name. There is no
// central view-model that has to know every plugin.
//   queries.define('farm.plots', (world, mapId) => …)
//   queries.run('farm.plots', world, 'yard')
// Queries must not change the world; the guard verifies this in debug runs.

function createQueries({ guard = null } = {}) {
  const defs = new Map();
  const api = {
    define(name, fn, owner = null) {
      if (defs.has(name)) throw new Error(`Duplicate query: ${name}`);
      if (typeof fn !== 'function') throw new TypeError('Query must be a function');
      const entry = { fn, owner };
      defs.set(name, entry);
      return () => {
        if (defs.get(name) === entry) defs.delete(name);
      };
    },
    run(name, world, ...args) {
      const entry = defs.get(name);
      if (!entry) throw new Error(`Unknown query: ${name}`);
      const go = () => entry.fn(world, ...args);
      return guard ? guard.pure(`query:${name}`, world, go) : go();
    },
    list: () => [...defs.keys()].sort(),
    scope(meta, track) {
      return Object.freeze({
        define: (name, fn) => track(api.define(name, fn, meta)),
        run: api.run,
      });
    },
  };
  return Object.freeze(api);
}

export { createQueries };
