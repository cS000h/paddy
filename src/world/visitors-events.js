// 村里看得见的流动过客和落到具体地点的随机小事。
// 过客用现有衣装发式拼出小人站在茶摊、杂货铺或渡口；小事在发生地冒出记号，走过去就能处理。
import { Walker } from './actors.js';
import { showEmote } from './emotes.js';
import { DEPTH } from './depth.js';
import { TILE, dirTo } from './logic.js';
import { stirCues } from './interactions.js';
import { createGroundFinds } from './ground-finds.js';
import { createPrizeTraces } from './prize-traces.js';

/** 挂在 VillageScene 上的过客与小事实体管理，不占 scene.js 行数。 */
export function createFieldExtras(scene) {
  const walkers = new Map();
  const ground = createGroundFinds(scene);
  const traces = createPrizeTraces(scene);
  let eventMark = null;
  let eventRing = null;
  let eventTween = null;

  function clearEvent() {
    eventTween?.stop();
    eventTween = null;
    eventMark?.destroy();
    eventMark = null;
    eventRing?.destroy();
    eventRing = null;
  }

  function destroyWalker(w) {
    w.emote?.destroy();
    w.badge?.destroy();
    w.sprite.destroy();
    w.shadow.destroy();
  }

  /** 按规则里的最新状态，把当前地图上的过客与小事记号摆出来。 */
  function sync() {
    ground.sync();
    traces.sync();
    const { game } = scene.deps;
    const mapId = scene.map.id;
    // 集日渡口立木牌的外乡钓客也照过客的样子站着（sim/plugins/fair-match.js）
    const host = game.ask('match');
    // 路过的外乡过客（sim/plugins/passers.js）也一样
    const list = [
      ...game.ask('visitors').active,
      ...(host ? [host] : []),
      ...game.ask('passers'),
    ].filter(v => v.map === mapId);
    const keep = new Set(list.map(v => v.id));
    for (const [id, w] of walkers) {
      if (!keep.has(id)) {
        destroyWalker(w);
        walkers.delete(id);
      }
    }
    for (const v of list) {
      let w = walkers.get(v.id);
      if (!w) {
        w = new Walker(scene, v.look, v.x, v.y, v.dir);
        w.id = v.id;
        w.visitor = v;
        w.badge = scene.add
          .image(Math.round(w.px), Math.round(w.py) - 31, 'emote:dots')
          .setOrigin(0.5, 1)
          .setDepth(DEPTH.emote)
          .setScale(0.75);
        walkers.set(v.id, w);
      } else {
        w.visitor = v;
      }
      w.badge.setVisible(!v.done);
      w.badge.setPosition(Math.round(w.px), Math.round(w.py) - 31);
    }

    const ev = game.ask('events').active;
    clearEvent();
    if (ev && ev.map === mapId) {
      const px = ev.x * TILE + 8;
      const py = ev.y * TILE + 12;
      eventRing = scene.add
        .image(px, py + 1, 'shadow')
        .setOrigin(0.5, 0.5)
        .setDepth(py - 0.5);
      eventMark = scene.add
        .image(px, py - 14, 'emote:exclaim')
        .setOrigin(0.5, 1)
        .setDepth(DEPTH.emote);
      eventTween = scene.tweens.add({
        targets: eventMark,
        y: py - 18,
        duration: 620,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  /** 这一格有没有过客站着。 */
  function visitorAt(x, y) {
    for (const w of walkers.values()) {
      if (w.tile.x === x && w.tile.y === y) return w;
    }
    return null;
  }

  /** 点在像素 (wx, wy) 上是不是点中了某位过客。 */
  function visitorNearPixel(wx, wy) {
    for (const w of walkers.values()) {
      if (Math.abs(w.px - wx) < 9 && wy < w.py + 3 && wy > w.py - 28) return w;
    }
    return null;
  }

  /** 这一格有没有待处理的小事。 */
  function eventAt(x, y) {
    const ev = scene.deps.game.ask('events').active;
    return ev && ev.map === scene.map.id && ev.x === x && ev.y === y ? ev : null;
  }

  /** 点在像素 (wx, wy) 上是不是点中了世界里的小事记号。 */
  function eventNearPixel(wx, wy) {
    const ev = scene.deps.game.ask('events').active;
    if (!ev || ev.map !== scene.map.id) return null;
    const px = ev.x * TILE + 8;
    const py = ev.y * TILE + 12;
    return Math.abs(px - wx) < 12 && wy < py + 8 && wy > py - 30 ? ev : null;
  }

  /** 走到过客跟前：转过身来，打开底部对话条。 */
  function interactVisitor(actor) {
    const { shell, platform } = scene.deps;
    actor.face(dirTo(actor.tile, scene.player.tile));
    scene.player.face(dirTo(scene.player.tile, actor.tile));
    platform.audio.play('talk');
    shell.set({
      modal: {
        kind: 'visitor',
        id: actor.id,
        line: actor.visitor.greeting,
        anchor: scene.headOnScreen(actor),
      },
    });
  }

  /** 走到小事跟前：面向该处，打开底部对话条做选择。 */
  function interactEvent(ev) {
    const { shell, platform } = scene.deps;
    if (ev.x !== scene.player.tile.x || ev.y !== scene.player.tile.y) {
      scene.player.face(dirTo(scene.player.tile, ev));
    }
    platform.audio.play('talk');
    shell.set({ modal: { kind: 'event' } });
  }

  /** 规则结算后把结果在世界里演出来：做动作、冒表情，状态与得失交给头顶飘字。 */
  function onFacts(facts) {
    ground.onFacts(facts);
    const { platform } = scene.deps;
    let needSync = false;
    for (const f of facts) {
      const d = f.data;
      if (f.type === 'pulse.resolved') {
        needSync = true;
        scene.player.setPose('raise');
        // guard 当场就跑传进去的函数，所以要包在回调里面，到点才收手
        scene.time.delayedCall(260, () => scene.guard(() => scene.player.setPose(null)));
        showEmote(scene, scene.player, d.success ? 'star' : 'sweat');
        platform.audio.play(d.success ? 'harvest' : 'talk');
      } else if (f.type === 'visitor.talked' || f.type === 'visitor.fulfilled') {
        needSync = true;
        const w = walkers.get(d.id);
        if (w) showEmote(scene, w, f.type === 'visitor.fulfilled' ? 'coin' : 'tea');
        platform.audio.play(f.type === 'visitor.fulfilled' ? 'harvest' : 'talk');
      } else if (f.type.startsWith('match.') && f.type !== 'match.cast') {
        // 比鱼：气泡里是钓客的话，旁白和围观的人说的一句一句冒在画面上
        needSync = true;
        for (const note of d.notes || []) scene.deps.shell.toast(note, true);
        const w = walkers.get('match.' + d.host);
        if (w && d.result) showEmote(scene, w, d.result === 'lose' ? 'coin' : 'sweat');
        platform.audio.play(d.result === 'win' ? 'harvest' : 'talk');
      } else if (f.type === 'passer.picked') {
        // 过客：气泡里是他的话，旁白、村民插的话一句一句冒在画面上
        needSync = true;
        for (const note of d.notes || []) scene.deps.shell.toast(note, true);
        const w = walkers.get(d.id);
        if (w && d.end)
          showEmote(scene, w, d.end === 'ok' ? 'heart' : d.end === 'bad' ? 'sweat' : 'tea');
        platform.audio.play(d.end === 'ok' ? 'harvest' : 'talk');
      } else if (
        [
          'day.started',
          'action.performed',
          'meal.cooked',
          'tea.done',
          'market.bought',
          'time.passed',
          'match.cast',
          'prize.used',
          'gift.given',
        ].includes(f.type)
      ) {
        needSync = true;
      }
    }
    if (needSync) sync();
  }

  /** 每一帧：有动静的地方晃一晃，地上的野货闪一闪、踩上去就捡。 */
  function frame(delta) {
    stirCues(scene, delta);
    ground.frame(delta);
  }

  function destroy() {
    ground.destroy();
    clearEvent();
    for (const w of walkers.values()) destroyWalker(w);
    walkers.clear();
  }

  return {
    sync,
    allWalkers: () => [...walkers.values()],
    visitorAt,
    visitorNearPixel,
    eventAt,
    eventNearPixel,
    interactVisitor,
    interactEvent,
    onFacts,
    frame,
    destroy,
  };
}
