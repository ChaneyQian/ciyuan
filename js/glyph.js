/* 词源 · glyph.js — 字形溯源
 * 一个字落到纸上，先是今天的楷书，然后沿着历史倒着走：
 *     楷书 → 隶书 → 小篆 → 金文 → 甲骨文
 * 越往回越像画。走到最古的那个象形，墨散开，字就「活」成了它所画的那件东西。
 *
 * 做法：每一体先画到离屏画布上，在墨迹里撒 N 个点；相邻两体的点一一对应，
 * 墨点在两组位置之间游走，就成了字形的渐变。古文字的轮廓在 glyph-data.js（MS.GLYPHS）。
 */
(function () {
  'use strict';
  const MS = window.MS;
  const { clamp, lerp, ease, easeOut, TAU } = MS.util;
  const SZ = 300, N = 1500;

  const META = {
    k: { name: '楷书', era: '汉末至今', short: '楷' },
    l: { name: '隶书', era: '秦 · 汉', short: '隶' },
    s: { name: '小篆', era: '秦', short: '篆' },
    b: { name: '金文', era: '商 · 周', short: '金' },
    o: { name: '甲骨文', era: '商', short: '甲' }
  };
  const ORDER = ['k', 'l', 's', 'b', 'o'];
  const KAI = ['KaiTi', 'STKaiti', 'Kaiti SC', 'BiauKai', 'DFKai-SB', 'AR PL UKai CN', 'Ma Shan Zheng'];
  const LI = ['LiSu', 'STLiti', 'Libian SC', 'Baoli SC'];
  const fonts = { k: null, l: null, checked: 0 };

  const probe = document.createElement('canvas');
  probe.width = probe.height = 48;
  const pg = probe.getContext('2d', { willReadFrequently: true });
  function sig(font) {
    pg.clearRect(0, 0, 48, 48);
    pg.font = '36px ' + font; pg.textBaseline = 'top';
    pg.fillText('永', 4, 4);
    const d = pg.getImageData(0, 0, 48, 48).data;
    let h = 0;
    for (let i = 3; i < d.length; i += 4) h = (h * 31 + d[i]) >>> 0;
    return h;
  }
  /* 这台机器上到底装了哪种楷体、隶书？（没有隶书就跳过那一体，绝不拿别的字体冒充） */
  function detectFonts() {
    const base = sig('serif'), base2 = sig('monospace');
    const pick = (list) => list.find((f) => sig('"' + f + '", serif') !== base && sig('"' + f + '", monospace') !== base2) || null;
    fonts.k = pick(KAI); fonts.l = pick(LI); fonts.checked = performance.now();
    META.k.name = fonts.k ? '楷书' : '今体';
  }

  const cache = {};
  function stage(ch, id) {
    const key = ch + id + (fonts.k || '') + (fonts.l || '');
    if (key in cache) return cache[key];
    const c = document.createElement('canvas');
    c.width = c.height = SZ;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#000';
    if (id === 'k' || id === 'l') {
      if (id === 'l' && !fonts.l) return (cache[key] = null);
      const fam = id === 'k' ? (fonts.k ? '"' + fonts.k + '",' : '') + '"Noto Serif SC","Songti SC","SimSun",serif' : '"' + fonts.l + '"';
      g.font = SZ * 0.8 + 'px ' + fam;
      g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      const m = g.measureText(ch);
      const asc = m.actualBoundingBoxAscent || SZ * 0.7, desc = m.actualBoundingBoxDescent || SZ * 0.1;
      g.fillText(ch, SZ / 2, SZ / 2 + (asc - desc) / 2);
    } else {
      let d = MS.GLYPHS && MS.GLYPHS[ch] && MS.GLYPHS[ch][id];
      if (!d) return (cache[key] = null);
      let rule = 'nonzero';
      if (d[0] === '~') { rule = 'evenodd'; d = d.slice(1); }
      g.save(); g.scale(SZ / 1000, SZ / 1000); g.fill(new Path2D(d), rule); g.restore();
    }
    // 在墨迹里撒点
    const data = g.getImageData(0, 0, SZ, SZ).data, list = [];
    for (let y = 0; y < SZ; y++) for (let x = 0; x < SZ; x++) if (data[(y * SZ + x) * 4 + 3] > 110) list.push(y * SZ + x);
    if (list.length < 40) return (cache[key] = null);
    const tmp = [];
    for (let i = 0; i < N; i++) {
      const p = list[(Math.random() * list.length) | 0];
      tmp.push([(p % SZ + Math.random()) / SZ - 0.5, (((p / SZ) | 0) + Math.random()) / SZ - 0.5]);
    }
    // 分行带排序：让相邻两体的点就近对应，游走时不至于乱成一团
    tmp.sort((a, b) => (Math.floor((a[1] + 0.5) * 10) - Math.floor((b[1] + 0.5) * 10)) || (a[0] - b[0]));
    const pts = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) { pts[i * 2] = tmp[i][0]; pts[i * 2 + 1] = tmp[i][1]; }
    return (cache[key] = { id, canvas: c, pts, tint: {} });
  }
  function tinted(st, night) {
    const k = night ? 'n' : 'd';
    if (!st.tint[k]) {
      const c = document.createElement('canvas'); c.width = c.height = SZ;
      const g = c.getContext('2d');
      g.drawImage(st.canvas, 0, 0);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = night ? 'rgb(232,230,216)' : 'rgb(26,24,22)';
      g.fillRect(0, 0, SZ, SZ);
      st.tint[k] = c;
    }
    return st.tint[k];
  }

  /* mode: 'full' 五体俱全 · 'quick' 今体→最古一体 · 'plain' 只有今体 */
  function stagesFor(ch, mode) {
    if (!fonts.checked || (performance.now() - fonts.checked > 4000 && !fonts.k)) detectFonts();
    const all = ORDER.map((id) => stage(ch, id)).filter(Boolean);
    if (mode === 'plain' || all.length <= 1) return all.slice(0, 1);
    if (mode === 'quick') return [all[0], all[all.length - 1]];
    return all;
  }

  function Morph(ch, x, y, o) {
    this.ch = ch; this.o = o;
    this.stages = stagesFor(ch, o.mode);
    if (o.reverse) this.stages = this.stages.slice().reverse();      // 顺着历史走：古 → 今
    this.n = this.stages.length;
    this.size = o.size;
    const pad = this.size * 0.62;
    this.x = clamp(x, pad, o.world.W - pad); this.y = clamp(y, pad, o.world.H - pad - 60);
    this.tx = x; this.ty = y;                 // 灵要落在真正落笔的地方
    const full = o.mode === 'full';
    this.tIn = 0.5; this.hold = full ? 0.95 : 0.55; this.tr = full ? 0.8 : 0.6; this.tOut = 1.2;
    this.t = 0; this.dead = this.n === 0;
    this.rnd = new Float32Array(N * 4);
    for (let i = 0; i < N * 4; i++) this.rnd[i] = Math.random();
    this.bloomed = false; this.splatted = false; this.lastStage = -1;
    // 手写而来：墨点从手迹出发，而不是从一滴墨里散开
    this.hand = null;
    if (o.hand && o.hand.length && this.n) {
      let y0 = 1e9, y1 = -1e9;
      for (const p of o.hand) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
      const hh = Math.max(1, y1 - y0), hp = o.hand.slice();
      hp.sort((a, b) => (Math.floor((a[1] - y0) / hh * 9.999) - Math.floor((b[1] - y0) / hh * 9.999)) || (a[0] - b[0]));
      this.hand = new Float32Array(N * 2);
      for (let i = 0; i < N; i++) { const p = hp[Math.floor(i * hp.length / N)]; this.hand[i * 2] = (p[0] - this.x) / this.size; this.hand[i * 2 + 1] = (p[1] - this.y) / this.size; }
      this.tIn = 1.0;
    }
  }
  Morph.prototype.where = function () {
    let tt = this.t - this.tIn;
    if (tt < 0) return { mode: 'in', idx: 0, u: this.t / this.tIn };
    for (let i = 0; i < this.n; i++) {
      if (tt < this.hold) return { mode: 'hold', idx: i, u: tt / this.hold };
      tt -= this.hold;
      if (i < this.n - 1) { if (tt < this.tr) return { mode: 'tr', idx: i, u: tt / this.tr }; tt -= this.tr; }
    }
    return { mode: 'out', idx: this.n - 1, u: tt / this.tOut };
  };
  Morph.prototype.update = function (dt) {
    if (this.dead) return;
    this.t += dt;
    if (this.o.anchor) { const q = this.o.anchor(); this.x = this.tx = q[0]; this.y = this.ty = q[1]; }   // 跟着会动的画走
    const s = this.where(), o = this.o;
    const shown = s.mode === 'tr' && s.u > 0.5 ? s.idx + 1 : s.idx;
    if (shown !== this.lastStage) {
      this.lastStage = shown;
      if (o.onStage) o.onStage(shown, this.n, this.stages[shown].id);
    }
    if (s.mode === 'out') {
      const fl = o.world.fluid, sz = this.size;
      if (!this.splatted) {
        // 字散为墨：沿字形落十几滴，带一个回旋的势
        this.splatted = true;
        const pts = this.stages[this.n - 1].pts, spin = Math.random() < 0.5 ? 1 : -1;
        for (let k = 0; k < 18; k++) {
          const i = ((Math.random() * N) | 0) * 2, px = pts[i] * sz, py = pts[i + 1] * sz;
          fl.splat(this.x + px, this.y + py, -py * 4 * spin, px * 4 * spin, [o.known ? 0.2 : 0.34, 0, 0], sz * 0.07);
        }
        // 一圈旋力，把墨卷成涡
        for (let k = 0; k < 10; k++) {
          const a = k / 10 * TAU, rr = sz * 0.3;
          fl.splat(this.x + Math.cos(a) * rr, this.y + Math.sin(a) * rr, -Math.sin(a) * 620 * spin, Math.cos(a) * 620 * spin, null, sz * 0.2);
        }
      }
      if (!this.bloomed && s.u > 0.12) { this.bloomed = true; if (o.onBloom) o.onBloom(this.tx, this.ty); }
      if (s.u >= 1) this.dead = true;
    }
  };
  Morph.prototype.draw = function (ctx) {
    if (this.dead) return;
    const s = this.where(), w = this.o.world, sz = this.size, R = this.rnd, x0 = this.x, y0 = this.y;
    const night = w.nightK > 0.5, A = this.stages[s.idx], B = this.stages[Math.min(this.n - 1, s.idx + 1)];
    const pr = sz * 0.0102;
    let crispA = 0, crispB = 0, alpha = 1;
    ctx.save();
    // —— 墨点
    ctx.fillStyle = w.ink(0.9);
    ctx.beginPath();
    if (s.mode === 'in') {
      crispA = ease(s.u * 2.2 - 1.2);
      for (let i = 0; i < N; i++) {
        const u = easeOut(clamp(s.u * 1.5 - R[i * 4] * 0.5, 0, 1));
        const a = R[i * 4 + 1] * TAU, r0 = R[i * 4 + 2] * sz * 0.06;
        const sx = this.hand ? this.hand[i * 2] * sz : Math.cos(a) * r0, sy = this.hand ? this.hand[i * 2 + 1] * sz : Math.sin(a) * r0;
        const x = x0 + lerp(sx, A.pts[i * 2] * sz, u), y = y0 + lerp(sy, A.pts[i * 2 + 1] * sz, u);
        const r = pr * (0.7 + R[i * 4 + 3] * 0.9);
        ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU);
      }
    } else if (s.mode === 'hold') {
      crispA = 1;
    } else if (s.mode === 'tr') {
      crispA = 1 - ease(s.u / 0.22); crispB = ease((s.u - 0.78) / 0.22);
      for (let i = 0; i < N; i++) {
        const u = ease(clamp((s.u - R[i * 4] * 0.3) / 0.7, 0, 1));
        const ax = A.pts[i * 2], ay = A.pts[i * 2 + 1], bx = B.pts[i * 2], by = B.pts[i * 2 + 1];
        const wob = Math.sin(u * Math.PI) * (R[i * 4 + 1] - 0.5) * 0.16;
        const x = x0 + (lerp(ax, bx, u) - (by - ay) * wob + Math.sin(u * Math.PI) * (R[i * 4 + 2] - 0.5) * 0.05) * sz;
        const y = y0 + (lerp(ay, by, u) + (bx - ax) * wob + Math.sin(u * Math.PI) * (R[i * 4 + 3] - 0.5) * 0.05) * sz;
        const r = pr * (0.7 + R[i * 4 + 3] * 0.9) * (1 + Math.sin(u * Math.PI) * 0.35);
        ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU);
      }
    } else {
      crispA = 1 - ease(s.u / 0.16);
      alpha = Math.pow(1 - clamp(s.u, 0, 1), 1.6);
      const e = easeOut(s.u), ca = Math.cos(e * 1.7), sa = Math.sin(e * 1.7);
      for (let i = 0; i < N; i += 2) {
        const px = A.pts[i * 2] * sz, py = A.pts[i * 2 + 1] * sz, k = 1 + e * (0.5 + R[i * 4] * 1.6);
        const x = x0 + (px * ca - py * sa) * k, y = y0 + (px * sa + py * ca) * k + e * e * 30 * R[i * 4 + 1];
        const r = pr * (0.7 + R[i * 4 + 3] * 0.9) * (1 - s.u * 0.5);
        ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU);
      }
    }
    ctx.globalAlpha = alpha;
    ctx.fill();
    // —— 清晰的字形（停留时）
    if (crispA > 0.01) { ctx.globalAlpha = crispA; ctx.drawImage(tinted(A, night), x0 - sz / 2, y0 - sz / 2, sz, sz); }
    if (crispB > 0.01) { ctx.globalAlpha = crispB; ctx.drawImage(tinted(B, night), x0 - sz / 2, y0 - sz / 2, sz, sz); }

    // —— 题签：此刻是哪一体、哪个年代
    const shown = s.mode === 'tr' && s.u > 0.5 ? s.idx + 1 : s.idx, meta = META[this.stages[shown].id];
    let ca = 1;
    if (s.mode === 'in') ca = s.u; else if (s.mode === 'out') ca = 1 - clamp(s.u / 0.35, 0, 1);
    else if (s.mode === 'tr') ca = Math.abs(s.u - 0.5) * 2;
    const cy = y0 + sz * 0.6;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.globalAlpha = ca;
    ctx.font = '600 15px ' + MS.FONT_TEXT;
    const nameW = ctx.measureText(meta.name).width;
    ctx.font = '12px ' + MS.FONT_TEXT;
    const eraW = ctx.measureText(meta.era).width, tot = nameW + 10 + eraW;
    ctx.textAlign = 'left';
    ctx.font = '600 15px ' + MS.FONT_TEXT; ctx.fillStyle = w.col('red', 0.95);
    ctx.fillText(meta.name, x0 - tot / 2, cy);
    ctx.font = '12px ' + MS.FONT_TEXT; ctx.fillStyle = w.ink(0.5);
    ctx.fillText(meta.era, x0 - tot / 2 + nameW + 10, cy + 1);
    // 行迹：楷 · 隶 · 篆 · 金 · 甲
    if (this.n > 1) {
      const ga = s.mode === 'in' ? s.u : s.mode === 'out' ? 1 - clamp(s.u / 0.35, 0, 1) : 1;
      ctx.globalAlpha = ga;
      const step = 26, sx = x0 - ((this.n - 1) * step) / 2, yy = cy + 24;
      ctx.textAlign = 'center'; ctx.font = '12px ' + MS.FONT_TEXT;
      for (let i = 0; i < this.n; i++) {
        const on = i === shown;
        if (i) { ctx.strokeStyle = w.ink(0.22); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx + (i - 1) * step + 9, yy); ctx.lineTo(sx + i * step - 9, yy); ctx.stroke(); }
        ctx.fillStyle = on ? w.col('red', 0.95) : w.ink(i < shown ? 0.5 : 0.25);
        ctx.fillText(META[this.stages[i].id].short, sx + i * step, yy);
      }
      // 走到最古一体：一句字源
      const note = this.o.note;
      if (note && shown === this.n - 1 && 'obs'.indexOf(this.stages[shown].id) >= 0) {
        ctx.globalAlpha = ga * (s.mode === 'hold' ? ease(s.u * 3) : s.mode === 'out' ? 1 : ease((s.u - 0.6) * 2.5));
        ctx.font = '13px ' + MS.FONT_TEXT; ctx.fillStyle = w.ink(0.62);
        ctx.fillText(note, clamp(x0, 120, w.W - 120), yy + 24);
      }
    }
    ctx.restore();
  };

  MS.Glyphs = {
    list: [],
    add(ch, x, y, o) { const m = new Morph(ch, x, y, o); if (!m.dead) this.list.push(m); else if (o.onBloom) o.onBloom(x, y); return m; },
    update(dt) { for (const m of this.list) m.update(dt); if (this.list.some((m) => m.dead)) this.list = this.list.filter((m) => !m.dead); },
    draw(ctx) { for (const m of this.list) m.draw(ctx); },
    refreshFonts() { detectFonts(); },
    stageCount(ch) { return stagesFor(ch, 'full').length; },
    /* 一个字最古的那一体：墨点位置 + 可以染成任意颜色的字形图 */
    shape(ch) {
      const all = stagesFor(ch, 'full');
      if (!all.length) return null;
      const st = all[all.length - 1];
      st.colors = st.colors || {};
      return {
        id: st.id, pts: st.pts,
        tint(color) {
          if (!st.colors[color]) {
            const c = document.createElement('canvas'); c.width = c.height = SZ;
            const g = c.getContext('2d');
            g.drawImage(st.canvas, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, SZ, SZ);
            st.colors[color] = c;
          }
          return st.colors[color];
        }
      };
    }
  };
})();
