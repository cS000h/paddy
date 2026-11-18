// 触屏的摇杆：手指离圆心多远，就是多大的方向。发的是和键盘一样的 move 意图。

/** 把摇杆接到意图上。node 是摇杆的圆，它的第一个子元素是那颗钮。 */
export function bindStick(node, intents, platform) {
  const knob = node.firstElementChild;
  const move = event => {
    const box = node.getBoundingClientRect();
    const radius = box.width / 2;
    // 手指离圆心的位移；画面转过来的时候，方向也要跟着转
    const offset = platform.viewport.toLocalDelta(
      event.clientX - box.left - radius,
      event.clientY - box.top - radius,
    );
    let x = offset.x / radius;
    let y = offset.y / radius;
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    knob.style.transform = `translate(${x * radius * 0.6}px, ${y * radius * 0.6}px)`;
    intents.setMove('stick', Math.abs(x) < 0.25 ? 0 : x, Math.abs(y) < 0.25 ? 0 : y);
  };
  const end = () => {
    knob.style.transform = '';
    intents.setMove('stick', 0, 0);
  };
  node.addEventListener('pointerdown', event => {
    platform.viewport.lockLandscape();
    node.setPointerCapture(event.pointerId);
    move(event);
  });
  node.addEventListener('pointermove', event => event.buttons && move(event));
  node.addEventListener('pointerup', end);
  node.addEventListener('pointercancel', end);
}
