/* 词源 · wanxiang.js — 万象：再从《声律启蒙》里请出一批物象
 *   虎 牛 · 海 · 凤 鹭 · 蜂 虾 · 琴 书 笔 茶 笛 香 · 露
 * （城、猿借手卷里的画法，在 extras.js；叶与梅、花同根，在 flora.js）
 *
 * 画法走大写意一路：没骨——不勾轮廓，一笔淡墨是一块体积，墨在要紧处积浓；
 * 线只留给最有精神的地方（虾须、虎纹、牛角），用钉头鼠尾或枯笔。
 * 齐白石的虾：头胸一笔淡墨、当中压一点浓墨是虾脑，腹五节一节一笔，须长而劲。
 * 李可染的牛：浓墨一团是身子，背上坐一个吹笛的牧童。
 */
(function () {
  'use strict';
  const MS = window.MS, Kinds = MS.Kinds;
  const { clamp, lerp, ease, easeOut, softDot, leafPath, noise1, brushPath, TAU } = MS.util;
  const { mark, strand, swell, taper, nail, orchid, wet, dry, dense } = MS.ink;
  const R = Math.random;
  /* 一笔没骨：只铺一块墨（或颜色），不留水痕 */
  const blot = (ctx, pts, wf, color) => { if (brushPath(ctx, pts, wf, null, null, true)) { ctx.fillStyle = color; ctx.fill(); return true; } return false; };

  /* ================= 虾（齐白石式） ================= */
  function shrimp(ctx, w, q) {
    const k = q.tone, curl = 0.16 + 0.12 * Math.sin(q.ph) + q.flick * 0.5;
    ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.a); ctx.scale(q.sc, q.sc);
    // 须：六根，长而劲，各有各的弧度
    ctx.strokeStyle = w.ink(0.72); ctx.lineWidth = 0.9; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const side = i % 2 ? 1 : -1, r = i >> 1, len = 72 + r * 26, sw = Math.sin(q.ph * 0.8 + i) * 8;
      ctx.moveTo(18, side * 2);
      ctx.quadraticCurveTo(18 + len * 0.55, side * (8 + r * 18) + sw, 18 + len * (r === 2 ? -0.25 : 0.92), side * (26 + r * 30) + sw * 2);
    }
    ctx.stroke();
    // 钳：两臂三折，末了一夹
    for (const side of [-1, 1]) {
      const p = [10, side * 5, 30, side * 16, 50, side * 12, 66, side * 17 + Math.sin(q.ph + side) * 3];
      mark(ctx, p, (t) => 3.6 - 1.6 * t, w.ink(0.5));
      mark(ctx, [p[6], p[7], p[6] + 12, p[7] - 2.5], taper(2.6), w.ink(0.86)); mark(ctx, [p[6], p[7], p[6] + 11, p[7] + 3.5], taper(2.2), w.ink(0.86));
    }
    // 步足
    ctx.strokeStyle = w.ink(0.5); ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) for (const side of [-1, 1]) { const bx = 4 - i * 6; ctx.moveTo(bx, side * 5); ctx.lineTo(bx + 4 + Math.sin(q.ph * 2 + i) * 3, side * 15); }
    ctx.stroke();
    // 腹：五节，一节一笔淡墨，叠着往后弯；尾扇三片
    let px = -20, py = 0, ang = Math.PI;
    const segs = [];
    for (let j = 0; j < 5; j++) { ang += curl; const len = 12.5 - j * 1.1, nx = px + Math.cos(ang) * len, ny = py + Math.sin(ang) * len; segs.push([px, py, nx, ny, 15 - j * 2.1]); px = nx; py = ny; }
    for (let j = 4; j >= 0; j--) { const g = segs[j]; wet(ctx, [g[0], g[1], (g[0] + g[2]) / 2, (g[1] + g[3]) / 2, g[2], g[3]], (t) => g[4] * (0.8 + 0.2 * Math.sin(Math.PI * t)), w, 0.36 * k, 0.2 * k); }
    ctx.fillStyle = w.ink(0.42 * k);
    ctx.beginPath(); for (let j = -1; j <= 1; j++) leafPath(ctx, px, py, ang + j * 0.55, 13, 4, 0); ctx.fill();
    // 头胸：一笔淡墨，当中压一笔浓墨（虾脑），额剑一挑
    wet(ctx, [16, 0, 2, 0, -22, 0], (t) => 8 + 10 * Math.sin(Math.PI * Math.pow(t, 0.8)), w, 0.4 * k, 0.3 * k);
    mark(ctx, [12, 0, -2, 0.6, -15, 0], (t) => 6 * Math.sin(Math.PI * t) + 0.5, w.ink(0.88));
    mark(ctx, [14, 0, 24, 0, 33, -1], taper(2.2), w.ink(0.8));
    // 眼：横出两点
    mark(ctx, [12, -4, 14, -11], () => 2.4, w.ink(0.94)); mark(ctx, [12, 4, 14, 11], () => 2.4, w.ink(0.94));
    ctx.restore();
  }
  Kinds.shrimp = {
    z: 56, max: 3, zone: 'low',
    create(e) {
      e.s = [];
      const n = 4 + ((e.rng() * 2) | 0);
      for (let i = 0; i < n; i++) e.s.push({ x: e.x + (e.rng() - 0.5) * 280, y: e.y + (e.rng() - 0.5) * 120, a: e.rng() * TAU, sc: 0.72 + e.rng() * 0.5, ph: e.rng() * TAU, flick: 0, turn: (e.rng() - 0.5) * 0.4, tone: 0.8 + e.rng() * 0.35 });
    },
    update(e, dt, w) {
      for (const q of e.s) {
        q.ph += dt * 2; q.flick = Math.max(0, q.flick - dt * 2.2);
        if (R() < dt * 0.12) { q.flick = 1; q.turn = (R() - 0.5) * 1.2; w.stir(q.x, q.y, -Math.cos(q.a) * 160, -Math.sin(q.a) * 160, 30); }   // 一弹：倒退着窜出去
        q.a += q.turn * dt * (0.4 + q.flick);
        const sp = 14 * (1 - q.flick) - 150 * q.flick * q.flick;
        q.x += Math.cos(q.a) * sp * dt; q.y += Math.sin(q.a) * sp * dt * 0.6;
        const dx = e.x - q.x, dy = e.y - q.y;
        if (Math.hypot(dx, dy) > 200) { let d = Math.atan2(dy, dx) - q.a; d = Math.atan2(Math.sin(d), Math.cos(d)); q.a += d * dt * 1.2; }
      }
    },
    draw(e, ctx, w) { ctx.globalAlpha *= ease(e.age / 2); for (const q of e.s) shrimp(ctx, w, q); }
  };

  /* ================= 虎：踞坐回首。淡赭晕染作身（没骨，不勾边），浓墨枯笔写纹，面上只提眉、眼、鼻、须几笔 ================= */
  Kinds.tiger = {
    z: 59, max: 2, zone: 'ground',
    create(e, w) { e.dir = e.x < w.W / 2 ? 1 : -1; e.s = 1.2 + e.rng() * 0.2; e.ph = e.rng() * TAU; },
    draw(e, ctx, w) {
      const g = ease(e.age / 2.4), t = w.t + e.ph;
      const Y = (a) => w.col('yellow', a), O = (a) => w.col('orange', a), INK = (a) => w.ink(a), PA = (a) => w.col('paper', a);
      ctx.globalAlpha *= g;
      ctx.save(); ctx.translate(e.x, e.y + 62); ctx.scale(e.s * e.dir, e.s);
      ctx.save(); ctx.scale(1, 0.3); softDot(ctx, 0, 0, 90, INK(0.16), INK(0)); ctx.restore();
      // 尾：一条长弧，梢上卷起，黑节相间
      const tail = strand(-62, -22, Math.PI * 1.05, 74, t * 1.4, 9, -0.5);
      blot(ctx, tail, (u) => 10 - 3 * u, Y(0.4));
      for (let i = 1; i < 7; i++) mark(ctx, [tail[i * 2] - 3, tail[i * 2 + 1] - 5, tail[i * 2] + 2, tail[i * 2 + 1] + 5], nail(4), INK(0.86));
      softDot(ctx, tail[14], tail[15], 7, INK(0.9), INK(0.2));
      // 身：一笔淡赭，里头积一点橙、一点墨；腹下留白
      if (blot(ctx, [-66, -22, -48, -46, -10, -52, 26, -50, 40, -40], (u) => 50 - 12 * Math.sin(Math.PI * u), Y(0.36))) {
        ctx.save(); ctx.clip();
        softDot(ctx, -44, -44, 40, O(0.3), O(0)); softDot(ctx, 24, -52, 36, O(0.26), O(0));
        softDot(ctx, -52, -12, 34, INK(0.26), INK(0)); softDot(ctx, -6, -22, 34, PA(0.7), PA(0));
        ctx.restore();
      }
      blot(ctx, [-54, -30, -62, -8, -40, -2], (u) => 30 - 14 * u, Y(0.4));                       // 后腿蹲着
      mark(ctx, [-70, -26, -64, -6, -44, 0], orchid(2), INK(0.5));
      for (const [fx, d] of [[24, 0], [42, 2]]) {                                                  // 前腿撑地
        blot(ctx, [fx, -40, fx + 2, -18, fx + 3 + d, 0], (u) => 18 - 6 * u, Y(0.42));
        mark(ctx, [fx - 7, -30, fx - 6, -10, fx - 5, -1], orchid(1.6), INK(0.46));
        mark(ctx, [fx - 6, 0, fx + 3, -3, fx + 13, 0], nail(5), INK(0.74));
      }
      mark(ctx, [-66, -6, -52, -2, -36, -3], nail(5), INK(0.74));
      mark(ctx, [-64, -44, -40, -70, -6, -76, 24, -74], nail(3), INK(0.5));                       // 脊背一笔
      // 纹：浓墨，起笔重，往腹下枯
      for (let i = 0; i < 11; i++) {
        const u = i / 10, bx = lerp(-60, 34, u) + Math.sin(i * 1.7) * 3, top = -70 + Math.abs(u - 0.45) * 24;
        const st = [bx, top, bx + 5 + Math.sin(i * 2.3) * 3, top + 13 + (i % 3) * 3, bx - 1 + Math.cos(i) * 4, top + 26 + (i % 2) * 6];
        mark(ctx, st, nail(4.4 + (i % 2)), INK(0.88));
        dry(ctx, dense(st, 3), (v) => 6 * v, INK(0.6), 3, i + 2);
      }
      // 头：回过来看人
      ctx.save(); ctx.translate(46, -74 + Math.sin(t * 0.8) * 1.2); ctx.rotate(Math.sin(t * 0.5) * 0.04);
      softDot(ctx, 0, 0, 34, Y(0.62), Y(0.0)); softDot(ctx, 0, -6, 22, O(0.3), O(0)); softDot(ctx, 0, 11, 15, PA(0.9), PA(0));
      for (let q = 0; q < 12; q++) {                                                               // 腮毛：枯笔一圈
        const a = 0.5 + (q / 11) * (Math.PI - 1) + (q % 2) * 0.08, r0 = 20, r1 = 30 + (q % 3) * 3;
        for (const sd of [-1, 1]) { const ca = Math.cos(a) * sd, sa = Math.sin(a); mark(ctx, [ca * r0, sa * r0 - 4, ca * r1, sa * r1 - 2], taper(2.4), q % 3 ? Y(0.6) : INK(0.6)); }
      }
      for (const sd of [-1, 1]) {
        softDot(ctx, sd * 19, -20, 9, Y(0.7), Y(0)); mark(ctx, [sd * 13, -19, sd * 19, -28, sd * 26, -20], nail(3), INK(0.84));   // 耳
        mark(ctx, [sd * 3.4, -7.4, sd * 9.6, -10.6, sd * 17, -6.6], nail(3), INK(0.92));                                           // 眉骨：一笔浓墨压着眼
        ctx.fillStyle = w.col('cream', 0.95); ctx.beginPath(); ctx.ellipse(sd * 10, -4.4, 4.4, 2.5, sd * 0.3, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(22,20,18,0.96)'; ctx.beginPath(); ctx.ellipse(sd * 10.2, -4.4, 1.3, 2.4, 0, 0, TAU); ctx.fill();
        mark(ctx, [sd * 5.4, -3.4, sd * 10, -1.6, sd * 15, -4], taper(1.2), INK(0.8));
        for (let q = 0; q < 3; q++) mark(ctx, [sd * 21, -6 + q * 6, sd * 30, -8 + q * 7], nail(3), INK(0.86));                     // 颊纹
        ctx.strokeStyle = INK(0.6); ctx.lineWidth = 0.7; ctx.beginPath();
        for (let q = 0; q < 3; q++) { ctx.moveTo(sd * 8, 10 + q * 2); ctx.quadraticCurveTo(sd * 20, 8 + q * 3, sd * 32, 4 + q * 6); } ctx.stroke();   // 须
      }
      ctx.fillStyle = INK(0.92); ctx.beginPath(); ctx.moveTo(-4, 3.4); ctx.lineTo(4, 3.4); ctx.lineTo(0, 8); ctx.closePath(); ctx.fill();
      mark(ctx, [0, 8, -5, 13.4, -11, 11], taper(1.8), INK(0.82)); mark(ctx, [0, 8, 5, 13.4, 11, 11], taper(1.8), INK(0.82));
      mark(ctx, [0, -3, 0, 3], taper(1.4), INK(0.5));
      for (let q = 0; q < 3; q++) mark(ctx, [-6.4 + q, -22 + q * 4.6, 0, -23.6 + q * 4.6, 6.4 - q, -22 + q * 4.6], nail(2.4), INK(0.9));  // 王
      mark(ctx, [0, -23, 0, -11], nail(2.2), INK(0.9));
      ctx.restore();
      ctx.restore();
    }
  };

  /* ================= 牛（李可染式）：浓墨一团是牛，背上坐着吹笛的牧童 ================= */
  Kinds.ox = {
    z: 58, max: 2, zone: 'ground',
    create(e, w) { e.dir = e.x < w.W / 2 ? 1 : -1; e.s = 1.15; e.ph = e.rng() * 6; e.next = 4 + e.rng() * 4; },
    update(e, dt, w) {
      e.x += e.dir * 11 * dt; if (e.x > w.W + 170) e.x = -170; if (e.x < -170) e.x = w.W + 170;
      e.next -= dt; if (e.next <= 0) { e.next = 11 + R() * 8; w.emit('song', { name: 'flute' }); }
    },
    draw(e, ctx, w) {
      const t = w.t + e.ph, INK = (a) => w.ink(a), walk = Math.sin(t * 2.2);
      ctx.globalAlpha *= ease(e.age / 2);
      ctx.save(); ctx.translate(e.x, e.y + 60 + Math.abs(walk) * 1.2); ctx.scale(e.s * e.dir, e.s);
      ctx.save(); ctx.scale(1, 0.3); softDot(ctx, 0, 0, 86, INK(0.16), INK(0)); ctx.restore();
      for (const [lx, ph, far] of [[-34, 2, 1], [30, 3.4, 1], [-24, 0, 0], [40, 1.2, 0]]) {      // 四条短腿
        const sw = Math.sin(t * 2.2 + ph) * 7;
        blot(ctx, [lx, -36, lx + sw * 0.4, -16, lx + sw, 0], (u) => 15 - 6 * u, INK(far ? 0.5 : 0.84));
      }
      mark(ctx, strand(-58, -58, Math.PI * 0.62, 40, t * 2, 5, 0.2), taper(4), INK(0.8));        // 尾
      // 身：一大团浓墨，背脊与腹下墨色不匀
      if (blot(ctx, [-62, -50, -40, -62, -8, -58, 26, -60, 48, -52], (u) => 50 - 8 * Math.sin(Math.PI * u), INK(0.8))) {
        ctx.save(); ctx.clip(); softDot(ctx, -6, -84, 40, w.col('paper', 0.26), w.col('paper', 0)); softDot(ctx, 10, -30, 40, INK(0.3), INK(0)); ctx.restore();
      }
      dry(ctx, dense([-60, -34, -30, -26, 10, -26, 44, -34], 4), () => 12, INK(0.5), 5, 4);       // 腹下几丝枯笔
      // 颈、头：低着，往前探
      blot(ctx, [44, -58, 62, -52, 76, -40], (u) => 34 - 12 * u, INK(0.84));
      blot(ctx, [72, -44, 86, -36, 96, -24], (u) => 22 - 8 * u, INK(0.86));
      mark(ctx, [70, -54, 78, -72, 96, -76], nail(5.4), INK(0.92)); mark(ctx, [78, -50, 92, -62, 108, -58], nail(5), INK(0.9));   // 一对弯角
      ctx.fillStyle = INK(0.86); ctx.beginPath(); leafPath(ctx, 68, -46, Math.PI * 0.85, 16, 5, 0.2); ctx.fill();               // 耳
      ctx.fillStyle = w.col('paper', 0.95); ctx.beginPath(); ctx.arc(84, -38, 2.2, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(20,18,16,1)'; ctx.beginPath(); ctx.arc(84.4, -38, 1.1, 0, TAU); ctx.fill();
      softDot(ctx, 96, -24, 6, w.col('paper', 0.4), w.col('paper', 0));
      // 牧童：侧坐，横笛
      ctx.save(); ctx.translate(-6, -80); ctx.rotate(Math.sin(t * 1.1) * 0.03);
      blot(ctx, [-8, 2, 2, -4, 16, 4, 22, 14], (u) => 13 - 4 * u, w.col('blue', 0.5));                                           // 短裤的腿
      ctx.fillStyle = w.col('white', 0.94); ctx.beginPath(); ctx.moveTo(-9, 2); ctx.quadraticCurveTo(-12, -22, -2, -28); ctx.lineTo(8, -26); ctx.quadraticCurveTo(12, -8, 9, 3); ctx.closePath(); ctx.fill();
      mark(ctx, [-9, 2, -11, -16, -2, -28], nail(2.2), INK(0.7)); mark(ctx, [8, -26, 11, -10, 9, 3], orchid(1.6), INK(0.5));
      ctx.fillStyle = w.col('white', 0.98); ctx.beginPath(); ctx.arc(4, -37, 9, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(34,30,28,0.7)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(4, -37, 9, -0.6, 1.9); ctx.stroke();
      ctx.fillStyle = INK(0.92);                                                                                                 // 两个抓髻
      ctx.beginPath(); ctx.arc(-3, -44, 5.4, 0, TAU); ctx.arc(9, -46.4, 4.6, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(2.4, -42, 9, 4.6, -0.2, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(34,30,28,0.9)'; ctx.beginPath(); ctx.arc(8.6, -37, 0.9, 0, TAU); ctx.fill();
      mark(ctx, [0, -22, 12, -24, 18, -31], (u) => 6 - 2 * u, w.col('white', 0.94)); mark(ctx, [0, -22, 12, -24, 18, -31], orchid(1.3), INK(0.5));
      mark(ctx, [6, -33, 38, -27], () => 2.4, w.col('leaf', 0.9)); mark(ctx, [6, -33, 38, -27], () => 0.8, INK(0.6));             // 笛
      mark(ctx, strand(38, -27, Math.PI / 2 + 0.3, 12, t * 3, 2, 0), taper(2.4), w.col('red', 0.8));
      ctx.restore();
      ctx.restore();
    }
  };

  /* ================= 海：一排排浪头卷过来，浪花是留白 ================= */
  Kinds.sea = {
    z: 41, max: 2, zone: 'low',
    create(e, w) { e.half = clamp(w.W * 0.36, 280, 760); e.tk = 0; w.dye(e.x, e.y + 30, [0.05, 0, 0.2], 120); },
    update(e, dt, w) { e.tk -= dt; if (e.tk <= 0) { e.tk = 0.2; w.stir(e.x + (R() - 0.5) * e.half * 1.6, e.y + R() * 110, -170, (R() - 0.5) * 40, 70); } },
    draw(e, ctx, w) {
      const g = ease(e.age / 3), wi = w.sea['冬'];
      ctx.save(); ctx.translate(e.x, e.y + 60); ctx.scale(1, 0.34); softDot(ctx, 0, 0, e.half * 1.1, w.col('blue', 0.2 * g), w.col('blue', 0)); ctx.restore();
      for (let r = 0; r < 5; r++) {
        const y = e.y + r * 27, sp = 26 + r * 9, gap = 150 - r * 8, amp = (9 + r * 4) * g * (1 + wi * 0.3), n = Math.ceil(e.half * 2 / gap) + 1;
        for (let i = 0; i < n; i++) {
          const u = (((i * gap - w.t * sp + r * 47) % (e.half * 2)) + e.half * 2) % (e.half * 2) - e.half, edge = Math.cos(u / e.half * Math.PI / 2);
          if (edge < 0.12) continue;
          const x = e.x + u, a = amp * (0.6 + 0.4 * Math.sin(w.t * 0.9 + i * 1.7 + r)) * edge, al = edge * g;
          mark(ctx, [x + 62, y + 5, x + 30, y - a * 0.5, x + 6, y - a, x - 12, y - a * 0.72, x - 16, y - a * 0.2, x - 8, y + 1], nail(3.4 + r * 0.5), w.ink((0.5 - r * 0.04) * al));
          mark(ctx, [x + 60, y + 8, x + 10, y + 12, x - 60, y + 7], swell(1.3), w.ink(0.26 * al));
          for (let q = 0; q < 3; q++) softDot(ctx, x - 10 + q * 9, y - a * (0.78 - q * 0.1) - 2, 6.5 - q, w.col('white', 0.95 * al), w.col('white', 0));   // 浪花
        }
      }
    }
  };

  /* ================= 凤：高冠长尾，三道翎毛拖在身后 ================= */
  Kinds.phoenix = {
    z: 74, single: true, zone: 'high',
    respawn(e, x, y) { e.cx = x; e.cy = y; },
    create(e, w) { e.cx = e.x; e.cy = e.y; e.ph = e.rng() * TAU; e.px = e.x; e.py = e.y; e.a = 0; },
    update(e, dt, w) {
      e.ph += dt * 0.34;
      const rx = clamp(w.W * 0.26, 180, 420), nx = e.cx + Math.sin(e.ph) * rx, ny = e.cy + Math.sin(e.ph * 2) * 60;
      const ta = Math.atan2(ny - e.y, nx - e.x); let d = ta - e.a; d = Math.atan2(Math.sin(d), Math.cos(d)); e.a += d * Math.min(1, dt * 4);
      e.x = nx; e.y = ny;
    },
    draw(e, ctx, w) {
      const g = ease(e.age / 2.5), t = w.t, flap = Math.sin(t * 3.2), dir = Math.cos(e.a) >= 0 ? 1 : -1;
      const RED = (a) => w.col('red', a), Y = (a) => w.col('yellow', a), INK = (a) => w.ink(a);
      ctx.globalAlpha *= g;
      ctx.save(); ctx.translate(e.x, e.y); ctx.scale(dir * 1.25, 1.25); ctx.rotate(clamp(Math.sin(e.a) * 0.4, -0.4, 0.4));
      softDot(ctx, -10, 0, 90, 'rgba(255,170,90,' + (0.1 + 0.1 * w.nightK) + ')', 'rgba(255,170,90,0)');
      // 尾翎：三道，一笔淡彩拖出去，梢上一只「眼」
      for (let i = 0; i < 3; i++) {
        const tp = strand(-22, 2 + (i - 1) * 4, Math.PI + (i - 1) * 0.2, 150 + (i % 2) * 40, t * 1.6 + i * 1.4, 16, (i - 1) * 0.12);
        wet(ctx, tp, (u) => 9 * Math.pow(Math.sin(Math.PI * Math.pow(u * 0.9 + 0.06, 0.7)), 0.8) + 1, w, 0.7, 0.2, i === 1 ? 'red' : 'orange');
        mark(ctx, tp, orchid(1.4), INK(0.4));
        const ex = tp[tp.length - 2], ey = tp[tp.length - 1];
        softDot(ctx, ex, ey, 11, Y(0.9), Y(0)); softDot(ctx, ex, ey, 5, w.col('blue', 0.9), w.col('blue', 0.1));
      }
      // 翅：两扇，一上一下扇着；羽是一片片淡彩
      for (const up of [1, -1]) {
        ctx.fillStyle = up > 0 ? RED(0.62) : w.col('orange', 0.56);
        ctx.beginPath();
        for (let k = 0; k < 7; k++) leafPath(ctx, 2, -2, -Math.PI / 2 * up - 0.5 * up + (k - 3) * 0.2 - flap * 0.45 * up, 46 - Math.abs(k - 2) * 5, 6.5, 0.12 * up);
        ctx.fill();
      }
      // 身、颈、头
      wet(ctx, [-24, 3, -4, 0, 18, -6, 30, -18], (u) => 20 - 12 * u, w, 0.8, 0.6, 'red');
      mark(ctx, [-20, 8, 0, 6, 16, 0], swell(4), Y(0.8));
      ctx.fillStyle = RED(0.9); ctx.beginPath(); ctx.arc(32, -21, 6.4, 0, TAU); ctx.fill();
      mark(ctx, [37, -21, 47, -19], taper(3.4), Y(0.95));
      ctx.fillStyle = 'rgba(20,18,16,1)'; ctx.beginPath(); ctx.arc(34, -22.4, 1.1, 0, TAU); ctx.fill();
      for (let k = 0; k < 3; k++) mark(ctx, strand(29, -26, -Math.PI / 2 - 0.5 + k * 0.3, 15, t * 3 + k, 2, -0.2), taper(2.4), Y(0.9));   // 冠
      ctx.restore();
    }
  };

  /* ================= 鹭：白鹭立在浅水里，偶尔低头 ================= */
  Kinds.egret = {
    z: 57, max: 3, zone: 'low',
    create(e, w) { e.b = []; for (let i = 0; i < 2 + ((e.rng() * 2) | 0); i++) e.b.push({ dx: (i - 0.8) * (70 + e.rng() * 50), dy: (e.rng() - 0.5) * 30, dir: e.rng() < 0.5 ? 1 : -1, s: 0.9 + e.rng() * 0.3, ph: e.rng() * TAU, dip: 0, next: 3 + e.rng() * 6 }); },
    update(e, dt, w) { for (const b of e.b) { b.next -= dt; if (b.next <= 0) { b.next = 6 + R() * 8; b.dip = 1; } b.dip = Math.max(0, b.dip - dt * 0.7); } },
    draw(e, ctx, w) {
      const INK = (a) => w.ink(a), WH = (a) => w.col('white', a);
      ctx.globalAlpha *= ease(e.age / 2);
      for (const b of e.b) {
        const d = Math.sin(Math.min(1, b.dip) * Math.PI), t = w.t + b.ph;
        ctx.save(); ctx.translate(e.x + b.dx, e.y + b.dy + 40); ctx.scale(b.s * b.dir, b.s);
        ctx.strokeStyle = INK(0.26); ctx.lineWidth = 1; ctx.beginPath();
        for (let q = 0; q < 2; q++) ctx.ellipse(2, 2, 14 + q * 12 + ((t * 5) % 12), 3 + q * 2, 0, 0, TAU);
        ctx.stroke();
        softDot(ctx, 0, -50, 46, INK(0.12), INK(0));                                              // 淡墨烘出白羽
        mark(ctx, [2, 0, 3, -22, 0, -40], () => 1.8, INK(0.86)); mark(ctx, [8, -40, 14, -30, 10, -22, 16, -16], () => 1.6, INK(0.8));   // 一足立，一足蜷
        blot(ctx, [-26, -44, -6, -52, 12, -48], (u) => 24 - 10 * Math.abs(u - 0.4), WH(0.97));    // 身
        mark(ctx, [-26, -40, -4, -36, 12, -42], orchid(1.6), INK(0.4));
        for (let q = 0; q < 3; q++) mark(ctx, strand(-22, -46 + q * 3, Math.PI * 0.92, 20, t + q, 2, 0.1), taper(3), WH(0.95));          // 蓑羽
        const hx = 26 + d * 10, hy = -86 + d * 56;
        const neck = [10, -50, 20 - d * 4, -64 + d * 10, 12 + d * 12, -76 + d * 30, hx, hy];
        mark(ctx, neck, (u) => 7 - 3 * u, WH(0.97)); mark(ctx, neck, orchid(1.2), INK(0.36));
        ctx.fillStyle = WH(0.98); ctx.beginPath(); ctx.ellipse(hx, hy, 6, 4.6, 0.2, 0, TAU); ctx.fill();
        mark(ctx, [hx + 4, hy, hx + 20, hy + 3 + d * 6], taper(3), w.col('yellow', 0.95));
        ctx.fillStyle = 'rgba(20,18,16,1)'; ctx.beginPath(); ctx.arc(hx + 2, hy - 1, 0.9, 0, TAU); ctx.fill();
        mark(ctx, strand(hx - 4, hy - 2, Math.PI + 0.3, 14, t * 2, 2, 0.2), taper(1.6), WH(0.95));
        ctx.restore();
      }
    }
  };

  /* ================= 蜂：三五只，绕着花转 ================= */
  Kinds.bee = {
    z: 73, max: 3, zone: 'mid',
    create(e, w) { e.b = []; for (let i = 0; i < 6; i++) e.b.push({ x: e.x, y: e.y, ph: e.rng() * TAU, r: 30 + e.rng() * 70, sp: 1.2 + e.rng() * 1.4, tx: e.x, ty: e.y }); e.tk = 0; },
    update(e, dt, w) {
      e.tk -= dt;
      if (e.tk <= 0) { e.tk = 3 + R() * 3; for (const b of e.b) { const s = w.flowerSpots.length ? w.flowerSpots[(R() * w.flowerSpots.length) | 0] : null; b.tx = s ? s.x : e.x + (R() - 0.5) * 160; b.ty = s ? s.y : e.y + (R() - 0.5) * 100; } }
      for (const b of e.b) {
        b.ph += dt * b.sp * 3;
        const gx = b.tx + Math.cos(b.ph) * b.r * 0.5, gy = b.ty + Math.sin(b.ph * 1.7) * b.r * 0.3 - 10;
        b.dx = gx - b.x; b.x += b.dx * Math.min(1, dt * 1.6); b.y += (gy - b.y) * Math.min(1, dt * 1.6);
      }
    },
    draw(e, ctx, w) {
      ctx.globalAlpha *= ease(e.age / 1.5);
      for (const b of e.b) {
        const dir = b.dx >= 0 ? 1 : -1, f = Math.sin(w.t * 60 + b.ph);
        ctx.save(); ctx.translate(b.x, b.y); ctx.scale(dir, 1);
        ctx.fillStyle = w.col('white', 0.5 + 0.2 * f); ctx.beginPath(); ctx.ellipse(-1, -5, 6, 3, -0.5 + f * 0.3, 0, TAU); ctx.ellipse(-3, -4, 5, 2.4, -1 + f * 0.3, 0, TAU); ctx.fill();
        ctx.fillStyle = w.col('yellow', 0.95); ctx.beginPath(); ctx.ellipse(-2, 0, 5.4, 3.6, 0.2, 0, TAU); ctx.fill();
        ctx.fillStyle = w.ink(0.88); ctx.beginPath(); ctx.arc(4, -1, 2.6, 0, TAU); ctx.fill();
        ctx.strokeStyle = w.ink(0.8); ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(-3.4, -3.4); ctx.lineTo(-3, 3.4); ctx.moveTo(-0.4, -3.6); ctx.lineTo(0, 3.6); ctx.stroke();
        ctx.restore();
      }
    }
  };

  /* ================= 琴：一张七弦，横在石上；隔一阵自己响一声 ================= */
  Kinds.qin = {
    z: 64, max: 2, zone: 'ground',
    create(e) { e.next = 2.5; e.hit = 0; e.str = 3; },
    update(e, dt, w) { e.hit = Math.max(0, e.hit - dt * 0.8); e.next -= dt; if (e.next <= 0) { e.next = 4 + R() * 5; e.hit = 1; e.str = (R() * 7) | 0; w.emit('ink', { i: 1 + e.str, pan: 0 }); } },
    draw(e, ctx, w) {
      const g = ease(e.age / 2), INK = (a) => w.ink(a);
      ctx.globalAlpha *= g;
      ctx.save(); ctx.translate(e.x, e.y + 46); ctx.rotate(-0.06);
      // 石
      if (blot(ctx, [-120, 10, -60, -6, 20, -8, 110, 8], (u) => 34 - 10 * Math.abs(u - 0.5), INK(0.34))) { ctx.save(); ctx.clip(); softDot(ctx, -40, 16, 60, INK(0.3), INK(0)); ctx.restore(); }
      mark(ctx, [-124, 2, -60, -22, 20, -24, 114, 0], nail(3.4), INK(0.6));
      // 琴身：一头宽一头窄，浓墨
      ctx.beginPath(); ctx.moveTo(-104, -36); ctx.lineTo(96, -32); ctx.quadraticCurveTo(104, -25, 96, -19); ctx.lineTo(-104, -13); ctx.quadraticCurveTo(-112, -24, -104, -36); ctx.closePath();
      ctx.fillStyle = INK(0.88); ctx.fill();
      ctx.strokeStyle = w.col('paper', 0.3); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-100, -33); ctx.lineTo(94, -30); ctx.stroke();
      for (let i = 0; i < 7; i++) {                                                          // 弦
        const y0 = -32 + i * 2.7, y1 = -29.6 + i * 1.5, on = e.hit > 0 && i === e.str, vib = on ? Math.sin(w.t * 70) * 2.2 * e.hit : 0;
        ctx.strokeStyle = w.col('white', on ? 1 : 0.7); ctx.lineWidth = on ? 1.1 : 0.6;
        ctx.beginPath(); ctx.moveTo(-98, y0); ctx.quadraticCurveTo(0, (y0 + y1) / 2 + vib, 90, y1); ctx.stroke();
      }
      ctx.fillStyle = w.col('white', 0.9); ctx.beginPath(); for (let i = 0; i < 13; i++) { const x = -86 + i * 13.4; ctx.moveTo(x + 1.2, -34.6 + i * 0.26); ctx.arc(x, -34.6 + i * 0.26, 1.2, 0, TAU); } ctx.fill();   // 十三徽
      for (let i = 0; i < 2; i++) mark(ctx, strand(-108, -18 + i * 3, Math.PI / 2 + 0.3 - i * 0.5, 26, w.t * 2 + i, 3, 0), taper(3), w.col('red', 0.8));   // 穗
      if (e.hit > 0) { ctx.strokeStyle = INK(0.3 * e.hit); ctx.lineWidth = 1.2; for (let q = 0; q < 2; q++) { ctx.beginPath(); ctx.arc(0, -26, 40 + (1 - e.hit) * 90 + q * 26, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); } }
      ctx.restore();
    }
  };

  /* ================= 书：线装几册，一卷摊开，风来翻页 ================= */
  Kinds.book = {
    z: 64, max: 3, zone: 'ground',
    create(e) { e.ph = e.rng() * TAU; },
    draw(e, ctx, w) {
      const g = ease(e.age / 1.8), INK = (a) => w.ink(a), flip = 0.5 + 0.5 * Math.sin(w.t * 0.9 + e.ph) + w.wind * 0.6;
      ctx.globalAlpha *= g;
      ctx.save(); ctx.translate(e.x, e.y + 44);
      ctx.save(); ctx.scale(1, 0.3); softDot(ctx, 10, 0, 100, INK(0.14), INK(0)); ctx.restore();
      for (let i = 0; i < 3; i++) {                                                          // 一摞线装书
        const y = -i * 11, x = -74 + i * 4;
        ctx.fillStyle = w.col('blue', 0.62 - i * 0.06); ctx.fillRect(x, y - 11, 64, 10);
        ctx.fillStyle = w.col('white', 0.9); ctx.fillRect(x + 60, y - 10, 6, 8);
        mark(ctx, [x, y - 11, x + 32, y - 12, x + 66, y - 11], nail(1.6), INK(0.6));
        ctx.strokeStyle = w.col('white', 0.8); ctx.lineWidth = 0.7; ctx.beginPath(); for (let q = 0; q < 4; q++) { ctx.moveTo(x + 4, y - 9.6 + q * 2.4); ctx.lineTo(x + 9, y - 9.6 + q * 2.4); } ctx.stroke();
      }
      ctx.fillStyle = w.col('white', 0.95); ctx.fillRect(-56, -31, 10, 22);                    // 题签
      // 摊开的一册
      ctx.fillStyle = w.col('white', 0.95);
      ctx.beginPath(); ctx.moveTo(8, -4); ctx.quadraticCurveTo(34, -14, 60, -6); ctx.lineTo(112, -10); ctx.lineTo(112, 4); ctx.lineTo(60, 8); ctx.quadraticCurveTo(34, 0, 8, 10); ctx.closePath(); ctx.fill();
      mark(ctx, [8, -4, 34, -12, 60, -6, 112, -10], orchid(1.4), INK(0.5)); mark(ctx, [8, 10, 34, 1, 60, 8, 112, 4], nail(1.8), INK(0.6)); mark(ctx, [60, -6, 60, 8], () => 1, INK(0.4));
      ctx.strokeStyle = INK(0.5); ctx.lineWidth = 0.8; ctx.beginPath();
      for (let q = 0; q < 5; q++) { ctx.moveTo(68 + q * 8, -5); ctx.lineTo(68 + q * 8, 4 - (q % 2) * 3); ctx.moveTo(16 + q * 8, -5 - Math.sin(q) * 2); ctx.lineTo(16 + q * 8, 5 - (q % 3)); }
      ctx.stroke();
      // 翻着的一页
      const fx = 60 + Math.cos(Math.PI * clamp(flip, 0, 1)) * 44, fy = -8 - Math.sin(Math.PI * clamp(flip, 0, 1)) * 26;
      ctx.fillStyle = w.col('white', 0.9); ctx.beginPath(); ctx.moveTo(60, -6); ctx.quadraticCurveTo((60 + fx) / 2, fy - 8, fx, fy); ctx.lineTo(fx, fy + 13); ctx.quadraticCurveTo((60 + fx) / 2, fy + 8, 60, 8); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = INK(0.4); ctx.lineWidth = 0.8; ctx.stroke();
      ctx.restore();
    }
  };

  /* ================= 笔：悬着一管，饱蘸了墨，隔一阵滴下一滴 ================= */
  Kinds.pen = {
    z: 66, max: 2, zone: 'mid',
    create(e) { e.drop = 0; e.next = 2; },
    update(e, dt, w) {
      e.next -= dt;
      if (e.next <= 0 && e.drop <= 0) { e.drop = 0.001; e.next = 5 + R() * 5; }
      if (e.drop > 0) { e.drop += dt * 1.3; if (e.drop >= 1) { e.drop = 0; w.dye(e.x + 22, e.y + 150, [0.5, 0, 0], 34, (R() - 0.5) * 60, 40); w.emit('raindrop'); } }
    },
    draw(e, ctx, w) {
      const g = ease(e.age / 1.6), INK = (a) => w.ink(a), sw = Math.sin(w.t * 0.8 + e.seed) * 0.04 + w.wind * 0.1;
      ctx.globalAlpha *= g;
      ctx.save(); ctx.translate(e.x, e.y - 70); ctx.rotate(0.3 + sw);
      mark(ctx, strand(0, -4, -Math.PI / 2, 26, w.t * 2, 3, 0.1), taper(2), w.col('red', 0.8));     // 挂绳
      mark(ctx, [0, 0, 0, 96], () => 7.4, w.col('yellow', 0.8)); mark(ctx, [-3.4, 0, -3.4, 96], nail(1.4), INK(0.6)); mark(ctx, [3.6, 2, 3.6, 96], orchid(1.1), INK(0.4));   // 竹管
      for (const yy of [8, 88]) mark(ctx, [-4, yy, 4, yy], () => 2.2, INK(0.7));
      blot(ctx, [0, 96, 0, 114, 0, 140], (u) => 9 + 9 * Math.sin(Math.PI * Math.pow(u, 0.6)) * (1 - u * 0.9), INK(0.3));                       // 笔肚：淡
      mark(ctx, [0, 108, 0, 124, 0, 142], (u) => 12 * Math.sin(Math.PI * Math.pow(u, 0.5)) * (1 - u) + 0.6, INK(0.92));                       // 笔锋：浓
      if (e.drop > 0) { const d = e.drop; softDot(ctx, 0, 142 + d * d * 70, 3 + d * 2.4, INK(0.95), INK(0.1)); }
      ctx.restore();
    }
  };

  /* ================= 茶：一壶两盏，茶烟袅袅 ================= */
  Kinds.tea = {
    z: 64, max: 3, zone: 'ground',
    create(e) { e.ph = e.rng() * TAU; },
    draw(e, ctx, w) {
      const g = ease(e.age / 1.8), INK = (a) => w.ink(a), steam = w.by(1, 0.7, 1, 1.5, 1);
      ctx.globalAlpha *= g;
      ctx.save(); ctx.translate(e.x, e.y + 44);
      ctx.save(); ctx.scale(1, 0.3); softDot(ctx, 10, 0, 90, INK(0.14), INK(0)); ctx.restore();
      // 壶：紫砂，一团赭墨；提梁一笔
      ctx.beginPath(); ctx.ellipse(-20, -22, 32, 24, 0, 0, TAU); ctx.fillStyle = w.col('red', 0.5); ctx.fill(); ctx.fillStyle = INK(0.46); ctx.fill();
      softDot(ctx, -30, -30, 14, w.col('paper', 0.32), w.col('paper', 0));
      mark(ctx, [-44, -36, -20, -70, 6, -36], nail(4.4), INK(0.84));
      mark(ctx, [8, -24, 24, -30, 30, -42], (u) => 9 - 5 * u, INK(0.74));
      mark(ctx, [-30, -46, -20, -49, -10, -46], () => 5, INK(0.8)); ctx.fillStyle = INK(0.86); ctx.beginPath(); ctx.arc(-20, -52, 3.4, 0, TAU); ctx.fill();
      for (const [cx, cy, r] of [[44, -6, 12], [70, 0, 10]]) {                              // 盏
        ctx.beginPath(); ctx.moveTo(cx - r, cy - r * 0.7); ctx.quadraticCurveTo(cx, cy + r * 0.9, cx + r, cy - r * 0.7); ctx.closePath();
        ctx.fillStyle = w.col('white', 0.95); ctx.fill();
        mark(ctx, [cx - r, cy - r * 0.7, cx, cy + r * 0.16, cx + r, cy - r * 0.7], orchid(1.5), INK(0.5));
        ctx.fillStyle = w.col('leaf', 0.6); ctx.beginPath(); ctx.ellipse(cx, cy - r * 0.7, r * 0.82, r * 0.2, 0, 0, TAU); ctx.fill();
      }
      for (let i = 0; i < 3; i++) mark(ctx, strand(30 + i * 14, -44 + i * 16, -Math.PI / 2 + (i - 1) * 0.16, 54 * steam, w.t * 1.1 + i * 2 + e.ph, 8, 0.08), taper(2.6), INK(0.16));
      ctx.restore();
    }
  };

  /* ================= 笛：一管横笛，声随风远 ================= */
  Kinds.flute = {
    z: 72, max: 2, zone: 'mid',
    create(e) { e.next = 1.2; e.hit = 0; },
    update(e, dt, w) { e.hit = Math.max(0, e.hit - dt * 0.3); e.next -= dt; if (e.next <= 0) { e.next = 9 + R() * 7; e.hit = 1; w.emit('song', { name: 'flute' }); } },
    draw(e, ctx, w) {
      const g = ease(e.age / 1.6), INK = (a) => w.ink(a);
      ctx.globalAlpha *= g;
      ctx.save(); ctx.translate(e.x, e.y + Math.sin(w.t * 0.8) * 4); ctx.rotate(-0.16 + Math.sin(w.t * 0.5) * 0.03);
      mark(ctx, [-90, 0, 90, 0], () => 8, w.col('yellow', 0.82)); mark(ctx, [-90, -3.6, 0, -4, 90, -3.6], nail(1.4), INK(0.6)); mark(ctx, [-90, 3.8, 90, 3.8], orchid(1.1), INK(0.4));
      for (const xx of [-80, -46, 80]) mark(ctx, [xx, -4.4, xx, 4.4], () => 2.2, INK(0.7));
      ctx.fillStyle = INK(0.88); ctx.beginPath(); for (let i = 0; i < 6; i++) { ctx.moveTo(-18 + i * 15 + 2, 0); ctx.arc(-18 + i * 15, 0, 2, 0, TAU); } ctx.moveTo(-62, 0); ctx.ellipse(-64, 0, 3, 2.2, 0, 0, TAU); ctx.fill();
      for (let i = 0; i < 2; i++) mark(ctx, strand(84, 3, Math.PI / 2 + 0.2 - i * 0.4, 40, w.t * 2 + i, 5, 0.05), taper(3.4), w.col('red', 0.8));
      if (e.hit > 0) {                                                                        // 声：从吹孔荡出去
        ctx.lineCap = 'round';
        for (let i = 0; i < 4; i++) { const u = ((1 - e.hit) * 1.6 + i / 4) % 1; ctx.strokeStyle = INK(0.3 * (1 - u) * Math.min(1, e.hit * 3)); ctx.lineWidth = 1.6 * (1 - u) + 0.5; ctx.beginPath(); ctx.arc(-64, 0, 20 + u * 150, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
      }
      ctx.restore();
    }
  };

  /* ================= 香：一炉，一缕烟直上，到高处才散 ================= */
  Kinds.incense = {
    z: 64, max: 3, zone: 'ground',
    create(e) { e.tk = 0; e.ph = e.rng() * TAU; },
    update(e, dt, w) { e.tk -= dt; if (e.tk <= 0) { e.tk = 0.5; w.dye(e.x, e.y - 60, [0.02, 0, 0], 16, w.wind * 30, -50); } },
    draw(e, ctx, w) {
      const g = ease(e.age / 1.8), INK = (a) => w.ink(a);
      ctx.globalAlpha *= g;
      ctx.save(); ctx.translate(e.x, e.y + 44);
      ctx.save(); ctx.scale(1, 0.3); softDot(ctx, 0, 0, 60, INK(0.14), INK(0)); ctx.restore();
      for (const sd of [-1, 0, 1]) mark(ctx, [sd * 16, -14, sd * 20, 0], (u) => 6 - 2 * u, INK(0.8));       // 三足
      ctx.beginPath(); ctx.moveTo(-26, -36); ctx.quadraticCurveTo(-32, -10, 0, -8); ctx.quadraticCurveTo(32, -10, 26, -36); ctx.closePath(); ctx.fillStyle = INK(0.74); ctx.fill();
      softDot(ctx, -10, -24, 12, w.col('paper', 0.28), w.col('paper', 0));
      mark(ctx, [-30, -37, 0, -40, 30, -37], () => 5, INK(0.86));
      for (const sd of [-1, 1]) mark(ctx, [sd * 26, -36, sd * 36, -44, sd * 30, -52], nail(3), INK(0.8));     // 双耳
      softDot(ctx, 0, -41, 5, 'rgba(255,150,70,0.9)', 'rgba(255,150,70,0)');
      const sm = strand(0, -42, -Math.PI / 2 + w.wind * 0.3, 190, w.t * 0.9 + e.ph, 26, 0.04 + w.wind * 0.2);
      mark(ctx, sm, (u) => 1.6 + 9 * u * u, INK(0.16)); mark(ctx, sm, (u) => 1.2 * (1 - u) + 0.3, INK(0.4));
      ctx.restore();
    }
  };

  /* ================= 露：草叶上的露珠，慢慢滑到叶尖，坠下去。冬天冻成霜 ================= */
  Kinds.dew = {
    z: 62, max: 3, zone: 'ground',
    create(e) {
      e.bl = [];
      for (let i = 0; i < 7; i++) e.bl.push({ dx: (i - 3) * 30 + (e.rng() - 0.5) * 20, a: -Math.PI / 2 + (i - 3) * 0.22 + (e.rng() - 0.5) * 0.2, len: 60 + e.rng() * 50, bend: (i - 3) * 0.12, d: [e.rng(), e.rng() * 0.6], ph: e.rng() * TAU });
    },
    update(e, dt, w) {
      const wi = w.sea['冬'];
      for (const b of e.bl) for (let k = 0; k < 2; k++) { b.d[k] += dt * 0.05 * (1 - wi) * (1 + k); if (b.d[k] > 1.15) { b.d[k] = 0.1 * R(); if (R() < 0.5) w.emit('raindrop'); } }
    },
    draw(e, ctx, w) {
      const g = ease(e.age / 2), wi = w.sea['冬'], big = w.by(1, 0.8, 1.25, 1, 1);
      ctx.globalAlpha *= g;
      const col = w.hue('leaf', 'green', 'yellow', 'ink', 'leaf', 0.8);
      for (const b of e.bl) {
        const sw = Math.sin(w.t * 1.1 + b.ph) * 0.05 + w.wind * 0.25, pts = strand(e.x + b.dx, e.y + 46, b.a + sw, b.len, 0, 0, b.bend * 2.2 + sw);
        mark(ctx, pts, swell(5), col); mark(ctx, pts, orchid(1), w.ink(0.4));
        for (let k = 0; k < 2; k++) {
          const u = clamp(b.d[k], 0, 1), i = Math.min(6, (u * 7) | 0), f = u * 7 - i;
          let x = lerp(pts[i * 2], pts[i * 2 + 2], f), y = lerp(pts[i * 2 + 1], pts[i * 2 + 3], f) - 2;
          if (b.d[k] > 1) y += (b.d[k] - 1) * 400;                                           // 坠
          const r = (2.6 + k * 1.2) * big;
          softDot(ctx, x, y, r * 2.6, w.col('white', 0.5), w.col('white', 0));
          ctx.fillStyle = w.col('white', 0.85 + wi * 0.15); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
          if (w.nightK < 0.5) { ctx.strokeStyle = w.ink(0.3 * (1 - wi)); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(x, y, r, 0.4, 2.6); ctx.stroke(); }
        }
      }
    }
  };

  /* ---------- 禽虫也有时令：冬天蝶与蜂不见了，燕子秋去春来，虫声到冬天歇了 ---------- */
  const seasonal = (kind, sp, su, au, wi) => {
    const K = Kinds[kind]; if (!K || !K.draw) return;
    const d = K.draw;
    K.draw = function (e, ctx, w) { const k = w.by(sp, su, au, wi, 1); if (k < 0.02) return; ctx.globalAlpha *= k; d.call(this, e, ctx, w); };
  };
  seasonal('butterfly', 1, 1, 0.5, 0); seasonal('bee', 1, 1, 0.5, 0); seasonal('swallow', 1, 1, 0.3, 0);
  seasonal('insects', 0.6, 1, 1, 0); seasonal('oriole', 1, 0.9, 0.4, 0);
})();
