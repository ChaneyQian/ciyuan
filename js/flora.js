/* 词源 · flora.js — 草木：竹 松 柳 梅 花 荷 菊 草 */
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
        // 叶：「个」字、「介」字
        ctx.fillStyle = w.ink(Math.min(0.92, s.tone + 0.35));
        ctx.beginPath();
        for (const L of s.leaves) {
          const lg = ease((g - L.f) / 0.18);
          if (lg <= 0) continue;
          const p = P(L.f), lsw = sway(w, L.ph, 1.7) * 0.22;
          const bx = p[0] + L.side * L.blen * lg, bY = p[1] - L.blen * L.up * lg;
          ctx.moveTo(p[0], p[1]); ctx.lineTo(bx, bY - 0.8); ctx.lineTo(bx, bY + 0.8); ctx.closePath();
          for (const lf of L.grp) leafPath(ctx, bx, bY, Math.PI / 2 + lf.a * 1.1 + L.side * -0.35 + lsw, lf.len * lg, lf.wid, 0.05);
        }
        ctx.fill();
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
      const sw = sway(w, 0, 0.7);
      for (const b of e.boughs) {
        const bg = ease((g - b.f * 0.8) / 0.25);
        if (bg <= 0) continue;
        ctx.fillStyle = w.ink(0.78);
        brush(ctx, b.pts, b.w, 1.4, bg);
        for (const t of b.tufts) {
          const tg = ease((bg - t.i / 7) / 0.2);
          if (tg <= 0) continue;
          const x = b.pts[t.i * 2] + (t.dx || 0) + sw * 2.5, y = b.pts[t.i * 2 + 1] + t.dy;
          // 松针：半轮
          softDot(ctx, x, y - t.r * 0.2, t.r * 1.25, w.col('green', 0.2 * tg), w.col('green', 0));
          ctx.strokeStyle = w.ink(0.78 * tg); ctx.lineWidth = 0.95;
          ctx.beginPath();
          for (let k = 0; k < 19; k++) {
            const a = Math.PI + 0.12 + (k / 18) * (Math.PI - 0.24) + sw * 0.03, rr = t.r * tg * (0.82 + ((k * 7) % 5) * 0.05);
            ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
          }
          ctx.stroke();
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
    draw(e, ctx, w) {
      const g = ease(e.age / 3.5);
      ctx.fillStyle = w.ink(0.7);
      brush(ctx, e.trunk, 20, 6, g);
      const season = w.season;
      const leafCol = season === '秋' ? w.col('yellow', 0.8) : season === '冬' ? w.ink(0.0) : w.col('leaf', 0.8);
      const sg = ease((g - 0.55) / 0.45);
      if (sg <= 0) return;
      for (const b of e.boughs) {
        ctx.fillStyle = w.ink(0.7);
        brush(ctx, b.pts, 6, 1.2, sg);
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
          leafP.moveTo(mx, my); leafP.lineTo(mx + (dx / d) * 7 + (-dy / d) * side * 3.6, my + (dy / d) * 7 + (dx / d) * side * 3.6);
          px = x; py = y;
        }
      }
      ctx.lineCap = 'round';
      ctx.strokeStyle = w.ink(0.5); ctx.lineWidth = 0.9; ctx.stroke(strandPath);
      if (season !== '冬') { ctx.strokeStyle = leafCol; ctx.lineWidth = 1.9; ctx.stroke(leafP); }
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
  function blossom(ctx, x, y, s, rot, colorFill, colorCore) {
    ctx.fillStyle = colorFill;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = rot + i * TAU / 5, px = x + Math.cos(a) * s * 0.62, py = y + Math.sin(a) * s * 0.62;
      ctx.moveTo(px + s * 0.56, py); ctx.arc(px, py, s * 0.56, 0, TAU);
    }
    ctx.fill();
    ctx.fillStyle = colorCore;
    ctx.beginPath(); ctx.arc(x, y, s * 0.24, 0, TAU); ctx.fill();
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
      e.spots = e.tree.tips.filter((t) => !t.bud);
      e.shed = 2;
    },
    update(e, dt, w) {
      e.shed -= dt * (1 + Math.abs(w.wind) * 5);
      if (e.shed < 0 && e.age > 6 && e.spots.length) { e.shed = 2.5 + Math.random() * 4; const t = e.spots[(Math.random() * e.spots.length) | 0]; w.drift(t.x, t.y, 'petal', 'red'); }
    },
    draw(e, ctx, w) {
      const g = clamp(e.age / 3.2, 0, 1);
      drawBranches(e, ctx, w, g);
      for (const t of e.tree.tips) {
        const b = easeOut((e.age / 3.2 * e.tree.T - t.t) / 0.5);
        if (b <= 0) continue;
        const s = 6.2 * t.s * b;
        if (t.bud) { ctx.fillStyle = w.col('red', 0.9); ctx.beginPath(); ctx.arc(t.x, t.y, s * 0.42, 0, TAU); ctx.fill(); }
        else blossom(ctx, t.x, t.y, s, t.s * 9, w.col('red', 0.84), w.col('yellow', 0.9));
      }
    }
  };

  /* ================= 花（杏花一树） ================= */
  Kinds.flower = {
    z: 61, max: 4, zone: 'ground',
    create(e, w) {
      const r = e.rng, h = clamp(w.H * 0.3, 170, 330);
      e.tree = growBranches(r, e.x, e.y + h * 0.62, -Math.PI / 2 + (r() - 0.5) * 0.3, h * 0.42, 12, 4, { kink: 0.5, lift: -Math.PI / 2, pull: 0.5, bloom: 0.7, buds: 0.15, flowerDepth: 2 });
      e.spots = e.tree.tips;
      e.shed = 1;
    },
    update(e, dt, w) {
      e.shed -= dt * (1 + Math.abs(w.wind) * 8);
      if (e.shed < 0 && e.age > 6 && w.season !== '冬' && w.season !== '夏') {
        e.shed = 0.8 + Math.random() * 2;
        const t = e.spots[(Math.random() * e.spots.length) | 0];
        w.drift(t.x, t.y, w.season === '秋' ? 'leaf' : 'petal', w.season === '秋' ? 'orange' : 'pink');
      }
    },
    draw(e, ctx, w) {
      const g = clamp(e.age / 3.6, 0, 1), se = w.season;
      drawBranches(e, ctx, w, g);
      if (se === '冬') return;
      const col = se === '夏' ? 'leaf' : se === '秋' ? 'orange' : 'pink';
      for (const t of e.tree.tips) {
        const b = easeOut((e.age / 3.6 * e.tree.T - t.t) / 0.6);
        if (b <= 0) continue;
        softDot(ctx, t.x, t.y, 15 * t.s * b, w.col(col, 0.34), w.col(col, 0));
        if (col === 'pink') blossom(ctx, t.x, t.y, 4.6 * t.s * b, t.s * 7, w.col('pink', 0.9), w.col('red', 0.75));
        else { ctx.fillStyle = w.col(col, 0.8); ctx.beginPath(); leafPath(ctx, t.x, t.y, t.s * 7, 11 * b, 4, 0.1); ctx.fill(); }
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
    draw(e, ctx, w) {
      for (const it of e.items) {
        const g = ease((e.age - it.delay) / 3);
        if (g <= 0) continue;
        const sw = sway(w, it.ph, 0.8) * 9, bx = e.x + it.dx * 0.7, hx = e.x + it.dx + sw, hy = lerp(e.base, e.y + it.top, g);
        // 茎
        ctx.strokeStyle = w.col('leaf', 0.75); ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(bx, e.base); ctx.quadraticCurveTo(bx + it.bend, (e.base + hy) / 2, hx, hy); ctx.stroke();
        ctx.save();
        ctx.translate(hx, hy); ctx.rotate(it.tilt + sw * 0.01);
        if (it.type === 'leaf') {
          const rx = it.rx * g, ry = rx * 0.36;
          const gr = ctx.createRadialGradient(0, 0, 2, 0, 0, rx);
          gr.addColorStop(0, w.col('green', 0.5)); gr.addColorStop(0.8, w.col('leaf', 0.72)); gr.addColorStop(1, w.ink(0.5));
          ctx.fillStyle = gr;
          ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0.12, TAU - 0.12); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = w.ink(0.3); ctx.lineWidth = 0.8;
          ctx.beginPath();
          for (let k = 0; k < 11; k++) { const a = 0.3 + k * (TAU - 0.6) / 10; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * rx * 0.92, Math.sin(a) * ry * 0.92); }
          ctx.stroke();
        } else {
          const s = (it.type === 'bud' ? 15 : 25) * g, open = it.type === 'bud' ? 0.12 : 0.36;
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
    draw(e, ctx, w) {
      for (const s of e.stems) {
        const g = ease((e.age - s.delay) / 2.6);
        if (g <= 0) continue;
        const sw = sway(w, s.ph, 1.1) * 5, bx = e.x + s.dx * 0.5, hx = e.x + s.dx + sw, hy = lerp(e.base, e.y + s.top, g);
        const cx = bx + s.bend, cy = (e.base + hy) / 2;
        ctx.strokeStyle = w.ink(0.7); ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(bx, e.base); ctx.quadraticCurveTo(cx, cy, hx, hy); ctx.stroke();
        ctx.fillStyle = w.ink(0.62);
        ctx.beginPath();
        for (const lf of s.leaves) {
          if (lf.f > g) continue;
          const u = lf.f, x = (1 - u) * (1 - u) * bx + 2 * (1 - u) * u * cx + u * u * hx, y = (1 - u) * (1 - u) * e.base + 2 * (1 - u) * u * cy + u * u * hy;
          leafPath(ctx, x, y, -Math.PI / 2 + lf.side * 1.1, lf.len, 6, lf.side * 0.2);
        }
        ctx.fill();
        // 花：细瓣层层
        const fg = ease((g - 0.75) / 0.25);
        if (fg <= 0) continue;
        ctx.lineCap = 'round';
        for (let layer = 0; layer < 3; layer++) {
          const n = 15 - layer * 3, R = s.s * fg * (1 - layer * 0.27);
          ctx.strokeStyle = w.col(layer === 2 ? 'orange' : s.col, 0.9); ctx.lineWidth = 2.4 - layer * 0.4;
          ctx.beginPath();
          for (let k = 0; k < n; k++) {
            const a = s.rot + layer * 0.3 + k * TAU / n;
            ctx.moveTo(hx + Math.cos(a) * 2, hy + Math.sin(a) * 2);
            ctx.quadraticCurveTo(hx + Math.cos(a + 0.35) * R * 0.7, hy + Math.sin(a + 0.35) * R * 0.7, hx + Math.cos(a) * R, hy + Math.sin(a) * R * 0.9);
          }
          ctx.stroke();
        }
        if (s.col === 'white' && w.nightK < 0.5) { ctx.strokeStyle = w.ink(0.2); ctx.lineWidth = 0.5; ctx.beginPath(); ctx.arc(hx, hy, s.s * fg, 0, TAU); ctx.stroke(); }
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
    draw(e, ctx, w) {
      for (const t of e.tufts) {
        const g = ease((e.age - t.delay) / 1.6);
        if (g <= 0) continue;
        const sw = sway(w, t.ph, 1.5) * 0.3, x = e.x + t.dx, y = e.y + t.dy;
        for (const b of t.blades) {
          const a = -Math.PI / 2 + b.a + sw, L = b.len * g;
          ctx.fillStyle = b.green ? w.col('leaf', w.season === '秋' || w.season === '冬' ? 0.25 : 0.75) : w.ink(0.62);
          ctx.beginPath();
          leafPath(ctx, x, y, a, L, 2.4, b.a * 0.5 + sw * 0.6);
          ctx.fill();
        }
      }
    }
  };
})();
