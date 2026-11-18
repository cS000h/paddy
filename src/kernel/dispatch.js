import { immutableCopy } from './events.js';
import { Refusal, refuse } from './refusal.js';

// Command → draft → reactions (+ settle) → validate → commit → publish facts → onCommit once.
// Changes from 0.5:
//  * validate returns a list of problems (with slice names), not a bare boolean;
//  * initial state is verified after plugins install (slices are registered by plugins);
//  * onCommit fires exactly once per successful command, so the UI renders and saves once
//    (0.5 re-rendered and re-saved for every published fact, plus once more in the UI).
// New in 稻: refuse(reason) (see refusal.js). A rule that cannot go ahead throws a Refusal; the
// command is rejected with that reason, and it is not reported to onError. Any other exception
// is a fault in the program: the command is rejected too, with fault: true, and onError hears it.

function createDispatcher({
  initialState,
  problems,
  events,
  reactions,
  guard = null,
  onCommit = null,
  onError = null,
}) {
  let state = immutableCopy(initialState);
  const handlers = new Map();
  let busy = false;
  let started = false;
  const snapshot = () => state; // already deeply frozen; callers cannot mutate it
  const register = (type, handler, owner = null) => {
    if (handlers.has(type)) throw new Error(`Duplicate command: ${type}`);
    if (typeof handler !== 'function') throw new TypeError('Handler must be a function');
    const entry = { handler, owner };
    handlers.set(type, entry);
    return () => {
      if (handlers.get(type) === entry) handlers.delete(type);
    };
  };
  const commands = Object.freeze({
    register,
    list: () => [...handlers.keys()],
    scope(meta, track) {
      return Object.freeze({ register: (type, handler) => track(register(type, handler, meta)) });
    },
  });
  return Object.freeze({
    commands,
    snapshot,
    // Replace the state before the first command (used after plugins install, e.g. to migrate a save).
    adopt(next) {
      if (started) throw new Error('State can only be adopted before the first command');
      state = immutableCopy(next);
    },
    verify() {
      const found = problems(state);
      if (found.length) throw new Error('存档无法通过检查：' + found.slice(0, 4).join('；'));
    },
    dispatch(command) {
      if (busy) return { ok: false, reason: 'Nested commands are not supported' };
      if (!command || typeof command.type !== 'string')
        return { ok: false, reason: 'Invalid command' };
      if (command.revision !== state.revision) return { ok: false, reason: 'Stale command' };
      const entry = handlers.get(command.type);
      if (!entry) return { ok: false, reason: 'Unknown command' };
      busy = true;
      started = true;
      try {
        const input = immutableCopy(command);
        const draft = JSON.parse(JSON.stringify(state));
        const pendingFacts = [];
        let transactionOpen = true;
        let result;
        const run = () =>
          entry.handler(
            Object.freeze({
              draft,
              input,
              fact(type, data = {}) {
                if (!transactionOpen) throw new Error('Transaction is closed');
                pendingFacts.push({
                  type,
                  data: JSON.parse(JSON.stringify(data)),
                  by: entry.owner?.id,
                });
              },
            }),
          );
        try {
          result = guard ? guard.run(entry.owner, draft, run) : run();
        } finally {
          transactionOpen = false;
        }
        if (result && typeof result.then === 'function') {
          Promise.resolve(result).catch(() => {});
          throw new Error('Commands must be synchronous');
        }
        if (result?.ok === false) return { ok: false, reason: result.reason || 'Rejected' };
        const trace = reactions ? reactions.resolve(draft, pendingFacts) : [];
        draft.revision = state.revision + 1;
        const found = problems(draft);
        if (found.length) throw new Error('State invariant failed: ' + found.join('; '));
        const facts = pendingFacts.map((fact, index) => ({
          ...fact,
          id: `${draft.revision}:${index}`,
          revision: draft.revision,
        }));
        const committed = immutableCopy(draft);
        const publishedFacts = immutableCopy(facts);
        state = committed;
        const observerErrors = [];
        for (const fact of publishedFacts) {
          try {
            observerErrors.push(...events.publish(fact));
          } catch (error) {
            observerErrors.push(error?.message || String(error));
          }
        }
        const outcome = { ok: true, state, facts: publishedFacts, trace, observerErrors };
        if (onCommit) {
          try {
            onCommit(outcome);
          } catch (error) {
            observerErrors.push(error?.message || String(error));
          }
        }
        return outcome;
      } catch (error) {
        const reason = error?.message || String(error);
        if (error instanceof Refusal) return { ok: false, reason };
        if (onError) onError(error, command);
        return { ok: false, reason, fault: true };
      } finally {
        busy = false;
      }
    },
  });
}

export { createDispatcher, Refusal, refuse };
