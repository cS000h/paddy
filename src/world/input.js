// 设备适配器：把键盘和指针（鼠标、手指）的动作翻译成意图。
// 摇杆的圈、右下那枚“做”的印画在界面面板里（src/panels），它们发的是同一套意图。
// 要支持手柄，就在这里再加一个 bindGamepad，世界本身不用改。
import { stickState } from '../shell/stick.js';

/** 键盘：WASD 或方向键走路；空格、E、回车、J 做事；1–8 拿起行囊里的一格；Q、R 换农具；Esc 取消。 */
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
  const actKeys = [' ', 'e', 'enter', 'j'];
  const release = event => {
    if (actKeys.includes(event.key.toLowerCase())) intents.emit('act', { phase: 'up' });
  };
  const press = event => {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    if (actKeys.includes(key)) intents.emit('act', { phase: 'down' });
    else if (key.length === 1 && '12345678'.includes(key))
      intents.emit('hold', { index: Number(key) - 1 });
    else if (key === 'q') intents.emit('tool.step', { by: -1 });
    else if (key === 'r') intents.emit('tool.step', { by: 1 });
    else if (key === 'escape') intents.emit('cancel');
  };
  scene.events.on('preupdate', poll);
  keyboard.on('keydown', press);
  keyboard.on('keyup', release);
  keyboard.addCapture('SPACE,UP,DOWN,LEFT,RIGHT');
  return () => {
    scene.events.off('preupdate', poll);
    keyboard.off('keydown', press);
    keyboard.off('keyup', release);
    intents.setMove('keys', 0, 0);
  };
}

// 手指在画面左边这一片按下拖动，就是摇杆；拖不到 SLOP 像素就松手，算轻点一下。
const ZONE = 0.5;
const SLOP = 10;

/**
 * 指针。鼠标：点一下世界里的位置 = “去那儿，能做事就做”；滚轮换工具。
 * 手指：在左边四成半的地方按下拖动是摇杆——圈出现在按下的地方，松手就收起，
 * 不用去找角落里一个固定的圈；只是轻点一下（没拖动），和点右边一样是“去那儿”。
 * 位置不用引擎自己算的：手机竖着拿时画面是转过来的，要先请平台把屏幕坐标换算成画面坐标。
 */
export function bindPointer(scene, intents, platform) {
  const canvas = scene.game.canvas;
  const view = platform.viewport;
  let stick = null; // {id, start, origin, active}
  const local = event => view.toLocal(event.clientX, event.clientY);
  const tapAt = at => {
    const point = scene.cameras.main.getWorldPoint(at.x, at.y);
    intents.emit('tap', { x: point.x, y: point.y });
  };
  const release = () => {
    if (stick?.active) {
      intents.setMove('stick', 0, 0);
      intents.emit('stick', { phase: 'end' });
    }
    stick = null;
  };
  const down = event => {
    if (event.button > 0) return;
    const at = local(event);
    if (event.pointerType === 'mouse') return tapAt(at);
    view.lockLandscape();
    if (stick || at.x > view.size().width * ZONE) return tapAt(at);
    stick = { id: event.pointerId, start: at, origin: at, active: false };
    canvas.setPointerCapture?.(event.pointerId);
    return undefined;
  };
  const move = event => {
    if (event.pointerId !== stick?.id) return;
    const at = local(event);
    if (!stick.active) {
      if (Math.hypot(at.x - stick.start.x, at.y - stick.start.y) < SLOP) return;
      stick.active = true;
    }
    const state = stickState(stick.origin, at);
    stick.origin = state.origin;
    intents.setMove('stick', state.move.x, state.move.y);
    intents.emit('stick', { phase: 'move', origin: state.origin, knob: state.knob });
  };
  const up = event => {
    if (event.pointerId !== stick?.id) return;
    const { active, start } = stick;
    release();
    if (!active && event.type === 'pointerup') tapAt(start);
  };
  const wheel = event => intents.emit('tool.step', { by: event.deltaY > 0 ? 1 : -1 });
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', wheel, { passive: true });
  canvas.addEventListener('lostpointercapture', up);
  const offHide = platform.onHide(release);
  const offModal = scene.deps.shell.subscribe(state => {
    if (state.modal) release();
  });
  return () => {
    release();
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', up);
    canvas.removeEventListener('wheel', wheel);
    canvas.removeEventListener('lostpointercapture', up);
    offHide();
    offModal();
  };
}

export function repeatField(scene) {
  if (scene.heldPlot && scene.time.now >= scene.fineUntil) {
    const t = scene.target();
    if (t.kind !== 'plot') return;
    const hint = scene.deps.shell.get().hint;
    if (!hint?.tool) return;
    const last = scene.heldPlot;
    const same = t.x === last.x && t.y === last.y;
    if (!same || (last.tool !== hint.tool && scene.time.now >= last.next)) scene.act(true);
  }
}
export function bindAction(scene, intents) {
  const { shell } = scene.deps;
  return [
    intents.on('act', ({ phase }) => {
      scene.heldPlot = null;
      if (phase !== 'up') scene.act(phase === 'down');
    }),
    scene.deps.platform.onHide(() => {
      scene.heldPlot = null;
    }),
    shell.subscribe(() => {
      if (shell.paused()) scene.heldPlot = null;
    }),
  ];
}
