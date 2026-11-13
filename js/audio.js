/* 词源 · audio.js — 以 WebAudio 合成的中式乐器（不用任何采样）
 *   古琴 guqin   · 低沉的拨弦，带吟猱（揉弦）与走手音（滑音），另有泛音
 *   古筝 zheng   · 明亮的拨弦，刮奏如流水
 *   琵琶 pipa    · 颗粒短促，轮指
 *   笛 / 箫      · 气声 + 倚音 + 颤音；笛亮箫幽
 *   编钟 / 磬    · 非谐泛音的金石之声
 *   鼓 / 木鱼
 * 音高一律取五声音阶（宫商角徵羽）。四时换调：春-角 夏-徵 秋-商 冬-羽，平日为宫。
 * 平仄入乐：平声字奏平直的长音，仄声字奏带滑音的折音。
 */
(function () {
  'use strict';
  const MS = (window.MS = window.MS || {});
  const PENT = [0, 2, 4, 7, 9];                 // 宫 商 角 徵 羽（以 D 为宫）
  const MODES = { '': 0, '秋': 1, '春': 2, '夏': 3, '冬': 4 };
  const BASE = 146.83;                           // D3
  const A = {
    enabled: false, ready: false, mode: 0, ctx: null,
    walk: 5, nextNote: 2, bed: 0
  };

  function init() {
    if (A.ready) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    const ctx = (A.ctx = new AC());
    A.master = ctx.createGain(); A.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 3.5; comp.attack.value = 0.005; comp.release.value = 0.3;
    A.master.connect(comp); comp.connect(ctx.destination);
    // 混响：一间木构的厅堂
    const len = (ctx.sampleRate * 3.2) | 0, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        lp += ((Math.random() * 2 - 1) - lp) * (0.55 - t * 0.4);
        d[i] = lp * Math.pow(1 - t, 2.6) * (i < 400 ? i / 400 : 1);
      }
    }
    A.rev = ctx.createConvolver(); A.rev.buffer = ir;
    A.wet = ctx.createGain(); A.wet.gain.value = 0.5;
    A.rev.connect(A.wet); A.wet.connect(A.master);
    // 白噪声
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    A.noise = nb;
    A.ks = {};
    A.ready = true;
    return true;
  }

  A.setEnabled = function (on) {
    if (on && !init()) return false;
    A.enabled = on;
    if (!A.ready) return on;
    if (on && A.ctx.state === 'suspended') A.ctx.resume();
    A.master.gain.cancelScheduledValues(A.ctx.currentTime);
    A.master.gain.setTargetAtTime(on ? 0.85 : 0, A.ctx.currentTime, 0.15);
    return on;
  };

  /* 第 i 级音（i=0 为当前调式的主音，可为负） */
  function freq(i) {
    const k = i + A.mode, oct = Math.floor(k / 5), deg = ((k % 5) + 5) % 5;
    return BASE * Math.pow(2, (PENT[deg] + 12 * oct) / 12);
  }
  function out(node, pan, send) {
    const ctx = A.ctx;
    let last = node;
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan || 0)); node.connect(p); last = p; }
    last.connect(A.master);
    if (send !== 0) { const s = ctx.createGain(); s.gain.value = send == null ? 0.35 : send; last.connect(s); s.connect(A.rev); }
  }
  const now = () => A.ctx.currentTime;

  /* ---------- 拨弦（Karplus–Strong，离线算好再放） ---------- */
  function ksBuffer(f, dur, bright, stretch, damp) {
    const sr = A.ctx.sampleRate, N = Math.max(2, Math.round(sr / f));
    const key = N + '|' + dur + '|' + bright + '|' + stretch + '|' + damp;
    if (A.ks[key]) return A.ks[key];
    const len = (sr * dur) | 0, buf = A.ctx.createBuffer(1, len, sr), d = buf.getChannelData(0), ring = new Float32Array(N);
    let lp = 0;
    for (let i = 0; i < N; i++) { lp += ((Math.random() * 2 - 1) - lp) * bright; ring[i] = lp; }
    const pick = Math.max(1, (N * 0.18) | 0);            // 弹弦点：削去部分泛音
    for (let i = N - 1; i >= pick; i--) ring[i] -= ring[i - pick] * 0.6;
    let idx = 0, peak = 1e-6;
    for (let i = 0; i < len; i++) {
      const nx = idx + 1 === N ? 0 : idx + 1, v = ring[idx];
      d[i] = v; if (Math.abs(v) > peak) peak = Math.abs(v);
      ring[idx] = damp * (stretch * v + (1 - stretch) * ring[nx]);
      idx = nx;
    }
    const fade = (sr * 0.08) | 0;
    for (let i = 0; i < len; i++) d[i] = (d[i] / peak) * (i > len - fade ? (len - i) / fade : 1);
    buf._f = sr / N;
    const keys = Object.keys(A.ks);
    if (keys.length > 140) delete A.ks[keys[0]];
    return (A.ks[key] = buf);
  }
  /* o: {vol, pan, bend(半音, 仄声的折), slide(从几半音滑来), vib(吟猱), send} */
  function pluck(kind, f, t, o) {
    o = o || {};
    const P = { zheng: [3.2, 0.85, 0.5, 0.9985], qin: [5.5, 0.3, 0.5, 0.9993], pipa: [1.1, 1.0, 0.5, 0.994] }[kind];
    const buf = ksBuffer(f, P[0], P[1], P[2], P[3]), ctx = A.ctx;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const r = f / buf._f, pr = src.playbackRate;
    pr.setValueAtTime(r, t);
    if (o.slide) { pr.setValueAtTime(r * Math.pow(2, o.slide / 12), t); pr.exponentialRampToValueAtTime(r, t + 0.22); }
    if (o.bend) { pr.setValueAtTime(r, t + 0.06); pr.exponentialRampToValueAtTime(r * Math.pow(2, o.bend / 12), t + 0.26); pr.exponentialRampToValueAtTime(r, t + 0.62); }
    if (o.vib) {
      const n = 48, curve = new Float32Array(n);
      for (let i = 0; i < n; i++) curve[i] = r * (1 + Math.sin(i / n * Math.PI * 2 * 5) * 0.011 * (1 - i / n));
      try { pr.setValueCurveAtTime(curve, t + (o.bend ? 0.7 : 0.3), 1.3); } catch (err) { /* 与其它自动化重叠时忽略 */ }
    }
    const g = ctx.createGain(); g.gain.value = (o.vol == null ? 0.5 : o.vol);
    const body = ctx.createBiquadFilter(); body.type = 'peaking';
    body.frequency.value = kind === 'qin' ? 190 : kind === 'pipa' ? 620 : 320; body.Q.value = 1.1; body.gain.value = 5;
    const lpf = ctx.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = kind === 'qin' ? 2600 : 7800;
    src.connect(body); body.connect(lpf); lpf.connect(g);
    out(g, o.pan, o.send == null ? (kind === 'qin' ? 0.5 : 0.3) : o.send);
    src.start(t);
  }
  /* 泛音：清、远 */
  function harmonic(f, t, o) {
    o = o || {};
    const ctx = A.ctx, g = ctx.createGain(), v = o.vol == null ? 0.2 : o.vol;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0005, t + (o.dur || 2.6));
    for (const [m, a] of [[1, 1], [2, 0.22], [3, 0.06]]) {
      const os = ctx.createOscillator(), og = ctx.createGain();
      os.frequency.value = f * m; og.gain.value = a; os.connect(og); og.connect(g); os.start(t); os.stop(t + (o.dur || 2.6) + 0.1);
    }
    out(g, o.pan, 0.6);
  }

  /* ---------- 笛 / 箫 ---------- */
  function flute(f, t, dur, o) {
    o = o || {};
    const ctx = A.ctx, xiao = o.xiao, v = (o.vol == null ? 0.2 : o.vol);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + (xiao ? 0.11 : 0.045));
    g.gain.setValueAtTime(v, t + Math.max(0.05, dur - 0.08)); g.gain.linearRampToValueAtTime(0, t + dur + (xiao ? 0.22 : 0.09));
    const parts = xiao ? [[1, 1], [2, 0.2], [3, 0.05]] : [[1, 1], [2, 0.42], [3, 0.2], [4, 0.07]];
    const lfo = ctx.createOscillator(), ld = ctx.createGain();
    lfo.frequency.value = xiao ? 4.6 : 5.6;
    ld.gain.setValueAtTime(0, t); ld.gain.linearRampToValueAtTime(f * (o.vib == null ? 0.007 : o.vib), t + Math.min(0.5, dur * 0.6));
    lfo.connect(ld); lfo.start(t); lfo.stop(t + dur + 0.4);
    for (const [m, a] of parts) {
      const os = ctx.createOscillator(), og = ctx.createGain();
      os.type = 'sine';
      const from = o.grace ? f * Math.pow(2, o.grace / 12) : f;
      os.frequency.setValueAtTime(from * m, t);
      if (o.grace) os.frequency.exponentialRampToValueAtTime(f * m, t + 0.07);
      if (o.fall) { os.frequency.setValueAtTime(f * m, t + dur * 0.55); os.frequency.exponentialRampToValueAtTime(f * m * Math.pow(2, o.fall / 12), t + dur); }
      const md = ctx.createGain(); md.gain.value = m; ld.connect(md); md.connect(os.frequency);
      og.gain.value = a; os.connect(og); og.connect(g);
      os.start(t); os.stop(t + dur + 0.4);
    }
    // 气声
    const n = ctx.createBufferSource(); n.buffer = A.noise; n.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * (xiao ? 1.5 : 2.2); bp.Q.value = xiao ? 0.9 : 1.6;
    const ng = ctx.createGain(); ng.gain.value = xiao ? 0.5 : 0.22;
    n.connect(bp); bp.connect(ng); ng.connect(g); n.start(t, Math.random()); n.stop(t + dur + 0.4);
    out(g, o.pan, xiao ? 0.7 : 0.45);
  }

  /* ---------- 金石：编钟、磬 ---------- */
  function bell(f, t, o) {
    o = o || {};
    const ctx = A.ctx, v = o.vol == null ? 0.3 : o.vol, long = o.long || 1;
    const g = ctx.createGain(); g.gain.value = v;
    const parts = o.qing ? [[1, 1, 1.6], [2.76, 0.4, 0.9], [5.4, 0.16, 0.5]]
      : [[1, 1, 4.2], [1.19, 0.3, 2.2], [2.0, 0.52, 2.8], [2.44, 0.26, 1.8], [3.0, 0.2, 1.4], [4.1, 0.1, 0.9], [5.36, 0.05, 0.6]];
    for (const [m, a, d] of parts) {
      const os = ctx.createOscillator(), og = ctx.createGain();
      os.frequency.value = f * m;
      og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(a, t + 0.004); og.gain.exponentialRampToValueAtTime(0.0004, t + d * long);
      os.connect(og); og.connect(g); os.start(t); os.stop(t + d * long + 0.1);
    }
    const n = ctx.createBufferSource(); n.buffer = A.noise;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 3; bp.Q.value = 2;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.5, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    n.connect(bp); bp.connect(ng); ng.connect(g); n.start(t, Math.random()); n.stop(t + 0.08);
    out(g, o.pan, 0.6);
  }

  /* ---------- 鼓、木鱼 ---------- */
  function drum(t, o) {
    o = o || {};
    const ctx = A.ctx, v = o.vol == null ? 0.7 : o.vol, f = o.f || 96;
    const g = ctx.createGain(); g.gain.value = v;
    const os = ctx.createOscillator(), og = ctx.createGain();
    os.frequency.setValueAtTime(f * 1.9, t); os.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.16);
    og.gain.setValueAtTime(1, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    os.connect(og); og.connect(g); os.start(t); os.stop(t + 0.8);
    const o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o2.frequency.value = f * 2.3; g2.gain.setValueAtTime(0.3, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o2.connect(g2); g2.connect(g); o2.start(t); o2.stop(t + 0.25);
    const n = ctx.createBufferSource(); n.buffer = A.noise;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.7, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    n.connect(lp); lp.connect(ng); ng.connect(g); n.start(t, Math.random()); n.stop(t + 0.12);
    out(g, o.pan, 0.4);
  }
  function woodfish(t, f, vol) {
    const ctx = A.ctx, g = ctx.createGain(), os = ctx.createOscillator();
    os.frequency.setValueAtTime(f, t); os.frequency.exponentialRampToValueAtTime(f * 0.86, t + 0.08);
    g.gain.setValueAtTime(vol == null ? 0.25 : vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    os.connect(g); os.start(t); os.stop(t + 0.16);
    out(g, 0, 0.4);
  }

  /* ---------- 自然之声 ---------- */
  function noiseSweep(t, dur, f0, f1, f2, q, vol, pan, type) {
    const ctx = A.ctx, n = ctx.createBufferSource(); n.buffer = A.noise; n.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = type || 'bandpass'; bp.Q.value = q;
    bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.45); bp.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.3); g.gain.linearRampToValueAtTime(0, t + dur);
    n.connect(bp); bp.connect(g); n.start(t, Math.random()); n.stop(t + dur + 0.1);
    out(g, pan, 0.3);
  }
  function chirp(t, f, vol, pan, up) {
    const ctx = A.ctx, os = ctx.createOscillator(), g = ctx.createGain();
    os.frequency.setValueAtTime(f, t); os.frequency.exponentialRampToValueAtTime(f * (up || 1.5), t + 0.05); os.frequency.exponentialRampToValueAtTime(f * 1.1, t + 0.1);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    os.connect(g); os.start(t); os.stop(t + 0.14);
    out(g, pan, 0.5);
  }
  function cricket(t, pan) {
    const ctx = A.ctx;
    for (let k = 0; k < 3 + ((Math.random() * 3) | 0); k++) {
      const os = ctx.createOscillator(), g = ctx.createGain(), am = ctx.createOscillator(), ag = ctx.createGain();
      const s = t + k * 0.19;
      os.frequency.value = 4300 + Math.random() * 200; am.frequency.value = 62; ag.gain.value = 0.02;
      g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(0.02, s + 0.01); g.gain.setValueAtTime(0.02, s + 0.09); g.gain.linearRampToValueAtTime(0, s + 0.12);
      am.connect(ag); ag.connect(g.gain); os.connect(g); os.start(s); os.stop(s + 0.14); am.start(s); am.stop(s + 0.14);
      out(g, pan, 0.3);
    }
  }
  function blip(t, pan) {
    const ctx = A.ctx, os = ctx.createOscillator(), g = ctx.createGain();
    os.frequency.setValueAtTime(380, t); os.frequency.exponentialRampToValueAtTime(900, t + 0.05);
    g.gain.setValueAtTime(0.14, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    os.connect(g); os.start(t); os.stop(t + 0.1);
    out(g, pan, 0.5);
  }

  /* ---------- 乐句 ---------- */
  const R = (a, b) => a + Math.random() * (b - a);
  function gliss(t, from, to, step, vol, pan) {         // 古筝刮奏
    const n = Math.abs(to - from), d = to > from ? 1 : -1;
    for (let i = 0; i <= n; i++) pluck('zheng', freq(from + d * i), t + i * step, { vol: vol * (0.6 + 0.4 * i / n), pan: (pan || 0) + (i / n - 0.5) * 0.5 });
  }
  function tremolo(kind, i, t, dur, vol, pan) {         // 轮指 / 摇指
    const n = (dur * 13) | 0;
    for (let k = 0; k < n; k++) pluck(kind, freq(i), t + k / 13 + R(0, 0.012), { vol: vol * (0.55 + 0.45 * Math.sin(Math.PI * k / n)), pan, send: 0.25 });
  }
  function phrase(inst, notes, t, o) {                  // notes: [[级, 时值], ...]
    let tt = t;
    for (const [i, d] of notes) {
      if (i != null) {
        if (inst === 'di') flute(freq(i + 10), tt, d * 0.92, Object.assign({ grace: Math.random() < 0.5 ? -2 : 0 }, o));
        else if (inst === 'xiao') flute(freq(i + 5), tt, d * 0.96, Object.assign({ xiao: true }, o));
        else pluck(inst, freq(i), tt, o);
      }
      tt += d;
    }
    return tt;
  }

  /* 字落成灵时，各奏各的声 */
  const BLOOM = {
    mountain: (t, p) => { pluck('qin', freq(-5), t, { vol: 0.75, pan: p, vib: 1 }); pluck('qin', freq(-2), t + 0.9, { vol: 0.6, pan: p, slide: -2 }); },
    water: (t, p) => { gliss(t, 14, 3, 0.055, 0.34, p); gliss(t + 0.75, 2, 9, 0.07, 0.26, p); },
    cloud: (t, p) => phrase('xiao', [[2, 1.5], [4, 2.2]], t, { vol: 0.15, pan: p }),
    mist: (t, p) => phrase('xiao', [[0, 2.4]], t, { vol: 0.13, pan: p, fall: -2 }),
    glow: (t, p) => phrase('xiao', [[4, 1.3], [3, 1.3], [1, 2.4]], t, { vol: 0.15, pan: p }),
    rain: (t, p) => { for (let k = 0; k < 9; k++) pluck('pipa', freq(10 + ((Math.random() * 8) | 0)), t + k * 0.11 + R(0, 0.05), { vol: 0.22, pan: R(-0.8, 0.8) }); },
    snow: (t, p) => { for (let k = 0; k < 4; k++) bell(freq(15 + k * 2), t + k * 0.42, { qing: true, vol: 0.1, pan: R(-0.6, 0.6) }); },
    wind: (t, p) => { noiseSweep(t, 4.5, 260, 950, 300, 0.9, 0.3, p); flute(freq(7), t + 0.3, 2.4, { xiao: true, vol: 0.12, fall: -3, pan: p }); },
    sun: (t, p) => { bell(freq(5), t, { vol: 0.26, pan: p }); bell(freq(8), t + 0.02, { vol: 0.16, pan: p }); phrase('di', [[0, 0.3], [2, 0.3], [4, 0.9]], t + 0.5, { vol: 0.14, pan: p }); },
    moon: (t, p) => { harmonic(freq(10), t, { vol: 0.22, pan: p }); harmonic(freq(13), t + 0.7, { vol: 0.18, pan: p }); harmonic(freq(12), t + 1.5, { vol: 0.2, pan: p, dur: 3.6 }); },
    stars: (t, p) => { for (let k = 0; k < 6; k++) bell(freq(15 + ((Math.random() * 7) | 0)), t + k * 0.23 + R(0, 0.1), { qing: true, vol: 0.08, pan: R(-0.8, 0.8) }); },
    rainbow: (t, p) => gliss(t, 2, 17, 0.085, 0.34, p),
    bamboo: (t, p) => phrase('di', [[2, 0.28], [4, 0.28], [5, 0.5], [4, 0.2], [2, 0.9]], t, { vol: 0.15, pan: p }),
    pine: (t, p) => { pluck('qin', freq(0), t, { vol: 0.7, pan: p, vib: 1 }); pluck('qin', freq(2), t + 1.1, { vol: 0.55, pan: p, slide: 2, vib: 1 }); },
    willow: (t, p) => { tremolo('zheng', 9, t, 1.2, 0.2, p); pluck('zheng', freq(7), t + 1.3, { vol: 0.34, pan: p, bend: -2 }); },
    plum: (t, p) => phrase('di', [[-1, 0.5], [2, 0.5], [3, 0.5], [-1, 1.2]], t, { vol: 0.15, pan: p }),       // 徵-宫-商，取意「梅花三弄」泛音句
    flower: (t, p) => { tremolo('pipa', 12, t, 0.7, 0.2, p); phrase('pipa', [[11, 0.16], [10, 0.16], [9, 0.3]], t + 0.75, { vol: 0.3, pan: p }); },
    lotus: (t, p) => { phrase('zheng', [[7, 0.35], [9, 0.35], [10, 0.8]], t, { vol: 0.34, pan: p }); harmonic(freq(15), t + 1.2, { vol: 0.12, pan: p }); },
    mum: (t, p) => phrase('qin', [[4, 0.7], [2, 0.7], [0, 1.4]], t, { vol: 0.6, pan: p, vib: 1 }),
    grass: (t, p) => phrase('pipa', [[7, 0.14], [9, 0.3]], t, { vol: 0.22, pan: p }),
    boat: (t, p) => phrase('zheng', [[9, 0.5], [7, 0.5], [5, 0.5], [4, 1.1], [5, 0.5], [2, 1.2]], t, { vol: 0.34, pan: p }),
    tower: (t, p) => { bell(freq(0), t, { vol: 0.3, pan: p, long: 1.3 }); bell(freq(3), t + 0.5, { vol: 0.2, pan: p }); },
    lantern: (t, p) => { for (let k = 0; k < 3; k++) bell(freq(12 + k * 2), t + k * 0.3, { qing: true, vol: 0.11, pan: p }); },
    fire: (t, p) => { drum(t, { vol: 0.35, f: 70, pan: p }); noiseSweep(t, 1.3, 500, 2600, 900, 0.7, 0.12, p); },
    butterfly: (t, p) => { for (let k = 0; k < 5; k++) harmonic(freq(15 + [0, 2, 1, 3, 2][k]), t + k * 0.15, { vol: 0.1, pan: p + R(-0.2, 0.2), dur: 1.1 }); },
    insects: (t, p) => { cricket(t, p); cricket(t + 0.9, -p); },
    night: (t) => phrase('xiao', [[0, 1.6], [-2, 1.0], [-3, 2.6]], t, { vol: 0.17 }),
    day: (t) => phrase('di', [[0, 0.24], [2, 0.24], [4, 0.24], [5, 0.7], [7, 1.1]], t, { vol: 0.15 }),
    // —— 为古文添的字
    frost: (t, p) => { for (let k = 0; k < 3; k++) bell(freq(17 + k * 2), t + k * 0.6, { qing: true, vol: 0.07, pan: R(-0.6, 0.6) }); },
    light: (t, p) => { harmonic(freq(12), t, { vol: 0.2, pan: p }); harmonic(freq(16), t + 0.5, { vol: 0.16, pan: p }); harmonic(freq(19), t + 1.0, { vol: 0.12, pan: p }); },
    pool: (t, p) => { gliss(t, 9, 1, 0.09, 0.28, p); pluck('qin', freq(-5), t + 0.9, { vol: 0.6, pan: p, vib: 1 }); },
    rock: (t, p) => { pluck('qin', freq(-7), t, { vol: 0.75, pan: p }); pluck('qin', freq(-5), t + 0.8, { vol: 0.5, pan: p, slide: -2 }); },
    grove: (t, p) => { pluck('qin', freq(0), t, { vol: 0.6, pan: p, vib: 1 }); phrase('xiao', [[4, 1.0], [2, 1.8]], t + 0.5, { vol: 0.13, pan: p }); },
    orchid: (t, p) => phrase('xiao', [[7, 0.9], [9, 0.7], [7, 1.8]], t, { vol: 0.13, pan: p }),
    zhi: (t, p) => { harmonic(freq(9), t, { vol: 0.2, pan: p }); harmonic(freq(14), t + 0.6, { vol: 0.15, pan: p }); },
    duck: (t, p) => { flute(freq(9), t, 0.22, { xiao: true, vol: 0.1, fall: -2, pan: p }); flute(freq(7), t + 0.34, 0.3, { xiao: true, vol: 0.09, fall: -3, pan: p }); },
    feather: (t, p) => { for (let k = 0; k < 3; k++) harmonic(freq(19 - k * 2), t + k * 0.28, { vol: 0.1, pan: p + R(-0.2, 0.2), dur: 1.2 }); },
    pearl: (t, p) => { bell(freq(19), t, { qing: true, vol: 0.12, pan: p }); bell(freq(21), t + 0.22, { qing: true, vol: 0.09, pan: p }); },
    banner: (t, p) => { noiseSweep(t, 1.6, 300, 800, 400, 0.8, 0.14, p); drum(t + 0.1, { vol: 0.3, f: 110, pan: p }); },
    cart: (t, p) => { for (let k = 0; k < 4; k++) woodfish(t + k * 0.26, 300 - k * 14, 0.2); pluck('pipa', freq(4), t + 1.1, { vol: 0.24, pan: p }); },
    horse: (t, p) => { for (let k = 0; k < 6; k++) woodfish(t + k * 0.17 + (k % 2) * 0.05, k % 2 ? 620 : 520, 0.22); },
    person: (t, p) => phrase('qin', [[0, 0.8], [2, 0.6], [-1, 1.6]], t, { vol: 0.6, pan: p, vib: 1 }),
    goddess: (t, p) => { gliss(t, 5, 16, 0.07, 0.26, p); phrase('xiao', [[9, 1.0], [11, 0.7], [9, 2.2]], t + 0.8, { vol: 0.14, pan: p }); },
    maple: (t, p) => { pluck('qin', freq(2), t, { vol: 0.6, pan: p, vib: 1 }); phrase('xiao', [[4, 0.9], [2, 0.7], [1, 1.8]], t + 0.4, { vol: 0.13, pan: p, fall: -2 }); },
    wine: (t, p) => { bell(freq(14), t, { qing: true, vol: 0.1, pan: p }); phrase('pipa', [[7, 0.2], [9, 0.2], [7, 0.4], [4, 0.6]], t + 0.25, { vol: 0.26, pan: p }); },
    spring: (t, p) => { for (let k = 0; k < 6; k++) pluck('zheng', freq(14 - k), t + k * 0.24 + R(0, 0.05), { vol: 0.2, pan: p + R(-0.2, 0.2) }); },
    ice: (t, p) => { for (let k = 0; k < 3; k++) bell(freq(20 - k * 3), t + k * 0.5, { qing: true, vol: 0.09, pan: p }); noiseSweep(t + 1.2, 0.25, 3000, 6000, 2000, 2, 0.08, p); },
    dew: (t, p) => { for (let k = 0; k < 3; k++) bell(freq(18 + k * 2), t + k * 0.55, { qing: true, vol: 0.07, pan: p + R(-0.3, 0.3) }); },
    sea: (t, p) => { noiseSweep(t, 3.6, 200, 900, 240, 0.7, 0.3, p); gliss(t + 0.4, 0, 9, 0.11, 0.3, p); },
    city: (t, p) => { bell(freq(-5), t, { vol: 0.3, pan: p, long: 1.4 }); drum(t + 0.9, { vol: 0.4, f: 80, pan: p }); },
    leaf: (t, p) => phrase('zheng', [[9, 0.3], [7, 0.3], [5, 0.6]], t, { vol: 0.28, pan: p }),
    phoenix: (t, p) => { phrase('di', [[4, 0.2], [7, 0.2], [9, 0.3], [12, 0.9]], t, { vol: 0.14, pan: p }); gliss(t + 0.2, 5, 16, 0.06, 0.24, p); },
    egret: (t, p) => phrase('xiao', [[9, 0.9], [7, 1.6]], t, { vol: 0.12, pan: p }),
    bee: (t, p) => tremolo('pipa', 12, t, 0.9, 0.12, p),
    shrimp: (t, p) => { for (let k = 0; k < 4; k++) pluck('zheng', freq(12 + [0, 2, 1, 4][k]), t + k * 0.16, { vol: 0.2, pan: p + R(-0.2, 0.2) }); },
    tiger: (t, p) => { drum(t, { vol: 0.8, f: 60, pan: p }); noiseSweep(t, 1.6, 240, 110, 70, 0.6, 0.4, p, 'lowpass'); pluck('qin', freq(-7), t + 0.1, { vol: 0.7, pan: p, slide: -3 }); },
    ox: (t, p) => phrase('di', [[4, 0.3], [5, 0.2], [4, 0.5], [2, 0.3], [4, 0.9]], t, { vol: 0.12, pan: p, vib: 0.03 }),
    ape: (t, p) => { flute(freq(14), t, 1.3, { xiao: true, vol: 0.12, fall: -5, pan: p }); flute(freq(12), t + 1.6, 1.7, { xiao: true, vol: 0.1, fall: -7, pan: p }); },
    qin: (t, p) => phrase('qin', [[0, 0.8], [4, 0.6], [2, 0.6], [-1, 1.8]], t, { vol: 0.6, pan: p, vib: 1 }),
    book: (t, p) => { noiseSweep(t, 0.3, 1800, 4000, 2400, 1.2, 0.07, p); pluck('qin', freq(2), t + 0.3, { vol: 0.5, pan: p, vib: 1 }); },
    pen: (t, p) => { pluck('qin', freq(4), t, { vol: 0.5, pan: p, slide: -2 }); woodfish(t + 0.5, 420, 0.14); },
    tea: (t, p) => { for (let k = 0; k < 3; k++) pluck('zheng', freq(9 + k * 2), t + k * 0.28, { vol: 0.2, pan: p }); bell(freq(16), t + 1, { qing: true, vol: 0.08, pan: p }); },
    incense: (t, p) => { bell(freq(9), t, { qing: true, vol: 0.1, pan: p }); phrase('xiao', [[2, 2.2]], t + 0.4, { vol: 0.1, pan: p }); },
    tears: (t, p) => { for (let k = 0; k < 3; k++) pluck('zheng', freq(12 - k * 2), t + k * 0.7, { vol: 0.24, pan: p, bend: -2 }); }
  };

  /* 《琵琶行》里的曲段：诗怎么比，就怎么弹 */
  const SONG = {
    far: (t) => phrase('pipa', [[7, 0.5], [9, 0.5], [7, 0.9], [4, 1.2]], t, { vol: 0.14, pan: -0.5 }),                                   // 忽闻水上琵琶声
    tune: (t) => { [0, 0.9, 1.6].forEach((d, i) => pluck('pipa', freq([2, 4, 2][i]), t + d, { vol: 0.36, bend: i === 2 ? -2 : 0 })); },   // 转轴拨弦三两声
    rain: (t) => { tremolo('pipa', 0, t, 1.7, 0.3, -0.2); tremolo('pipa', 2, t + 0.6, 1.5, 0.28, 0.2); for (let k = 0; k < 14; k++) pluck('pipa', freq(-3 + (k % 4)), t + 0.2 + k * 0.13, { vol: 0.26 }); },   // 大弦嘈嘈如急雨
    pearls: (t) => { [14, 9, 12, 7, 11, 5, 9, 4, 7, 2].forEach((n, k) => pluck('pipa', freq(n), t + k * 0.11 + (k % 2) * 0.02, { vol: k % 2 ? 0.3 : 0.2 })); },   // 大珠小珠落玉盘
    oriole: (t) => phrase('pipa', [[11, 0.12], [12, 0.12], [11, 0.2], [14, 0.14], [12, 0.3], [9, 0.5]], t, { vol: 0.26, pan: 0.2 }),      // 间关莺语花底滑
    spring: (t) => { [[4, 0], [2, 0.9], [1, 2.0], [0, 3.4]].forEach(([n, d]) => pluck('pipa', freq(n), t + d, { vol: 0.24, bend: -2 })); },   // 幽咽泉流冰下难
    burst: (t) => { for (let k = 0; k < 4; k++) pluck('pipa', freq(k * 3), t + 1.3 + k * 0.012, { vol: 0.5 }); noiseSweep(t + 1.3, 0.7, 900, 3200, 700, 0.8, 0.2, 0); },   // 银瓶乍破水浆迸
    riders: (t) => { for (let k = 0; k < 12; k++) for (let j = 0; j < 3; j++) pluck('pipa', freq(j * 2 + (k % 3)), t + k * 0.19 + j * 0.01, { vol: 0.34 }); },            // 铁骑突出刀枪鸣
    tear: (t) => { for (let k = 0; k < 4; k++) pluck('pipa', freq(k * 2 + 2), t + 0.9 + k * 0.004, { vol: 0.6 }); noiseSweep(t + 0.9, 0.5, 2400, 7000, 1200, 1.4, 0.28, 0); },   // 四弦一声如裂帛
    moon: (t) => { harmonic(freq(12), t, { vol: 0.2 }); harmonic(freq(7), t + 1.3, { vol: 0.14 }); },                                     // 唯见江心秋月白
    youth: (t) => phrase('pipa', [[7, 0.2], [9, 0.2], [11, 0.2], [9, 0.2], [12, 0.4], [11, 0.2], [9, 0.2], [7, 0.5]], t, { vol: 0.28 }),  // 一曲红绡不知数
    dream: (t) => phrase('xiao', [[7, 1.2], [9, 0.8], [7, 2.2]], t, { vol: 0.11, fall: -2 }),                                             // 夜深忽梦少年事
    ape: (t) => { flute(freq(14), t, 1.4, { xiao: true, vol: 0.13, fall: -5 }); flute(freq(12), t + 1.7, 1.9, { xiao: true, vol: 0.11, fall: -7 }); },   // 猿哀鸣
    flute: (t) => phrase('di', [[4, 0.3], [5, 0.2], [4, 0.5], [2, 0.3], [4, 0.9]], t, { vol: 0.11, vib: 0.03 }),                          // 山歌与村笛
    urgent: (t) => { for (let k = 0; k < 28; k++) pluck('pipa', freq([7, 9, 7, 5][k % 4] + (k > 15 ? 2 : 0)), t + 2.8 * (1 - Math.pow(1 - k / 28, 1.6)), { vol: 0.2 + k * 0.008 }); },   // 却坐促弦弦转急
    weep: (t) => phrase('xiao', [[4, 1.4], [2, 1.0], [0, 2.4]], t, { vol: 0.13, fall: -2 })                                               // 江州司马青衫湿
  };

  /* 世界里发生的事 → 声音 */
  const EVENT = {
    song: (t, d) => { const f = SONG[d.name]; if (f) f(t); },
    pearl: (t, d) => pluck('pipa', freq(d.big ? 9 : 14 + ((Math.random() * 4) | 0)), t, { vol: d.big ? 0.28 : 0.18, pan: R(-0.4, 0.4) }),
    raindrop: (t, d) => pluck('pipa', freq(11 + ((Math.random() * 9) | 0)), t, { vol: R(0.06, 0.17), pan: R(-0.9, 0.9) }),
    snowflake: (t) => bell(freq(16 + ((Math.random() * 6) | 0)), t, { qing: true, vol: 0.05, pan: R(-0.8, 0.8) }),
    thunder: (t, d) => { drum(t, { vol: 1, f: 58, pan: d.pan }); drum(t + 0.13, { vol: 0.6, f: 48, pan: d.pan }); noiseSweep(t, 3.2, 320, 130, 60, 0.5, 0.75, d.pan, 'lowpass'); },
    bell: (t, d) => { bell(freq(-5), t, { vol: 0.36, pan: d.pan, long: 1.5 }); bell(freq(0), t + 0.01, { vol: 0.14, pan: d.pan, long: 1.4 }); },
    drum: (t, d) => drum(t, { vol: d.last ? 0.85 : 0.55, f: d.last ? 78 : 96, pan: d.pan }),
    birds: (t, d) => { const n = 2 + ((Math.random() * 4) | 0); for (let k = 0; k < n; k++) chirp(t + k * R(0.1, 0.17), R(2400, 3400), 0.05, R(-0.7, 0.7), R(1.25, 1.7)); },
    swallow: (t) => { chirp(t, 3600, 0.045, R(-0.6, 0.6), 1.3); chirp(t + 0.11, 4000, 0.04, R(-0.6, 0.6), 0.8); },
    oriole: (t) => phrase('di', [[9, 0.09], [11, 0.09], [10, 0.09], [12, 0.2]], t, { vol: 0.07, vib: 0.02, pan: R(-0.5, 0.5) }),
    geese: (t) => { flute(freq(11), t, 0.5, { xiao: true, vol: 0.09, fall: -3, pan: -0.4 }); flute(freq(10), t + 0.75, 0.7, { xiao: true, vol: 0.08, fall: -4, pan: 0.3 }); },
    crane: (t) => flute(freq(13), t, 1.1, { vol: 0.08, grace: -5, fall: -2, vib: 0.012, pan: R(-0.5, 0.5) }),
    butterfly: (t) => BLOOM.butterfly(t, R(-0.5, 0.5)),
    cricket: (t) => cricket(t, R(-0.8, 0.8)),
    fish: (t) => { blip(t, R(-0.5, 0.5)); pluck('zheng', freq(8 + ((Math.random() * 3) | 0)), t + 0.07, { vol: 0.16, bend: 2 }); },
    dragon: (t) => { drum(t, { vol: 0.9, f: 62 }); bell(freq(-5), t + 0.05, { vol: 0.3, long: 1.6 }); gliss(t + 0.2, -4, 6, 0.05, 0.3, 0); },
    boat: (t) => BLOOM.boat(t, 0),
    tower: (t) => BLOOM.tower(t, 0),
    lantern: (t) => BLOOM.lantern(t, 0),
    fire: (t) => BLOOM.fire(t, 0),
    crackle: (t) => noiseSweep(t, 0.04, 2500, 5000, 3000, 2, R(0.03, 0.09), R(-0.3, 0.3)),
    sword: (t, d) => { noiseSweep(t, 0.3, 1600, 7200, 3000, 2.4, 0.4, d.pan); for (let k = 0; k < 4; k++) pluck('pipa', freq(5 + k * 2), t + 0.04 + k * 0.022, { vol: 0.38, pan: d.pan }); },
    season: (t, d) => { A.mode = MODES[d.ch] || 0; gliss(t + 0.05, 0, 10, 0.1, 0.32, 0); },
    night: (t) => BLOOM.night(t),
    day: (t) => BLOOM.day(t),
    clear: (t) => { A.mode = 0; bell(freq(10), t, { qing: true, vol: 0.22 }); },
    // 溯源每退一体，木鱼一声，一声比一声低：时光倒流
    stage: (t, d) => woodfish(t, freq(14 - d.idx * 2) * 2, 0.16),
    // 落笔之声：平声长而直，仄声短而折
    tone: (t, d) => pluck('qin', freq(d.i), t, d.tone === '仄' ? { vol: 0.55, bend: -2 } : { vol: 0.55, vib: 1 }),
    // 对仗成了：上下句各一声，再合为五度
    pair: (t) => { pluck('zheng', freq(5), t, { vol: 0.42, pan: -0.4 }); pluck('zheng', freq(8), t + 0.42, { vol: 0.42, pan: 0.4 }); bell(freq(0), t + 0.84, { vol: 0.18 }); pluck('zheng', freq(5), t + 0.86, { vol: 0.3 }); pluck('zheng', freq(8), t + 0.86, { vol: 0.3 }); },
    ink: (t, d) => pluck('qin', freq(d.i), t, { vol: 0.28, pan: d.pan, slide: d.i % 2 ? 2 : -2 }),
    splash: (t, d) => noiseSweep(t, 0.5, 700, 2400, 900, 0.8, 0.14, d.pan)
  };
  // 这些灵一出世就自己发声（world.emit），不必再奏一遍
  const SELF = { boat: 1, tower: 1, lantern: 1, fire: 1, butterfly: 1, flute: 1 };

  A.play = function (type, data) {
    if (!A.enabled || !A.ready) return;
    const f = EVENT[type];
    if (f) { try { f(now() + 0.02, data || {}); } catch (e) { A.lastError = type + ': ' + e.message; /* 声音出错不应打断画面 */ } }
  };
  A.bloom = function (kind, pan) {
    if (!A.enabled || !A.ready || SELF[kind]) return;
    const f = BLOOM[kind];
    if (f) { try { f(now() + 0.02, pan || 0); } catch (e) { A.lastError = kind + ': ' + e.message; } }
  };

  /* 底乐：一张古琴在远处自弹——在五声里信步，疏疏几声 */
  A.tick = function (dt, world) {
    if (!A.enabled || !A.ready) return;
    A.nextNote -= dt;
    if (A.nextNote > 0) return;
    const t = now() + 0.05, busy = Math.min(1, world.ents.length / 12);
    A.walk = Math.max(-3, Math.min(9, A.walk + [-2, -1, -1, 1, 1, 2, 3, -3][(Math.random() * 8) | 0]));
    const night = world.night, r = Math.random();
    if (night && r < 0.3) flute(freq(A.walk + 3), t, R(1.4, 2.6), { xiao: true, vol: 0.07, fall: r < 0.1 ? -2 : 0 });
    else if (world.has('water') && r < 0.45) { pluck('zheng', freq(A.walk + 5), t, { vol: 0.2, bend: r < 0.2 ? 2 : 0 }); if (r < 0.15) pluck('zheng', freq(A.walk + 7), t + 0.3, { vol: 0.16 }); }
    else if (r > 0.86) harmonic(freq(A.walk + 10), t, { vol: 0.09 });
    else {
      pluck('qin', freq(A.walk), t, { vol: 0.34, vib: r < 0.5 ? 1 : 0, slide: r > 0.7 ? -2 : 0 });
      if (r < 0.22) pluck('qin', freq(A.walk + 2), t + R(0.5, 0.9), { vol: 0.26 });
    }
    A.nextNote = R(2.6, 5.6) - busy * 1.2;
  };

  A.names = { events: Object.keys(EVENT), blooms: Object.keys(BLOOM) };
  MS.Audio = A;
})();
