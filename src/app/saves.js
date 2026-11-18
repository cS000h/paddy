// 进度：导出、导入（先读一遍确认是能玩的存档再替换）、退回某天清早、坏档时取回原档、重新开始，
// 以及把这次打开以来的出错记录导出来。
import { createGame } from '../port/game.js';

/** 存档文字里写的是第几日；读不出来是 0。 */
function dayOf(text) {
  try {
    return JSON.parse(text).state.world.clock.day || 0;
  } catch {
    return 0;
  }
}

export function saveActions({ game, shell, platform, here, stopSaving, loadProblem, problems }) {
  let pending = null;
  const status = () => loadProblem || platform.storage.status();
  const show = message =>
    shell.set({
      modal: {
        kind: 'saves',
        message,
        problem: status(),
        backup: !!platform.storage.raw(true),
        dawns: platform.storage
          .dawns()
          .map((text, index) => ({ index, day: dayOf(text) }))
          .filter(d => d.day),
        faults: problems.list().reduce((n, e) => n + e.count, 0),
      },
    });
  /** 先把要换上的存档读一遍（读不了就抛错，由调用的地方说清楚），再请玩家确认。 */
  function offer(saved, title, label, text) {
    pending = null;
    const preview = createGame({ saved, debug: true });
    pending = preview.save();
    const day = preview.ask('clock').day;
    preview.stop();
    shell.set({
      modal: { kind: 'confirm', title, text: text(day), yes: 'importConfirmed', label },
    });
  }
  return {
    saves() {
      show('');
    },
    reset() {
      shell.set({
        modal: {
          kind: 'confirm',
          title: '重新开始',
          text: '要从春天的第一日重新来过吗？现在的进度会被清掉。',
          yes: 'resetNow',
          label: '重新开始',
        },
      });
    },
    resetNow() {
      stopSaving();
      platform.storage.clear();
      location.reload();
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
    exportProblems() {
      const report = {
        game: '稻',
        day: game.ask('clock').day,
        at: new Date().toISOString(),
        browser: navigator.userAgent,
        problems: problems.list(),
      };
      platform.files.download('稻-出错记录.json', JSON.stringify(report, null, 2));
      show('出错记录已交给浏览器下载，可以把这个文件发给做游戏的人。');
    },
    async importSave() {
      pending = null;
      try {
        const text = await platform.files.choose();
        if (text === null) return;
        const saved = JSON.parse(text.replace(/^﻿/, ''));
        if (!saved || typeof saved !== 'object') throw new Error('不是存档');
        offer(
          saved,
          '接着这份进度玩',
          '导入并继续',
          day => `这是第 ${day} 日的进度。确认后会替换当前游戏；当前浏览器的原档会另留一份备份。`,
        );
      } catch {
        show('这份文件不是能读取的《稻》存档。当前进度没有改变。');
      }
    },
    restoreDawn({ index }) {
      const text = platform.storage.dawns()[Number(index)];
      try {
        offer(
          JSON.parse(text),
          '退回清早',
          '退回这天清早',
          day =>
            `退回到第 ${day} 日清早刚醒来的时候。之后做的事都不算了；现在的进度会另留一份备份。`,
        );
      } catch {
        show('这份清早的进度读不了，当前进度没有改变。');
      }
    },
    importConfirmed() {
      if (!pending) return;
      if (!platform.storage.save(pending, true))
        return show('浏览器不能写入存档，这次没有换。请换一个允许本地存储的浏览器。');
      stopSaving();
      location.reload();
    },
  };
}
