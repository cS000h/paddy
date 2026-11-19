// 地表效果先于一切立物；立物与动作按接地点的世界纵坐标排序。
// 高空飞鸟、天气与交互提示各有独立平面。粒子自身的飞行高度不会改变其发源处的遮挡关系。
import { OBJECTS } from '../content/maps/index.js';

export const DEPTH = Object.freeze({
  terrain: -1000,
  floor: -950,
  soil: -900,
  weeds: -890,
  reflection: -980,
  ripple: -970,
  fish: -960,
  waterInsect: -810,
  cursor: -800,
  sky: 9000,
  weather: 9500,
  emote: 9700,
});
export function sceneryParts(kind, bottom, look = null) {
  const def = OBJECTS[kind];
  if (def.parts) return def.parts.map(([part, offset]) => ({ look: part, depth: bottom + offset }));
  return [{ look, depth: def.floor ? DEPTH.floor : bottom + (def.sortOffset || 0) }];
}
