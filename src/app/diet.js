// 食为天的提示：吃到合口、忌口、头一回吃的菜、吃腻了，底下冒一句；清早头一回气色好或有了小毛病，留着多看一会儿。
export function dietNotices(game, shell) {
  game.onCommit(facts => {
    const ate = facts.find(f => f.type === 'diet.ate');
    if (ate) shell.toast(ate.data.line);
    const changed = facts.find(f => f.type === 'diet.changed');
    if (changed) shell.toast(changed.data.got.map(g => `「${g.name}」${g.line}`).join(''), true);
  });
}
