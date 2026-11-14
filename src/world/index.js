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
  const view = deps.platform.viewport;
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
    // 画布多大由平台说了算（手机竖着拿时画面是转过来的，不能让引擎自己去量）
    width: view.size().width,
    height: view.size().height,
    scale: { mode: Phaser.Scale.NONE },
  });
  phaser.scene.add('village', VillageScene, true, sceneDeps);
  const scene = () => phaser.scene.getScene('village');
  const offResize = view.onChange(size => phaser.scale.resize(size.width, size.height));
  return {
    /** 操控的人此刻站在哪一格、面朝哪边；场景还没起来时是 null。 */
    heroAt: () => (scene()?.player ? scene().at() : null),
    scene,
    destroy() {
      offResize();
      phaser.destroy(true);
    },
  };
}
