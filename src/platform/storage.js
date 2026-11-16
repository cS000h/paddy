// 浏览器可能禁用本地存储。坏档与不可用都要明说，不能假装读到了空档。
const KEY = 'dao.save.v1';
const BACKUP = 'dao.save.before-restore';
export function createStorage(access = () => localStorage) {
  let problem = '';
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
    raw(backup = false) {
      try {
        return access().getItem(backup ? BACKUP : KEY);
      } catch {
        return null;
      }
    },
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
    clear() {
      try {
        access().removeItem(KEY);
      } catch {
        /* 不可用的存储交给文件备份。 */
      }
    },
  };
}
