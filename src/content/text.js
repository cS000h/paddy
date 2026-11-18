// 拼给玩家看的字用的两个小工具。规则和画面都用它们，写法才一致。

/** 把 '{name}' 这样的占位换成 values 里的值。 */
export const fill = (template, values) =>
  template.replace(/\{(\w+)\}/g, (whole, key) => (key in values ? String(values[key]) : whole));

/** 带正负号的数：+3、−2（负号是减号“−”，和流水里的写法一样）。 */
export const signed = n => (n > 0 ? '+' + n : '−' + -n);
