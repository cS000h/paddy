import { createGame } from '../port/game.js';
export function saveActions({ game, shell, platform, here, stopSaving, loadProblem }) {
  let pending = null;
  const status = () => loadProblem || platform.storage.status();
  const show = message =>
    shell.set({
      modal: { kind: 'saves', message, problem: status(), backup: !!platform.storage.raw(true) },
    });
  return {
    saves() {
      show('');
    },
    exportSave() {
      if (here()) game.dispatch('person.place', here());
      platform.files.download(
        `稻-第${game.ask('clock').day}日-进度.json`,
        JSON.stringify(game.save()),
      );
      show('已交给浏览器下载，请到下载列表或文件里确认保存。');
    },
    exportOriginal() {
      const text = platform.storage.raw();
      if (text) platform.files.download('稻-原始进度.json', text);
    },
    exportBackup() {
      const text = platform.storage.raw(true);
      if (text) platform.files.download('稻-导入前的进度.json', text);
    },
    async importSave() {
      pending = null;
      try {
        const text = await platform.files.choose();
        if (text === null) return;
        const saved = JSON.parse(text.replace(/^\uFEFF/, ''));
        if (!saved || typeof saved !== 'object') throw new Error('不是存档');
        const preview = createGame({ saved, debug: true });
        pending = preview.save();
        const day = preview.ask('clock').day;
        preview.stop();
        shell.set({
          modal: {
            kind: 'confirm',
            title: '接着这份进度玩',
            text: `这是第 ${day} 日的进度。确认后会替换当前游戏；当前浏览器的原档会另留一份备份。`,
            yes: 'importConfirmed',
            label: '导入并继续',
          },
        });
      } catch {
        show('这份文件不是能读取的《稻》存档。当前进度没有改变。');
      }
    },
    importConfirmed() {
      if (!pending) return;
      if (!platform.storage.save(pending, true))
        return show('浏览器不能写入存档，这次没有导入。请换一个允许本地存储的浏览器。');
      stopSaving();
      location.reload();
    },
  };
}
