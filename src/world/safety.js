// 画面出错时不让整个世界停下。
//
// Phaser 的画面循环是“先跑这一帧，跑完才约下一帧”：一帧里任何一处抛错，循环就永远停了，
// 画面定住、人也走不动。所以每一帧包一层（guardFrames），出错交给 report，下一帧照常来。
// 场景自己的 update、定时回调再各包一层（safely），出错时这一帧的其余部分还能画完。

/** 在 Phaser 开始画面循环之前（config.callbacks.postBoot 里）给每一帧包上一层。 */
export function guardFrames(game, report) {
  const step = game.step;
  game.step = function guardedStep(time, delta) {
    try {
      step.call(this, time, delta);
    } catch (error) {
      report(error, 'world');
    }
  };
}

/** 跑一段可能出错的画面代码；出错交给 report，返回 undefined。 */
export function safely(report, fn) {
  try {
    return fn();
  } catch (error) {
    report(error, 'world');
    return undefined;
  }
}
