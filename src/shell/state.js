// 外壳自己的状态：手里拿着哪件工具、有没有弹着对话框、提示条写什么、天色是什么颜色。
// 这些不是游戏世界的一部分（不进存档），但世界画面和界面面板都要用，所以放在两边都够得着的地方。
import { TOOLS } from '../content/items.js';

export function createShellState() {
  let state = Object.freeze({
    tool: TOOLS[0].id, // 当前工具
    modal: null, // 弹着的东西：null，或 {kind: 'talk' | 'sleep' | 'basket' | 'sign' | 'notes', …}
    hint: null, // 面前这一格能做什么：{text, ok}
    toast: null, // 一句短提示：{text, id}
    tint: '#ffffff', // 天色（正片叠底盖在世界上）
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
      for (const fn of [...listeners]) fn(state);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    /** 有弹框时世界暂停：不走路、不过时间。 */
    paused: () => state.modal !== null,
    toast(text) {
      api.set({ toast: { text, id: ++toastId } });
    },
    /** 换到工具栏上的前一件或后一件。 */
    stepTool(by) {
      const index = TOOLS.findIndex(t => t.id === state.tool);
      api.set({ tool: TOOLS[(index + by + TOOLS.length) % TOOLS.length].id });
    },
  };
  return Object.freeze(api);
}
