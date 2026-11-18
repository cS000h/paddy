// 把一份好存档随机弄坏一处（删掉一个字段、换成别的类型、填一个不存在的名字……）。
// 读这样的存档只许有两种结果：明确地拒绝（读档那一步抛出说得清的错），或者读进来以后照常能玩。
// 读进来却一问就出错的，说明某块数据的校验有漏洞。L3 的存档测试和 tools/chaos.mjs 都用它。
import { rng } from './chaos.js';

/** 读档时“说得清”的拒绝。 */
export const CLEAN_REFUSAL = /存档无法通过检查|这不是《稻》的存档|认不出来/;

/** JSON 里每一个位置（对象的键、数组的下标）。 */
function paths(value, prefix = [], out = []) {
  if (value && typeof value === 'object')
    for (const key of Object.keys(value)) {
      out.push([...prefix, key]);
      paths(value[key], [...prefix, key], out);
    }
  return out;
}

const MUTATIONS = {
  remove: (parent, key) => {
    if (Array.isArray(parent)) parent.splice(Number(key), 1);
    else delete parent[key];
  },
  null: (parent, key) => (parent[key] = null),
  text: (parent, key) => (parent[key] = 'x'),
  negative: (parent, key) => (parent[key] = -1),
  huge: (parent, key) => (parent[key] = 1e12),
  fraction: (parent, key) => (parent[key] = 2.5),
  array: (parent, key) => (parent[key] = []),
  object: (parent, key) => (parent[key] = {}),
  bool: (parent, key) => (parent[key] = true),
  unknownName: (parent, key) => (parent[key] = 'no.such.thing'),
  prototypeName: (parent, key) => (parent[key] = 'constructor'),
  // 对象里多出一个认不得的键（值抄一个兄弟的），数组里多出一份重复的
  extraKey: (parent, key) => {
    if (Array.isArray(parent)) parent.push(JSON.parse(JSON.stringify(parent[key])));
    else parent[pickKey(parent)] = JSON.parse(JSON.stringify(parent[key]));
  },
};
let pickKey = () => 'no.such.key';

/**
 * 弄坏 count 份存档。返回 [{how, path, saved}]。
 * @param {object} save 一份好存档（不会被改动）
 */
export function damagedSaves(save, count, seed = 1) {
  const r = rng(seed);
  const pick = list => list[Math.floor(r() * list.length)];
  pickKey = () => pick(['no.such.key', 'constructor', '__proto__', 'toString', '9999']);
  const all = paths(save);
  const out = [];
  for (let i = 0; i < count; i++) {
    const copy = JSON.parse(JSON.stringify(save));
    const path = pick(all);
    const how = pick(Object.keys(MUTATIONS));
    let parent = copy;
    for (const key of path.slice(0, -1)) parent = parent[key];
    MUTATIONS[how](parent, path.at(-1));
    // JSON 往返一次：存档总是从文字读回来的（__proto__ 这样的键也照 JSON.parse 的样子出现）
    out.push({ how, path: path.join('.'), saved: JSON.parse(JSON.stringify(copy)) });
  }
  return out;
}
