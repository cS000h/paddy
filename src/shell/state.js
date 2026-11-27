// 外壳自己的状态：手里拿着哪件工具、行囊里哪一格、有没有弹着对话框、提示条写什么、天色是什么颜色。
// 这些不是游戏世界的一部分（不进存档），但世界画面和界面面板都要用，所以放在两边都够得着的地方。
import { TOOLS } from '../content/items.js';
import { notifyAll } from './notify.js';

/**
 * @param {object} [options]
 * @param {(error: unknown, where: string) => void} [options.onError]
 *   某个订阅者出错时调用；别的订阅者照常收到。没给就在通知完之后抛出来。
 */
export function createShellState({ onError = null } = {}) {
  let state = Object.freeze({
    seed: 'seed.qingcai',
    tool: TOOLS[0].id, // 当前工具
    manualTool: false,
    held: null, // 拿在手里的是行囊里哪一格（pack 查询里 slots 的 key），null 是空着手
    modal: null, // 弹着的东西：null，或 {kind: 'talk' | 'sleep' | 'sign' | 'notes', …}
    hint: null, // 面前这一格能做什么：{text, ok}
    toast: null, // 一句短提示：{text, id, keep}；keep 是要紧的话，说着时别的话排队
    veil: 0, // 0–1，过夜时盖住世界的那层纸
  });
  const listeners = new Set();
  let toastId = 0;

  const api = {
    get: () => state,
    /** 改一部分状态；没有变化就不通知。 */
    set(patch) {
      const next = { ...state, ...patch };
      if (Object.keys(next).every(k => next[k] === state[k])) return;
      state = Object.freeze(next);
      notifyAll(listeners, [state], onError, 'shell');
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    /** 有弹框时世界暂停：不走路、不过时间。 */
    paused: () => state.modal !== null,
    /** 冒一句话；keep 为真是要紧的（头一回找到、升了本事、头一回出极品），不被下一句盖掉。 */
    toast(text, keep = false) {
      api.set({ toast: { text, id: ++toastId, keep: !!keep } });
    },
    /** 换到工具栏上的前一件或后一件。 */
    stepTool(by) {
      const index = TOOLS.findIndex(t => t.id === state.tool);
      api.set({ tool: TOOLS[(index + by + TOOLS.length) % TOOLS.length].id, manualTool: true });
    },
  };
  return Object.freeze(api);
}
