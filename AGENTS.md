# 《稻》工程规则（给所有在这个仓库里写代码的人和 AI 助手）

这是一款中式田园像素生活 RPG。本文件是唯一的规则来源：不管由谁来写，都按这里的分层、
人物设定和测试要求来。规则和代码不一致时，先停下来问，不要各改各的。

## 先跑这几条

```
npm install       # 第一次
npm run dev       # 开发：http://127.0.0.1:5173/ （加 ?debug 打开写入检查和调试入口 window.__dao）
npm test          # 快测试，几秒钟，每次改动后都要跑
npm run test:all  # 全部测试：再加格式、类型、真实浏览器
npm run format    # 按 Prettier 排版
npm run art:sheet # 不开浏览器，把整张场景和素材导出到 .cache/ 里看
```

## 分层

依赖只能从下往上，`tests/L0-static/architecture.test.js` 会自动检查。

| 层         | 放什么                                                                           | 可以引用                                    |
| ---------- | -------------------------------------------------------------------------------- | ------------------------------------------- |
| `kernel`   | 内核：命令事务、规则事件、计算管道、数据切片校验、写入检查、查询                 | 无                                          |
| `content`  | 数据：日历、物品作物、人物设定、台词、地图。只有数据，没有规则                   | 无                                          |
| `sim`      | 规则插件：时间、人物、家当、田地、乡邻、收菜筐、手记                             | kernel、content                             |
| `port`     | 端口：外壳能用的全部接口，加存档格式与升级                                       | sim、content                                |
| `art`      | 素材：用程序画的像素图。纯运算，Node 里也能跑                                    | 无                                          |
| `platform` | 运行环境的差异：存档放哪、窗口切走、画面方向（手机一律横屏）、键鼠还是触屏、声音 | 无                                          |
| `shell`    | 外壳共用的东西：输入意图、界面状态                                               | content                                     |
| `world`    | 像素世界（Phaser）：地图、人、镜头、动作反馈、设备适配器                         | port、content、art、platform、shell、phaser |
| `panels`   | 界面面板（DOM）：日期、体力、工具栏、手记、小窗、触屏摇杆                        | port、content、art、platform、shell         |
| `app`      | 启动与组装，以及跨着几块的流程（过夜、存档、时间流逝）                           | 以上除 kernel、sim 之外的全部               |

三条不能破的约定：

1. **规则和画面之间只有端口。** `world`、`panels`、`app` 只用 `dispatch`（发命令）、`ask`（查询）、
   `onCommit` / `on`（听已经发生的事）、`save`。不许直接读世界的数据结构。
2. **所有人物是同一种数据。** 玩家只是 `world.player.controls` 指着的那个人。东西和钱属于“一户”。
   将来换下一代接班，不应该需要改任何规则。
3. **存档带版本号。** 改了世界的数据结构：`SAVE_VERSION` 加一，在 `src/port/save.js` 的 `MIGRATIONS`
   里写上一级怎么升，再留一份旧版本的样本存档（`node tools/make-fixture.mjs`）。

**移动端一律横屏。** 手机竖着拿时，平台层把整个画面转 90 度（`platform.viewport`）。所以：
布局不要写媒体查询，用平台层设在 `#app` 上的 `narrow`、`compact` 两个类；
屏幕坐标要先经 `viewport.toLocal` / `toLocalDelta` 换算，不要直接用 `clientX`、`clientY` 或引擎自己算的指针位置。

规则一侧（kernel、content、sim、port、art、shell）不许碰浏览器、真实时钟和无种子的随机数。
同一个种子、同一串命令，结果必须逐字节相同。

## 改动放在哪儿

| 想做的事                             | 改哪里                                                                             |
| ------------------------------------ | ---------------------------------------------------------------------------------- |
| 加一种作物、物品、台词，调数值       | `src/content/`                                                                     |
| 改乡邻去哪儿、几点回家               | `src/content/people.js` 的 `ROUTINES`、`ROUTINE_DAY`                               |
| 改做完一件事后的那段话               | `src/content/life-text.js`；规则把它写进事实的 `line`，画面照着显示                |
| 加一条玩法规则                       | `src/sim/plugins/` 里加一个插件，列进 `src/sim/index.js` 的 `PLUGINS`              |
| 让画面知道一件新的事                 | 规则里 `fact(...)` 发事实，或 `queries.define(...)` 定义查询；再更新 L3 的端口清单 |
| 加一张地图、一种物件                 | `src/content/maps/`（数据）+ `src/art/`（画法，登记进 `art/index.js`）             |
| 换一张图的画法，或换成手绘图         | `src/art/index.js` 里换它的来源，别处不动                                          |
| 支持一种新的输入设备（比如手柄）     | `src/world/input.js` 里加一个适配器，发的还是那几种意图                            |
| 上一个新的运行环境（桌面壳、小游戏） | 照 `src/platform/web.js` 的形状再写一个平台                                        |
| 加一种小窗                           | 在 `src/panels/` 写视图函数、登记进 `modals.js` 的 `VIEWS`，用 `panels/html.js` 拼 |
| 小窗按钮要做的事                     | `src/app/` 里按主题分的 `*Actions`（行囊吃喝在 `home.js`），`main.js` 只负责组装   |
| 世界提示条和面板都要说的话           | `src/shell/words.js`（例如体力价钱的写法）                                         |
| 程序出错时怎么记、怎么告诉玩家       | `src/app/problems.js`；画面一侧的保护在 `src/world/safety.js`                      |
| 换引擎或换镜头                       | 只动 `src/world/`                                                                  |

