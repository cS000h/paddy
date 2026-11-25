// 存档的格式和升级。存档里写着版本号；读旧存档时，一级一级升到当前版本。
// 改了世界的数据结构，就要：SAVE_VERSION 加一，在 migrations.js 的 MIGRATIONS 里写上一级怎么升，
// 再往 tests/fixtures/ 里放一份旧版本的样本存档（见 TESTING.md 的 L3）。
import { SAVE_VERSION } from '../sim/index.js';
import { MIGRATIONS } from './migrations.js';

export const SAVE_FORMAT = 'dao.save';

/** 把一份存档变成当前版本的 {revision, world}。认不出来就抛错，不会悄悄开新档。 */
export function loadSave(saved) {
  if (!saved || typeof saved !== 'object' || saved.format !== SAVE_FORMAT)
    throw new Error('这不是《稻》的存档');
  let version = saved.version;
  if (!Number.isInteger(version) || version < 1 || version > SAVE_VERSION)
    throw new Error(`存档版本 ${version} 认不出来（当前是 ${SAVE_VERSION}）`);
  let state = JSON.parse(JSON.stringify(saved.state));
  for (; version < SAVE_VERSION; version++) state = MIGRATIONS[version](state);
  return state;
}

export function makeSave(state) {
  return { format: SAVE_FORMAT, version: SAVE_VERSION, state };
}
