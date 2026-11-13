/* 词源 · chunjiang.js — 人间词话 · 卷三《春江花月夜》（唐 · 张若虚）
 *
 * 十八联分作九段，前面加一方卷首，从右往左铺成一卷（写法同 pipa.js）：
 *   卷首 → 海潮 → 芳甸 → 孤月 → 代代 → 青枫浦 → 月楼 → 鱼雁 → 落花 → 归路
 * 整卷是一条江、一个春夜、一轮月。月不属于哪一段：它跟着镜头走完全卷——
 *   「海上明月共潮生」补上「月」，它从海平线上升起来；走到「皎皎空中孤月轮」正当中天；
 *   「楼上月徘徊」在楼脊上来回；「江潭落月复西斜」沉下去一截；「斜月沉沉藏海雾」没进雾里；卷尾落在江树背后。
 *   所以月的位置写在各段的 moon 里（u 同缺字的 u，dx 是它离镜头中心多远，y 是高低），由 P.luna 一处来画。
 *
 * 字眼照旧只取字面与画意相合的：「青枫浦」是春天的枫，叶是青的，不借字库里霜后的丹枫，另画一株；
 * 「鱼龙潜跃水成文」，鱼和龙真的一潜一跃，出水入水处荡开一圈圈水纹；
 * 「玉户帘中卷不去，捣衣砧上拂还来」，帘子卷上去月光还在，袖子拂过去月光又回来。
 * 「空里流霜」是月光像霜一样淌下来，不借字库里簌簌落的繁霜（夜里看去像满天星，而下一句正是「孤月轮」），另画。
 * 这一卷自己的画法（月、汀洲、楼、镜、帘、砧、潭、碣石、路……）和几样灵（潮、霰、流霜、青枫、月华、跃鱼、流春）都在这里；
 * 其中「潮」进了字库，首页也能写。
 */
