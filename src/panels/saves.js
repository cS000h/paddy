export function savesView(m, game, esc) {
  return `<h2>进度与玩法<small>第 ${game.ask('clock').day} 日</small></h2>
    ${m.problem ? `<p class="activity-story">${esc(m.problem)}</p>` : '<p>进度会自动保存在这个浏览器里。换浏览器、换设备或换文件前，先导出一份。</p>'}
    ${m.message ? `<p>${esc(m.message)}</p>` : ''}
    <div class="row"><button class="main" data-do="exportSave">导出进度</button><button data-do="importSave">导入进度</button>
    ${m.problem ? '<button data-do="exportOriginal">导出浏览器原档</button>' : ''}
    ${m.backup ? '<button data-do="exportBackup">导出导入前备份</button>' : ''}</div>
    <h3>今天去哪里</h3><p>点地面走路，点物件走近做事；也能用左下摇杆和右下“做”。进自家门是小屋，点床过夜。灶台做饭，橱柜收拾行囊。</p>
    <p>院西通杂货铺，院东通茶摊，北边沿溪上后山。路口木牌可通往下一处。出门前腾出行囊，带点吃的和竹筒水壶；茶摊能喝茶、听闲话，渡口能钓鱼。</p>
    <p class="aside">手机请横过来玩。下载的 HTML 要交给能运行网页脚本的浏览器打开；聊天软件和文件预览可能只显示静态页面。</p>
    <div class="row"><button data-do="close">回去</button></div>`;
}
