// 运行环境：浏览器。凡是“换一个环境就要换写法”的东西都收在平台层：
// 存档放哪、怎么知道窗口被切走了、是键鼠还是触屏、怎么出声。
// 以后要上桌面壳（Electron、Tauri）或别的平台，照着这个文件的形状再写一个，其余代码不动。

const SAVE_KEY = 'dao.save.v1';

function storage() {
  return {
    /** 读存档；没有或读不了就返回 null。 */
    load() {
      try {
        const text = localStorage.getItem(SAVE_KEY);
        return text ? JSON.parse(text) : null;
      } catch {
        return null;
      }
    },
    /** 写存档；写不了（隐私模式、空间满）返回 false，不抛错。 */
    save(data) {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        return true;
      } catch {
        return false;
      }
    },
    clear() {
      try {
        localStorage.removeItem(SAVE_KEY);
      } catch {
        /* 清不掉就算了 */
      }
    },
  };
}

// 设备：现在是用手指还是用键鼠。不看机器“有没有触屏”（触屏笔记本两样都有），
// 而是看主要的指点方式，再跟着玩家最近一次实际用的是什么来切换。
function device() {
  const coarse = matchMedia('(pointer: coarse)');
  const listeners = new Set();
  let touch = coarse.matches;
  const read = () => ({
    touch,
    keyboard: !touch,
    narrow: innerWidth < 720,
    portrait: innerHeight > innerWidth,
  });
  const notify = () => listeners.forEach(fn => fn(read()));
  const use = next => {
    if (next === touch) return;
    touch = next;
    notify();
  };
  addEventListener('pointerdown', event => event.pointerType === 'touch' && use(true), true);
  addEventListener('keydown', () => use(false), true);
  coarse.addEventListener('change', () => use(coarse.matches));
  addEventListener('resize', notify);
  return {
    profile: read,
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

// 声音：不带音频文件，用振荡器和噪声现合成几种短促的响动。头一次有输入之后才能出声。
function audio() {
  let ctx = null;
  let muted = false;
  const ensure = () => {
    if (!ctx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (Ctor) ctx = new Ctor();
    }
    if (ctx?.state === 'suspended') ctx.resume();
    return ctx;
  };
  const tone = (freq, to, time, type, gain) => {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(to, ctx.currentTime + time);
    amp.gain.setValueAtTime(gain, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time);
    osc.connect(amp).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + time);
  };
  const hiss = (time, gain, cutoff) => {
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * time), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const amp = ctx.createGain();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    amp.gain.value = gain;
    src.buffer = buffer;
    src.connect(filter).connect(amp).connect(ctx.destination);
    src.start();
  };
  const sounds = {
    hoe: () => (tone(150, 60, 0.12, 'triangle', 0.25), hiss(0.09, 0.2, 900)),
    seed: () => tone(700, 420, 0.07, 'sine', 0.12),
    water: () => hiss(0.32, 0.16, 2600),
    harvest: () => (tone(520, 780, 0.09, 'sine', 0.16), tone(780, 1040, 0.12, 'sine', 0.1)),
    refill: () => (hiss(0.4, 0.14, 1400), tone(300, 520, 0.3, 'sine', 0.06)),
    talk: () => tone(440, 520, 0.06, 'sine', 0.08),
    no: () => tone(180, 140, 0.1, 'square', 0.05),
    day: () => (tone(392, 392, 0.5, 'sine', 0.08), tone(587, 587, 0.7, 'sine', 0.05)),
  };
  return {
    play(name) {
      if (muted || !ensure() || !sounds[name]) return;
      sounds[name]();
    },
    unlock: ensure,
    muted: () => muted,
    setMuted(value) {
      muted = value;
    },
  };
}

export function createWebPlatform() {
  return {
    name: 'web',
    storage: storage(),
    device: device(),
    audio: audio(),
    /** 窗口被切走或要关掉时调用 fn（用来存档、松开按键）。 */
    onHide(fn) {
      const handler = () => document.visibilityState === 'hidden' && fn();
      document.addEventListener('visibilitychange', handler);
      addEventListener('pagehide', fn);
      addEventListener('blur', fn);
      return () => {
        document.removeEventListener('visibilitychange', handler);
        removeEventListener('pagehide', fn);
        removeEventListener('blur', fn);
      };
    },
    /** 新开一局用的随机种子。 */
    seed: () => (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0,
    /** 网址里带 ?debug 时打开写入检查和调试入口。 */
    debug: () => new URLSearchParams(location.search).has('debug'),
  };
}
