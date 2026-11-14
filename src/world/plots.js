import { TILE } from './logic.js';
export function refreshPlots(scene) {
  const list = scene.deps.game.ask('farm.plots', scene.map.id);
  const has = new Set(list.map(p => p.x + ',' + p.y));
  for (const [key, sprites] of scene.plots) {
    if (has.has(key)) continue;
    sprites.soil.destroy();
    sprites.crop.destroy();
    scene.plots.delete(key);
  }
  for (const p of list) {
    const key = p.x + ',' + p.y;
    const mask =
      (has.has(`${p.x},${p.y - 1}`) ? 1 : 0) |
      (has.has(`${p.x + 1},${p.y}`) ? 2 : 0) |
      (has.has(`${p.x},${p.y + 1}`) ? 4 : 0) |
      (has.has(`${p.x - 1},${p.y}`) ? 8 : 0);
    let sprites = scene.plots.get(key);
    if (!sprites) {
      sprites = {
        soil: scene.add
          .image(p.x * TILE, p.y * TILE, 'soil:dry.0')
          .setOrigin(0)
          .setDepth(-900),
        crop: scene.add.image(p.x * TILE + 8, (p.y + 1) * TILE - 2, 'crop:0').setOrigin(0.5, 1),
        stage: -2,
      };
      sprites.crop.setDepth((p.y + 1) * TILE - 3);
      scene.plots.set(key, sprites);
    }
    sprites.soil.setTexture(`soil:${p.wet ? 'wet' : 'dry'}.${mask}`);
    sprites.crop.setVisible(p.stage >= 0);
    if (p.stage >= 0) sprites.crop.setTexture('crop:' + p.crop + ':' + p.stage);
    if (p.stage > sprites.stage && sprites.stage !== -2) scene.effects.pop(sprites.crop);
    sprites.stage = p.stage;
  }
}
