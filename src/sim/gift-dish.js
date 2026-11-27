// 送一份饭菜：合不合心意、算几分情面、对方说什么。从 sim/plugins/social.js 分出来，口味（G-30）接在这里。
//   taste：这道菜合对方口味为正、忌口为负、都不沾为 0（sim/plugins/diet.js 接进 compute 'gift.taste'）
import { GIFT_DISH, GIFT_FAVORITE, GIFT_SPOILED } from '../content/gift-lines.js';
import { GIFT_TASTE } from '../content/diet.js';
import { FIRE_TWISTS } from '../content/cook-fire.js';
import { PEOPLE } from '../content/people.js';
import { withGesture } from './talk.js';

const SPOILED = ['raw', 'burnt'];

export function judgeDish({ dish, to, band, key, taste }) {
  const person = PEOPLE[to];
  const favorite = person.favorite === dish.base;
  const spoiled = SPOILED.includes(dish.quality);
  // 砸了也有点意思：有人偏爱这一口（阿满爱啃焦壳），送他算合心意
  const twist = dish.twist ? FIRE_TWISTS[dish.twist] : null;
  const fan = !!twist && 'fan' in twist && twist.fan === to;
  // 忌口的菜（最爱的那道除外）不算合心意，情面只算一分
  const avoid = !favorite && !fan && taste < 0;
  const liked = !spoiled && !avoid && (favorite || fan || dish.buff === person.likes || taste > 0);
  // 三分滋味的菜送出去多一分情面（最多还是 4）
  const value = spoiled || avoid ? 1 : favorite || (liked && dish.flavor === 3) ? 4 : liked ? 3 : 2;
  const line = spoiled
    ? GIFT_SPOILED[to]
    : favorite
      ? GIFT_FAVORITE[to]
      : fan && 'fanLine' in twist
        ? twist.fanLine
        : avoid
          ? GIFT_TASTE[to].dislike
          : taste > 0
            ? GIFT_TASTE[to].like
            : withGesture(to, band, GIFT_DISH[to][liked ? 'yes' : 'no'](dish.name), key);
  return { favorite, liked, value, line };
}
