// 像素世界的入口。整个 world 层是“一种画法”：换引擎、换镜头、换画风，只动这一层。
import Phaser from 'phaser';
import { VillageScene } from './scene.js';

/**
 * @param {object} deps
 * @param {HTMLElement} deps.parent 画布放进哪个元素
 * @param {object} deps.game     端口（src/port/game.js）
 * @param {object} deps.intents  输入意图（src/shell/intents.js）
 * @param {object} deps.shell    外壳状态（src/shell/state.js）
 * @param {object} deps.platform 平台（src/platform）
 * @param {object} deps.map      要显示的地图（src/content/maps）
 */
export function createWorld(deps) {
  const { parent, ...sceneDeps } = deps;
  const phaser = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#cfdcb8',
    pixelArt: true,
    roundPixels: true,
    banner: false,
    disableContextMenu: true,
    audio: { noAudio: true },
    input: { activePointers: 2 },
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
  });
  phaser.scene.add('village', VillageScene, true, sceneDeps);
  const scene = () => phaser.scene.getScene('village');
  return {
    /** 操控的人此刻站在哪一格、面朝哪边；场景还没起来时是 null。 */
    heroAt: () => (scene()?.player ? scene().at() : null),
    scene,
    destroy: () => phaser.destroy(true),
  };
}
