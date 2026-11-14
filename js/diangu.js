/* 词源 · diangu.js — 从《声律启蒙》的典故里走出来的七样：
 *   羊（苏武牧羊）  鸡（宋宗鸡 · 五更鸡）  犬（黄耳传书）  弓（六钧弓）
 *   棋（舞剑对围棋）  橘（陆绩怀橘）  瓜（献瓜对投李）
 * 画法照旧：没骨的墨团作体，钉头鼠尾的线勾骨，留白作雪与毛；四时各有变化。
 */
(function () {
  'use strict';
  const MS = window.MS, Kinds = MS.Kinds;
  const { clamp, lerp, ease, softDot, leafPath, brushPath, TAU } = MS.util;
  const { mark, strand, taper, nail, orchid, dry, dense } = MS.ink;
  const R = Math.random;
  const blot = (ctx, pts, wf, color) => { if (brushPath(ctx, pts, wf, null, null, true)) { ctx.fillStyle = color; ctx.fill(); return true; } return false; };
  const dot = (ctx, x, y, r, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };
  const DK = 'rgba(24,22,20,1)';
  const shadow = (ctx, w, x, r) => { ctx.save(); ctx.scale(1, 0.28); softDot(ctx, x, 0, r, w.ink(0.15), w.ink(0)); ctx.restore(); };
  const snowcap = (ctx, w, x, y, r, a) => { if (a > 0.02) { ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.42); softDot(ctx, 0, 0, r, w.col('white', 0.95 * a), w.col('white', 0)); ctx.restore(); } };

  /* ================= 羊：两只，一低头啮草，一抬头望；冬来雪地里立着一竿汉节 ================= */
  function sheep(ctx, w, t, graze, tone) {
    const INK = (a) => w.ink(a), walk = Math.sin(t * 2.4), nod = graze ? 0.5 + 0.5 * Math.sin(t * 1.3) : 0;
    for (const [lx, ph, far] of [[-20, 2, 1], [16, 3.3, 1], [-13, 0, 0], [23, 1.3, 0]]) {
      const sw = Math.sin(t * 2.4 + ph) * 3.4;
      mark(ctx, [lx, -22, lx + sw * 0.3 + 1, -11, lx + sw, -1], (u) => 4.2 - 2.4 * u, INK(far ? 0.42 : 0.8));
      softDot(ctx, lx + sw, -0.6, 2.4, INK(far ? 0.5 : 0.9), INK(0.2));
    }
    // 身：一团白，底下衬淡墨；卷毛用几笔枯墨
    for (const [x, y, r] of [[-20, -24, 15], [0, -22, 16], [18, -24, 14]]) softDot(ctx, x, y, r, INK(0.26 * tone), INK(0));      // 腹下一抹淡墨
    for (const [x, y, r] of [[-25, -33, 12], [-13, -40, 13], [1, -41, 14], [15, -39, 13], [25, -32, 11], [-16, -28, 12], [0, -27, 13], [15, -28, 12]])
      softDot(ctx, x + Math.sin(t * 1.1 + x) * 0.5, y, r, w.col('white', 0.98), w.col('white', 0.5));  // 毛：几团白叠出蓬松，边上不勾死
    for (let k = 0; k < 6; k++) {                                                                        // 卷毛：几笔淡墨小弧
      const x = -22 + k * 9, y = -29 - 8 * Math.sin((k + 1) / 7 * Math.PI) + (k % 2) * 8;
      mark(ctx, [x - 4, y + 1, x - 1, y - 3.4, x + 4, y - 1, x + 3, y + 3], nail(1.7), INK(0.3));
    }
    dry(ctx, dense([-24, -18, -4, -15, 16, -17], 4), () => 6, INK(0.3), 3, 11);
    softDot(ctx, -34, -30, 6, w.col('white', 0.95), w.col('white', 0.3));                                // 短尾
    // 头：浓墨；啮草时低到地上
    const hx = 36 + nod * 3, hy = -40 + nod * 30;
    blot(ctx, [26, -36, 31, -39 + nod * 10, hx, hy], (u) => 13 - 4 * u, INK(0.86));
    blot(ctx, [hx - 2, hy - 2, hx + 7, hy + 3, hx + 12, hy + 8], (u) => 10 - 4.4 * u, INK(0.9));
    mark(ctx, [hx - 1, hy - 7, hx - 9, hy - 13, hx - 13, hy - 6, hx - 9, hy - 2], nail(3), INK(0.74));     // 弯角
    ctx.fillStyle = INK(0.84); ctx.beginPath(); leafPath(ctx, hx - 3, hy - 2, Math.PI * 0.8 + nod * 0.3, 10, 3.4, 0.2); ctx.fill();
    dot(ctx, hx + 4, hy, 1.5, w.col('paper', 0.95)); dot(ctx, hx + 4.3, hy, 0.8, DK);
    return walk;
  }
  Kinds.sheep = {
    z: 57, max: 3, zone: 'ground',
    create(e, w) { e.dir = e.x < w.W / 2 ? 1 : -1; e.ph = e.rng() * 6; e.gap = 78 + e.rng() * 26; },
    update(e, dt, w) { e.x += e.dir * 5 * dt; if (e.x > w.W + 150) e.x = -150; if (e.x < -150) e.x = w.W + 150; },
    draw(e, ctx, w) {
      const t = w.t + e.ph, wi = w.by(0, 0, 0, 1, 0), tone = w.by(1, 1, 1.1, 0.6, 1);
      ctx.globalAlpha *= ease(e.age / 2);
      ctx.save(); ctx.translate(e.x, e.y + 52); ctx.scale(1.25 * e.dir, 1.25);
      shadow(ctx, w, e.gap / 2 - 10, 96);
      if (wi > 0.02) {                                                                                   // 汉节：竹竿上三重旄，雪里不倒
        ctx.save(); ctx.globalAlpha *= wi; ctx.translate(-58, 0);
        mark(ctx, [0, 2, 1.5, -60, -1, -118], () => 2.6, w.ink(0.8));
        for (let k = 0; k < 3; k++) mark(ctx, strand(-0.4 + k * 0.5, -112 + k * 20, Math.PI / 2 + 0.5, 15, t * 2 + k, 3, 0.1), taper(8), w.col('red', 0.62));
        snowcap(ctx, w, 0, 2, 26, 1); ctx.restore();
      }
      ctx.save(); ctx.translate(e.gap, -4); ctx.scale(0.86, 0.86); sheep(ctx, w, t + 2, false, tone); ctx.restore();
      sheep(ctx, w, t, true, tone);
      if (wi > 0.02) { snowcap(ctx, w, 0, -52, 26, wi * 0.8); snowcap(ctx, w, e.gap, -50, 22, wi * 0.8); snowcap(ctx, w, 30, 3, 90, wi * 0.7); }
      ctx.restore();
    }
  };

  /* ================= 鸡：白石老人的大公鸡——墨尾几撇，朱冠一点；隔一阵引颈长啼。春天身后跟着几只雏 ================= */
  Kinds.rooster = {
    z: 59, max: 2, zone: 'ground',
    create(e, w) { e.dir = e.x < w.W / 2 ? 1 : -1; e.ph = e.rng() * 6; e.crow = 3 + e.rng() * 3; e.c = 0; },
    update(e, dt, w) {
      e.crow -= dt; if (e.crow <= 0) { e.crow = 12 + R() * 9; e.c = 2.6; w.emit('song', { name: 'crow' }); }
      if (e.c > 0) e.c -= dt; else { e.x += e.dir * 7 * dt; if (e.x > w.W + 120) e.x = -120; if (e.x < -120) e.x = w.W + 120; }
    },
    draw(e, ctx, w) {
      const t = w.t + e.ph, INK = (a) => w.ink(a), sp = w.by(1, 0.25, 0, 0, 0), puff = w.by(1, 1, 1, 1.12, 1);
      const up = e.c > 0 ? Math.sin(clamp(1 - e.c / 2.6, 0, 1) * Math.PI) : 0;                           // 啼：颈子拔起来
      const peck = e.c > 0 ? 0 : Math.max(0, Math.sin(t * 1.7)) * Math.max(0, Math.sin(t * 0.43));
      const step = e.c > 0 ? 0 : Math.sin(t * 5);
      ctx.globalAlpha *= ease(e.age / 1.8);
      ctx.save(); ctx.translate(e.x, e.y + 56); ctx.scale(1.2 * e.dir, 1.2);
      shadow(ctx, w, 0, 60);
      for (let k = 0; k < 3; k++) {                                                                      // 雏：一团鹅黄，点睛
        if (sp < 0.03) break;
        const cx = -52 - k * 19 + Math.sin(t * 3 + k) * 3, cy = -6 - Math.abs(Math.sin(t * 6 + k * 2)) * 2.4;
        ctx.save(); ctx.globalAlpha *= sp;
        softDot(ctx, cx, cy, 8.4, w.col('yellow', 0.95), w.col('yellow', 0.35)); softDot(ctx, cx + 5.4, cy - 4.6, 5, w.col('yellow', 0.95), w.col('yellow', 0.3));
        dot(ctx, cx + 6.6, cy - 5.4, 0.8, DK); mark(ctx, [cx + 9.4, cy - 4.6, cx + 12.4, cy - 4], taper(1.6), w.col('orange', 0.9));
        ctx.restore();
      }
      for (const [lx, s] of [[-3, step], [7, -step]]) {                                                  // 脚：两笔赭黄，爪三分
        const fx = lx + s * 5;
        mark(ctx, [lx, -18, lx + s * 2, -9, fx, 0], () => 2, w.col('yellow', 0.9));
        for (const a of [-0.5, 0.1, 0.7]) mark(ctx, [fx, 0, fx + Math.cos(a) * 8, Math.sin(a) * 2.4 + 0.6], taper(1.7), w.col('yellow', 0.9));
      }
      for (let k = 0; k < 5; k++) {                                                                      // 尾：浓墨大撇，钉头鼠尾
        const a = Math.PI * (1.34 - k * 0.1) + Math.sin(t * 1.2 + k) * 0.03, L = 46 - k * 4;
        mark(ctx, [-16, -30, -16 + Math.cos(a) * L * 0.6, -30 + Math.sin(a) * L * 0.9, -16 + Math.cos(a - 0.5) * L * 1.1, -30 + Math.sin(a - 0.9) * L * 0.5 + k * 5], nail(7.4 - k * 0.6), INK(k % 2 ? 0.7 : 0.94));
      }
      blot(ctx, [-18, -30, -4, -36, 12, -30], (u) => (30 - 8 * u) * puff, INK(0.5));                     // 身：湿墨一团
      blot(ctx, [-16, -24, -2, -22, 10, -28], (u) => 17 * puff, INK(0.82));                              // 翅：再压一笔浓的
      dry(ctx, dense([-18, -20, -4, -16, 10, -22], 4), () => 9, w.col('orange', 0.5), 4, 3);
      const nx = 20 + up * 2 - peck * -6, ny = -52 - up * 16 + peck * 40;                                // 颈与头
      blot(ctx, [10, -34, 16 + peck * 5, -44 + peck * 14, nx, ny], (u) => 15 - 6 * u, w.col('orange', 0.72));
      dry(ctx, dense([10, -30, 15 + peck * 4, -42 + peck * 12, nx - 1, ny + 3], 4), () => 10, INK(0.5), 4, 7);
      softDot(ctx, nx + 2, ny - 2, 7.4, INK(0.8), INK(0.55));
      for (let k = 0; k < 3; k++) softDot(ctx, nx - 3 + k * 4.4, ny - 10 - (k === 1 ? 2.4 : 0), 4.2, w.col('red', 0.95), w.col('red', 0.5));   // 冠
      softDot(ctx, nx + 5, ny + 5.4, 3.6, w.col('red', 0.9), w.col('red', 0.4));
      const open = up * 3.4;
      mark(ctx, [nx + 7, ny - 2.4, nx + 16, ny - 1.4 - open], taper(3), w.col('yellow', 0.95)); mark(ctx, [nx + 7, ny - 0.4, nx + 14, ny + 0.8 + open], taper(2.2), w.col('yellow', 0.9));
      dot(ctx, nx + 3.4, ny - 3, 1.7, w.col('paper', 0.95)); dot(ctx, nx + 3.8, ny - 3, 0.9, DK);
      if (up > 0.3) for (let k = 0; k < 3; k++) mark(ctx, strand(nx + 20 + k * 9, ny - 6 - k * 8, -0.5, 13, t * 5 + k, 2, 0), taper(1.8), INK(0.3 * up));   // 啼声几笔
      ctx.restore();
    }
  };

  /* ================= 犬：黄耳——颈上系着竹筒家书，一路小跑；暑天吐舌，寒天呵气 ================= */
  Kinds.dog = {
    z: 58, max: 2, zone: 'ground',
    create(e, w) { e.dir = e.x < w.W / 2 ? 1 : -1; e.ph = e.rng() * 6; },
    update(e, dt, w) { e.x += e.dir * 46 * dt; if (e.x > w.W + 160) e.x = -160; if (e.x < -160) e.x = w.W + 160; },
    draw(e, ctx, w) {
      const t = w.t + e.ph, INK = (a) => w.ink(a), su = w.by(0, 1, 0, 0, 0), wi = w.by(0, 0, 0, 1, 0), run = t * 9, bob = Math.sin(run) * 2.2;
      const OCH = (a) => w.col('warm', a);
      ctx.globalAlpha *= ease(e.age / 1.6);
      ctx.save(); ctx.translate(e.x, e.y + 54 + bob * 0.4); ctx.scale(1.2 * e.dir, 1.2);
      shadow(ctx, w, 0, 66);
      for (const [lx, ph, far] of [[-26, 0, 1], [20, Math.PI, 1], [-20, Math.PI, 0], [26, 0, 0]]) {      // 腿：前后交剪
        const sw = Math.sin(run + ph) * 13, lift = Math.max(0, Math.cos(run + ph)) * 6;
        mark(ctx, [lx, -30, lx + sw * 0.2 - 2, -14, lx + sw, -lift], (u) => 7 - 4.4 * u, far ? INK(0.36) : OCH(0.8));
        if (!far) mark(ctx, [lx, -30, lx + sw * 0.2 - 2, -14, lx + sw, -lift], orchid(1.3), INK(0.5));
      }
      mark(ctx, [-34, -34, -46, -44, -44, -60, -34, -62], nail(5), OCH(0.9)); mark(ctx, [-34, -34, -46, -44, -44, -60, -34, -62], orchid(1.4), INK(0.5));   // 尾上卷
      // 身：一笔赭墨——胸深、腰细、胯略起；背上压墨，腹下留白
      if (blot(ctx, [-34, -36, -14, -37 + bob, 8, -36 - bob, 28, -37], (u) => 15 + 10 * u * u + 5 * (1 - u) * (1 - u), OCH(0.72))) {
        ctx.save(); ctx.clip(); softDot(ctx, -6, -52, 34, INK(0.4), INK(0)); softDot(ctx, 24, -50, 20, INK(0.26), INK(0)); softDot(ctx, -6, -24, 20, w.col('paper', 0.62), w.col('paper', 0)); ctx.restore();
      }
      dry(ctx, dense([-32, -45, -10, -47 + bob, 12, -47 - bob, 30, -48], 4), () => 6, INK(0.5), 4, 5);
      blot(ctx, [24, -42, 34, -52, 42, -60], (u) => 19 - 7 * u, OCH(0.78));                              // 颈
      blot(ctx, [38, -62, 50, -60, 64, -53], (u) => 15 - 9 * u, OCH(0.82));                              // 头与长吻
      softDot(ctx, 42, -64, 9, INK(0.22), INK(0));
      ctx.fillStyle = INK(0.78); ctx.beginPath(); leafPath(ctx, 38, -67, Math.PI * 0.6 + bob * 0.04, 17, 6.4, 0.3); ctx.fill();   // 垂耳
      dot(ctx, 65, -52.4, 2.4, DK); dot(ctx, 50, -62, 1.3, DK);
      if (su > 0.03) mark(ctx, [60, -50, 62, -43 + Math.sin(run * 0.7) * 1.4], () => 3 * su, w.col('red', 0.85));     // 舌
      if (wi > 0.03) softDot(ctx, 80 + Math.sin(t * 3) * 3, -54, 11, w.col('white', 0.5 * wi), w.col('white', 0));     // 呵气
      mark(ctx, [28, -56, 37, -44, 32, -32], () => 2, w.col('red', 0.8));                               // 项绳与竹筒
      ctx.save(); ctx.translate(33, -31); ctx.rotate(0.5 + bob * 0.06);
      mark(ctx, [0, 0, 0, 15], () => 6, w.col('leaf', 0.75)); mark(ctx, [-3, 1, 3, 1], () => 1.3, INK(0.6)); mark(ctx, [-3, 14, 3, 14], () => 1.3, INK(0.6));
      ctx.restore();
      ctx.restore();
    }
  };

  /* ================= 弓：六钧之弓——弦慢慢拉满如月，一松手，箭破空而去 ================= */
  Kinds.bow = {
    z: 62, max: 2, zone: 'ground',
    create(e, w) { e.dir = e.x < w.W / 2 ? 1 : -1; e.c = e.rng() * 3; e.fly = -1; },
    update(e, dt, w) {
      e.c += dt; if (e.c > 7.5) { e.c = 0; e.fly = 0; }
      if (e.fly >= 0) { e.fly += dt; if (e.fly > 1.5) e.fly = -1; }
    },
    draw(e, ctx, w) {
      const INK = (a) => w.ink(a), wi = w.by(0, 0, 0, 1, 0);
      const pull = e.c > 2.4 ? ease(clamp((e.c - 2.4) / 3.6, 0, 1)) : 0, twang = e.c < 0.8 ? Math.sin(e.c * 46) * (1 - e.c / 0.8) * 5 : 0;
      const H = 76, bend = 30 + pull * 16, hh = H - pull * 10, sx = -pull * 54 + twang;
      ctx.globalAlpha *= ease(e.age / 1.6);
      ctx.save(); ctx.translate(e.x, e.y + 10); ctx.scale(1.15 * e.dir, 1.15); ctx.rotate(-0.42);
      const limb = [0, -hh, bend * 0.7, -hh * 0.62, bend, 0, bend * 0.7, hh * 0.62, 0, hh];
      mark(ctx, limb, (u) => 8.4 - 5.4 * Math.abs(u - 0.5) * 2, INK(0.88));                              // 弓背：中锋浓墨，两梢渐细
      dry(ctx, dense(limb, 3), () => 5, w.col('red', 0.5), 3, 2);
      mark(ctx, [bend - 1, -11, bend + 1, 0, bend - 1, 11], () => 9.4, w.col('red', 0.82));              // 弣：朱漆
      mark(ctx, [0, -hh, -3, -hh - 7], taper(3.4), INK(0.9)); mark(ctx, [0, hh, -3, hh + 7], taper(3.4), INK(0.9));
      ctx.strokeStyle = INK(0.72); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -hh); ctx.lineTo(sx, 0); ctx.lineTo(0, hh); ctx.stroke();   // 弦
      const arrow = (ax, a) => {
        ctx.save(); ctx.globalAlpha *= a; ctx.translate(ax, 0);
        mark(ctx, [0, 0, 92, 0], () => 1.7, INK(0.86));
        ctx.fillStyle = INK(0.92); ctx.beginPath(); ctx.moveTo(104, 0); ctx.lineTo(90, -4.4); ctx.lineTo(93, 0); ctx.lineTo(90, 4.4); ctx.closePath(); ctx.fill();
        for (const s of [-1, 1]) mark(ctx, [2, 0, 9, s * 5.4, 20, s * 1.2], taper(3.6), w.col('white', 0.92));
        ctx.restore();
      };
      if (pull > 0.02) arrow(sx, clamp(pull * 3, 0, 1));
      if (e.fly >= 0) {                                                                                  // 离弦：一道飞白
        const d = e.fly * 1500; arrow(d, clamp(1.5 - e.fly, 0, 1));
        dry(ctx, [d - 240, 0, d - 120, 0, d, 0], () => 6, INK(0.3 * clamp(1.2 - e.fly, 0, 1)), 4, 9);
      }
      if (wi > 0.02) { snowcap(ctx, w, 2, -hh - 4, 9, wi); snowcap(ctx, w, bend * 0.72, -hh * 0.62 - 3, 8, wi * 0.8); }
      ctx.restore();
    }
  };

  /* ================= 棋：一枰，两奁；黑白子一着一着落下来，局终收子再来。春落花，秋落叶，冬积雪 ================= */
  Kinds.go = {
    z: 63, max: 2, zone: 'ground',
    create(e) {
      e.seq = []; const seen = {};
      while (e.seq.length < 34) { const i = 1 + ((e.rng() * 9) | 0), j = 1 + ((e.rng() * 9) | 0); if (!seen[i * 16 + j]) { seen[i * 16 + j] = 1; e.seq.push([i, j]); } }
      e.n = 0; e.next = 1.2; e.rest = 0;
    },
    update(e, dt) {
      if (e.rest > 0) { e.rest -= dt; if (e.rest <= 0) e.n = 0; return; }
      e.next -= dt; if (e.next <= 0) { e.next = 1.1 + R() * 1.5; if (++e.n >= e.seq.length) e.rest = 4; }
    },
    draw(e, ctx, w) {
      const INK = (a) => w.ink(a), sp = w.by(1, 0, 0, 0, 0), au = w.by(0, 0, 1, 0, 0), wi = w.by(0, 0, 0, 1, 0);
      const P = (i, j) => [-70 + i * 14 + (10 - j) * 3.6, -4 - j * 5.6];                                 // 斜俯视的棋盘
      const k = e.rest > 0 ? clamp(e.rest / 1.6, 0, 1) : 1;
      ctx.globalAlpha *= ease(e.age / 1.8);
      ctx.save(); ctx.translate(e.x, e.y + 52); ctx.scale(1.2, 1.2);
      shadow(ctx, w, 10, 110);
      const c = [P(0, 0), P(10, 0), P(10, 10), P(0, 10)];
      ctx.beginPath(); ctx.moveTo(c[0][0], c[0][1] + 9); ctx.lineTo(c[1][0], c[1][1] + 9); ctx.lineTo(c[1][0], c[1][1]); ctx.lineTo(c[0][0], c[0][1]); ctx.closePath(); ctx.fillStyle = INK(0.62); ctx.fill();   // 枰的厚
      ctx.beginPath(); c.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fillStyle = w.col('cream', 0.96); ctx.fill(); ctx.fillStyle = w.col('warm', 0.2); ctx.fill();
      ctx.save(); ctx.clip(); softDot(ctx, c[3][0] + 34, c[3][1] + 8, 64, INK(0.16), INK(0)); softDot(ctx, c[1][0] - 26, c[1][1] - 10, 50, w.col('paper', 0.45), w.col('paper', 0)); ctx.restore();   // 木色不匀：一头墨重，一头泛白
      ctx.strokeStyle = INK(0.46); ctx.lineWidth = 0.6; ctx.beginPath();
      for (let i = 1; i <= 9; i++) { let a = P(i, 1), b = P(i, 9); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); a = P(1, i); b = P(9, i); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
      ctx.stroke();
      for (let i = 0; i < 4; i++) { const a = c[i], b = c[(i + 1) % 4]; mark(ctx, [a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + (i % 2 ? 0.8 : -0.8), b[0], b[1]], nail(i === 0 ? 2.2 : 1.5), INK(i === 0 ? 0.7 : 0.5)); }   // 四边各一笔
      ctx.save(); ctx.globalAlpha *= k;
      for (let n = 0; n < Math.min(e.n, e.seq.length); n++) {                                            // 子：黑是浓墨一点，白是留白一点
        const p = P(e.seq[n][0], e.seq[n][1]), fresh = n === e.n - 1 ? clamp(1 - (e.next - 0.9) * 2, 0.3, 1) : 1;
        ctx.save(); ctx.translate(p[0], p[1] - (1 - fresh) * 10); ctx.scale(1, 0.56); ctx.globalAlpha *= fresh;
        if (n % 2) { dot(ctx, 0, 0, 5.4, w.col('white', 1)); ctx.strokeStyle = INK(0.5); ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(0, 0, 5.4, 0, TAU); ctx.stroke(); }
        else { dot(ctx, 0, 0, 5.4, DK); dot(ctx, -1.6, -1.8, 1.4, 'rgba(255,255,255,0.3)'); }
        ctx.restore();
      }
      ctx.restore();
      for (const [bx, by, blk] of [[-88, -30, 1], [112, -8, 0]]) {                                       // 棋奁
        ctx.beginPath(); ctx.ellipse(bx, by, 17, 12, 0, 0, TAU); ctx.fillStyle = w.col('red', 0.5); ctx.fill(); ctx.fillStyle = INK(0.5); ctx.fill();
        ctx.beginPath(); ctx.ellipse(bx, by - 6, 13, 5, 0, 0, TAU); ctx.fillStyle = blk ? DK : w.col('white', 0.96); ctx.fill();
        mark(ctx, [bx - 13, by - 6, bx, by - 11.4, bx + 13, by - 6], orchid(1.2), INK(0.7));
        snowcap(ctx, w, bx, by - 9, 13, wi);
      }
      if (sp > 0.03) for (const [i, j, a] of [[3.4, 7.2, 0.4], [7.6, 2.6, 2], [9.2, 8.4, 4]]) { const p = P(i, j); ctx.fillStyle = w.col('pink', 0.85 * sp); ctx.beginPath(); leafPath(ctx, p[0], p[1], a, 6, 3.4, 0.2); ctx.fill(); }
      if (au > 0.03) { const p = P(6.6, 6.4); ctx.fillStyle = w.col('orange', 0.85 * au); ctx.beginPath(); leafPath(ctx, p[0], p[1], 0.5, 15, 7, 0.3); ctx.fill(); mark(ctx, [p[0], p[1], p[0] + 13, p[1] + 7], orchid(0.9), INK(0.5 * au)); }
      if (wi > 0.03) { const p = P(5, 10.4); snowcap(ctx, w, p[0], p[1], 46, wi * 0.8); }
      ctx.restore();
    }
  };

  /* ================= 橘：经冬犹绿。春来碎白的花，夏结青果，秋天满树金红，冬雪里还挂着几枚 ================= */
  Kinds.orange = {
    z: 44, max: 3, zone: 'ground',
    create(e) {
      e.cl = []; for (let k = 0; k < 9; k++) { const a = e.rng() * TAU, r = 16 + e.rng() * 44; e.cl.push([Math.cos(a) * r * 1.25, -128 + Math.sin(a) * r * 0.72, 22 + e.rng() * 14, e.rng()]); }
      e.fr = []; for (let k = 0; k < 16; k++) { const a = e.rng() * TAU, r = 10 + e.rng() * 58; e.fr.push([Math.cos(a) * r * 1.2, -124 + Math.sin(a) * r * 0.74, e.rng(), e.rng() * TAU]); }
      e.ph = e.rng() * 6;
    },
    draw(e, ctx, w) {
      const g = ease(e.age / 2.6), INK = (a) => w.ink(a), t = w.t + e.ph;
      const sp = w.by(1, 0, 0, 0, 0), ripe = w.by(0, 0.15, 1, 1, 0.8), fruit = w.by(0, 0.9, 1, 0.34, 0.8), wi = w.by(0, 0, 0, 1, 0), sway = Math.sin(t * 0.8) * 2;
      ctx.globalAlpha *= g;
      ctx.save(); ctx.translate(e.x, e.y + 62); ctx.scale(1.15, 1.15);
      shadow(ctx, w, 0, 80);
      mark(ctx, [0, 0, -5, -40, 4, -78, -2, -108 * g], (u) => 11 - 6 * u, INK(0.8));                     // 干：一笔到顶，再破两枝
      dry(ctx, [3, -2, -2, -40, 7, -78], () => 6, INK(0.5), 3, 4);
      mark(ctx, [-2, -62, -22, -88, -40, -106], nail(5), INK(0.76)); mark(ctx, [3, -74, 24, -96, 44, -108], nail(4.6), INK(0.74));
      for (const [cx, cy, r, s] of e.cl) {                                                               // 叶：团团浓淡墨绿
        softDot(ctx, cx + sway * s, cy, r * g, w.col('leaf', 0.5 + 0.3 * s), w.col('leaf', 0));
        softDot(ctx, cx + sway * s + 4, cy + 3, r * 0.6 * g, INK(0.2 + 0.2 * s), INK(0));
        for (let k = 0; k < 3; k++) { ctx.fillStyle = w.col('green', 0.7); ctx.beginPath(); leafPath(ctx, cx + sway * s + (k - 1) * r * 0.5, cy + (k % 2 ? -1 : 1) * r * 0.3, -0.6 + k * 1.1 + s * 3, 13 * g, 4.4, 0.2); ctx.fill(); }
      }
      e.fr.forEach(([fx, fy, s, a], k) => {
        if (sp > 0.03 && k % 2 === 0) for (let q = 0; q < 5; q++) dot(ctx, fx + sway * s + Math.cos(a + q * 1.26) * 3.4, fy + Math.sin(a + q * 1.26) * 3.4, 1.9, w.col('white', 0.95 * sp));
        if (fruit > s * 0.96 && g > 0.8) {                                                               // 果：青转金红
          const x = fx + sway * s, r = 5.6 + s * 2;
          softDot(ctx, x, fy, r * 1.1, w.col('leaf', 0.95 * (1 - ripe)), w.col('leaf', 0.6 * (1 - ripe)));
          softDot(ctx, x, fy, r * 1.1, w.col('orange', 0.98 * ripe), w.col('orange', 0.62 * ripe));
          dot(ctx, x - r * 0.3, fy - r * 0.3, r * 0.22, 'rgba(255,255,255,0.4)'); dot(ctx, x + 0.4, fy - r * 0.72, 0.9, DK);
        }
      });
      if (wi > 0.02) for (const [cx, cy, r, s] of e.cl) if (s > 0.3) snowcap(ctx, w, cx, cy - r * 0.5, r * 0.8, wi * 0.9);
      ctx.restore();
    }
  };

  /* ================= 瓜：竹架上爬着藤。春抽新蔓，夏开黄花，秋垂大瓜，冬只剩枯藤挂雪 ================= */
  Kinds.melon = {
    z: 46, max: 3, zone: 'ground',
    create(e) {
      e.lv = []; for (let k = 0; k < 11; k++) e.lv.push([-78 + k * 15.6 + e.rng() * 8, -96 - e.rng() * 14 + (k % 3) * 14, 13 + e.rng() * 8, e.rng() * TAU, e.rng()]);
      e.gd = [[-44, -84, 1], [8, -86, 0.82], [50, -84, 0.66]]; e.ph = e.rng() * 6;
    },
    draw(e, ctx, w) {
      const g = ease(e.age / 2.6), INK = (a) => w.ink(a), t = w.t + e.ph;
      const grow = w.by(0.5, 1, 1, 0.3, 0.9) * g, flower = w.by(0.2, 1, 0.1, 0, 0.4), gourd = w.by(0, 0.3, 1, 0, 0.6), wi = w.by(0, 0, 0, 1, 0), dead = w.by(0, 0, 0.25, 1, 0);
      const LEAF = (a) => w.hue('leaf', 'green', 'yellow', 'ink', 'leaf', a), sway = Math.sin(t * 0.9) * 1.6;
      ctx.globalAlpha *= g;
      ctx.save(); ctx.translate(e.x, e.y + 60); ctx.scale(1.15, 1.15);
      shadow(ctx, w, 0, 110);
      for (const px of [-84, 0, 84]) { mark(ctx, [px, 0, px + 2, -56, px - 1, -112], () => 4.6, INK(0.62)); dry(ctx, [px + 2, 0, px + 3, -56, px, -112], () => 3, INK(0.4), 2, px + 90); }   // 架：枯笔竹竿
      mark(ctx, [-100, -104, 0, -110, 100, -104], () => 3.6, INK(0.66)); mark(ctx, [-96, -84, 0, -90, 96, -84], () => 2.6, INK(0.46));
      for (const [x0, y0, x1, y1] of [[-88, -72, -84, -110], [-4, -72, 2, -112], [80, -72, 86, -110]]) mark(ctx, [x0, y0, x1, y1], () => 1.4, INK(0.5));
      // 藤：从左脚盘上去，横过架顶
      const vine = [-80, -2, -92, -40, -74, -74, -86, -104, -40, -112, 0, -104, 40, -114, 80, -104, 96, -92];
      if (brushPath(ctx, vine, (u) => 3.4 - 1.6 * u, null, clamp(grow * 1.15, 0, 1), true)) { ctx.fillStyle = INK(0.74 - 0.2 * dead); ctx.fill(); }
      e.lv.forEach(([lx, ly, r, a, s], k) => {
        if (k / 11 > grow) return;
        const keep = 1 - dead * (s > 0.25 ? 1 : 0.4); if (keep < 0.04) return;
        const x = lx + sway * (0.5 + s), R2 = r * (0.6 + 0.4 * grow);
        ctx.save(); ctx.globalAlpha *= keep; ctx.translate(x, ly); ctx.rotate(a * 0.16 + sway * 0.02 + dead * 0.6);
        for (const dx of [-0.55, 0, 0.55]) softDot(ctx, dx * R2, Math.abs(dx) * R2 * 0.5, R2 * 0.8, LEAF(0.72 - 0.2 * s), LEAF(0.1));   // 泼墨大叶：三团相叠
        softDot(ctx, 0, 2, R2 * 0.6, INK(0.26 + 0.2 * s), INK(0));
        for (const dx of [-0.6, 0, 0.6]) mark(ctx, [0, R2 * 0.7, dx * R2 * 0.6, 0, dx * R2 * 1.1, -R2 * 0.5], orchid(1), INK(0.5));   // 叶筋
        ctx.restore();
        if (k % 3 === 1) mark(ctx, strand(x, ly + 6, Math.PI / 2 + (s - 0.5), 20 * grow, t * 2 + k, 5, 0.2), taper(1.3), INK(0.5 * keep));   // 卷须
        if (flower > 0.05 && k % 4 === 2) { for (let q = 0; q < 5; q++) softDot(ctx, x + Math.cos(q * 1.26 + a) * 4.6, ly + 12 + Math.sin(q * 1.26 + a) * 4.6, 4, w.col('yellow', 0.95 * flower), w.col('yellow', 0.3 * flower)); dot(ctx, x, ly + 12, 1.6, w.col('orange', flower)); }
      });
      if (gourd > 0.04) for (const [gx, gy, s] of e.gd) {                                                // 瓜：垂下来，青里透黄
        const L = (34 + 20 * s) * gourd, x = gx + sway * 1.4;
        mark(ctx, [x, gy, x + 1, gy + 9], () => 1.8, INK(0.7));
        if (blot(ctx, [x, gy + 9, x + 2, gy + 9 + L * 0.5, x, gy + 9 + L], (u) => (9 + 13 * Math.sin(Math.PI * Math.pow(u, 0.7))) * gourd * s + 3, w.hue('leaf', 'leaf', 'yellow', 'yellow', 'leaf', 0.86))) {
          ctx.save(); ctx.clip(); softDot(ctx, x - 6, gy + 9 + L * 0.6, 12, w.col('paper', 0.36), w.col('paper', 0)); softDot(ctx, x + 8, gy + 9 + L * 0.7, 14, INK(0.26), INK(0)); ctx.restore();
        }
        for (const dx of [-5, 0, 5]) mark(ctx, [x + dx * 0.4, gy + 12, x + dx * gourd, gy + 9 + L * 0.5, x + dx * 0.5, gy + 6 + L], orchid(0.9), INK(0.3));
      }
      if (wi > 0.02) { for (const px of [-70, -30, 12, 54, 88]) snowcap(ctx, w, px, -110, 20, wi); snowcap(ctx, w, 0, 2, 100, wi * 0.6); }
      ctx.restore();
    }
  };
})();
