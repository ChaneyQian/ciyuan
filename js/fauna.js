/* 词源 · fauna.js — 禽鸟虫鱼：鸟 燕 雁 莺 鹤 蝶 虫 鱼 龙 */
(function () {
  'use strict';
  const MS = window.MS, Kinds = MS.Kinds;
  const { clamp, lerp, ease, easeOut, brush, brushPath, leafPath, softDot, noise1, TAU } = MS.util;

  function limit(b, lo, hi) {
    const s = Math.hypot(b.vx, b.vy) || 1;
    if (s > hi) { b.vx *= hi / s; b.vy *= hi / s; } else if (s < lo) { b.vx *= lo / s; b.vy *= lo / s; }
  }
  function bounds(b, w, dt, x0, y0, x1, y1, k) {
    if (b.x < x0) b.vx += k * dt; if (b.x > x1) b.vx -= k * dt;
    if (b.y < y0) b.vy += k * dt; if (b.y > y1) b.vy -= k * dt;
  }
  function flee(b, w, dt, radius, k) {
    const dx = b.x - w.pointer.x, dy = b.y - w.pointer.y, d = Math.hypot(dx, dy);
    if (d < radius && d > 0.1) { b.vx += (dx / d) * k * dt * (1 - d / radius); b.vy += (dy / d) * k * dt * (1 - d / radius); return true; }
    return false;
  }

  /* ================= 鸟（一群山雀：圆身、短喙、扇尾） ================= */
  Kinds.birds = {
    z: 70, max: 4, zone: 'high',
    create(e, w) {
      e.b = [];
      for (let i = 0; i < 7; i++) e.b.push({ x: e.x + (e.rng() - 0.5) * 70, y: e.y + (e.rng() - 0.5) * 60, vx: (e.rng() - 0.5) * 160, vy: (e.rng() - 0.5) * 120, wa: e.rng() * TAU, ph: e.rng() * TAU, s: 0.85 + e.rng() * 0.4, d: i * 0.14, glide: 0, cheek: e.rng() < 0.4 });
      w.emit('birds');
    },
    update(e, dt, w) {
      let cx = 0, cy = 0;
      for (const b of e.b) { cx += b.x; cy += b.y; }
      cx /= e.b.length; cy /= e.b.length;
      for (const b of e.b) {
        b.wa += (Math.random() - 0.5) * dt * 5;
        b.vx += (Math.cos(b.wa) * 70 + (cx - b.x) * 0.35 + w.wind * 60) * dt;
        b.vy += (Math.sin(b.wa) * 46 + (cy - b.y) * 0.35) * dt;
        flee(b, w, dt, 150, 900);
        bounds(b, w, dt, 60, 40, w.W - 60, w.H * 0.62, 160);
        limit(b, 50, 135);
        b.x += b.vx * dt; b.y += b.vy * dt;
        // 扑几下，滑一段
        b.glide -= dt;
        if (b.glide < -0.9 - b.s) b.glide = 0.25 + Math.random() * 0.5;
        if (b.glide <= 0) b.ph += dt * (15 + Math.hypot(b.vx, b.vy) * 0.04);
      }
      if (Math.random() < dt * 0.12) w.emit('birds');
    },
    draw(e, ctx, w) {
      for (const b of e.b) {
        const g = ease((e.age - b.d) / 0.8);
        if (g <= 0) continue;
        const f = b.glide > 0 ? 0.25 : Math.sin(b.ph), s = 1.15 * b.s * g, dir = b.vx >= 0 ? 1 : -1, tilt = clamp(b.vy / 220, -0.5, 0.5);
        ctx.save(); ctx.translate(b.x, b.y); ctx.scale(dir * s, s); ctx.rotate(tilt);
        const wing = (alpha, lift) => {
          const ty = -3 - f * 12 + lift, tx = -5 - (1 - Math.abs(f)) * 4;
          ctx.fillStyle = w.ink(alpha);
          ctx.beginPath();
          ctx.moveTo(4.5, -1.5); ctx.quadraticCurveTo(3, ty * 0.75 - 1.5, tx, ty);
          ctx.quadraticCurveTo(-7.5, ty * 0.35 + 1.5, -4.5, 0.6); ctx.closePath(); ctx.fill();
        };
        wing(0.34, 1.5);                                           // 远翅
        ctx.fillStyle = w.ink(0.86);                               // 尾：两片
        ctx.beginPath(); leafPath(ctx, -6, 0, Math.PI - 0.1, 11.5, 2.6, 0); leafPath(ctx, -6, 0.8, Math.PI + 0.2, 9.5, 2.1, 0); ctx.fill();
        softDot(ctx, 0.5, 0, 10.5, w.ink(0.2), w.ink(0));           // 一点渗开的晕
        ctx.fillStyle = w.ink(0.7);                                // 身与头：一笔墨
        ctx.beginPath(); ctx.ellipse(0, 0, 8.2, 4.5, -0.12, 0, TAU); ctx.fill();
        ctx.fillStyle = w.ink(0.84);
        ctx.beginPath(); ctx.arc(7, -2.6, 3.5, 0, TAU); ctx.fill();
        softDot(ctx, 0.8, 2.4, 5.4, w.col('paper', 0.7), w.col('paper', 0));   // 浅腹：留白
        if (b.cheek) softDot(ctx, 6.2, -1.2, 2.6, w.col('red', 0.7), w.col('red', 0));
        ctx.fillStyle = w.ink(0.9);                                // 喙
        ctx.beginPath(); ctx.moveTo(9.9, -3.6); ctx.lineTo(14, -2.3); ctx.lineTo(9.9, -1.2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = w.col('paper', 0.95);                      // 眼
        ctx.beginPath(); ctx.arc(8, -3.3, 0.85, 0, TAU); ctx.fill();
        wing(0.8, 0);                                              // 近翅
        ctx.restore();
      }
    }
  };

  /* ================= 雁（人字一行） ================= */
  Kinds.geese = {
    z: 69, max: 2, zone: 'sky',
    create(e, w) {
      e.dir = e.x < w.W / 2 ? 1 : -1;
      e.n = 9; e.ph = 0;
      e.lx = e.x; e.ly = e.y;
      w.emit('geese');
    },
    update(e, dt, w) {
      e.lx += e.dir * (42 + w.wind * e.dir * 20) * dt;
      e.ly += Math.sin(w.t * 0.25 + e.seed) * 4 * dt;
      e.ph += dt * 4.2;
      if (e.lx > w.W + 260) { e.lx = -40; e.ly = w.H * (0.1 + Math.random() * 0.25); w.emit('geese'); }
      if (e.lx < -260) { e.lx = w.W + 40; e.ly = w.H * (0.1 + Math.random() * 0.25); w.emit('geese'); }
    },
    draw(e, ctx, w) {
      ctx.strokeStyle = w.ink(0.8); ctx.lineCap = 'round';
      for (let i = 0; i < e.n; i++) {
        const g = ease((e.age - i * 0.22) / 1);
        if (g <= 0) continue;
        const rank = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
        const x = e.lx - e.dir * rank * 25, y = e.ly + (i ? side * rank * 13 : 0) + Math.sin(w.t * 1.3 + i) * 2;
        const f = Math.sin(e.ph - i * 0.6), s = 9 * g;
        ctx.save(); ctx.translate(x, y); ctx.scale(e.dir, 1);
        ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(-s * 0.8, 0); ctx.lineTo(s * 1.3, -s * 0.12); ctx.stroke();      // 身与长颈
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(-s * 1.0, -s * f * 1.1); ctx.quadraticCurveTo(-s * 0.4, -s * f * 0.3, 0, 0); ctx.quadraticCurveTo(s * 0.2, -s * f * 0.5, s * 0.5, -s * f * 1.2); ctx.stroke();
        ctx.restore();
      }
    }
  };

  /* ================= 燕（剪尾，成双） ================= */
  Kinds.swallow = {
    z: 71, max: 3, zone: 'mid',
    create(e, w) {
      e.b = [];
      for (let i = 0; i < 2; i++) e.b.push({ x: e.x + i * 30, y: e.y + i * 18, vx: (e.x < w.W / 2 ? 1 : -1) * 200, vy: -40, tx: e.x, ty: e.y, tt: 0, ph: i * 2 });
      w.emit('swallow');
    },
    update(e, dt, w) {
      e.b.forEach((b, i) => {
        b.tt -= dt;
        if (b.tt <= 0 || Math.hypot(b.tx - b.x, b.ty - b.y) < 60) {
          b.tt = 2.5 + Math.random() * 2.5;
          if (i === 0) { b.tx = w.W * (0.08 + Math.random() * 0.84); b.ty = w.H * (0.15 + Math.random() * 0.55); if (Math.random() < 0.25) w.emit('swallow'); }
          else { b.tx = e.b[0].tx + (Math.random() - 0.5) * 160; b.ty = e.b[0].ty + (Math.random() - 0.5) * 120; }
        }
        const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy) || 1;
        b.vx += (dx / d) * 330 * dt; b.vy += (dy / d) * 330 * dt + Math.sin(w.t * 2.2 + i * 2) * 120 * dt;
        flee(b, w, dt, 120, 1500);
        limit(b, 150, 300);
        b.x += b.vx * dt; b.y += b.vy * dt; b.ph += dt * 13;
      });
    },
    draw(e, ctx, w) {
      const g = ease(e.age / 0.8);
      for (const b of e.b) {
        const a = Math.atan2(b.vy, b.vx), f = Math.cos(b.ph), s = 1.15 * g;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a); ctx.scale(s, s);
        ctx.fillStyle = w.ink(0.9);
        ctx.beginPath();
        ctx.ellipse(0, 0, 9, 3.1, 0, 0, TAU);
        ctx.moveTo(11, 0); ctx.arc(8, 0, 3, 0, TAU);
        leafPath(ctx, -7, 0.5, Math.PI - 0.22, 19, 1.6, 0); leafPath(ctx, -7, -0.5, Math.PI + 0.22, 19, 1.6, 0);   // 剪尾
        const span = 21 * (0.35 + 0.65 * Math.abs(f));
        leafPath(ctx, 3, 0, Math.PI / 2 + 0.55, span, 4.4, -0.25); leafPath(ctx, 3, 0, -Math.PI / 2 - 0.55, span, 4.4, 0.25);
        ctx.fill();
        ctx.fillStyle = w.col('red', 0.85);
        ctx.beginPath(); ctx.arc(9.5, 0, 1.3, 0, TAU); ctx.fill();
        ctx.restore();
      }
    }
  };

  /* ================= 莺（黄鹂，跳跃着飞） ================= */
  Kinds.oriole = {
    z: 71, max: 3, zone: 'mid',
    create(e, w) {
      e.b = [];
      for (let i = 0; i < 3; i++) e.b.push({ x: e.x + (e.rng() - 0.5) * 50, y: e.y + (e.rng() - 0.5) * 40, vx: 0, vy: 0, tx: e.x, ty: e.y, rest: e.rng() * 1.5, ph: e.rng() * 6 });
      w.emit('oriole');
    },
    update(e, dt, w) {
      for (const b of e.b) {
        b.rest -= dt;
        const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy);
        if (b.rest <= 0 && d < 14) {
          b.rest = 0.8 + Math.random() * 2.6;
          const sp = w.flowerSpots;
          if (sp.length && Math.random() < 0.7) { const s = sp[(Math.random() * sp.length) | 0]; b.tx = s.x + (Math.random() - 0.5) * 30; b.ty = s.y - 8 + (Math.random() - 0.5) * 20; }
          else { b.tx = clamp(b.x + (Math.random() - 0.5) * 420, 40, w.W - 40); b.ty = clamp(b.y + (Math.random() - 0.5) * 260, 50, w.H * 0.72); }
          if (Math.random() < 0.3) w.emit('oriole');
        }
        if (flee(b, w, dt, 110, 2400)) { b.tx = clamp(b.x + b.vx, 40, w.W - 40); b.ty = clamp(b.y + b.vy, 50, w.H * 0.72); }
        const k = d > 14 ? 5 : 9;
        b.vx += (dx * 2.6 - b.vx) * k * dt; b.vy += (dy * 2.6 - b.vy) * k * dt;
        limit(b, 0, 320);
        b.x += b.vx * dt; b.y += b.vy * dt;
        b.sp = Math.hypot(b.vx, b.vy);
        b.ph += dt * (b.sp > 30 ? 26 : 3);
      }
    },
    draw(e, ctx, w) {
      const g = ease(e.age / 0.8);
      for (const b of e.b) {
        const fly = b.sp > 30, dir = (fly ? b.vx : b.tx - b.x + 0.01) >= 0 ? 1 : -1;
        ctx.save(); ctx.translate(b.x, b.y + (fly ? 0 : Math.sin(b.ph) * 0.8)); ctx.scale(dir * g, g); ctx.rotate(fly ? clamp(b.vy / 300, -0.5, 0.5) : -0.15);
        ctx.fillStyle = w.col('yellow', 0.95);
        ctx.beginPath(); ctx.ellipse(0, 0, 7.5, 4.2, 0, 0, TAU); ctx.moveTo(9.5, -2.5); ctx.arc(6.5, -2.5, 3.2, 0, TAU); ctx.fill();
        ctx.fillStyle = w.ink(0.88);
        ctx.beginPath();
        leafPath(ctx, -5, 0, Math.PI - 0.1, 9, 2.2, 0);                                  // 尾
        if (fly) { const f = Math.sin(b.ph); leafPath(ctx, 0, -1, -Math.PI / 2 - 0.5 + f * 0.2, 11 * Math.abs(f) + 3, 3.4, 0); }
        else leafPath(ctx, 1, -1, Math.PI - 0.25, 8.5, 2.6, 0);
        ctx.moveTo(8.6, -3); ctx.arc(7.8, -3, 0.85, 0, TAU);                              // 眼
        ctx.moveTo(9.4, -2.9); ctx.lineTo(12.6, -2.2); ctx.lineTo(9.4, -1.6);            // 喙
        ctx.fill();
        ctx.restore();
      }
    }
  };

  /* ================= 鹤 ================= */
  Kinds.crane = {
    z: 72, max: 2, zone: 'high',
    create(e, w) {
      e.b = [];
      for (let i = 0; i < 2; i++) e.b.push({ x: e.x - i * 70, y: e.y + i * 34, a: e.rng() * TAU, ph: i * 1.7, cx: e.x, cy: e.y, rx: w.W * (0.22 + e.rng() * 0.14), ry: w.H * (0.1 + e.rng() * 0.08), sp: 0.12 + e.rng() * 0.05, dir: 1, px: e.x });
      w.emit('crane');
    },
    update(e, dt, w) {
      for (const b of e.b) {
        b.a += dt * b.sp;
        b.cx += (clamp(e.x, w.W * 0.3, w.W * 0.7) - b.cx) * dt * 0.1;
        const tx = b.cx + Math.cos(b.a) * b.rx, ty = clamp(e.y, w.H * 0.18, w.H * 0.5) + Math.sin(b.a * 2) * b.ry;
        b.x += (tx - b.x) * Math.min(1, dt * 1.2); b.y += (ty - b.y) * Math.min(1, dt * 1.2);
        b.dir = b.x - b.px >= 0 ? 1 : -1; b.tilt = clamp((b.y - (b.py || b.y)) / Math.max(1e-3, Math.abs(b.x - b.px)) * 0.6, -0.35, 0.35);
        b.px = b.x; b.py = b.y;
        b.ph += dt * 3.1;
      }
      if (Math.random() < dt * 0.06) w.emit('crane');
    },
    draw(e, ctx, w) {
      const g = ease(e.age / 1.6);
      for (const b of e.b) {
        const f = Math.sin(b.ph);
        ctx.save(); ctx.translate(b.x, b.y); ctx.scale(b.dir * g * 1.05, g * 1.05); ctx.rotate(b.tilt || 0);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        // 腿
        ctx.strokeStyle = w.ink(0.75); ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(-14, 3); ctx.lineTo(-50, 8); ctx.moveTo(-14, 5); ctx.lineTo(-47, 12); ctx.stroke();
        const wing = (alpha, off) => {
          const ty = -6 - f * 40 + off, tx = -10 + (1 - Math.abs(f)) * 6;
          ctx.fillStyle = w.col('white', alpha); ctx.strokeStyle = w.ink(0.5); ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(12, -3); ctx.quadraticCurveTo(8, ty * 0.6, tx, ty); ctx.quadraticCurveTo(-18, ty * 0.45, -12, -1); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = w.ink(0.85);   // 黑色飞羽
          ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(-18, ty * 0.45, -12, -1); ctx.quadraticCurveTo(-12, ty * 0.5, tx, ty); ctx.fill();
        };
        wing(0.75, 5);
        // 身
        ctx.fillStyle = w.col('white', 0.96); ctx.strokeStyle = w.ink(0.5); ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.ellipse(0, 0, 21, 7.5, -0.06, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = w.ink(0.86);
        ctx.beginPath(); leafPath(ctx, -16, 0, Math.PI - 0.1, 16, 5, 0); ctx.fill();
        // 颈与首
        ctx.strokeStyle = w.col('white', 0.96); ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(16, -2); ctx.quadraticCurveTo(34, -1, 50, -10); ctx.stroke();
        ctx.strokeStyle = w.ink(0.85); ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(28, -2.6); ctx.quadraticCurveTo(40, -4, 49, -9.5); ctx.stroke();
        ctx.fillStyle = w.col('white', 1);
        ctx.beginPath(); ctx.arc(51, -10.5, 3.3, 0, TAU); ctx.fill();
        ctx.fillStyle = w.col('red', 0.95);
        ctx.beginPath(); ctx.arc(51, -12.6, 1.9, 0, TAU); ctx.fill();
        ctx.strokeStyle = w.ink(0.85); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(53.5, -10.4); ctx.lineTo(64, -8.6); ctx.stroke();
        wing(0.98, 0);
        ctx.restore();
      }
    }
  };

  /* ================= 蝶 ================= */
  Kinds.butterfly = {
    z: 73, max: 4, zone: 'mid',
    create(e, w) {
      e.b = [];
      const cols = ['red', 'yellow', 'green', 'ink', 'pink'];
      for (let i = 0; i < 4; i++) e.b.push({ x: e.x + (e.rng() - 0.5) * 40, y: e.y + (e.rng() - 0.5) * 40, vx: 0, vy: 0, n: e.rng() * 100, ph: e.rng() * 6, c: cols[(e.rng() * cols.length) | 0], s: 6 + e.rng() * 4, tgt: null, tt: 0, d: i * 0.35 });
      w.emit('butterfly');
    },
    update(e, dt, w) {
      for (const b of e.b) {
        b.n += dt; b.ph += dt * 15; b.tt -= dt;
        if (b.tt <= 0) { b.tt = 3 + Math.random() * 5; const sp = w.flowerSpots; b.tgt = sp.length && Math.random() < 0.8 ? sp[(Math.random() * sp.length) | 0] : null; }
        let ax = (noise1(b.n * 0.9) - 0.5) * 500, ay = (noise1(b.n * 0.9 + 50) - 0.5) * 500;
        if (b.tgt) { ax += (b.tgt.x - b.x) * 1.3; ay += (b.tgt.y - 12 - b.y) * 1.3; }
        b.vx += ax * dt + w.wind * 120 * dt; b.vy += ay * dt;
        flee(b, w, dt, 90, 1200);
        bounds(b, w, dt, 40, 40, w.W - 40, w.H - 60, 260);
        b.vx *= 1 - dt * 1.4; b.vy *= 1 - dt * 1.4;
        limit(b, 0, 120);
        b.x += b.vx * dt; b.y += b.vy * dt + Math.sin(b.ph * 0.5) * 12 * dt;
      }
    },
    draw(e, ctx, w) {
      for (const b of e.b) {
        const g = ease((e.age - b.d) / 0.9);
        if (g <= 0) continue;
        const f = 0.18 + 0.82 * Math.abs(Math.cos(b.ph)), s = b.s * g, a = Math.atan2(b.vy, b.vx + 0.01) + Math.PI / 2;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a * 0.5);
        for (const side of [-1, 1]) {
          ctx.save(); ctx.scale(side * f, 1);
          ctx.fillStyle = w.col(b.c, 0.84); ctx.strokeStyle = w.ink(0.7); ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(s * 0.6, -s * 1.7, s * 1.9, -s * 1.2, s * 1.3, -s * 0.1); ctx.quadraticCurveTo(s * 0.6, 0.1 * s, 0, 0);
          ctx.moveTo(0, 0); ctx.bezierCurveTo(s * 1.2, s * 0.3, s * 1.1, s * 1.4, s * 0.35, s * 1.1); ctx.quadraticCurveTo(0, s * 0.6, 0, 0);
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = w.ink(0.6);
          ctx.beginPath(); ctx.arc(s * 1.05, -s * 0.75, s * 0.2, 0, TAU); ctx.fill();
          ctx.restore();
        }
        ctx.strokeStyle = w.ink(0.9); ctx.lineWidth = 1.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, -s * 0.5); ctx.lineTo(0, s * 0.7); ctx.stroke();
        ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(0, -s * 0.5); ctx.quadraticCurveTo(-s * 0.3, -s * 1.1, -s * 0.6, -s * 1.3); ctx.moveTo(0, -s * 0.5); ctx.quadraticCurveTo(s * 0.3, -s * 1.1, s * 0.6, -s * 1.3); ctx.stroke();
        ctx.restore();
      }
    }
  };

  /* ================= 虫（流萤点点，蛩声唧唧） ================= */
  Kinds.insects = {
    z: 74, max: 3, zone: 'ground',
    create(e, w) {
      e.b = [];
      for (let i = 0; i < 16; i++) e.b.push({ x: e.x + (e.rng() - 0.5) * 240, y: e.y + (e.rng() - 0.5) * 160, n: e.rng() * 100, ph: e.rng() * TAU, sp: 0.8 + e.rng() * 1.4, d: e.rng() * 2 });
      e.chirp = 0.5;
    },
    update(e, dt, w) {
      for (const b of e.b) {
        b.n += dt * 0.35;
        b.x += ((noise1(b.n) - 0.5) * 70 + w.wind * 30) * dt; b.y += (noise1(b.n + 40) - 0.5) * 56 * dt;
        b.x += (e.x - b.x) * dt * 0.03; b.y += (e.y - b.y) * dt * 0.03;
        b.ph += dt * b.sp;
      }
      e.chirp -= dt;
      if (e.chirp <= 0) { e.chirp = 2.4 + Math.random() * 4; w.emit('cricket'); }
    },
    draw(e, ctx, w) {
      const k = w.nightK;
      for (const b of e.b) {
        const g = ease((e.age - b.d) / 1), a = g * (0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(b.ph), 2));
        if (a <= 0) continue;
        softDot(ctx, b.x, b.y, lerp(9, 16, k), 'rgba(' + (k > 0.5 ? '190,255,150' : '150,190,60') + ',' + lerp(0.34, 0.6, k) * a + ')', 'rgba(170,230,120,0)');
        ctx.fillStyle = k > 0.5 ? 'rgba(240,255,210,' + a + ')' : w.ink(0.7 * g);
        ctx.beginPath(); ctx.arc(b.x, b.y, 1.4, 0, TAU); ctx.fill();
      }
    }
  };

  /* ================= 鱼（锦鲤：红白、墨、金、丹顶，曳着纱尾） ================= */
  const KOI = {
    kohaku: { body: ['white', 0.78], fin: ['white', 0.34], patch: 'red', line: 0.26 },
    ink:    { body: ['ink', 0.5],    fin: ['ink', 0.2],   patch: null,  line: 0 },
    gold:   { body: ['orange', 0.5], fin: ['orange', 0.24], patch: 'yellow', line: 0.2 },
    tancho: { body: ['white', 0.78], fin: ['white', 0.34], patch: 'red', line: 0.26 }
  };
  Kinds.fish = {
    z: 55, max: 4, zone: 'low',
    create(e, w) {
      e.b = [];
      const looks = ['kohaku', 'ink', 'gold', 'tancho'], off = (e.rng() * 4) | 0, n = 3 + ((e.rng() * 2) | 0);
      for (let i = 0; i < n; i++) {
        const look = looks[(i + off) % 4], spots = [];
        if (look === 'tancho') spots.push([0.1, 0, 0.26]);
        else if (KOI[look].patch) for (let k = 0; k < 3; k++) spots.push([0.1 + k * 0.27 + e.rng() * 0.1, (e.rng() - 0.5) * 0.6, 0.17 + e.rng() * 0.12]);
        e.b.push({ x: e.x + (e.rng() - 0.5) * 70, y: e.y + (e.rng() - 0.5) * 46, a: e.rng() * TAU, sp: 38 + e.rng() * 28, n: e.rng() * 100, ph: e.rng() * 6, s: 0.85 + e.rng() * 0.45, look, spots, d: i * 0.4, burst: 0 });
      }
      w.emit('fish');
    },
    update(e, dt, w) {
      for (const b of e.b) {
        b.n += dt;
        let turn = (noise1(b.n * 0.5) - 0.5) * 2.4;
        const hx = clamp(b.x, 90, w.W - 90), hy = clamp(b.y, w.H * 0.3, w.H - 80);
        if (hx !== b.x || hy !== b.y) { const want = Math.atan2(hy - b.y, hx - b.x); turn += Math.sin(want - b.a) * 3; }
        const dx = b.x - w.pointer.x, dy = b.y - w.pointer.y, d = Math.hypot(dx, dy);
        if (d < 110) { const away = Math.atan2(dy, dx); turn += Math.sin(away - b.a) * 7; b.burst = 1; }
        b.burst = Math.max(0, b.burst - dt * 1.2);
        b.a += turn * dt; b.turn = turn;
        const v = b.sp * (1 + b.burst * 2.4) * (0.75 + 0.25 * Math.sin(b.ph * 0.5));
        b.x += Math.cos(b.a) * v * dt; b.y += Math.sin(b.a) * v * dt;
        b.ph += dt * (4.4 + v * 0.06);
        if (Math.random() < dt * 5) w.stir(b.x, b.y, Math.cos(b.a) * v * 1.6, Math.sin(b.a) * v * 1.6, 20);
      }
      if (Math.random() < dt * 0.1) w.emit('fish');
    },
    draw(e, ctx, w) {
      for (const b of e.b) {
        const g = ease((e.age - b.d) / 1.2);
        if (g <= 0) continue;
        const K = KOI[b.look], S = 31 * b.s * g, ca = Math.cos(b.a), sa = Math.sin(b.a), pts = [], N = 9;
        // 脊线：越往尾摆得越开
        for (let i = 0; i <= N; i++) {
          const u = i / N, back = (u - 0.24) * S * 1.9, lat = Math.sin(b.ph - u * 2.7) * S * 0.2 * u * u;
          pts.push(b.x - ca * back - sa * lat, b.y - sa * back + ca * lat);
        }
        const P = (u) => { const i = Math.min(N - 1, Math.floor(u * N)), t = u * N - i; return [lerp(pts[i * 2], pts[i * 2 + 2], t), lerp(pts[i * 2 + 1], pts[i * 2 + 3], t)]; };
        const wd = (t) => S * 0.5 * Math.pow(Math.sin(Math.PI * Math.pow(clamp(t * 0.93 + 0.07, 0, 1), 0.58)), 0.8) + 1.2;
        const tx = pts[N * 2], ty = pts[N * 2 + 1], ta = Math.atan2(ty - pts[N * 2 - 1], tx - pts[N * 2 - 2]);
        const finCol = w.col(K.fin[0], K.fin[1]), sway = Math.sin(b.ph - 2.9);
        ctx.lineCap = 'round';
        // 纱尾：几片半透明的长瓣，带鳍条
        ctx.fillStyle = finCol;
        ctx.beginPath();
        for (let k = -2; k <= 2; k++) leafPath(ctx, tx, ty, ta + k * 0.3 + sway * 0.16 * (1 + Math.abs(k) * 0.3), S * (0.98 - Math.abs(k) * 0.13), S * 0.19, k * 0.1 + sway * 0.12);
        ctx.fill();
        ctx.strokeStyle = w.col(K.patch || 'ink', 0.2); ctx.lineWidth = 0.6;
        ctx.beginPath();
        for (let k = -3; k <= 3; k++) { const a = ta + k * 0.2 + sway * 0.16; ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx + Math.cos(a) * S * 0.4, ty + Math.sin(a) * S * 0.4, tx + Math.cos(a + sway * 0.12) * S * 0.78, ty + Math.sin(a + sway * 0.12) * S * 0.78); }
        ctx.stroke();
        // 胸鳍、腹鳍
        const f1 = P(0.2), f2 = P(0.52), fl = Math.sin(b.ph * 0.5) * 0.3;
        ctx.fillStyle = finCol;
        ctx.beginPath();
        leafPath(ctx, f1[0], f1[1], b.a + 2.0 + fl, S * 0.58, S * 0.2, 0.22); leafPath(ctx, f1[0], f1[1], b.a - 2.0 - fl, S * 0.58, S * 0.2, -0.22);
        leafPath(ctx, f2[0], f2[1], b.a + 2.5 + fl * 0.6, S * 0.3, S * 0.11, 0.2); leafPath(ctx, f2[0], f2[1], b.a - 2.5 - fl * 0.6, S * 0.3, S * 0.11, -0.2);
        ctx.fill();
        // 身：先一圈渗开的晕，再一层淡彩；墨鲤背上压一团浓墨
        const mid = P(0.3);
        softDot(ctx, mid[0], mid[1], S * 0.95, w.col(K.body[0] === 'white' ? 'ink' : K.body[0], K.body[0] === 'white' ? 0.1 : 0.2), w.col(K.body[0], 0));
        brushPath(ctx, pts, wd, null, null, true);
        ctx.fillStyle = w.col(K.body[0], K.body[1]); ctx.fill();
        if (K.line) { ctx.strokeStyle = w.ink(K.line * (1 - w.nightK * 0.6)); ctx.lineWidth = 0.8; ctx.stroke(); }
        if (b.look !== 'kohaku' && b.look !== 'tancho') {
          ctx.save(); ctx.clip();
          const hd0 = P(0.12), bk = P(0.5);
          softDot(ctx, hd0[0], hd0[1], S * 0.42, w.col(K.body[0], 0.5), w.col(K.body[0], 0));
          softDot(ctx, bk[0], bk[1], S * 0.5, w.col(K.body[0], 0.3), w.col(K.body[0], 0));
          ctx.restore();
          brushPath(ctx, pts, wd, null, null, true);
        }
        // 斑纹：裁在身形之内
        if (b.spots.length) {
          ctx.save(); ctx.clip();
          for (const sp of b.spots) {
            const p = P(sp[0]), r = S * sp[2];
            softDot(ctx, p[0] - sa * sp[1] * S * 0.3, p[1] + ca * sp[1] * S * 0.3, r * 1.5, w.col(K.patch, 0.8), w.col(K.patch, 0));       // 斑：一点淡彩洇开
          }
          ctx.restore();
        }
        // 背鳍一线
        ctx.strokeStyle = b.look === 'ink' ? w.ink(0.5) : w.col(K.patch || 'ink', 0.34); ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let u = 0.28; u <= 0.68; u += 0.08) { const p = P(u); if (u === 0.28) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); }
        ctx.stroke();
        // 眼与须
        const hd = P(0.06), hw = wd(0.06) * 0.4;
        ctx.fillStyle = w.ink(0.9);
        ctx.beginPath(); ctx.arc(hd[0] - sa * hw, hd[1] + ca * hw, S * 0.045, 0, TAU); ctx.arc(hd[0] + sa * hw, hd[1] - ca * hw, S * 0.045, 0, TAU); ctx.fill();
        const mo = P(0);
        ctx.strokeStyle = w.ink(0.5); ctx.lineWidth = 0.7;
        ctx.beginPath();
        for (const sd of [-1, 1]) { ctx.moveTo(mo[0] - sa * sd * 2, mo[1] + ca * sd * 2); ctx.lineTo(mo[0] + ca * S * 0.13 - sa * sd * S * 0.13, mo[1] + sa * S * 0.13 + ca * sd * S * 0.13); }
        ctx.stroke();
      }
    }
  };

  /* ================= 龙（水墨） =================
   * 形：照传统龙纹的「九似」——角似鹿，头似驼（隆额、长吻、如意鼻），项似蛇，腹似蜃，鳞似鱼，爪似鹰；
   *     另有鬣、须、髯、腮刺，背鳍如焰，肘毛如火，身作波浪游走，追一颗火珠。
   * 笔：墨龙的画法。不勾死线、不平涂——
   *     身子是一串软边墨团叠出来的晕染，背浓腹淡；轮廓只在背脊与要紧处提几笔由粗到细的墨线；
   *     颜色只点一点淡朱（背鳍、舌、火珠）和一点赭（角、睛）。
   * 掉头时翻一个身，背总朝天。
   */
  /* 一笔：两头尖、中间饱的墨线 */
  const swell = (wid) => (tt) => wid * Math.pow(Math.sin(Math.PI * Math.pow(clamp(tt, 0, 1), 0.7)), 0.75) + 0.3;
  /* 一笔：起笔重、收笔轻 */
  const taper = (wid) => (tt) => wid * (1 - tt * 0.9) + 0.3;
  function mark(ctx, pts, wf, color) { if (brushPath(ctx, pts, wf, null, null, true)) { ctx.fillStyle = color; ctx.fill(); } }
  /* 一绺毛发：沿 ang 方向飘出去，带波浪与下垂 */
  function strand(x0, y0, ang, len, phase, wave, droop) {
    const pts = [], n = 7, c = Math.cos(ang), s = Math.sin(ang);
    for (let j = 0; j <= n; j++) {
      const u = j / n, along = u * len, off = Math.sin(u * 4.4 + phase) * wave * u + droop * u * u * len;
      pts.push(x0 + c * along - s * off, y0 + s * along + c * off);
    }
    return pts;
  }
  function bez(x0, y0, c1x, c1y, c2x, c2y, x3, y3) {
    const pp = [];
    for (let j = 0; j <= 10; j++) { const u = j / 10, m = 1 - u; pp.push(m * m * m * x0 + 3 * m * m * u * c1x + 3 * m * u * u * c2x + u * u * u * x3, m * m * m * y0 + 3 * m * m * u * c1y + 3 * m * u * u * c2y + u * u * u * y3); }
    return pp;
  }

  Kinds.dragon = {
    z: 75, single: true, zone: 'mid',
    respawn(e, x, y, w) { e.goal = { x, y, t: 3 }; w.emit('dragon'); },
    create(e, w) {
      e.S = clamp(Math.min(w.W, w.H) / 640, 0.8, 1.9);
      e.N = 44; e.gap = 11 * e.S;
      e.seg = [];
      const dir = e.x < w.W / 2 ? 1 : -1;
      for (let i = 0; i < e.N; i++) e.seg.push({ x: e.x - dir * i * e.gap * 0.2, y: e.y + i * 0.5 });
      e.a = dir > 0 ? 0 : Math.PI; e.v = 0; e.wt = e.rng() * 100; e.flip = dir; e.flipTo = dir;
      e.pearl = { x: e.x + dir * 160, y: e.y - 30 }; e.puff = 0;
      w.emit('dragon');
    },
    update(e, dt, w) {
      const h = e.seg[0];
      let tx, ty;
      e.wt += dt;
      if (e.goal && (e.goal.t -= dt) > 0) { tx = e.goal.x; ty = e.goal.y; }
      else if (w.pointer.moved < 4 && w.pointer.x > 0) { tx = w.pointer.x; ty = w.pointer.y; }
      else { tx = w.W * (0.5 + 0.36 * Math.sin(e.wt * 0.31)); ty = w.H * (0.45 + 0.27 * Math.sin(e.wt * 0.47 + 1)); }
      // 火珠飘向目标；龙追珠，追到了就绕着它盘旋
      e.pearl.x += (tx - e.pearl.x) * Math.min(1, dt * 3.5); e.pearl.y += (ty - e.pearl.y) * Math.min(1, dt * 3.5);
      tx = e.pearl.x + Math.cos(e.wt * 0.5) * 210 * e.S; ty = e.pearl.y + Math.sin(e.wt * 0.5) * 130 * e.S;
      const dx = tx - h.x, dy = ty - h.y, d = Math.hypot(dx, dy);
      const want = Math.atan2(dy, dx) + Math.sin(e.wt * 2.4) * 0.28;
      let da = want - e.a; da = Math.atan2(Math.sin(da), Math.cos(da));
      const turn = Math.min(3.2, e.v / (125 * e.S) + 0.15);          // 转弯半径不小于身长所能跟上的，免得打结
      e.a += clamp(da, -turn * dt, turn * dt);
      const sp = clamp(d * 1.6, 110, 380) * e.S;
      e.v += (sp - e.v) * Math.min(1, dt * 2.5);
      h.x += Math.cos(e.a) * e.v * dt; h.y += Math.sin(e.a) * e.v * dt;
      for (let i = 1; i < e.N; i++) {
        const p = e.seg[i - 1], q = e.seg[i], ddx = q.x - p.x, ddy = q.y - p.y, dd = Math.hypot(ddx, ddy) || 1;
        q.x = p.x + (ddx / dd) * e.gap; q.y = p.y + (ddy / dd) * e.gap;
      }
      const c = Math.cos(e.a);
      if (Math.abs(c) > 0.5) e.flipTo = c > 0 ? 1 : -1;
      e.flip += clamp(e.flipTo - e.flip, -dt * 5, dt * 5);
      if (e.v > 60) {
        w.stir(h.x, h.y, Math.cos(e.a) * e.v * 2.2, Math.sin(e.a) * e.v * 2.2, 46 * e.S);
        const m = e.seg[(e.N * 0.5) | 0]; w.stir(m.x, m.y, Math.cos(e.a) * e.v, Math.sin(e.a) * e.v, 34 * e.S);
      }
      // 云从龙：身后偶尔带起一缕极淡的墨
      e.puff -= dt;
      if (e.puff <= 0 && e.v > 110) { e.puff = 0.7; const m = e.seg[(e.N * 0.62) | 0]; w.dye(m.x, m.y, [0.01, 0, 0], 30 * e.S); }
      if (Math.random() < dt * 0.07) w.emit('dragon');
    },
    draw(e, ctx, w) {
      const S = e.S, N = e.N, raw = e.seg, g = ease(e.age / 2.4), t = w.t, nk = w.nightK;
      const vis = Math.max(6, Math.round(N * g));
      const fl = e.flip, fk = Math.abs(fl), fs = fl >= 0 ? 1 : -1, roll = 0.4 + 0.6 * fk;
      const INK = (a) => w.ink(a), RED = (a) => w.col('red', a), PAPER = (a) => w.col('paper', a);
      // 身宽：颈略细，肩最粗，后三分之一渐收成尾
      const wd = (u) => (u < 0.24 ? lerp(27, 43, ease(u / 0.24)) : u < 0.58 ? lerp(43, 36, (u - 0.24) / 0.34) : lerp(36, 4.5, Math.pow((u - 0.58) / 0.42, 1.15))) * S;
      const normals = (pts) => {
        const ax = [], ay = [];
        for (let i = 0; i < N; i++) {
          const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N - 1, i + 1)], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
          ax.push(-dy / d); ay.push(dx / d);          // 龙向右飞时，这条法线朝天
        }
        return [ax, ay];
      };
      // 游走：身子起伏如浪（龙纹最要紧的就是这道曲线）
      const [rx, ry] = normals(raw), amp = 35 * S * (0.78 + 0.22 * clamp(e.v / 170, 0, 1));
      // 走直路时大起大伏；路本身在拐弯的地方就收着点，否则里圈会挤成一团
      const bend = [];
      for (let i = 0; i < N; i++) {
        const a = raw[Math.max(0, i - 1)], b = raw[i], c = raw[Math.min(N - 1, i + 1)];
        let da = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(b.y - a.y, b.x - a.x);
        bend.push(Math.abs(Math.atan2(Math.sin(da), Math.cos(da))));
      }
      const P = raw.map((p, i) => {
        let k = 0, n = 0;
        for (let j = Math.max(1, i - 4); j <= Math.min(N - 2, i + 4); j++) { k += bend[j]; n++; }
        const calm = 1 / (1 + Math.pow((n ? k / n : 0) * 15, 2));
        const o = Math.sin(t * 2.0 - i * 0.362) * amp * calm * ease(i / 9) * (1 - 0.3 * i / N);
        return { x: p.x + rx[i] * o, y: p.y + ry[i] * o };
      });
      const [nx, ny] = normals(P);
      const hwAt = (i) => wd(i / (N - 1)) * 0.5;
      const pts = [];
      for (let i = 0; i < vis; i++) pts.push(P[i].x, P[i].y);
      const W = (tt) => wd(tt * (vis - 1) / (N - 1));
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';

      /* —— 火珠：一点淡朱，外面一圈光晕 —— */
      {
        const px = e.pearl.x, py = e.pearl.y, pr = 10.5 * S * g;
        softDot(ctx, px, py, pr * 5, w.col('red', lerp(0.16, 0.3, nk) * g), w.col('orange', 0));
        for (let k = 0; k < 5; k++) {
          const a = -Math.PI / 2 + (k - 2) * 0.6 + Math.sin(t * 5 + k * 1.3) * 0.2;
          mark(ctx, strand(px + Math.cos(a) * pr * 0.5, py + Math.sin(a) * pr * 0.5, a, pr * (2.6 + 0.9 * Math.sin(t * 7 + k * 1.7)), t * 6 + k, pr * 0.3, 0), taper(pr * 0.75), w.col(k % 2 ? 'orange' : 'red', 0.42));
        }
        softDot(ctx, px, py, pr * 1.5, w.col('red', 0.8), w.col('red', 0));
        softDot(ctx, px - pr * 0.3, py - pr * 0.35, pr * 0.62, w.col('paper', 0.8), w.col('paper', 0));
      }

      /* —— 祥云：几朵如意云头伴着龙身，淡墨勾卷、留白为云 —— */
      const cloud = (cx, cy, sc, ph) => {
        softDot(ctx, cx, cy + 4 * sc, 40 * sc, INK(0.1), INK(0));
        mark(ctx, [cx - 22 * sc, cy + 9 * sc, cx - 42 * sc, cy + 14 * sc, cx - 66 * sc, cy + 9 * sc], taper(5 * sc), INK(0.22));      // 云尾
        for (const [dx, dy, r] of [[-17, 3, 11], [1, -6, 15], [19, 4, 10.5]]) {
          const x = cx + dx * sc, y = cy + dy * sc + Math.sin(t * 0.9 + ph + dx) * 1.6;
          softDot(ctx, x, y, r * sc * 1.3, PAPER(0.88), PAPER(0));
          ctx.strokeStyle = INK(0.4); ctx.lineWidth = 1.15 * sc;
          ctx.beginPath(); ctx.arc(x, y, r * sc, Math.PI * 0.86, Math.PI * 2.3); ctx.stroke();                              // 云头
          ctx.beginPath(); ctx.arc(x + r * sc * 0.26, y + r * sc * 0.12, r * sc * 0.52, Math.PI * 0.15, Math.PI * 1.7); ctx.stroke();   // 内卷
        }
      };
      if (vis > 34) {
        const c1 = raw[15], c2 = raw[33];
        ctx.save(); ctx.globalAlpha *= ease((e.age - 2) / 2);
        cloud(c1.x - rx[15] * fs * 62 * S, c1.y - ry[15] * fs * 62 * S, 1.15 * S, 0);
        cloud(c2.x + rx[33] * fs * 50 * S, c2.y + ry[33] * fs * 50 * S, 0.9 * S, 2);
        ctx.restore();
      }

      /* —— 足：墨团作股与胫，肘后几缕飘毛，趾端是浓墨的钩爪 —— */
      const S2 = S * 1.45;
      const leg = (idx, ph, tone, front) => {
        if (idx >= vis - 2) return;
        const p = P[idx], hw = hwAt(idx), bx = -nx[idx] * fs, by = -ny[idx] * fs;       // 腹的方向
        const hx = -ny[idx], hy = nx[idx];                                              // 朝头的方向
        const sw = Math.sin(t * 4.2 + ph) * clamp(e.v / 220, 0.2, 1), d = front ? 1 : -1;
        const ox = p.x + bx * hw * 0.5, oy = p.y + by * hw * 0.5;
        const kx = ox + (bx * 21 * roll + hx * d * (11 + sw * 8)) * S2, ky = oy + (by * 21 * roll + hy * d * (11 + sw * 8)) * S2;
        const fx = kx + (bx * (12 - sw * 4) * roll + hx * (front ? 15 + sw * 6 : -5 + sw * 8)) * S2, fy = ky + (by * (12 - sw * 4) * roll + hy * (front ? 15 + sw * 6 : -5 + sw * 8)) * S2;
        // 肘毛
        const ea = Math.atan2(oy - ky, ox - kx) - d * fs * 0.9;
        for (let k = 0; k < 3; k++) mark(ctx, strand(kx, ky, ea + (k - 1) * 0.42, (20 - k * 2) * S2, t * 6 + k + ph, 2.4 * S2, 0.04 * fs * d), taper(3.6 * S2), k === 1 ? RED(0.4 * tone) : INK(0.34 * tone));
        // 股与胫：没骨，一笔晕成
        const mx = (ox + kx) / 2 + hx * d * 3 * S2, my = (oy + ky) / 2 + hy * d * 3 * S2;
        softDot(ctx, mx, my, 15 * S2, INK(0.16 * tone), INK(0));
        mark(ctx, [ox, oy, (ox + mx) / 2, (oy + my) / 2, mx, my, (mx + kx) / 2, (my + ky) / 2, kx, ky], (tt) => (7.5 + 6 * Math.sin(Math.PI * Math.pow(tt, 0.6)) * (1 - tt * 0.45)) * S2, INK(0.46 * tone));
        mark(ctx, [kx, ky, (kx + fx) / 2 + bx * 1.5 * S2, (ky + fy) / 2 + by * 1.5 * S2, fx, fy], (tt) => lerp(8, 5.6, tt) * S2, INK(0.5 * tone));
        // 爪：三趾在前，一趾在后；趾淡，钩爪浓
        const fa = Math.atan2(fy - ky, fx - kx);
        for (const [da, len] of [[-1.0, 14], [-0.34, 16.5], [0.34, 16], [1.0, 13], [2.6, 10]]) {
          const a = fa + da * fs, c1 = Math.cos(a), s1 = Math.sin(a), hook = (da > 2 ? -0.9 : 0.9) * fs;
          const jx = fx + c1 * len * 0.5 * S2, jy = fy + s1 * len * 0.5 * S2;
          mark(ctx, [fx, fy, jx, jy], (tt) => lerp(5, 3.4, tt) * S2, INK(0.5 * tone));
          mark(ctx, [jx, jy, jx + c1 * len * 0.36 * S2, jy + s1 * len * 0.36 * S2, jx + Math.cos(a + hook) * len * 0.62 * S2, jy + Math.sin(a + hook) * len * 0.62 * S2], taper(3.2 * S2), INK(0.86 * tone));
        }
      };
      leg(11, Math.PI, 0.55, true); leg(27, 0, 0.55, false);                    // 远侧：墨色淡一层

      /* —— 尾：几笔飞白散开，杂一点淡朱 —— */
      if (vis >= N) {
        const tp = P[N - 1], ta = Math.atan2(tp.y - P[N - 3].y, tp.x - P[N - 3].x);
        for (let k = -6; k <= 6; k++) {
          const pp = strand(tp.x, tp.y, ta + k * 0.19, (104 - Math.abs(k) * 10) * S, t * 4 + k * 1.3, 7.5 * S, k * 0.035);
          mark(ctx, pp, taper((9 - Math.abs(k) * 0.8) * S), k % 3 === 0 ? RED(0.4) : INK(0.24 + 0.07 * Math.abs(k)));
        }
      }

      /* —— 背鳍：一列向后倒的火焰，淡朱晕染，不勾边 —— */
      const crest = (hgt, color) => {
        const from = 2, to = vis - 3;
        if (to <= from) return;
        ctx.beginPath();
        const edge = [];
        for (let i = from; i < to; i++) {
          const j = i + 1, bx = nx[i] * fs, by = ny[i] * fs, hw = hwAt(i), hw2 = hwAt(j);
          const ex = P[i].x + bx * hw * 0.84 * fk, ey = P[i].y + by * hw * 0.84 * fk;
          const ex2 = P[j].x + nx[j] * fs * hw2 * 0.84 * fk, ey2 = P[j].y + ny[j] * fs * hw2 * 0.84 * fk;
          const tlx = P[j].x - P[i].x, tly = P[j].y - P[i].y;                      // 朝尾
          const hh = hgt * S * (0.3 + 0.7 * fk) * (0.6 + 0.4 * Math.abs(Math.sin(i * 1.3))) * (1 - Math.pow(i / N, 2.2) * 0.7) * Math.min(1, (i - from + 1) / 3);
          const fli = Math.sin(t * 6 - i * 0.7) * 0.12;
          if (i === from) ctx.moveTo(ex, ey);
          edge.push(ex, ey); if (i === to - 1) edge.push(ex2, ey2);
          ctx.quadraticCurveTo(ex + bx * hh * 0.7, ey + by * hh * 0.7, ex + bx * hh + tlx * (0.95 + fli), ey + by * hh + tly * (0.95 + fli));
          ctx.quadraticCurveTo(ex2 + bx * hh * 0.12 + tlx * 0.15, ey2 + by * hh * 0.12 + tly * 0.15, ex2, ey2);
        }
        for (let i = edge.length - 2; i >= 0; i -= 2) ctx.lineTo(edge[i], edge[i + 1]);
        ctx.closePath();
        ctx.fillStyle = color; ctx.fill();
      };
      crest(25, RED(0.4));
      crest(13, INK(0.16));

      /* —— 身：一串软边墨团叠成的晕染，背浓腹淡 —— */
      for (let i = 0; i < vis; i++) {                                              // 外晕：墨往纸里渗
        const hw = hwAt(i);
        softDot(ctx, P[i].x + nx[i] * fl * hw * 0.25, P[i].y + ny[i] * fl * hw * 0.25, hw * 1.7 + 3 * S, INK(0.13), INK(0));
      }
      mark(ctx, pts, W, INK(0.3));                                                 // 身的底色：一层淡墨
      brushPath(ctx, pts, W, null, null, true);
      ctx.save(); ctx.clip();
      const back = [], belly = [];
      for (let i = 0; i < vis; i++) {
        const hw = hwAt(i);
        back.push(P[i].x + nx[i] * fl * hw * 0.6, P[i].y + ny[i] * fl * hw * 0.6);
        belly.push(P[i].x - nx[i] * fl * hw * 0.66, P[i].y - ny[i] * fl * hw * 0.66);
      }
      for (let i = 0; i < vis; i++) {                                              // 背上再罩两遍，越近脊越浓
        const hw = hwAt(i);
        softDot(ctx, P[i].x + nx[i] * fl * hw * 0.95, P[i].y + ny[i] * fl * hw * 0.95, hw * 1.25, INK(0.34), INK(0));
      }
      // 腹：留白，只提一点淡墨的横纹
      for (let i = 0; i < vis; i++) {
        const hw = hwAt(i);
        softDot(ctx, P[i].x - nx[i] * fl * hw * 0.9, P[i].y - ny[i] * fl * hw * 0.9, hw * 0.95, PAPER(0.7), PAPER(0));
      }
      // 鳞：鱼鳞纹，行行错开，弧口朝尾；近腹处渐淡
      for (const [rows, alpha] of [[[0.82], 0.55], [[0.3], 0.4]]) {
        ctx.strokeStyle = INK(alpha); ctx.lineWidth = 1 * S;
        ctx.beginPath();
        for (let i = 1; i < vis - 2; i++) {
          const hw = hwAt(i), a = Math.atan2(P[i + 1].y - P[i].y, P[i + 1].x - P[i].x), r = Math.max(2.2 * S, hw * 0.3), sh = i % 2 ? 0 : 0.27;
          for (const o of rows) {
            const cx = P[i].x + nx[i] * fl * hw * (o - sh), cy = P[i].y + ny[i] * fl * hw * (o - sh);
            ctx.moveTo(cx + Math.cos(a - 1.3) * r, cy + Math.sin(a - 1.3) * r); ctx.arc(cx, cy, r, a - 1.3, a + 1.3);
          }
        }
        ctx.stroke();
      }
      ctx.strokeStyle = INK(0.24); ctx.lineWidth = 0.9 * S;                         // 腹甲的横纹
      ctx.beginPath();
      for (let i = 1; i < vis - 1; i++) {
        const hw = hwAt(i), cx = belly[i * 2], cy = belly[i * 2 + 1];
        ctx.moveTo(cx - nx[i] * hw * 0.3, cy - ny[i] * hw * 0.3); ctx.lineTo(cx + nx[i] * hw * 0.3, cy + ny[i] * hw * 0.3);
      }
      ctx.stroke();
      ctx.restore();
      // 提线：背脊一笔浓墨，腹下一笔淡墨
      const spine = [], under = [];
      for (let i = 0; i < vis; i++) {
        const hw = hwAt(i);
        spine.push(P[i].x + nx[i] * fl * hw * 0.96, P[i].y + ny[i] * fl * hw * 0.96);
        under.push(P[i].x - nx[i] * fl * hw * 0.98, P[i].y - ny[i] * fl * hw * 0.98);
      }
      mark(ctx, spine, swell(4.2 * S), INK(0.78));
      mark(ctx, under, swell(1.8 * S), INK(0.42));

      leg(8, 0, 1, true); leg(24, Math.PI, 1, false);                            // 近侧

      /* —— 首 —— */
      const h = P[0], wv = Math.sin(t * 3.1), wv2 = Math.sin(t * 2.3 + 1), HS = S * 1.72;
      ctx.save();
      ctx.translate(h.x, h.y); ctx.rotate(e.a);
      ctx.scale(HS, HS * fs * (0.62 + 0.38 * fk));
      softDot(ctx, 8, -2, 46, INK(0.12), INK(0));                                  // 头周一圈淡晕
      // 鬣：脑后一把长毛，浓淡相间，随游动飘成波浪
      for (let k = 0; k < 14; k++) {
        const pp = strand(-9 - k * 0.9, -17 + k * 2.5, Math.PI + 0.56 - k * 0.085, 84 - Math.abs(k - 4) * 5, t * 3.8 + k * 0.9, 6, 0.03 - k * 0.011);
        mark(ctx, pp, taper(6), k % 4 === 1 ? RED(0.32) : INK(0.24 + 0.13 * ((k * 5) % 4)));
      }
      // 远侧的角：淡
      mark(ctx, [10, -17, 10, -27, 5, -37, -4, -44, -15, -46], taper(4.2), INK(0.36));
      mark(ctx, [9, -28, 15, -39], taper(2.6), INK(0.36));
      // 耳
      ctx.beginPath(); leafPath(ctx, -3, -11, Math.PI + 0.62 + wv * 0.06, 17, 5.5, 0.2); ctx.fillStyle = INK(0.44); ctx.fill();
      // 腮刺：颌角向后张开的一扇尖鳍
      for (let k = 0; k < 6; k++) {
        ctx.beginPath(); leafPath(ctx, -5, 5 + k * 0.6, Math.PI - 0.52 + k * 0.25 + wv2 * 0.05, 28 - Math.abs(k - 2.5) * 2.6, 4.4, 0.1);
        ctx.fillStyle = k % 2 ? RED(0.32) : INK(0.34); ctx.fill();
      }
      // 须：两根长须，根粗梢细，漂成 S 形
      const wavy = (pp, am, ph) => {                                             // 须不是一条弧，是一路打着弯的
        for (let j = 1; j < pp.length / 2; j++) {
          const dx = pp[j * 2] - pp[j * 2 - 2], dy = pp[j * 2 + 1] - pp[j * 2 - 1], dl = Math.hypot(dx, dy) || 1, o = Math.sin(j * 1.25 + ph) * am * j / 10;
          pp[j * 2] += -dy / dl * o; pp[j * 2 + 1] += dx / dl * o;
        }
        return pp;
      };
      mark(ctx, wavy(bez(50, -5, 76, -10 + wv * 4, 74, -44 - wv * 4, 44 + wv2 * 9, -62 + wv * 4), 4.2, t * 3), taper(3.2), INK(0.78));
      mark(ctx, wavy(bez(46, 1, 74, 12 + wv2 * 4, 66, 44 - wv2 * 4, 30 + wv * 9, 56 + wv2 * 4), 4.2, t * 3 + 2), taper(3.2), INK(0.7));
      // 下颌（张合）
      const jaw = 0.13 + 0.08 * Math.sin(t * 1.7);
      ctx.save(); ctx.translate(2, 5); ctx.rotate(jaw); ctx.translate(-2, -5);
      for (let k = 0; k < 5; k++) mark(ctx, strand(36 - k * 6.5, 13.5, Math.PI / 2 + 0.72 + k * 0.05, 22 - k * 1.6, t * 3.6 + k, 2.4, 0.03), taper(3.2), INK(k % 2 ? 0.3 : 0.5));   // 髯
      ctx.beginPath();
      ctx.moveTo(-8, 5); ctx.lineTo(12, 6.5); ctx.quadraticCurveTo(30, 7, 42, 5.5); ctx.quadraticCurveTo(48.5, 6.5, 46, 10.5);
      ctx.quadraticCurveTo(36, 15.5, 20, 15.5); ctx.quadraticCurveTo(4, 15, -8, 11); ctx.closePath();
      ctx.fillStyle = INK(0.28); ctx.fill();
      mark(ctx, [46, 10.5, 36, 15, 20, 15.5, 4, 14.6, -8, 11], swell(1.8), INK(0.62));       // 颌底一笔
      ctx.fillStyle = PAPER(0.92);                                                          // 下牙
      for (const [x, hgt] of [[39, 7.5], [31, 3.6], [24, 3.2], [17, 2.8]]) { ctx.beginPath(); ctx.moveTo(x - 1.7, 6.8); ctx.lineTo(x, 6.8 - hgt); ctx.lineTo(x + 1.7, 6.8); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      // 口内与舌：全身唯一一块浓朱
      ctx.fillStyle = RED(0.4);
      ctx.beginPath(); ctx.moveTo(5, 3.6); ctx.lineTo(41, -0.2); ctx.lineTo(41, 5.4 + jaw * 26); ctx.lineTo(7, 6.4); ctx.closePath(); ctx.fill();
      mark(ctx, [10, 5.4, 21, 4.2 + jaw * 10, 30, 3 + jaw * 14, 36, 1 + jaw * 9], taper(4.4), RED(0.72));
      // 上颅与长吻：隆额 → 眉骨 → 鼻梁微凹 → 如意鼻；脑后圆收入颈
      ctx.beginPath();
      ctx.moveTo(-16, -11);
      ctx.quadraticCurveTo(-8, -16.5, 0, -18.5); ctx.quadraticCurveTo(8, -21.5, 15, -17.5);
      ctx.quadraticCurveTo(19, -11.5, 26, -10.5); ctx.quadraticCurveTo(34, -10, 39, -14);
      ctx.quadraticCurveTo(45, -19.5, 51, -14.5); ctx.quadraticCurveTo(55, -9, 51, -3.5);
      ctx.quadraticCurveTo(49, -0.5, 45, -1.2); ctx.quadraticCurveTo(30, 1.6, 14, 3.4);
      ctx.quadraticCurveTo(7, 3.4, 4, 5); ctx.quadraticCurveTo(-1, 12.5, -11, 13);
      ctx.quadraticCurveTo(-25, 12, -25, 0); ctx.quadraticCurveTo(-25, -10, -16, -11);
      ctx.fillStyle = INK(0.24); ctx.fill();
      ctx.save(); ctx.clip();
      softDot(ctx, -2, -21, 30, INK(0.46), INK(0));                                // 颅顶浓
      softDot(ctx, -16, 4, 18, INK(0.26), INK(0));                                 // 颊后浓
      softDot(ctx, 30, -2, 22, PAPER(0.5), PAPER(0));                              // 吻侧淡
      ctx.restore();
      ctx.fillStyle = PAPER(0.85);                                                 // 上牙：一枚长獠牙，几颗小齿
      for (const [x, y, hgt] of [[42, -1, 8.2], [35, 0.2, 3.8], [28, 1.2, 3.4], [21, 2.2, 3], [14.5, 3, 2.6]]) { ctx.beginPath(); ctx.moveTo(x - 1.8, y); ctx.lineTo(x + 0.3, y + hgt); ctx.lineTo(x + 1.9, y - 0.3); ctx.closePath(); ctx.fill(); }
      // 提线：额鼻一笔、唇一笔、颊一笔
      mark(ctx, [-16, -11, -8, -16.5, 0, -18.5, 8, -21, 15, -17.5, 19, -12.2, 26, -10.5, 34, -10.6, 39, -14, 45, -19, 51, -14.5, 54.4, -9, 51, -3.5], swell(2.4), INK(0.82));
      mark(ctx, [4, 5, 14, 3.4, 30, 1.6, 45, -1.2, 50, -2.6], swell(1.7), INK(0.78));
      mark(ctx, [4, 5, -1, 12, -11, 13, -22, 10, -25, 0], swell(1.5), INK(0.46));
      // 如意鼻：圆隆的鼻头，鼻翼一卷
      softDot(ctx, 47.5, -11, 7.5, PAPER(0.85), PAPER(0));
      ctx.strokeStyle = INK(0.74); ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.arc(48.2, -10.2, 2.6, 0.4, Math.PI * 1.75); ctx.stroke();
      ctx.fillStyle = INK(0.85); ctx.beginPath(); ctx.ellipse(48.6, -9.8, 1.2, 0.85, -0.4, 0, TAU); ctx.fill();
      // 颊上几笔鳞
      ctx.strokeStyle = INK(0.34); ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (const [x, y] of [[-10, -3], [-4, -6], [-4, 1.5], [2, -2.5], [-10, 4.5], [-16, 0.5], [-4, 8]]) { ctx.moveTo(x + 3.2, y - 1.6); ctx.arc(x, y, 3.4, -0.5, 1.9); }
      ctx.stroke();
      // 目：留白为睛，一点赭，浓墨点瞳；眼睑一道重墨斜压向鼻梁
      ctx.fillStyle = PAPER(0.96);
      ctx.beginPath(); ctx.ellipse(13.5, -11.4, 5.2, 4.1, -0.12, 0, TAU); ctx.fill();
      ctx.fillStyle = w.col('yellow', 0.85); ctx.beginPath(); ctx.arc(14.6, -11.2, 3, 0, TAU); ctx.fill();
      ctx.fillStyle = nk > 0.5 ? 'rgba(10,12,16,1)' : 'rgba(14,12,10,1)'; ctx.beginPath(); ctx.ellipse(15.2, -11.2, 1.3, 2.6, 0, 0, TAU); ctx.fill();
      mark(ctx, [7.4, -14.4, 11, -16.4, 15, -15.8, 19.8, -11.4], swell(2.3), INK(0.9));
      mark(ctx, [8.6, -8.6, 13, -6.8, 18.6, -8.4], swell(1.1), INK(0.6));
      // 眉：几缕向后飘的毛
      for (let k = 0; k < 4; k++) mark(ctx, strand(19.5 - k * 3.4, -15.6 - k * 0.7, Math.PI + 0.74 - k * 0.07, 15 + k * 2.4, t * 4 + k, 1.6, 0.02), taper(3.2), k % 2 ? RED(0.36) : INK(0.5));
      // 近侧的角：鹿角，一干三叉；赭色打底，墨线提边
      const horn = (pp, wid) => { mark(ctx, pp, taper(wid), w.col('yellow', 0.5)); mark(ctx, pp, taper(wid * 0.42), INK(0.7)); };
      horn([3, -18, 2.5, -29, -3, -40, -13, -48, -27, -50], 6.2);
      horn([1.5, -30, 9, -43], 3.6);
      horn([-4.5, -41, -3, -56], 3.4);
      horn([-14, -48, -19, -60], 3);
      // 脑后再披几绺短鬣，把颅与颈的接缝盖住
      for (let k = 0; k < 5; k++) mark(ctx, strand(-19 + k * 0.6, -9 + k * 4.6, Math.PI + 0.3 - k * 0.13, 28 - Math.abs(k - 2) * 3, t * 4.4 + k * 1.1 + 2, 3, 0.02), taper(4.4), INK(k % 2 ? 0.32 : 0.56));
      ctx.restore();
    }
  };
})();
