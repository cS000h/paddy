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

  return {
    /** 说一句。短的冒成头顶紧凑像素气泡，长的横在下方；同一处一次只留一句。 */
    say(text) {
      if (!text) return;
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
        const at = clampTo(root, head, Math.ceil(node.offsetWidth / 2) + 8);
        node.style.left = at.x + 'px';
        node.style.top = at.y + 'px';
        later(node, 2600);
        return;
      }
      layer.querySelector('.caption.band')?.remove();
      const node = make('caption band', text);
      layer.append(node);
      later(node, Math.max(3400, text.length * 150));
    },
    /** 一串数的变化，从头顶往上飘。entries: [{text, up}]，up 为 true 是变多了。 */
    float(entries) {
      const head = spot();
      if (!head || !entries.length) return;
      const at = clampTo(root, head, 40);
      entries.forEach((entry, i) => {
        const node = make('float ' + (entry.up ? 'up' : 'down'), entry.text);
        node.style.left = at.x + 'px';
        node.style.top = at.y - 18 - i * 17 + 'px';
        node.style.animationDelay = i * 110 + 'ms';
        layer.append(node);
        later(node, 1900 + i * 110);
      });
    },
    destroy() {
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
