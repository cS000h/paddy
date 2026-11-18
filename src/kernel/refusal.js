// 拒绝：一条规则（或它调用的服务）做不下去时抛出 Refusal，命令带着这句原因被拒绝。
// 它是说给玩家听的回答（“太累了”），不是程序出错，所以不报给 onError。
// 只有命令本身能拒绝；跟着一件事发生的反应里抛出的拒绝，内核当成程序出错（见 reactions.js）。
class Refusal extends Error {}

/** 带着给玩家看的原因拒绝正在执行的命令。不会返回。 */
function refuse(reason) {
  throw new Refusal(reason);
}

export { Refusal, refuse };
