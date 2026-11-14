// 设备适配器：把键盘和指针（鼠标、手指）的动作翻译成意图。
// 触屏的摇杆和按钮画在界面面板里（src/panels），它们发的是同一套意图。
// 要支持手柄，就在这里再加一个 bindGamepad，世界本身不用改。

/** 键盘：WASD 或方向键走路；空格、E、回车、J 做事；1–4 选工具；Q、R 换工具；Esc 取消。 */
export function bindKeyboard(scene, intents) {
  const keyboard = scene.input.keyboard;
  const keys = keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
  const poll = () => {
    const x =
      (keys.D.isDown || keys.RIGHT.isDown ? 1 : 0) - (keys.A.isDown || keys.LEFT.isDown ? 1 : 0);
    const y =
      (keys.S.isDown || keys.DOWN.isDown ? 1 : 0) - (keys.W.isDown || keys.UP.isDown ? 1 : 0);
    intents.setMove('keys', x, y);
  };
  const press = event => {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    if (key === ' ' || key === 'e' || key === 'enter' || key === 'j') intents.emit('act');
    else if (key.length === 1 && '1234'.includes(key))
      intents.emit('tool', { index: Number(key) - 1 });
    else if (key === 'q') intents.emit('tool.step', { by: -1 });
    else if (key === 'r') intents.emit('tool.step', { by: 1 });
    else if (key === 'escape') intents.emit('cancel');
  };
  scene.events.on('preupdate', poll);
  keyboard.on('keydown', press);
  keyboard.addCapture('SPACE,UP,DOWN,LEFT,RIGHT');
  return () => {
    scene.events.off('preupdate', poll);
    keyboard.off('keydown', press);
    intents.setMove('keys', 0, 0);
  };
}

/** 指针：点一下世界里的位置 = “去那儿，能做事就做”；滚轮换工具。鼠标和手指走的是同一条路。 */
export function bindPointer(scene, intents) {
  const down = pointer => {
    if (pointer.button > 0) return;
    intents.emit('tap', { x: pointer.worldX, y: pointer.worldY });
  };
  const wheel = (pointer, over, dx, dy) => intents.emit('tool.step', { by: dy > 0 ? 1 : -1 });
  scene.input.on('pointerdown', down);
  scene.input.on('wheel', wheel);
  return () => {
    scene.input.off('pointerdown', down);
    scene.input.off('wheel', wheel);
  };
}
