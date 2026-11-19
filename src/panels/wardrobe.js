import { COATS, HAIR, outfitLook } from '../content/wardrobe.js';
import { PEOPLE } from '../content/people.js';
import { personFrame } from '../art/people.js';
import { toUrl } from './icons.js';
import { title, button, actions, close } from './html.js';

export function wardrobeView(modal, game) {
  const hero = game.ask('hero');
  const coat = modal.coat ?? hero.coat;
  const hair = modal.hair ?? hero.hair;
  const look = outfitLook(PEOPLE[hero.id].look, coat, hair);
  const hairTab = modal.tab === 'hair';
  const views = ['down', 'right', 'up']
    .map(dir => {
      const src = toUrl(personFrame(look, dir, 'stand'));
      return `<img class="pixel" src="${src}" width="40" height="80" alt="" />`;
    })
    .join('');
  const picks = Object.entries(hairTab ? HAIR : COATS).map(([id, name]) =>
    button('fittingPick', hairTab ? name[0] : name, {
      chosen: id === (hairTab ? hair : coat),
      data: { id },
    }),
  );
  return (
    title('小屋衣镜', COATS[coat] + ' · ' + HAIR[hair][0]) +
    `<div class="fitting-preview">${views}</div>` +
    actions(
      button('fittingTab', '衣装', { chosen: !hairTab, data: { tab: 'coat' } }),
      button('fittingTab', '发式', { chosen: hairTab, data: { tab: 'hair' } }),
    ) +
    `<div class="fitting-choices">${picks.join('')}</div>` +
    actions(close('收起'), button('fittingWear', '穿戴好', { main: true }))
  );
}
