// 冒出来的字。原来所有提醒都挤在画面上方一个窄窄的小框里，和人、和事都对不上。现在：
//   - 短的提醒（“太累了，回屋歇一歇吧”）冒在人头顶，像一句心里话；
//   - 长的旁白（成就、升级、清早的一句）横在画面下方，像题在画上的一行字；
//   - 吃喝、干活带来的数变化（饱腹 +14、体力 −3）从人身边飘起来，一两秒就散。
// 都不接手指，不挡操作。spot() 问世界：操控的人头顶此刻在画面上的哪一点。

const SHORT = 18; // 不超过这么多字，冒在头顶

/** 摆在头顶的位置不出画面：左右留出半个字条的宽度，上面留出一行。 */
function clampTo(root, at, margin = 60) {
  return {
    x: Math.max(margin, Math.min(root.clientWidth - margin, at.x)),
    y: Math.max(54, Math.min(root.clientHeight - 40, at.y)),
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
    /** 说一句。短的冒在头顶，长的横在下方；同一处一次只留一句。 */
    say(text) {
      if (!text) return;
      const head = spot();
      if (text.length <= SHORT && head) {
        layer.querySelector('.caption.head')?.remove();
        const node = make('caption head', text);
        const at = clampTo(root, head);
        node.style.left = at.x + 'px';
        node.style.top = at.y + 'px';
        layer.append(node);
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
 * 没出来的字先占着位置（透明），框不会一行一行地长高、跳动。
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
