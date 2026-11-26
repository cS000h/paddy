// 性情和出身线「有什么用」的几句话：落脚单和册子都照这里写，免得两处说法对不上。
// 只写规则里真接上了的：六项的加减，和原先开局两选的好处（OLD_TRAITS 挂在性情、出身线上的那几样）。
import {
  ATTRS,
  TEMPERS,
  TEMPER_DESC,
  LINES_OF_ORIGIN,
  LINE_BONUS,
  LINE_UP_AT,
  OLD_TRAITS,
} from '../content/traits.js';
import { TRAITS, SKILLS } from '../content/growth.js';

const signed = n => (n > 0 ? '+' : '−') + Math.abs(n);

/** 「持家+1 学问+2」：六项里加减不为零的几样。 */
export const attrText = attrs =>
  Object.entries(attrs || {})
    .filter(([, n]) => n)
    .map(([k, n]) => ATTRS[k] + signed(n))
    .join('　');

const perks = test =>
  Object.entries(OLD_TRAITS)
    .filter(([, to]) => test(to))
    .map(([id]) => TRAITS[id].effect);

/** 一个性情：一句脾气、六项加减、额外的好处。 */
export const temperNotes = id => [
  TEMPER_DESC[id],
  attrText(TEMPERS[id].attrs),
  ...perks(to => to.temper === id),
];

/** 一条出身线到了第几级：管什么、六项加多少、对口本事、额外的好处。 */
export function lineNotes(id, lv = 1) {
  const l = LINES_OF_ORIGIN[id],
    b = LINE_BONUS[l.kind],
    i = lv - 1;
  const bonus = { [l.main]: b.main[i] };
  if (l.sub) bonus[l.sub] = b.sub[i];
  const up = LINE_UP_AT.join('、');
  return [
    l.note,
    attrText(bonus),
    `${SKILLS[l.skill].name}练到${up}级，出身各升一级`,
    ...perks(to => to.line === id),
  ];
}
