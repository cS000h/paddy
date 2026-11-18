// 触屏摇杆的圈。手指在画面左边按下拖动时（world/input.js 认出来、发 stick 意图），
// 圈出现在按下的地方，钮跟着手指；松手就收起。没在用的时候，在拇指顺手的位置留一个淡淡的圈，
// 告诉人可以在这儿按住拖——原来那个圈固定在左下角落里，够起来别扭，按偏了还会变成“点地走路”。
// 圈只是画出来给人看的：它不接手指（pointer-events: none），手指始终落在画布上。

/** node 是圈，它的第一个子元素是钮。返回取消订阅的函数。 */
export function bindStick(node, intents) {
  const knob = node.firstElementChild;
  return intents.on('stick', ({ phase, origin, knob: at }) => {
    if (phase === 'end') {
      node.classList.remove('live');
      node.style.transform = '';
      knob.style.transform = '';
      return;
    }
    node.classList.add('live');
    node.style.transform = `translate(${origin.x}px, ${origin.y}px)`;
    knob.style.transform = `translate(${at.x}px, ${at.y}px)`;
  });
}
