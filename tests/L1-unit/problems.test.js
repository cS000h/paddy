// L1 出错记录（src/app/problems.js）：同一个错只打一回、留最近 20 条、错得太密才提醒一次。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProblems } from '../../src/app/problems.js';

function setup() {
  let t = 0;
  const logged = [];
  let bursts = 0;
  const problems = createProblems({
    now: () => t,
    log: (...args) => logged.push(args),
    onBurst: () => bursts++,
  });
  return { problems, logged, tick: ms => (t += ms), bursts: () => bursts };
}

test('同一处同一个错只打一回，后面数次数；最多留 20 条', () => {
  const { problems, logged } = setup();
  for (let i = 0; i < 5; i++) problems.report(new Error('画不出来'), 'world');
  problems.report(new Error('画不出来'), 'panels');
  assert.equal(logged.length, 2);
  assert.deepEqual(
    problems.list().map(p => [p.where, p.count]),
    [
      ['world', 5],
      ['panels', 1],
    ],
  );
  for (let i = 0; i < 30; i++) problems.report(new Error('第 ' + i + ' 个'), 'rules');
  assert.equal(problems.list().length, 20);
  assert.equal(problems.list().at(-1).message, '第 29 个');
});

test('错得太密才提醒，提醒一次；玩家看过（calm）以后再错得太密才再提醒', () => {
  const { problems, tick, bursts } = setup();
  for (let i = 0; i < 11; i++) {
    problems.report(new Error('偶尔'), 'world');
    tick(1000); // 八秒里不到十二回，不提醒
  }
  assert.equal(bursts(), 0);
  for (let i = 0; i < 40; i++) problems.report(new Error('一帧一帧地错'), 'world');
  assert.equal(bursts(), 1);
  problems.calm();
  for (let i = 0; i < 12; i++) problems.report(new Error('又来了'), 'world');
  assert.equal(bursts(), 2);
});

test('提醒的过程中又出错，不绕圈子', () => {
  let problems;
  let depth = 0;
  problems = createProblems({
    log: () => {},
    onBurst: () => {
      depth++;
      problems.report(new Error('提醒的小窗也出错'), 'panels');
    },
  });
  for (let i = 0; i < 12; i++) problems.report(new Error('x'), 'world');
  assert.equal(depth, 1);
});
