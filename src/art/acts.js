// 做活的动作总表：名字 → 一串帧。世界按名字取一条横排的帧（actSheet），在人站的地方一帧帧放，
// 放完换回走路的样子。画法分在 acts-yard.js（院里）、acts-work.js（野外、集上）、acts-kitchen.js（灶前）。
import { Grid } from './pixel.js';
import { FIELD_ACTS } from './acts-field.js';
import { YARD_ACTS } from './acts-yard.js';
import { WORK_ACTS } from './acts-work.js';
import { KITCHEN_ACTS } from './acts-kitchen.js';

export const ACTS = Object.freeze({ ...FIELD_ACTS, ...YARD_ACTS, ...WORK_ACTS, ...KITCHEN_ACTS });

/** 一个动作的第 f 帧（朝右）。 */
export function actFrame(name, f, look = 'hero') {
  const a = ACTS[name];
  if (!a) throw new Error('没有这个动作：' + name);
  const g = new Grid(a.w, a.h);
  a.draw(g, f, look);
  return g;
}

/**
 * 一个动作的整条帧，从左到右排开。
 * @returns {{grid: Grid, w: number, h: number, frames: number, fps: number, ax: number, ay: number, loop: boolean}}
 */
export function actSheet(name, look = 'hero') {
  const a = ACTS[name];
  if (!a) throw new Error('没有这个动作：' + name);
  const grid = new Grid(a.w * a.frames, a.h);
  for (let f = 0; f < a.frames; f++) grid.blit(actFrame(name, f, look), f * a.w, 0);
  return { grid, w: a.w, h: a.h, frames: a.frames, fps: a.fps, ax: a.ax, ay: a.ay, loop: !!a.loop };
}
