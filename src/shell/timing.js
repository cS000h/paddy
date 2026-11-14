// 外壳里的时机刻度；键盘与手指都只发同一个“收手”意图。
export const timingValue = elapsed => {
  const p = (Math.max(0, elapsed) % 3000) / 1500;
  return Math.round((p <= 1 ? p : 2 - p) * 100);
};
