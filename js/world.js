/* 词源 · world.js — 世界：万物的容器 + 天象、山水、时令
 * 每一种「灵」是 MS.Kinds 里的一项：{ z, max, life, create(w,e), update(e,dt,w), draw(e,ctx,w) }
 * 颜色一律经 w.col(name, alpha) 取得，昼夜自动过渡——以后切换「世界风格」也从这里换皮。
 */
(function () {
  'use strict';
  const MS = (window.MS = window.MS || {});
  const TAU = Math.PI * 2;

  /* ---------- 小工具 ---------- */
  function mulberry(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t = clamp(t, 0, 1), t * t * (3 - 2 * t));
  const easeOut = (t) => (t = clamp(t, 0, 1), 1 - (1 - t) * (1 - t) * (1 - t));
  function hash1(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function noise1(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash1(i), hash1(i + 1), u); }

  /* 一笔：沿折线画一条粗细渐变的墨线（填充多边形）。pts=[x0,y0,x1,y1,...] */
  function brush(ctx, pts, w0, w1, upto) {
    const n = pts.length / 2;
    if (n < 2) return;
    const m = upto == null ? n : clamp(Math.ceil(upto * (n - 1)) + 1, 2, n);
    const L = [], R = [];
    for (let i = 0; i < m; i++) {
      const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
      let dx = pts[b * 2] - pts[a * 2], dy = pts[b * 2 + 1] - pts[a * 2 + 1];
      const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      const t = i / (n - 1), hw = (typeof w0 === 'function' ? w0(t) : lerp(w0, w1, t)) * 0.5;
      L.push(pts[i * 2] - dy * hw, pts[i * 2 + 1] + dx * hw);
      R.push(pts[i * 2] + dy * hw, pts[i * 2 + 1] - dx * hw);
    }
    ctx.beginPath();
    ctx.moveTo(L[0], L[1]);
    for (let i = 1; i < m; i++) ctx.lineTo(L[i * 2], L[i * 2 + 1]);
    for (let i = m - 1; i >= 0; i--) ctx.lineTo(R[i * 2], R[i * 2 + 1]);
    ctx.closePath();
    ctx.fill();
  }
  /* 一片叶：从 (x,y) 沿 ang 方向长 len，最宽 wid */
  function leafPath(ctx, x, y, ang, len, wid, bend) {
    const c = Math.cos(ang), s = Math.sin(ang), b = bend || 0;
    const tx = x + c * len - s * b * len, ty = y + s * len + c * b * len;
    const mx = x + c * len * 0.45, my = y + s * len * 0.45;
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(mx - s * wid, my + c * wid, tx, ty);
    ctx.quadraticCurveTo(mx + s * wid * 0.7, my - c * wid * 0.7, x, y);
  }
  function softDot(ctx, x, y, r, color0, color1) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color0); g.addColorStop(1, color1);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }

  MS.util = { mulberry, clamp, lerp, ease, easeOut, hash1, noise1, brush, leafPath, softDot, TAU };

  /* ---------- 调色 ---------- */
  const PAL = {
    //          白昼              夜
    ink:    [[30, 28, 26],     [226, 224, 210]],
    red:    [[176, 36, 30],    [236, 88, 68]],
    green:  [[52, 104, 92],    [124, 212, 196]],
    leaf:   [[70, 110, 66],    [150, 208, 150]],
    yellow: [[198, 150, 36],   [244, 206, 104]],
    pink:   [[216, 118, 132],  [255, 164, 176]],
    orange: [[214, 104, 34],   [255, 150, 70]],
    blue:   [[58, 92, 132],    [130, 176, 230]],
    paper:  [[236, 230, 216],  [9, 12, 17]],
    white:  [[252, 250, 244],  [240, 240, 232]],
    warm:   [[240, 170, 80],   [255, 196, 110]]
  };

  /* ---------- 世界 ---------- */
  function World(fluid) {
    this.fluid = fluid;
    this.ents = [];
    this.events = [];          // 给声音模块的事件
    this.t = 0;
    this.W = 1; this.H = 1;
    this.night = false; this.nightK = 0;
    this.season = '';          // '' | 春 夏 秋 冬
    this.tint = [1, 1, 1];
    this.wind = 0;             // 当前风力（带方向，-1..1 左右）
    this.gust = 0;
    this.pointer = { x: -999, y: -999, vx: 0, vy: 0, moved: 0 };
    this.ambient = [];         // 落花、落叶、微雪
    this.flowerSpots = [];
    this.uid = 1;
    this._ambT = 0;
  }
  World.prototype.resize = function (W, H) { this.W = W; this.H = H; };

  World.prototype.col = function (name, a) {
    const p = PAL[name] || PAL.ink, k = this.nightK;
    const r = Math.round(lerp(p[0][0], p[1][0], k)), g = Math.round(lerp(p[0][1], p[1][1], k)), b = Math.round(lerp(p[0][2], p[1][2], k));
    return 'rgba(' + r + ',' + g + ',' + b + ',' + (a == null ? 1 : a) + ')';
  };
  World.prototype.ink = function (a) { return this.col('ink', a); };

  World.prototype.emit = function (type, data) { this.events.push(Object.assign({ type }, data || {})); };
  World.prototype.stir = function (x, y, vx, vy, r) { this.fluid.splat(x, y, vx, vy, null, r); };
  World.prototype.dye = function (x, y, pig, r, vx, vy) { this.fluid.splat(x, y, vx || 0, vy || 0, pig, r); };

  /* 落字成灵 */
  World.prototype.spawn = function (ch, x, y) {
    const def = MS.CHARS[ch];
    if (!def) return null;
    const W = this.W, H = this.H;
    x = clamp(x, 20, W - 20); y = clamp(y, 20, H - 20);
    // 时令与昼夜：改的是世界本身
    if (def.kind === 'season') { this.season = ch; this.emit('season', { ch }); this._mark(ch, x, y); return null; }
    if (def.kind === 'night') { this.night = true; this.emit('night'); this._mark(ch, x, y); return null; }
    if (def.kind === 'day') { this.night = false; this.emit('day'); this._mark(ch, x, y); return null; }
    if (def.kind === 'clear') { this.clear(); return null; }
    const K = MS.Kinds[def.kind];
    if (!K) return null;
    if (def.kind === 'sun' && this.night) { this.night = false; this._mark('昼'); this.emit('day'); }   // 日出则昼
    // 同类过多：最老的淡出
    const same = this.ents.filter((e) => e.kind === def.kind && !e.dying);
    if (K.single && same.length) {
      if (K.respawn) K.respawn(same[0], x, y, this);
      else same.forEach((e) => (e.dying = true));
      if (K.respawn) return same[0];
    } else if (K.max && same.length >= K.max) same[0].dying = true;
    const e = { id: this.uid++, kind: def.kind, ch, x, y, age: 0, fade: 1, life: K.life || Infinity, seed: (Math.random() * 1e9) | 0, z: K.z || 50 };
    e.rng = mulberry(e.seed);
    K.create(e, this);
    this.ents.push(e);
    this.ents.sort((a, b) => a.z - b.z);
    return e;
  };
  /* 记下一个「无形」的字（四时、昼夜），让诗句检索知道它在场 */
  World.prototype._mark = function (ch) {
    const group = MS.CHARS[ch].kind === 'season' ? 'season' : 'daynight';
    this.ents = this.ents.filter((e) => !(e.kind === 'mark' && e.group === group));
    this.ents.unshift({ id: this.uid++, kind: 'mark', group, ch, x: 0, y: 0, age: 0, fade: 1, life: Infinity, z: 0 });
  };

  World.prototype.present = function () {
    const s = new Set();
    for (const e of this.ents) if (!e.dying) s.add(e.ch);
    return s;
  };
  World.prototype.has = function (kind) { return this.ents.some((e) => e.kind === kind && !e.dying); };
  World.prototype.find = function (kind) { return this.ents.filter((e) => e.kind === kind && !e.dying); };

  World.prototype.clear = function () {
    for (const e of this.ents) e.dying = true;
    this.ents = this.ents.filter((e) => e.kind !== 'mark');
    this.season = ''; this.night = false; this.gust = 0;
    this.clearing = 2.2;
    this.emit('clear');
  };

  /* 给「自在」和点选字钮用：每类灵该落在画面何处 */
  World.prototype.placeFor = function (ch) {
    const W = this.W, H = this.H, r = Math.random, def = MS.CHARS[ch] || {};
    const zone = (MS.Kinds[def.kind] || {}).zone || 'mid';
    switch (zone) {
      case 'sky': return { x: W * (0.15 + r() * 0.7), y: H * (0.12 + r() * 0.2) };
      case 'skyR': return { x: W * (0.66 + r() * 0.2), y: H * (0.16 + r() * 0.12) };
      case 'high': return { x: W * (0.2 + r() * 0.6), y: H * (0.22 + r() * 0.2) };
      case 'land': return { x: W * (0.25 + r() * 0.5), y: H * (0.5 + r() * 0.16) };
      case 'side': return r() < 0.5 ? { x: W * (0.05 + r() * 0.12), y: H * (0.3 + r() * 0.2) } : { x: W * (0.83 + r() * 0.12), y: H * (0.3 + r() * 0.2) };
      case 'edge': return r() < 0.5 ? { x: W * (0.12 + r() * 0.1), y: H * (0.25 + r() * 0.2) } : { x: W * (0.78 + r() * 0.1), y: H * (0.25 + r() * 0.2) };
      case 'ground': return { x: W * (0.15 + r() * 0.7), y: H * (0.68 + r() * 0.1) };
      case 'low': return { x: W * (0.2 + r() * 0.6), y: H * (0.74 + r() * 0.1) };
      default: return { x: W * (0.25 + r() * 0.5), y: H * (0.35 + r() * 0.3) };
    }
  };

  /* 飘落之物：花瓣 / 叶 / 雪 */
  World.prototype.drift = function (x, y, kind, color) {
    if (this.ambient.length > 220) return;
    this.ambient.push({ x, y, kind, color, vx: (Math.random() - 0.5) * 20, vy: 14 + Math.random() * 26, ph: Math.random() * TAU, s: 2.2 + Math.random() * 2.6, life: 9 + Math.random() * 5, age: 0 });
  };

  World.prototype.update = function (dt) {
    this.t += dt;
    const W = this.W, H = this.H;
    this.nightK += clamp((this.night ? 1 : 0) - this.nightK, -dt / 2.2, dt / 2.2);
    this.fluid.night = ease(this.nightK);
    // 微风常在，阵风来去
    this.gust *= Math.exp(-dt / 2.4);
    const breeze = (noise1(this.t * 0.13) - 0.5) * 0.5;
    this.wind += (breeze + this.gust - this.wind) * Math.min(1, dt * 2.5);
    // 四时染纸
    const T = { '春': [1.0, 1.004, 0.985], '夏': [0.982, 1.004, 0.972], '秋': [1.012, 0.984, 0.946], '冬': [0.965, 0.984, 1.004] }[this.season] || [1, 1, 1];
    for (let i = 0; i < 3; i++) this.tint[i] += (T[i] - this.tint[i]) * Math.min(1, dt * 0.8);
    this.fluid.tint = this.tint;

    if (this.clearing > 0) { this.clearing -= dt; this.fluid.fade(Math.exp(-dt * 3.2)); }

    this.pointer.moved += dt;
    for (const e of this.ents) {
      e.age += dt;
      if (e.age > e.life) e.dying = true;
      if (e.dying) e.fade -= dt / 1.8;
      const K = MS.Kinds[e.kind];
      if (K && K.update) K.update(e, dt, this);
    }
    if (this.ents.some((e) => e.fade <= 0)) this.ents = this.ents.filter((e) => e.fade > 0);

    // 时令的飘落
    this._ambT -= dt;
    if (this._ambT <= 0 && this.season) {
      this._ambT = { '春': 0.35, '夏': 99, '秋': 0.3, '冬': 0.12 }[this.season];
      const x = Math.random() * (W + 200) - 100;
      if (this.season === '春') this.drift(x, -10, 'petal', 'pink');
      else if (this.season === '秋') this.drift(x, -10, 'leaf', Math.random() < 0.5 ? 'orange' : 'yellow');
      else if (this.season === '冬') this.drift(x, -10, 'snow', 'white');
    }
    for (const p of this.ambient) {
      p.age += dt; p.ph += dt * 2.2;
      p.x += (p.vx + this.wind * 120 + Math.sin(p.ph) * 16) * dt;
      p.y += p.vy * dt;
    }
    if (this.ambient.length && (this.ambient[0].age > this.ambient[0].life || this.ambient.length > 200))
      this.ambient = this.ambient.filter((p) => p.age < p.life && p.y < H + 20);

    // 花的位置（蝶、蜂、莺会去找）
    if (((this.t * 2) | 0) !== this._spotTick) {
      this._spotTick = (this.t * 2) | 0;
      const spots = [];
      for (const e of this.ents) if (e.spots && !e.dying) for (const s of e.spots) spots.push(s);
      this.flowerSpots = spots;
    }
  };

  World.prototype.draw = function (ctx) {
    for (const e of this.ents) {
      const K = MS.Kinds[e.kind];
      if (!K || !K.draw) continue;
      ctx.save();
      ctx.globalAlpha = clamp(e.fade, 0, 1);
      K.draw(e, ctx, this);
      ctx.restore();
    }
    // 飘落
    for (const p of this.ambient) {
      const a = clamp(Math.min(p.age * 2, (p.life - p.age) * 0.6), 0, 1);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.ph);
      if (p.kind === 'snow') {
        ctx.fillStyle = this.col('white', 0.9 * a);
        ctx.beginPath(); ctx.arc(0, 0, p.s * 0.6, 0, TAU); ctx.fill();
        if (this.nightK < 0.5) { ctx.strokeStyle = this.ink(0.13 * a); ctx.lineWidth = 0.6; ctx.stroke(); }
      } else {
        ctx.fillStyle = this.col(p.color, 0.78 * a);
        ctx.beginPath();
        if (p.kind === 'petal') ctx.ellipse(0, 0, p.s, p.s * 0.6 * Math.abs(Math.cos(p.ph * 0.7)) + 0.4, 0, 0, TAU);
        else leafPath(ctx, -p.s, 0, 0, p.s * 2.6, p.s * 0.9, 0.1);
        ctx.fill();
      }
      ctx.restore();
    }
  };

  MS.World = World;
  const Kinds = (MS.Kinds = MS.Kinds || {});

  /* ================= 山 ================= */
  Kinds.mountain = {
    z: 20, max: 4, zone: 'land',
    create(e, w) {
      const r = e.rng;
      e.mw = clamp(w.W * (0.42 + r() * 0.2), 380, 980);
      e.mh = clamp(w.H * (0.2 + r() * 0.1), 130, 320);
      e.layers = [];
      const n = 3;
      for (let j = 0; j < n; j++) {
        const peaks = [], k = 2 + ((r() * 3) | 0);
        for (let i = 0; i < k; i++) peaks.push({ c: 0.16 + r() * 0.68, s: 0.07 + r() * 0.12, a: 0.45 + r() * 0.55 });
        if (j === n - 1) peaks.push({ c: 0.5 + (r() - 0.5) * 0.12, s: 0.11, a: 1 }); // 主峰对准落字处
        e.layers.push({ peaks, dx: (j - (n - 1)) * (40 + r() * 60) * (r() < 0.5 ? -1 : 1), dy: (j - (n - 1)) * (26 + r() * 22), sc: 1.25 - j * 0.12, alpha: 0.17 + j * 0.15, seed: r() * 100 });
      }
      e.cache = {};
    },
    render(e, w, night) {
      const pad = 40, cw = Math.ceil(e.mw * 1.5) + pad * 2, chh = Math.ceil(e.mh * 1.5) + pad * 2;
      const c = document.createElement('canvas');
      c.width = cw; c.height = chh;
      const g = c.getContext('2d');
      const ink = night ? '216,218,206' : '34,32,30';
      const rr = mulberry(e.seed + 7);
      for (const L of e.layers) {
        const lw = e.mw * L.sc, x0 = (cw - lw) / 2 + L.dx * 0.5, base = chh - pad + L.dy * 0.4;
        const ridge = (u) => {
          let h = 0;
          for (const p of L.peaks) { const d = (u - p.c) / p.s; h = Math.max(h, p.a * Math.exp(-d * d)) + 0.12 * p.a * Math.exp(-d * d * 0.3); }
          h += (noise1(u * 14 + L.seed) - 0.5) * 0.09 + (noise1(u * 47 + L.seed) - 0.5) * 0.03;
          return Math.max(0, h) * Math.pow(Math.sin(Math.PI * clamp(u, 0, 1)), 0.7);
        };
        const H0 = e.mh * L.sc * 0.82;
        for (let x = 0; x < lw; x += 2) {
          const u = x / lw, rh = ridge(u), top = base - rh * H0, depth = (base - top) * 0.95 + 26;
          const al = L.alpha * ease(rh / 0.22);       // 山脚渐隐入纸，不留硬边
          if (al < 0.004) continue;
          const gr = g.createLinearGradient(0, top, 0, top + depth);
          gr.addColorStop(0, 'rgba(' + ink + ',' + al + ')');
          gr.addColorStop(0.35, 'rgba(' + ink + ',' + al * 0.55 + ')');
          gr.addColorStop(1, 'rgba(' + ink + ',0)');
          g.fillStyle = gr;
          g.fillRect(x0 + x, top, 2.4, depth);
        }
        // 皴：山脊下几笔竖线
        g.strokeStyle = 'rgba(' + ink + ',' + (L.alpha * 0.9) + ')';
        g.lineWidth = 0.9;
        g.beginPath();
        const m = (lw / 16) | 0;
        for (let i = 0; i < m; i++) {
          const u = 0.08 + rr() * 0.84, hx = ridge(u);
          if (hx < 0.2 || rr() < 0.45) continue;
          const x = x0 + u * lw, y = base - hx * H0 + 6 + rr() * 26, len = 10 + rr() * 34;
          g.moveTo(x, y); g.lineTo(x + (rr() - 0.5) * 5, y + len);
        }
        g.stroke();
      }
      return c;
    },
    draw(e, ctx, w) {
      const night = w.nightK > 0.5, key = night ? 'n' : 'd';
      if (!e.cache[key]) e.cache[key] = this.render(e, w, night);
      const c = e.cache[key], g = ease(e.age / 3.2);
      ctx.globalAlpha *= g * (night ? 0.8 : 1);
      // 山脚大致落在落字处之下
      ctx.drawImage(c, e.x - c.width / 2, e.y - c.height + e.mh * 0.62 + 40 + (1 - g) * 14);
    }
  };

  /* ================= 月 ================= */
  Kinds.moon = {
    z: 8, single: true, zone: 'skyR',
    create(e, w) { e.r = clamp(Math.min(w.W, w.H) * 0.062, 34, 72); },
    draw(e, ctx, w) {
      const g = easeOut(e.age / 2.4), r = e.r * (0.55 + 0.45 * g), k = w.nightK;
      ctx.globalAlpha *= g;
      // 白昼：以淡墨烘出月轮（留白为月）；夜：自己发光
      let gr = ctx.createRadialGradient(e.x, e.y, r * 0.9, e.x, e.y, r * 2.5);
      gr.addColorStop(0, w.ink(lerp(0.34, 0.0, k)));
      gr.addColorStop(0.35, w.ink(lerp(0.16, 0.0, k)));
      gr.addColorStop(1, w.ink(0));
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(e.x, e.y, r * 2.5, 0, TAU); ctx.fill();
      if (k > 0.02) softDot(ctx, e.x, e.y, r * 4.2, 'rgba(250,244,214,' + 0.3 * k + ')', 'rgba(250,244,214,0)');
      gr = ctx.createRadialGradient(e.x - r * 0.25, e.y - r * 0.25, r * 0.1, e.x, e.y, r);
      gr.addColorStop(0, 'rgba(' + (k > 0.5 ? '255,252,232' : '244,240,228') + ',1)');
      gr.addColorStop(1, 'rgba(' + (k > 0.5 ? '246,238,200' : '232,227,212') + ',1)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, TAU); ctx.fill();
      // 桂影
      ctx.fillStyle = 'rgba(120,116,100,0.07)';
      ctx.beginPath(); ctx.ellipse(e.x + r * 0.22, e.y - r * 0.1, r * 0.3, r * 0.22, 0.6, 0, TAU);
      ctx.ellipse(e.x - r * 0.3, e.y + r * 0.3, r * 0.2, r * 0.15, -0.4, 0, TAU); ctx.fill();
    }
  };

  /* ================= 日 ================= */
  Kinds.sun = {
    z: 7, single: true, zone: 'skyR',
    create(e, w) { e.r = clamp(Math.min(w.W, w.H) * 0.056, 30, 64); e.y0 = e.y + 60; },
    draw(e, ctx, w) {
      const g = easeOut(e.age / 3), y = lerp(e.y0, e.y, g), r = e.r;
      ctx.globalAlpha *= g * (1 - w.nightK);     // 入夜则日隐
      softDot(ctx, e.x, y, r * 3.4, w.col('red', 0.16), w.col('orange', 0));
      const gr = ctx.createRadialGradient(e.x - r * 0.2, y - r * 0.2, r * 0.1, e.x, y, r);
      gr.addColorStop(0, w.col('orange', 0.92));
      gr.addColorStop(0.75, w.col('red', 0.9));
      gr.addColorStop(1, w.col('red', 0.55));
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(e.x, y, r, 0, TAU); ctx.fill();
    }
  };

  /* ================= 星 ================= */
  Kinds.stars = {
    z: 5, max: 3, zone: 'sky',
    create(e, w) {
      e.pts = [];
      for (let i = 0; i < 46; i++) {
        const a = e.rng() * TAU, d = Math.pow(e.rng(), 0.7);
        e.pts.push({ x: clamp(e.x + Math.cos(a) * d * w.W * 0.3, 10, w.W - 10), y: clamp(e.y + Math.sin(a) * d * w.H * 0.22, 8, w.H * 0.7), s: 0.8 + e.rng() * 1.9, ph: e.rng() * TAU, sp: 0.6 + e.rng() * 1.8, d });
      }
    },
    draw(e, ctx, w) {
      const k = w.nightK;
      for (const p of e.pts) {
        const born = ease((e.age - p.d * 1.6) / 0.8);
        if (born <= 0) continue;
        const tw = 0.55 + 0.45 * Math.sin(w.t * p.sp + p.ph), a = born * tw;
        if (k > 0.3) softDot(ctx, p.x, p.y, p.s * 5, 'rgba(255,246,210,' + 0.3 * a * k + ')', 'rgba(255,246,210,0)');
        ctx.fillStyle = k > 0.5 ? 'rgba(255,250,226,' + a + ')' : w.ink(0.55 * a);
        ctx.beginPath();
        const s = p.s * (k > 0.5 ? 1.1 : 0.9);
        ctx.moveTo(p.x, p.y - s * 2.2); ctx.quadraticCurveTo(p.x, p.y, p.x + s * 2.2, p.y);
        ctx.quadraticCurveTo(p.x, p.y, p.x, p.y + s * 2.2); ctx.quadraticCurveTo(p.x, p.y, p.x - s * 2.2, p.y);
        ctx.quadraticCurveTo(p.x, p.y, p.x, p.y - s * 2.2);
        ctx.fill();
      }
    }
  };

  /* ================= 云 ================= */
  Kinds.cloud = {
    z: 30, max: 5, zone: 'high',
    create(e, w) {
      e.puffs = [];
      const n = 7 + ((e.rng() * 4) | 0), span = 90 + e.rng() * 90;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1) - 0.5;
        e.puffs.push({ dx: u * span * 2 + (e.rng() - 0.5) * 30, dy: -Math.cos(u * Math.PI) * 26 * e.rng() + (e.rng() - 0.5) * 12, r: 34 + e.rng() * 38 * (1 - Math.abs(u)) });
      }
      e.speed = 5 + e.rng() * 8;
      w.dye(e.x, e.y, [0.1, 0, 0], 70);
    },
    update(e, dt, w) {
      e.x += (e.speed + w.wind * 90) * dt;
      if (e.x > w.W + 260) e.x = -260;
      if (e.x < -260) e.x = w.W + 260;
    },
    draw(e, ctx, w) {
      const g = ease(e.age / 3);
      ctx.globalAlpha *= g;
      for (const p of e.puffs) {
        const x = e.x + p.dx, y = e.y + p.dy + Math.sin(w.t * 0.3 + p.dx) * 2;
        softDot(ctx, x, y + p.r * 0.28, p.r, w.ink(lerp(0.11, 0.09, w.nightK)), w.ink(0));
        softDot(ctx, x, y - p.r * 0.22, p.r * 0.72, w.col('paper', lerp(0.6, 0.0, w.nightK)), w.col('paper', 0));
        if (w.nightK > 0.2) softDot(ctx, x, y - p.r * 0.2, p.r * 0.7, 'rgba(210,214,220,' + 0.07 * w.nightK + ')', 'rgba(210,214,220,0)');
      }
    }
  };

  /* ================= 烟（岚气） ================= */
  Kinds.mist = {
    z: 46, max: 3, zone: 'land',
    create(e, w) {
      e.bands = [];
      for (let i = 0; i < 6; i++) e.bands.push({ dx: (e.rng() - 0.5) * w.W * 0.5, dy: (e.rng() - 0.5) * 90, rx: 180 + e.rng() * 220, ry: 22 + e.rng() * 26, sp: 3 + e.rng() * 7, ph: e.rng() * 9 });
    },
    update(e, dt, w) { for (const b of e.bands) { b.dx += (b.sp + w.wind * 50) * dt; if (b.dx > w.W * 0.6) b.dx = -w.W * 0.6; if (b.dx < -w.W * 0.6) b.dx = w.W * 0.6; } },
    draw(e, ctx, w) {
      const g = ease(e.age / 4);
      for (const b of e.bands) {
        ctx.save();
        ctx.translate(e.x + b.dx, e.y + b.dy + Math.sin(w.t * 0.2 + b.ph) * 5);
        ctx.scale(1, b.ry / b.rx);
        softDot(ctx, 0, 0, b.rx, w.col('paper', 0.72 * g), w.col('paper', 0));
        ctx.restore();
      }
    }
  };

  /* ================= 霞 ================= */
  Kinds.glow = {
    z: 3, single: true, zone: 'land',
    create(e, w) { e.streaks = []; for (let i = 0; i < 7; i++) e.streaks.push({ x: e.rng() * w.W, dy: (e.rng() - 0.5) * 110, rx: 160 + e.rng() * 260, ry: 8 + e.rng() * 14, c: e.rng() < 0.6 ? 'red' : 'orange' }); },
    draw(e, ctx, w) {
      const g = ease(e.age / 5), h = w.H * 0.34, y0 = e.y - h * 0.6;
      const gr = ctx.createLinearGradient(0, y0, 0, y0 + h);
      gr.addColorStop(0, w.col('red', 0));
      gr.addColorStop(0.45, w.col('red', 0.2 * g));
      gr.addColorStop(0.7, w.col('orange', 0.17 * g));
      gr.addColorStop(1, w.col('yellow', 0));
      ctx.fillStyle = gr;
      ctx.fillRect(0, y0, w.W, h);
      for (const s of e.streaks) {
        ctx.save();
        ctx.translate((s.x + w.t * 3) % (w.W + 600) - 300, e.y + s.dy);
        ctx.scale(1, s.ry / s.rx);
        softDot(ctx, 0, 0, s.rx, w.col(s.c, 0.2 * g), w.col(s.c, 0));
        ctx.restore();
      }
    }
  };

  /* ================= 虹 ================= */
  Kinds.rainbow = {
    z: 6, single: true, life: 70, zone: 'high',
    create(e, w) { e.R = clamp(Math.min(w.W * 0.3, w.H * 0.55), 160, 520); },
    draw(e, ctx, w) {
      const g = ease(e.age / 3.6), cols = ['red', 'orange', 'yellow', 'leaf', 'green', 'blue'], lw = e.R * 0.022;
      const cy = e.y + e.R * 0.82;
      ctx.lineCap = 'round';
      for (let i = 0; i < cols.length; i++) {
        ctx.strokeStyle = w.col(cols[i], 0.2 * clamp((e.life - e.age) / 8, 0, 1));
        ctx.lineWidth = lw * 1.25;
        ctx.beginPath();
        ctx.arc(e.x, cy, e.R - i * lw, Math.PI, Math.PI + Math.PI * g);
        ctx.stroke();
      }
    }
  };

  /* ================= 雨 ================= */
  Kinds.rain = {
    z: 80, single: true, life: 36, zone: 'sky',
    respawn(e) { e.age = Math.min(e.age, 2); e.dying = false; e.fade = 1; },
    create(e, w) {
      e.drops = [];
      for (let i = 0; i < 240; i++) e.drops.push({ x: Math.random() * (w.W + 300) - 150, y: Math.random() * w.H, l: 10 + Math.random() * 18, v: 620 + Math.random() * 380, g: w.H * (0.62 + Math.random() * 0.38) });
      e.rip = [];
      e.k = 0;
    },
    update(e, dt, w) {
      e.k = clamp(Math.min(e.age / 3, (e.life - e.age) / 4), 0, 1) * e.fade;
      const sl = w.wind * 0.5;
      for (let i = 0; i < e.drops.length * e.k; i++) {
        const d = e.drops[i];
        d.y += d.v * dt; d.x += d.v * sl * dt;
        if (d.y > d.g) {
          if (e.rip.length < 40 && Math.random() < 0.4) e.rip.push({ x: d.x, y: d.g, a: 0 });
          d.y = -20 - Math.random() * 80; d.x = Math.random() * (w.W + 300) - 150; d.g = w.H * (0.62 + Math.random() * 0.38);
        }
      }
      for (const r of e.rip) r.a += dt;
      e.rip = e.rip.filter((r) => r.a < 0.9);
      if (Math.random() < dt * 5 * e.k) w.stir(Math.random() * w.W, Math.random() * w.H, w.wind * 80, 160, 46);
      if (Math.random() < dt * 4.5 * e.k) w.emit('raindrop');
    },
    draw(e, ctx, w) {
      const sl = w.wind * 0.5;
      ctx.strokeStyle = w.ink(0.32);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < e.drops.length * e.k; i++) { const d = e.drops[i]; ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.l * sl, d.y - d.l); }
      ctx.stroke();
      ctx.lineWidth = 0.8;
      for (const r of e.rip) {
        ctx.strokeStyle = w.ink(0.3 * (1 - r.a / 0.9));
        ctx.beginPath(); ctx.ellipse(r.x, r.y, 3 + r.a * 22, 1 + r.a * 6, 0, 0, TAU); ctx.stroke();
      }
    }
  };

  /* ================= 雪 ================= */
  Kinds.snow = {
    z: 81, single: true, life: 48, zone: 'sky',
    respawn(e) { e.age = Math.min(e.age, 2); e.dying = false; e.fade = 1; },
    create(e, w) {
      e.fl = [];
      for (let i = 0; i < 190; i++) e.fl.push({ x: Math.random() * w.W, y: Math.random() * w.H, r: 1 + Math.random() * 2.6, v: 22 + Math.random() * 44, ph: Math.random() * TAU });
    },
    update(e, dt, w) {
      e.k = clamp(Math.min(e.age / 4, (e.life - e.age) / 5), 0, 1);
      for (const f of e.fl) {
        f.ph += dt * 1.4; f.y += f.v * dt; f.x += (Math.sin(f.ph) * 14 + w.wind * 140) * dt;
        if (f.y > w.H + 6) { f.y = -6; f.x = Math.random() * w.W; }
        if (f.x < -10) f.x = w.W + 10; if (f.x > w.W + 10) f.x = -10;
      }
      if (Math.random() < dt * 1.2 * e.k) w.emit('snowflake');
    },
    draw(e, ctx, w) {
      const n = (e.fl.length * e.k) | 0, day = w.nightK < 0.5;
      ctx.fillStyle = w.col('white', 0.92);
      ctx.beginPath();
      for (let i = 0; i < n; i++) { const f = e.fl[i]; ctx.moveTo(f.x + f.r, f.y); ctx.arc(f.x, f.y, f.r, 0, TAU); }
      ctx.fill();
      if (day) { ctx.strokeStyle = w.ink(0.14); ctx.lineWidth = 0.6; ctx.stroke(); }
    }
  };

  /* ================= 风 ================= */
  Kinds.wind = {
    z: 82, life: 7, max: 2, zone: 'mid',
    create(e, w) {
      e.dir = e.x < w.W / 2 ? 1 : -1;
      if (Math.abs(w.pointer.vx) > 120 && w.pointer.moved < 0.6) e.dir = Math.sign(w.pointer.vx);
      w.gust = e.dir * 1.25;
      e.lines = [];
      for (let i = 0; i < 7; i++) e.lines.push({ y: clamp(e.y + (e.rng() - 0.5) * w.H * 0.6, 30, w.H - 30), off: -e.rng() * 0.8, amp: 12 + e.rng() * 26, fr: 0.006 + e.rng() * 0.008, sp: 0.5 + e.rng() * 0.35, ph: e.rng() * TAU });
    },
    update(e, dt, w) {
      if (e.age < 4.5) w.gust = lerp(w.gust, e.dir * 1.2, dt * 2);
      for (const l of e.lines) {
        const p = (e.age * l.sp + l.off);
        if (p > 0 && p < 1.15) {
          const hx = e.dir > 0 ? p * (w.W + 200) - 100 : w.W + 100 - p * (w.W + 200);
          const hy = l.y + Math.sin(hx * l.fr + l.ph) * l.amp;
          w.stir(hx, hy, e.dir * 1500, Math.cos(hx * l.fr + l.ph) * 260, 54);
        }
      }
    },
    draw(e, ctx, w) {
      ctx.lineCap = 'round';
      for (const l of e.lines) {
        const p = e.age * l.sp + l.off;
        if (p <= 0 || p > 1.5) continue;
        const head = p * (w.W + 200) - 100, len = 240;
        const n = 22;
        for (let i = 0; i < n; i++) {
          const u0 = head - (i / n) * len, u1 = head - ((i + 1) / n) * len;
          const x0 = e.dir > 0 ? u0 : w.W - u0, x1 = e.dir > 0 ? u1 : w.W - u1;
          ctx.strokeStyle = w.ink(0.26 * (1 - i / n) * clamp(1.5 - p, 0, 1));
          ctx.lineWidth = 2.2 * (1 - i / n) + 0.3;
          ctx.beginPath();
          ctx.moveTo(x0, l.y + Math.sin(x0 * l.fr + l.ph) * l.amp);
          ctx.lineTo(x1, l.y + Math.sin(x1 * l.fr + l.ph) * l.amp);
          ctx.stroke();
        }
      }
    }
  };

  /* ================= 雷 ================= */
  Kinds.thunder = {
    z: 85, life: 1.7, max: 3, zone: 'high',
    create(e, w) {
      const r = e.rng;
      function bolt(x0, y0, x1, y1, disp, out) {
        if (disp < 5) { out.push(x1, y1); return; }
        const mx = (x0 + x1) / 2 + (r() - 0.5) * disp, my = (y0 + y1) / 2 + (r() - 0.5) * disp * 0.35;
        bolt(x0, y0, mx, my, disp / 2, out); bolt(mx, my, x1, y1, disp / 2, out);
      }
      const sx = e.x + (r() - 0.5) * 240;
      e.main = [sx, -10]; bolt(sx, -10, e.x, e.y, 150, e.main);
      e.forks = [];
      for (let k = 0; k < 3; k++) {
        const i = (((0.25 + r() * 0.5) * (e.main.length / 2)) | 0) * 2, bx = e.main[i], by = e.main[i + 1];
        const f = [bx, by]; bolt(bx, by, bx + (r() - 0.5) * 260, by + 60 + r() * 150, 70, f);
        e.forks.push(f);
      }
      for (let a = 0; a < 8; a++) w.stir(e.x, e.y, Math.cos(a * 0.785) * 900, Math.sin(a * 0.785) * 900, 60);
      w.dye(e.x, e.y, [0.5, 0, 0], 26);
      w.emit('thunder', { x: e.x });
    },
    draw(e, ctx, w) {
      const t = e.age, on = t < 0.1 || (t > 0.16 && t < 0.3) || (t > 0.42 && t < 0.5);
      const a = on ? 1 : clamp(0.45 - (t - 0.5) * 0.6, 0, 0.45);
      if (on) { ctx.fillStyle = w.nightK > 0.5 ? 'rgba(235,240,255,0.16)' : 'rgba(20,20,26,0.07)'; ctx.fillRect(0, 0, w.W, w.H); }
      if (a <= 0) return;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      const path = (pts) => { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
      if (w.nightK > 0.5) { ctx.strokeStyle = 'rgba(200,220,255,' + 0.25 * a + ')'; ctx.lineWidth = 9; path(e.main); }
      ctx.strokeStyle = w.nightK > 0.5 ? 'rgba(248,250,255,' + a + ')' : w.ink(0.9 * a);
      ctx.lineWidth = 2.6; path(e.main);
      ctx.lineWidth = 1.2; e.forks.forEach(path);
    }
  };

  /* ================= 水 ================= */
  Kinds.water = {
    z: 40, max: 3, zone: 'low',
    create(e, w) {
      e.half = clamp(w.W * 0.3, 220, 620);
      e.lines = [];
      for (let j = 0; j < 11; j++) {
        const segs = [];
        let u = -1 + e.rng() * 0.2;
        while (u < 1) { const len = 0.08 + e.rng() * 0.3; segs.push([u, Math.min(1, u + len)]); u += len + 0.04 + e.rng() * 0.16; }
        e.lines.push({ dy: (j - 3) * 13 + (e.rng() - 0.5) * 6, segs, ph: e.rng() * TAU, amp: 1.6 + e.rng() * 2.6, fr: 0.018 + e.rng() * 0.014, sp: 0.5 + e.rng() * 0.8, a: 0.14 + e.rng() * 0.22 });
      }
      w.dye(e.x, e.y, [0.05, 0, 0.14], 90);
      e.tick = 0;
    },
    update(e, dt, w) {
      e.tick -= dt;
      if (e.tick <= 0) { e.tick = 0.22; w.stir(e.x + (Math.random() - 0.5) * e.half * 1.6, e.y + Math.random() * 90, 130, (Math.random() - 0.5) * 30, 60); }
    },
    draw(e, ctx, w) {
      const g = ease(e.age / 3);
      ctx.lineCap = 'round';
      for (const l of e.lines) {
        ctx.strokeStyle = w.ink(l.a * g);
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        for (const s of l.segs) {
          const a = s[0] * g, b = s[1] * g;
          for (let u = a; u <= b + 0.001; u += 0.02) {
            const x = e.x + u * e.half, edge = Math.cos(u * Math.PI / 2);
            const y = e.y + l.dy * (0.6 + 0.4 * edge) + Math.sin(x * l.fr + l.ph - w.t * l.sp) * l.amp;
            if (u === a) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }
    }
  };
})();
