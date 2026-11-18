// World slices. 0.5 had one 1,800-character validate() that every new feature had to edit.
// Now each plugin registers the slice it owns: initial value + validator. The registry builds
// a new world and validates a saved one, and reports which slice failed and why.

function createSchema() {
  const slices = new Map();
  const api = {
    slice(key, { initial, validate }, owner = null) {
      if (slices.has(key)) throw new Error(`Slice already registered: ${key}`);
      if (typeof initial !== 'function' || typeof validate !== 'function')
        throw new TypeError(`Slice ${key} needs initial() and validate()`);
      if (owner && !owner.writes.includes(key))
        throw new Error(
          `${owner.id} registers slice ${key} but does not declare writes:['${key}']`,
        );
      slices.set(key, { initial, validate, owner: owner?.id || 'host' });
      return () => slices.delete(key);
    },
    keys: () => [...slices.keys()],
    owners: () => Object.fromEntries([...slices].map(([k, v]) => [k, v.owner])),
    // Slices are created in registration order; later initial() calls may read earlier slices.
    initial(env) {
      const world = {};
      for (const [key, def] of slices) world[key] = def.initial(env, world);
      return world;
    },
    problems(world) {
      if (!world || typeof world !== 'object') return ['world is missing'];
      const out = [];
      for (const key of Object.keys(world))
        if (!slices.has(key)) out.push(`unknown slice "${key}"`);
      for (const [key, def] of slices) {
        if (!(key in world)) {
          out.push(`missing slice "${key}"`);
          continue;
        }
        let verdict;
        try {
          verdict = def.validate(world[key], world);
        } catch (error) {
          verdict = error.message;
        }
        if (verdict !== true) out.push(`${key}: ${verdict === false ? 'invalid' : verdict}`);
      }
      return out;
    },
    scope(meta, track) {
      return Object.freeze({
        slice: (key, def) => track(api.slice(key, def, meta)),
        keys: api.keys,
        initial: api.initial,
      });
    },
  };
  return Object.freeze(api);
}

// Small validator helpers shared by slice definitions.
const is = {
  int: (x, min = 0, max = 1e6) => Number.isInteger(x) && x >= min && x <= max,
  obj: x => !!x && typeof x === 'object' && !Array.isArray(x),
  str: (x, max = 400) => typeof x === 'string' && x.length <= max,
  arr: (x, max = 200) => Array.isArray(x) && x.length <= max,
  oneOf: (x, list) => list.includes(x),
  // 每人一份、每户一份、每张地图一份的数据：得是普通对象，键和名单一一对应，不多不少。
  // 只查“里面的每一项都对”不够：空对象、空数组、true 都能让“每一项”空空地成立，
  // 读进来以后一问主角那一份就出错。
  keyedBy: (x, keys) => {
    if (!is.obj(x)) return false;
    const want = new Set(keys);
    const have = Object.keys(x);
    return have.length === want.size && have.every(k => want.has(k));
  },
};
// check([[cond, 'reason'], ...]) → true or the first failing reason
const check = rules => {
  for (const [ok, why] of rules) if (!ok) return why;
  return true;
};

export { createSchema, is, check };
