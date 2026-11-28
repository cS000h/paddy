// 小屋里六处摆设：一处一栏，四种样子一排。已经置办的点「换上」，没置办的写着托谁做、几文。
// 县城货写「等阿满捎」。规则在 sim/plugins/decor.js，这里只问 'decor'。
import { title, button, actions, close, esc, para } from './html.js';

export function decorView(modal, game) {
  const decor = game.ask('decor');
  const coins = game.ask('home').coins;
  const slots = Object.entries(decor).map(([slot, d]) => {
    const rows = d.styles.map(s => {
      const act = s.on
        ? '<span class="decor-on">摆着</span>'
        : s.owned
          ? button('decorSet', '换上', { data: { slot, style: s.id } })
          : s.from === 'town'
            ? '<span class="decor-town">等阿满捎</span>'
            : button('decorBuy', `托${s.maker} · ${s.price}文`, {
                data: { slot, style: s.id },
                disabled: coins < s.price,
              });
      return `<li${s.on ? ' class="chosen"' : ''}><b>${esc(s.name)}</b><small>${esc(s.desc)}</small>${act}</li>`;
    });
    return `<section class="decor-slot"><h3>${esc(d.name)}</h3><ul>${rows.join('')}</ul></section>`;
  });
  return `${title('屋里的摆设', `手头 ${coins} 文`)}
    ${modal.line ? para(modal.line, 'say') : para('只换好看，不添别的。置办过的收着，随时换回。', 'aside')}
    <div class="decor-slots">${slots.join('')}</div>
    ${actions(close('收起', false))}`;
}
