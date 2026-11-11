/* 墨韵 · things.js — 器物：舟 楼 钟 鼓 剑 火 灯 */
(function () {
  'use strict';
  const MS = window.MS, Kinds = MS.Kinds;
  const { clamp, lerp, ease, easeOut, brush, leafPath, softDot, TAU } = MS.util;

  /* 墨圈：钟鼓之声在纸上荡开 */
  function rings(e, ctx, w, x, y, color) {
    for (const r of e.rings) {
      const u = r.a / r.life;
      ctx.strokeStyle = w.col(color || 'ink', 0.3 * (1 - u));
      ctx.lineWidth = 2.2 * (1 - u) + 0.4;
      ctx.beginPath(); ctx.ellipse(x, y, 14 + u * r.R, (14 + u * r.R) * 0.82, 0, 0, TAU); ctx.stroke();
    }
  }
  function tickRings(e, dt) { for (const r of e.rings) r.a += dt; if (e.rings.length && e.rings[0].a > e.rings[0].life) e.rings.shift(); }

  /* ================= 舟（孤舟蓑笠翁） ================= */
  Kinds.boat = {
    z: 56, max: 3, zone: 'low',
    create(e, w) { e.dir = e.x < w.W / 2 ? 1 : -1; e.wake = 0; w.emit('boat'); },
    update(e, dt, w) {
      e.x += e.dir * (9 + w.wind * e.dir * 10) * dt;
      if (e.x > w.W + 90) e.x = -90; if (e.x < -90) e.x = w.W + 90;
      e.wake -= dt;
      if (e.wake <= 0) { e.wake = 0.5; w.stir(e.x - e.dir * 30, e.y + 8, -e.dir * 50, 0, 30); }
      if (Math.random() < dt * 0.05) w.emit('boat');
    },
    draw(e, ctx, w) {
      const g = ease(e.age / 2.4), bob = Math.sin(w.t * 1.1 + e.seed) * 1.8;
      ctx.globalAlpha *= g;
      ctx.save(); ctx.translate(e.x, e.y + bob); ctx.scale(e.dir, 1); ctx.rotate(Math.sin(w.t * 0.9 + e.seed) * 0.02);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      // 倒影与水纹
      ctx.strokeStyle = w.ink(0.22); ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) { const yy = 9 + i * 5, hw = 46 - i * 8 + Math.sin(w.t * 1.4 + i) * 4; ctx.moveTo(-hw - i * 6, yy); ctx.lineTo(hw - i * 12, yy); }
      ctx.stroke();
      // 船身
      ctx.fillStyle = w.ink(0.84);
      ctx.beginPath(); ctx.moveTo(-46, -3); ctx.quadraticCurveTo(-30, 8, 0, 8); ctx.quadraticCurveTo(34, 8, 54, -8); ctx.quadraticCurveTo(30, 2, 0, 2); ctx.quadraticCurveTo(-28, 2, -46, -3); ctx.fill();
      // 篷
      ctx.fillStyle = w.ink(0.5);
      ctx.beginPath(); ctx.moveTo(-26, 2); ctx.quadraticCurveTo(-12, -22, 8, 2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = w.ink(0.7); ctx.lineWidth = 0.8;
      ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.moveTo(-22 + i * 7, 1); ctx.quadraticCurveTo(-16 + i * 5, -14 + Math.abs(i - 1.5) * 3, -12 + i * 5, -16 + Math.abs(i - 1.5) * 4); } ctx.stroke();
      // 蓑笠翁与钓竿
      ctx.fillStyle = w.ink(0.88);
      ctx.beginPath(); ctx.moveTo(22, 2); ctx.quadraticCurveTo(21, -12, 28, -13); ctx.quadraticCurveTo(35, -12, 34, 2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(19, -13); ctx.lineTo(28, -20); ctx.lineTo(38, -13); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = w.ink(0.8); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(32, -8); ctx.quadraticCurveTo(52, -30, 78, -26); ctx.stroke();
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(78, -26); ctx.lineTo(79 + Math.sin(w.t * 1.3) * 1.5, 8 - bob); ctx.stroke();
      ctx.restore();
    }
  };

  /* ================= 楼 ================= */
  Kinds.tower = {
    z: 28, max: 2, zone: 'land',
    create(e, w) { e.s = clamp(Math.min(w.W, w.H) / 820, 0.7, 1.35); w.emit('tower'); },
    draw(e, ctx, w) {
      const g = ease(e.age / 3.2), s = e.s;
      ctx.globalAlpha *= g;
      ctx.save(); ctx.translate(e.x, e.y + 78 * s + (1 - g) * 12); ctx.scale(s, s);
      const tiers = 3;
      // 台基
      ctx.fillStyle = w.ink(0.36);
      ctx.fillRect(-58, -8, 116, 8);
      ctx.fillStyle = w.ink(0.22);
      ctx.fillRect(-70, 0, 140, 5);
      let y = -8;
      for (let i = 0; i < tiers; i++) {
        const bw = 44 - i * 9, bh = 30 - i * 3, rw = bw + 26, rh = 13;
        // 楼身
        ctx.fillStyle = w.ink(0.3);
        ctx.fillRect(-bw, y - bh, bw * 2, bh);
        ctx.strokeStyle = w.ink(0.6); ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let c = 0; c <= 4; c++) { const x = -bw + (c / 4) * bw * 2; ctx.moveTo(x, y); ctx.lineTo(x, y - bh); }
        ctx.moveTo(-bw, y - bh * 0.3); ctx.lineTo(bw, y - bh * 0.3);
        ctx.stroke();
        // 窗：夜里有灯
        if (w.nightK > 0.05) {
          ctx.fillStyle = 'rgba(255,196,96,' + 0.75 * w.nightK * (0.85 + 0.15 * Math.sin(w.t * 3 + i)) + ')';
          for (let c = 0; c < 4; c++) { const x = -bw + (c / 4) * bw * 2; ctx.fillRect(x + 3, y - bh + 4, bw / 2 - 6, bh * 0.7 - 7); }
        }
        y -= bh;
        // 飞檐
        ctx.fillStyle = w.ink(0.82);
        ctx.beginPath();
        ctx.moveTo(-rw - 8, y - 3); ctx.quadraticCurveTo(-rw + 6, y + 2, -bw * 0.5, y - rh * 0.55);
        ctx.lineTo(-bw * 0.72, y - rh); ctx.lineTo(bw * 0.72, y - rh); ctx.lineTo(bw * 0.5, y - rh * 0.55);
        ctx.quadraticCurveTo(rw - 6, y + 2, rw + 8, y - 3);
        ctx.quadraticCurveTo(rw - 8, y + 5, 0, y + 4); ctx.quadraticCurveTo(-rw + 8, y + 5, -rw - 8, y - 3);
        ctx.fill();
        y -= rh;
      }
      // 宝顶
      ctx.fillStyle = w.ink(0.85);
      ctx.beginPath(); ctx.moveTo(-18, y + 1); ctx.quadraticCurveTo(-4, y - 6, 0, y - 22); ctx.quadraticCurveTo(4, y - 6, 18, y + 1); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  };

  /* ================= 钟 ================= */
  Kinds.bell = {
    z: 64, max: 2, zone: 'high',
    create(e, w) { e.rings = []; e.next = 0.2; e.swing = 0; },
    update(e, dt, w) {
      e.next -= dt;
      if (e.next <= 0) {
        e.next = 9 + Math.random() * 7;
        e.swing = 1;
        e.rings.push({ a: 0, life: 3.4, R: 190 }); e.rings.push({ a: -0.3, life: 3.4, R: 190 });
        for (let a = 0; a < 6; a++) w.stir(e.x, e.y + 20, Math.cos(a * 1.047) * 260, Math.sin(a * 1.047) * 260, 70);
        w.emit('bell', { x: e.x });
      }
      e.swing *= Math.exp(-dt * 0.9);
      tickRings(e, dt);
    },
    draw(e, ctx, w) {
      const g = ease(e.age / 1.8);
      ctx.globalAlpha *= g;
      rings(e, ctx, w, e.x, e.y + 20, 'green');
      ctx.save(); ctx.translate(e.x, e.y - 30);
      // 架
      ctx.strokeStyle = w.ink(0.8); ctx.lineWidth = 3.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(34, 0); ctx.stroke();
      ctx.rotate(Math.sin(w.t * 5.2) * 0.12 * e.swing);
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 12); ctx.stroke();
      // 钟体（合瓦形，于口上弧）
      const gr = ctx.createLinearGradient(-24, 0, 24, 0);
      gr.addColorStop(0, w.col('green', 0.95)); gr.addColorStop(0.45, w.col('leaf', 0.8)); gr.addColorStop(1, w.col('green', 0.98));
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.moveTo(-14, 12); ctx.lineTo(14, 12); ctx.quadraticCurveTo(20, 40, 27, 66); ctx.quadraticCurveTo(0, 52, -27, 66); ctx.quadraticCurveTo(-20, 40, -14, 12); ctx.fill();
      ctx.strokeStyle = w.ink(0.7); ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = w.ink(0.55);     // 枚
      ctx.beginPath();
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) for (const s of [-1, 1]) { const x = s * (5 + c * 4.6 + r * 0.9), y = 20 + r * 8; ctx.moveTo(x + 1.3, y); ctx.arc(x, y, 1.3, 0, TAU); }
      ctx.fill();
      ctx.restore();
    }
  };

  /* ================= 鼓 ================= */
  Kinds.drum = {
    z: 64, max: 2, zone: 'ground',
    create(e, w) { e.rings = []; e.next = 0.3; e.hit = 0; e.queue = []; },
    update(e, dt, w) {
      e.next -= dt;
      if (e.next <= 0) { e.next = 8 + Math.random() * 6; e.queue = [0, 0.42, 0.63, 1.05]; e.qt = 0; }
      if (e.queue.length) {
        e.qt += dt;
        while (e.queue.length && e.qt >= e.queue[0]) {
          e.queue.shift(); e.hit = 1;
          e.rings.push({ a: 0, life: 1.4, R: 150 });
          for (let a = 0; a < 8; a++) w.stir(e.x, e.y, Math.cos(a * 0.785) * 520, Math.sin(a * 0.785) * 520, 54);
          w.emit('drum', { x: e.x, last: e.queue.length === 0 });
        }
      }
      e.hit *= Math.exp(-dt * 9);
      tickRings(e, dt);
    },
    draw(e, ctx, w) {
      const g = ease(e.age / 1.6);
      ctx.globalAlpha *= g;
      rings(e, ctx, w, e.x, e.y, 'red');
      ctx.save(); ctx.translate(e.x, e.y + 6); ctx.scale(1 + e.hit * 0.05, 1 - e.hit * 0.05);
      // 架
      ctx.strokeStyle = w.ink(0.82); ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-22, 16); ctx.lineTo(-32, 44); ctx.moveTo(22, 16); ctx.lineTo(32, 44); ctx.moveTo(-28, 34); ctx.lineTo(28, 34); ctx.stroke();
      // 鼓身
      const gr = ctx.createLinearGradient(-34, 0, 34, 0);
      gr.addColorStop(0, w.col('red', 0.95)); gr.addColorStop(0.5, w.col('orange', 0.85)); gr.addColorStop(1, w.col('red', 0.98));
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.moveTo(-30, -14); ctx.quadraticCurveTo(-40, 3, -30, 20); ctx.lineTo(30, 20); ctx.quadraticCurveTo(40, 3, 30, -14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = w.col('yellow', 0.95);   // 鼓钉
      ctx.beginPath();
      for (let i = 0; i < 9; i++) { const x = -28 + i * 7; ctx.moveTo(x + 1.5, -9); ctx.arc(x, -9, 1.5, 0, TAU); ctx.moveTo(x + 1.5, 15); ctx.arc(x, 15, 1.5, 0, TAU); }
      ctx.fill();
      ctx.fillStyle = w.col('white', 0.95); ctx.strokeStyle = w.ink(0.6); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(0, -14, 30, 8 - e.hit * 2, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  };

  /* ================= 剑（一道墨光） ================= */
  Kinds.sword = {
    z: 84, life: 2.4, max: 4, zone: 'mid',
    create(e, w) {
      const a = (e.rng() < 0.5 ? -1 : 1) * (0.3 + e.rng() * 0.4) + (e.rng() < 0.5 ? Math.PI : 0), L = clamp(w.W * 0.3, 240, 520);
      e.ax = e.x - Math.cos(a) * L; e.ay = e.y - Math.sin(a) * L; e.bx = e.x + Math.cos(a) * L; e.by = e.y + Math.sin(a) * L;
      e.ca = Math.cos(a); e.sa = Math.sin(a); e.done = 0;
      e.dry = []; for (let i = 0; i < 6; i++) e.dry.push({ o: (e.rng() - 0.5) * 9, a: e.rng() * 0.3, b: 0.6 + e.rng() * 0.4 });
      w.emit('sword', { x: e.x });
    },
    update(e, dt, w) {
      const p0 = e.done, p1 = Math.min(1, e.age / 0.2);
      for (let p = p0; p < p1; p += 0.07) {
        const x = lerp(e.ax, e.bx, p), y = lerp(e.ay, e.by, p);
        w.fluid.splat(x, y, e.ca * 2600, e.sa * 2600, [0.1, 0, 0], 20);
      }
      e.done = p1;
    },
    draw(e, ctx, w) {
      const p = Math.min(1, e.age / 0.2), a = clamp(1 - (e.age - 0.3) / 1.9, 0, 1);
      const x1 = lerp(e.ax, e.bx, p), y1 = lerp(e.ay, e.by, p);
      ctx.fillStyle = w.ink(0.85 * a);
      brush(ctx, [e.ax, e.ay, (e.ax + x1) / 2, (e.ay + y1) / 2, x1, y1], (t) => 10 * Math.sin(Math.PI * Math.pow(t, 0.7)) + 0.5);
      // 飞白
      ctx.strokeStyle = w.col('paper', 0.8 * a); ctx.lineWidth = 0.9;
      ctx.beginPath();
      for (const d of e.dry) {
        if (d.a > p) continue;
        const b = Math.min(p, d.b);
        ctx.moveTo(lerp(e.ax, e.bx, d.a) - e.sa * d.o, lerp(e.ay, e.by, d.a) + e.ca * d.o);
        ctx.lineTo(lerp(e.ax, e.bx, b) - e.sa * d.o, lerp(e.ay, e.by, b) + e.ca * d.o);
      }
      ctx.stroke();
      if (e.age < 0.34) {   // 剑锋一点寒光
        softDot(ctx, x1, y1, 26, w.col('white', 0.9 * (1 - e.age / 0.34)), w.col('white', 0));
      }
    }
  };

  /* ================= 火 ================= */
  Kinds.fire = {
    z: 66, max: 3, life: 90, zone: 'ground',
    create(e, w) { e.p = []; e.smoke = 0; w.emit('fire'); },
    update(e, dt, w) {
      const k = clamp((e.life - e.age) / 6, 0, 1) * ease(e.age / 1.2) * e.fade;
      e.k = k;
      const rate = 62 * k;
      for (let i = 0; i < rate * dt + (Math.random() < (rate * dt) % 1 ? 1 : 0); i++) {
        if (e.p.length > 90) break;
        e.p.push({ x: e.x + (Math.random() - 0.5) * 26, y: e.y + 4, vx: (Math.random() - 0.5) * 26, vy: -(60 + Math.random() * 100), a: 0, life: 0.5 + Math.random() * 0.7, r: 9 + Math.random() * 11 });
      }
      for (const p of e.p) { p.a += dt; p.x += (p.vx + w.wind * 90 + Math.sin(p.a * 9 + p.r) * 16) * dt; p.y += p.vy * dt; p.vx *= 1 - dt * 2; }
      e.p = e.p.filter((p) => p.a < p.life);
      e.smoke -= dt;
      if (e.smoke <= 0 && k > 0.1) { e.smoke = 0.12; w.fluid.splat(e.x + (Math.random() - 0.5) * 16, e.y - 30, w.wind * 200, -520, [0.03, 0.012, 0], 26); }
      if (Math.random() < dt * 5 * k) w.emit('crackle');
    },
    draw(e, ctx, w) {
      const k = e.k || 0, nk = w.nightK, fl = 0.85 + 0.15 * Math.sin(w.t * 17) * Math.sin(w.t * 7.3);
      softDot(ctx, e.x, e.y - 20, lerp(120, 260, nk) * fl, 'rgba(255,150,60,' + lerp(0.12, 0.3, nk) * k + ')', 'rgba(255,120,40,0)');
      // 柴
      ctx.strokeStyle = w.ink(0.85); ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(e.x - 22, e.y + 10); ctx.lineTo(e.x + 16, e.y + 2); ctx.moveTo(e.x + 22, e.y + 10); ctx.lineTo(e.x - 16, e.y + 2); ctx.moveTo(e.x - 6, e.y + 12); ctx.lineTo(e.x + 8, e.y - 2); ctx.stroke();
      ctx.save();
      if (nk > 0.5) ctx.globalCompositeOperation = 'lighter';
      for (const p of e.p) {
        const u = p.a / p.life, r = p.r * (1 - u * 0.75), a = (1 - u) * (nk > 0.5 ? 0.5 : 0.62);
        const c0 = u < 0.3 ? '255,226,130' : u < 0.62 ? '250,140,44' : '206,48,30';
        softDot(ctx, p.x, p.y, r, 'rgba(' + c0 + ',' + a + ')', 'rgba(' + c0 + ',0)');
      }
      ctx.restore();
    }
  };

  /* ================= 灯（孔明灯三盏） ================= */
  Kinds.lantern = {
    z: 67, max: 4, zone: 'mid',
    create(e, w) {
      e.L = [];
      for (let i = 0; i < 3; i++) e.L.push({ x: e.x + (i - 1) * (36 + e.rng() * 30), y: e.y + i * 12 + e.rng() * 20, hy: w.H * (0.1 + e.rng() * 0.28), s: 0.8 + e.rng() * 0.5, ph: e.rng() * TAU, d: i * 0.7 });
      w.emit('lantern');
    },
    update(e, dt, w) {
      for (const l of e.L) {
        if (e.age < l.d) continue;
        if (l.y > l.hy) l.y -= (12 + 8 * l.s) * dt;
        l.x += (Math.sin(w.t * 0.4 + l.ph) * 6 + w.wind * 26) * dt;
        if (l.x < -40) l.x = w.W + 40; if (l.x > w.W + 40) l.x = -40;
      }
    },
    draw(e, ctx, w) {
      const nk = w.nightK;
      for (const l of e.L) {
        const g = ease((e.age - l.d) / 1.4);
        if (g <= 0) continue;
        const fl = 0.86 + 0.14 * Math.sin(w.t * 9 + l.ph * 3), s = 15 * l.s * g, y = l.y + Math.sin(w.t * 0.8 + l.ph) * 3;
        softDot(ctx, l.x, y, s * lerp(2.6, 5.5, nk), 'rgba(255,170,80,' + lerp(0.16, 0.34, nk) * fl * g + ')', 'rgba(255,150,60,0)');
        ctx.save(); ctx.translate(l.x, y); ctx.rotate(Math.sin(w.t * 0.6 + l.ph) * 0.06);
        const gr = ctx.createLinearGradient(0, -s * 1.3, 0, s);
        gr.addColorStop(0, w.col('red', 0.9 * g)); gr.addColorStop(0.7, w.col('orange', 0.92 * g)); gr.addColorStop(1, 'rgba(255,224,150,' + 0.96 * g + ')');
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.moveTo(-s * 0.55, s); ctx.quadraticCurveTo(-s * 1.05, -s * 0.2, -s * 0.62, -s * 1.15); ctx.quadraticCurveTo(0, -s * 1.5, s * 0.62, -s * 1.15); ctx.quadraticCurveTo(s * 1.05, -s * 0.2, s * 0.55, s); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = w.ink(0.45 * g); ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(-s * 0.55, s); ctx.lineTo(s * 0.55, s); ctx.moveTo(0, -s * 1.3); ctx.quadraticCurveTo(-s * 0.25, 0, 0, s); ctx.stroke();
        ctx.restore();
      }
    }
  };
})();
