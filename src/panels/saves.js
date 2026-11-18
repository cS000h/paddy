// 进度与玩法：导出、导入、坏档时取回原档，加上几句怎么玩。
import { button, actions, close, title, para } from './html.js';

const HOW_TO = [
  '点地面走路，点物件走近做事；也能用左下摇杆和右下“做”。进自家门是小屋，点床过夜。灶台做饭，橱柜收拾行囊。',
  '院西通杂货铺，院东通茶摊，北边沿溪上后山。路口木牌可通往下一处。出门前腾出行囊，带点吃的和竹筒水壶；茶摊能喝茶、听闲话，渡口能钓鱼。',
];

export function savesView(m, game) {
  const intro = m.problem
    ? para(m.problem, 'activity-story')
    : para('进度会自动保存在这个浏览器里。换浏览器、换设备或换文件前，先导出一份。');
  const files = actions(
    button('exportSave', '导出进度', { main: true }),
    button('importSave', '导入进度'),
    m.problem ? button('exportOriginal', '导出浏览器原档') : '',
    m.backup ? button('exportBackup', '导出导入前备份') : '',
  );
  return `${title('进度与玩法', `第 ${game.ask('clock').day} 日`)}
    ${intro}${para(m.message)}${files}
    <h3>今天去哪里</h3>${HOW_TO.map(text => para(text)).join('')}
    ${para('手机请横过来玩。下载的 HTML 要交给能运行网页脚本的浏览器打开；聊天软件和文件预览可能只显示静态页面。', 'aside')}
    ${actions(close('回去', false))}`;
}
