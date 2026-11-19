// 室内外的地板和墙面底色相差很大。保留门外最后一帧，等新场景画出才揭开。
// 只复制游戏画布；面板仍可用，游戏的时间和行走也无需等待转场结束。
export function changeMap(scene, map) {
  const restart = () => scene.scene.restart({ ...scene.deps, map: scene.destination });
  const pending = !!scene.destination;
  scene.destination = map;
  if (pending) return;
  scene.busy = true;
  if (!scene.map.indoor && !map.indoor) return restart();
  const canvas = scene.game.canvas,
    events = scene.game.events;
  events.once('postrender', () => {
    let last = null;
    try {
      const host = canvas.parentElement;
      if (host) {
        const frame = document.createElement('canvas');
        frame.width = canvas.width;
        frame.height = canvas.height;
        frame.className = 'doorway-frame';
        frame.setAttribute('aria-hidden', 'true');
        frame.getContext('2d').drawImage(canvas, 0, 0);
        host.querySelector('.doorway-frame')?.remove();
        host.append(frame);
        last = frame;
      }
    } catch (error) {
      scene.deps.report(error, 'world:doorway');
    }
    restart();
    if (last)
      events.once('postrender', () => {
        last.addEventListener('animationend', () => last.remove(), { once: true });
        last.classList.add('arrived');
      });
  });
}