(function () {
  'use strict';
  const MS = window.MS, Kinds = MS.Kinds, S = MS.Scroll, P = S.props;
  const { clamp, lerp, ease, softDot, leafPath, noise1, hash1, mulberry, TAU } = MS.util;
  const { mark, strand, swell, taper } = MS.ink;
  const SEA = 800;                                          // 水面的高低：整卷一条线

  /* =====================================================================
   *  一轮月，一镜到底
   * ===================================================================== */
  let L = 0;
  const left = [], MOON = [];                               // 各段的左端；月的关键帧（按卷上的位置从右到左）
  let SLANT_X = 0, SINK_X = 0, TOWER_X = 0;                 // 落月西斜、藏海雾、月徘徊各在卷上何处
  /* 这一卷开着的时候，月的身世记在 S.vol 上：rise / path / full / mirror / wander / slant / sink 各是补上那个字的时刻 */
  const st = () => S.vol.cj || (S.vol.cj = {});
  const since = (t0, d) => (t0 == null ? 0 : ease((S.t - t0) / d));
  /* 镜头在卷上 X 处以左为 1，往右 span 之内退到 0（回看时，后面才有的变化要退回去） */
  const leftOf = (X, span) => ease((X + span - S.cam.x) / span);

  function moon() {
    const M = st();
    if (M.rise == null) return null;
    const q = S.cam.x, K = MOON;
    let a = K[0], b = K[K.length - 1];
    if (q >= a.X) b = a; else if (q <= b.X) a = b;
    else for (let i = 0; i < K.length - 1; i++) if (q <= K[i].X && q >= K[i + 1].X) { a = K[i]; b = K[i + 1]; break; }
    const u = a === b ? 0 : (a.X - q) / (a.X - b.X), half = S.W / 2 / S.k;
    const lim = Math.max(0, half - 120);                      // 画面窄的时候，月也要整个留在画里
    let dx = clamp(lerp(a.dx, b.dx, u), -lim, lim), y = lerp(a.y, b.y, u);
    const up = since(M.rise, 9), full = since(M.full, 4);
    const slant = since(M.slant, 6) * leftOf(SLANT_X, 500), sink = since(M.sink, 7) * leftOf(SINK_X, 700);
    dx += Math.sin(S.t * 0.36) * 54 * since(M.wander, 3) * clamp(1 - Math.abs(q - TOWER_X) / 1100, 0, 1);    // 月徘徊
    y += 130 * slant;                                                                                         // 复西斜
    const r = lerp(48, 58, full) + 9 * clamp((y - 440) / 240, 0, 1);                                          // 近水时显得大些
    return { X: S.cam.x + dx, y: lerp(SEA + r + 30, y, up), r, up, full, slant, sink, M };
  }
  /* 月下是水还是岸：岸上不该有月光的碎影（各段的 land 记着岸在哪几截） */
  function wet(X) {
    let k = 1;
    for (const sec of S.vol.secs) {
      if (!sec.near) continue;
      for (const sp of sec.def.land || []) { const lx = X - sec.x0; k = Math.min(k, 1 - clamp(Math.min(lx - sp[0], sp[1] - lx) / 100 + 0.5, 0, 1)); }
    }
    return k;
  }
  /* 月轮本身借字库里「月」的画法（它以后怎么改，这里跟着改） */
  function disc(w, x, y, r) {
    const M = st(), K = Kinds.moon;
    if (!M.e) { M.e = { id: 0, kind: 'moon', ch: '月', x, y, age: 99, fade: 1, life: Infinity, seed: 7, z: 8 }; M.e.rng = mulberry(7); K.create(M.e, w); }
    M.e.x = x; M.e.y = y; M.e.r = r; M.e.age = 99;
    return M.e;
  }

  P.luna = function (ctx, w, x, y, o, env) {
    if (S.vol.secs.find((s) => s.near) !== env.sec) return;          // 只画一次：由眼前最靠右的那一段来画，压在万物之下
    const m = moon();
    if (!m) return;
    const M = m.M, mx = m.X - env.sec.x0, my = m.y, r = m.r, t = env.t;
    const GLOW = (a) => 'rgba(250,244,214,' + a + ')', WH = (a) => w.col('white', a);
    // 海天之际先亮起来
    const low = clamp((my - 420) / 300, 0, 1);
    if (low > 0) { ctx.save(); ctx.translate(mx, Math.min(my + 60, SEA)); ctx.scale(1, 0.3); softDot(ctx, 0, 0, 640, GLOW(0.16 * low * (0.4 + 0.6 * m.up)), GLOW(0)); ctx.restore(); }
    // 月晕：孤月轮
    if (m.full > 0) {
      softDot(ctx, mx, my, r * 7, GLOW(0.1 * m.full), GLOW(0));
      const hr = r * (3.1 + 0.04 * Math.sin(t * 0.5)), hg = ctx.createRadialGradient(mx, my, hr * 0.58, mx, my, hr);
      hg.addColorStop(0, GLOW(0)); hg.addColorStop(0.5, GLOW(0.085 * m.full)); hg.addColorStop(1, GLOW(0));
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(mx, my, hr, 0, TAU); ctx.fill();
    }
    ctx.save();
    if (m.up < 1) { ctx.beginPath(); ctx.rect(mx - 4000, -3000, 8000, 3000 + SEA + 3); ctx.clip(); }       // 共潮生：从水线底下升上来
    ctx.globalAlpha *= lerp(1, 0.4, m.sink);
    Kinds.moon.draw(disc(w, mx, my, r), ctx, w);
    ctx.restore();
    if (m.slant > 0) softDot(ctx, mx, my, r * 1.02, 'rgba(255,206,140,' + 0.34 * m.slant * (1 - m.sink * 0.5) + ')', 'rgba(255,206,140,' + 0.2 * m.slant + ')');   // 西斜的月是暖的
    // 纤尘：月还没到中天时，面前横着几丝薄云
    const veil = (1 - m.full) * m.up;
    if (veil > 0.02) for (let j = 0; j < 3; j++) mark(ctx, strand(mx - r * 1.9 + j * 14, my - r * 0.45 + j * r * 0.42 + Math.sin(t * 0.3 + j) * 3, 0.03 - j * 0.03, r * 3.8, t * 0.4 + j * 2, 6, 0.01), swell(5 - j), w.col('paper', 0.3 * veil));
    // 藏海雾
    if (m.sink > 0) for (let j = 0; j < 5; j++) {
      ctx.save(); ctx.translate(mx + Math.sin(t * 0.11 + j * 1.9) * 120 + (j - 2) * 60, my + (j - 2) * r * 0.5); ctx.scale(1, 0.24);
      softDot(ctx, 0, 0, 300 + j * 30, w.ink(0.085 * m.sink), w.ink(0));
      ctx.restore();
    }
    // 水里的月
    const wk = wet(m.X), pa = since(M.path, 4) * wk * (1 - m.sink * 0.6) * m.up;
    if (pa > 0.01) {                                                   // 滟滟随波：一柱碎光，近处宽
      ctx.save(); ctx.translate(mx, SEA + 46); ctx.scale(1, 0.45); softDot(ctx, 0, 0, 170, WH(0.2 * pa), WH(0)); ctx.restore();
      ctx.lineCap = 'round';
      for (let j = 0; j < 14; j++) {
        const yy = SEA + 8 + j * 10 + j * j * 0.4, tw = 0.5 + 0.5 * Math.sin(t * (1.3 + (j % 3) * 0.45) + j * 1.9);
        const hw = (14 + j * 5.2) * (0.45 + 0.55 * tw), dx = Math.sin(t * 0.8 + j * 1.3) * (4 + j);
        ctx.strokeStyle = WH((0.82 - j * 0.04) * pa * (0.5 + 0.5 * tw)); ctx.lineWidth = 2.4 - j * 0.08;
        ctx.beginPath(); ctx.moveTo(mx - hw + dx, yy); ctx.lineTo(mx + hw + dx, yy); ctx.stroke();
      }
    }
    const ma = since(M.mirror, 4) * wk * (1 - m.sink) * m.up;
    if (ma > 0.01) {                                                   // 江月年年望相似：水底也有一轮，叫波纹切成几截
      const cy = SEA + 58, rr = r * 0.92;
      ctx.lineCap = 'round';
      for (let j = -4; j <= 4; j++) {
        const v = j / 4.6, hw = rr * Math.sqrt(1 - v * v), dx = Math.sin(t * 1.1 + j * 1.7) * 5;
        ctx.strokeStyle = GLOW(0.6 * ma); ctx.lineWidth = rr * 0.085;
        ctx.beginPath(); ctx.moveTo(mx - hw + dx, cy + v * rr * 0.46); ctx.lineTo(mx + hw + dx, cy + v * rr * 0.46); ctx.stroke();
      }
    }
  };

  /* 滟滟随波千万里：满江的碎光，月下最密 */
  P.glitter = function (ctx, w, x, y, o, env) {
    const m = moon(), on = m ? since(m.M.path, 5) * (1 - m.sink * 0.6) : 0;
    if (on <= 0.01) return;
    const t = env.t, n = o.n || 120, hw = o.w || 1200, mx = m.X - env.sec.x0, land = env.sec.def.land || [];
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const tw = Math.sin(t * (0.8 + hash1(i) * 1.6) + i * 2.4);
      if (tw < 0.05) continue;
      const px = x + (hash1(i * 3.7 + 1) - 0.5) * 2 * hw, d = hash1(i * 9.1 + 4), py = y + 8 + d * d * 170;
      if (land.some((sp) => px > sp[0] - 30 && px < sp[1] + 30)) continue;
      const near = Math.exp(-Math.pow((px - mx) / 620, 2)), edge = clamp((hw - Math.abs(px - x)) / 320, 0, 1);
      const surge = 0.45 + 0.55 * Math.sin(px * 0.011 + py * 0.05 - t * 0.7), len = (2 + Math.pow(hash1(i * 1.3 + 7), 2) * 24) * (0.5 + 0.5 * tw);       // 随波：一阵亮一阵暗
      ctx.strokeStyle = w.col('white', Math.min(1, tw * (0.42 + 0.7 * near) * edge * on * surge * 1.3)); ctx.lineWidth = 1.1 + d * 1.7;
      ctx.beginPath(); ctx.moveTo(px - len, py); ctx.lineTo(px + len, py); ctx.stroke();
    }
  };

  /* 汀洲与岸：低低的一抹淡墨，两头没进水里，上缘提一笔（不是石头，没有硬边） */
  P.isle = function (ctx, w, x, y, o) {
    const W = o.w || 900, h = o.h || 46, sd = o.seed || 1, tone = o.tone || 0.32, n = 40, top = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, en = Math.pow(Math.sin(Math.PI * u), 0.5);
      top.push(x - W / 2 + u * W, y - h * en * (0.62 + 0.38 * noise1(u * W * 0.0042 + sd * 7)) - (noise1(u * W * 0.016 + sd) - 0.5) * 9 * en);
    }
    ctx.beginPath(); ctx.moveTo(top[0], top[1]);
    for (let i = 1; i <= n; i++) ctx.lineTo(top[i * 2], top[i * 2 + 1]);
    ctx.bezierCurveTo(x + W * 0.3, y + 70, x - W * 0.3, y + 70, top[0], top[1]); ctx.closePath();
    const g = ctx.createLinearGradient(0, y - h, 0, y + 46);
    g.addColorStop(0, w.ink(tone)); g.addColorStop(0.5, w.ink(tone * 0.55)); g.addColorStop(1, w.ink(0));
    ctx.fillStyle = g; ctx.fill();
    mark(ctx, top, swell(2.8), w.ink(0.5));
    for (let i = 0; i < 7; i++) {                             // 岸脚几道水痕
      const u = 0.08 + hash1(i * 3.3 + sd) * 0.84, px = x - W / 2 + u * W, len = 40 + hash1(i * 5.1 + sd) * 90;
      mark(ctx, [px - len / 2, y + 8 + (i % 3) * 7, px, y + 9 + (i % 3) * 7, px + len / 2, y + 8 + (i % 3) * 7], swell(1.4), w.ink(0.22));
    }
  };

  /* =====================================================================
   *  潮（进了首页字库）：长浪一道道推过去，潮头卷起来，溅几点白
   * ===================================================================== */
  Kinds.tide = {
    z: 42, max: 2, zone: 'low',
    create(e, w) {
      e.dir = e.x < w.W / 2 ? 1 : -1;                        // 从近的那一边涌向画心
      e.half = clamp(w.W * 0.36, 240, 900);
      e.c = []; e.next = 0.2; e.n = 0;
      for (let i = 0; i < 5; i++) e.c.push({ u: 0.12 + i * 0.17, row: i % 3, sp: 0.05 + e.rng() * 0.02, h: 36 + (i % 3) * 10 + e.rng() * 18, ph: e.rng() * TAU, br: false });   // 一来就是一排
    },
    update(e, dt, w) {
      e.next -= dt;
      if (e.next <= 0 && e.c.length < 11) {
        e.next = (0.9 + Math.random() * 1.1) * 900 / e.half;
        const row = e.n++ % 3;
        e.c.push({ u: 0, row, sp: (0.05 + Math.random() * 0.02) * Math.min(1.6, 900 / e.half), h: 36 + row * 10 + Math.random() * 18, ph: Math.random() * TAU, br: false });
      }
      for (const c of e.c) {
        c.u += c.sp * dt;
        if (Math.random() < dt * 3) w.stir(e.x + e.dir * e.half * (c.u * 2 - 1), e.y + c.row * 30 - 10, e.dir * 130, -20, 40);
        if (!c.br && c.u > 0.55) { c.br = true; if (c.row === 2) w.emit('splash', { pan: 0 }); }
      }
      if (e.c.length && e.c[0].u > 1) e.c = e.c.filter((c) => c.u <= 1);
    },
    draw(e, ctx, w) {
      const d = e.dir, t = w.t;
      ctx.globalAlpha *= ease(e.age / 2.5); ctx.lineCap = 'round';
      for (let j = 0; j < 6; j++) {                           // 长浪
        const yy = e.y + 6 + j * 16, amp = 3 + j * 1.2;
        ctx.strokeStyle = w.ink(0.27 - j * 0.02); ctx.lineWidth = 1.2;
        ctx.beginPath();
        let pen = false;
        for (let u = -1; u <= 1.001; u += 0.02) {
          const edge = Math.cos(u * Math.PI / 2);
          if (noise1(u * 9 + j * 5.3 + d * t * 0.12) < 0.36 || edge < 0.06) { pen = false; continue; }
          const px = e.x + u * e.half, py = yy + Math.sin(u * e.half * 0.012 - d * t * 0.9 + j) * amp * edge;
          if (pen) ctx.lineTo(px, py); else { ctx.moveTo(px, py); pen = true; }
        }
        ctx.stroke();
      }
      for (const c of e.c.slice().sort((a, b) => a.row - b.row)) {       // 潮头：远的小，近的大
        const env = Math.pow(Math.sin(Math.PI * clamp(c.u, 0, 1)), 0.6), h = c.h * env, s = 0.9 + c.row * 0.4;
        if (h < 2) continue;
        ctx.save(); ctx.translate(e.x + d * e.half * (c.u * 2 - 1), e.y + c.row * 30); ctx.scale(d * s, s);
        ctx.save(); ctx.translate(-50, -h * 0.25); ctx.scale(1, 0.34); softDot(ctx, 0, 0, 150, w.ink(0.13 * env), w.ink(0)); ctx.restore();
        mark(ctx, [-190, 5, -120, -h * 0.22, -56, -h * 0.7, -10, -h, 20, -h * 0.9, 34, -h * 0.56, 27, -h * 0.26], swell(6), w.ink(0.6 * env));
        mark(ctx, [-150, 8, -86, -h * 0.16, -34, -h * 0.5, 0, -h * 0.66, 12, -h * 0.5], swell(2.6), w.ink(0.34 * env));
        mark(ctx, [-110, 10, -52, -h * 0.08, -12, -h * 0.3, 2, -h * 0.36], swell(1.8), w.ink(0.24 * env));
        for (let i = 0; i < 7; i++) {                         // 浪花
          const a = c.ph + i * 1.9, fx = 22 + Math.cos(a + t * 2.2) * 9 + i * 3.4, fy = -h * (0.92 - i * 0.1) + Math.sin(a * 1.7 + t * 3) * 4, r = 3 + (i % 3) * 1.8;
          softDot(ctx, fx, fy, r * 2.2, w.col('white', 0.8 * env), w.col('white', 0));
          ctx.strokeStyle = w.ink(0.36 * env); ctx.lineWidth = 0.9;
          ctx.beginPath(); ctx.arc(fx, fy, r, Math.PI * 0.9, Math.PI * 2.2); ctx.stroke();
        }
        ctx.restore();
      }
    }
  };

  /* =====================================================================
   *  画中之物
   * ===================================================================== */

  /* 汀上白沙：月下白成一片，只比月色实一点点 */
  P.sand = function (ctx, w, x, y, o, env) {
    const W = o.w || 800, t = env.t, top = [];
    ctx.save(); ctx.translate(x, y - 4); ctx.scale(1, 0.06); softDot(ctx, 0, 0, W / 2, w.col('white', 0.36), w.col('white', 0)); ctx.restore();
    for (let i = 0; i <= 16; i++) { const u = i / 16; top.push(x - W * 0.44 + u * W * 0.88, y - 4 - Math.sin(Math.PI * u) * 12 - (noise1(u * 6 + x) - 0.5) * 5); }
    mark(ctx, top, swell(1.6), w.col('white', 0.4));
    ctx.fillStyle = w.col('white', 0.55);
    ctx.beginPath();
    for (let i = 0; i < 50; i++) {
      const u = hash1(i * 5.3 + 2), px = x + (u - 0.5) * W * 0.8, py = y - 2 - Math.sin(Math.PI * u) * 9 + hash1(i * 2.1) * 13, tw = 0.5 + 0.5 * Math.sin(t * 1.4 + i * 2.1);
      ctx.moveTo(px + 1.6, py); ctx.arc(px, py, 0.5 + tw * 1.1, 0, TAU);
    }
    ctx.fill();
  };

  /* 人生代代：一个接一个望月的人，越往后越淡，没进雾里 */
  const AGES = [[0, 0.82, 0.92, 0.44, 'point'], [170, 0.62, 0.88, 0.3, 'stand'], [330, 0.48, 0.84, 0.5, 'hold'], [480, 0.37, 0.8, 0.36, 'stand'], [620, 0.27, 0.76, 0.42, 'point'], [750, 0.19, 0.72, 0.3, 'stand'], [870, 0.13, 0.68, 0.4, 'hold']];
  P.ages = function (ctx, w, x, y, o, env) {
    if (o.t0 == null) o.t0 = env.t;
    const el = env.t - o.t0, F = o.f || (o.f = AGES.map((a, i) => ({ dx: a[0], a: a[1], o: { s: a[2], face: -1, tone: a[3], pose: a[4], beard: i % 2 === 0, lean: -0.05, ph: i * 1.7 } })));
    const m = moon(), mx = m ? m.X - env.sec.x0 : x - 500;
    for (let i = F.length - 1; i >= 0; i--) {
      const f = F[i], k = ease((el - i * 1.1) / 2.4);
      if (k <= 0) continue;
      f.o.alpha = f.a * k; f.o.face = x - f.dx > mx ? -1 : 1;                 // 人人都朝着月
      P.man(ctx, w, x - f.dx, y + i * 1.5, f.o, env);
      if (i > 1) softDot(ctx, x - f.dx, y - 16, 70 + i * 8, w.col('paper', 0.1 * i * k), w.col('paper', 0));
    }
  };

  /* 长江送流水：一道道水线往下游去，头重尾轻 */
  P.stream = function (ctx, w, x, y, o, env) {
    const t = env.t, W = o.w || 900;
    for (let j = 0; j < 9; j++) {
      const yy = y + 10 + j * 15, sp = 90 + j * 22, len = 170 + hash1(j * 3.3) * 220, span = W * 2 + len;
      for (let q = 0; q < 2; q++) {
        const head = x + W - ((t * sp + hash1(j * 7.1 + q * 3) * span) % span), a = clamp(Math.min(head - (x - W), x + W - head) / 300, 0, 1), pts = [];
        if (a <= 0) continue;
        for (let i = 0; i <= 8; i++) { const px = head + i / 8 * len; pts.push(px, yy + Math.sin(px * 0.012 + t * 1.5 + j) * (3 + j * 0.4)); }
        mark(ctx, pts, taper(3.4), w.ink(0.34 * a));
      }
    }
  };

  /* 明月楼：台基上两层，下层槛窗，上层敞着，飞檐。part:'front' 只画人前面的栏杆 */
  P.bower = function (ctx, w, x, y, o, env) {
    const s = o.s || 1, INK = (v) => w.ink(v), RED = (v) => w.col('red', v);
    const roof = (ry, rw, rh, rdg, tiles) => {
      ctx.beginPath(); ctx.moveTo(-rw, ry - 16); ctx.quadraticCurveTo(-rw * 0.62, ry + 6, -rdg, ry - rh); ctx.lineTo(rdg, ry - rh); ctx.quadraticCurveTo(rw * 0.62, ry + 6, rw, ry - 16);
      ctx.quadraticCurveTo(rw * 0.5, ry + 11, 0, ry + 9); ctx.quadraticCurveTo(-rw * 0.5, ry + 11, -rw, ry - 16); ctx.closePath();
      const g = ctx.createLinearGradient(0, ry - rh, 0, ry + 10); g.addColorStop(0, INK(0.5)); g.addColorStop(0.6, INK(0.3)); g.addColorStop(1, INK(0.14));
      ctx.fillStyle = g; ctx.fill();
      ctx.save(); ctx.clip();                                // 瓦面不匀：湿一块、干一块
      softDot(ctx, -rw * 0.45, ry - rh * 0.2, rw * 0.5, w.col('paper', 0.3), w.col('paper', 0)); softDot(ctx, rw * 0.5, ry - rh * 0.5, rw * 0.36, INK(0.14), INK(0)); softDot(ctx, rw * 0.1, ry, rw * 0.4, w.col('paper', 0.2), w.col('paper', 0));
      ctx.restore();
      for (let i = -tiles; i <= tiles; i++) { const u = i / tiles; mark(ctx, [u * rdg, ry - rh + 2, u * (rdg + (rw - rdg) * 0.5), ry - rh * 0.42, u * rw * 0.9, ry + 3 - Math.abs(u) * 12], taper(2.2), w.col('paper', 0.3)); }
      mark(ctx, [-rw - 4, ry - 18, -rw * 0.52, ry + 8, 0, ry + 9, rw * 0.52, ry + 8, rw + 4, ry - 18], swell(3.4), INK(0.72));
    };
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (o.part === 'front') {                                // 平座的栏杆，挡在人身前
      ctx.strokeStyle = INK(0.55); ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let px = -236; px <= 236; px += 59) { ctx.moveTo(px, -296); ctx.lineTo(px, -330); }
      ctx.moveTo(-240, -328); ctx.lineTo(240, -328); ctx.moveTo(-240, -312); ctx.lineTo(240, -312);
      ctx.stroke();
      ctx.lineWidth = 0.9; ctx.strokeStyle = INK(0.3); ctx.beginPath();
      for (let px = -236; px < 236; px += 59) { ctx.moveTo(px, -312); ctx.lineTo(px + 59, -298); ctx.moveTo(px + 59, -312); ctx.lineTo(px, -298); }
      ctx.stroke();
      ctx.restore();
      return;
    }
    softDot(ctx, 0, -250, 480, INK(0.07), INK(0));
    const wash = (x0, y0, x1, y1, a0, a1) => { const q = ctx.createLinearGradient(0, y0, 0, y1); q.addColorStop(0, INK(a0)); q.addColorStop(1, INK(a1)); ctx.fillStyle = q; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); };
    let g = ctx.createLinearGradient(0, -42, 0, 30); g.addColorStop(0, INK(0.24)); g.addColorStop(1, INK(0));         // 台基
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-356, 34); ctx.lineTo(-338, -42); ctx.lineTo(338, -42); ctx.lineTo(356, 34); ctx.closePath(); ctx.fill();
    mark(ctx, [-340, -42, 0, -45, 340, -42], swell(2.8), INK(0.52));
    for (let i = 0; i < 4; i++) mark(ctx, [-20 - i * 6, -40 + i * 10, 40, -40 + i * 10, 96 + i * 6, -40 + i * 10], swell(1.2), INK(0.26));           // 几级踏步
    wash(-250, -262, 250, -42, 0.15, 0.03);                                                                           // 下层：柱间一抹淡墨作壁
    ctx.strokeStyle = INK(0.26); ctx.lineWidth = 1; ctx.beginPath();
    for (const bay of [-250, 84]) { for (let i = 1; i < 6; i++) { ctx.moveTo(bay + i * 27.7, -214); ctx.lineTo(bay + i * 27.7, -110); } ctx.moveTo(bay, -214); ctx.lineTo(bay + 166, -214); ctx.moveTo(bay, -110); ctx.lineTo(bay + 166, -110); ctx.moveTo(bay, -162); ctx.lineTo(bay + 166, -162); }
    ctx.stroke();
    wash(-58, -204, 58, -42, 0.17, 0.04); mark(ctx, [0, -42, 0, -204], () => 1.4, INK(0.5));                          // 门
    mark(ctx, [-58, -42, -58, -204, 58, -204, 58, -42], () => 1.6, INK(0.42));
    for (const px of [-250, -84, 84, 250]) { mark(ctx, [px, -42, px, -264], () => 7, RED(0.5)); mark(ctx, [px - 3.5, -42, px - 3.5, -264], () => 1, INK(0.4)); }
    roof(-262, 332, 34, 250, 9);                                                                                      // 腰檐
    ctx.fillStyle = w.col('paper', 0.42); ctx.fillRect(-210, -486, 420, 190);                                         // 上层：屋里暗一层
    ctx.fillStyle = INK(0.05); ctx.fillRect(-210, -486, 420, 190);
    mark(ctx, [-240, -296, 0, -298, 240, -296], swell(2.4), INK(0.5));
    for (const px of [-210, -70, 70, 210]) { mark(ctx, [px, -296, px, -488], () => 6, RED(0.52)); mark(ctx, [px - 3, -296, px - 3, -488], () => 1, INK(0.4)); }
    mark(ctx, [-224, -486, 224, -486], () => 6, INK(0.62)); mark(ctx, [-212, -470, 212, -470], () => 1.6, INK(0.4));
    roof(-486, 348, 100, 150, 11);                                                                                    // 顶
    mark(ctx, [-160, -588, 0, -592, 160, -588], () => 7, INK(0.78));
    for (const sd of [-1, 1]) mark(ctx, [sd * 152, -590, sd * 170, -604, sd * 164, -618, sd * 152, -612], taper(6), INK(0.78));
    ctx.restore();
  };

  /* 楼上的人：就是 P.lady，只是衣带裙裾不飘出这间屋子 */
  P.boudoir = function (ctx, w, x, y, o, env) {
    ctx.save(); ctx.beginPath(); ctx.rect(x - 206, y - 190, 412, 196); ctx.clip();
    P.lady(ctx, w, x, y, o, env);
    ctx.restore();
  };

  /* 妆镜台：一张小案，一架圆镜，镜里一点月 */
  P.mirror = function (ctx, w, x, y, o, env) {
    const s = o.s || 1, INK = (v) => w.ink(v), t = env.t;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    mark(ctx, [-46, -50, 46, -50], () => 5, INK(0.7));
    mark(ctx, [-40, -50, -42, 0], () => 3, INK(0.6)); mark(ctx, [40, -50, 42, 0], () => 3, INK(0.6)); mark(ctx, [-41, -18, 41, -18], () => 1.6, INK(0.42));
    ctx.fillStyle = w.col('red', 0.55); ctx.fillRect(18, -64, 20, 12); mark(ctx, [18, -64, 38, -64], () => 1.4, INK(0.5));                // 妆奁
    mark(ctx, [-8, -52, -8, -76], () => 3, INK(0.66)); mark(ctx, [-24, -76, -8, -84, 8, -76], swell(3.4), INK(0.62));                      // 镜架
    const cy = -110, r = 25, tw = 0.8 + 0.2 * Math.sin(t * 1.7);
    softDot(ctx, -8, cy, r * 2.8, w.col('white', 0.2 * tw), w.col('white', 0));
    const g = ctx.createRadialGradient(-14, cy - 6, 2, -8, cy, r); g.addColorStop(0, w.col('white', 0.98)); g.addColorStop(1, 'rgba(176,190,196,0.9)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(-8, cy, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = w.col('yellow', 0.85); ctx.lineWidth = 2.6; ctx.stroke();
    softDot(ctx, -15 + Math.sin(t * 0.36) * 4, cy - 6, 9, 'rgba(255,252,232,1)', 'rgba(255,252,232,0)');                                    // 应照：月在镜里
    ctx.restore();
  };

  /* 玉户帘：竹帘卷上去又放下来，那一道月光一直斜在那里 */
  P.blind = function (ctx, w, x, y, o, env) {
    const W = o.w || 130, Hm = o.h || 184, t = env.t, len = lerp(0.26, 0.9, ease(0.5 + 0.5 * Math.sin(t * 0.5 - 1.2))) * Hm;
    ctx.fillStyle = w.col('cream', 0.2); ctx.fillRect(x, y, W, len);
    ctx.strokeStyle = w.ink(0.4); ctx.lineWidth = 0.8; ctx.beginPath();
    for (let yy = y + 3; yy < y + len; yy += 5) { ctx.moveTo(x, yy); ctx.lineTo(x + W, yy); }
    ctx.stroke();
    for (const u of [0.22, 0.78]) mark(ctx, [x + W * u, y, x + W * u, y + len + 3], () => 1.5, w.col('red', 0.5));
    ctx.beginPath(); ctx.ellipse(x + W / 2, y + len + 3, W / 2 + 4, 6.5, 0, 0, TAU); ctx.fillStyle = w.col('cream', 0.5); ctx.fill(); ctx.fillStyle = w.ink(0.3); ctx.fill();
    mark(ctx, [x - 4, y + len + 4, x + W / 2, y + len + 6, x + W + 4, y + len + 4], swell(2), w.ink(0.5));
    // 月光：卷不去
    const g = ctx.createLinearGradient(x, y, x + W * 0.5, y + Hm);
    g.addColorStop(0, w.col('white', 0.085)); g.addColorStop(1, w.col('white', 0.03));
    ctx.fillStyle = g;
    for (let j = 0; j < 5; j++) {                             // 一层层叠出来，边是虚的
      const d = j * 9;
      ctx.beginPath(); ctx.moveTo(x - 24 + d, y - 4); ctx.lineTo(x + W * 0.74 - d, y - 4); ctx.lineTo(x + W + 112 - d, y + Hm); ctx.lineTo(x + 36 + d, y + Hm); ctx.closePath(); ctx.fill();
    }
    ctx.save(); ctx.translate(x + W * 0.5 + 84, y + Hm - 2); ctx.scale(1, 0.14); softDot(ctx, 0, 0, 100, w.col('white', 0.46), w.col('white', 0)); ctx.restore();
  };

  /* 捣衣砧：水边一方平石，石上叠着素练，搁着两根木杵；月光拂了还来 */
  P.anvil = function (ctx, w, x, y, o, env) {
    const s = o.s || 1, INK = (v) => w.ink(v), WH = (v) => w.col('white', v), t = env.t;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    softDot(ctx, 0, -14, 140, INK(0.08), INK(0));
    const g = ctx.createLinearGradient(0, -44, 0, 10); g.addColorStop(0, INK(0.34)); g.addColorStop(1, INK(0.04));     // 石身
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-86, 4); ctx.lineTo(-78, -30); ctx.lineTo(-70, -44); ctx.lineTo(72, -46); ctx.lineTo(82, -30); ctx.lineTo(90, 4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -44, 74, 11, 0, 0, TAU); ctx.fillStyle = INK(0.2); ctx.fill();                      // 石面
    mark(ctx, [-74, -44, -40, -54, 0, -56, 40, -54, 74, -44], swell(2.2), INK(0.55)); mark(ctx, [-78, -30, -86, 4], taper(2.4), INK(0.5)); mark(ctx, [82, -30, 90, 4], taper(2), INK(0.4));
    mark(ctx, [-46, -26, -40, -6], taper(1.6), INK(0.26)); mark(ctx, [10, -30, 16, -10], taper(1.6), INK(0.26)); mark(ctx, [50, -28, 54, -12], taper(1.4), INK(0.22));
    // 素练：叠了两叠，一头垂下石沿
    for (let j = 0; j < 2; j++) {
      ctx.beginPath(); ctx.moveTo(-44 + j * 8, -50 - j * 7); ctx.quadraticCurveTo(-6, -57 - j * 7, 34 - j * 6, -52 - j * 7); ctx.lineTo(38 - j * 6, -44 - j * 7); ctx.quadraticCurveTo(-4, -47 - j * 7, -46 + j * 8, -42 - j * 7); ctx.closePath();
      ctx.fillStyle = WH(0.78); ctx.fill(); ctx.strokeStyle = INK(0.34); ctx.lineWidth = 0.9; ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(22, -52); ctx.quadraticCurveTo(50, -50, 60, -34); ctx.quadraticCurveTo(66, -14, 60, 6); ctx.lineTo(42, 4); ctx.quadraticCurveTo(48, -16, 42, -30); ctx.quadraticCurveTo(36, -42, 20, -44); ctx.closePath();
    ctx.fillStyle = WH(0.7); ctx.fill(); ctx.stroke();
    mark(ctx, [34, -46, 50, -30, 54, 2], taper(1.2), INK(0.26));
    // 两根杵：细柄粗头，斜搁着
    for (const [x0, y0, x1, y1, tn] of [[-58, -52, 4, -92, 0.6], [-20, -60, -62, -104, 0.48]]) {
      mark(ctx, [x0, y0, (x0 + x1) / 2, (y0 + y1) / 2, x1, y1], () => 4.2, INK(tn));
      mark(ctx, [lerp(x0, x1, 0.58), lerp(y0, y1, 0.58), x1, y1], () => 9.5, INK(tn)); mark(ctx, [lerp(x0, x1, 0.58), lerp(y0, y1, 0.58) - 3, x1, y1 - 3], () => 1.2, INK(0.3));
    }
    const cyc = (t % 7) / 7, back = cyc < 0.16 ? 1 - cyc / 0.16 * 0.85 : 0.15 + 0.85 * ease((cyc - 0.16) / 0.3);          // 拂去，又回来
    softDot(ctx, 0, -50, 110, WH(0.16 * back), WH(0));
    ctx.save(); ctx.translate(0, -46); ctx.scale(1, 0.2); softDot(ctx, 0, 0, 84, WH(0.4 * back), WH(0)); ctx.restore();
    if (cyc < 0.2) { const u = cyc / 0.2; mark(ctx, strand(lerp(-150, 50, u), -84, 0.42, 84, t * 3, 5, 0.1), (tt) => 20 * (1 - tt * 0.6), WH(0.4 * Math.sin(Math.PI * u))); }   // 一只袖子
    ctx.restore();
  };

  /* 鱼龙潜跃：龙不进这一段的天地，由这里画——水面以上是实的，水面以下只剩淡淡一道影；出入水处荡开水纹 */
  P.wyrm = function (ctx, w, x, y, o, env) {
    const sec = env.sec, e = sec.cjDragon;
    ctx.lineCap = 'round';
    for (const r of sec.cjRings || []) {
      const u = r.a / 3;
      for (let j = 0; j < 3; j++) { const rr = 14 + (u + j * 0.16) * 150; ctx.strokeStyle = w.ink(0.4 * (1 - u) * (1 - j * 0.3)); ctx.lineWidth = 1.5 - j * 0.3; ctx.beginPath(); ctx.ellipse(r.x, SEA + 5, rr, rr * 0.2, 0, 0, TAU); ctx.stroke(); }
    }
    if (!e) return;
    for (const air of [0, 1]) {
      ctx.save(); ctx.beginPath();
      if (air) ctx.rect(-4000, -3000, 12000, 3000 + SEA + 4); else ctx.rect(-4000, SEA + 4, 12000, 2000);
      ctx.clip(); ctx.globalAlpha *= air ? 1 : 0.22;
      Kinds.dragon.draw(e, ctx, w);
      ctx.restore();
    }
    for (let i = 1; i < e.N; i++) {                          // 身子破水的地方：几点白
      const a = e.seg[i - 1], b = e.seg[i];
      if ((a.y - SEA - 4) * (b.y - SEA - 4) > 0) continue;
      for (let j = 0; j < 4; j++) softDot(ctx, a.x + Math.sin(env.t * 5 + j * 2 + i) * 16, SEA + 2 - j * 4 - Math.abs(Math.sin(env.t * 4 + j)) * 6, 7 - j, w.col('white', 0.7), w.col('white', 0));
    }
  };
  function riverDragon(sec) {
    const w = sec.world, e = { id: w.uid++, kind: 'dragon', ch: '龙', x: 900, y: SEA + 70, age: 0, fade: 1, life: Infinity, seed: 41, z: 75 };
    e.rng = mulberry(e.seed);
    Kinds.dragon.create(e, w);
    e.S = 0.64; e.gap = 11 * e.S; e.noPearl = e.noCloud = e.lite = true;
    for (let i = 0; i < e.N; i++) { e.seg[i].x = e.x + i * e.gap; e.seg[i].y = e.y + i * 0.6; }      // 先潜在水里，头朝卷尾
    e.a = Math.PI; e.flip = e.flipTo = -1;
    if (e.pearl) { e.pearl.x = 700; e.pearl.y = SEA - 40; }
    sec.cjDragon = e; sec.cjRings = [];
  }
  function tickDragon(sec, dt) {
    const e = sec.cjDragon, w = sec.world;
    if (!e) return;
    const t = (e.age += dt), wasUp = e.seg[0].y < SEA;
    e.goal = { x: 700 + Math.sin(t * 0.19) * 260, y: SEA - 34 + Math.sin(t * 0.43) * 46, t: 1 };
    Kinds.dragon.update(e, dt, w);
    if ((e.seg[0].y < SEA) !== wasUp) { sec.cjRings.push({ x: e.seg[0].x, a: 0 }); if (Math.random() < 0.5) w.emit('splash', { pan: 0 }); }
    for (const r of sec.cjRings) r.a += dt;
    if (sec.cjRings.length && sec.cjRings[0].a > 3) sec.cjRings.shift();
  }

  /* 闲潭：江湾里静的一汪，波纹到这里平了；偶尔一圈极慢的涟漪 */
  P.pond = function (ctx, w, x, y, o, env) {
    const rx = o.w || 320, t = env.t;
    ctx.save(); ctx.translate(x, y + 50); ctx.scale(1, 0.2);
    softDot(ctx, 0, 0, rx * 1.2, w.col('blue', 0.36), w.col('blue', 0));
    softDot(ctx, 0, 0, rx * 0.86, w.col('paper', 0.62), w.col('paper', 0));
    ctx.restore();
    ctx.lineCap = 'round'; ctx.lineWidth = 1;
    for (let j = 0; j < 4; j++) {
      const yy = y + 22 + j * 17, hw = rx * (0.5 + 0.12 * j), ox = Math.sin(j * 2.1) * rx * 0.2;
      ctx.strokeStyle = w.ink(0.2 - j * 0.03);
      ctx.beginPath(); ctx.moveTo(x + ox - hw, yy); ctx.lineTo(x + ox - hw * 0.2, yy + 0.6); ctx.moveTo(x + ox + hw * 0.05, yy); ctx.lineTo(x + ox + hw, yy - 0.4); ctx.stroke();
    }
    for (let j = 0; j < 3; j++) {
      const u = (t * 0.11 + j / 3) % 1, r = 8 + u * 96;
      ctx.strokeStyle = w.ink(0.34 * (1 - u));
      ctx.beginPath(); ctx.ellipse(x + Math.sin(j * 2.3 + 1) * rx * 0.42, y + 40 + j * 10, r, r * 0.2, 0, 0, TAU); ctx.stroke();
    }
  };

  /* 梦：从船上升起一缕，飘到潭上散成一团（tx, ty 是梦的那一头） */
  P.reverie = function (ctx, w, x, y, o, env) {
    const t = env.t, n = 22;
    for (let j = 0; j < n; j++) {
      const u = j / (n - 1), px = lerp(x, o.tx, u) + Math.sin(u * 5 + t * 0.4) * 44 * Math.sin(Math.PI * u), py = lerp(y, o.ty, u) - Math.sin(Math.PI * u) * 180 + Math.cos(u * 4 + t * 0.3) * 18;
      softDot(ctx, px, py, 26 + u * 120, w.col('white', 0.085), w.col('white', 0));
      if (j % 3 === 0) { ctx.strokeStyle = w.col('white', 0.2 * (1 - u * 0.6)); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(px, py, 10 + u * 22, t * 0.3 + j, t * 0.3 + j + 3.6); ctx.stroke(); }    // 几个云头似的小卷
    }
    for (let j = 0; j < 6; j++) softDot(ctx, o.tx + Math.cos(j * 1.9 + t * 0.2) * 170, o.ty + 40 + Math.sin(j * 2.6 + t * 0.25) * 70, 250, w.col('white', 0.06), w.col('white', 0));
  };

  /* 海雾：月色里泛白的几带，慢慢横移，越近水越浓 */
  P.haze = function (ctx, w, x, y, o, env) {
    const t = env.t, W = o.w || 1600;
    for (let j = 0; j < 14; j++) {
      const px = x + (hash1(j * 4.1 + 3) - 0.5) * W + Math.sin(t * 0.07 + j * 1.7) * 100, v = hash1(j * 8.3), py = y + (v - 0.5) * (o.h || 240);
      ctx.save(); ctx.translate(px, py); ctx.scale(1, 0.18 + hash1(j) * 0.1);
      softDot(ctx, 0, 0, 320 + hash1(j * 2.9) * 320, w.ink(0.07 + v * 0.05), w.ink(0));
      ctx.restore();
    }
  };

  /* 碣石：海边一座孤峰，前后三叠。墨从峰顶往下淡，山脚没在雾里；提一道脊线，皴几笔 */
  P.crag = function (ctx, w, x, y, o) {
    const H = o.h || 600, W = o.w || 460, sd = o.seed || 1;
    for (const [dx, sc, tone] of [[-0.34, 0.6, 0.18], [0.3, 0.76, 0.24], [0, 1, 0.34]]) {
      const cx = x + dx * W, hw = W * 0.5 * sc, hh = H * sc, n = 28, top = [];
      for (let i = 0; i <= n; i++) {
        const u = i / n, v = u * 2 - 1, k = 1 - Math.abs(v);
        top.push(cx + v * hw + (noise1(u * 3 + sd + dx * 5) - 0.5) * 40 * k, y - hh * (Math.pow(k, 0.8) * (0.84 + 0.16 * noise1(u * 6 + sd * 3 + dx * 9)) + (noise1(u * 21 + sd) - 0.5) * 0.07 * k));
      }
      ctx.beginPath(); ctx.moveTo(top[0], y + 10);
      for (let i = 0; i <= n; i++) ctx.lineTo(top[i * 2], top[i * 2 + 1]);
      ctx.lineTo(top[n * 2], y + 10); ctx.closePath();
      const g = ctx.createLinearGradient(0, y - hh, 0, y);
      g.addColorStop(0, w.ink(tone)); g.addColorStop(0.5, w.ink(tone * 0.5)); g.addColorStop(0.9, w.ink(0));
      ctx.fillStyle = g; ctx.fill();
      mark(ctx, top.slice(8, top.length - 8), swell(3.2 * sc), w.ink(0.52 * sc));
      for (let i = 5; i < n - 4; i += 2) {                    // 皴：顺着山势斜斜几笔
        const px = top[i * 2], py = top[i * 2 + 1], sd2 = i < n / 2 ? -1 : 1, len = (26 + noise1(i * 3 + sd) * 70) * sc;
        mark(ctx, [px, py + 8, px + sd2 * len * 0.2, py + 8 + len * 0.55, px + sd2 * len * 0.3, py + 8 + len], taper(2), w.ink(0.2));
      }
    }
    for (let j = 0; j < 5; j++) { ctx.save(); ctx.translate(x + (j - 2) * W * 0.32, y - 26 - (j % 2) * 34); ctx.scale(1, 0.3); softDot(ctx, 0, 0, W * 0.5, w.col('paper', 0.5), w.col('paper', 0)); ctx.restore(); }   // 山脚的雾
  };

  /* 无限路：贴着岸坡蜿蜒上去，近宽远窄，翻过坡脊就看不见了 */
  P.road = function (ctx, w, x, y, o) {
    const pts = [x + 90, y + 4, x - 40, y - 8, x - 210, y - 2, x - 390, y - 22, x - 560, y - 15, x - 740, y - 36, x - 900, y - 38, x - 1070, y - 54, x - 1230, y - 60];
    mark(ctx, pts, (tt) => 17 * Math.pow(1 - tt, 1.4) + 1.6, w.col('white', 0.3));
    mark(ctx, pts.map((v, i) => (i % 2 ? v - 8.5 * Math.pow(1 - (i >> 1) / 8, 1.4) - 1 : v)), taper(1.3), w.ink(0.34));
  };

  /* =====================================================================
   *  转瞬即逝的灵
   * ===================================================================== */

  /* 皆似霰：月照着的地方，一粒粒白，明明灭灭（花林上、江树上） */
  Kinds.sleet = {
    z: 62,
    create(e) { e.p = []; for (let i = 0; i < (e.n || 90); i++) e.p.push([(e.rng() - 0.5) * 2 * (e.w || 400), (e.rng() - 0.5) * 2 * (e.h || 120), e.rng() * TAU, 0.7 + e.rng() * 1.4, 0.8 + e.rng() * 1.6]); },
    draw(e, ctx, w) {
      const g = ease(e.age / 3);
      for (const p of e.p) {
        const tw = Math.sin(w.t * p[4] + p[2]);
        if (tw < 0) continue;
        const x = e.x + p[0], y = e.y + p[1], r = p[3] * (0.6 + tw);
        softDot(ctx, x, y, r * 4, w.col('white', 0.3 * tw * g), w.col('white', 0));
        ctx.fillStyle = w.col('white', 0.95 * tw * g);
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      }
    }
  };

  /* 空里流霜不觉飞：月光像霜，在空中斜斜地淌下来——极细的白尘，慢得看不出在飞（不是星，也不是字库里簌簌落的繁霜） */
  Kinds.flowfrost = {
    z: 79, life: 80,
    create(e) { e.w = e.w || 1200; e.p = []; for (let i = 0; i < 300; i++) e.p.push([(e.rng() - 0.5) * 2, e.rng(), 0.012 + e.rng() * 0.02, 0.5 + e.rng() * 1.1, e.rng() * TAU, 0.3 + e.rng() * 0.7]); },
    update(e, dt) { for (const p of e.p) { p[1] += p[2] * dt; if (p[1] > 1) p[1] -= 1; } },
    draw(e, ctx, w) {
      const k = clamp(Math.min(e.age / 5, (e.life - e.age) / 8), 0, 1), H = SEA - e.y;
      for (let j = 0; j < 6; j++) {                           // 几带斜下来的清光
        ctx.save(); ctx.translate(e.x + (j - 2.5) * e.w * 0.3 + Math.sin(w.t * 0.08 + j * 1.9) * 70, e.y + H * 0.56); ctx.rotate(0.46); ctx.scale(0.14, 1);
        softDot(ctx, 0, 0, H * 0.8, w.col('white', 0.085 * k), w.col('white', 0));
        ctx.restore();
      }
      ctx.fillStyle = w.col('white', 0.8 * k);
      for (const p of e.p) {
        const band = 0.5 + 0.5 * Math.sin(p[0] * 9 + p[1] * 3 + w.t * 0.1), a = p[5] * Math.sin(Math.PI * p[1]) * (1 - Math.abs(p[0])) * band * (0.6 + 0.4 * Math.sin(w.t * 1.3 + p[4]));
        if (a < 0.05) continue;
        ctx.globalAlpha = a;
        ctx.beginPath(); ctx.arc(e.x + p[0] * e.w - p[1] * H * 0.5 + Math.sin(w.t * 0.4 + p[4]) * 6, e.y + p[1] * H, p[3], 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(e.x - H * 0.4, SEA - 6); ctx.scale(1, 0.05); softDot(ctx, 0, 0, e.w * 0.8, w.col('white', 0.22 * k), w.col('white', 0)); ctx.restore();   // 落到水边薄薄一层
    }
  };

  /* 青枫：春天的枫，三裂的叶是青的 */
  Kinds.qingfeng = {
    z: 58,
    create(e) {
      const r = e.rng;
      e.by = e.y + 400; e.h = 470; e.lean = -(0.1 + r() * 0.1); e.b = [];
      for (let i = 0; i < 8; i++) {
        const u = 0.34 + i * 0.09 + r() * 0.03, side = i % 2 ? 1 : -1, dabs = [];
        for (let k = 0; k < 17; k++) { const a = r() * TAU, d = Math.sqrt(r()); dabs.push([Math.cos(a) * d, Math.sin(a) * d * 0.7, r() * TAU, 8 + r() * 7, r() < 0.34]); }
        e.b.push({ u, a: -Math.PI / 2 + side * (0.5 + r() * 0.6), len: (120 + r() * 90) * (1.2 - u * 0.55), dabs });
      }
    },
    draw(e, ctx, w) {
      const g = ease(e.age / 3), sw = Math.sin(w.t * 0.7 + e.seed % 7) * 0.4 + w.wind * 1.6, H = e.h * g;
      const tx = e.x + e.lean * H + sw * 4, ty = e.by - H;
      softDot(ctx, e.x, e.by - 30, 90, w.ink(0.1), w.ink(0));
      mark(ctx, [e.x, e.by, e.x + e.lean * H * 0.2, e.by - H * 0.38, e.x + e.lean * H * 0.72, e.by - H * 0.74, tx, ty], (t) => 16 - 12 * t, w.ink(0.72));
      const lg = ease((g - 0.45) / 0.55);
      for (const b of e.b) {
        const bx = lerp(e.x, tx, b.u * b.u * 0.6 + b.u * 0.4), by = e.by - H * b.u, a = b.a + sw * 0.03;
        const ex = bx + Math.cos(a) * b.len * g, ey = by + Math.sin(a) * b.len * g * 0.8;
        mark(ctx, [bx, by, (bx + ex) / 2, (by + ey) / 2 - 12, ex, ey], taper(5.2), w.ink(0.62));
        if (lg <= 0) continue;
        const R = 62 * lg;
        softDot(ctx, ex, ey, R * 1.5, w.col('green', 0.11), w.col('green', 0));
        for (let pass = 0; pass < 2; pass++) {
          ctx.fillStyle = pass ? w.col('leaf', 0.66) : w.col('green', 0.62);
          ctx.beginPath();
          for (const d of b.dabs) {
            if (d[4] !== !!pass) continue;
            for (let j = -1; j <= 1; j++) leafPath(ctx, ex + d[0] * R, ey + d[1] * R, d[2] + j * 0.8 + sw * 0.04, d[3] * lg, 2.8, 0);
          }
          ctx.fill();
        }
      }
    }
  };

  /* 愿逐月华流照君：几道流光从楼头出发，顺着江往远处的船上去 */
  Kinds.moonflow = {
    z: 47, life: 26,
    create(e) { e.len = e.len || 1800; e.drop = e.drop || 0; },
    draw(e, ctx, w) {
      const k = ease(e.age / 2.5) * clamp((e.life - e.age) / 5, 0, 1), head = ease(e.age / 7);
      const at = (u, i) => [e.x - u * e.len, e.y + e.drop * u * u + Math.sin(u * 5 + w.t * 0.9 + i * 1.3) * (20 + i * 6) * (0.3 + u) + (i - 2.5) * 15 * (0.4 + u)];
      for (let i = 0; i < 6; i++) {
        const pts = [];
        for (let j = 0; j <= 28; j++) { const q = at(j / 28 * head, i); pts.push(q[0], q[1]); }
        mark(ctx, pts, (tt) => (9 + i * 2) * Math.sin(Math.PI * Math.pow(tt, 0.6)) + 0.6, w.col('white', (0.1 + (i % 2) * 0.05) * k));
      }
      for (let i = 0; i < 46; i++) {
        const u = (hash1(i * 7.7) + w.t * (0.03 + hash1(i) * 0.04)) % 1;
        if (u > head) continue;
        const q = at(u, i % 6), tw = 0.5 + 0.5 * Math.sin(w.t * 3 + i * 2.2);
        softDot(ctx, q[0], q[1] + (hash1(i * 3.1) - 0.5) * 30, 2 + tw * 5, w.col('white', 0.75 * tw * k), w.col('white', 0));
      }
    }
  };

  /* 鱼……潜跃水成文：墨鲤一跃一潜，出水入水各荡一圈 */
  Kinds.leaper = {
    z: 54,
    create(e) { e.f = [0, 1].map((i) => ({ x0: e.x + i * 250 - 110, x: e.x, y: SEA + 40, p: -i * 2.1 - 0.4, dir: i ? 1 : -1, s: 1.5 - i * 0.36, a: 0, px: 0, py: 0 })); e.rings = []; },
    update(e, dt, w) {
      const T = 4.6, AIR = 1.4;                              // 一跃 1.4 秒，潜游 3.2 秒
      for (const f of e.f) {
        const was = f.p; f.p += dt;
        if (f.p >= T) { f.p -= T; f.x0 = f.x; f.dir = -f.dir; }
        f.px = f.x; f.py = f.y;
        if (f.p >= 0 && f.p < AIR) { const u = f.p / AIR; f.x = f.x0 + f.dir * 230 * f.s * u; f.y = SEA - 170 * f.s * 4 * u * (1 - u); }
        else { const v = f.p < 0 ? 0 : f.p - AIR; f.x = f.x0 + (f.p < 0 ? 0 : f.dir * (230 * f.s + 26 * v)); f.y = SEA + 44 + Math.sin(v * 1.6) * 9 - 30 * Math.exp(-v * 2.4) * (f.p < 0 ? 0 : 1); }
        if (f.x !== f.px || f.y !== f.py) f.a = Math.atan2(f.y - f.py, f.x - f.px);
        if ((was < 0 && f.p >= 0) || (was < AIR && f.p >= AIR) || (was > f.p)) {
          e.rings.push({ x: f.x, a: 0 }); w.stir(f.x, SEA, 0, was < AIR && f.p >= AIR ? 300 : -300, 50);
          if (was < AIR && f.p >= AIR && Math.random() < 0.5) w.emit('fish');
        }
      }
      for (const r of e.rings) r.a += dt;
      if (e.rings.length && e.rings[0].a > 2.8) e.rings.shift();
    },
    draw(e, ctx, w) {
      const g = ease(e.age / 1.5);
      ctx.lineCap = 'round';
      for (const r of e.rings) {
        const u = r.a / 2.8;
        for (let j = 0; j < 3; j++) { const rr = 8 + (u + j * 0.15) * 110; ctx.strokeStyle = w.ink(0.42 * (1 - u) * (1 - j * 0.3) * g); ctx.lineWidth = 1.5 - j * 0.3; ctx.beginPath(); ctx.ellipse(r.x, SEA + 5, rr, rr * 0.2, 0, 0, TAU); ctx.stroke(); }
        if (u < 0.3) for (let j = 0; j < 5; j++) softDot(ctx, r.x + (j - 2) * 9, SEA - 6 - Math.sin(Math.PI * u / 0.3) * (16 + j * 7), 4, w.col('white', 0.8 * (1 - u / 0.3)), w.col('white', 0));
      }
      for (const f of e.f) {
        const under = f.y > SEA + 6, wag = Math.sin(w.t * 9 + f.s * 7) * 0.3;
        ctx.save(); ctx.globalAlpha *= g * (under ? 0.26 : 1);
        ctx.translate(f.x, f.y); ctx.rotate(f.a); ctx.scale(f.s, f.s * (Math.cos(f.a) < 0 ? -1 : 1));
        ctx.fillStyle = w.ink(0.62); ctx.beginPath(); leafPath(ctx, -36, 0, Math.PI + 0.5 + wag, 26, 8, 0.1); leafPath(ctx, -36, 0, Math.PI - 0.5 + wag, 26, 8, -0.1); ctx.fill();    // 尾
        ctx.beginPath(); leafPath(ctx, 2, -8, -2.5, 18, 5, 0.2); leafPath(ctx, 10, 7, 2.3, 14, 4, -0.2); ctx.fill();                                                        // 鳍
        const body = [-38, 0, -18, -1.5, 6, 0, 24, 0.5, 36, 0];
        mark(ctx, body, (tt) => 19 * Math.pow(Math.sin(Math.PI * Math.pow(tt * 0.9 + 0.06, 0.8)), 0.8) + 1.5, w.ink(0.74));
        mark(ctx, [-26, 4, 0, 6, 24, 4], swell(6), w.col('white', 0.4));                                                                                                      // 腹白
        ctx.strokeStyle = w.col('paper', 0.5); ctx.lineWidth = 0.8; ctx.beginPath();
        for (let i = 0; i < 4; i++) ctx.arc(-16 + i * 9, -1, 5, -1.1, 1.1);                                                                                                   // 几笔鳞
        ctx.stroke();
        ctx.fillStyle = w.col('white', 0.95); ctx.beginPath(); ctx.arc(27, -2.6, 2, 0, TAU); ctx.fill();
        ctx.restore();
      }
    }
  };

  /* 江水流春去欲尽：落花浮在水上往下游去，越流越稀 */
  Kinds.adrift = {
    z: 43,
    create(e) { e.p = []; e.rate = 9; e.acc = 3; e.span = e.span || 1500; },
    update(e, dt) {
      e.rate = Math.max(0.7, e.rate - dt * 0.4);
      e.acc += dt * e.rate;
      while (e.acc > 1 && e.p.length < 90) { e.acc -= 1; e.p.push({ x: e.x - Math.random() * e.span * 0.5, y: SEA + 8 + Math.pow(Math.random(), 1.6) * 130, v: 36 + Math.random() * 42, ph: Math.random() * TAU, s: 2.4 + Math.random() * 2.6, a: 0 }); }
      for (const p of e.p) { p.x -= p.v * dt; p.a += dt; p.ph += dt * 1.6; }
      if (e.p.length && e.p.some((p) => p.x < e.x - e.span)) e.p = e.p.filter((p) => p.x >= e.x - e.span);
    },
    draw(e, ctx, w) {
      ctx.lineCap = 'round';
      for (const p of e.p) {
        const al = clamp(p.a * 0.7, 0, 1) * clamp((p.x - (e.x - e.span)) / 320, 0, 1), y = p.y + Math.sin(p.ph) * 2;
        ctx.strokeStyle = w.ink(0.2 * al); ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(p.x + 5, y + 1.5); ctx.lineTo(p.x + 14 + p.v * 0.24, y + 1.5); ctx.stroke();
        ctx.fillStyle = w.col('pink', 0.88 * al);
        ctx.beginPath(); ctx.ellipse(p.x, y, p.s, p.s * 0.5, Math.sin(p.ph) * 0.5, 0, TAU); ctx.fill();
      }
    }
  };

  /* =====================================================================
   *  卷三 · 十段
   *  这一卷的 u 一律是「镜头中心真的走到这一段的几成」：缺字、月、镜头（rcam）用同一把尺。
   *  （引擎查镜头关键帧时把镜头的行程摊回了整卷，卷首卷尾各差半个画面；rcam 在开卷时按画面宽窄换算过去。）
   * ===================================================================== */
  const put = (kind, x, y, extra) => (sec, S) => S.put(sec, kind, x, y, extra);
  const all = (...fs) => (sec, S, o) => fs.forEach((f) => f(sec, S, o));
  const spawn = (ch, x, y, more) => (sec) => { const e = sec.world.spawn(ch, x, y); if (e && more) Object.assign(e, more); };
  const flag = (name) => () => { st()[name] = S.t; };
  const opt = (sec, name, i) => (sec.def.back || []).concat(sec.def.front || []).filter((p) => p[0] === name)[i || 0][3];
  const LUNA = () => ['luna', 0, 0, { w: 1e7 }];
  const wanderer = (pose) => ({ s: 0.84, face: -1, tone: 0.34, pose: pose || 'rest' });

  const SECTIONS = [
    { // ———————————————————— 卷首
      name: '卷首', w: 1500, land: [[180, 2400]],
      init: [['花', 640, 592], ['草', 900, 818]],
      back: [LUNA(), ['title', 1140, 170, { text: '春江花月夜', size: 100, sub: '唐　张若虚', seal: '若虚' }]],
      front: [['reeds', 330, 822, { w: 170, n: 7 }]],
      rcam: [{ u: 0.4, z: 1, n: 0.12 }, { u: 1, z: 1, n: 0.3 }]
    },
    { // ———————————————————— 春江潮水连海平，海上明月共潮生。滟滟随波千万里，何处春江无月明
      name: '海潮', w: 2800, lines: [0, 1], text: { x: 2700, h: 440 },
      back: [LUNA()],
      front: [['glitter', 1400, SEA, { w: 1800, n: 560 }]],
      wake: [
        { ch: '潮', x: 1950, y: 690, u: 0.22, stay: 5, then: spawn('潮', 1750, SEA + 4, { dir: -1, half: 1300 }) },      // 潮水连海平：潮从海上一道道涌进来
        { ch: '月', ctx: '明月共', x: 1984, y: 600, u: 0.42, sound: 'cjRise', stay: 10, then: flag('rise') },            // 海上明月共潮生：月从水线底下升上来
        { ch: '波', x: 1010, y: 850, u: 0.66, stay: 9, then: flag('path') }                                   // 滟滟随波千万里：满江碎光
      ],
      moon: [{ u: 0.42, dx: 360, y: 600 }, { u: 0.66, dx: 340, y: 470 }, { u: 1, dx: 320, y: 380 }],
      rcam: [{ u: 0, z: 1, n: 0.3 }, { u: 0.1, z: 1, y: 520, n: 0.62 }, { u: 0.22, z: 1, y: 540, n: 0.76 }, { u: 0.42, z: 1.04, y: 560, n: 0.8 }, { u: 0.66, z: 0.94, y: 500, n: 0.8 }, { u: 1, z: 1, n: 0.8 }]
    },
    { // ———————————————————— 江流宛转绕芳甸，月照花林皆似霰。空里流霜不觉飞，汀上白沙看不见
      name: '芳甸', w: 3000, lines: [2, 3], text: { x: 2900, h: 440 }, land: [[1340, 2660], [180, 1060]],
      back: [LUNA(), ['isle', 2000, SEA + 4, { w: 1400, h: 46, seed: 3 }]],
      front: [['glitter', 1500, SEA, { w: 1700, n: 110 }], ['reeds', 2620, 822, { w: 160, n: 7 }], ['reeds', 1400, 824, { w: 140, n: 6 }], ['sand', 620, SEA + 6, { w: 900, need: '沙' }]],
      wake: [
        { ch: '芳', key: '兰', x: 2140, y: 792, u: 0.2, then: all(spawn('草', 2380, 800), spawn('草', 1780, 802)) },     // 芳甸：洲上生出香草
        { ch: '花', key: '花', x: 2010, y: 584, u: 0.34, then: all(spawn('花', 1730, 594), spawn('花', 2290, 590)) },    // 花林的花
        { ch: '林', key: '林', x: 1600, y: 688, u: 0.42, stay: 6, then: all(spawn('林', 2500, 690), put('sleet', 1960, 500, { w: 640, h: 170, n: 150 })) },   // 花林的林；月照着，皆似霰
        { ch: '霜', x: 1150, y: 380, u: 0.6, stay: 7, then: put('flowfrost', 1250, 150, { w: 1500 }) },                                                                // 空里流霜
        { ch: '沙', x: 640, y: 720, u: 0.76, stay: 5 }                                                                           // 汀上白沙
      ],
      moon: [{ u: 0, dx: 320, y: 380 }, { u: 0.38, dx: 300, y: 300 }, { u: 0.76, dx: 240, y: 250 }, { u: 1, dx: 180, y: 225 }],
      rcam: [{ u: 0, z: 1, n: 0.8 }, { u: 0.2, z: 1, n: 0.8 }, { u: 0.38, z: 1.1, y: 540, n: 0.8 }, { u: 0.6, z: 1, y: 480, n: 0.78 }, { u: 0.76, z: 1, n: 0.78 }, { u: 1, z: 1, n: 0.78 }]
    },
    { // ———————————————————— 江天一色无纤尘，皎皎空中孤月轮。江畔何人初见月，江月何年初照人
      name: '孤月', w: 2400, lines: [4, 5], text: { x: 2300, h: 440 }, land: [[40, 1160]],
      back: [LUNA(), ['isle', 600, SEA + 4, { w: 1150, h: 48, seed: 7 }]],
      front: [['glitter', 1200, SEA, { w: 1400, n: 90 }], ['reeds', 1090, 826, { w: 150, n: 6 }], ['man', 700, 796, { s: 1, face: 1, pose: 'point', lean: -0.06, need: '人' }]],
      wake: [
        { ch: '月', ctx: '孤月轮', x: 1664, y: 195, u: 0.34, sound: 'cjLone', stay: 7, then: flag('full') },             // 孤月轮：薄云散尽，月到中天，一圈月晕
        { ch: '人', ctx: '何人初见', x: 700, y: 620, u: 0.68 }                                                           // 江畔何人初见月
      ],
      moon: [{ u: 0, dx: 180, y: 225 }, { u: 0.34, dx: 80, y: 195 }, { u: 0.68, dx: 170, y: 200 }, { u: 1, dx: 60, y: 190 }],
      rcam: [{ u: 0, z: 1, n: 0.78 }, { u: 0.34, z: 0.9, y: 440, n: 0.74 }, { u: 0.68, z: 1.08, y: 525, n: 0.76 }, { u: 1, z: 1, n: 0.78 }]
    },
    { // ———————————————————— 人生代代无穷已，江月年年望相似。不知江月待何人，但见长江送流水
      name: '代代', w: 2600, lines: [6, 7], text: { x: 2500, h: 440 }, land: [[1150, 2650]],
      back: [LUNA(), ['isle', 1900, SEA + 4, { w: 1500, h: 44, seed: 11 }]],
      front: [['glitter', 1300, SEA, { w: 1500, n: 90 }], ['ages', 2400, 798, { need: '代' }], ['stream', 560, SEA, { w: 760, need: '水' }]],
      wake: [
        { ch: '代', x: 1900, y: 560, u: 0.25, sound: 'cjAges', stay: 9 },                                                // 人生代代：望月的人一个接一个
        { ch: '月', ctx: '江月年年', x: 1040, y: 185, u: 0.6, stay: 5, then: flag('mirror') },                           // 江月年年望相似：水里也有一轮
        { ch: '水', ctx: '流水', key: '水', x: 520, y: 850, u: 0.82 }                                                    // 长江送流水
      ],
      moon: [{ u: 0, dx: 60, y: 190 }, { u: 0.6, dx: 0, y: 185 }, { u: 1, dx: -40, y: 190 }],
      rcam: [{ u: 0, z: 1, n: 0.78 }, { u: 0.25, z: 1.06, y: 535, n: 0.8 }, { u: 0.6, z: 0.96, y: 520, n: 0.8 }, { u: 0.82, z: 1, n: 0.8 }, { u: 1, z: 1, n: 0.8 }]
    },
    { // ———————————————————— 白云一片去悠悠，青枫浦上不胜愁。谁家今夜扁舟子，何处相思明月楼
      name: '青枫浦', w: 3000, lines: [8, 9], text: { x: 2900, h: 440 }, land: [[1800, 2900], [100, 840]],
      back: [LUNA(), ['isle', 2350, SEA + 4, { w: 1100, h: 56, seed: 5 }], ['isle', 470, SEA + 2, { w: 740, h: 40, seed: 9, tone: 0.24 }]],
      front: [['glitter', 1500, SEA, { w: 1700, n: 100 }], ['reeds', 1850, 826, { w: 170, n: 7 }], ['barge', 1380, SEA + 6, { s: 0.92, need: '舟', crew: [['sitter', 16, null, wanderer()]] }]],
      wake: [
        { ch: '云', x: 2300, y: 260, u: 0.16, then: spawn('云', 2300, 260, { speed: -13 }) },                            // 白云一片去悠悠
        { ch: '枫', x: 2240, y: 440, u: 0.3, then: put('qingfeng', 2240, 400) },                                         // 青枫浦：春枫，叶是青的
        { ch: '舟', x: 1380, y: 640, u: 0.56 },                                                                          // 扁舟子
        { ch: '楼', key: '楼', x: 470, y: 690, u: 0.8 }                                                                  // 何处相思明月楼：远远一座，窗里有灯
      ],
      moon: [{ u: 0, dx: -40, y: 190 }, { u: 0.3, dx: -160, y: 200 }, { u: 0.56, dx: -220, y: 235 }, { u: 0.8, dx: -130, y: 210 }, { u: 1, dx: -60, y: 200 }],
      rcam: [{ u: 0, z: 1, n: 0.8 }, { u: 0.3, z: 1.04, y: 520, n: 0.8 }, { u: 0.56, z: 1.1, y: 545, n: 0.8 }, { u: 0.8, z: 1, y: 500, n: 0.8 }, { u: 1, z: 1, n: 0.8 }]
    },
    { // ———————————————————— 可怜楼上月徘徊，应照离人妆镜台。玉户帘中卷不去，捣衣砧上拂还来。此时相望不相闻，愿逐月华流照君
      name: '月楼', w: 3000, lines: [10, 12], text: { x: 2900, h: 440 }, land: [[1120, 1880], [680, 1120]],
      back: [
        LUNA(), ['isle', 900, SEA + 4, { w: 440, h: 30, seed: 6 }], ['bower', 1500, SEA, { need: '楼' }],
        ['mirror', 1646, 504, { need: '镜' }], ['blind', 1297, 320, { w: 126, h: 184, need: '帘' }], ['anvil', 900, SEA + 2, { s: 1.1, need: '砧' }]
      ],
      front: [['glitter', 1500, SEA, { w: 1700, n: 90 }], ['boudoir', 1500, 504, { s: 0.6, face: -1, onWater: false, ribbons: 2, need: '楼' }], ['bower', 1500, SEA, { part: 'front', need: '楼' }]],
      wake: [
        { ch: '楼', ctx: '楼上', x: 1500, y: 430, u: 0.38, stay: 6, then: flag('wander') },                              // 楼上月徘徊：楼现出来，月在楼脊上来回
        { ch: '镜', x: 1640, y: 400, u: 0.48, sound: 'cjMirror' },                                                       // 妆镜台
        { ch: '帘', x: 1360, y: 410, u: 0.52, sound: 'cjBlind', stay: 7 },                                               // 玉户帘中卷不去
        { ch: '砧', x: 900, y: 690, u: 0.7, sound: 'cjAnvil', stay: 7 },                                                 // 捣衣砧上拂还来
        { ch: '华', ctx: '月华', x: 760, y: 420, u: 0.84, sound: 'cjHua', stay: 6, then: all(put('moonflow', 1290, 430, { len: 1850, drop: 250 }), (sec) => { opt(sec, 'boudoir').pose = 'reach'; }) }   // 愿逐月华流照君
      ],
      setup(sec) { opt(sec, 'boudoir').pose = 'stand'; },
      moon: [{ u: 0, dx: -60, y: 200 }, { u: 0.38, dx: -360, y: 112 }, { u: 0.48, dx: -60, y: 110 }, { u: 0.52, dx: 60, y: 110 }, { u: 0.7, dx: -300, y: 262 }, { u: 0.84, dx: -250, y: 250 }, { u: 1, dx: -230, y: 255 }],
      rcam: [{ u: 0, z: 1, n: 0.8 }, { u: 0.38, z: 1.05, y: 455, n: 0.8 }, { u: 0.48, z: 1.2, y: 412, n: 0.8 }, { u: 0.54, z: 1.2, y: 412, n: 0.8 }, { u: 0.7, z: 1.15, y: 570, n: 0.8 }, { u: 0.84, z: 1, y: 500, n: 0.8 }, { u: 1, z: 1, n: 0.8 }]
    },
    { // ———————————————————— 鸿雁长飞光不度，鱼龙潜跃水成文
      name: '鱼雁', w: 2600, lines: [13, 13], text: { x: 2500, h: 440 },
      back: [LUNA()],
      front: [['glitter', 1300, SEA, { w: 1500, n: 100 }], ['barge', 2050, SEA + 6, { s: 0.92, crew: [['sitter', 16, null, wanderer()]] }], ['wyrm', 700, SEA, { w: 900 }]],
      wake: [
        { ch: '鸿', key: '鸿', x: 1820, y: 180, u: 0.26 }, { ch: '雁', key: '雁', x: 1520, y: 300, u: 0.3 },             // 鸿雁长飞：一行行往卷尾飞去
        { ch: '鱼', x: 1200, y: 720, u: 0.56, stay: 6, then: put('leaper', 1200, SEA) },                                 // 鱼……潜跃
        { ch: '龙', x: 760, y: 660, u: 0.72, stay: 8, then: riverDragon }                                                // 龙……潜跃，水成文
      ],
      tick: tickDragon,
      moon: [{ u: 0, dx: -230, y: 255 }, { u: 0.28, dx: -330, y: 270 }, { u: 0.56, dx: -380, y: 300 }, { u: 1, dx: -320, y: 330 }],
      rcam: [{ u: 0, z: 1, n: 0.8 }, { u: 0.28, z: 0.94, y: 470, n: 0.8 }, { u: 0.56, z: 1.12, y: 585, n: 0.8 }, { u: 0.72, z: 1.06, y: 570, n: 0.8 }, { u: 1, z: 1, n: 0.8 }]
    },
    { // ———————————————————— 昨夜闲潭梦落花，可怜春半不还家。江水流春去欲尽，江潭落月复西斜
      name: '落花', w: 3000, lines: [14, 15], text: { x: 2900, h: 440 }, land: [[1560, 2240]],
      back: [LUNA(), ['isle', 1900, SEA + 4, { w: 760, h: 52, seed: 13 }], ['pond', 1250, SEA, { w: 330, need: '潭' }], ['isle', 900, SEA + 2, { w: 240, h: 36, seed: 2, need: '潭' }], ['reverie', 2380, 590, { tx: 1330, ty: 540, w: 1200, need: '梦' }]],
      front: [['glitter', 1500, SEA, { w: 1700, n: 90 }], ['reeds', 1590, 826, { w: 130, n: 6 }], ['reeds', 930, 826, { w: 110, n: 5, need: '潭' }], ['barge', 2420, SEA + 6, { s: 0.92, crew: [['sitter', 16, null, wanderer('weep')]] }]],
      wake: [
        { ch: '潭', ctx: '闲潭', x: 1270, y: 730, u: 0.42, sound: 'cjPool' },                                            // 闲潭
        { ch: '梦', x: 1900, y: 440, u: 0.44, sound: 'cjDream', stay: 6 },                                               // 梦：船上人伏着睡了，一缕梦飘到潭上
        { ch: '花', ctx: '落花', key: '花', x: 1720, y: 584, u: 0.47, stay: 9, then: (sec) => { sec.world.season = '春'; } },   // 落花：潭边一树，花片片落
        { ch: '春', ctx: '流春', x: 1040, y: 860, u: 0.62, sound: 'cjSpring', stay: 7, then: put('adrift', 1700, SEA, { span: 2100 }) },   // 江水流春去欲尽
        { ch: '月', ctx: '落月复', x: 440, y: 370, u: 0.74, sound: 'cjSet', stay: 8, then: flag('slant') }               // 江潭落月复西斜：月沉下去一截，颜色暖了
      ],
      moon: [{ u: 0, dx: -320, y: 330 }, { u: 0.42, dx: -340, y: 350 }, { u: 0.74, dx: -340, y: 370 }, { u: 1, dx: -360, y: 430 }],
      rcam: [{ u: 0, z: 1, n: 0.8 }, { u: 0.42, z: 1.08, y: 545, n: 0.8 }, { u: 0.62, z: 1, y: 520, n: 0.78 }, { u: 0.74, z: 0.96, y: 500, n: 0.76 }, { u: 1, z: 1, n: 0.74 }]
    },
    { // ———————————————————— 斜月沉沉藏海雾，碣石潇湘无限路。不知乘月几人归，落月摇情满江树
      name: '归路', w: 3200, lines: [16, 17], text: { x: 3100, h: 440 }, land: [[-140, 2440]],
      back: [
        LUNA(), ['isle', 1150, SEA + 6, { w: 2560, h: 92, seed: 15 }], ['crag', 2040, SEA - 30, { w: 470, h: 560, seed: 4, need: '石' }],
        ['road', 1720, 790, { w: 1500, need: '路' }], ['title', 150, 300, { text: '春江花月夜终', size: 50, seal: '词源' }]
      ],
      front: [
        ['man', 1090, 760, { s: 0.4, face: -1, tone: 0.3, alpha: 0.66, beard: false, need: '归' }], ['horse', 1480, 790, { s: 0.56, walk: 0.5, tone: 0.44, need: '归' }],
        ['man', 1400, 788, { s: 0.56, face: -1, tone: 0.36, pose: 'hold', need: '归' }], ['haze', 2250, 650, { w: 2100, h: 280, need: '雾' }]
      ],
      wake: [
        { ch: '雾', x: 2308, y: 640, u: 0.16, stay: 8, then: flag('sink') },                                  // 斜月沉沉藏海雾
        { ch: '石', ctx: '碣石', x: 2040, y: 400, u: 0.34 },                                                             // 碣石
        { ch: '路', x: 1450, y: 640, u: 0.48 },                                                                          // 无限路
        { ch: '归', x: 1300, y: 590, u: 0.56, sound: 'cjReturn', stay: 7 },                                              // 乘月几人归
        { ch: '树', ctx: '江树', key: '林', x: 700, y: 640, u: 0.7, sound: 'cjEnd', stay: 9,                             // 落月摇情满江树
          then: all(spawn('林', 440, 646), spawn('林', 1060, 642), put('sleet', 690, 540, { w: 520, h: 120, n: 70 }), (sec) => { sec.world.gust = -0.9; }) }
      ],
      moon: [{ u: 0, dx: -360, y: 430 }, { u: 0.16, dx: -380, y: 480 }, { u: 0.56, dx: -400, y: 505 }, { u: 0.7, dx: -330, y: 522 }, { u: 1, dx: -300, y: 526 }],
      rcam: [{ u: 0, z: 1, n: 0.74 }, { u: 0.16, z: 1, y: 520, n: 0.72 }, { u: 0.34, z: 1.04, y: 520, n: 0.72 }, { u: 0.56, z: 1.08, y: 560, n: 0.72 }, { u: 0.7, z: 1, n: 0.7 }, { u: 1, z: 1, n: 0.68 }]
    }
  ];

  for (const s of SECTIONS) { L += s.w; for (const o of s.wake || []) if (o.stay == null) o.stay = 5; }     // 补上的东西要一两秒才显全：都多停一停
  { let r = L; for (const s of SECTIONS) { r -= s.w; left.push(r); } }
  const at = (i, u) => left[i] + SECTIONS[i].w * (1 - u);
  SECTIONS.forEach((s, i) => {
    for (const k of s.moon || []) MOON.push({ X: at(i, k.u), dx: k.dx, y: k.y });
    // 镜头：把「镜头中心真的走到哪」换成引擎查关键帧用的那把尺（不封顶：两头多出来的那几帧本来就走不到）
    Object.defineProperty(s, 'cam', {
      enumerable: true,
      get() { const half = S.W / 2 / (S.H / 1000), span = L - 2 * half; return s.rcam.map((c) => Object.assign({}, c, { u: span > 0 ? 1 - ((at(i, c.u) - half) / span * L - left[i]) / s.w : c.u })); }
    });
  });
  MOON.sort((a, b) => b.X - a.X);
  SLANT_X = at(8, 0.74); SINK_X = at(9, 0.16); TOWER_X = at(6, 0.48);
  const bank = left[0] + 240;                               // 卷首那一截岸；往后一路是江，江口连着海

  MS.Scrolls.chunjiang = {
    id: 'chunjiang', title: '春江花月夜', label: '卷三 · 春江花月夜',
    text: MS.CHUNJIANG_TEXT, sections: SECTIONS, linger: 2.5,
    ground: { from: L + 400, to: bank, y: SEA },
    river: { from: bank + 250, y: SEA },
    /* 远山：海上没有山（连海平），进了江才一重重起来，卷尾又低下去 */
    hills(S) { const x = S.cam.x; return ease((left[1] + 500 - x) / 1900) * lerp(0.4, 1, ease((x - 500) / 2400)); },
    mists: [
      { X: left[5] + 40, y: 640, r: 460, a: 0.8 },          // 入相思
      { X: left[7] + 30, y: 640, r: 480, a: 0.8 },          // 入梦
      { X: left[8] + 160, y: 620, r: 520, a: 0.8 }          // 海雾
    ]
  };
})();
