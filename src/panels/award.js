// 得了点什么时上沿落下的一张小纸条：一项成就、衣箱里添的一件衣裳、学会的一种发式。
// 和小窗一样是米色的纸、两像素的深褐边，左边一张像素小图。
// 同一下得了好几样（头一回下厨又做出好饭），一张一张接着落，不叠在一起。
import { PEOPLE } from '../content/people.js';
import { outfitLook } from '../content/wardrobe.js';
import { esc } from './html.js';
import { uiIconUrl, heroPortraitUrl } from './icons.js';

const SHOW_MS = 3200;

const pic = (src, w, h) => `<img class="pixel" width="${w}" height="${h}" src="${src}" alt="" />`;

/** 一张纸条上写什么：{label, name, image}。认不得的事实是 null。 */
export function slipOf(fact, game) {
  const d = fact.data;
  if (fact.type === 'achievement.earned')
    return { label: '成就', name: d.name, image: pic(uiIconUrl('award_rice'), 32, 32) };
  if (fact.type !== 'wardrobe.got') return null;
  // 小像穿戴着新得的那一样，另一样照身上现在的
  const { worn } = game.ask('wardrobe');
  const hero = game.ask('hero');
  const coat = d.kind === 'coat' ? d.id : worn.coat;
  const hair = d.kind === 'hair' ? d.id : worn.hair;
  const look = outfitLook(PEOPLE[hero.id].look, coat, hair);
  return {
    label: d.kind === 'coat' ? '衣箱里添了' : '学会了新发式',
    name: d.name,
    image: pic(heroPortraitUrl(look), 32, 36),
  };
}

/** 往 root 上落纸条；返回 show(slip) 和 stop()。 */
export function createAwards(root) {
  const queue = [];
  let timer = 0;
  const next = () => {
    root.querySelector('.award')?.remove();
    const slip = queue.shift();
    if (!slip) {
      timer = 0;
      return;
    }
    const node = document.createElement('div');
    node.className = 'award';
    node.setAttribute('role', 'status');
    node.innerHTML = `${slip.image}<span><small>${esc(slip.label)}</small><b>${esc(slip.name)}</b></span>`;
    root.append(node);
    timer = window.setTimeout(next, SHOW_MS);
  };
  return {
    show(slip) {
      queue.push(slip);
      if (!timer) next();
    },
    stop() {
      window.clearTimeout(timer);
      queue.length = 0;
    },
  };
}
