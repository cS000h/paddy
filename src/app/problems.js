// 出了岔子交到这里。规则、画面、面板、计时、页面上漏网的错，都由这一处记：
//   - 打进控制台；同一处同一个错只打一回，后面只数次数，不刷屏；
//   - 留最近 20 条，导出“出错记录”时用；
//   - 一小段时间里错得太多（多半是画面一帧一帧地在出错），叫 onBurst 告诉玩家：进度已经存好，可以刷新。
// 单独一次出错不打扰玩家：命令出错时，端口已经给了一句人话，由 run() 提示。
const BURST = Object.freeze({ count: 12, ms: 8000 });
const KEEP = 20;

/**
 * @param {object} deps
 * @param {() => void} [deps.onBurst] 错得太密时调用一次；玩家看过之后调 calm() 才会再叫
 * @param {() => number} [deps.now] 毫秒钟（测试里换成假的）
 * @param {(...args: any[]) => void} [deps.log] 打到哪儿（默认控制台）
 */
export function createProblems({
  onBurst = () => {},
  now = () => performance.now(),
  log = (...args) => console.error(...args),
} = {}) {
  const recent = [];
  const byKey = new Map();
  let times = [];
  let loud = false;
  let busy = false;

  return Object.freeze({
    /** 记一个错。where 是出错的地方：'rules:cook'、'world'、'panels'、'time'、'page'…… */
    report(error, where = '?') {
      if (busy) return; // 报错的过程中又出错（比如提示的小窗也画不出来），不再绕圈
      busy = true;
      try {
        const message = String(error?.message || error);
        const key = where + '|' + message;
        const known = byKey.get(key);
        if (known) known.count++;
        else {
          const stack = String(error?.stack || '')
            .split('\n')
            .slice(0, 6)
            .join('\n');
          const entry = { where, message, stack, count: 1, at: new Date().toISOString() };
          byKey.set(key, entry);
          recent.push(entry);
          if (recent.length > KEEP) {
            const old = recent.shift();
            byKey.delete(old.where + '|' + old.message);
          }
          log(`[稻·${where}]`, error);
        }
        const t = now();
        times = times.filter(x => t - x < BURST.ms);
        times.push(t);
        if (times.length >= BURST.count && !loud) {
          loud = true;
          onBurst();
        }
      } finally {
        busy = false;
      }
    },
    /** 最近记下的错（新的在后），每条带出错次数。 */
    list: () => recent.map(e => ({ ...e })),
    /** 玩家看过提示、选了接着玩：重新数，再错得太密才再提醒。 */
    calm() {
      loud = false;
      times = [];
    },
  });
}
