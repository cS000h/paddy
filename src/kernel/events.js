// Facts are JSON data. Copies prevent observers from receiving live state.
function immutableCopy(value) {
  function freeze(item) {
    if (item && typeof item === 'object') {
      Object.values(item).forEach(freeze);
      Object.freeze(item);
    }
    return item;
  }
  return freeze(JSON.parse(JSON.stringify(value)));
}

function createEvents() {
  const listeners = new Map();
  return Object.freeze({
    on(type, listener) {
      if (typeof listener !== 'function') throw new TypeError('Listener must be a function');
      const entry = { listener };
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(entry);
      return () => {
        const group = listeners.get(type);
        group?.delete(entry);
        if (group?.size === 0) listeners.delete(type);
      };
    },
    publish(fact) {
      const value = immutableCopy(fact);
      const errors = [];
      for (const { listener } of [...(listeners.get(value.type) || [])]) {
        try {
          const returned = listener(value);
          if (returned && typeof returned.then === 'function') {
            // Async jobs belong to an adapter, not the synchronous observer loop.
            Promise.resolve(returned).catch(() => {});
            throw new Error('Fact listeners must be synchronous');
          }
        } catch (error) {
          errors.push(error?.message || String(error));
        }
      }
      return errors;
    },
    listenerCount() {
      return [...listeners.values()].reduce((sum, group) => sum + group.size, 0);
    },
  });
}

export { createEvents, immutableCopy };
