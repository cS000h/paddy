// 本事的成长曲线：几种玩法下，一门本事哪天到哪一级、出身线哪天到四级。
// 用规则里同一份打折算法（sim/plugins/growth.js 的 credit）和 content/growth.js 的数，一件一件地加。
// 一天干几件什么是估的（见 PLAYS），不跑整局；调 LEVELS、XP 之后跑一遍看曲线还对不对。
//   node tools/growth-curve.mjs
import { LEVELS, LEVEL_NAMES, XP } from '../src/content/growth.js';
import { LINE_UP_AT } from '../src/content/traits.js';
import { CALENDAR, dateOf } from '../src/content/calendar.js';
import { credit, level } from '../src/sim/plugins/growth.js';

// 一天里每件事的经验（未打折、未乘倍数）：锄地 4、浇水 2、收菜 3、沿溪找 5、钓上一条 2……
const PLAYS = {
  农事: {
    skill: 'farm',
    猛刷: [...Array(12).fill(4), ...Array(12).fill(2), ...Array(8).fill(3)],
    勤快: [...Array(6).fill(4), ...Array(8).fill(2), ...Array(4).fill(3)],
    随便玩: [4, 4, 2, 2, 2, 3],
  },
  采集: {
    skill: 'forage',
    猛刷: [5, 5, 3, 7, 1, 1, 1, ...Array(15).fill(2)],
    勤快: [5, 5, 3, 1, 1, 2, 2, 2, 3],
    随便玩: [5, 1, 2],
  },
  厨艺: {
    skill: 'cook',
    猛刷: [5, 5, 5, 5],
    勤快: [3, 4],
    随便玩: [2],
  },
};
const DAYS = CALENDAR.seasonDays * CALENDAR.seasons.length * 2;
const when = day => {
  const d = dateOf(day);
  return `第${day}天（${d.year > 1 ? '第二年' : ''}${CALENDAR.seasons[d.season]}）`;
};
for (const [name, { skill, ...plays }] of Object.entries(PLAYS)) {
  console.log(`\n${name}  升级要的经验：${LEVELS.join(' / ')}`);
  for (const [who, day1] of Object.entries(plays)) {
    let xp = 0;
    const reached = [];
    for (let day = 1; day <= DAYS && reached.length < LEVELS.length - 1; day++) {
      let done = 0;
      for (const n of day1) {
        const raw = n * (XP.rate[skill] || 1);
        xp += credit(done, raw);
        done += raw;
      }
      while (level(xp) > reached.length) reached.push(day);
    }
    const line = LINE_UP_AT.map(lv => reached[lv - 1]);
    console.log(
      `  ${who.padEnd(3, '　')}一天约 ${day1.length} 件：` +
        reached.map((d, i) => `${LEVEL_NAMES[i + 1]} ${d}`).join('，') +
        (reached.length < LEVELS.length - 1 ? '，两年内到不了行家' : '') +
        `\n          出身线四级：${line[2] ? when(line[2]) : '两年内到不了'}`,
    );
  }
}
