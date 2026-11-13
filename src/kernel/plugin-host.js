// Plugin host, Cordis-style but deliberately small:
//  - requires / provides  : service dependency graph, topologically ordered
//  - writes               : which world slices a plugin may change (checked by the guard in tests / ?debug)
//  - ctx.services.X       : if a service exposes scope(meta), the plugin gets a copy bound to itself,
//                           so listeners, commands, hooks and slices it registers carry its identity.
//  - ctx.effect / ctx.on  : everything registered is released when the host stops.
//  - ctx.own(fn)          : a service function that writes this plugin's slices on behalf of callers.

function createPluginHost({ services: seedServices = {}, events, guard = null }) {
  const services = new Map(Object.entries(seedServices));
  let phase = 'new';
  let cleanup = [];
  const installed = [];
  const metas = [];

  function installationOrder(plugins) {
    const ids = new Set();
    const providers = new Map([...services.keys()].map(key => [key, 'host']));
    for (const plugin of plugins) {
      if (!plugin.id || ids.has(plugin.id))
        throw new Error(`Duplicate or missing plugin id: ${plugin.id}`);
      if (typeof plugin.install !== 'function') throw new Error(`Missing install: ${plugin.id}`);
      ids.add(plugin.id);
      for (const key of plugin.provides || []) {
        if (providers.has(key)) throw new Error(`Duplicate service: ${key}`);
        providers.set(key, plugin.id);
      }
    }
    for (const plugin of plugins) {
      for (const key of plugin.requires || []) {
        if (!providers.has(key)) throw new Error(`Missing service: ${key} for ${plugin.id}`);
      }
    }
    // Stable order: dependency first, then the order plugins were listed (not alphabetical),
    // so listener priority ties resolve the way the author reads game.js.
    const pending = [...plugins];
    const ready = new Set(services.keys());
    const order = [];
    while (pending.length) {
      const index = pending.findIndex(plugin =>
        (plugin.requires || []).every(key => ready.has(key)),
      );
      if (index < 0)
        throw new Error('Circular service dependency: ' + pending.map(p => p.id).join(', '));
      const [plugin] = pending.splice(index, 1);
      order.push(plugin);
      for (const key of plugin.provides || []) ready.add(key);
    }
    return order;
  }

  function releaseAll() {
    const errors = [];
    for (const release of cleanup.reverse()) {
      try {
        release();
      } catch (error) {
        errors.push(error);
      }
    }
    cleanup = [];
    installed.length = 0;
    if (errors.length) throw new AggregateError(errors, 'Plugin cleanup failed');
  }

  return Object.freeze({
    start(plugins) {
      if (phase !== 'new') throw new Error('Create a new host for each game session');
      const order = installationOrder(plugins);
      phase = 'starting';
      try {
        for (const plugin of order) {
          const owned = [];
          const provided = [];
          const scopedCache = new Map();
          let active = true;
          const meta = Object.freeze({
            id: plugin.id,
            writes: Object.freeze([...(plugin.writes || [])]),
          });
          metas.push(meta);
          const assertActive = () => {
            if (!active || !['starting', 'active'].includes(phase))
              throw new Error('Plugin is inactive');
          };
          const track = release => {
            if (typeof release === 'function') owned.push(release);
            return release;
          };
          cleanup.push(() => {
            active = false;
            const errors = [];
            for (const release of owned.reverse()) {
              try {
                release();
              } catch (error) {
                errors.push(error);
              }
            }
            for (const key of provided) services.delete(key);
            if (errors.length) throw new AggregateError(errors, `Cleanup failed: ${plugin.id}`);
          });
          const context = Object.freeze({
            plugin: meta,
            services: new Proxy(Object.create(null), {
              get(_, key) {
                assertActive();
                if (typeof key !== 'string' || !(plugin.requires || []).includes(key))
                  throw new Error(`Undeclared dependency: ${String(key)} in ${plugin.id}`);
                if (scopedCache.has(key)) return scopedCache.get(key);
                const service = services.get(key);
                if (service && typeof service.scope === 'function') {
                  // Scoped services return release functions; collect them automatically.
                  const scoped = service.scope(meta, track);
                  scopedCache.set(key, scoped);
                  return scoped;
                }
                return service;
              },
              set() {
                throw new Error('Service context is read-only');
              },
            }),
            provide(key, service) {
              assertActive();
              if (phase !== 'starting') throw new Error('Services are installed only at startup');
              if (
                !(plugin.provides || []).includes(key) ||
                services.has(key) ||
                service === undefined
              ) {
                throw new Error(`Invalid service registration: ${key}`);
              }
              services.set(key, service);
              provided.push(key);
            },
            on(type, listener) {
              assertActive();
              return track(events.on(type, listener));
            },
            // Wrap a service function that changes the world, so the guard checks the write against
            // this plugin (the owner of the slice) and not against whoever called the service.
            // The wrapped function must take the world as its first argument.
            own(fn) {
              if (typeof fn !== 'function') throw new TypeError('own() needs a function');
              if (!guard) return fn;
              return (world, ...args) => guard.run(meta, { world }, () => fn(world, ...args));
            },
            effect(install) {
              assertActive();
              const release = install();
              if (typeof release !== 'function')
                throw new Error('Effect must return a cleanup function');
              return track(release);
            },
          });
          const release = plugin.install(context);
          if (release && typeof release.then === 'function') {
            Promise.resolve(release).catch(() => {});
            throw new Error('Plugin installation must be synchronous');
          }
          if (release !== undefined && typeof release !== 'function')
            throw new Error('Invalid plugin cleanup');
          if (release) owned.push(release);
          for (const key of plugin.provides || []) {
            if (!provided.includes(key)) throw new Error(`Service was not provided: ${key}`);
          }
          installed.push(plugin.id);
        }
        phase = 'active';
        return [...installed];
      } catch (error) {
        phase = 'failed';
        try {
          releaseAll();
        } catch (cleanupError) {
          throw new AggregateError([error, cleanupError], 'Startup failed');
        }
        throw error;
      }
    },
    stop() {
      if (phase === 'stopped') return;
      phase = 'stopped';
      releaseAll();
    },
    inspect() {
      return {
        phase,
        installed: [...installed],
        services: [...services.keys()],
        writes: Object.fromEntries(metas.map(m => [m.id, [...m.writes]])),
      };
    },
  });
}

export { createPluginHost };
