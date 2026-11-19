// 像素世界的入口。整个 world 层是“一种画法”：换引擎、换镜头、换画风，只动这一层。
import Phaser from 'phaser';
import { VillageScene } from './scene.js';
import { guardFrames } from './safety.js';
import { work } from './interactions.js';

/**
 * @param {object} deps
 * @param {HTMLElement} deps.parent 画布放进哪个元素
 * @param {object} deps.game     端口（src/port/game.js）
 * @param {object} deps.intents  输入意图（src/shell/intents.js）
 * @param {object} deps.shell    外壳状态（src/shell/state.js）
 * @param {object} deps.platform 平台（src/platform）
 * @param {object} deps.map      要显示的地图（src/content/maps）
 * @param {(error: unknown, where: string) => void} [deps.report] 画面里出错交给谁（默认抛出）
 */
export function createWorld(deps) {
  const {
    parent,
    report = error => {
      throw error;
    },
    ...rest
  } = deps;
  const sceneDeps = { ...rest, report };
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
    callbacks: { postBoot: game => guardFrames(game, report) },
  });
  phaser.scene.add('village', VillageScene, true, sceneDeps);
  const scene = () => phaser.scene.getScene('village');
  // 单文件脚本可能早于 DOM 就绪执行，手机首次布局会先发 resize；等引擎有画布再同步。
  const resize = size => {
    if (phaser.scale.canvas) phaser.scale.resize(size.width, size.height);
  };
  const ready = () => resize(view.size());
  phaser.events.once(Phaser.Core.Events.READY, ready);
  const offResize = view.onChange(resize);
  return {
    /** 操控的人此刻站在哪一格、面朝哪边；场景还没起来时是 null。 */
    heroAt: () => (scene()?.player ? scene().at() : null),
    /** 操控的人头顶在画面上的位置（画面坐标）；面板把冒出来的字摆在这儿。场景没起来时是 null。 */
    headOnScreen: () => (scene()?.player ? scene().headOnScreen() : null),
    /**
     * 把一件已经结算好的活演出来（见 perform.js）：steps 一步步放，target 是对着的那一格，
     * then 演完以后调用。场景还没起来时直接调用 then。
     */
    perform(steps, { target = null, water = false, then = null } = {}) {
      const s = scene();
      if (s?.performer) s.performer.play(steps, { target, water, then });
      else then?.();
    },
    /** 正在演的那一场马上收场（比如钓鱼时没收竿就把小窗关了）。 */
    stopPerforming() {
      scene()?.performer?.stop();
    },
    /** 做一件采集或院里的活并演出来（见 interactions.js 的 work）；场景还没起来时什么也不做。 */
    work(group, id, target = null) {
      const s = scene();
      return s?.player ? work(s, group, id, target) : null;
    },
    scene,
    destroy() {
      offResize();
      phaser.events.off(Phaser.Core.Events.READY, ready);
      phaser.destroy(true);
    },
  };
}
