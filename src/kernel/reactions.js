// In-transaction rule events.
//   on(type, fn, {priority})  fn(draft, event, emit)     lower priority runs first; ties keep install order
//   onSettle(fn, {priority})  fn(draft, emit)            runs once the queue is empty ("everything has happened"),
//                                                        e.g. body sense re-evaluates, the dawn digest is flushed.
//                                                        If a settle hook emits, the queue runs again (max 4 rounds).
// Any exception aborts the whole command; the dispatcher discards the draft.
const MAX_EVENTS = 96;
const clone = x => JSON.parse(JSON.stringify(x === undefined ? {} : x));

function createReactions({ guard = null } = {}) {
  const listeners = new Map();
  const settlers = [];
  let counter = 0;
  const insert = (list, entry) => {
    list.push(entry);
    list.sort((a, b) => a.priority - b.priority || a.order - b.order);
    return () => {
      const i = list.indexOf(entry);
      if (i >= 0) list.splice(i, 1);
    };
  };
  const call = (entry, draft, args) =>
    guard
      ? guard.run(entry.owner, draft, () => entry.fn(draft, ...args))
      : entry.fn(draft, ...args);

  const api = {
    on(type, fn, { priority = 50, owner = null } = {}) {
      if (typeof fn !== 'function') throw new TypeError('Reaction must be a function');
      if (!listeners.has(type)) listeners.set(type, []);
      return insert(listeners.get(type), { fn, priority, owner, order: counter++ });
    },
    onSettle(fn, { priority = 50, owner = null } = {}) {
      return insert(settlers, { fn, priority, owner, order: counter++ });
    },
    // facts: array that already holds the command's own facts; reactions append to it.
    resolve(draft, facts, trace = []) {
      let index = 0;
      for (let round = 0; ; round++) {
        for (; index < facts.length; index++) {
          if (index >= MAX_EVENTS) throw new Error('Event chain exceeded limit');
          const event = clone(facts[index]);
          for (const entry of [...(listeners.get(event.type) || [])]) {
            trace.push(`${event.type} → ${entry.owner?.id || '?'}`);
            const emit = (type, data) =>
              facts.push({ type, data: clone(data), by: entry.owner?.id });
            call(entry, draft, [event, emit]);
          }
        }
        const before = facts.length;
        for (const entry of [...settlers]) {
          const emit = (type, data) => facts.push({ type, data: clone(data), by: entry.owner?.id });
          call(entry, draft, [emit]);
        }
        if (facts.length === before) break;
        if (round >= 4) throw new Error('Settle phase did not converge');
      }
      return trace;
    },
    scope(meta, track) {
      return Object.freeze({
        on: (type, fn, options = {}) => track(api.on(type, fn, { ...options, owner: meta })),
        onSettle: (fn, options = {}) => track(api.onSettle(fn, { ...options, owner: meta })),
        // For registries (e.g. actions): register a reaction on behalf of the plugin that defined
        // the entry, so the write guard checks that plugin's declared slices.
        delegate: other =>
          Object.freeze({
            on: (type, fn, options = {}) => track(api.on(type, fn, { ...options, owner: other })),
          }),
      });
    },
  };
  return Object.freeze(api);
}

export { createReactions };
