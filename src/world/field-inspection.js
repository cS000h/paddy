// 查看时镜头对准实种的地块。目标和建议来自规则，镜头、人物朝向和点选范围归世界层。
import { TILE } from './logic.js';

export function fieldInspection(scene) {
  const { shell, game } = scene.deps;
  const camera = scene.cameras.main;
  let signature = '';
  let pointed = null;
  return () => {
    const modal = shell.get().modal;
    if (!modal?.field) {
      if (signature) {
        scene.fit();
        camera.startFollow(scene.player.sprite, true, 1, 1, 0, 10);
        const resident = scene.villagers.find(v => v.id === modal?.who);
        if (resident) resident.turnTo(scene.player);
        signature = '';
        pointed = null;
      }
      return;
    }
    if (modal.field !== true && pointed !== modal.field) {
      scene.villagers.find(v => v.id === modal.who)?.turnTo({ tile: modal.field });
      pointed = modal.field;
    }
    const { width, height } = scene.scale.gameSize;
    const key = [width, height, game.revision()].join('.');
    if (key === signature) return;
    signature = key;
    const crops = game.ask('farm.plots', scene.map.id).filter(p => p.crop);
    if (!crops.length) return shell.set({ modal: { ...modal, field: false, group: '' } });
    const xs = crops.map(p => p.x),
      ys = crops.map(p => p.y);
    const left = Math.min(...xs),
      top = Math.min(...ys);
    const right = Math.max(...xs),
      bottom = Math.max(...ys);
    const zoom = Math.max(
      1,
      Math.min(
        4,
        Math.floor((width - 20) / ((right - left + 1) * TILE)),
        Math.floor((height - 130) / ((bottom - top + 1) * TILE)),
      ),
    );
    camera
      .stopFollow()
      .setZoom(zoom)
      .centerOn(((left + right + 1) * TILE) / 2, ((top + bottom + 1) * TILE) / 2);
    camera.preRender();
    const view = camera.worldView;
    const fieldView = { left, top, x: -view.x * zoom, y: -view.y * zoom, step: TILE * zoom };
    shell.set({ modal: { ...modal, fieldView } });
  };
}
