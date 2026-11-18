// 端口：画面和规则之间唯一的门。外壳（world、panels、app）只能用这里给出的四样东西：
//   dispatch(type, input)   发命令，改变世界
//   ask(name, ...args)      问问题，不改变世界
//   onCommit / on           得知已经发生的事
//   save()                  拿到存档
// 外壳不许直接读世界的数据结构，也不许绕过这里去碰规则插件（tests 里有检查）。
//
// 门口的三件事，让外壳里的一处毛病不至于拖垮整局：
//   1. 命令的输入先查一遍是不是干净的数据（见 wellFormed），不干净就拒绝，规则里不必处处设防；
//   2. 规则自己出了错（不是“做不了”，而是程序出错），命令照样被拒绝、世界不变，
//      玩家看到的是一句人话，出错的细节交给 onError，也写在结果的 detail 里；
//   3. 每个听众各自隔开：一个听众抛错，别的照常听到，错交给 onError。
//      没给 onError（测试、工具）时，听众的错在这条命令做完后原样抛给调用者，不会悄悄吞掉。
import { createSim } from '../sim/index.js';
import { loadSave, makeSave } from './save.js';

/**
 * @typedef {{ok: true, facts: ReadonlyArray<{type: string, data: any}>}
 *   | {ok: false, reason: string, fault?: true, detail?: string}} Outcome
 * fault 为 true 表示规则出了错：reason 是给玩家看的一句话，detail 是程序的出错信息。
 */

/** 规则出错时给玩家看的话。 */
export const FAULT_REASON = '这一步没做成：程序出了点岔子，进度没有受影响。';
/** 输入不干净时给玩家看的话。 */
export const MALFORMED_REASON = '这条命令里有认不出的内容。';

// 原型链上的名字（constructor、__proto__、toString……）拿去查数据表，会查到 JavaScript 自带的东西。
const RESERVED = new Set(Object.getOwnPropertyNames(Object.prototype));

/** 命令的输入只能是 JSON 那样的数据：普通对象、数组、字符串、数和真假，不带原型链上的名字。 */
export function wellFormed(value, depth = 0) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'number' || typeof value === 'boolean') return true;
  if (typeof value === 'string') return !RESERVED.has(value);
  if (depth >= 6 || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.length <= 64 && value.every(v => wellFormed(v, depth + 1));
  if (Object.getPrototypeOf(value) !== Object.prototype) return false;
  return Object.entries(value).every(([k, v]) => !RESERVED.has(k) && wellFormed(v, depth + 1));
}

/**
 * @param {object} [options]
 * @param {number} [options.seed]   新开一局的随机种子
 * @param {object|null} [options.saved] save() 给出的存档；有它就读档
 * @param {boolean} [options.debug] 打开写入检查
 * @param {(error: unknown, info: {command?: object, listener?: string}) => void} [options.onError]
 *   规则出错、或者某个听众抛错时调用。
 */
export function createGame({ seed = 1, saved = null, debug = false, onError = null } = {}) {
  const tell = (error, info) => {
    try {
      onError(error, info);
    } catch {
      /* 报错的人自己出错，不能再连累命令 */
    }
  };
  const unheard = []; // 没有 onError 时，听众的错先攒着，命令做完再抛
  const listenerFailed = (error, listener) =>
    onError ? tell(error, { listener }) : unheard.push(error);
  const commitListeners = new Set();
  const sim = createSim({
    seed,
    debug,
    onError: (error, command) => onError && tell(error, { command }),
    state: saved ? loadSave(saved) : null,
    onCommit: outcome => {
      for (const listener of [...commitListeners]) {
        try {
          listener(outcome.facts);
        } catch (error) {
          listenerFailed(error, 'commit');
        }
      }
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
      if (!wellFormed(input)) return { ok: false, reason: MALFORMED_REASON };
      const out = sim.dispatcher.dispatch({ ...input, type, revision: snapshot().revision });
      /** @type {Outcome} */
      let answer;
      if (out.ok) {
        for (const message of out.observerErrors || []) listenerFailed(new Error(message), 'rules');
        answer = { ok: true, facts: out.facts };
      } else if (out.fault)
        answer = { ok: false, reason: FAULT_REASON, fault: true, detail: out.reason };
      else answer = { ok: false, reason: out.reason };
      if (unheard.length) {
        const errors = unheard.splice(0);
        throw errors.length === 1 ? errors[0] : new AggregateError(errors, '有听众出错');
      }
      return answer;
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
      return sim.events.on(type, fact => {
        try {
          listener(fact);
        } catch (error) {
          listenerFailed(error, type);
        }
      });
    },
    save: () => makeSave(snapshot()),
    revision: () => snapshot().revision,
    commands: () => sim.dispatcher.commands.list().sort(),
    queries: () => sim.queries.list(),
    stop: () => sim.host.stop(),
  });
}
