// 游戏没能起来时（启动时画面或面板就出错）给玩家看的一页：说清楚浏览器里的进度没被动过，
// 给两条路——再试一次，或者先把进度导出来。只用最基本的 DOM，不依赖任何会出错的东西。
const esc = text =>
  String(text).replace(
    /[&<>"]/g,
    ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch],
  );

/**
 * @param {HTMLElement} root
 * @param {object} deps
 * @param {unknown} deps.error
 * @param {string|null} deps.rawSave 浏览器里原样的存档文字
 * @param {(name: string, text: string) => void} deps.download
 */
export function showFallback(root, { error, rawSave, download }) {
  const message = String(error?.message || error || '');
  root.innerHTML = `<div class="modal"><div class="sheet">
    <h2>游戏没能打开</h2>
    <p>启动的时候程序出了岔子。浏览器里的进度没有被改动。</p>
    <p class="aside">${esc(message.slice(0, 200))}</p>
    <div class="row">
      ${rawSave ? '<button data-act="export">导出浏览器里的进度</button>' : ''}
      <button data-act="reload" class="main">再试一次</button>
    </div></div></div>`;
  root.addEventListener('click', event => {
    const act = event.target.closest?.('button')?.dataset.act;
    if (act === 'reload') location.reload();
    if (act === 'export' && rawSave) download('稻-原始进度.json', rawSave);
  });
}
