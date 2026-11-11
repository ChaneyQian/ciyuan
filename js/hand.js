/* 词源 · hand.js — 手写判定
 * 打开「手写」后，在纸上写一个字，停笔片刻，程序判断它是 44 个能活的字里的哪一个。
 *
 * 判法（不依赖任何外部数据）：
 *   1. 把手迹按外框归一，画进 64×64 的小格；
 *   2. 取「方向线素特征」：每个像素的边缘走向分 4 个方向，再按 8×8 的格子汇总，得 256 维；
 *   3. 候选字用本机的几种字体（黑、楷、仿宋、手写体）各画一遍，取同样的特征作模板；
 *   4. 与每个字的模板算余弦相似度，取最大，再按笔画数略作修正。
 * 拿不准时列出前几名让人挑；实在不像任何字，手迹就化成一团墨。
 */
(function () {
  'use strict';
  const MS = window.MS;
  const { clamp, lerp, ease, TAU } = MS.util;

  const F = 64, NC = 8, CELL = F / NC, BINS = 4, DIM = NC * NC * BINS, PAD = 6;
  const STACKS = [
    '"Microsoft YaHei","PingFang SC","Noto Sans SC","Heiti SC",sans-serif',
    '"KaiTi","STKaiti","Kaiti SC","BiauKai",serif',
    '"FangSong","STFangsong","Songti SC","SimSun",serif',
    '"Ma Shan Zheng","STXingkai","Xingkai SC",cursive'
  ];
  // 四档（相似度是余弦，0..1）。阈值是拿规整的合成笔画和乱涂标定的：正字约 0.9，乱涂 0.55–0.8
  const ACCEPT = 0.64;       // 低于此：不认，化墨
  const AUTO = 0.8;          // 高于此：列出候选，几秒后自动取第一名；低于此只等人点
  const SURE = 0.8;          // 高于此且领先明显：直接判定
  const SURE_GAP = 0.045;

  const small = document.createElement('canvas'); small.width = small.height = F;
  const sg = small.getContext('2d', { willReadFrequently: true });
  const big = document.createElement('canvas'); big.width = big.height = 160;
  const bg = big.getContext('2d', { willReadFrequently: true });

  /* 64×64 画布上的墨迹 → 256 维方向特征 */
  function feature(g) {
    const d = g.getImageData(0, 0, F, F).data;
    let a = new Float32Array(F * F), b = new Float32Array(F * F);
    for (let i = 0; i < F * F; i++) a[i] = d[i * 4 + 3] / 255;
    for (let pass = 0; pass < 2; pass++) {           // 轻微模糊，抹平笔画粗细的差别
      for (let y = 1; y < F - 1; y++) for (let x = 1; x < F - 1; x++) {
        const i = y * F + x;
        b[i] = (a[i] * 4 + (a[i - 1] + a[i + 1] + a[i - F] + a[i + F]) * 2 + a[i - F - 1] + a[i - F + 1] + a[i + F - 1] + a[i + F + 1]) / 16;
      }
      const t = a; a = b; b = t;
    }
    const f = new Float32Array(DIM);
    for (let y = 1; y < F - 1; y++) for (let x = 1; x < F - 1; x++) {
      const i = y * F + x;
      const gx = a[i - F + 1] + 2 * a[i + 1] + a[i + F + 1] - a[i - F - 1] - 2 * a[i - 1] - a[i + F - 1];
      const gy = a[i + F - 1] + 2 * a[i + F] + a[i + F + 1] - a[i - F - 1] - 2 * a[i - F] - a[i - F + 1];
      const m = Math.hypot(gx, gy);
      if (m < 0.03) continue;
      let ang = Math.atan2(gy, gx); if (ang < 0) ang += Math.PI;
      const pos = ang / Math.PI * BINS, p0 = Math.floor(pos), w1 = pos - p0, b0 = p0 % BINS, b1 = (p0 + 1) % BINS;
      const cxf = x / CELL - 0.5, cyf = y / CELL - 0.5, cx0 = Math.floor(cxf), cy0 = Math.floor(cyf), fx = cxf - cx0, fy = cyf - cy0;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const cx = cx0 + dx, cy = cy0 + dy;
        if (cx < 0 || cy < 0 || cx >= NC || cy >= NC) continue;
        const w = (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy) * m, k = (cy * NC + cx) * BINS;
        f[k + b0] += w * (1 - w1); f[k + b1] += w * w1;
      }
    }
    let n = 0;
    for (let i = 0; i < DIM; i++) { f[i] = Math.sqrt(f[i]); n += f[i] * f[i]; }
    n = Math.sqrt(n) || 1;
    for (let i = 0; i < DIM; i++) f[i] /= n;
    return f;
  }

  /* 把一个字用某种字体画成归一化的 64×64 */
  function glyphFeature(ch, stack) {
    bg.clearRect(0, 0, 160, 160);
    bg.fillStyle = '#000'; bg.font = '112px ' + stack; bg.textAlign = 'center'; bg.textBaseline = 'middle';
    bg.fillText(ch, 80, 84);
    const d = bg.getImageData(0, 0, 160, 160).data;
    let x0 = 160, y0 = 160, x1 = -1, y1 = -1;
    for (let y = 0; y < 160; y++) for (let x = 0; x < 160; x++) if (d[(y * 160 + x) * 4 + 3] > 80) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null;
    const w = x1 - x0 + 1, h = y1 - y0 + 1, s = (F - 2 * PAD) / Math.max(w, h);
    sg.clearRect(0, 0, F, F);
    sg.drawImage(big, x0, y0, w, h, (F - w * s) / 2, (F - h * s) / 2, w * s, h * s);
    return feature(sg);
  }

  /* 把手迹（若干笔，每笔是 [x,y,...]）画成归一化的 64×64 */
  function strokesFeature(strokes) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const s of strokes) for (let i = 0; i < s.length; i += 2) { x0 = Math.min(x0, s[i]); x1 = Math.max(x1, s[i]); y0 = Math.min(y0, s[i + 1]); y1 = Math.max(y1, s[i + 1]); }
    const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0), sc = (F - 2 * PAD - 4) / Math.max(w, h);
    const ox = (F - w * sc) / 2, oy = (F - h * sc) / 2;
    sg.clearRect(0, 0, F, F);
    sg.strokeStyle = '#000'; sg.lineWidth = 4.2; sg.lineCap = 'round'; sg.lineJoin = 'round';
    for (const s of strokes) {
      sg.beginPath();
      sg.moveTo(ox + (s[0] - x0) * sc, oy + (s[1] - y0) * sc);
      if (s.length === 2) sg.lineTo(ox + (s[0] - x0) * sc + 0.1, oy + (s[1] - y0) * sc);
      for (let i = 2; i < s.length; i += 2) sg.lineTo(ox + (s[i] - x0) * sc, oy + (s[i + 1] - y0) * sc);
      sg.stroke();
    }
    return feature(sg);
  }

  let templates = null, builtAt = 0;
  function build() {
    templates = [];
    for (const ch of MS.CHAR_LIST) {
      const fs = [];
      for (const st of STACKS) { const f = glyphFeature(ch, st); if (f) fs.push(f); }
      templates.push({ ch, fs, strokes: MS.CHARS[ch].strokes || 8 });
    }
    builtAt = performance.now();
  }
  function cos(a, b) { let s = 0; for (let i = 0; i < DIM; i++) s += a[i] * b[i]; return s; }

  /* 特征 + 笔数 → 排好名的候选 [{ch, score, raw}] */
  function rank(f, nStrokes) {
    if (!templates) build();
    const out = [];
    for (const t of templates) {
      let best = 0;
      for (const tf of t.fs) { const c = cos(f, tf); if (c > best) best = c; }
      let pen = 0;
      if (nStrokes) {
        const diff = nStrokes - t.strokes;       // 连笔会少，断笔会多；多出来的更可疑
        pen = diff > 0 ? 0.022 * Math.min(diff, 6) : 0.005 * Math.min(-diff, 8) + (nStrokes < t.strokes * 0.34 ? 0.03 : 0);
      }
      out.push({ ch: t.ch, score: best - pen, raw: best });
    }
    out.sort((a, b) => b.score - a.score);
    return out;
  }

  /* ---------- 纸上的手迹 ---------- */
  const H = {
    on: false, strokes: [], cur: null, phase: 'idle', timer: 0, fade: 1, cands: null, box: null,
    onCommit: null, onReject: null, onInk: null
  };
  const el = document.createElement('div');
  el.id = 'hw'; el.setAttribute('aria-live', 'polite');
  document.body.appendChild(el);

  H.setEnabled = function (on) {
    H.on = on;
    if (on && (!templates || performance.now() - builtAt > 60000)) build();
    if (!on) reset();
  };
  /* 网络字体到了以后重做模板 */
  H.refresh = function () { if (templates) build(); };

  function reset() { H.strokes = []; H.cur = null; H.phase = 'idle'; H.cands = null; H.fade = 1; el.className = ''; el.innerHTML = ''; }
  function bbox() {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, len = 0;
    for (const s of H.strokes) for (let i = 0; i < s.p.length; i += 2) {
      x0 = Math.min(x0, s.p[i]); x1 = Math.max(x1, s.p[i]); y0 = Math.min(y0, s.p[i + 1]); y1 = Math.max(y1, s.p[i + 1]);
      if (i) len += Math.hypot(s.p[i] - s.p[i - 2], s.p[i + 1] - s.p[i - 1]);
    }
    return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0, len };
  }

  H.down = function (x, y) {
    if (H.phase === 'leaving') reset();
    if (H.phase === 'judged') {
      const b = H.box, m = 70;
      if (b && (x < b.x0 - m || x > b.x1 + m || y < b.y0 - m || y > b.y1 + m)) {
        // 在别处另起一字：先把上一个字了结
        if (H.auto) accept(H.cands[0].ch); else if (H.onReject) H.onReject(H.strokes.map((s) => s.p));
        reset();
      } else { el.className = ''; H.cands = null; }                       // 接着写同一个字：先前的判定作废
    }
    H.phase = 'writing';
    H.cur = { p: [x, y], w: [7], t: performance.now() };
    H.strokes.push(H.cur);
  };
  H.move = function (x, y) {
    const s = H.cur; if (!s) return;
    const n = s.p.length, dx = x - s.p[n - 2], dy = y - s.p[n - 1], d = Math.hypot(dx, dy);
    if (d < 2.2) return;
    const t = performance.now(), sp = d / Math.max(4, t - s.t) * 1000;
    s.t = t;
    s.p.push(x, y);
    s.w.push(lerp(s.w[s.w.length - 1], clamp(13 - sp * 0.006, 5.5, 13), 0.35));   // 行笔快则细，慢则粗
    if (H.onInk && Math.random() < 0.25) H.onInk(x, y, dx, dy);
  };
  H.up = function () {
    if (!H.cur) return;
    H.cur = null;
    H.phase = 'pending'; H.timer = 0.85;
  };

  function judge() {
    const b = bbox();
    H.box = b;
    if (b.len < 46 || Math.max(b.w, b.h) < 26) { reject(); return; }            // 只是一点：当作落墨
    const list = rank(strokesFeature(H.strokes.map((s) => s.p)), H.strokes.length);
    H.cands = list.slice(0, 4);
    const top = list[0];
    if (top.score < ACCEPT) { miss(); return; }
    const kind = top.score >= SURE && top.score - list[1].score >= SURE_GAP ? 'sure' : top.score >= AUTO ? 'ask' : 'hold';
    H.auto = kind !== 'hold';
    H.timer = kind === 'sure' ? 0.9 : kind === 'ask' ? 3.2 : 7;
    show(kind);
    H.phase = 'judged';
  }
  function miss() { show('miss'); if (H.onReject) H.onReject(H.strokes.map((s) => s.p)); H.phase = 'leaving'; H.timer = 1.1; }
  function show(kind) {
    const b = H.box;
    el.innerHTML = '';
    el.className = 'show ' + kind;
    if (kind === 'miss') { const s = document.createElement('span'); s.className = 'say'; s.textContent = '认不出 · 化作墨'; el.appendChild(s); }
    else {
      const say = document.createElement('span'); say.className = 'say'; say.textContent = kind === 'sure' ? '判为' : kind === 'ask' ? '像是' : '拿不准，点一个';
      el.appendChild(say);
      const n = kind === 'sure' ? 1 : Math.min(4, H.cands.filter((c) => c.score > H.cands[0].score - 0.14).length);
      H.cands.slice(0, Math.max(n, kind === 'sure' ? 1 : 2)).forEach((c, i) => {
        const bt = document.createElement('button');
        bt.type = 'button'; bt.textContent = c.ch; if (!i) bt.className = 'top';
        bt.style.setProperty('--t', H.timer + 's');
        bt.addEventListener('click', (e) => { e.stopPropagation(); accept(c.ch); });
        el.appendChild(bt);
      });
      const no = document.createElement('button');
      no.type = 'button'; no.className = 'no'; no.textContent = '重写'; no.title = '擦掉重写';
      no.addEventListener('click', (e) => { e.stopPropagation(); reset(); });
      el.appendChild(no);
    }
    const W = window.innerWidth, Hh = window.innerHeight;
    el.style.left = clamp(b.cx, 110, W - 110) + 'px';
    el.style.top = clamp(b.y1 + 18, 60, Hh - 150) + 'px';

  }

  /* 沿手迹取 n 个点（带一点笔宽内的抖动），交给字形渐变当起点 */
  function samplePoints(n) {
    const segs = []; let total = 0;
    for (const s of H.strokes) for (let i = 2; i < s.p.length; i += 2) {
      const l = Math.hypot(s.p[i] - s.p[i - 2], s.p[i + 1] - s.p[i - 1]);
      segs.push([s.p[i - 2], s.p[i - 1], s.p[i], s.p[i + 1], l, s.w[i / 2] || 7]); total += l;
    }
    const pts = [];
    if (!segs.length) return pts;
    let k = 0, acc = 0;
    for (let i = 0; i < n; i++) {
      const target = (i + Math.random()) / n * total;
      while (k < segs.length - 1 && acc + segs[k][4] < target) { acc += segs[k][4]; k++; }
      const g = segs[k], u = g[4] ? clamp((target - acc) / g[4], 0, 1) : 0, nx = -(g[3] - g[1]) / (g[4] || 1), ny = (g[2] - g[0]) / (g[4] || 1), j = (Math.random() - 0.5) * g[5] * 0.85;
      pts.push([lerp(g[0], g[2], u) + nx * j, lerp(g[1], g[3], u) + ny * j]);
    }
    return pts;
  }
  function accept(ch) {
    const b = H.box, pts = samplePoints(1500);
    el.className = '';
    H.phase = 'leaving'; H.timer = 0.4; H.fade = 1;
    if (H.onCommit) H.onCommit(ch, b.cx, b.cy, pts);
  }
  function reject() {
    if (H.onReject) H.onReject(H.strokes.map((s) => s.p));
    H.phase = 'leaving'; H.timer = 0.5;
  }

  H.update = function (dt) {
    if (H.phase === 'pending') { H.timer -= dt; if (H.timer <= 0) judge(); }
    else if (H.phase === 'judged') { H.timer -= dt; if (H.timer <= 0) { if (H.auto) accept(H.cands[0].ch); else miss(); } }
    else if (H.phase === 'leaving') {
      H.timer -= dt; H.fade = clamp(H.fade - dt / 0.4, 0, 1);
      if (H.timer <= 0) reset();
    }
  };
  H.draw = function (ctx, w) {
    if (!H.strokes.length) return;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = w.ink(0.9 * H.fade);
    for (const s of H.strokes) {
      if (s.p.length === 2) { ctx.fillStyle = w.ink(0.9 * H.fade); ctx.beginPath(); ctx.arc(s.p[0], s.p[1], 3.5, 0, TAU); ctx.fill(); continue; }
      for (let i = 2; i < s.p.length; i += 2) {
        ctx.lineWidth = (s.w[i / 2] + s.w[i / 2 - 1]) / 2;
        ctx.beginPath(); ctx.moveTo(s.p[i - 2], s.p[i - 1]); ctx.lineTo(s.p[i], s.p[i + 1]); ctx.stroke();
      }
    }
    ctx.restore();
  };
  H.busy = function () { return H.phase !== 'idle'; };

  // 供测试与调试
  H.feature = feature; H.glyphFeature = glyphFeature; H.strokesFeature = strokesFeature; H.rank = rank; H.build = build;
  H.judgeNow = function () { if (H.phase === 'pending') judge(); return H.cands; };

  MS.Hand = H;
})();
