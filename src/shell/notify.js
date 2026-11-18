// 通知一群听众：一个出错，别的照常听到。外壳状态和输入意图都这么通知。
// 错交给 onError；没给 onError（测试）时，全部通知完再把错抛出来，不悄悄吞掉。

/**
 * @param {Iterable<Function>} listeners
 * @param {any[]} args
 * @param {((error: unknown, where: string) => void) | null} onError
 * @param {string} where
 */
export function notifyAll(listeners, args, onError, where) {
  const failed = [];
  for (const fn of [...listeners]) {
    try {
      fn(...args);
    } catch (error) {
      if (onError) {
        try {
          onError(error, where);
        } catch {
          /* 报错的人自己出错，不能再连累别的听众 */
        }
      } else failed.push(error);
    }
  }
  if (failed.length) throw failed.length === 1 ? failed[0] : new AggregateError(failed, where);
}
