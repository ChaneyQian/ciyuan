/* 词源 · flora.js — 草木：竹 松 柳 梅 花 荷 菊 草
 * 草木随四时换形：不是一刀切，而是按 w.sea（春夏秋冬各占几分）渐渐变过去。
 *   w.by(春, 夏, 秋, 冬, 无时令) 调和一个数，w.hue(...) 调和一种颜色。
 */
(function () {
  'use strict';
  const MS = window.MS, Kinds = MS.Kinds;
  const { clamp, lerp, ease, easeOut, brush, leafPath, softDot, noise1, TAU } = MS.util;

  /* 风中摇摆：返回一个随时间变化的偏移量（-1..1 左右） */
  function sway(w, ph, speed) {
    return Math.sin(w.t * (speed || 1) + ph) * (0.25 + Math.abs(w.wind) * 0.5) + w.wind * 1.6;
  }

  /* ================= 竹 ================= */
  Kinds.bamboo = {
    z: 60, max: 5, zone: 'side',
    create(e, w) {
      const r = e.rng, n = 2 + ((r() * 3) | 0);
      e.stalks = [];
      for (let i = 0; i < n; i++) {
        const h = Math.max(w.H * 0.34, (w.H - e.y) * (0.8 + r() * 0.42));
        const nodes = [];
        let f = 0.1 + r() * 0.06;
        while (f < 1) { nodes.push(f); f += 0.1 + r() * 0.07; }
        const leaves = [];
        for (const nf of nodes) {
          if (nf < 0.3 || r() < 0.3) continue;
          const side = r() < 0.5 ? -1 : 1, k = 3 + ((r() * 3) | 0), grp = [];
          for (let j = 0; j < k; j++) grp.push({ a: (j - (k - 1) / 2) * 0.42 + (r() - 0.5) * 0.2, len: 36 + r() * 44, wid: 5 + r() * 4 });
          leaves.push({ f: nf, side, blen: 14 + r() * 34, up: 0.3 + r() * 0.5, grp, ph: r() * TAU });
        }
        e.stalks.push({ dx: (i - (n - 1) / 2) * (26 + r() * 22) + (r() - 0.5) * 16, h, lean: (r() - 0.5) * 0.16, th: 5 + r() * 5, tone: 0.42 + r() * 0.4, nodes, leaves, ph: r() * TAU, delay: i * 0.5 });
      }
    },
    draw(e, ctx, w) {
      const by = w.H + 10;
      ctx.lineCap = 'butt';
      for (const s of e.stalks) {
        const g = ease((e.age - s.delay) / 3.4);
        if (g <= 0) continue;
        const sw = sway(w, s.ph, 0.9) * 26;
        const P = (f) => [e.x + s.dx + s.lean * s.h * f + sw * f * f, by - s.h * f];
        // 竿：一节一节
        ctx.strokeStyle = w.ink(s.tone);
        let prev = 0;
        const stops = s.nodes.concat([1]);
        for (const nf of stops) {
          const a = prev, b = Math.min(nf, g);
          if (b > a) {
            const p0 = P(a + 0.004), p1 = P(b - 0.004);
            ctx.lineWidth = s.th * (1 - a * 0.45);
            ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
            if (nf <= g && nf < 1) {   // 节
              ctx.lineWidth = 1.6;
              ctx.beginPath(); ctx.moveTo(p1[0] - s.th * 0.7, p1[1] - 1); ctx.lineTo(p1[0] + s.th * 0.7, p1[1] - 1); ctx.stroke();
            }
          }
          prev = nf;
          if (nf > g) break;
        }
        // 叶：「个」字、「介」字。春叶带青，雪天被压得垂一些
        const sp = w.sea['春'], au = w.sea['秋'], wi = w.sea['冬'], at = [];
        ctx.fillStyle = w.hue('leaf', 'ink', 'ink', 'ink', 'ink', Math.min(0.92, s.tone + 0.35));
        ctx.beginPath();
        for (const L of s.leaves) {
          const lg = ease((g - L.f) / 0.18);
          if (lg <= 0) continue;
          const p = P(L.f), lsw = sway(w, L.ph, 1.7) * 0.22;
          const bx = p[0] + L.side * L.blen * lg, bY = p[1] - L.blen * L.up * lg * (1 - wi * 0.35);
          ctx.moveTo(p[0], p[1]); ctx.lineTo(bx, bY - 0.8); ctx.lineTo(bx, bY + 0.8); ctx.closePath();
          for (const lf of L.grp) leafPath(ctx, bx, bY, Math.PI / 2 + lf.a * (1.1 - wi * 0.3) + L.side * -0.35 + lsw, lf.len * lg, lf.wid, 0.05);
          at.push(L, bx, bY, lg, lsw);
        }
        ctx.fill();
        if (au > 0.01) {                                  // 秋：每丛里黄了一两片
          ctx.fillStyle = w.col('yellow', 0.78 * au);
          ctx.beginPath();
          for (let i = 0; i < at.length; i += 5) { const L = at[i], lf = L.grp[(i / 5) % L.grp.length | 0]; leafPath(ctx, at[i + 1], at[i + 2], Math.PI / 2 + lf.a * 1.1 + L.side * -0.35 + at[i + 4], lf.len * at[i + 3], lf.wid, 0.05); }
          ctx.fill();
        }
        if (wi > 0.01) {                                  // 冬：叶上、节上积雪
          ctx.fillStyle = w.col('white', 0.94 * wi);
          ctx.beginPath();
          for (let i = 0; i < at.length; i += 5) { const L = at[i], r = 17 * at[i + 3]; ctx.moveTo(at[i + 1] + r, at[i + 2] + 2); ctx.ellipse(at[i + 1], at[i + 2] + 2, r, r * 0.34, L.side * 0.2, 0, TAU); }
          for (const nf of s.nodes) { if (nf > g) break; const q = P(nf); ctx.moveTo(q[0] + s.th, q[1] - 2); ctx.ellipse(q[0], q[1] - 2.4, s.th * 0.9, 2.2, 0, 0, TAU); }
          ctx.fill();
          if (w.nightK < 0.5) { ctx.strokeStyle = w.ink(0.14 * wi); ctx.lineWidth = 0.6; ctx.stroke(); }
        }
        if (sp > 0.01 && g > 0.5) {                       // 春：竿边冒出一支笋
          const sx = e.x + s.dx + (s.ph > 3 ? 1 : -1) * (s.th * 2 + 12), sh = (46 + s.th * 5) * sp;
          ctx.fillStyle = w.ink(0.72);
          ctx.beginPath(); leafPath(ctx, sx, by, -Math.PI / 2, sh, 9, 0); ctx.fill();
          ctx.fillStyle = w.col('orange', 0.5);
          ctx.beginPath(); for (let k = 0; k < 4; k++) leafPath(ctx, sx + (k % 2 ? 3 : -3), by - sh * (0.12 + k * 0.17), -Math.PI / 2 + (k % 2 ? 0.3 : -0.3), sh * 0.24, 3.2, 0); ctx.fill();
        }
      }
    }
  };

  /* ================= 松 ================= */
  Kinds.pine = {
    z: 58, max: 3, zone: 'side',
    create(e, w) {
      const r = e.rng, by = w.H + 10, h = Math.max(w.H * 0.4, by - e.y + 40);
      e.dir = e.x < w.W / 2 ? 1 : -1;
      // 主干：虬曲向上
      e.trunk = [];
      const n = 14;
      for (let i = 0; i <= n; i++) {
        const f = i / n;
        e.trunk.push(e.x + e.dir * (Math.sin(f * 2.6 + r() * 0.2) * 34 + f * f * 46), by - h * f);
      }
      e.boughs = [];
      const k = 4 + ((r() * 2) | 0);
      for (let j = 0; j < k; j++) {
        const f = 0.42 + (j / k) * 0.56, i = Math.round(f * n), side = j % 2 ? -e.dir : e.dir;
        const len = (90 + r() * 110) * (1.15 - f * 0.5), pts = [], tufts = [];
        const sx = e.trunk[i * 2], sy = e.trunk[i * 2 + 1];
        for (let q = 0; q <= 6; q++) { const u = q / 6; pts.push(sx + side * len * u, sy - Math.sin(u * 2.4) * len * 0.16 + u * u * len * 0.14 + (r() - 0.5) * 5); }
        for (let q = 2; q <= 6; q++) {
          tufts.push({ i: q, r: 17 + r() * 13, dy: -4 - r() * 8, ph: r() * TAU });
          if (r() < 0.6) tufts.push({ i: q, r: 13 + r() * 10, dy: -16 - r() * 12, dx: (r() - 0.5) * 30, ph: r() * TAU });
        }
        e.boughs.push({ f, pts, tufts, w: 7 * (1.2 - f * 0.6) });
      }
      e.tufts = [{ x: e.trunk[n * 2], y: e.trunk[n * 2 + 1], r: 22 }];
      e.bark = []; for (let i = 0; i < 40; i++) e.bark.push([r(), (r() - 0.5), r() * TAU]);
    },
    draw(e, ctx, w) {
      const g = ease(e.age / 4);
      // 干
      ctx.fillStyle = w.ink(0.74);
      brush(ctx, e.trunk, 26, 6, g);
      // 鳞皴
      ctx.strokeStyle = w.col('paper', 0.35); ctx.lineWidth = 1;
      ctx.beginPath();
      const n = e.trunk.length / 2 - 1;
      for (const b of e.bark) {
        if (b[0] > g) continue;
        const i = Math.min(n - 1, (b[0] * n) | 0), x = e.trunk[i * 2] + b[1] * 14 * (1 - b[0] * 0.6), y = e.trunk[i * 2 + 1];
        ctx.moveTo(x + 4, y); ctx.arc(x, y, 4, 0, Math.PI * 0.9);
      }
      ctx.stroke();
      const sw = sway(w, 0, 0.7), sp = w.sea['春'], wi = w.sea['冬'], wash = w.by(0.3, 0.28, 0.14, 0.05, 0.2);
      for (const b of e.boughs) {
        const bg = ease((g - b.f * 0.8) / 0.25);
        if (bg <= 0) continue;
        ctx.fillStyle = w.ink(0.78);
        brush(ctx, b.pts, b.w, 1.4, bg);
        if (wi > 0.01) { ctx.fillStyle = w.col('white', 0.9 * wi); brush(ctx, b.pts.map((v, i) => (i % 2 ? v - b.w * 0.5 - 1 : v)), b.w * 0.7, 1.2, bg); }   // 枝上压着雪
        for (const t of b.tufts) {
          const tg = ease((bg - t.i / 7) / 0.2);
          if (tg <= 0) continue;
          const x = b.pts[t.i * 2] + (t.dx || 0) + sw * 2.5, y = b.pts[t.i * 2 + 1] + t.dy;
          // 松针：半轮
          softDot(ctx, x, y - t.r * 0.2, t.r * 1.25, w.col('green', wash * tg), w.col('green', 0));
          ctx.strokeStyle = w.ink(0.78 * tg); ctx.lineWidth = 0.95;
          ctx.beginPath();
          for (let k = 0; k < 19; k++) {
            const a = Math.PI + 0.12 + (k / 18) * (Math.PI - 0.24) + sw * 0.03, rr = t.r * tg * (0.82 + ((k * 7) % 5) * 0.05);
            ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
          }
          ctx.stroke();
          if (sp > 0.01) {                                // 春：针丛里抽出新绿的「松烛」
            ctx.strokeStyle = w.col('leaf', 0.95 * sp * tg); ctx.lineWidth = 2.2; ctx.lineCap = 'round';
            ctx.beginPath(); for (let k = -1; k <= 1; k++) { ctx.moveTo(x + k * 3, y - 2); ctx.lineTo(x + k * 6 + sw, y - t.r * (0.5 + (k ? 0 : 0.2)) * sp); } ctx.stroke();
          }
          if (wi > 0.01) {                                // 冬：每丛针上顶一团雪
            const sr = t.r * tg;
            ctx.fillStyle = w.col('white', 0.94 * wi);
            ctx.beginPath(); ctx.moveTo(x - sr * 0.86, y - sr * 0.44); ctx.quadraticCurveTo(x - sr * 0.5, y - sr * 1.2, x, y - sr * 1.08); ctx.quadraticCurveTo(x + sr * 0.56, y - sr * 1.16, x + sr * 0.86, y - sr * 0.44); ctx.quadraticCurveTo(x, y - sr * 0.7, x - sr * 0.86, y - sr * 0.44); ctx.fill();
            if (w.nightK < 0.5) { ctx.strokeStyle = w.ink(0.16 * wi); ctx.lineWidth = 0.6; ctx.stroke(); }
          }
        }
      }
    }
  };

  /* ================= 柳 ================= */
  Kinds.willow = {
    z: 59, max: 3, zone: 'side',
    create(e, w) {
      const r = e.rng, by = w.H + 10, h = Math.max(w.H * 0.36, by - e.y);
      e.dir = e.x < w.W / 2 ? 1 : -1;
      e.trunk = [];
      // 老干斜出，向画心探身
      for (let i = 0; i <= 10; i++) { const f = i / 10; e.trunk.push(e.x - e.dir * 50 + e.dir * (Math.sin(f * 2.6) * 30 + f * f * 70), by - h * f); }
      const tx = e.trunk[20], ty = e.trunk[21];
      e.boughs = [];
      const k = 7;
      for (let j = 0; j < k; j++) {
        const a = -Math.PI / 2 + (j - (k - 1) / 2) * 0.5 + e.dir * 0.25 + (r() - 0.5) * 0.2, len = 120 + r() * 130, pts = [];
        for (let q = 0; q <= 8; q++) { const u = q / 8; pts.push(tx + Math.cos(a) * len * u, ty + Math.sin(a) * len * u * (1 - u * 0.45) + u * u * len * 0.5); }
        const strands = [];
        for (let q = 2; q <= 8; q++) {
          const m = 1 + ((r() * 2) | 0);
          for (let z = 0; z < m; z++) strands.push({ i: q, dx: (r() - 0.5) * 14, len: 130 + r() * (w.H * 0.3), ph: r() * TAU, sp: 0.8 + r() * 0.7, off: r() * 10 });
        }
        e.boughs.push({ pts, strands });
      }
    },
    update(e, dt, w) {                                    // 春：柳絮因风起
      if (w.sea['春'] > 0.6 && e.age > 4 && Math.random() < dt * 1.2) w.drift(e.trunk[20] + (Math.random() - 0.5) * 320, e.trunk[21] + Math.random() * 200, 'snow', 'white');
    },
    draw(e, ctx, w) {
      const g = ease(e.age / 3.5);
      ctx.fillStyle = w.ink(0.7);
      brush(ctx, e.trunk, 20, 6, g);
      // 叶：春是才出的嫩芽，短而疏；夏长足了，浓；秋黄而稀；冬落尽，只剩丝
      const LA = w.by(0.85, 1, 0.7, 0, 1), LF = w.by(0.5, 1.08, 0.95, 0.4, 1), wi = w.sea['冬'];
      const leafCol = w.hue('leaf', 'green', 'yellow', 'ink', 'leaf', 0.82 * Math.min(1, LA * 1.4));
      const sg = ease((g - 0.55) / 0.45);
      if (sg <= 0) return;
      for (const b of e.boughs) {
        ctx.fillStyle = w.ink(0.7);
        brush(ctx, b.pts, 6, 1.2, sg);
        if (wi > 0.01) { ctx.fillStyle = w.col('white', 0.9 * wi); brush(ctx, b.pts.map((v, i) => (i % 2 ? v - 3.4 : v)), 4.4, 1, sg); }
      }
      // 丝绦
      const strandPath = new Path2D(), leafP = new Path2D();
      for (const b of e.boughs) for (const s of b.strands) {
        const x0 = b.pts[s.i * 2] + s.dx, y0 = b.pts[s.i * 2 + 1], L = s.len * ease((sg - 0.2) / 0.8), N = 9;
        if (L <= 2) continue;
        let px = x0, py = y0;
        strandPath.moveTo(px, py);
        for (let i = 1; i <= N; i++) {
          const u = i / N;
          const off = (Math.sin(w.t * s.sp + s.ph - u * 2.2) * (5 + Math.abs(w.wind) * 26) + w.wind * 95) * u * u;
          const x = x0 + off, y = y0 + L * u * (1 - Math.abs(w.wind) * 0.12 * u);
          strandPath.lineTo(x, y);
          const side = i % 2 ? 1 : -1, dx = x - px, dy = y - py, d = Math.hypot(dx, dy) || 1;
          const mx = (x + px) / 2, my = (y + py) / 2;
          leafP.moveTo(mx, my); leafP.lineTo(mx + ((dx / d) * 7 + (-dy / d) * side * 3.6) * LF, my + ((dy / d) * 7 + (dx / d) * side * 3.6) * LF);
          px = x; py = y;
        }
      }
      ctx.lineCap = 'round';
      ctx.strokeStyle = w.ink(0.5); ctx.lineWidth = 0.9; ctx.stroke(strandPath);
      if (LA > 0.02) { ctx.strokeStyle = leafCol; ctx.lineWidth = 1.1 + 0.9 * LA * Math.min(1, LF); ctx.stroke(leafP); }
    }
  };

  /* 生枝：递归地长出一棵（或一枝）树，返回按出生次序排好的枝段与花位 */
  function growBranches(r, x, y, ang, len, width, depth, o) {
    const segs = [], tips = [];
    (function rec(x, y, ang, len, width, depth, t0) {
      const n = 4, pts = [x, y];
      let a = ang, cx = x, cy = y;
      for (let i = 0; i < n; i++) {
        a += (r() - 0.5) * o.kink;
        a += (o.lift - a) * o.pull * 0.2;
        cx += Math.cos(a) * len / n; cy += Math.sin(a) * len / n;
        pts.push(cx, cy);
        if (depth <= o.flowerDepth && r() < o.bloom) tips.push({ x: cx + (r() - 0.5) * 10, y: cy + (r() - 0.5) * 10, t: t0 + 0.3 + r() * 0.5, s: 0.7 + r() * 0.6, bud: r() < o.buds });
      }
      segs.push({ pts, w0: width, w1: width * 0.62, t0, t1: t0 + 0.32 });
      if (depth <= 0) { tips.push({ x: cx, y: cy, t: t0 + 0.4, s: 0.8 + r() * 0.5, bud: r() < o.buds }); return; }
      const kids = depth > 1 ? 2 : 2 + ((r() * 2) | 0);
      for (let k = 0; k < kids; k++) {
        const j = 1 + ((r() * n) | 0), bx = pts[j * 2], by = pts[j * 2 + 1];
        const spread = (k === 0 ? (r() - 0.5) * 0.5 : (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.6));
        rec(k === 0 ? cx : bx, k === 0 ? cy : by, a + spread, len * (0.6 + r() * 0.2), width * 0.6, depth - 1, t0 + 0.26);
      }
    })(x, y, ang, len, width, depth, 0);
    const T = Math.max.apply(null, segs.map((s) => s.t1)) || 1;
    return { segs, tips, T };
  }
  function drawBranches(e, ctx, w, g) {
    ctx.fillStyle = w.ink(0.86);
    for (const s of e.tree.segs) {
      const u = clamp((g * e.tree.T - s.t0) / (s.t1 - s.t0), 0, 1);
      if (u > 0) brush(ctx, s.pts, s.w0, s.w1, u);
    }
  }
  /* 冬：枝上压一层雪 */
  function snowOn(e, ctx, w, g, amt) {
    ctx.fillStyle = w.col('white', 0.94 * amt);
    for (const s of e.tree.segs) {
      const u = clamp((g * e.tree.T - s.t0) / (s.t1 - s.t0), 0, 1);
      if (u > 0) brush(ctx, s.pts.map((v, i) => (i % 2 ? v - s.w0 * 0.42 - 1 : v)), s.w0 * 0.62 + 1.4, s.w1 * 0.5 + 1, u);
    }
  }
  /* 一朵五瓣花，先画成小图存着（昼夜各一份），用时贴上去 */
  const sprites = {};
  function blossomSprite(w, kind) {
    const night = w.nightK > 0.5, key = kind + (night ? 'n' : 'd');
    if (sprites[key]) return sprites[key];
    const P = {
      pink: { base: night ? '255,244,240' : '255,250,246', mid: night ? '255,176,186' : '236,150,160', edge: night ? '255,128,146' : '204,92,110', core: night ? '255,110,110' : '176,44,52' },
      red:  { base: night ? '255,150,130' : '214,70,56', mid: night ? '240,90,72' : '184,38,32', edge: night ? '214,60,50' : '140,22,22', core: night ? '255,220,120' : '120,16,18' }
    }[kind];
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    g.translate(32, 32);
    for (let i = 0; i < 5; i++) {
      g.save(); g.rotate(i * TAU / 5);
      const gr = g.createRadialGradient(0, -3, 1, 0, -12, 17);
      gr.addColorStop(0, 'rgba(' + P.base + ',0.92)'); gr.addColorStop(0.55, 'rgba(' + P.mid + ',0.8)'); gr.addColorStop(1, 'rgba(' + P.edge + ',0.72)');
      g.fillStyle = gr;
      g.beginPath();                                   // 瓣：圆阔，瓣尖微凹
      g.moveTo(0, -2); g.bezierCurveTo(8.5, -5, 13.5, -17, 4, -24.5); g.quadraticCurveTo(0, -22, -4, -24.5); g.bezierCurveTo(-13.5, -17, -8.5, -5, 0, -2);
      g.fill();
      g.strokeStyle = 'rgba(' + P.edge + ',0.28)'; g.lineWidth = 0.6;      // 瓣脉
      g.beginPath(); g.moveTo(0, -4); g.lineTo(0, -19); g.stroke();
      g.restore();
    }
    g.fillStyle = 'rgba(' + P.core + ',0.6)';
    g.beginPath(); g.arc(0, 0, 3.4, 0, TAU); g.fill();
    g.strokeStyle = night ? 'rgba(255,236,150,0.95)' : 'rgba(190,140,30,0.95)'; g.fillStyle = night ? 'rgba(255,240,170,1)' : 'rgba(222,170,40,1)'; g.lineWidth = 0.7;
    for (let k = 0; k < 11; k++) {                     // 蕊
      const a = k * TAU / 11 + 0.2, r = 7 + (k % 3) * 2.2;
      g.beginPath(); g.moveTo(Math.cos(a) * 2, Math.sin(a) * 2); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); g.stroke();
      g.beginPath(); g.arc(Math.cos(a) * r, Math.sin(a) * r, 1.05, 0, TAU); g.fill();
    }
    return (sprites[key] = c);
  }
  function stamp(ctx, img, x, y, r, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.drawImage(img, -r, -r, r * 2, r * 2); ctx.restore();
  }
  function bud(ctx, w, x, y, r, rot, color) {           // 花苞：一粒带萼
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = w.col(color, 0.95);
    ctx.beginPath(); ctx.moveTo(0, r * 0.7); ctx.bezierCurveTo(r, r * 0.3, r * 0.7, -r, 0, -r * 1.25); ctx.bezierCurveTo(-r * 0.7, -r, -r, r * 0.3, 0, r * 0.7); ctx.fill();
    ctx.fillStyle = w.ink(0.75);
    ctx.beginPath(); ctx.arc(0, r * 0.62, r * 0.42, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* ================= 梅 ================= */
  Kinds.plum = {
    z: 62, max: 4, zone: 'edge',
    create(e, w) {
      const r = e.rng, fromRight = e.x > w.W / 2;
      const sx = fromRight ? w.W + 20 : -20, sy = e.y + 70 + r() * 80;
      const ang = Math.atan2(e.y - sy, e.x - sx);
      const len = Math.hypot(e.x - sx, e.y - sy) * 0.62;
      e.tree = growBranches(r, sx, sy, ang, len, 11, 3, { kink: 0.75, lift: ang - (fromRight ? -0.25 : 0.25), pull: 0.6, bloom: 0.5, buds: 0.4, flowerDepth: 2 });
      for (const t of e.tree.tips) { t.rot = r() * TAU; t.r = 7.5 + r() * 3.5; }
      e.spots = e.tree.tips.filter((t) => !t.bud);
      e.shed = 2;
    },
    update(e, dt, w) {
      e.shed -= dt * (1 + Math.abs(w.wind) * 5);
      if (e.shed < 0 && e.age > 6 && e.spots.length && w.by(1, 0, 0, 1, 1) > 0.5) { e.shed = 2.5 + Math.random() * 4; const t = e.spots[(Math.random() * e.spots.length) | 0]; w.drift(t.x, t.y, 'petal', 'red'); }
    },
    /* 梅：冬末春初开花（凌寒独自开，枝上有雪）；入夏花落生叶，结青梅；秋叶黄而稀 */
    draw(e, ctx, w) {
      const g = clamp(e.age / 3.2, 0, 1), img = blossomSprite(w, 'red');
      const B = w.by(0.8, 0, 0, 1, 1), LK = w.by(0.4, 1, 0.5, 0, 0), su = w.sea['夏'], wi = w.sea['冬'];
      drawBranches(e, ctx, w, g);
      if (wi > 0.01) snowOn(e, ctx, w, g, wi);
      let i = 0;
      for (const t of e.tree.tips) {
        const b = easeOut((e.age / 3.2 * e.tree.T - t.t) / 0.5);
        i++;
        if (b <= 0) continue;
        if (LK > 0.02) {
          ctx.fillStyle = w.hue('leaf', 'leaf', 'yellow', 'ink', 'leaf', 0.82);
          ctx.beginPath(); for (let k = 0; k < 2; k++) leafPath(ctx, t.x, t.y, t.rot + k * 2.3, 14 * b * LK, 4.6, 0.14); ctx.fill();
        }
        if (su > 0.02 && i % 3 === 0) {                  // 青梅
          const r = 4.8 * su * b;
          ctx.fillStyle = w.col('leaf', 0.92); ctx.beginPath(); ctx.arc(t.x + 3, t.y + 5, r, 0, TAU); ctx.fill();
          softDot(ctx, t.x + 1.6, t.y + 3.6, r * 0.7, w.col('white', 0.5), w.col('white', 0));
        }
        if (B <= 0.02) continue;
        if (t.bud) bud(ctx, w, t.x, t.y, t.r * 0.42 * b * B, t.rot, 'red');
        else stamp(ctx, img, t.x, t.y, t.r * b * B, t.rot + Math.sin(w.t * 0.8 + t.rot) * 0.05);
      }
    }
  };

  /* ================= 花（杏花一树：五瓣、有蕊、带苞与新叶） ================= */
  Kinds.flower = {
    z: 61, max: 4, zone: 'ground',
    create(e, w) {
      const r = e.rng, h = clamp(w.H * 0.34, 190, 360);
      e.tree = growBranches(r, e.x, e.y + h * 0.6, -Math.PI / 2 + (r() - 0.5) * 0.3, h * 0.42, 13, 4, { kink: 0.55, lift: -Math.PI / 2, pull: 0.45, bloom: 0.62, buds: 0.22, flowerDepth: 2 });
      if (e.tree.tips.length > 54) e.tree.tips.length = 54;
      for (const t of e.tree.tips) {
        t.rot = r() * TAU; t.r = 8.5 + r() * 4.5; t.leaf = r() < 0.45; t.la = r() * TAU;
        t.more = [];                                    // 花是一簇一簇开的
        const n = t.bud ? 0 : (r() * 2.4) | 0;
        for (let k = 0; k < n; k++) { const a = r() * TAU, d = 9 + r() * 9; t.more.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d, r: 6 + r() * 4, rot: r() * TAU, bud: r() < 0.3 }); }
      }
      e.spots = e.tree.tips.filter((t) => !t.bud);
      if (!e.spots.length) e.spots = e.tree.tips;
      e.shed = 1;
    },
    update(e, dt, w) {
      e.shed -= dt * (1 + Math.abs(w.wind) * 8);
      const au = w.sea['秋'], B = w.by(1, 0, 0, 0, 1);
      if (e.shed < 0 && e.age > 6 && (B > 0.5 || au > 0.5)) {
        e.shed = 0.8 + Math.random() * 2;
        const t = e.spots[(Math.random() * e.spots.length) | 0];
        w.drift(t.x, t.y, au > 0.5 ? 'leaf' : 'petal', au > 0.5 ? 'orange' : 'pink');
      }
    },
    /* 春：满树的花，梢头才出两片小叶；夏：花谢，叶长足，枝上结果；秋：叶红了，一片片落；冬：只剩枝，积雪，梢上顶着小苞 */
    draw(e, ctx, w) {
      const g = clamp(e.age / 3.6, 0, 1);
      const su = w.sea['夏'], au = w.sea['秋'], wi = w.sea['冬'];
      const B = w.by(1, 0, 0, 0, 1), full = su + au, LS = w.by(10, 16, 14, 0, 10);
      // 先一层淡淡的色晕，像没干的水色
      const wash = w.hue('pink', 'leaf', 'orange', 'white', 'pink', 0.16 * (1 - wi * 0.6)), wash0 = w.hue('pink', 'leaf', 'orange', 'white', 'pink', 0);
      for (const t of e.tree.tips) {
        const b = easeOut((e.age / 3.6 * e.tree.T - t.t) / 0.6);
        if (b > 0 && !t.bud) softDot(ctx, t.x, t.y, 22 * b, wash, wash0);
      }
      drawBranches(e, ctx, w, g);
      if (wi > 0.01) snowOn(e, ctx, w, g, wi);
      const img = B > 0.02 ? blossomSprite(w, 'pink') : null;
      const sw = Math.sin(w.t * 0.9) * 0.05 + w.wind * 0.12;
      const leafCol = w.hue('leaf', 'leaf', 'orange', 'ink', 'leaf', 0.75 + 0.1 * full);
      for (const t of e.tree.tips) {
        const b = easeOut((e.age / 3.6 * e.tree.T - t.t) / 0.6);
        if (b <= 0) continue;
        const la = t.leaf ? Math.max(B, full) : full;       // 这一梢上叶有几分
        if (la > 0.02 && LS > 0.5) {
          ctx.fillStyle = leafCol;
          ctx.beginPath();
          const n = full > 0.5 ? 3 : 2;
          for (let k = 0; k < n; k++) leafPath(ctx, t.x, t.y, t.la + k * (TAU / n) + sw, LS * b * la, 3.4 + 1.6 * full, 0.12);
          ctx.fill();
        }
        if (su > 0.02 && !t.bud && t.r > 10.4) {            // 夏：结了果
          const r = 5.6 * su * b, fx = t.x + Math.cos(t.rot) * 5, fy = t.y + 6;
          const gr = ctx.createRadialGradient(fx - r * 0.3, fy - r * 0.3, r * 0.1, fx, fy, r);
          gr.addColorStop(0, w.col('cream', 0.98)); gr.addColorStop(0.6, w.col('yellow', 0.95)); gr.addColorStop(1, w.col('pink', 0.95));
          ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(fx, fy, r, 0, TAU); ctx.fill();
        }
        if (wi > 0.02 && t.r > 9.5) bud(ctx, w, t.x, t.y, t.r * 0.2 * wi * b, t.rot, 'ink');   // 冬：越冬的小苞
        if (B <= 0.02) continue;
        if (t.bud) bud(ctx, w, t.x, t.y, t.r * 0.4 * b * B, t.rot, 'pink');
        else stamp(ctx, img, t.x, t.y, t.r * b * B, t.rot + sw);
        for (const m of t.more) {
          if (m.bud) bud(ctx, w, t.x + m.dx, t.y + m.dy, m.r * 0.42 * b * B, m.rot, 'pink');
          else stamp(ctx, img, t.x + m.dx, t.y + m.dy, m.r * b * B, m.rot + sw);
        }
      }
    }
  };

  /* ================= 荷 ================= */
  Kinds.lotus = {
    z: 63, max: 4, zone: 'low',
    create(e, w) {
      const r = e.rng;
      e.items = [];
      const n = 5 + ((r() * 2) | 0);
      for (let i = 0; i < n; i++) {
        const type = i < 3 ? 'leaf' : i === 3 ? 'flower' : r() < 0.5 ? 'bud' : 'flower';
        e.items.push({ type, dx: (i - (n - 1) / 2) * (48 + r() * 26) + (r() - 0.5) * 30, top: (type === 'leaf' ? 10 : -34) + (r() - 0.5) * 50, bend: (r() - 0.5) * 50, rx: 40 + r() * 30, tilt: (r() - 0.5) * 0.5, ph: r() * TAU, delay: r() * 1.2 });
      }
      e.items.sort((a, b) => (a.type === 'leaf' ? 0 : 1) - (b.type === 'leaf' ? 0 : 1));
      e.base = Math.min(w.H + 10, e.y + clamp(w.H * 0.2, 120, 220));
      e.spots = e.items.filter((i) => i.type === 'flower').map((i) => ({ x: e.x + i.dx, y: e.y + i.top }));
    },
    /* 春：小荷才露尖尖角（叶小而卷，只有苞）；夏：叶圆花开；秋：花谢成莲蓬，叶黄；冬：残荷——茎折了，叶垂着，枯蓬低头 */
    draw(e, ctx, w) {
      const wi = w.sea['冬'], au = w.sea['秋'];
      const LR = w.by(0.42, 1, 0.92, 0.55, 1), LO = w.by(0.4, 1, 0.95, 0.6, 1), FB = w.by(0, 1, 0, 0, 1), BD = w.by(0.75, 1, 0, 0, 1);
      const POD = Math.min(1, au + wi), droop = w.by(0, 0, 0.22, 1, 0);
      const stem = w.hue('leaf', 'leaf', 'yellow', 'ink', 'leaf', 0.75);
      for (const it of e.items) {
        const g = ease((e.age - it.delay) / 3);
        if (g <= 0) continue;
        const side = it.ph > Math.PI ? 1 : -1;
        const sw = sway(w, it.ph, 0.8) * 9, bx = e.x + it.dx * 0.7;
        const hx = e.x + it.dx + sw + droop * side * 26, hy = lerp(e.base, e.y + it.top, g) + droop * (it.type === 'leaf' ? 40 : 58) * (0.6 + 0.4 * Math.sin(it.ph * 3));
        // 茎（冬天从半腰折下去）
        ctx.strokeStyle = stem; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(bx, e.base); ctx.quadraticCurveTo(bx + it.bend - droop * side * 30, (e.base + hy) / 2 - droop * 46, hx, hy); ctx.stroke();
        ctx.save();
        ctx.translate(hx, hy); ctx.rotate(it.tilt + sw * 0.01 + droop * side * 1.05);
        if (it.type === 'leaf') {
          const rx = it.rx * g * LR, ry = rx * 0.36 * LO;
          const gr = ctx.createRadialGradient(0, 0, 2, 0, 0, rx);
          gr.addColorStop(0, w.hue('green', 'green', 'yellow', 'ink', 'green', 0.5)); gr.addColorStop(0.8, w.hue('leaf', 'leaf', 'orange', 'ink', 'leaf', 0.72 - wi * 0.2)); gr.addColorStop(1, w.ink(0.5));
          ctx.fillStyle = gr;
          ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0.12, TAU - 0.12); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = w.ink(0.3); ctx.lineWidth = 0.8;
          ctx.beginPath();
          for (let k = 0; k < 11; k++) { const a = 0.3 + k * (TAU - 0.6) / 10; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * rx * 0.92, Math.sin(a) * ry * 0.92); }
          ctx.stroke();
          if (wi > 0.02) { ctx.fillStyle = w.col('white', 0.9 * wi); ctx.beginPath(); ctx.ellipse(0, -ry * 0.25, rx * 0.66, ry * 0.5, 0, 0, TAU); ctx.fill(); }   // 残叶上一层雪
        } else {
          const s = (it.type === 'bud' ? 15 : 25) * g * (it.type === 'bud' ? BD : FB), open = it.type === 'bud' ? 0.12 : 0.36;
          if (s > 1) {
            for (let layer = 0; layer < 2; layer++) {
              const n = it.type === 'bud' ? 3 : layer ? 5 : 6;
              for (let k = 0; k < n; k++) {
                const a = -Math.PI / 2 + (k - (n - 1) / 2) * open * (layer ? 1 : 1.5);
                const gr = ctx.createLinearGradient(0, 0, Math.cos(a) * s * 1.5, Math.sin(a) * s * 1.5);
                gr.addColorStop(0, w.col('white', 0.9)); gr.addColorStop(1, w.col('pink', 0.92));
                ctx.fillStyle = gr;
                ctx.beginPath(); leafPath(ctx, 0, 0, a, s * (layer ? 1.5 : 1.25), s * 0.42, 0); ctx.fill();
                ctx.strokeStyle = w.col('red', 0.3); ctx.lineWidth = 0.6; ctx.stroke();
              }
            }
            if (it.type === 'flower') { ctx.fillStyle = w.col('yellow', 0.9); ctx.beginPath(); ctx.ellipse(0, -2, 4.5, 2.6, 0, 0, TAU); ctx.fill(); }
          }
          if (POD > 0.02) {                                 // 莲蓬：秋青，冬枯
            const k = POD * g;
            ctx.scale(k, k);
            ctx.fillStyle = w.hue('leaf', 'leaf', 'leaf', 'ink', 'leaf', 0.9);
            ctx.beginPath(); ctx.moveTo(-13, -8); ctx.lineTo(13, -8); ctx.quadraticCurveTo(10, 8, 0, 12); ctx.quadraticCurveTo(-10, 8, -13, -8); ctx.fill();
            ctx.fillStyle = w.hue('green', 'green', 'yellow', 'ink', 'green', 0.95);
            ctx.beginPath(); ctx.ellipse(0, -8, 13, 4.4, 0, 0, TAU); ctx.fill();
            ctx.fillStyle = w.ink(0.75);
            ctx.beginPath(); for (let q = 0; q < 6; q++) { const qx = -8 + (q % 3) * 8 + (q > 2 ? 0 : 0), qy = -9.4 + (q > 2 ? 2.6 : 0); ctx.moveTo(qx + 1.5, qy); ctx.arc(qx, qy, 1.5, 0, TAU); } ctx.fill();
          }
        }
        ctx.restore();
      }
    }
  };

  /* ================= 菊 ================= */
  Kinds.mum = {
    z: 63, max: 4, zone: 'ground',
    create(e, w) {
      const r = e.rng;
      e.stems = [];
      const n = 3 + ((r() * 2) | 0);
      for (let i = 0; i < n; i++) {
        const leaves = [];
        for (let k = 0; k < 4; k++) leaves.push({ f: 0.2 + k * 0.17 + r() * 0.06, side: k % 2 ? 1 : -1, len: 16 + r() * 12 });
        e.stems.push({ dx: (i - (n - 1) / 2) * 34 + (r() - 0.5) * 20, top: (r() - 0.5) * 56 - (i % 2) * 22, bend: (r() - 0.5) * 44, s: 15 + r() * 9, rot: r() * TAU, col: r() < 0.75 ? 'yellow' : 'white', ph: r() * TAU, delay: i * 0.35, leaves });
      }
      e.base = e.y + 120;
      e.spots = e.stems.map((s) => ({ x: e.x + s.dx, y: e.y + s.top }));
    },
    /* 菊：秋天才是它的时候。春只是一丛新苗，夏含苞，秋盛开，冬枯了头、带着霜（宁可枝头抱香死） */
    draw(e, ctx, w) {
      const HF = w.by(0.45, 0.8, 1, 0.94, 1), FF = w.by(0, 0.36, 1, 0.74, 1), wi = w.sea['冬'];
      for (const s of e.stems) {
        const g = ease((e.age - s.delay) / 2.6);
        if (g <= 0) continue;
        const sw = sway(w, s.ph, 1.1) * 5, bx = e.x + s.dx * 0.5, hx = e.x + s.dx + sw + wi * (s.bend > 0 ? 10 : -10), hy = lerp(e.base, e.y + s.top, g * HF) + wi * 12;
        const cx = bx + s.bend, cy = (e.base + hy) / 2;
        ctx.strokeStyle = w.ink(0.7); ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(bx, e.base); ctx.quadraticCurveTo(cx, cy, hx, hy); ctx.stroke();
        ctx.fillStyle = w.hue('leaf', 'ink', 'ink', 'ink', 'ink', 0.62);
        ctx.beginPath();
        for (const lf of s.leaves) {
          if (lf.f > g) continue;
          const u = lf.f, x = (1 - u) * (1 - u) * bx + 2 * (1 - u) * u * cx + u * u * hx, y = (1 - u) * (1 - u) * e.base + 2 * (1 - u) * u * cy + u * u * hy;
          leafPath(ctx, x, y, -Math.PI / 2 + lf.side * 1.1, lf.len, 6, lf.side * 0.2);
        }
        ctx.fill();
        // 花：细瓣层层
        const fg = ease((g - 0.75) / 0.25) * FF;
        if (fg <= 0.02) continue;
        ctx.lineCap = 'round';
        for (let layer = 0; layer < 3; layer++) {
          const n = 15 - layer * 3, R = s.s * fg * (1 - layer * 0.27);
          ctx.strokeStyle = w.col(layer === 2 ? 'orange' : s.col, 0.9 - wi * 0.4); ctx.lineWidth = 2.4 - layer * 0.4;
          ctx.beginPath();
          for (let k = 0; k < n; k++) {
            const a = s.rot + layer * 0.3 + k * TAU / n;
            ctx.moveTo(hx + Math.cos(a) * 2, hy + Math.sin(a) * 2);
            ctx.quadraticCurveTo(hx + Math.cos(a + 0.35) * R * 0.7, hy + Math.sin(a + 0.35) * R * 0.7, hx + Math.cos(a) * R, hy + Math.sin(a) * R * 0.9);
          }
          ctx.stroke();
        }
        if (s.col === 'white' && w.nightK < 0.5) { ctx.strokeStyle = w.ink(0.2); ctx.lineWidth = 0.5; ctx.beginPath(); ctx.arc(hx, hy, s.s * fg, 0, TAU); ctx.stroke(); }
        if (wi > 0.02) softDot(ctx, hx, hy - 2, s.s * fg * 0.9, w.col('white', 0.7 * wi), w.col('white', 0));   // 霜
      }
    }
  };

  /* ================= 草 ================= */
  Kinds.grass = {
    z: 57, max: 5, zone: 'ground',
    create(e, w) {
      const r = e.rng;
      e.tufts = [];
      for (let i = 0; i < 15; i++) {
        const blades = [], n = 5 + ((r() * 4) | 0);
        for (let k = 0; k < n; k++) blades.push({ a: (k - (n - 1) / 2) * 0.28 + (r() - 0.5) * 0.2, len: 18 + r() * 34, green: r() < 0.35 });
        const dx = (r() - 0.5) * clamp(w.W * 0.36, 260, 560);
        e.tufts.push({ dx, dy: (r() - 0.5) * 34 + Math.abs(dx) * 0.03, blades, ph: r() * TAU, delay: Math.abs(dx) / 260 });
      }
    },
    /* 春草短而嫩，间有野花；夏草长而密；秋草黄了，梢上结穗；冬草枯短，根上盖着雪 */
    draw(e, ctx, w) {
      const sp = w.sea['春'], au = w.sea['秋'], wi = w.sea['冬'], LF = w.by(0.62, 1.2, 1, 0.5, 1);
      const green = w.hue('leaf', 'green', 'yellow', 'ink', 'leaf', w.by(0.88, 0.8, 0.72, 0.3, 0.75)), dark = w.ink(w.by(0.5, 0.68, 0.5, 0.38, 0.62));
      let i = 0;
      for (const t of e.tufts) {
        const g = ease((e.age - t.delay) / 1.6);
        i++;
        if (g <= 0) continue;
        const sw = sway(w, t.ph, 1.5) * 0.3, x = e.x + t.dx, y = e.y + t.dy;
        if (wi > 0.02) { ctx.fillStyle = w.col('white', 0.9 * wi * g); ctx.beginPath(); ctx.ellipse(x, y + 2, 26, 6.5, 0, 0, TAU); ctx.fill(); }
        let tall = null;
        for (const b of t.blades) {
          const a = -Math.PI / 2 + b.a + sw, L = b.len * g * LF;
          ctx.fillStyle = b.green ? green : dark;
          ctx.beginPath();
          leafPath(ctx, x, y, a, L, 2.4, b.a * 0.5 + sw * 0.6);
          ctx.fill();
          if (!tall || b.len > tall.len) tall = b;
        }
        if (au > 0.02 && tall && i % 2) {                 // 穗
          const a = -Math.PI / 2 + tall.a + sw, L = tall.len * g * LF;
          softDot(ctx, x + Math.cos(a) * L, y + Math.sin(a) * L, 5.5 * au, w.col('yellow', 0.9), w.col('yellow', 0));
        }
        if (sp > 0.02 && i % 3 === 0) {                   // 野花两三点
          ctx.fillStyle = w.col(i % 2 ? 'pink' : 'white', 0.95 * sp);
          ctx.beginPath(); for (let k = 0; k < 3; k++) { const fx = x + (k - 1) * 9 + Math.sin(t.ph + k) * 5, fy = y - 9 - k * 4; ctx.moveTo(fx + 2.4, fy); ctx.arc(fx, fy, 2.4 * sp * g, 0, TAU); } ctx.fill();
        }
      }
    }
  };
  /* ================= 叶：横出一枝，四时最分明——春芽、夏荫、秋红而落、冬只剩枝与雪 ================= */
  Kinds.leaf = {
    z: 62, max: 4, zone: 'edge',
    create(e, w) {
      const r = e.rng, fromRight = e.x > w.W / 2;
      const sx = fromRight ? w.W + 20 : -20, sy = e.y + 60 + r() * 70, ang = Math.atan2(e.y - sy, e.x - sx);
      e.tree = growBranches(r, sx, sy, ang, Math.hypot(e.x - sx, e.y - sy) * 0.6, 10, 3, { kink: 0.6, lift: ang - (fromRight ? -0.2 : 0.2), pull: 0.5, bloom: 0.85, buds: 0, flowerDepth: 3 });
      for (const t of e.tree.tips) { t.la = r() * TAU; t.n = 2 + ((r() * 2) | 0); t.len = 13 + r() * 9; t.alt = r() < 0.35; }
      e.shed = 2;
    },
    update(e, dt, w) {
      e.shed -= dt * (1 + Math.abs(w.wind) * 6);
      if (e.shed < 0 && e.age > 5 && w.sea['秋'] > 0.5) { e.shed = 0.5 + Math.random() * 1.4; const t = e.tree.tips[(Math.random() * e.tree.tips.length) | 0]; w.drift(t.x, t.y, 'leaf', Math.random() < 0.6 ? 'red' : 'orange'); }
    },
    draw(e, ctx, w) {
      const g = clamp(e.age / 3.2, 0, 1), wi = w.sea['冬'];
      const LA = w.by(0.55, 1.15, 1, 0.1, 1), c1 = w.hue('leaf', 'green', 'red', 'ink', 'leaf', 0.84), c2 = w.hue('yellow', 'leaf', 'orange', 'ink', 'green', 0.8);
      const wash = w.hue('leaf', 'green', 'orange', 'white', 'leaf', 0.14), wash0 = w.hue('leaf', 'green', 'orange', 'white', 'leaf', 0);
      for (const t of e.tree.tips) { const b = easeOut((e.age / 3.2 * e.tree.T - t.t) / 0.6); if (b > 0) softDot(ctx, t.x, t.y, 20 * b, wash, wash0); }
      drawBranches(e, ctx, w, g);
      if (wi > 0.01) snowOn(e, ctx, w, g, wi);
      const sw = Math.sin(w.t * 0.9) * 0.06 + w.wind * 0.14;
      for (let pass = 0; pass < 2; pass++) {
        ctx.fillStyle = pass ? c2 : c1;
        ctx.beginPath();
        for (const t of e.tree.tips) {
          if (t.alt !== !!pass) continue;
          const b = easeOut((e.age / 3.2 * e.tree.T - t.t) / 0.6);
          if (b <= 0) continue;
          for (let k = 0; k < t.n; k++) leafPath(ctx, t.x, t.y, t.la + k * (TAU / t.n) + sw, t.len * b * LA, 5 * Math.min(1, LA + 0.3), 0.14);
        }
        ctx.fill();
      }
    }
  };
})();
