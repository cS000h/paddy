import { fishingFrame } from '../art/fishing-water.js';

// 画布保持原始格数，放大交给 CSS。规则接入后每帧传当下的鱼影距离、线的张力。
export function paintFishing(canvas, spot, state) {
  const grid = fishingFrame(spot, state);
  if (canvas.width !== grid.w) canvas.width = grid.w;
  if (canvas.height !== grid.h) canvas.height = grid.h;
  canvas.getContext('2d').putImageData(new ImageData(grid.bytes(), grid.w, grid.h), 0, 0);
}

// 由事件边沿触发一次；持续收线时由调用方按节拍传 reel。
export function fishingCue(platform, cue) {
  platform.audio.play(cue);
  if (cue === 'bite') platform.haptic();
}