## 写一个规则插件

```js
export const example = {
  id: 'sim.example',
  provides: ['example'], // 它提供的服务
  requires: ['schema', 'commands', 'reactions', 'queries', 'store'], // 它用到的服务，没列的用不了
  writes: ['example'], // 它自己直接改的数据切片，只列自己的
  install(ctx) {
    const { schema, commands, reactions, queries, store } = ctx.services;
    schema.slice('example', {
      initial: () => ({ n: 0 }),
      validate: s => Number.isInteger(s.n) || 'n',
    });
    commands.register('example.do', ({ draft, input, fact }) => {
      if (input.n > 3) return { ok: false, reason: '给玩家看的拒绝原因' };
      draft.world.example.n += 1;
      store.add(draft.world, 'veg.qingcai', 1); // 动别人的数据，走别人的服务
      fact('example.done', { n: draft.world.example.n });
    });
    reactions.on('day.started', s => (s.world.example.n = 0)); // 听别人发的事
    queries.define('example', w => ({ n: w.example.n })); // 给画面的只读答案
    ctx.provide('example', Object.freeze({ bump: ctx.own(w => (w.example.n += 1)) })); // 会改数据的服务用 ctx.own 包住
  },
};
```

选哪种机制：要结果或可能被拒绝，直接调服务；“发生了一件事”，发事实让别人听；
一个数被好几处加减，用计算管道（`compute.tap`）；给画面看的，定义查询。

几条守住韧性的规矩（内核和测试会查）：

- **只有命令本身能拒绝。** 反应（`reactions.on`）里调到会 `refuse` 的服务，内核当成程序出错。
  过夜、走时这类玩家推不掉的事尤其如此：清早的回礼放不进行囊，用 `pack.deliver`（放不下就收进家里），
  不能让“行囊满了”把睡觉都否掉。
- **每人、每户、每张地图一份的数据**，`validate` 先用 `is.keyedBy(all, 名单)` 查齐，再查每一项；
  只查“每一项都对”，空对象、数组、`true` 都能蒙混过去。
- **命令的输入在端口查过**：只能是普通的 JSON 数据，带原型链上名字（`constructor`、`__proto__`……）
  的直接拒绝。规则里查数据表仍然用 `Object.hasOwn`。
- **加了新命令**，在 `tests/chaos.js` 里教乱玩的人怎么用它；不教的话 L4-03 会点名。
  加了新的存档数据，L3-03 会随机弄坏它，看校验挡不挡得住。

外壳一侧（world、panels、app）出错的去处只有一个：`report(error, where)`（`src/app/problems.js`）。
端口、外壳状态、输入意图的听众都各自隔开，一个出错不连累别的；画面每一帧、场景的 `update`
和定时回调都包了一层（`src/world/safety.js`），一帧出错下一帧照常。新写的定时回调、异步按钮
也照这样包：定时回调里用 `scene.guard(fn)`，按钮动作由面板统一接住。

## 人物设定

人物只有一个来源：`src/content/people.js`。六位村民沿用《稻间》0.12：阿满（送菜的）、
桂嫂（隔壁邻居）、石伯（种了一辈子地）、小乔（杂货铺帮工）、老周（渡口撑船的）、云姑（后山种茶的）。
不要在别处另起人物或给他们改行当。人物不画近脸、不定长相，只有远处的小人。

## 测试

规则写在 `TESTING.md`。要点：加测试必须在那张清单里登记；规则测试只通过端口发命令；
行为有意改变时，按 L4 测试的提示更新基线指纹，并在提交说明里写明为什么变。

## 写法

- 提交前跑 `npm run format` 和 `npm test`。一行不超过 100 个字符，单个源文件不超过 400 行。
- 注释用中文写“为什么”，不写“这一行在做什么”。给玩家看的文字全部是中文。
- 画面和手感的改动，按 `TESTING.md` 末尾的 L6 清单试玩，把结论写进提交说明。
- 时间参数、数值都是占位：单日长度、季节天数、经济平衡还没有定案，只从 `src/content/` 读。

## 接下来做什么

见 [docs/执行方案.md](docs/执行方案.md)：按里程碑的顺序做，做完一个把它的状态从“待做”改成“完成”。
