/* 词源 · eggs.js — 彩蛋：不提示、不高亮，凑齐了才演的一小段戏
 *
 * MS.Eggs.list 是一张表，每一项：
 *   need: ['酒','剑','灯']      这几个字的灵同在画里（先后不论）；转瞬即逝的灵（剑、雷……）写下后半分钟内都算在场
 *   ch: '曙', times: 9          或者：同一个字接连落下若干次，中间没有别的字
 *   dur                         这段戏多长（秒）
 *   play(run, world)            开场：题句、排好什么时候做什么（run.at）、铺几层画（run.layer）
 *   tick(run, dt, world)        可选：每帧推进
 * 画不另开画布：每一层都是世界里一个 kind 为 'egg' 的灵，按 z 与万物排在一起，所以「留影」也拍得到。
 * 颜色一律经 world.col() / world.ink() 取。戏演完，自己铺的层撤掉，动过的东西（昼夜、日的位置、钟鼓的节拍）还原。
 * 「自在」与手卷里不演；戏演着的时候照样可以写字，写「空」则戏随万象一起散。
 */
(function () {
  'use strict';
  const MS = window.MS, Kinds = MS.Kinds;
  const { clamp, lerp, ease, easeOut, softDot, leafPath, hash1, mulberry, TAU } = MS.util;
  const { mark, strand, swell, taper } = MS.ink;
  const PI = Math.PI;

  const E = (MS.Eggs = { list: [], run: null, hooks: null, streak: { ch: '', n: 0 }, seen: {} });
  const sc = (w) => clamp(Math.min(w.W, w.H) / 640, 0.7, 1.5);
  const play = (type, data) => { if (MS.Audio) MS.Audio.play(type, data); };
  const bloom = (kind, pan) => { if (MS.Audio) MS.Audio.bloom(kind, pan || 0); };
  const panOf = (w, x) => (x / w.W * 2 - 1) * 0.7;
  const last = (a) => a[a.length - 1];

  /* 彩蛋铺的一层：怎么画由这一层自己带着 */
  Kinds.egg = {
    z: 50,
    create() {},
    draw(e, ctx, w) {
      try { e.paint(ctx, w, e.run, e); }
      catch (err) { e.paint = () => {}; e.dying = true; if (!E.warned) { E.warned = true; console.error(err); } }   // 画错了只撤这一层，不拖累整幅画
    }
  };

  /* ---------- 一场戏 ---------- */
  function Run(egg, w) { this.egg = egg; this.w = w; this.t = 0; this.dur = egg.dur; this.cues = []; this.undo = []; this.mine = []; this.over = false; }
  /* 铺一层：z 决定它在万物之间的前后 */
  Run.prototype.layer = function (z, paint) {
    const w = this.w, e = { id: w.uid++, kind: 'egg', ch: '', x: 0, y: 0, age: 0, fade: 1, life: Infinity, z, run: this, paint };
    w.ents.push(e); w.ents.sort((a, b) => a.z - b.z); this.mine.push(e);
    return e;
  };
  /* 往画里放一个现成的灵（铁骑、雷）：它照自己的寿数来去，不随戏撤 */
  Run.prototype.put = function (kind, x, y, extra) {
    const w = this.w, K = Kinds[kind];
    if (!K) return null;
    const e = Object.assign({ id: w.uid++, kind, ch: '', x, y, age: 0, fade: 1, life: K.life || Infinity, seed: (Math.random() * 1e9) | 0, z: K.z || 50 }, extra);
    e.rng = mulberry(e.seed);
    K.create(e, w);
    w.ents.push(e); w.ents.sort((a, b) => a.z - b.z);
    return e;
  };
  Run.prototype.at = function (t, fn) { this.cues.push({ t, fn }); };
  /* a→b 渐入，c→d 渐出 */
  Run.prototype.env = function (a, b, c, d) { return ease((this.t - a) / (b - a)) * (1 - ease((this.t - c) / (d - c))); };
  /* 右侧竖题：src 是题句旁的小字落款，by 是「留影」上的落款，hits 里的字点成朱色 */
  Run.prototype.verse = function (text, src, by, hits) { E.hooks.verse(text ? { text } : null, new Set(hits || []), src, by); };
  /* 入夜（若本来是白昼），戏完天再亮。中途用户自己写了昼、夜、日，就听用户的 */
  Run.prototype.night = function () {
    const w = this.w, r = this;
    if (w.night) return;
    w.night = true; r.nightHeld = true;
    r.undo.push(() => r.dawn());
  };
  Run.prototype.dawn = function () { if (this.nightHeld) { this.nightHeld = false; this.w.night = false; } };

  function start(egg) {
    const w = E.hooks.world, r = new Run(egg, w);
    E.run = r;
    try { egg.play(r, w); } catch (err) { console.error(err); finish(r, 'hard'); return false; }
    r.cues.sort((a, b) => a.t - b.t);
    return true;
  }
  /* how: 'done' 演完 · 'soft' 半途散去（层交给世界慢慢淡掉）· 'hard' 立刻撤干净 */
  function finish(r, how) {
    if (r.over) return;
    r.over = true;
    for (const f of r.undo) { try { f(r, r.w); } catch (err) { /* 还原不了也不能卡住 */ } }
    if (how === 'soft') for (const e of r.mine) e.dying = true;
    else { const mine = new Set(r.mine); r.w.ents = r.w.ents.filter((e) => !mine.has(e)); }
    if (E.run === r) E.run = null;
    E.hooks.verse(null);
  }

  /* ---------- 接到首页上的四个口子 ---------- */
  /* hooks: { world, verse(L, present, src, by), auto() } */
  E.bind = function (hooks) { E.hooks = hooks; };
  /* 落了一个字（不论认不认得）：不认得的字也打断「接连几次」 */
  E.typed = function (ch) {
    const k = MS.Lex.canon[ch];
    if (!k || !MS.CHARS[k]) E.streak = { ch: '', n: 0 };
  };
  function has(w, present, k) {
    if (present.has(k)) return true;
    const K = Kinds[(MS.CHARS[k] || {}).kind], t0 = E.seen[k];
    return !!(K && K.life && K.life < 12 && t0 != null && w.t - t0 < 30);        // 剑光、雷电转瞬即逝：刚写过也算
  }
  /* 一个字化成了灵。返回 true 表示有戏正演着（首页这时不另题《声律启蒙》） */
  E.spawned = function (key) {
    const h = E.hooks, def = MS.CHARS[key];
    if (!h || !def) return false;
    const w = h.world;
    if (def.kind === 'clear') {                                   // 空：万象归空，戏也散
      E.stop(); E.seen = {}; E.streak = { ch: '', n: 0 };
      for (const g of E.list) g.spent = false;
      return false;
    }
    if (h.auto() || (MS.Scroll && MS.Scroll.active)) { E.streak = { ch: '', n: 0 }; return false; }
    if (E.streak.ch === key) E.streak.n++; else E.streak = { ch: key, n: 1 };
    E.seen[key] = w.t;
    if (E.run) {
      if (def.kind === 'night' || def.kind === 'day' || def.kind === 'sun') E.run.nightHeld = false;
      return true;
    }
    const present = w.present();
    for (const g of E.list) {
      if (g.times) {
        if (g.ch === key && E.streak.n >= g.times) { E.streak.n = 0; return start(g); }
        continue;
      }
      if (!g.need.every((k) => has(w, present, k))) { g.spent = false; continue; }   // 拆散过，才能再凑一回
      if (g.spent || g.need.indexOf(key) < 0) continue;
      g.spent = true;
      return start(g);
    }
    return false;
  };
  E.update = function (dt) {
    const r = E.run;
    if (!r) return;
    try {
      if (E.hooks.auto()) { finish(r, 'soft'); return; }
      r.t += dt;
      while (r.cues.length && r.cues[0].t <= r.t) r.cues.shift().fn(r, r.w);
      if (r.egg.tick) r.egg.tick(r, dt, r.w);
      if (r.t >= r.dur) finish(r, 'done');
    } catch (err) { console.error(err); finish(r, 'hard'); }
  };
  /* 半途收场：开卷之前调用（hard），或写了「空」（soft） */
  E.stop = function (hard) { if (E.run) finish(E.run, hard ? 'hard' : 'soft'); };

  /* =====================================================================
   *  几样公用的画法
   * ===================================================================== */

  /* 乌：日中的踆乌，三足。s=1 时身长约二十 */
  function crow(ctx, w, x, y, s, rot, a, flap) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.fillStyle = w.ink(0.84 * a);
    ctx.beginPath(); ctx.ellipse(-1, 0, 10.5, 5.4, -0.12, 0, TAU); ctx.fill();               // 身
    ctx.beginPath(); ctx.arc(9.5, -4.2, 4.1, 0, TAU); ctx.fill();                            // 头
    ctx.beginPath();
    leafPath(ctx, 12, -4.8, 0.25, 8.5, 1.8, 0);                                             // 喙
    leafPath(ctx, -8, 1, PI - 0.32, 13, 4.2, 0); leafPath(ctx, -9, 0, PI - 0.02, 11, 3, 0);  // 尾
    leafPath(ctx, 2, -2, -PI / 2 - 0.8 + flap, 18, 8.6, 0.25);                               // 翅：一片阔的
    ctx.fill();
    ctx.strokeStyle = w.ink(0.8 * a); ctx.lineWidth = 0.9; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = -1; i <= 1; i++) { ctx.moveTo(i * 2.6, 3); ctx.lineTo(i * 3.8 + 1, 9.5); }    // 三足
    ctx.stroke();
    ctx.restore();
  }
  /* 日：与 Kinds.sun 同一种画法，hot 时晕更大 */
  function disc(ctx, w, x, y, rad, a, hot) {
    if (rad < 0.5 || a <= 0.003) return;
    softDot(ctx, x, y, rad * (3.4 + 1.2 * hot), w.col('red', (0.16 + 0.1 * hot) * a), w.col('orange', 0));
    const gr = ctx.createRadialGradient(x - rad * 0.2, y - rad * 0.2, rad * 0.1, x, y, rad);
    gr.addColorStop(0, w.col('orange', 0.92 * a)); gr.addColorStop(0.75, w.col('red', 0.9 * a)); gr.addColorStop(1, w.col('red', 0.55 * a));
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
  }
  /* 一面旗：杆、矛头、一幅随 flow（0 垂 … 1 猎猎）起落的旗 */
  function banner(ctx, w, x, y, h, tilt, flow, ph, s, a) {
    const tx = x + Math.sin(tilt) * h, ty = y - Math.cos(tilt) * h;
    mark(ctx, [x, y, (x + tx) / 2, (y + ty) / 2, tx, ty], () => 2.6 * s, w.ink(0.76 * a));
    ctx.fillStyle = w.ink(0.84 * a); ctx.beginPath(); leafPath(ctx, tx, ty, tilt - PI / 2, 13 * s, 3 * s, 0); ctx.fill();
    const f = ease(flow), ang = lerp(PI / 2 - 0.1, -0.14, f), fx = lerp(x, tx, 0.9), fy = lerp(y, ty, 0.9);
    const pts = strand(fx, fy, ang, lerp(40, 54, f) * s, w.t * (2.4 + 9 * f) + ph, (2.5 + 8 * f) * s, 0.06);
    mark(ctx, pts, (tt) => (21 - 13 * tt) * s, w.col('red', 0.6 * a));
    mark(ctx, pts, taper(2 * s), w.ink(0.34 * a));
    mark(ctx, strand(fx, fy + 3 * s, ang + 0.16, lerp(28, 64, f) * s, w.t * (2.4 + 9 * f) + ph + 1.4, (2 + 6 * f) * s, 0.1), taper(3.4 * s), w.col('red', 0.42 * a));
  }

  /* =====================================================================
   *  一 · 酒 ＋ 剑 ＋ 灯 →「醉里挑灯看剑，梦回吹角连营」
   *      灯下看剑（挑灯、剑光一闪）→ 入梦 → 吹角连营 → 沙场点兵，铁骑冲过 → 天复明
   * ===================================================================== */
  E.list.push({
    id: 'pozhenzi', need: ['酒', '剑', '灯'], dur: 15,
    play(r, w) {
      const W = w.W, H = w.H, s = sc(w);
      const SRC = '辛弃疾 · 破阵子', BY = '辛弃疾《破阵子·为陈同甫赋壮词以寄之》';
      const jar = last(w.find('wine'));                          // 灯与剑就摆在那坛酒旁边
      const jx = jar ? clamp(jar.x, 130 * s, W - 130 * s) : W * 0.42, jy = jar ? jar.y + 44 : H * 0.66, dir = jx > W * 0.6 ? -1 : 1;
      r.night();
      r.verse('醉里挑灯看剑，梦回吹角连营', SRC, BY, ['灯', '剑']);
      r.horns = [];
      r.at(1.3, () => play('lantern'));
      r.at(3.3, () => play('sword', { pan: -0.2 }));
      r.at(4.5, () => play('song', { name: 'dream' }));
      r.at(6.3, () => { r.horns.push(r.t); play('horn', { pan: -0.4 }); });
      r.at(8.9, () => r.verse('马作的卢飞快，弓如霹雳弦惊', SRC, BY));
      r.at(9.3, () => { r.put('riders', W + 90, H * 0.82); play('song', { name: 'riders' }); });
      r.at(10.7, () => play('sword', { pan: 0.4 }));
      r.at(12.6, () => r.dawn());
      r.at(13.6, () => r.verse(null));

      /* 眼前的景退到暗处；入梦时再漫过一重雾 */
      r.layer(70, (ctx) => {
        const v = lerp(0.4, 0.68, ease((r.t - 4.6) / 1.5)) * r.env(0.2, 1.8, 12.2, 14.2), m = r.env(4.2, 5.4, 6.6, 8.4);
        if (v > 0.003) { ctx.fillStyle = w.col('paper', v); ctx.fillRect(0, 0, W, H); }
        if (m <= 0.003) return;
        for (let i = 0; i < 7; i++) {
          const span = W * 1.5, x = (hash1(i * 3.1) * span + r.t * (26 + i * 9)) % span - W * 0.25, y = H * (0.3 + 0.075 * i);
          ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.24);
          softDot(ctx, 0, 0, (240 + 50 * (i % 3)) * s, w.col('paper', 0.62 * m), w.col('paper', 0));
          ctx.restore();
        }
      });

      /* 连营：近大远小的一溜营帐，帐帐有火 */
      const tents = [], n = clamp(Math.round(W / 120), 7, 14);
      for (let i = 0; i < n; i++) {
        const d = i / (n - 1);
        tents.push({ d, x: lerp(W * 0.1, W * 0.86, Math.pow(d, 0.8)) + (hash1(i * 7.3) - 0.5) * 30 * s, y: lerp(H * 0.75, H * 0.57, Math.pow(d, 0.7)) + (i % 2) * 18 * s * (1 - d * 0.6), k: lerp(1.3, 0.5, d) * s, ph: hash1(i * 1.7) * 9 });
      }
      function tent(ctx, T, a, t) {
        if (a <= 0.003) return;
        const fl = 0.78 + 0.22 * Math.sin(t * 13 + T.ph * 3) * Math.sin(t * 7.1 + T.ph);
        ctx.save(); ctx.translate(T.x, T.y); ctx.scale(T.k, T.k);
        softDot(ctx, 50, -2, 96 * fl, w.col('warm', 0.34 * a), w.col('orange', 0));                // 营火的晕
        softDot(ctx, 50, -4, 34 * fl, w.col('orange', 0.5 * a), w.col('orange', 0));
        const g = ctx.createLinearGradient(0, -52, 0, 6);                                            // 帐：淡墨晕作体
        g.addColorStop(0, w.ink(0.5 * a)); g.addColorStop(0.7, w.ink(0.3 * a)); g.addColorStop(1, w.ink(0.04 * a));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(-42, 4); ctx.quadraticCurveTo(-14, -20, 0, -52); ctx.quadraticCurveTo(16, -20, 44, 4); ctx.closePath(); ctx.fill();
        mark(ctx, [0, -52, 14, -22, 44, 4], swell(2.4), w.ink(0.7 * a));                              // 受光的一面提线
        mark(ctx, [0, -52, -12, -24, -42, 4], swell(1.2), w.ink(0.34 * a));
        ctx.fillStyle = w.col('warm', 0.5 * a * fl);                                                 // 帐门里透出的光
        ctx.beginPath(); ctx.moveTo(8, 4); ctx.quadraticCurveTo(12, -14, 16, -22); ctx.quadraticCurveTo(20, -12, 26, 4); ctx.closePath(); ctx.fill();
        mark(ctx, [0, -52, 0, -62, 0, -72], () => 1.6, w.ink(0.75 * a));
        mark(ctx, strand(0, -70, 0.1, 22, t * 5 + T.ph, 3, 0.08), taper(6), w.col('red', 0.76 * a));  // 帐顶一面小旗
        softDot(ctx, 50, -5, 13 * fl, w.col('cream', 0.98 * a), w.col('orange', 0));                  // 火
        mark(ctx, strand(50, -10, -PI / 2 + 0.15, 56, t * 1.3 + T.ph, 7, 0.04), taper(3), w.ink(0.13 * a));
        ctx.restore();
      }
      r.layer(71, (ctx) => {
        const t = r.t, a = r.env(5.4, 6.8, 12.6, 14.4);
        if (a <= 0.003) return;
        for (let j = 0; j < 3; j++) mark(ctx, [W * (0.02 + j * 0.1), H * (0.78 + j * 0.035), W * (0.4 + j * 0.08), H * (0.775 + j * 0.035), W * (0.82 + j * 0.06), H * (0.79 + j * 0.035)], swell(2.2 * s), w.ink(0.13 * a));   // 沙场
        for (let i = n - 1; i >= 0; i--) tent(ctx, tents[i], a * ease((t - 5.6 - tents[i].d * 2) / 0.9), w.t);
        banner(ctx, w, W * 0.13, H * 0.79, 150 * s, 0.04, 0.85, 0.5, s * 1.1, a * ease((t - 6) / 0.9));
        banner(ctx, w, W * 0.19, H * 0.74, 112 * s, -0.03, 0.8, 2.1, s * 0.85, a * ease((t - 6.2) / 0.9));
        /* 吹角的人 */
        const ha = a * ease((t - 5.8) / 0.8), k = s * 1.05;
        ctx.save(); ctx.translate(W * 0.31, H * 0.76); ctx.scale(k, k);
        softDot(ctx, 0, -30, 46, w.ink(0.12 * ha), w.ink(0));
        mark(ctx, [-4, 0, -2, -24, 3, -46], (tt) => 20 - 8 * tt, w.ink(0.8 * ha));                  // 袍
        ctx.fillStyle = w.ink(0.86 * ha); ctx.beginPath(); ctx.arc(6, -55, 7, 0, TAU); ctx.fill();
        mark(ctx, [2, -42, 11, -45, 16, -52], taper(6), w.ink(0.8 * ha));                           // 臂
        mark(ctx, [11, -54, 26, -55, 40, -64, 48, -82], (tt) => 1.8 + 6.5 * tt * tt, w.ink(0.86 * ha));   // 角：由细而阔
        mark(ctx, strand(-2, -30, PI * 0.9, 20, w.t * 3, 3, 0.1), taper(4), w.col('red', 0.76 * ha));
        ctx.lineCap = 'round';
        for (const h0 of r.horns) for (let j = 0; j < 3; j++) {                                       // 角声：一圈圈荡出去
          const u = (t - h0 - j * 0.38) / 2.4;
          if (u <= 0 || u >= 1) continue;
          ctx.strokeStyle = w.ink(0.36 * (1 - u) * ha); ctx.lineWidth = 2.6 * (1 - u) + 0.5;
          ctx.beginPath(); ctx.arc(48, -82, 14 + u * 200, -1.15 - 0.62, -1.15 + 0.62); ctx.stroke();
        }
        ctx.restore();
      });

      /* 灯下看剑 */
      r.layer(72, (ctx) => {
        const t = r.t, a = r.env(0.2, 1.4, 4.8, 6.3);
        if (a <= 0.003) return;
        const fl = ease((t - 1.3) / 0.5), dream = ease((t - 4.3) / 1.7);
        const flick = 0.92 + 0.08 * Math.sin(w.t * 11) * Math.sin(w.t * 6.3);
        const k = 1.5 * s, lx = jx + (dir > 0 ? -104 : 150) * s, ly = jy, fy = ly - 60 * k;      // 盏在坛右，灯让开它
        // 灯晕：一挑则亮；入梦时晕开，漫过满纸
        softDot(ctx, lx, fy - 8 * k, (90 + 150 * fl + 560 * dream) * s * flick, w.col('warm', (0.22 + 0.2 * fl) * a * (1 - 0.35 * dream)), w.col('orange', 0));
        ctx.globalAlpha *= a;
        mark(ctx, [jx - 300 * s, jy + 5 * s, jx, jy + 2 * s, jx + 300 * s, jy + 6 * s], swell(2.4 * s), w.ink(0.3));    // 案
        // 灯檠：座、柱、盏
        softDot(ctx, lx, ly, 46 * k, w.ink(0.14), w.ink(0));
        mark(ctx, [lx - 20 * k, ly, lx, ly + 2 * k, lx + 20 * k, ly], swell(6 * k), w.ink(0.82));
        mark(ctx, [lx, ly, lx - 1.5 * k, ly - 28 * k, lx, ly - 56 * k], () => 3.4 * k, w.ink(0.78));
        mark(ctx, [lx - 18 * k, fy, lx, ly - 53 * k, lx + 18 * k, fy], swell(6 * k), w.ink(0.84));
        const fh = (13 + 11 * fl) * k * flick, sway = Math.sin(w.t * 3.1) * 0.08;
        softDot(ctx, lx, fy - 8 * k, fh * 1.6, w.col('cream', 0.9), w.col('warm', 0));
        ctx.fillStyle = w.col('orange', 0.9); ctx.beginPath(); leafPath(ctx, lx, fy, -PI / 2 + sway, fh * 1.5, fh * 0.36, 0); ctx.fill();
        ctx.fillStyle = w.col('cream', 0.95); ctx.beginPath(); leafPath(ctx, lx, fy, -PI / 2 + sway, fh * 0.9, fh * 0.2, 0); ctx.fill();
        // 剑：从案上慢慢举到灯前
        const u = ease((t - 2) / 1.5), el = lerp(0.08, 0.52, u), ang = dir > 0 ? PI + el : -el, L = 236 * s;
        const hx = jx + dir * lerp(330, 296, u) * s, hy = jy - lerp(10, 46, u) * s;
        ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang);
        softDot(ctx, L * 0.5, 0, L * 0.5, w.ink(0.1), w.ink(0));
        ctx.beginPath(); ctx.moveTo(0, -5.4 * s); ctx.lineTo(L * 0.86, -4 * s); ctx.lineTo(L, 0); ctx.lineTo(L * 0.86, 4 * s); ctx.lineTo(0, 5.4 * s); ctx.closePath();
        const bg = ctx.createLinearGradient(0, 0, L, 0);                                              // 剑身：留白为刃
        bg.addColorStop(0, w.col('white', 0.62)); bg.addColorStop(0.5, w.col('white', 0.94)); bg.addColorStop(1, w.col('white', 0.74));
        ctx.fillStyle = bg; ctx.fill();
        softDot(ctx, L * 0.7, 0, 40 * s, w.col('warm', 0.34 * fl), w.col('warm', 0));                 // 灯映在刃上
        mark(ctx, [0, -5.4 * s, L * 0.5, -4.8 * s, L * 0.86, -4 * s, L, 0], taper(2.4 * s), w.ink(0.72));   // 一侧提线
        mark(ctx, [0, 0, L * 0.5, 0, L * 0.9, 0], () => 0.8 * s, w.ink(0.26));                        // 脊
        mark(ctx, [0, -13 * s, 0, 0, 0, 13 * s], swell(7 * s), w.ink(0.88));                          // 格
        mark(ctx, [-38 * s, 0, -19 * s, 0, -2 * s, 0], () => 7 * s, w.ink(0.8));                      // 柄
        ctx.fillStyle = w.ink(0.88); ctx.beginPath(); ctx.arc(-42 * s, 0, 6 * s, 0, TAU); ctx.fill();
        const gl = (t - 3.3) / 0.6;                                                                   // 剑光一闪：从格走到锋
        if (gl > 0 && gl < 1) {
          const gx = gl * L, ga = Math.sin(PI * gl);
          softDot(ctx, gx, 0, 44 * s, w.col('white', 0.95 * ga), w.col('white', 0));
          mark(ctx, [gx - 90 * s, 0, gx, 0, gx + 90 * s, 0], swell(3.4 * s), w.col('white', 0.92 * ga));
          mark(ctx, [gx, -34 * s, gx, 0, gx, 34 * s], swell(2.4 * s), w.col('white', 0.85 * ga));
        }
        ctx.restore();
        const px = hx - Math.cos(ang) * 42 * s, py = hy - Math.sin(ang) * 42 * s;                     // 剑穗
        mark(ctx, strand(px, py, PI / 2, 40 * s, w.t * 2.2, 3 * s, 0.06), taper(5 * s), w.col('red', 0.84));
        mark(ctx, strand(px, py, PI / 2 + 0.22, 30 * s, w.t * 2.2 + 1, 3 * s, 0.06), taper(3.6 * s), w.col('red', 0.6));
      });

      /* 弓如霹雳弦惊：一阵箭掠过 */
      r.layer(77, (ctx) => {
        for (let j = 0; j < 9; j++) {
          const u = (r.t - 10.7 - j * 0.07) / 1.0;
          if (u <= 0 || u >= 1) continue;
          const at = (q) => [lerp(W * 1.02, -W * 0.08, q), H * (0.5 + 0.02 * (j % 3)) - Math.sin(PI * q) * H * (0.2 + 0.015 * j) + j * 7 * s];
          const hd = at(u), tl = at(Math.max(0, u - 0.045));
          mark(ctx, [tl[0], tl[1], (tl[0] + hd[0]) / 2, (tl[1] + hd[1]) / 2, hd[0], hd[1]], (tt) => (0.6 + 2 * tt) * s, w.ink(0.8));
        }
      });
    }
  });

  /* =====================================================================
   *  二 · 接连九次落「曙」→ 九日临空
   *      九日并出，纸色烤暖，禾稼焦卷 → 羿一箭一箭射落八个，乌解羽而坠 → 只留原来那一个
   * ===================================================================== */
  E.list.push({
    id: 'jiuri', ch: '曙', times: 9, dur: 14.6,
    play(r, w) {
      const W = w.W, H = w.H, s = sc(w);
      const sun = w.find('sun')[0];
      const rad = Math.min(sun ? sun.r : clamp(Math.min(W, H) * 0.056, 30, 64), W * 0.085);
      const slots = [];
      if (W >= 700) for (let i = 0; i < 9; i++) slots.push({ x: W * (0.1 + 0.8 * i / 8), y: H * (0.28 - 0.11 * Math.sin(PI * i / 8)) });
      else {
        for (let i = 0; i < 5; i++) slots.push({ x: W * (0.14 + 0.72 * i / 4), y: H * 0.17 });
        for (let i = 0; i < 4; i++) slots.push({ x: W * (0.23 + 0.54 * i / 3), y: H * 0.17 + rad * 2.3 });
      }
      let keep = 4;                                             // 留下的那一个：原来的日就近归位
      if (sun) { let best = 1e9; slots.forEach((p, i) => { const d = Math.hypot(p.x - sun.x, p.y - sun.y); if (d < best) { best = d; keep = i; } }); }
      const order = slots.map((p, i) => i).filter((i) => i !== keep).sort((a, b) => Math.abs(a - keep) - Math.abs(b - keep));
      order.forEach((i, k) => { slots[i].born = 0.5 + k * 0.26; slots[i].k = k; });                    // 出：由近及远
      order.slice().reverse().forEach((i, k) => { slots[i].shot = 6.4 + k * 0.62; slots[i].final = k === 7; });   // 射：由远及近
      r.sun = sun || null; r.home = sun ? { x: sun.x, y: sun.y } : null;
      r.slots = slots; r.keep = keep; r.rad = rad; r.heat = 0; r.crows = []; r.s = s;
      // 羿在左下：肩是弓的支点
      const ax = W * 0.15, ay = H * 0.8, ak = 1.15 * s, pvx = ax + 8 * ak, pvy = ay - 60 * ak;
      r.aim = (p) => { const th = Math.atan2(p.y - pvy, p.x - pvx); return { th, x: pvx + Math.cos(th) * 36 * ak, y: pvy + Math.sin(th) * 36 * ak }; };

      r.verse('焦禾稼，杀草木，而民无所食', '淮南子 · 本经训', '《淮南子·本经训》');
      r.at(3.0, () => { play('bell', { pan: 0 }); play('fire'); });
      r.at(5.8, () => r.verse('羿焉彃日，乌焉解羽', '楚辞 · 天问', '《楚辞·天问》', ['日']));
      r.at(13.4, () => r.verse(null));

      /* 纸被烤暖 */
      r.layer(2, (ctx) => {
        const h = r.heat;
        if (h < 0.004) return;
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, w.col('orange', 0.26 * h)); g.addColorStop(0.45, w.col('warm', 0.17 * h)); g.addColorStop(1, w.col('yellow', 0.08 * h));
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      });

      /* 九日，日中各有踆乌 */
      r.layer(7, (ctx) => {
        const t = r.t, day = 1 - w.nightK, h = r.heat;
        slots.forEach((p, i) => {
          if (i === keep && r.sun) {                             // 原来的日：只添一圈热晕、一只乌
            const e = r.sun, a = r.env(0.4, 1.4, r.dur - 2.6, r.dur - 1.2) * day * clamp(e.fade, 0, 1);
            softDot(ctx, e.x, e.y, rad * 4.8, w.col('orange', 0.16 * h * day), w.col('orange', 0));
            crow(ctx, w, e.x, e.y + rad * 0.06, rad / 27, 0, 0.5 * a, Math.sin(w.t * 2 + i) * 0.14);
            return;
          }
          const born = i === keep ? 0.4 : p.born;
          if (t < born) return;
          const g = easeOut((t - born) / 0.7), pulse = 1 + 0.035 * Math.sin(w.t * 5 + i * 1.7);
          let live = 1, a = g * day;
          if (i === keep) a *= 1 - ease((t - (r.dur - 2.2)) / 1.4);
          if (p.hit != null) {                                   // 中箭：一闪，缩成一团墨
            const u = (t - p.hit) / 0.5;
            if (u >= 1) return;
            live = 1 - ease(u);
            softDot(ctx, p.x, p.y, rad * (1.2 + 2.2 * u), w.ink(0.42 * (1 - u) * day), w.ink(0));
            if (u < 0.35) softDot(ctx, p.x, p.y, rad * 2.6, w.col('white', 0.9 * (1 - u / 0.35) * day), w.col('white', 0));
          }
          const y = p.y + (1 - g) * 26;
          disc(ctx, w, p.x, y, rad * (0.5 + 0.5 * g) * pulse * live, a * live, h);
          if (live > 0.6) crow(ctx, w, p.x, y + rad * 0.06, rad / 27 * live, 0, 0.5 * a, Math.sin(w.t * 2 + i) * 0.14);
        });
      });

      /* 焦禾稼：一行禾，先青，后黄，后焦卷 */
      const stalks = [], m = clamp(Math.round(W / 64), 8, 26);
      for (let i = 0; i < m; i++) stalks.push({ x: W * (0.03 + 0.94 * (i + hash1(i * 3.3) * 0.7) / m), y: H * 0.8 + hash1(i * 5.1) * 12 * s, h: (44 + hash1(i * 2.7) * 30) * s, d: hash1(i * 8.9), dir: hash1(i * 6.1) < 0.5 ? -1 : 1 });
      function stalk(ctx, S, wilt, col, a) {
        if (a <= 0.01) return;
        const b = (0.1 + 1.05 * wilt) * S.dir, h = S.h * (1 - 0.12 * wilt);
        const mx = S.x + Math.sin(b * 0.4) * h * 0.55, my = S.y - Math.cos(b * 0.4) * h * 0.55, tx = mx + Math.sin(b) * h * 0.45, ty = my - Math.cos(b) * h * 0.45;
        mark(ctx, [S.x, S.y, mx, my, tx, ty], (tt) => (2.6 - 1.6 * tt) * s, w.col(col, a));
        ctx.fillStyle = w.col(col, a * 0.9);
        ctx.beginPath();
        leafPath(ctx, lerp(S.x, mx, 0.5), lerp(S.y, my, 0.5), -PI / 2 + (0.7 + 0.9 * wilt) * S.dir, h * 0.5, 3.2 * s, 0.3 * S.dir);      // 叶
        leafPath(ctx, lerp(S.x, mx, 0.8), lerp(S.y, my, 0.8), -PI / 2 - (0.6 + 1.0 * wilt) * S.dir, h * 0.42, 2.8 * s, -0.3 * S.dir);
        for (let j = 0; j < 4; j++) leafPath(ctx, lerp(mx, tx, 0.5 + j * 0.16), lerp(my, ty, 0.5 + j * 0.16), b + PI / 2 * S.dir * (j % 2 ? 1 : 0.5) + 0.5 * wilt * S.dir, 9 * s, 2.3 * s, 0);   // 穗
        ctx.fill();
      }
      r.layer(60, (ctx) => {
        const a = r.env(0.5, 1.6, r.dur - 2.6, r.dur - 1.1);
        if (a <= 0.003) return;
        for (const S of stalks) {
          const wilt = ease((r.t - 2.4 - S.d * 1.6) / 2.8), burn = ease((wilt - 0.55) / 0.45);
          stalk(ctx, S, wilt, 'leaf', a * 0.78 * (1 - wilt));
          stalk(ctx, S, wilt, 'yellow', a * 0.8 * wilt * (1 - burn));
          stalk(ctx, S, wilt, 'ink', a * 0.6 * burn);
        }
      });

      /* 羿：跪地引弓 */
      r.layer(72, (ctx) => {
        const t = r.t, a = r.env(5.3, 6.1, r.dur - 2.8, r.dur - 1.4);
        if (a <= 0.003) return;
        let tgt = null, pull = 0;
        for (const p of slots) if (p.shot != null && (!tgt || p.shot < tgt.shot) && t < p.shot + 0.3) tgt = p;
        if (tgt) pull = t < tgt.shot ? clamp((t - (tgt.shot - 0.44)) / 0.38, 0, 1) : 0;
        const th = tgt ? r.aim(tgt).th : (r.lastTh == null ? -0.9 : r.lastTh);
        r.lastTh = th;
        const ca = Math.cos(th), sa = Math.sin(th);
        ctx.save(); ctx.translate(ax, ay); ctx.scale(ak, ak);
        softDot(ctx, 0, -30, 62, w.ink(0.12 * a), w.ink(0));
        mark(ctx, [2, -22, -16, -6, -30, 0], (tt) => 13 - 6 * tt, w.ink(0.78 * a));                  // 后腿跪
        mark(ctx, [2, -22, 18, -20, 18, 0], (tt) => 12 - 6 * tt, w.ink(0.8 * a));                    // 前腿屈
        mark(ctx, [0, -18, 2, -44, 7, -64], (tt) => 22 - 8 * tt, w.ink(0.84 * a));                   // 身
        ctx.fillStyle = w.ink(0.88 * a);
        ctx.beginPath(); ctx.arc(10, -76, 8, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(5, -86, 4, 0, TAU); ctx.fill();                                     // 髻
        mark(ctx, strand(0, -36, PI * 0.86, 24, w.t * 3, 3, 0.1), taper(4.4), w.col('red', 0.8 * a));
        const gx = 8 + ca * 36, gy = -60 + sa * 36, dxh = gx - ca * (14 + 30 * pull), dyh = gy - sa * (14 + 30 * pull);
        const t1x = gx + sa * 42 - ca * 14, t1y = gy - ca * 42 - sa * 14, t2x = gx - sa * 42 - ca * 14, t2y = gy + ca * 42 - sa * 14;
        mark(ctx, [6, -58, (6 + gx) / 2 + sa * 4, (-58 + gy) / 2 - ca * 4, gx, gy], taper(7), w.ink(0.82 * a));          // 推弓的臂
        mark(ctx, [4, -58, (4 + dxh) / 2 - sa * 8, (-58 + dyh) / 2 + ca * 8, dxh, dyh], taper(6.4), w.ink(0.8 * a));     // 引弦的臂
        mark(ctx, [t1x, t1y, gx + ca * 4, gy + sa * 4, t2x, t2y], swell(5), w.ink(0.9 * a));                             // 弓
        ctx.strokeStyle = w.ink(0.7 * a); ctx.lineWidth = 0.9;
        ctx.beginPath(); ctx.moveTo(t1x, t1y); ctx.lineTo(dxh, dyh); ctx.lineTo(t2x, t2y); ctx.stroke();                 // 弦
        if (pull > 0.02) {                                                                                               // 搭着的箭
          mark(ctx, [dxh, dyh, dxh + ca * 40, dyh + sa * 40, dxh + ca * 78, dyh + sa * 78], () => 1.4, w.ink(0.85 * a));
          ctx.fillStyle = w.ink(0.9 * a); ctx.beginPath(); leafPath(ctx, dxh + ca * 74, dyh + sa * 74, th, 11, 2.6, 0); ctx.fill();
        }
        ctx.restore();
      });

      /* 热浪蒸腾 */
      r.layer(83, (ctx) => {
        const h = r.heat;
        if (h < 0.01) return;
        const k = clamp(Math.round(W / 90), 6, 18);
        for (let i = 0; i < k; i++) {
          const x = W * (i + 0.5 + (hash1(i * 5.1) - 0.5) * 0.6) / k, ph = w.t * 2.6 + i * 1.9;
          const rise = (w.t * 0.3 + hash1(i * 2.3)) % 1, y0 = H * 0.88 - rise * H * 0.5, len = H * 0.26, al = h * Math.sin(PI * rise);
          mark(ctx, strand(x, y0, -PI / 2, len, ph, 14 * s, 0), swell(3.4 * s), w.col('orange', 0.14 * al));
          mark(ctx, strand(x + 9 * s, y0 + 14 * s, -PI / 2, len * 0.8, ph + 1.3, 11 * s, 0), swell(1.7 * s), w.col('white', 0.22 * al));
        }
      });

      /* 箭与坠乌 */
      r.layer(84, (ctx) => {
        const t = r.t;
        for (const p of slots) {
          if (p.shot == null || t < p.shot || !p.from) continue;
          const u = (t - p.shot) / 0.22, f = p.from;
          if (u < 1) {
            const hx = lerp(f.x, p.x, u), hy = lerp(f.y, p.y, u), q = Math.max(0, u - 0.3), tx = lerp(f.x, p.x, q), ty = lerp(f.y, p.y, q);
            mark(ctx, [tx, ty, (tx + hx) / 2, (ty + hy) / 2, hx, hy], (tt) => (0.8 + 2.6 * tt) * s, w.ink(0.88));
          } else if (u < 4) {                                    // 箭过处一线余痕
            ctx.strokeStyle = w.ink(0.22 * (1 - (u - 1) / 3)); ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(p.x, p.y); ctx.stroke();
          }
        }
        for (const c of r.crows) {
          const a = clamp(c.age * 5, 0, 1) * clamp(1 - (c.y - H * 0.6) / (H * 0.22), 0, 1);
          if (a > 0.01) crow(ctx, w, c.x, c.y, rad / 27 * 1.2, c.rot, a, Math.sin(c.age * 17) * 0.7);
        }
      });
    },
    tick(r, dt, w) {
      const W = w.W, H = w.H, t = r.t, slots = r.slots;
      // 原来的日：先归位，末了回到用户放它的地方。中途被新写的日替掉，就不再管它
      if (r.sun && (r.sun.dying || w.ents.indexOf(r.sun) < 0)) r.sun = null;
      if (r.sun) {
        const to = t < r.dur - 2.4 ? slots[r.keep] : r.home, k = Math.min(1, dt * 2.6), e = r.sun;
        const dy = (to.y - e.y) * k;
        e.x += (to.x - e.x) * k; e.y += dy; if (e.y0 != null) e.y0 += dy;
      }
      let alive = 0;
      slots.forEach((p, i) => {
        if (i === r.keep) return;
        if (t >= p.born && !p.rung) { p.rung = true; play('stage', { idx: 7 - p.k }); }                 // 一日一声，一声比一声高
        if (t >= p.shot && !p.from) { p.from = r.aim(p); play('ink', { i: 1, pan: -0.5 }); }            // 弦响
        if (t >= p.shot + 0.22 && p.hit == null) {                                                      // 中
          p.hit = t;
          for (let a = 0; a < 6; a++) w.stir(p.x, p.y, Math.cos(a * 1.047) * 420, Math.sin(a * 1.047) * 420, 44);
          w.dye(p.x, p.y, [0.05, 0.16, 0], 24, 0, 220);
          for (let j = 0; j < 4; j++) w.drift(p.x + (Math.random() - 0.5) * 40, p.y + (Math.random() - 0.5) * 30, 'leaf', 'ink');   // 乌焉解羽
          r.crows.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 90, vy: -40, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 7, age: 0 });
          play('drum', { pan: panOf(w, p.x), last: !!p.final });
        }
        if (t >= p.born && p.hit == null) alive++;
      });
      for (const c of r.crows) { c.age += dt; c.vy += 300 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.vr * dt; }
      // 热：八个添上去的日还剩几个
      const to = ease((t - 0.8) / 2.4) * (alive / 8) * (1 - w.nightK) * (t < r.dur - 2.4 ? 1 : 0);
      r.heat += (to - r.heat) * Math.min(1, dt * 1.8);
      const h = r.heat, b = w.tint || [1, 1, 1];
      if (w.fluid && w.fluid.tint) w.fluid.tint = [b[0] * (1 + 0.03 * h), b[1] * (1 - 0.04 * h), b[2] * (1 - 0.12 * h)];
      if (Math.random() < dt * 5 * h) w.fluid.splat(Math.random() * W, H * (0.78 + Math.random() * 0.1), w.wind * 160, -460, [0.03, 0.012, 0], 28);   // 地上冒烟
      if (Math.random() < dt * 2.4 * h) w.drift(Math.random() * W, H * (0.2 + Math.random() * 0.3), 'leaf', Math.random() < 0.5 ? 'orange' : 'ink');   // 杀草木：焦叶
      if (Math.random() < dt * 3 * h) play('crackle');
    }
  });

  /* =====================================================================
   *  三 · 梅 ＋ 雪 →「梅须逊雪三分白，雪却输梅一段香」
   *      雪紧了，枝头积白 → 暗香一缕缕浮出来，红瓣杂在雪里
   * ===================================================================== */
  E.list.push({
    id: 'xuemei', need: ['梅', '雪'], dur: 11,
    play(r, w) {
      const W = w.W, H = w.H, s = sc(w);
      r.verse('梅须逊雪三分白，雪却输梅一段香', '卢梅坡 · 雪梅', '宋 · 卢梅坡《雪梅》', ['梅', '雪']);
      let tips = [];
      for (const e of w.find('plum')) {                          // 梅枝的梢头；刚写的梅要等它长出来
        const wait = clamp(3.3 - e.age, 0, 3.3), T = e.tree && e.tree.tips;
        if (T && T.length) { for (const p of T) if (isFinite(p.x) && isFinite(p.y)) tips.push({ x: p.x, y: p.y, bud: !!p.bud, wait }); }
        else for (let i = 0; i < 14; i++) tips.push({ x: e.x + (hash1(i * 3.3 + e.id) - 0.5) * 200 * s, y: e.y + (hash1(i * 7.7 + e.id) - 0.5) * 130 * s, wait });
      }
      tips = tips.filter((p) => p.x > 4 && p.x < W - 4 && p.y > 4 && p.y < H - 4);
      if (tips.length > 54) { const st = tips.length / 54; tips = tips.filter((p, i) => Math.floor(i / st) !== Math.floor((i - 1) / st)); }
      tips.forEach((p, i) => { p.d = p.wait + hash1(i * 9.1 + 0.3) * 2.2; p.r = (5.5 + hash1(i * 4.7) * 4) * s; });
      r.tips = tips; r.blooms = tips.filter((p) => !p.bud);
      if (!r.blooms.length) r.blooms = tips;
      r.fl = [];
      for (let i = 0; i < 130; i++) r.fl.push({ x: Math.random() * W, y: Math.random() * H, r: (1.2 + Math.random() * 2.6) * s, v: 50 + Math.random() * 70, ph: Math.random() * TAU });
      const wisps = [];
      for (let j = 0; j < Math.min(9, r.blooms.length); j++) {
        const p = r.blooms[Math.floor(hash1(j * 5.3 + 1) * r.blooms.length)];
        wisps.push({ p, st: 5.2 + j * 0.28, dir: p.x < W / 2 ? 1 : -1, len: (170 + hash1(j * 2.9) * 130) * s, ph: j * 2.1 });
      }
      r.at(0.2, () => bloom('snow'));
      r.at(5.2, () => bloom('plum'));
      r.at(9.8, () => r.verse(null));

      /* 枝头积雪 */
      r.layer(63, (ctx) => {
        const t = r.t, day = 1 - w.nightK;
        for (const p of tips) {
          const g = ease((t - p.d) / 1.6) * (1 - ease((t - 8.2) / 2.2));
          if (g <= 0.01) continue;
          const rx = p.r * 1.3 * g, ry = p.r * 0.62 * g, y = p.y - p.r * 0.55;
          softDot(ctx, p.x, y, rx * 1.8, w.col('white', 0.3 * g), w.col('white', 0));
          ctx.fillStyle = w.col('white', 0.96 * g);
          ctx.beginPath(); ctx.ellipse(p.x, y, rx, ry, 0, PI, TAU); ctx.quadraticCurveTo(p.x + rx * 0.5, y + ry * 0.7, p.x, y + ry * 0.45); ctx.quadraticCurveTo(p.x - rx * 0.5, y + ry * 0.7, p.x - rx, y); ctx.fill();
          if (day > 0.3) mark(ctx, [p.x - rx, y, p.x - rx * 0.4, y + ry * 0.6, p.x, y + ry * 0.45, p.x + rx * 0.5, y + ry * 0.66, p.x + rx, y], swell(1.1 * s), w.ink(0.26 * g * day));   // 白昼里雪靠一线淡墨托出来
        }
      });
      /* 暗香 */
      r.layer(79, (ctx) => {
        const t = r.t, out = 1 - ease((t - 8.6) / 2);
        const fr = ease((t - 5) / 1.5) * out;
        if (fr <= 0.003) return;
        for (const p of r.blooms) softDot(ctx, p.x, p.y, p.r * 3.2, w.col('pink', 0.16 * fr), w.col('pink', 0));
        for (const q of wisps) {
          const g = ease((t - q.st) / 2.4);
          if (g <= 0.01) continue;
          const ang = -PI / 2 + q.dir * (0.75 + 0.2 * Math.sin(w.t * 0.5 + q.ph));
          mark(ctx, strand(q.p.x, q.p.y, ang, q.len * g * 0.85, w.t * 1.3 + q.ph, 36 * s, -0.16 * q.dir), taper(4.4 * s), w.col('pink', lerp(0.28, 0.5, w.nightK) * out));
          mark(ctx, strand(q.p.x + 6 * s, q.p.y - 4 * s, ang + 0.14 * q.dir, q.len * g * 0.66, w.t * 1.3 + q.ph + 1.6, 26 * s, -0.2 * q.dir), taper(2.2 * s), w.col('cream', lerp(0.3, 0.42, w.nightK) * out));
        }
      });
      /* 雪紧 */
      r.layer(82, (ctx) => {
        const k = r.env(0, 1.2, 6.5, 9.4), nn = (r.fl.length * k) | 0;
        if (!nn) return;
        ctx.fillStyle = w.col('white', 0.94);
        ctx.beginPath();
        for (let i = 0; i < nn; i++) { const f = r.fl[i]; ctx.moveTo(f.x + f.r, f.y); ctx.arc(f.x, f.y, f.r, 0, TAU); }
        ctx.fill();
        if (w.nightK < 0.5) { ctx.strokeStyle = w.ink(0.16); ctx.lineWidth = 0.6; ctx.stroke(); }
      });
    },
    tick(r, dt, w) {
      for (const f of r.fl) {
        f.ph += dt * 1.6; f.y += f.v * dt; f.x += (Math.sin(f.ph) * 18 + w.wind * 150) * dt;
        if (f.y > w.H + 6) { f.y = -6; f.x = Math.random() * w.W; }
        if (f.x < -10) f.x = w.W + 10; else if (f.x > w.W + 10) f.x = -10;
      }
      if (r.t > 5.4 && r.t < 8.8 && r.blooms.length && Math.random() < dt * 5) { const p = r.blooms[(Math.random() * r.blooms.length) | 0]; w.drift(p.x, p.y, 'petal', 'red'); }
    }
  });

  /* =====================================================================
   *  四 · 舟 ＋ 月 ＋ 钟 →「姑苏城外寒山寺，夜半钟声到客船」
   *      入夜，钟后浮出一座山寺 → 钟自己响三声，钟声一圈圈荡到船上，船头渔火应一下
   * ===================================================================== */
  E.list.push({
    id: 'fengqiao', need: ['舟', '月', '钟'], dur: 13.5,
    play(r, w) {
      const W = w.W, H = w.H, s = sc(w);
      r.night();
      r.verse('姑苏城外寒山寺，夜半钟声到客船', '张继 · 枫桥夜泊', '唐 · 张继《枫桥夜泊》', ['钟', '舟']);
      r.bell = last(w.find('bell')) || null; r.boat = last(w.find('boat')) || null;
      const bx = r.bell ? r.bell.x : W * 0.3, by = r.bell ? r.bell.y : H * 0.3;
      const alive = (e) => e && !e.dying && w.ents.indexOf(e) >= 0;
      r.tolls = [];
      const toll = () => {
        if (alive(r.bell)) r.bell.next = 0; else play('bell', { pan: panOf(w, bx) });      // 让钟自己响：它会荡、会出声
        r.tolls.push({ t: r.t, got: false });
      };
      r.at(0.6, () => { if (alive(r.bell)) r.bell.next = 99; });
      r.at(2.3, toll); r.at(5.5, toll); r.at(8.7, toll);
      r.at(10.6, () => r.dawn());
      r.at(12.2, () => r.verse(null));
      const boatAt = () => (alive(r.boat) ? { x: r.boat.x, y: r.boat.y, dir: r.boat.dir || 1 } : { x: W * 0.62, y: H * 0.78, dir: 1 });
      r.boatAt = boatAt; r.from = { x: bx, y: by + 20 };

      /* 寒山寺：一抹远山，一殿一塔 */
      r.layer(27, (ctx) => {
        const a = r.env(0.8, 2.6, 10.4, 12.6);
        if (a <= 0.003) return;
        const ty = by + 92 * s;
        ctx.save(); ctx.translate(bx, ty + 26 * s); ctx.scale(1, 0.3);
        softDot(ctx, 0, 0, 280 * s, w.ink(0.2 * a), w.ink(0));
        ctx.restore();
        mark(ctx, [bx - 260 * s, ty + 34 * s, bx - 100 * s, ty + 6 * s, bx + 40 * s, ty + 2 * s, bx + 270 * s, ty + 32 * s], swell(2 * s), w.ink(0.3 * a));
        // 殿：屋身只是一抹淡墨，往下化开；屋顶浓些，脊上提一笔
        ctx.save(); ctx.translate(bx + 96 * s, ty + 2 * s); ctx.scale(s, s);
        let g = ctx.createLinearGradient(0, -28, 0, 2);
        g.addColorStop(0, w.ink(0.3 * a)); g.addColorStop(1, w.ink(0.03 * a));
        ctx.fillStyle = g; ctx.fillRect(-42, -27, 84, 29);
        softDot(ctx, 0, -11, 15, w.col('warm', 0.62 * a * w.nightK), w.col('orange', 0));               // 殿里一点灯
        g = ctx.createLinearGradient(0, -48, 0, -22);
        g.addColorStop(0, w.ink(0.66 * a)); g.addColorStop(1, w.ink(0.3 * a));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(-62, -24); ctx.quadraticCurveTo(-44, -30, -30, -46); ctx.lineTo(30, -46); ctx.quadraticCurveTo(44, -30, 62, -24); ctx.quadraticCurveTo(40, -21, 0, -23); ctx.quadraticCurveTo(-40, -21, -62, -24); ctx.fill();
        mark(ctx, [-32, -47, 0, -49, 32, -47], swell(2.6), w.ink(0.74 * a));
        mark(ctx, [-62, -24, -44, -30, -30, -46], taper(2), w.ink(0.5 * a)); mark(ctx, [62, -24, 44, -30, 30, -46], taper(2), w.ink(0.5 * a));
        ctx.restore();
        // 塔：一层一笔檐，塔身淡淡带过
        ctx.save(); ctx.translate(bx - 118 * s, ty + 4 * s); ctx.scale(s, s);
        softDot(ctx, 0, -40, 44, w.ink(0.1 * a), w.ink(0));
        let y = 0;
        for (let j = 0; j < 5; j++) {
          const hw = 17 - j * 2.4;
          mark(ctx, [0, y, 0, y - 8, 0, y - 15], () => hw * 1.7, w.ink((0.2 - j * 0.015) * a));
          y -= 15;
          mark(ctx, [-hw - 9, y + 2, -hw * 0.4, y - 1.5, 0, y - 2.5, hw * 0.4, y - 1.5, hw + 9, y + 2], swell(3.2), w.ink(0.66 * a));
        }
        mark(ctx, [0, y - 2, 0, y - 13, 0, y - 24], taper(2.6), w.ink(0.74 * a));
        ctx.restore();
        ctx.save(); ctx.translate(bx - 20 * s, ty + 40 * s); ctx.scale(1, 0.2);                      // 山脚的雾
        softDot(ctx, 0, 0, 320 * s, w.col('paper', 0.7 * a), w.col('paper', 0));
        ctx.restore();
      });
      /* 钟声到客船 */
      r.layer(57, (ctx) => {
        const t = r.t, a = r.env(0.6, 1.8, 11, 12.8), B = boatAt(), F = r.from;
        if (a <= 0.003) return;
        const dx = B.x - F.x, dy = B.y - F.y, dist = Math.hypot(dx, dy) || 1, th = Math.atan2(dy, dx);
        ctx.lineCap = 'round';
        let glow = 0;
        for (const c of r.tolls) {
          const u = (t - c.t) / 1.9;
          if (u > 0 && u < 1.08) for (let j = 0; j < 3; j++) {                                       // 朝着船去的几道弧
            const q = u - j * 0.07;
            if (q <= 0.02 || q >= 1) continue;
            ctx.strokeStyle = w.col('green', 0.42 * (1 - q * 0.55) * a); ctx.lineWidth = (2.6 - j * 0.6) * (1 - q * 0.5) * s;
            ctx.beginPath(); ctx.arc(F.x, F.y, dist * q, th - 0.4, th + 0.4); ctx.stroke();
          }
          const v = (t - c.t - 1.9) / 2.4;
          if (v > 0 && v < 1) {                                                                       // 到了：船边水纹荡开
            glow = Math.max(glow, 1 - v);
            for (let j = 0; j < 2; j++) {
              const q = v - j * 0.18;
              if (q <= 0) continue;
              ctx.strokeStyle = w.ink(0.34 * (1 - q) * a); ctx.lineWidth = 1.2;
              ctx.beginPath(); ctx.ellipse(B.x, B.y + 10, (34 + q * 130) * s, (7 + q * 24) * s, 0, 0, TAU); ctx.stroke();
            }
          }
        }
        // 船头一点渔火
        const fl = 0.85 + 0.15 * Math.sin(w.t * 9) * Math.sin(w.t * 5.3), lx = B.x - B.dir * 34, ly = B.y - 12;
        softDot(ctx, lx, ly, (30 + 40 * glow) * s * fl, w.col('warm', (0.34 + 0.3 * glow) * a), w.col('orange', 0));
        softDot(ctx, lx, ly, 4.2 * s, w.col('cream', 0.95 * a), w.col('warm', 0));
        ctx.save(); ctx.translate(lx, B.y + 16 * s); ctx.scale(0.3, 1);
        softDot(ctx, 0, 0, 30 * s, w.col('warm', (0.2 + 0.2 * glow) * a), w.col('orange', 0));       // 水里的倒影
        ctx.restore();
      });
    },
    tick(r, dt, w) {
      for (const c of r.tolls) if (!c.got && r.t - c.t >= 1.9) {
        c.got = true;
        const B = r.boatAt();
        for (let a = 0; a < 6; a++) w.stir(B.x, B.y + 8, Math.cos(a * 1.047) * 240, Math.sin(a * 1.047) * 90, 60);
        play('ink', { i: 7, pan: panOf(w, B.x) });
      }
    }
  });

  /* =====================================================================
   *  五 · 接连三次落「鼓」→「一鼓作气，再而衰，三而竭」
   *      鼓后立起一排旗：第一通猎猎，第二通半垂，第三通只剩一声轻响，旗都耷拉了
   * ===================================================================== */
  E.list.push({
    id: 'yigu', ch: '鼓', times: 3, dur: 9,
    play(r, w) {
      const W = w.W, H = w.H, s = sc(w);
      const d = last(w.find('drum')) || null;
      const x = d ? d.x : W / 2, y = d ? d.y : H * 0.72;
      r.verse('一鼓作气，再而衰，三而竭', '左传 · 庄公十年', '《左传·庄公十年》', ['鼓']);
      r.qi = 0; r.qiTo = 0; r.beats = [];
      if (d) { d.next = 99; d.queue = []; r.undo.push(() => { d.next = 5; }); }      // 这一会儿鼓听戏的，演完再还它自己的点子
      const beat = (i) => () => {
        const k = [1, 0.5, 0.14][i], pan = panOf(w, x);
        r.beats.push({ t: r.t, k }); r.qiTo = k;
        if (d) d.hit = Math.max(0.3, k);
        for (let a = 0; a < 8; a++) w.stir(x, y, Math.cos(a * 0.785) * 1000 * k, Math.sin(a * 0.785) * 1000 * k, 64);
        if (i === 0) { play('drum', { pan, last: true }); play('thunder', { pan }); }
        else if (i === 1) play('drum', { pan });
        else play('stage', { idx: 7 });
      };
      r.at(1.0, beat(0)); r.at(3.4, beat(1)); r.at(5.8, beat(2));
      r.at(7.2, () => { r.qiTo = 0; });
      r.at(7.8, () => r.verse(null));

      const flags = [];
      for (let i = 0; i < 7; i++) flags.push({ x: x + (i - 3) * 54 * s + (hash1(i * 4.1) - 0.5) * 14 * s, y: y + (46 + Math.abs(i - 3) * 3) * s, h: (128 + hash1(i * 2.3) * 30 - Math.abs(i - 3) * 6) * s, lean: (hash1(i * 6.7) - 0.5) * 0.7, ph: i * 1.3 });
      /* 鼓后的旗 */
      r.layer(63, (ctx) => {
        const a = r.env(0.1, 0.8, 7.6, 8.9);
        if (a <= 0.003) return;
        flags.forEach((f, i) => {
          const g = ease((r.t - 0.1 - i * 0.05) / 0.7);
          if (g > 0.01) banner(ctx, w, f.x, f.y, f.h * g, f.lean * (1 - ease(r.qi * 1.6)) * (r.beats.length ? 1 : 0.15), r.qi, f.ph, s, a);
        });
      });
      /* 鼓声的圈、鼓上的气 */
      r.layer(65, (ctx) => {
        const t = r.t, a = r.env(0.1, 0.8, 7.6, 8.9);
        if (a <= 0.003) return;
        for (let j = 0; j < 5; j++)
          mark(ctx, strand(x + (j - 2) * 12 * s, y - 22 * s, -PI / 2 + (j - 2) * 0.1, (36 + 250 * r.qi) * s, w.t * (1.5 + 3 * r.qi) + j * 1.7, 9 * s, 0), taper((4 + 10 * r.qi) * s), w.ink((0.16 + 0.2 * r.qi) * a));
        for (const b of r.beats) {
          const u = (t - b.t) / 1.9;
          if (u <= 0 || u >= 1) continue;
          if (b.k < 0.3) ctx.setLineDash([5 * s, 9 * s]);                                             // 第三通：圈都连不成了
          for (let j = 0; j < 2; j++) {
            const R = (50 + 440 * b.k) * s * easeOut(u) * (1 - j * 0.22);
            ctx.strokeStyle = w.col('red', (0.2 + 0.3 * b.k) * (1 - u) * a); ctx.lineWidth = ((1.5 + 5.5 * b.k) * (1 - u) + 0.4) * s;
            ctx.beginPath(); ctx.ellipse(x, y, R, R * 0.82, 0, 0, TAU); ctx.stroke();
          }
          ctx.setLineDash([]);
        }
      });
    },
    tick(r, dt) {
      r.qi += (r.qiTo - r.qi) * Math.min(1, dt * (r.qiTo > r.qi ? 9 : 1.6));
      r.qiTo *= Math.exp(-dt * 0.1);
    }
  });

  /* =====================================================================
   *  六 · 龙 ＋ 云 ＋ 雷 →「飞龙在天，利见大人」
   *      四面的云聚到天顶，雷三声，雨一阵，龙腾上去在云里盘 → 云开
   * ===================================================================== */
  E.list.push({
    id: 'feilong', need: ['龙', '云', '雷'], dur: 11.5,
    play(r, w) {
      const W = w.W, H = w.H, s = sc(w);
      r.verse('飞龙在天，利见大人', '周易 · 乾 · 九五', '《周易·乾》九五', ['龙']);
      r.dragon = w.find('dragon')[0] || null;
      const puffs = [];
      for (let i = 0; i < 13; i++) {
        const side = i % 2 ? 1 : -1, tx = W * (0.08 + 0.84 * hash1(i * 3.7 + 1));
        puffs.push({ side, tx, x0: side > 0 ? W + 220 * s : -220 * s, y: H * (0.07 + 0.26 * hash1(i * 5.9)), R: (64 + 60 * hash1(i * 2.1)) * s, d: hash1(i * 7.3) * 1.6, front: i % 4 === 0, ph: i * 1.9 });
      }
      r.at(0.3, () => play('dragon'));
      r.at(2.4, () => r.put('thunder', W * 0.3, H * 0.52));
      r.at(4.8, () => r.put('thunder', W * 0.7, H * 0.56));
      r.at(6.6, () => r.put('thunder', W * 0.5, H * 0.46));
      r.at(10.3, () => r.verse(null));
      const cloud = (ctx, p) => {
        const t = r.t, a = r.env(p.d, p.d + 1.6, 8.4, 10.8);
        if (a <= 0.003) return;
        const x = lerp(p.x0, p.tx, ease((t - p.d) / 2.8)) + p.side * ease((t - 8.4) / 2.6) * W * 0.5 + Math.sin(w.t * 0.4 + p.ph) * 10, y = p.y + Math.sin(w.t * 0.3 + p.ph) * 4, R = p.R;
        ctx.save(); ctx.translate(x, y + R * 0.5); ctx.scale(1, 0.34);
        softDot(ctx, 0, 0, R * 2.3, w.ink(0.3 * a), w.ink(0));                                        // 云脚：一抹浓墨压着
        ctx.restore();
        for (let j = -1; j <= 1; j++) {
          const px = x + j * R * 0.85, py = y + Math.abs(j) * R * 0.16;
          softDot(ctx, px, py + R * 0.2, R, w.ink(0.3 * a), w.ink(0));
          softDot(ctx, px, py - R * 0.3, R * 0.62, w.col('paper', 0.42 * a * (1 - w.nightK)), w.col('paper', 0));   // 云头留白
        }
        const sp = [], hx = x - p.side * R * 0.95, hy = y + R * 0.12;                                 // 云头勾一道回卷的线
        for (let q = 0; q <= 14; q++) { const u = q / 14, an = PI * 0.5 + u * 4.6 * p.side, rr = R * 0.3 * (1 - u * 0.8); sp.push(hx + Math.cos(an) * rr, hy + Math.sin(an) * rr); }
        mark(ctx, sp, taper(2.4 * s), w.ink(0.3 * a));
      };
      /* 天色沉下来 */
      r.layer(4, (ctx) => {
        const k = r.env(0.6, 3, 8, 10.6) * (1 - w.nightK);
        if (k <= 0.003) return;
        const g = ctx.createLinearGradient(0, 0, 0, H * 0.7);
        g.addColorStop(0, w.ink(0.24 * k)); g.addColorStop(1, w.ink(0));
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 0.7);
      });
      r.layer(74, (ctx) => { for (const p of puffs) if (!p.front) cloud(ctx, p); });                  // 龙后的云
      r.layer(78, (ctx) => { for (const p of puffs) if (p.front) cloud(ctx, p); });                   // 龙前的云
      /* 一阵雨 */
      r.layer(80, (ctx) => {
        const k = r.env(2.6, 4, 7.6, 9.4);
        if (k <= 0.003) return;
        ctx.strokeStyle = w.ink(0.3 * k); ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 110; i++) {
          const y = ((hash1(i * 3.7) + w.t * (1.3 + hash1(i * 1.9) * 0.7)) % 1) * (H + 40) - 20, x = hash1(i * 1.3) * W * 1.25 - y * 0.2;
          ctx.moveTo(x, y); ctx.lineTo(x + 3.6, y - 18);
        }
        ctx.stroke();
      });
    },
    tick(r, dt, w) {
      const d = r.dragon;
      if (d && !d.dying && r.t > 0.4 && r.t < 9.2) d.goal = { x: w.W * (0.5 + 0.14 * Math.sin(r.t * 0.9)), y: w.H * 0.25, t: 0.6 };   // 龙往天顶去
    }
  });
})();
