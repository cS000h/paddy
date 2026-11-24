// 同一份只读选项给按钮和点击时的复核使用。各条命令仍由原玩法在自己的事务里结算。
import { ENCOUNTER_WORDS as words } from '../../content/encounters.js';
import { TOPICS } from '../../content/talk.js';
import { near } from './people.js';

function forVisitor(v, ask, at) {
  const choices = [];
  if (!v.talkedToday)
    choices.push({
      key: 'listen',
      label: '听他讲来意',
      command: 'visitor.talk',
      input: { id: v.id },
      result: 'visitor.talked',
    });
  if (v.done) return choices;
  if (v.need.kind === 'dish') {
    const dishes = ask('kitchen', at).carried;
    for (const d of dishes)
      choices.push({
        key: 'serve.' + d.id,
        group: '交付饭菜',
        label: d.name,
        confirm: '把' + d.name + '交给' + v.name,
        command: 'visitor.fulfill',
        input: { id: v.id, dish: d.id },
        result: 'visitor.fulfilled',
      });
    if (!dishes.length)
      choices.push({
        key: 'need',
        label: '要带什么来？',
        line: words.bringDish(v.need.text),
      });
  } else {
    const item = ask('goods', at).find(i => i.id === v.need.item);
    const name = item?.name || v.need.text;
    const have = item?.carried || 0;
    choices.push({
      key: 'deliver.' + v.need.item,
      label: '交付' + v.need.n + '份' + name,
      icon: v.need.item,
      reason: have < v.need.n ? '带着' + have + '份，还差' + (v.need.n - have) + '份' : '',
      confirm: '把' + v.need.n + '份' + name + '交给' + v.name,
      command: 'visitor.fulfill',
      input: { id: v.id },
      result: 'visitor.fulfilled',
    });
  }
  return choices;
}
function forResident(person, ask, at, walking, compute) {
  const to = person.id,
    bond = ask('bonds').find(b => b.id === to);
  const options = walking
    ? []
    : compute.run('resident.options', { person, ask, at, day: ask('clock').day }, []);
  const visits = ask('visits'),
    visit = visits.active;
  if (visit?.due && visit.npc === to && person.waiting && !walking)
    options.unshift({
      key: 'meet.' + visit.day,
      label: '坐下赴约',
      command: 'visit.meet',
      input: {},
      result: 'appointment.fulfilled',
    });
  if (!bond.talkedToday)
    options.push({
      key: 'talk',
      label: bond.known ? '招呼一声' : '报上名字',
      command: 'talk',
      input: { to, walking, reply: true },
      result: 'person.talked',
    });
  else {
    // 照原来的说话纸：招呼过了才往下问；近况、安排、天色各一天一回，天黑不问安排，熟了才约。
    for (const topic of ['news', 'plan', 'sky'])
      if (!bond.asked.includes(topic) && !(topic === 'plan' && person.atDoor))
        options.push({
          key: 'topic.' + topic,
          group: '聊聊',
          label: TOPICS[topic],
          command: 'talk',
          input: { to, topic, walking },
          result: 'person.talked',
        });
    if (visits.canInvite && bond.known >= 1 && !person.atDoor)
      options.push({
        key: 'invite.' + to,
        label: '约明天午前茶摊坐坐',
        command: 'invite',
        input: { to },
        result: 'appointment.made',
      });
  }
  if (bond.giftedToday) return options;
  for (const i of ask('goods', at).filter(i => i.gift && i.carried > 0))
    options.push({
      key: 'gift.' + i.id,
      group: '递东西',
      label: i.name + ' ×' + i.carried,
      icon: i.id,
      confirm: '递出' + i.name,
      command: 'gift',
      input: { to, item: i.id },
      result: 'gift.given',
    });
  for (const d of ask('kitchen', at).carried)
    options.push({
      key: 'dish.' + d.id,
      group: '递东西',
      label: d.name,
      confirm: '递出' + d.name,
      command: 'gift',
      input: { to, dish: d.id },
      result: 'gift.given',
    });
  return options;
}
export const interactions = {
  id: 'sim.interactions',
  requires: ['queries', 'people', 'residents', 'compute'],
  writes: [],
  install(ctx) {
    const { queries, people, residents } = ctx.services;
    queries.define('interaction.options', (w, id, at, walking = false) => {
      const ask = (name, ...args) => queries.run(name, w, ...args);
      const me = people.me(w),
        here = at || me;
      const person = residents.positions(w).find(p => p.id === id && p.visible && p.map === me.map);
      if (person) return forResident(person, ask, here, walking, ctx.services.compute);
      const visitor = ask('visitors').active.find(
        v => v.id === id && v.map === me.map && near(here, v),
      );
      return visitor ? forVisitor(visitor, ask, here) : [];
    });
  },
};
