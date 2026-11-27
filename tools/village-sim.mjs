// 村志：不开画面跑 N 天，逐日打印谁对谁做了什么、各户的钱和年景、谁心烦、谁对谁的好感怎么变。
// 用来调数（content/purse.js、deeds.js、stress.js），也用来看故事是不是自己冒出来了。
// 主角什么也不做：每天只是过时辰、睡觉，村里照常过日子。
//   node tools/village-sim.mjs [天数=30] [种子=1] [--quiet 只打印最后的总账]
// 也可以在测试里 import { simulate } 拿一份日志。
import { fileURLToPath } from 'node:url';
import { createGame } from '../src/port/game.js';
import { PEOPLE, ON_MAP } from '../src/content/people.js';
import { HOUSES } from '../src/content/purse.js';
import { CALENDAR } from '../src/content/calendar.js';

const name = id => (id === 'hero' ? '你' : PEOPLE[id]?.name || HOUSES[id]?.name || id);

/**
 * 跑 days 天，返回 {days: [{day, date, weather, lines}], totals}。
 * 工具读存档里的世界是为了看全貌（钱数、心烦），画面一侧不许这样做。
 */
export function simulate({ days = 30, seed = 1 } = {}) {
  const game = createGame({ seed });
  game.dispatch('origin.settle', {
    reason: 'keeper',
    keepsake: 'sickle',
    family: 'boat',
    own: 'calm',
    friend: 'gui',
  });
  const out = [];
  const totals = { deeds: {}, spent: 0, short: 0, snapped: 0, coped: 0 };
  let lines = [];
  game.onCommit(facts => {
    for (const f of facts) {
      const d = f.data;
      if (f.type === 'deed.done') {
        lines.push(`  ${d.line}`);
        totals.deeds[d.id] = (totals.deeds[d.id] || 0) + 1;
      } else if (f.type === 'purse.spent') {
        totals.spent++;
        if (d.short) totals.short++;
        lines.push(
          `  【开销】${name(d.house)}：${d.title}，要 ${d.n} 文` +
            (d.short ? `，还差 ${d.short} 文` : ''),
        );
      } else if (f.type === 'purse.fortune') lines.push(`  【换季】${name(d.house)}${d.word}`);
    }
  });
  const world = () => game.save().state.world;
  const witnessSeen = new Set();
  for (let i = 0; i < days; i++) {
    const c = game.ask('clock');
    const head = `第${c.day}天 ${c.year}年${c.seasonName}季第${c.dayOfSeason}日 ${game.ask('weather').name}`;
    while (!game.ask('clock').stopped && game.ask('clock').minute < 20 * 60)
      game.dispatch('clock.advance', { minutes: CALENDAR.tickMinutes * 6 });
    const w = world();
    for (const x of w.witness.list)
      if (!witnessSeen.has(x.id) && ['snap', 'cope'].includes(x.act)) {
        witnessSeen.add(x.id);
        totals[x.act === 'snap' ? 'snapped' : 'coped']++;
      }
    const purses = Object.entries(w.purses.houses)
      .map(([id, h]) => `${name(id)}${h.coins}${h.short ? `(欠${h.short.n})` : ''}`)
      .join(' ');
    const vexed = ON_MAP.map(id => [id, w.persona[id].stress])
      .filter(([, n]) => n > 0)
      .map(([id, n]) => `${name(id)}${n}`)
      .join(' ');
    out.push({
      day: c.day,
      head,
      lines,
      purses,
      vexed,
    });
    lines = [];
    game.dispatch('sleep', {});
  }
  const w = world();
  const ties = [];
  for (const a of ON_MAP)
    for (const b of ON_MAP)
      if (a !== b) {
        const o = game.ask('opinion', a, b);
        if (o && Math.abs(o.value) >= 15) ties.push(`${name(a)}→${name(b)} ${o.value}`);
      }
  totals.ties = ties;
  totals.coping = ON_MAP.filter(id => w.persona[id].coping.length).map(
    id => `${name(id)}：${w.persona[id].coping.join('、')}`,
  );
  return { days: out, totals };
}

/** 把日志排成给人看的字。 */
export function printLog({ days, totals }, quiet = false) {
  const rows = [];
  if (!quiet)
    for (const d of days) {
      rows.push(d.head);
      rows.push(...d.lines);
      rows.push(`  钱：${d.purses}`);
      if (d.vexed) rows.push(`  心烦：${d.vexed}`);
    }
  const n = Object.entries(totals.deeds)
    .map(([k, v]) => `${k} ${v}`)
    .join('，');
  rows.push(`——总账：做事 ${n || '无'}；大开销 ${totals.spent} 笔（钱不够 ${totals.short} 笔）`);
  rows.push(`  憋不住 ${totals.snapped} 回，用毛病解闷 ${totals.coped} 回`);
  rows.push(`  好感过 15 的：${totals.ties.join('，') || '无'}`);
  rows.push(`  染上的毛病：${totals.coping.join('；') || '无'}`);
  return rows.join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const quiet = process.argv.includes('--quiet');
  const days = Number(args[0] || 30),
    seed = Number(args[1] || 1);
  console.log(printLog(simulate({ days, seed }), quiet));
}
