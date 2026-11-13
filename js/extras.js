/* 词源 · extras.js — 字库扩充：不再只是《声律启蒙》里的字
 * 为演《洛神赋》添的灵：林 兰 芝 珠 羽 凫 霜 泪 渊 光，以及 马 车 神 人 岩 旗（后六样借手卷里的画法）。
 * 都按水墨来：淡墨晕染作体，要紧处提线，颜色只点一点。
 */
(function () {
  'use strict';
  const MS = window.MS, Kinds = MS.Kinds;
  const { clamp, lerp, ease, easeOut, softDot, leafPath, noise1, TAU } = MS.util;
  const { mark, strand, swell, taper, nail, orchid, wet, dry, dense } = MS.ink;
  const sway = (w, ph, sp) => Math.sin(w.t * (sp || 1) + ph) * (0.25 + Math.abs(w.wind) * 0.5) + w.wind * 1.6;

  /* ================= 林：几株杂树，点叶成荫 ================= */
  Kinds.grove = {
    z: 56, max: 3, zone: 'ground',
    create(e, w) {
      const r = e.rng, n = 5 + ((r() * 3) | 0);
      e.trees = [];
      for (let i = 0; i < n; i++) {
        const h = 150 + r() * 170, dabs = [];
        for (let k = 0; k < 26; k++) { const a = r() * TAU, d = Math.sqrt(r()); dabs.push([Math.cos(a) * d, Math.sin(a) * d * 0.72, r() * TAU, 5 + r() * 6]); }
        e.trees.push({ dx: (i - (n - 1) / 2) * 68 + (r() - 0.5) * 44, h, lean: (r() - 0.5) * 0.3, tone: 0.3 + r() * 0.4, ph: r() * TAU, rad: 46 + r() * 34, dabs, d: i * 0.25 });
      }
      e.trees.sort((a, b) => a.tone - b.tone);
      e.base = e.y + 110;
    },
    draw(e, ctx, w) {
      for (const t of e.trees) {
        const g = ease((e.age - t.d) / 2.6);
        if (g <= 0) continue;
        const bx = e.x + t.dx, sw = sway(w, t.ph, 0.8) * 5, tx = bx + t.lean * t.h + sw, ty = e.base - t.h * g;
        mark(ctx, [bx, e.base, bx + t.lean * t.h * 0.3, e.base - t.h * 0.45 * g, tx, ty], (tt) => 9 - 6 * tt, w.ink(t.tone + 0.3));
        mark(ctx, [bx + t.lean * t.h * 0.3, e.base - t.h * 0.45 * g, tx - 26, ty + t.h * 0.18], taper(3.4), w.ink(t.tone + 0.2));
        mark(ctx, [bx + t.lean * t.h * 0.4, e.base - t.h * 0.56 * g, tx + 30, ty + t.h * 0.12], taper(3), w.ink(t.tone + 0.2));
        const lg = ease((g - 0.5) / 0.5);
        if (lg <= 0) continue;
        // 四时：春林新绿而疏，夏林浓荫，秋林丹黄，冬林落尽、枝头有雪
        const LA = w.by(0.72, 1.12, 0.92, 0.14, 1), wi = w.sea['冬'];
        softDot(ctx, tx, ty + 6, t.rad * 1.3 * lg, w.ink(t.tone * 0.42 * (1 - wi * 0.7)), w.ink(0));
        softDot(ctx, tx, ty + 6, t.rad * lg, w.hue('leaf', 'green', 'orange', 'white', 'leaf', w.by(0.26, 0.3, 0.2, 0.34, 0.2)), w.hue('leaf', 'green', 'orange', 'white', 'leaf', 0));
        ctx.fillStyle = w.hue('leaf', 'ink', 'orange', 'ink', 'ink', w.by(0.72, t.tone + 0.22, 0.64, 0.5, t.tone + 0.12));
        ctx.beginPath();
        for (const d of t.dabs) leafPath(ctx, tx + d[0] * t.rad * lg, ty + 6 + d[1] * t.rad * lg, d[2] + sw * 0.03, d[3] * lg * LA, 2.6, 0.1);
        ctx.fill();
      }
    }
  };

  /* ================= 兰：一丛长叶，几茎幽花 ================= */
  Kinds.orchid = {
    z: 63, max: 5, zone: 'ground',
    create(e, w) {
      const r = e.rng;
      e.clumps = [];
      for (let c = 0; c < 2 + ((r() * 2) | 0); c++) {
        const leaves = [], stalks = [];
        for (let i = 0; i < 8; i++) leaves.push({ a: -Math.PI / 2 + (r() - 0.5) * 2.1, len: 70 + r() * 90, droop: (r() - 0.5) * 0.5, ph: r() * TAU, tone: 0.42 + r() * 0.4 });
        for (let i = 0; i < 2; i++) stalks.push({ a: -Math.PI / 2 + (r() - 0.5) * 0.7, len: 60 + r() * 50, ph: r() * TAU });
        e.clumps.push({ dx: (c - 0.8) * 62 + (r() - 0.5) * 30, leaves, stalks, d: c * 0.5 });
      }
      e.spots = e.clumps.map((c) => ({ x: e.x + c.dx, y: e.y - 70 }));
    },
    draw(e, ctx, w) {
      for (const c of e.clumps) {
        const g = ease((e.age - c.d) / 2.2);
        if (g <= 0) continue;
        const bx = e.x + c.dx, by = e.y;
        for (const l of c.leaves) mark(ctx, strand(bx, by, l.a + sway(w, l.ph, 1.2) * 0.05, l.len * g, l.ph, 4, l.droop + (l.a > -Math.PI / 2 ? 0.25 : -0.25)), swell(5.2), w.ink(l.tone));
        const fg = ease((g - 0.6) / 0.4) * w.by(1, 0, 0.4, 0, 1);      // 兰开在春（秋兰偶有），其余时候只有叶
        if (fg <= 0.02) continue;
        for (const s of c.stalks) {
          const pp = strand(bx, by, s.a + sway(w, s.ph, 1.4) * 0.04, s.len * g, s.ph, 2, 0);
          mark(ctx, pp, taper(2.2), w.col('leaf', 0.7));
          for (const k of [3, 5, 7]) {
            const fx = pp[k * 2], fy = pp[k * 2 + 1];
            ctx.fillStyle = w.col('leaf', 0.5);
            ctx.beginPath();
            for (let j = 0; j < 5; j++) leafPath(ctx, fx, fy, s.ph + j * TAU / 5 + k, 9 * fg, 2.8, 0.1);
            ctx.fill();
            softDot(ctx, fx, fy, 3.2 * fg, w.col('red', 0.7), w.col('red', 0));
          }
        }
      }
    }
  };

  /* ================= 芝：石上灵芝，盖有云纹 ================= */
  Kinds.zhi = {
    z: 63, max: 4, zone: 'ground',
    create(e, w) {
      e.caps = [];
      for (let i = 0; i < 3; i++) e.caps.push({ dx: (i - 1) * 44 + (e.rng() - 0.5) * 20, h: 34 + e.rng() * 44, r: 22 + e.rng() * 16, lean: (e.rng() - 0.5) * 0.5, d: i * 0.4 });
    },
    draw(e, ctx, w) {
      for (const c of e.caps) {
        const g = ease((e.age - c.d) / 1.8);
        if (g <= 0) continue;
        const bx = e.x + c.dx, tx = bx + c.lean * c.h, ty = e.y - c.h * g, r = c.r * g;
        mark(ctx, [bx, e.y, bx + c.lean * c.h * 0.2, e.y - c.h * 0.5 * g, tx, ty], (tt) => 6 - 2 * tt, w.ink(0.6));
        softDot(ctx, tx, ty - r * 0.2, r * 1.5, w.col('red', 0.16), w.col('red', 0));
        ctx.beginPath(); ctx.ellipse(tx, ty, r, r * 0.46, c.lean * 0.4, Math.PI, TAU); ctx.quadraticCurveTo(tx, ty + r * 0.22, tx - r, ty); ctx.closePath();
        ctx.fillStyle = w.col('red', 0.46); ctx.fill();
        ctx.fillStyle = w.ink(0.2); ctx.fill();
        ctx.strokeStyle = w.ink(0.5); ctx.lineWidth = 1;
        for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.ellipse(tx, ty, r * k / 3.4, r * 0.46 * k / 3.4, c.lean * 0.4, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); }
        mark(ctx, [tx - r, ty, tx - r * 0.5, ty - r * 0.4, tx, ty - r * 0.46, tx + r * 0.5, ty - r * 0.4, tx + r, ty], swell(1.8), w.ink(0.6));
      }
    }
  };

  /* ================= 珠：明珠数颗，自带一圈光 ================= */
  Kinds.pearl = {
    z: 74, max: 4, zone: 'mid',
    create(e, w) {
      e.p = [];
      for (let i = 0; i < 9; i++) { const a = e.rng() * TAU, d = 20 + e.rng() * 90; e.p.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.7, r: 4.5 + e.rng() * 4.5, ph: e.rng() * TAU, d: i * 0.18 }); }
    },
    draw(e, ctx, w) {
      const nk = w.nightK;
      for (const p of e.p) {
        const g = easeOut((e.age - p.d) / 1.2);
        if (g <= 0) continue;
        const x = e.x + p.dx, y = e.y + p.dy + Math.sin(w.t * 1.2 + p.ph) * 5, tw = 0.75 + 0.25 * Math.sin(w.t * 2.3 + p.ph), r = p.r * g;
        softDot(ctx, x, y, r * 4, w.col('white', lerp(0.5, 0.42, nk) * tw), w.col('white', 0));
        softDot(ctx, x, y + r * 0.2, r * 1.5, w.ink(lerp(0.26, 0, nk)), w.ink(0));
        softDot(ctx, x - r * 0.25, y - r * 0.3, r * 1.1, w.col('white', 1), w.col('white', 0.1));
      }
    }
  };

  /* ================= 羽：翠羽几片，悠悠飘落 ================= */
  Kinds.feather = {
    z: 73, max: 4, zone: 'high',
    create(e, w) {
      e.f = [];
      for (let i = 0; i < 6; i++) e.f.push({ x: e.x + (e.rng() - 0.5) * 220, y: e.y + (e.rng() - 0.5) * 160, v: 16 + e.rng() * 16, ph: e.rng() * TAU, len: 30 + e.rng() * 18 });
    },
    update(e, dt, w) {
      for (const f of e.f) {
        f.ph += dt * 1.3; f.y += f.v * dt; f.x += (Math.sin(f.ph) * 34 + w.wind * 110) * dt;
        if (f.y > e.y + 440) { f.y = e.y - 90; f.x = e.x + (Math.random() - 0.5) * 240; }
      }
    },
    draw(e, ctx, w) {
      const g = ease(e.age / 1.2);
      for (const f of e.f) {
        const a = Math.PI / 2 + Math.sin(f.ph) * 0.7, c = Math.cos(a), s = Math.sin(a), L = f.len * g, tx = f.x + c * L, ty = f.y + s * L;
        ctx.fillStyle = w.col('green', 0.5);
        ctx.beginPath(); leafPath(ctx, f.x, f.y, a, L, L * 0.2, 0.06); ctx.fill();
        softDot(ctx, f.x + c * L * 0.75, f.y + s * L * 0.75, L * 0.2, w.col('blue', 0.5), w.col('blue', 0));
        mark(ctx, [f.x - c * 6, f.y - s * 6, f.x + c * L * 0.5, f.y + s * L * 0.5, tx, ty], taper(1.6), w.ink(0.6));
      }
    }
  };

  /* ================= 凫：野鸭贴水疾飞 ================= */
  Kinds.duck = {
    z: 71, max: 3, zone: 'low',
    create(e, w) {
      e.dir = e.x < w.W / 2 ? 1 : -1; e.b = [];
      for (let i = 0; i < 4; i++) e.b.push({ x: e.x - e.dir * i * 70, dy: (e.rng() - 0.5) * 60 - i * 12, v: 150 + e.rng() * 50, ph: e.rng() * TAU });
      w.emit('birds');
    },
    update(e, dt, w) {
      for (const b of e.b) {
        b.x += e.dir * b.v * dt; b.ph += dt * 15;
        if (b.x > w.W + 120) b.x = -120; if (b.x < -120) b.x = w.W + 120;
      }
    },
    draw(e, ctx, w) {
      const g = ease(e.age / 1);
      for (const b of e.b) {
        const y = e.y + b.dy + Math.sin(w.t * 1.7 + b.ph * 0.1) * 12, f = Math.sin(b.ph);
        ctx.save(); ctx.translate(b.x, y); ctx.scale(e.dir * g * 1.15, g * 1.15);
        const wing = (al, lift) => { ctx.fillStyle = w.ink(al); ctx.beginPath(); ctx.moveTo(6, -2); ctx.quadraticCurveTo(2, -6 - f * 15 + lift, -9, -3 - f * 19 + lift); ctx.quadraticCurveTo(-11, -2, -6, 1); ctx.closePath(); ctx.fill(); };
        wing(0.36, 2);
        softDot(ctx, 0, 0, 15, w.ink(0.16), w.ink(0));
        mark(ctx, [-14, 1, -4, 3, 9, 0], (tt) => 7 + 3 * Math.sin(Math.PI * tt), w.ink(0.66));       // 身
        mark(ctx, [8, -1, 17, -5, 24, -7], (tt) => 4.4 - 1.4 * tt, w.ink(0.7));                    // 伸直的颈
        softDot(ctx, 25, -7.5, 5, w.col('green', 0.9), w.col('green', 0.1));                       // 绿头
        mark(ctx, [27, -7, 34, -6], taper(2.6), w.col('yellow', 0.9));
        softDot(ctx, 1, 4, 7, w.col('paper', 0.6), w.col('paper', 0));
        wing(0.78, 0);
        ctx.restore();
      }
    }
  };

  /* ================= 霜：繁霜无声，一粒一粒亮着 ================= */
  Kinds.frost = {
    z: 79, single: true, life: 70, zone: 'sky',
    respawn(e) { e.age = Math.min(e.age, 2); e.dying = false; e.fade = 1; },
    create(e, w) {
      e.s = [];
      for (let i = 0; i < 150; i++) e.s.push({ x: Math.random() * w.W, y: Math.random() * w.H, r: 0.8 + Math.random() * 1.6, v: 6 + Math.random() * 12, ph: Math.random() * TAU });
    },
    update(e, dt, w) {
      e.k = clamp(Math.min(e.age / 4, (e.life - e.age) / 5), 0, 1);
      for (const s of e.s) { s.y += s.v * dt; s.x += w.wind * 40 * dt; s.ph += dt * 2.4; if (s.y > w.H + 4) { s.y = -4; s.x = Math.random() * w.W; } }
    },
    draw(e, ctx, w) {
      const n = (e.s.length * (e.k || 0)) | 0, day = w.nightK < 0.5;
      // 地上一层白：越近地面越厚
      MS.util.band(ctx, w, w.H * 0.72, w.H * 0.28, [[0, w.col('white', 0)], [1, w.col('white', 0.2 * (e.k || 0))]]);
      for (let i = 0; i < n; i++) {
        const s = e.s[i], tw = 0.4 + 0.6 * Math.abs(Math.sin(s.ph)), r = s.r * (1 + tw);
        ctx.fillStyle = w.col('white', 0.9 * tw);
        ctx.beginPath(); ctx.moveTo(s.x, s.y - r * 1.8); ctx.quadraticCurveTo(s.x, s.y, s.x + r * 1.8, s.y); ctx.quadraticCurveTo(s.x, s.y, s.x, s.y + r * 1.8); ctx.quadraticCurveTo(s.x, s.y, s.x - r * 1.8, s.y); ctx.quadraticCurveTo(s.x, s.y, s.x, s.y - r * 1.8); ctx.fill();
        if (day) { ctx.strokeStyle = w.ink(0.12 * tw); ctx.lineWidth = 0.5; ctx.stroke(); }
      }
    }
  };

  /* ================= 泪：一滴一滴，落进水里成圈 ================= */
  Kinds.tears = {
    z: 80, max: 3, life: 16, zone: 'mid',
    create(e, w) { e.d = []; e.next = 0; e.fall = Math.min(460, w.H - e.y - 40); },
    update(e, dt, w) {
      e.next -= dt;
      if (e.next <= 0 && e.age < e.life - 3) { e.next = 0.35 + Math.random() * 0.5; e.d.push({ dx: (Math.random() - 0.5) * 40, t: 0 }); }
      for (const d of e.d) { const was = d.t < 1; d.t += dt / 1.1; if (was && d.t >= 1) w.emit('raindrop'); }
      e.d = e.d.filter((d) => d.t < 1.9);
    },
    draw(e, ctx, w) {
      for (const d of e.d) {
        const x = e.x + d.dx;
        if (d.t < 1) {
          const y = e.y + e.fall * d.t * d.t;
          ctx.fillStyle = w.col('blue', 0.42); ctx.beginPath(); leafPath(ctx, x, y, -Math.PI / 2, 13, 3.6, 0); ctx.fill();
          softDot(ctx, x, y, 4, w.col('white', 0.8), w.col('white', 0));
        } else {
          const u = (d.t - 1) / 0.9;
          ctx.strokeStyle = w.ink(0.34 * (1 - u)); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.ellipse(x, e.y + e.fall, 4 + u * 30, 1.5 + u * 7, 0, 0, TAU); ctx.stroke();
        }
      }
    }
  };

  /* ================= 渊：深水回旋 ================= */
  Kinds.pool = {
    z: 41, max: 2, zone: 'low',
    create(e, w) { e.r = 110; e.tk = 0; w.dye(e.x, e.y, [0.06, 0, 0.14], 60); },
    update(e, dt, w) {
      e.tk -= dt;
      if (e.tk <= 0) { e.tk = 0.12; const a = w.t * 2.2; w.stir(e.x + Math.cos(a) * 46, e.y + Math.sin(a) * 18, -Math.sin(a) * 280, Math.cos(a) * 110, 50); }
    },
    draw(e, ctx, w) {
      const g = ease(e.age / 2.4);
      ctx.save(); ctx.translate(e.x, e.y); ctx.scale(1, 0.4);
      softDot(ctx, 0, 0, e.r * 1.3 * g, w.col('blue', 0.26), w.col('blue', 0));
      softDot(ctx, 0, 0, e.r * 0.6 * g, w.ink(0.34), w.ink(0));
      ctx.strokeStyle = w.ink(0.36); ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      for (let k = 0; k < 5; k++) { const r = e.r * g * (0.22 + k * 0.19), a = -w.t * (1.6 - k * 0.24) + k * 1.3; ctx.beginPath(); ctx.arc(0, 0, r, a, a + 3.6 - k * 0.3); ctx.stroke(); }
      ctx.restore();
    }
  };

  /* ================= 光：一团神光，渐渐隐去 ================= */
  Kinds.light = {
    z: 9, max: 2, life: 24, zone: 'high',
    create(e, w) {},
    draw(e, ctx, w) {
      const k = ease(e.age / 1.5) * clamp(1 - (e.age - 4) / (e.life - 6), 0, 1), R = 250;
      softDot(ctx, e.x, e.y, R * (0.7 + 0.3 * k), w.col('warm', 0.34 * k), w.col('warm', 0));
      softDot(ctx, e.x, e.y, R * 0.34, w.col('white', 0.7 * k), w.col('white', 0));
      ctx.fillStyle = w.col('warm', 0.22 * k);
      ctx.beginPath();
      for (let i = 0; i < 14; i++) leafPath(ctx, e.x, e.y, i * TAU / 14 + w.t * 0.12, R * (0.75 + 0.2 * Math.sin(w.t * 1.4 + i * 2)) * k, 9, 0);
      ctx.fill();
    }
  };

  /* ================= 枫：霜后一树丹叶，时时飘落 ================= */
  Kinds.maple = {
    z: 58, max: 3, zone: 'side',
    create(e, w) {
      const r = e.rng;
      e.by = Math.min(w.H + 10, e.y + 400); e.h = Math.max(300, e.by - e.y + 60);
      e.lean = (e.x < w.W / 2 ? 1 : -1) * (0.1 + r() * 0.16); e.tk = 2; e.b = [];
      for (let i = 0; i < 7; i++) {
        const u = 0.36 + i * 0.1 + r() * 0.03, side = i % 2 ? 1 : -1, dabs = [];
        for (let k = 0; k < 15; k++) { const a = r() * TAU, d = Math.sqrt(r()); dabs.push([Math.cos(a) * d, Math.sin(a) * d * 0.7, r() * TAU, 8 + r() * 7, r() < 0.32]); }
        e.b.push({ u, a: -Math.PI / 2 + side * (0.55 + r() * 0.55), len: (120 + r() * 90) * (1.2 - u * 0.55), ph: r() * TAU, dabs });
      }
    },
    update(e, dt, w) {
      e.tk -= dt;
      if (e.tk <= 0 && w.by(0, 0, 1, 0, 1) > 0.5) { e.tk = 0.5 + Math.random() * 1.1; const b = e.b[(Math.random() * e.b.length) | 0]; if (b.tx != null) w.drift(b.tx + (Math.random() - 0.5) * 70, b.ty, 'leaf', Math.random() < 0.65 ? 'red' : 'orange'); }
    },
    draw(e, ctx, w) {
      // 四时：春叶新绿，夏叶浓绿，秋（与平日）一树丹红，冬叶落尽、只余几片
      const g = ease(e.age / 3), sw = sway(w, e.seed % 7, 0.7), H = e.h * g, LA = w.by(0.72, 1, 1, 0.16, 1);
      const c1 = w.hue('leaf', 'green', 'red', 'red', 'red', 0.68), c2 = w.hue('yellow', 'leaf', 'orange', 'orange', 'orange', 0.66);
      const tx = e.x + e.lean * H + sw * 4, ty = e.by - H;
      softDot(ctx, e.x, e.by - 30, 90, w.ink(0.1), w.ink(0));
      mark(ctx, [e.x, e.by, e.x + e.lean * H * 0.2, e.by - H * 0.38, e.x + e.lean * H * 0.72, e.by - H * 0.74, tx, ty], (t) => 17 - 13 * t, w.ink(0.74));
      const lg = ease((g - 0.45) / 0.55);
      for (const b of e.b) {
        const bx = lerp(e.x, tx, b.u * b.u * 0.6 + b.u * 0.4), by = e.by - H * b.u, a = b.a + sw * 0.03;
        const ex = bx + Math.cos(a) * b.len * g, ey = by + Math.sin(a) * b.len * g * 0.8;
        mark(ctx, [bx, by, (bx + ex) / 2, (by + ey) / 2 - 12, ex, ey], taper(5.5), w.ink(0.64));
        b.tx = ex; b.ty = ey;
        if (lg <= 0) continue;
        const R = 62 * lg;
        softDot(ctx, ex, ey, R * 1.5, w.hue('leaf', 'green', 'red', 'white', 'red', w.by(0.12, 0.12, 0.2, 0.16, 0.2)), w.hue('leaf', 'green', 'red', 'white', 'red', 0));
        for (let pass = 0; pass < 2; pass++) {
          ctx.fillStyle = pass ? c2 : c1;
          ctx.beginPath();
          for (const d of b.dabs) {
            if (d[4] !== !!pass) continue;
            const x = ex + d[0] * R, y = ey + d[1] * R;
            for (let j = -1; j <= 1; j++) leafPath(ctx, x, y, d[2] + j * 0.8 + sw * 0.04, d[3] * lg * LA, 2.8, 0);     // 三裂的叶
          }
          ctx.fill();
        }
      }
    }
  };

  /* ================= 酒：一坛两盏，酒气微温 ================= */
  Kinds.wine = {
    z: 64, max: 3, zone: 'ground',
    create(e, w) { e.s = 1 + e.rng() * 0.25; e.ph = e.rng() * TAU; },
    draw(e, ctx, w) {
      const g = ease(e.age / 1.8), s = e.s * g;
      if (s <= 0) return;
      softDot(ctx, e.x, e.y + 10, 120 * g, 'rgba(255,190,110,' + (0.06 + 0.1 * w.nightK) * g + ')', 'rgba(255,190,110,0)');
      ctx.save(); ctx.translate(e.x, e.y + 44); ctx.scale(s, s);
      softDot(ctx, 4, -4, 74, w.ink(0.14), w.ink(0));
      // 坛
      ctx.beginPath(); ctx.moveTo(-14, -80); ctx.bezierCurveTo(-46, -68, -48, -14, -23, 0); ctx.lineTo(23, 0); ctx.bezierCurveTo(48, -14, 46, -68, 14, -80); ctx.closePath();
      ctx.fillStyle = w.ink(0.6); ctx.fill();
      softDot(ctx, -16, -48, 20, w.col('paper', 0.3), w.col('paper', 0));
      mark(ctx, [-14, -80, -42, -52, -40, -18, -23, 0], swell(2.2), w.ink(0.7));
      mark(ctx, [-15, -82, 0, -85, 15, -82], () => 6, w.ink(0.82));
      ctx.fillStyle = w.col('red', 0.82); ctx.beginPath(); ctx.ellipse(0, -93, 14, 10, 0, 0, TAU); ctx.fill();           // 红布封口
      for (let i = 0; i < 2; i++) mark(ctx, strand(10 - i * 20, -86, Math.PI / 2 + (i ? 0.4 : -0.4), 22, w.t * 2 + i, 2, 0), taper(3), w.col('red', 0.6));
      ctx.save(); ctx.translate(0, -40); ctx.rotate(Math.PI / 4); ctx.fillStyle = w.col('red', 0.72); ctx.fillRect(-12, -12, 24, 24); ctx.restore();   // 斗方
      // 两只盏
      for (const [cx, cy, r] of [[56, -4, 13], [84, 2, 11]]) {
        ctx.beginPath(); ctx.moveTo(cx - r, cy - r * 0.7); ctx.quadraticCurveTo(cx, cy + r * 0.9, cx + r, cy - r * 0.7); ctx.closePath();
        ctx.fillStyle = w.col('white', 0.94); ctx.fill();
        mark(ctx, [cx - r, cy - r * 0.7, cx, cy + r * 0.16, cx + r, cy - r * 0.7], swell(1.3), w.ink(0.5));
        ctx.fillStyle = 'rgba(214,150,70,0.7)'; ctx.beginPath(); ctx.ellipse(cx, cy - r * 0.7, r * 0.82, r * 0.2, 0, 0, TAU); ctx.fill();
      }
      // 酒气
      for (let i = 0; i < 3; i++) mark(ctx, strand(56 + i * 12, -16, -Math.PI / 2 + (i - 1) * 0.2, 46, w.t * 1.1 + i * 2 + e.ph, 7, 0.08), taper(2.4), w.ink(0.16));
      ctx.restore();
    }
  };

  /* ================= 泉：石隙里一线水，落下成潭 ================= */
  Kinds.spring = {
    z: 44, max: 2, zone: 'ground',
    create(e, w) {
      const r = e.rng;
      e.rocks = [[-70, 130, 96, 0.56], [34, 150, 120, 0.46], [118, 90, 60, 0.6]].map((q) => ({ dx: q[0] + (r() - 0.5) * 16, w: q[1], h: q[2] * (0.85 + r() * 0.3), tone: q[3], sd: r() * 9 }));
      e.tk = 0; w.dye(e.x - 30, e.y + 70, [0.04, 0, 0.12], 50);
    },
    update(e, dt, w) { e.tk -= dt; if (e.tk <= 0) { e.tk = 0.3; w.stir(e.x - 30, e.y + 74, -70, 16, 34); } },
    draw(e, ctx, w) {
      const g = ease(e.age / 2.4), base = e.y + 70;
      for (const k of e.rocks) {
        const x = e.x + k.dx, top = [];
        for (let i = 0; i <= 8; i++) { const u = i / 8; top.push(x - k.w / 2 + u * k.w, base - k.h * g * Math.pow(Math.sin(Math.PI * u), 0.6) * (0.7 + 0.3 * noise1(u * 4 + k.sd))); }
        ctx.beginPath(); ctx.moveTo(x - k.w / 2, base + 14); for (let i = 0; i <= 8; i++) ctx.lineTo(top[i * 2], top[i * 2 + 1]); ctx.lineTo(x + k.w / 2, base + 14); ctx.closePath();
        const gr = ctx.createLinearGradient(0, base - k.h, 0, base + 14);
        gr.addColorStop(0, w.ink(k.tone)); gr.addColorStop(1, w.ink(k.tone * 0.2));
        ctx.fillStyle = gr; ctx.fill();
        mark(ctx, top.slice(2, 16), swell(2.6), w.ink(0.56));
      }
      // 一线水：从两石之间下来，分几叠
      const fg = ease((g - 0.5) / 0.5);
      if (fg > 0) {
        for (let i = 0; i < 3; i++) {
          const x0 = e.x - 18 + i * 7, pp = [x0, base - 62, x0 - 6 - i * 3, base - 30, x0 - 20 - i * 6, base - 6, x0 - 30 - i * 9, base + 8];
          mark(ctx, pp, (t) => (3.4 - i) * (0.6 + 0.4 * Math.sin(t * 9 - w.t * 7 + i)) * fg, w.col('white', 0.9));
          if (!i) mark(ctx, pp, taper(1), w.col('blue', 0.4));
        }
        ctx.strokeStyle = w.ink(0.3 * fg); ctx.lineWidth = 1;
        for (let j = 0; j < 3; j++) { const u = ((w.t * 0.5 + j / 3) % 1); ctx.globalAlpha *= 1; ctx.beginPath(); ctx.ellipse(e.x - 52, base + 12, 10 + u * 54, 2 + u * 9, 0, 0, TAU); ctx.strokeStyle = w.ink(0.34 * (1 - u) * fg); ctx.stroke(); }
        softDot(ctx, e.x - 46, base + 6, 26, w.col('white', 0.5 * fg), w.col('white', 0));
      }
    }
  };

  /* ================= 冰：水面结了薄冰，慢慢裂开细纹 ================= */
  Kinds.ice = {
    z: 45, max: 2, zone: 'low',
    create(e, w) {
      const r = e.rng, sc = clamp(w.W / 1500, 0.5, 1);                 // 窄的画面上冰面小一些
      e.f = [];
      for (let i = 0; i < 6; i++) {
        const rx = (100 + r() * 130) * sc, ry = (16 + r() * 14) * sc, n = 8, pts = [], cr = [];
        for (let k = 0; k < n; k++) { const a = k / n * TAU, d = 0.8 + r() * 0.3; pts.push(Math.cos(a) * rx * d, Math.sin(a) * ry * d); }
        for (let k = 0; k < 3; k++) { const a = r() * TAU, l = 0.5 + r() * 0.45; cr.push([0, 0, Math.cos(a) * rx * l * 0.5 + (r() - 0.5) * 16, Math.sin(a) * ry * l * 0.5, Math.cos(a + 0.3) * rx * l, Math.sin(a + 0.3) * ry * l]); }
        e.f.push({ dx: ((i - 2.5) * 170 + (r() - 0.5) * 70) * sc, dy: ((i % 3) * 26 + r() * 10) * sc, pts, cr, d: i * 0.35, ph: r() * TAU });
      }
    },
    draw(e, ctx, w) {
      for (const f of e.f) {
        const g = ease((e.age - f.d) / 2.6);
        if (g <= 0) continue;
        ctx.save(); ctx.translate(e.x + f.dx, e.y + f.dy + Math.sin(w.t * 0.6 + f.ph) * 1.2); ctx.scale(g, g);
        ctx.beginPath(); for (let k = 0; k < f.pts.length; k += 2) k ? ctx.lineTo(f.pts[k], f.pts[k + 1]) : ctx.moveTo(f.pts[k], f.pts[k + 1]); ctx.closePath();
        ctx.fillStyle = w.col('white', lerp(0.66, 0.5, w.nightK)); ctx.fill();
        ctx.fillStyle = w.col('blue', 0.1); ctx.fill();
        ctx.strokeStyle = w.ink(0.34); ctx.lineWidth = 1; ctx.stroke();
        const cg = ease((e.age - f.d - 2.2) / 2.4);
        if (cg > 0) for (const c of f.cr) mark(ctx, [c[0], c[1], lerp(c[0], c[2], Math.min(1, cg * 2)), lerp(c[1], c[3], Math.min(1, cg * 2)), lerp(c[2], c[4], cg), lerp(c[3], c[5], cg)], taper(1.5), w.ink(0.46));
        softDot(ctx, -f.pts[0] * 0.3, -3, 8, w.col('white', 0.9), w.col('white', 0));
        ctx.restore();
      }
    }
  };

  /* ---------- 以下几样借手卷里的画法 ---------- */
  const prop = (name) => MS.Scroll && MS.Scroll.props[name];
  const env = (w) => ({ t: w.t, S: MS.Scroll });
  function walker(z, speed, drawer) {
    return {
      z, max: 4, zone: 'ground',
      create(e, w) { e.dir = e.x < w.W / 2 ? -1 : 1; e.o = { s: 1.1, face: e.dir, ph: e.rng() * 6 }; },
      update(e, dt, w) { e.x += e.dir * speed * dt; if (e.x > w.W + 160) e.x = -160; if (e.x < -160) e.x = w.W + 160; },
      draw(e, ctx, w) { ctx.globalAlpha *= ease(e.age / 1.6); drawer(e, ctx, w); }
    };
  }
  /* 马 */
  Kinds.horse = walker(58, 46, (e, ctx, w) => { const f = prop('horse'); if (f) f(ctx, w, e.x, e.y + 60, e.o, env(w)); });
  /* 车：一车一马 */
  Kinds.cart = walker(57, 32, (e, ctx, w) => {
    const c = prop('cart'), h = prop('horse'); if (!c) return;
    c(ctx, w, e.x, e.y + 60, e.o, env(w)); h(ctx, w, e.x + e.dir * 150, e.y + 60, e.o, env(w));
  });
  function still(z, zone, name, opts) {
    return {
      z, max: 3, zone,
      create(e, w) { e.o = Object.assign({ face: e.x < w.W / 2 ? 1 : -1, seed: (e.seed % 97) / 7, noHit: true }, opts); },
      draw(e, ctx, w) { const f = prop(name); if (!f) return; ctx.globalAlpha *= ease(e.age / 2.2); f(ctx, w, e.x, e.y + (opts.dy || 0), e.o, env(w)); }
    };
  }
  /* 神：凌波的神女 */
  Kinds.goddess = still(68, 'mid', 'lady', { s: 1.05, float: true, dy: 120 });
  /* 人：一位宽袍的士人 */
  Kinds.person = still(60, 'ground', 'man', { s: 1, dy: 90 });
  /* 岩 */
  Kinds.rock = still(22, 'land', 'rock', { w: 320, h: 280, dy: 110 });
  /* 旗 */
  Kinds.banner = still(64, 'ground', 'banner', { h: 280, c: 'red', dy: 120 });
  /* 城：一带城墙，一座门楼（卷二《琵琶行》里的京城） */
  Kinds.city = still(24, 'land', 'city', { w: 760, dy: 130 });
  /* 猿：枯枝上挂着一只 */
  Kinds.ape = still(66, 'high', 'ape', { dy: 0 });
})();
