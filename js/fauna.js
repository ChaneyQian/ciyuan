/* 墨韵 · fauna.js — 禽鸟虫鱼：鸟 燕 雁 莺 鹤 蝶 虫 鱼 龙 */
(function () {
  'use strict';
  const MS = window.MS, Kinds = MS.Kinds;
  const { clamp, lerp, ease, easeOut, brush, leafPath, softDot, noise1, TAU } = MS.util;

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

  /* ================= 鸟（一群，小如逗点） ================= */
  Kinds.birds = {
    z: 70, max: 4, zone: 'high',
    create(e, w) {
      e.b = [];
      for (let i = 0; i < 8; i++) e.b.push({ x: e.x + (e.rng() - 0.5) * 60, y: e.y + (e.rng() - 0.5) * 60, vx: (e.rng() - 0.5) * 160, vy: (e.rng() - 0.5) * 120, wa: e.rng() * TAU, ph: e.rng() * TAU, s: 0.8 + e.rng() * 0.5, d: i * 0.12 });
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
        limit(b, 46, 130);
        b.x += b.vx * dt; b.y += b.vy * dt; b.ph += dt * (9 + Math.hypot(b.vx, b.vy) * 0.05);
      }
      if (Math.random() < dt * 0.12) w.emit('birds');
    },
    draw(e, ctx, w) {
      ctx.strokeStyle = w.ink(0.86); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const b of e.b) {
        const g = ease((e.age - b.d) / 0.8);
        if (g <= 0) continue;
        const f = Math.sin(b.ph), s = 6.5 * b.s * g, dir = b.vx >= 0 ? 1 : -1, tilt = clamp(b.vy / 200, -0.5, 0.5);
        ctx.save(); ctx.translate(b.x, b.y); ctx.scale(dir, 1); ctx.rotate(tilt);
        ctx.lineWidth = 1.7 * b.s;
        ctx.beginPath();
        ctx.moveTo(-s * 0.9, -s * f * 0.9 - s * 0.2); ctx.quadraticCurveTo(-s * 0.3, -s * 0.3 * f, 0, 0);
        ctx.quadraticCurveTo(s * 0.5, -s * 0.5 * f - s * 0.2, s * 1.1, -s * f * 0.7);
        ctx.stroke();
        ctx.lineWidth = 2.4 * b.s;
        ctx.beginPath(); ctx.moveTo(-s * 0.2, s * 0.1); ctx.lineTo(s * 0.5, -s * 0.05); ctx.stroke();
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

  /* ================= 鱼 ================= */
  Kinds.fish = {
    z: 55, max: 4, zone: 'low',
    create(e, w) {
      e.b = [];
      const looks = ['ink', 'redhead', 'red', 'ink'];
      for (let i = 0; i < 3 + ((e.rng() * 2) | 0); i++) e.b.push({ x: e.x + (e.rng() - 0.5) * 60, y: e.y + (e.rng() - 0.5) * 40, a: e.rng() * TAU, sp: 40 + e.rng() * 30, n: e.rng() * 100, ph: e.rng() * 6, s: 0.8 + e.rng() * 0.5, look: looks[i % 4], d: i * 0.4, burst: 0 });
      w.emit('fish');
    },
    update(e, dt, w) {
      for (const b of e.b) {
        b.n += dt;
        let turn = (noise1(b.n * 0.5) - 0.5) * 2.4;
        // 回到画中、亲近同伴的池塘
        const hx = clamp(b.x, 80, w.W - 80), hy = clamp(b.y, w.H * 0.3, w.H - 70);
        if (hx !== b.x || hy !== b.y) { const want = Math.atan2(hy - b.y, hx - b.x); turn += Math.sin(want - b.a) * 3; }
        const dx = b.x - w.pointer.x, dy = b.y - w.pointer.y, d = Math.hypot(dx, dy);
        if (d < 110) { const away = Math.atan2(dy, dx); turn += Math.sin(away - b.a) * 7; b.burst = 1; }
        b.burst = Math.max(0, b.burst - dt * 1.2);
        b.a += turn * dt;
        const v = b.sp * (1 + b.burst * 2.4) * (0.75 + 0.25 * Math.sin(b.ph * 0.5));
        b.x += Math.cos(b.a) * v * dt; b.y += Math.sin(b.a) * v * dt;
        b.ph += dt * (5 + v * 0.07);
        if (Math.random() < dt * 5) w.stir(b.x, b.y, Math.cos(b.a) * v * 1.6, Math.sin(b.a) * v * 1.6, 20);
      }
      if (Math.random() < dt * 0.1) w.emit('fish');
    },
    draw(e, ctx, w) {
      for (const b of e.b) {
        const g = ease((e.age - b.d) / 1.2);
        if (g <= 0) continue;
        const S = 26 * b.s * g, ca = Math.cos(b.a), sa = Math.sin(b.a), pts = [], N = 7;
        for (let i = 0; i <= N; i++) {
          const u = i / N, back = (u - 0.25) * S * 1.9, lat = Math.sin(b.ph - u * 2.6) * S * 0.15 * u * u * 1.6;
          pts.push(b.x - ca * back + -sa * lat, b.y - sa * back + ca * lat);
        }
        const tx = pts[N * 2], ty = pts[N * 2 + 1], ta = Math.atan2(ty - pts[N * 2 - 1], tx - pts[N * 2 - 2]);
        const body = b.look === 'red' ? w.col('red', 0.82) : w.ink(0.8);
        // 鳍与尾
        ctx.fillStyle = b.look === 'red' ? w.col('orange', 0.55) : w.ink(0.42);
        ctx.beginPath();
        leafPath(ctx, tx, ty, ta + 0.42, S * 0.72, S * 0.2, 0.25); leafPath(ctx, tx, ty, ta - 0.42, S * 0.72, S * 0.2, -0.25);
        const fx = pts[4], fy = pts[5], fl = Math.sin(b.ph * 0.5) * 0.25;
        leafPath(ctx, fx, fy, b.a + 2.2 + fl, S * 0.46, S * 0.13, 0.2); leafPath(ctx, fx, fy, b.a - 2.2 - fl, S * 0.46, S * 0.13, -0.2);
        ctx.fill();
        ctx.fillStyle = body;
        brush(ctx, pts, (t) => S * 0.44 * Math.pow(Math.sin(Math.PI * Math.pow(clamp(t * 0.94 + 0.06, 0, 1), 0.62)), 0.85) + 1);
        if (b.look === 'redhead') softDot(ctx, pts[2], pts[3], S * 0.3, w.col('red', 0.9), w.col('red', 0));
      }
    }
  };

  /* ================= 龙 ================= */
  Kinds.dragon = {
    z: 75, single: true, zone: 'mid',
    respawn(e, x, y, w) { e.goal = { x, y, t: 3 }; w.emit('dragon'); },
    create(e, w) {
      e.S = clamp(Math.min(w.W, w.H) / 600, 0.85, 1.7);
      e.N = 50; e.gap = 11.5 * e.S;
      e.seg = [];
      const dir = e.x < w.W / 2 ? 1 : -1;
      for (let i = 0; i < e.N; i++) e.seg.push({ x: e.x - dir * i * e.gap * 0.2, y: e.y + i * 0.5 });
      e.a = dir > 0 ? 0 : Math.PI; e.v = 0; e.wt = e.rng() * 100;
      w.emit('dragon');
    },
    update(e, dt, w) {
      const h = e.seg[0];
      let tx, ty;
      e.wt += dt;
      if (e.goal && (e.goal.t -= dt) > 0) { tx = e.goal.x; ty = e.goal.y; }
      else if (w.pointer.moved < 4 && w.pointer.x > 0) { tx = w.pointer.x; ty = w.pointer.y; }
      else { tx = w.W * (0.5 + 0.36 * Math.sin(e.wt * 0.31)); ty = w.H * (0.45 + 0.27 * Math.sin(e.wt * 0.47 + 1)); }
      const dx = tx - h.x, dy = ty - h.y, d = Math.hypot(dx, dy);
      const want = Math.atan2(dy, dx) + Math.sin(e.wt * 2.6) * 0.5;
      let da = want - e.a; da = Math.atan2(Math.sin(da), Math.cos(da));
      e.a += clamp(da, -3.4 * dt, 3.4 * dt);
      const sp = clamp(d * 1.6, 70, 380) * e.S;
      e.v += (sp - e.v) * Math.min(1, dt * 2.5);
      h.x += Math.cos(e.a) * e.v * dt; h.y += Math.sin(e.a) * e.v * dt;
      for (let i = 1; i < e.N; i++) {
        const p = e.seg[i - 1], q = e.seg[i], ddx = q.x - p.x, ddy = q.y - p.y, dd = Math.hypot(ddx, ddy) || 1;
        q.x = p.x + (ddx / dd) * e.gap; q.y = p.y + (ddy / dd) * e.gap;
      }
      if (e.v > 60) {
        w.stir(h.x, h.y, Math.cos(e.a) * e.v * 2.2, Math.sin(e.a) * e.v * 2.2, 46 * e.S);
        const m = e.seg[(e.N * 0.5) | 0]; w.stir(m.x, m.y, Math.cos(e.a) * e.v, Math.sin(e.a) * e.v, 34 * e.S);
      }
      if (Math.random() < dt * 0.07) w.emit('dragon');
    },
    draw(e, ctx, w) {
      const S = e.S, N = e.N, seg = e.seg, g = ease(e.age / 2.2);
      const vis = Math.max(3, Math.round(N * g));
      const wd = (u) => (7 + 14 * Math.sin(Math.PI * Math.pow(u, 0.6))) * (u > 0.82 ? (1 - u) / 0.18 * 0.85 + 0.15 : 1) * S;
      const nx = [], ny = [];
      for (let i = 0; i < N; i++) {
        const a = seg[Math.max(0, i - 1)], b = seg[Math.min(N - 1, i + 1)], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
        nx.push(-dy / d); ny.push(dx / d);
      }
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      // 四足
      for (const [idx, ph] of [[8, 0], [10, Math.PI], [25, Math.PI], [27, 0]]) {
        if (idx >= vis) continue;
        const side = (idx === 8 || idx === 25) ? 1 : -1, p = seg[idx], hw = wd(idx / (N - 1)) * 0.5;
        const sw = Math.sin(w.t * 5 + ph) * 0.5 * clamp(e.v / 200, 0.15, 1);
        const bx = p.x + nx[idx] * hw * side, by = p.y + ny[idx] * hw * side;
        const tanx = -ny[idx], tany = nx[idx];   // 朝尾方向
        const kx = bx + (nx[idx] * side * 13 + tanx * (4 + sw * 9)) * S, ky = by + (ny[idx] * side * 13 + tany * (4 + sw * 9)) * S;
        const fx = kx + (nx[idx] * side * 7 - tanx * (9 + sw * 6)) * S, fy = ky + (ny[idx] * side * 7 - tany * (9 + sw * 6)) * S;
        ctx.strokeStyle = w.col('green', 0.92); ctx.lineWidth = 4.2 * S;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
        ctx.strokeStyle = w.ink(0.85); ctx.lineWidth = 1.1 * S;
        ctx.beginPath();
        for (let c = -1; c <= 1; c++) { const ca = Math.atan2(fy - ky, fx - kx) + c * 0.55; ctx.moveTo(fx, fy); ctx.lineTo(fx + Math.cos(ca) * 6.5 * S, fy + Math.sin(ca) * 6.5 * S); }
        ctx.stroke();
      }
      // 尾鳍
      if (vis >= N) {
        const t = seg[N - 1], ta = Math.atan2(t.y - seg[N - 3].y, t.x - seg[N - 3].x);
        for (let k = -2; k <= 2; k++) {
          ctx.fillStyle = w.col(k % 2 ? 'red' : 'green', 0.85);
          ctx.beginPath(); leafPath(ctx, t.x, t.y, ta + k * 0.3 + Math.sin(w.t * 3 + k) * 0.08, (26 - Math.abs(k) * 5) * S, 4.4 * S, k * 0.08); ctx.fill();
        }
      }
      // 背鳍
      ctx.fillStyle = w.col('red', 0.9);
      ctx.beginPath();
      for (let i = 3; i < vis - 2; i += 2) {
        const p = seg[i], hw = wd(i / (N - 1)) * 0.5 + 0.5, a = Math.atan2(ny[i], nx[i]);
        for (const side of [-1, 1]) leafPath(ctx, p.x + nx[i] * hw * side, p.y + ny[i] * hw * side, a + (side < 0 ? Math.PI : 0) + side * 0.7, 7.5 * S, 2.6 * S, 0);
      }
      ctx.fill();
      // 身
      const pts = [];
      for (let i = 0; i < vis; i++) pts.push(seg[i].x, seg[i].y);
      ctx.fillStyle = w.col('green', 0.95);
      brush(ctx, pts, (t) => wd(t * (vis - 1) / (N - 1)));
      ctx.fillStyle = w.col('red', 0.55);   // 脊线
      brush(ctx, pts, (t) => wd(t * (vis - 1) / (N - 1)) * 0.2);
      // 鳞
      ctx.strokeStyle = w.col('paper', 0.42); ctx.lineWidth = 0.9 * S;
      ctx.beginPath();
      for (let i = 2; i < vis - 3; i++) {
        const p = seg[i], hw = wd(i / (N - 1)) * 0.5, a = Math.atan2(-nx[i], ny[i]);   // 朝头方向
        for (const o of [-0.52, 0.52]) {
          const cx = p.x + nx[i] * hw * o, cy = p.y + ny[i] * hw * o, r = hw * 0.42;
          ctx.moveTo(cx + Math.cos(a - 1.3) * r, cy + Math.sin(a - 1.3) * r); ctx.arc(cx, cy, r, a - 1.3, a + 1.3);
        }
      }
      ctx.stroke();
      // 首
      const h = seg[0];
      ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(e.a); ctx.scale(S * 1.3, S * 1.3);
      const wv = Math.sin(w.t * 3.2);
      ctx.fillStyle = w.col('green', 0.7);                    // 鬣
      ctx.beginPath();
      for (let k = -3; k <= 3; k++) leafPath(ctx, -6, k * 2.6, Math.PI + k * 0.2 + wv * 0.07, 25 - Math.abs(k) * 3, 3, k * 0.06);
      ctx.fill();
      ctx.strokeStyle = w.col('yellow', 0.95); ctx.lineWidth = 2.1;   // 角
      ctx.beginPath();
      for (const s of [-1, 1]) { ctx.moveTo(-1, 6 * s); ctx.quadraticCurveTo(-12, 13 * s, -27, 12 * s); ctx.moveTo(-11, 11.5 * s); ctx.lineTo(-17, 19 * s); }
      ctx.stroke();
      ctx.strokeStyle = w.col('red', 0.9); ctx.lineWidth = 1.3;       // 须
      ctx.beginPath();
      for (const s of [-1, 1]) { ctx.moveTo(21, 4 * s); ctx.bezierCurveTo(30, (14 + wv * 4) * s, 8, (22 - wv * 5) * s, -12 + wv * 6, (30 + wv * 4) * s); }
      ctx.stroke();
      ctx.fillStyle = w.col('green', 1);                      // 颅与吻
      ctx.beginPath(); ctx.moveTo(-8, -9); ctx.quadraticCurveTo(4, -12, 12, -7); ctx.lineTo(25, -5.5); ctx.quadraticCurveTo(30, 0, 25, 5.5); ctx.lineTo(12, 7); ctx.quadraticCurveTo(4, 12, -8, 9); ctx.quadraticCurveTo(-12, 0, -8, -9); ctx.fill();
      ctx.fillStyle = w.col('red', 0.9);
      ctx.beginPath(); ctx.ellipse(24, 0, 3.2, 4.2, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = w.col('yellow', 1);                     // 目
      ctx.beginPath(); ctx.ellipse(8, -5.4, 2.4, 1.7, 0.35, 0, TAU); ctx.ellipse(8, 5.4, 2.4, 1.7, -0.35, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(16,14,12,1)';
      ctx.beginPath(); ctx.arc(8.9, -5.4, 0.9, 0, TAU); ctx.arc(8.9, 5.4, 0.9, 0, TAU); ctx.fill();
      ctx.restore();
    }
  };
})();
