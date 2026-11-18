// 浏览器可能禁用本地存储。坏档与不可用都要明说，不能假装读到了空档。
export const KEY = 'dao.save.v1';
const BACKUP = 'dao.save.before-restore';
// 清早的备份：每天醒来时另存一份，留“今天清早”和“前一天清早”两份。
// 规则里万一有逻辑错，存档本身合法、内容却不对，玩家还能退回去。
const DAWNS = ['dao.save.dawn', 'dao.save.dawn.before'];

export function createStorage(access = () => localStorage) {
  let problem = '';
  const read = key => {
    try {
      return access().getItem(key);
    } catch {
      return null;
    }
  };
  return {
    load() {
      let text;
      try {
        text = access().getItem(KEY);
      } catch {
        problem = '浏览器没有开放本地存档，请用“导出进度”留一份备份。';
        return null;
      }
      try {
        if (text === null) return null;
        const saved = JSON.parse(text);
        if (!saved || typeof saved !== 'object' || Array.isArray(saved))
          throw new Error('不是存档对象');
        return saved;
      } catch {
        throw new Error('原来的存档读不了，已停止自动覆盖；可以先导出原档。');
      }
    },
    status: () => problem,
    raw: (backup = false) => read(backup ? BACKUP : KEY),
    save(data, keepPrevious = false) {
      try {
        const store = access();
        const text = JSON.stringify(data);
        const old = store.getItem(KEY);
        if (keepPrevious && old) store.setItem(BACKUP, old);
        store.setItem(KEY, text);
        problem = '';
        return true;
      } catch {
        problem = '自动存档没有写入成功，请用“导出进度”保存到文件。';
        return false;
      }
    },
    /** 记下今天清早的进度；原来的“今天清早”挪成“前一天清早”。写不进去就算了（主存档要紧）。 */
    saveDawn(data) {
      try {
        const store = access();
        const text = JSON.stringify(data);
        const last = store.getItem(DAWNS[0]);
        if (last === text) return true;
        if (last) store.setItem(DAWNS[1], last);
        store.setItem(DAWNS[0], text);
        return true;
      } catch {
        return false;
      }
    },
    /** 清早的备份，新的在前：[文字, …]。没有的不列。 */
    dawns: () => DAWNS.map(read).filter(Boolean),
    clear() {
      try {
        access().removeItem(KEY);
      } catch {
        /* 不可用的存储交给文件备份。 */
      }
    },
  };
}
