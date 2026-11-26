// 冒出来的字：短提醒做成头顶紧凑的像素方角气泡（带小尾巴和左侧像素小卷感叹号），
// 长的旁白横在画面下方，数的变化从人身边飘起来。都不接手指，不挡操作。
import { uiIconUrl } from './icons.js';

const SHORT = 18; // 不超过这么多字，冒在头顶

/** 摆在头顶的位置不出画面：左右留出半个气泡的宽度（气泡放大后要按实际宽度算），上面留出一行。 */
function clampTo(root, at, margin = 64) {
  return {
    x: Math.max(margin, Math.min(root.clientWidth - margin, at.x)),
    y: Math.max(64, Math.min(root.clientHeight - 40, at.y)),
  };
}

/**
 * 头顶的气泡碰到左上那一块（日期、“下一步”）就让开：往右挪或往下挪，挑挪得少的那边（G-14 图 02、05）。
 * at 是气泡底边正中，w、h 是气泡的宽高；坐标都是 #ui 里的排版坐标，不经过屏幕换算。
 */
function dodge(root, at, w, h) {
  const box = root.querySelector(':scope > .left');
  if (!box || !box.offsetWidth) return at;
  const right = box.offsetLeft + box.offsetWidth + 6;
  const bottom = box.offsetTop + box.offsetHeight + 6;
  const top = at.y - h - 6; // 加上小尾巴
  if (at.x - w / 2 >= right || top >= bottom) return at;
  const byX = right + w / 2 - at.x;
  const byY = bottom + h + 6 - at.y;
  return byX <= byY ? { x: at.x + byX, y: at.y } : { x: at.x, y: at.y + byY };
}

function make(cls, text) {
  const node = document.createElement('div');
  node.className = cls;
  node.textContent = text;
  return node;
}

/**
 * @param {HTMLElement} root 界面面板的根（#ui）
 * @param {() => ({x: number, y: number} | null)} spot 操控的人头顶在画面上的位置
 */
export function createCaptions(root, spot) {
  const layer = make('captions', '');
  root.append(layer);
  const later = (node, ms) => setTimeout(() => node.remove(), ms);
  // 要紧的话（头一回找到、升了本事、头一回出极品）说着的时候，后来的话排队等它说完，不把它盖掉。
  // 排队的最多 QUEUE 句，再多的寻常话就不说了；要紧的话照样排上。
  const QUEUE = 3;
  const QUEUED_MS = 1200; // 排队轮到的寻常话，至少留这么久再换下一句
  const KEEP_MS = 2000; // 要紧的话至少说这么久，后来的话才接上（太久了提示会跟手上的事错开，G-14 第 7 条）
  // 后面又有话来了，说明人已经在做下一件事：正说着的要紧话最少留 MIN_KEEP_MS，再多留 HURRY_MS 就让位；
  // 排了 STALE_MS 还没轮到的寻常话是上一件事的，不说了（G-14 图 07：翻灌木时还在报十分钟前的农事）。
  const MIN_KEEP_MS = 1200;
  const HURRY_MS = 600;
  const STALE_MS = 4000;
  const queue = [];
  let holdUntil = 0;
  let shownAt = 0;
  let timer = null;
  const flush = () => {
    timer = null;
    const now = Date.now();
    while (queue.length && !queue[0].keep && now - queue[0].at > STALE_MS) queue.shift();
    const next = queue.shift();
    // 后面还有人排着，就都按寻常话的长短过，快点轮到眼前这件事
    if (next) show(next.text, next.keep && !queue.length ? KEEP_MS : QUEUED_MS);
  };
  const wait = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, Math.max(0, holdUntil - Date.now()));
  };

  /** 摆出来；之后 hold 毫秒（最多到它说完）里来的话排队：要紧的话等它说完，排着队轮到的寻常话一句一句过。 */
  function show(text, hold) {
    const ms = place(text);
    shownAt = Date.now();
    if (hold) holdUntil = shownAt + Math.min(ms, hold);
    if (queue.length) wait();
  }

  function place(text) {
    const head = spot();
    if (text.length <= SHORT && head) {
      layer.querySelector('.caption.head')?.remove();
      const node = document.createElement('div');
      node.className = 'caption head';
      const img = document.createElement('img');
      img.className = 'pixel bubble-ico';
      img.width = 24;
      img.height = 24;
      img.alt = '';
      img.src = uiIconUrl('scroll_exclaim');
      const span = document.createElement('span');
      span.textContent = text;
      node.append(img, span);
      layer.append(node);
      // 先放进去量出多宽，再按半个宽度往里收，长一点的话也不出画面
      const w = node.offsetWidth;
      const at = dodge(root, clampTo(root, head, Math.ceil(w / 2) + 8), w, node.offsetHeight);
      node.style.left = at.x + 'px';
      node.style.top = at.y + 'px';
      later(node, 2600);
      return 2600;
    }
    layer.querySelector('.caption.band')?.remove();
    const node = make('caption band', text);
    layer.append(node);
    const ms = Math.max(3400, text.length * 150);
    later(node, ms);
    return ms;
  }

  return {
    /** 说一句。keep 为真是要紧的话，说着的时候别的话排队。 */
    say(text, keep = false) {
      if (!text) return;
      const now = Date.now();
      if (now < holdUntil || queue.length) {
        if (keep || queue.length < QUEUE) queue.push({ text, keep, at: now });
        holdUntil = Math.max(shownAt + MIN_KEEP_MS, Math.min(holdUntil, now + HURRY_MS));
        wait();
        return;
      }
      show(text, keep ? KEEP_MS : 0);
    },
    /** 一串数的变化，从头顶往上飘。entries: [{text, up, fine}]，up 为 true 是变多了，fine 是收到了极品。 */
    float(entries) {
      const head = spot();
      if (!head || !entries.length) return;
      const at = clampTo(root, head, 40);
      entries.forEach((entry, i) => {
        const node = make(
          'float ' + (entry.up ? 'up' : 'down') + (entry.fine ? ' fine' : ''),
          entry.text,
        );
        // 从人身侧飘起，不从头顶：头顶留给说话的气泡，两层字别叠在一起（G-14 图 05、06）
        node.style.left = at.x + 40 + 'px';
        node.style.top = at.y + 10 - i * 17 + 'px';
        node.style.animationDelay = i * 110 + 'ms';
        layer.append(node);
        later(node, (entry.fine ? 2500 : 1900) + i * 110);
      });
    },
    destroy() {
      if (timer) clearTimeout(timer);
      queue.length = 0;
      layer.remove();
    },
  };
}

/**
 * 对话里那句话一个字一个字地出来；点一下就整句显示。返回“立刻写完”的函数。
 */
export function typeOut(node, perChar = 26) {
  const full = node.textContent;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || full.length < 4) return () => {};
  const typed = document.createElement('span');
  const rest = document.createElement('span');
  rest.className = 'unsaid';
  rest.textContent = full;
  node.replaceChildren(typed, rest);
  let shown = 0;
  const finish = () => {
    clearInterval(timer);
    node.textContent = full;
  };
  const timer = setInterval(() => {
    shown += 1;
    typed.textContent = full.slice(0, shown);
    rest.textContent = full.slice(shown);
    if (shown >= full.length) finish();
  }, perChar);
  return finish;
}
