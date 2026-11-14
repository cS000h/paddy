// 输入意图：键盘、鼠标、触屏、手柄各说各的话，到这里统一翻译成几种“意图”。
// 世界只认意图，不认设备，所以加一种新设备只要加一个适配器，世界一行都不用改。
//
// 持续的意图：move —— 一个方向向量，x、y 都在 -1 到 1 之间。
// 一次性的意图：
//   act           对面前的东西做当前该做的事（说话、开门、用工具）
//   tap {x, y}    点了世界里的某个位置（世界坐标，单位是像素）：走过去，能做事就做
//   tool {id}     换工具
//   tool.step {by} 往前或往后换一个工具（滚轮、手柄肩键）
//   cancel        取消、关闭

export const INTENTS = Object.freeze(['act', 'tap', 'tool', 'tool.step', 'cancel']);

export function createIntents() {
  const sources = new Map(); // 每个设备各报一个方向，合起来取最强的
  const listeners = new Map();

  return Object.freeze({
    /** 某个设备报告它现在想往哪走。source 是设备的名字，例如 'keys'、'stick'。 */
    setMove(source, x, y) {
      if (!x && !y) sources.delete(source);
      else sources.set(source, { x, y });
    },
    /** 合成后的方向向量，长度不超过 1。 */
    move() {
      let best = { x: 0, y: 0 };
      let strength = 0;
      for (const v of sources.values()) {
        const s = Math.hypot(v.x, v.y);
        if (s > strength) {
          strength = s;
          best = v;
        }
      }
      if (strength <= 1) return { x: best.x, y: best.y };
      return { x: best.x / strength, y: best.y / strength };
    },
    /** 发出一次性的意图。 */
    emit(type, data = {}) {
      if (!INTENTS.includes(type)) throw new Error('不认识的意图：' + type);
      for (const fn of [...(listeners.get(type) || [])]) fn(data);
    },
    /** 订阅一种意图，返回取消订阅的函数。 */
    on(type, fn) {
      if (!INTENTS.includes(type)) throw new Error('不认识的意图：' + type);
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
      return () => listeners.get(type).delete(fn);
    },
    /** 松开所有方向（窗口失焦、弹出对话框时调用）。 */
    release() {
      sources.clear();
    },
  });
}
