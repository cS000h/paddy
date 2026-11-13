// 端口：画面和规则之间唯一的门。外壳（world、panels、app）只能用这里给出的四样东西：
//   dispatch(type, input)   发命令，改变世界
//   ask(name, ...args)      问问题，不改变世界
//   onCommit / on           得知已经发生的事
//   save()                  拿到存档
// 外壳不许直接读世界的数据结构，也不许绕过这里去碰规则插件（tests 里有检查）。
import { createSim } from '../sim/index.js';
import { loadSave, makeSave } from './save.js';

/**
 * @typedef {{ok: true, facts: ReadonlyArray<{type: string, data: any}>} | {ok: false, reason: string}} Outcome
 */

/**
 * @param {object} [options]
 * @param {number} [options.seed]   新开一局的随机种子
 * @param {object|null} [options.saved] save() 给出的存档；有它就读档
 * @param {boolean} [options.debug] 打开写入检查
 * @param {(error: unknown, command: object) => void} [options.onError] 命令出错时调用（调试用）
 */
export function createGame({ seed = 1, saved = null, debug = false, onError = null } = {}) {
  const commitListeners = new Set();
  const sim = createSim({
    seed,
    debug,
    onError,
    state: saved ? loadSave(saved) : null,
    onCommit: outcome => {
      for (const listener of [...commitListeners]) listener(outcome.facts);
    },
  });
  const snapshot = () => sim.dispatcher.snapshot();

  return Object.freeze({
    /**
     * 发一条命令。成功返回这条命令引起的全部事实；被拒绝返回原因（世界不变）。
     * @param {string} type
     * @param {object} [input]
     * @returns {Outcome}
     */
    dispatch(type, input = {}) {
      const out = sim.dispatcher.dispatch({ ...input, type, revision: snapshot().revision });
      return out.ok ? { ok: true, facts: out.facts } : { ok: false, reason: out.reason };
    },
    /** 问一个只读的问题，例如 ask('farm.plots', 'yard')。有哪些问题见 queries()。 */
    ask(name, ...args) {
      return sim.queries.run(name, snapshot().world, ...args);
    },
    /** 每条命令成功后调用一次，参数是这次的全部事实。返回取消订阅的函数。 */
    onCommit(listener) {
      commitListeners.add(listener);
      return () => commitListeners.delete(listener);
    },
    /** 只听某一种事实。返回取消订阅的函数。 */
    on(type, listener) {
      return sim.events.on(type, listener);
    },
    save: () => makeSave(snapshot()),
    revision: () => snapshot().revision,
    commands: () => sim.dispatcher.commands.list().sort(),
    queries: () => sim.queries.list(),
    stop: () => sim.host.stop(),
  });
}
