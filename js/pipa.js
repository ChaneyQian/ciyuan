/* 词源 · pipa.js — 人间词话 · 卷二《琵琶行》（唐 · 白居易）
 *
 * 序八句、诗四十四联，分作九段，从右往左铺成一卷（写法同 luoshen.js）：
 *   卷首（序） → 江头 → 闻声 → 初弹 → 曲终 → 京城 → 飘零 → 天涯 → 青衫
 * 整卷是一条江、一个夜晚；只有「京城」一段是她口中的往事，过一重云雾，天亮成白昼，再过一重云雾回到江上。
 *
 * 字眼只取字面与画意相合的。琵琶声是听的，诗里拿看得见的东西去比它——
 *   「大弦嘈嘈如急雨」补「雨」，真下一阵雨；「大珠小珠落玉盘」补「珠」，珠子落在玉盘上弹跳；
 *   「银瓶乍破」「铁骑突出」「如裂帛」，补上字，瓶就破、骑就出、帛就裂——而且各有各的琵琶声。
 * 这一卷自己的画法（船、坐着的人、琵琶女、灯、京城……）和几样转瞬即逝的灵（声纹、落珠、银瓶、铁骑、裂帛）也在这里。
 */
(function () {
  'use strict';
  const MS = window.MS, Kinds = MS.Kinds, S = MS.Scroll, P = S.props;
  const { clamp, lerp, ease, easeOut, softDot, leafPath, noise1, TAU } = MS.util;
  const { mark, strand, swell, taper, nail, orchid, wet, dry, dense } = MS.ink;

  /* =====================================================================
   *  画中之物
   * ===================================================================== */

  /* 客船：一身、一篷、一篙。crew 是舱里坐着的人：[[画法, 船上的 x, y, 选项], …]，跟着船走。
     slide：现身时从这么远的地方荡过来（「移船相近」） */
  P.barge = function (ctx, w, x, y, o, env) {
    const t = env.t + (o.ph || 0), s = o.s || 1, f = o.face || -1, a = o.alpha == null ? 1 : o.alpha;
    const INK = (v) => w.ink(v * a);
    const slide = o.slide ? (1 - ease(o._a == null ? 1 : o._a)) * o.slide : 0;
    ctx.save(); ctx.translate(x + slide, y); ctx.scale(s * f, s); ctx.rotate(Math.sin(t * 0.8) * 0.005);
    ctx.strokeStyle = INK(0.24); ctx.lineWidth = 1.1; ctx.lineCap = 'round';      // 水纹
    ctx.beginPath();
    for (let i = 0; i < 5; i++) { const yy = 18 + i * 7, hw = 214 - i * 26 + Math.sin(t * 1.3 + i) * 8; ctx.moveTo(-hw - i * 8, yy); ctx.lineTo(hw - i * 20, yy); }
    ctx.stroke();
    if (!o.plain) {                                                               // 篷
      mark(ctx, [-112, -28, -112, -188], () => 3.4, INK(0.7)); mark(ctx, [58, -28, 58, -188], () => 3.4, INK(0.7));
      ctx.beginPath(); ctx.moveTo(-144, -182); ctx.quadraticCurveTo(-28, -236, 90, -182); ctx.quadraticCurveTo(-28, -198, -144, -182); ctx.fillStyle = INK(0.5); ctx.fill();
      mark(ctx, [-144, -182, -86, -208, -28, -216, 32, -208, 90, -182], swell(2.2), INK(0.62));
      for (let i = 0; i < 9; i++) mark(ctx, strand(-136 + i * 27, -183, Math.PI / 2, 13, t * 2.6 + i, 2, 0), taper(2.6), w.col('red', 0.42 * a));
      if (o.closed) {                                                             // 帘子垂着：人还没出来
        ctx.fillStyle = INK(0.3); ctx.fillRect(-110, -184, 166, 158);
        for (let i = 0; i < 6; i++) mark(ctx, strand(-98 + i * 29, -184, Math.PI / 2, 150, t * 0.9 + i, 2.4, 0), taper(1.6), INK(0.3));
      }
    }
    for (const c of o.crew || []) P[c[0]](ctx, w, c[1], c[2] == null ? -28 : c[2], c[3] || (c[3] = {}), { t: env.t, S: env.S });
    ctx.beginPath(); ctx.moveTo(-220, -48); ctx.quadraticCurveTo(-170, 14, -40, 16); ctx.lineTo(90, 16); ctx.quadraticCurveTo(190, 10, 238, -58);
    ctx.quadraticCurveTo(180, -28, 90, -26); ctx.lineTo(-60, -26); ctx.quadraticCurveTo(-160, -26, -220, -48); ctx.closePath();
    ctx.fillStyle = INK(0.62); ctx.fill();
    mark(ctx, [-220, -48, -150, -28, -40, -27, 90, -27, 180, -30, 238, -58], swell(2.4), INK(0.6));
    mark(ctx, [-150, -6, -20, 2, 120, -4], swell(1.2), w.col('paper', 0.25 * a));
    if (!o.plain) mark(ctx, [-178, -36, -198, -120, -210, -192], () => 2.2, INK(0.6));       // 篙
    ctx.restore();
  };

  /* 坐着的士人。pose：rest 拢手 · cup 举杯 · weep 掩泣；blue（0..1）青衫的青 */
  P.sitter = function (ctx, w, x, y, o, env) {
    const t = env.t + (o.ph || 0), s = o.s || 1, f = o.face || -1, a = o.alpha == null ? 1 : o.alpha, tone = o.tone == null ? 0.42 : o.tone, pose = o.pose || 'rest';
    const INK = (v) => w.ink(v * a);
    ctx.save(); ctx.translate(x, y); ctx.scale(s * f, s); ctx.rotate(Math.sin(t * 0.6) * 0.01 + (pose === 'weep' ? 0.07 : 0));
    const robe = () => { ctx.beginPath(); ctx.moveTo(-16, -98); ctx.bezierCurveTo(-40, -72, -60, -30, -66, 0); ctx.quadraticCurveTo(0, 9, 62, 0); ctx.bezierCurveTo(50, -22, 28, -58, 15, -98); ctx.closePath(); };
    softDot(ctx, 0, -40, 78, INK(0.1), INK(0));
    // 袍：泼墨。淡墨铺底，背侧压浓，膝上留一道亮
    const gr = ctx.createLinearGradient(-62, 0, 60, 0);
    gr.addColorStop(0, INK(tone * 1.2)); gr.addColorStop(0.5, INK(tone * 0.55)); gr.addColorStop(1, INK(tone * 0.9));
    robe(); ctx.fillStyle = gr; ctx.fill();
    ctx.save(); ctx.clip(); softDot(ctx, -50, -26, 44, INK(tone * 0.7), INK(0)); softDot(ctx, 4, -34, 26, w.col('paper', 0.28 * a), w.col('paper', 0)); ctx.restore();
    if (o.blue) { robe(); ctx.fillStyle = w.col('blue', 0.62 * o.blue * a); ctx.fill(); ctx.fillStyle = w.col('green', 0.3 * o.blue * a); ctx.fill(); }
    mark(ctx, [-16, -98, -44, -56, -66, 0], nail(4.2), INK(0.84)); mark(ctx, [15, -98, 36, -50, 62, 0], orchid(2.6), INK(0.62));
    mark(ctx, [-44, -10, -6, -24, 40, -12], orchid(2), INK(0.46)); mark(ctx, [-66, 0, -20, 7, 24, 5, 62, 0], orchid(2), INK(0.5));
    mark(ctx, [-8, -98, 2, -84, 4, -70], () => 3, w.col('white', 0.9 * a)); mark(ctx, [-9, -98, 1, -84, 3, -70], nail(1.8), INK(0.84));
    wet(ctx, [-15, -64, 0, -60, 15, -64], () => 4.6, w, 0.52 * a, 0.38 * a, 'red');
    const arm = { rest: [10, -90, 26, -66, 30, -40, 12, -28], cup: [10, -90, 30, -84, 46, -96, 52, -112], weep: [10, -90, 28, -96, 24, -116, 10, -124] }[pose];
    const sleeve = () => {
      wet(ctx, arm, (tt) => 13 + 15 * tt * (pose === 'rest' ? 1 : 0.55), w, tone * 1.15 * a, tone * 0.65 * a);
      if (o.blue) mark(ctx, arm, (tt) => 12 + 13 * tt * 0.6, w.col('blue', 0.5 * o.blue * a));
      mark(ctx, arm, orchid(2.4), INK(0.7));
    };
    if (pose !== 'weep') sleeve();
    if (pose === 'cup') {
      ctx.beginPath(); ctx.moveTo(46, -120); ctx.quadraticCurveTo(54, -106, 62, -120); ctx.closePath(); ctx.fillStyle = w.col('white', 0.95 * a); ctx.fill();
      mark(ctx, [46, -120, 54, -112, 62, -120], swell(1.1), INK(0.5));
    }
    ctx.save(); ctx.translate(0, 70 + (pose === 'weep' ? 5 : 0)); if (pose === 'weep') ctx.rotate(0.1);
    S.parts.manHead(ctx, w, t, a, o.beard !== false);
    ctx.restore();
    if (pose === 'weep') sleeve();                                               // 袖子掩着脸
    ctx.restore();
  };

  /* 琵琶女：坐着，怀里一面琵琶。veil 半遮面 · play 弹得多急（0 不弹）· young 少年时（血色罗裙）· idle 琵琶搁在一边 */
  P.player = function (ctx, w, x, y, o, env) {
    const t = env.t + (o.ph || 0), s = o.s || 1, f = o.face || 1, a = o.alpha == null ? 1 : o.alpha, play = o.play || 0;
    const INK = (v) => w.ink(v * a), RED = (v) => w.col('red', v * a), BLUE = (v) => w.col('blue', v * a), WHITE = (v) => w.col('white', v * a);
    o._v = lerp(o._v == null ? (o.veil ? 1 : 0) : o._v, o.veil ? 1 : 0, 0.03);
    const v = o._v, wind = 0.7 + 0.3 * Math.sin(t * 0.7);
    ctx.save(); ctx.translate(x, y); ctx.scale(s * f, s); ctx.rotate(Math.sin(t * 0.7) * 0.012 + Math.sin(t * play * 1.3) * 0.012 * Math.min(play, 2));
    for (let i = 0; i < 2; i++) {                                                // 披帛
      const pp = strand(-12, -92 + i * 12, Math.PI - 0.34 + i * 0.36, 120 + i * 44, t * 1.6 + i * 2, 15 * wind, -0.1 + i * 0.3);
      wet(ctx, pp, (tt) => 12 * Math.pow(Math.sin(Math.PI * Math.pow(tt * 0.92 + 0.04, 0.6)), 0.8) + 0.6, w, 0.4 * a, 0.1 * a, i ? 'blue' : 'red');
      mark(ctx, pp, orchid(1.6), INK(0.3));
    }
    // 裙：坐下来铺成一堆
    ctx.beginPath(); ctx.moveTo(-14, -60); ctx.bezierCurveTo(-44, -48, -72, -18, -80, 0); ctx.quadraticCurveTo(0, 10, 72, 0); ctx.bezierCurveTo(58, -20, 30, -46, 14, -60); ctx.closePath();
    ctx.fillStyle = WHITE(0.94); ctx.fill();
    if (o.young) { ctx.fillStyle = RED(0.6); ctx.fill(); }
    ctx.save(); ctx.clip(); softDot(ctx, -50, -10, 54, INK(0.24), INK(0)); softDot(ctx, 40, -22, 34, INK(0.1), INK(0)); ctx.restore();
    mark(ctx, [-14, -60, -46, -44, -80, 0], nail(3.4), INK(0.74)); mark(ctx, [14, -60, 44, -34, 72, 0], orchid(2.4), INK(0.54));
    mark(ctx, [-40, -6, -4, -20, 36, -8], orchid(1.8), INK(0.4)); mark(ctx, [-30, -34, -52, -14, -66, 2], orchid(1.4), INK(0.3));
    mark(ctx, [-80, 0, -30, 8, 20, 6, 72, 0], orchid(2), INK(0.46));
    // 上身
    ctx.beginPath(); ctx.moveTo(-14, -60); ctx.lineTo(-16, -98); ctx.quadraticCurveTo(0, -108, 15, -98); ctx.lineTo(13, -60); ctx.closePath();
    ctx.fillStyle = o.young ? w.col('pink', 0.8 * a) : WHITE(0.95); ctx.fill();
    mark(ctx, [-16, -98, -15, -78, -14, -60], nail(2.2), INK(0.6));
    mark(ctx, [-8, -103, 1, -88, 5, -72], nail(1.6), INK(0.62)); mark(ctx, [11, -102, 3, -90], taper(1.4), INK(0.5));
    wet(ctx, [-14, -62, 0, -59, 13, -62], () => 5, w, 0.7 * a, 0.5 * a, 'red');
    ctx.save(); ctx.translate(0, 98); S.parts.ladyHead(ctx, w, t, a, wind); ctx.restore();
    // 琵琶：弹时斜抱在怀，遮面时竖在脸前
    const px = o.idle ? 62 : lerp(14, 13, v), py = o.idle ? -22 : lerp(-52, -66, v), rot = o.idle ? 1.2 : lerp(-0.62, -0.04, v);
    const at = (lx, ly) => [px + lx * Math.cos(rot) - ly * Math.sin(rot), py + lx * Math.sin(rot) + ly * Math.cos(rot)];
    const hands = () => {
      if (o.idle) { const arm = [10, -90, 24, -70, 26, -46, 10, -34]; mark(ctx, arm, (tt) => 10 + 14 * tt, WHITE(0.92)); mark(ctx, arm, orchid(2.2), INK(0.56)); return; }
      const lh = at(0, -58), rh = at(3 + Math.sin(t * play * 9) * 3 * Math.min(1, play), 2 + Math.cos(t * play * 9) * 4 * Math.min(1, play));
      const la = [-12, -94, lerp(-30, -10, v), -84, lh[0] - 8, lh[1] + 6, lh[0], lh[1]], ra = [12, -94, 34, -76, rh[0] + 16, rh[1] - 4, rh[0], rh[1]];
      for (const arm of [la, ra]) { mark(ctx, arm, (tt) => 9 + 13 * Math.sin(Math.PI * Math.min(1, tt * 1.2)) * 0.8, WHITE(0.93)); mark(ctx, arm, orchid(2.2), INK(0.56)); }
      for (const h of [lh, rh]) { ctx.fillStyle = WHITE(0.98); ctx.beginPath(); ctx.arc(h[0], h[1], 3.4, 0, TAU); ctx.fill(); }
    };
    ctx.save(); ctx.translate(px, py); ctx.rotate(rot);
    softDot(ctx, 0, 0, 44, INK(0.1), INK(0));
    ctx.beginPath(); ctx.moveTo(0, -34); ctx.bezierCurveTo(-10, -30, -26, -8, -24, 12); ctx.bezierCurveTo(-22, 32, 22, 32, 24, 12); ctx.bezierCurveTo(26, -8, 10, -30, 0, -34); ctx.closePath();
    ctx.fillStyle = 'rgba(196,150,92,' + 0.95 * a + ')'; ctx.fill(); ctx.fillStyle = INK(0.14); ctx.fill();
    ctx.strokeStyle = INK(0.6); ctx.lineWidth = 1.2; ctx.stroke();
    mark(ctx, [0, -34, 0, -86], () => 5.2, INK(0.72)); mark(ctx, [0, -86, -5, -94, -9, -93], taper(5), INK(0.72));
    ctx.strokeStyle = INK(0.7); ctx.lineWidth = 1.6; ctx.beginPath();
    for (let i = 0; i < 2; i++) { ctx.moveTo(-8, -72 - i * 8); ctx.lineTo(8, -70 - i * 8); } ctx.stroke();        // 轸
    ctx.strokeStyle = WHITE(0.85); ctx.lineWidth = 0.6; ctx.beginPath();
    for (let i = 0; i < 4; i++) { const jx = play ? Math.sin(t * 46 + i * 2) * 0.7 * Math.min(1, play) : 0; ctx.moveTo(-2.4 + i * 1.6, -80); ctx.quadraticCurveTo(-3 + i * 2 + jx, -30, -4.5 + i * 3, 17); }
    ctx.stroke();
    mark(ctx, [-9, 17, 9, 17], () => 3, INK(0.7));
    ctx.restore();
    hands();
    if (play > 0 && !o.idle) {                                                   // 声：从弦上一圈一圈荡出去
      const c = at(0, -6);
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const u = (t * 0.5 * Math.min(2, play) + i / 3) % 1;
        ctx.strokeStyle = INK(0.3 * (1 - u)); ctx.lineWidth = 1.6 * (1 - u) + 0.5;
        ctx.beginPath(); ctx.arc(c[0], c[1], 30 + u * 120, -0.7, 0.7); ctx.stroke();
      }
    }
    ctx.restore();
  };

  /* 灯：一檠一焰，照亮一小片 */
  P.lamp = function (ctx, w, x, y, o, env) {
    const s = o.s || 1, fl = 0.86 + 0.14 * Math.sin(env.t * 9 + x) * Math.sin(env.t * 5.3);
    softDot(ctx, x, y - 66 * s, 210 * s, 'rgba(255,184,96,' + 0.3 * fl + ')', 'rgba(255,170,80,0)');
    mark(ctx, [x - 13 * s, y, x + 13 * s, y], () => 3.4 * s, w.ink(0.7));
    mark(ctx, [x, y, x, y - 56 * s], () => 2.4 * s, w.ink(0.7));
    mark(ctx, [x - 10 * s, y - 57 * s, x + 10 * s, y - 57 * s], () => 3 * s, w.ink(0.75));
    ctx.fillStyle = 'rgba(255,150,60,0.9)'; ctx.beginPath(); leafPath(ctx, x, y - 58 * s, -Math.PI / 2 + Math.sin(env.t * 7) * 0.12, 20 * s * fl, 5 * s, 0); ctx.fill();
    softDot(ctx, x, y - 66 * s, 9 * s, 'rgba(255,240,190,0.98)', 'rgba(255,200,120,0)');
  };

  /* 江心的月：一柱碎光，随波明灭（「别时茫茫江浸月」「唯见江心秋月白」） */
  P.glint = function (ctx, w, x, y, o, env) {
    const t = env.t, n = o.n || 10;
    ctx.save(); ctx.translate(x, y + 30); ctx.scale(1, 0.5); softDot(ctx, 0, 0, 120, w.col('white', 0.36), w.col('white', 0)); ctx.restore();
    ctx.lineCap = 'round';
    for (let j = 0; j < n; j++) {
      const yy = y + 6 + j * 12, hw = (50 - j * 2.6) * (0.55 + 0.45 * Math.sin(t * 1.7 + j * 1.9)), dx = Math.sin(t * 0.9 + j) * 7;
      ctx.strokeStyle = w.col('white', 0.8 - j * 0.055); ctx.lineWidth = 2.6 - j * 0.12;
      ctx.beginPath(); ctx.moveTo(x - hw + dx, yy); ctx.lineTo(x + hw + dx, yy); ctx.stroke();
    }
  };

  /* 京城：一带城墙，上有雉堞，当中一座门楼，檐下点着灯 */
  P.city = function (ctx, w, x, y, o, env) {
    const W = o.w || 1400, h = 150, x0 = x - W / 2, x1 = x + W / 2, t = env.t;
    const g = ctx.createLinearGradient(0, y - h, 0, y + 10);
    g.addColorStop(0, w.ink(0.34)); g.addColorStop(1, w.ink(0.06));
    ctx.beginPath(); ctx.moveTo(x0, y + 10); ctx.lineTo(x0 + 110, y - h); ctx.lineTo(x1 - 110, y - h); ctx.lineTo(x1, y + 10); ctx.closePath();
    ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = w.ink(0.36);
    for (let bx = x0 + 118; bx < x1 - 126; bx += 30) ctx.fillRect(bx, y - h - 10, 17, 10);
    mark(ctx, [x0 + 110, y - h, x, y - h - 3, x1 - 110, y - h], swell(2.4), w.ink(0.46));
    ctx.fillStyle = w.ink(0.5); ctx.beginPath(); ctx.moveTo(x - 34, y + 6); ctx.lineTo(x - 34, y - 62); ctx.quadraticCurveTo(x, y - 104, x + 34, y - 62); ctx.lineTo(x + 34, y + 6); ctx.closePath(); ctx.fill();   // 城门
    for (const [yy, bw, bh, rw] of [[y - h, 230, 70, 330], [y - h - 96, 150, 54, 240]]) {       // 门楼两重
      ctx.fillStyle = w.col('paper', 0.6); ctx.fillRect(x - bw / 2, yy - bh, bw, bh);
      ctx.fillStyle = w.ink(0.24); ctx.fillRect(x - bw / 2, yy - bh, bw, bh);
      for (let i = 0; i <= 4; i++) mark(ctx, [x - bw / 2 + i * bw / 4, yy, x - bw / 2 + i * bw / 4, yy - bh], () => 3, w.col('red', 0.55));
      const ry = yy - bh;
      ctx.beginPath(); ctx.moveTo(x - rw / 2, ry + 4); ctx.quadraticCurveTo(x - rw * 0.32, ry - 4, x - bw * 0.3, ry - 26); ctx.lineTo(x + bw * 0.3, ry - 26); ctx.quadraticCurveTo(x + rw * 0.32, ry - 4, x + rw / 2, ry + 4);
      ctx.quadraticCurveTo(x, ry - 8, x - rw / 2, ry + 4); ctx.closePath(); ctx.fillStyle = w.ink(0.62); ctx.fill();
      mark(ctx, [x - rw / 2 - 6, ry, x - rw * 0.3, ry - 2, x, ry - 6, x + rw * 0.3, ry - 2, x + rw / 2 + 6, ry], swell(2.6), w.ink(0.66));
      for (const sd of [-1, 1]) {
        const lx = x + sd * (bw / 2 + 10), ly = ry + 30 + Math.sin(t * 1.3 + sd + yy) * 2, fl = 0.85 + 0.15 * Math.sin(t * 8 + sd);
        softDot(ctx, lx, ly, 40, 'rgba(255,170,80,' + 0.3 * fl + ')', 'rgba(255,170,80,0)');
        ctx.fillStyle = w.col('red', 0.9); ctx.beginPath(); ctx.ellipse(lx, ly, 8, 10, 0, 0, TAU); ctx.fill();
      }
    }
  };

  /* 红绡：一条条从空中抛过来（「五陵年少争缠头，一曲红绡不知数」） */
  P.silks = function (ctx, w, x, y, o, env) {
    const t = env.t, n = o.n || 7;
    for (let i = 0; i < n; i++) {
      const pp = strand(x - i * 34 + Math.sin(t * 0.6 + i) * 20, y - i * 38 + Math.cos(t * 0.5 + i * 2) * 14, -0.1 + (i % 3) * 0.16, 250 + (i % 2) * 70, t * 2.1 + i * 1.3, 24, 0.22 - (i % 3) * 0.1);
      mark(ctx, pp, (tt) => 15 * Math.pow(Math.sin(Math.PI * Math.pow(tt * 0.9 + 0.05, 0.7)), 0.8) + 1, w.col('red', 0.4));
      mark(ctx, pp, taper(1.2), w.col('red', 0.6));
    }
  };

  /* 梦：一团淡雾里，浮出少年时的门楼与灯火（「夜深忽梦少年事」） */
  P.dream = function (ctx, w, x, y, o, env) {
    const t = env.t, br = 1 + Math.sin(t * 0.7) * 0.03;
    for (let j = 0; j < 4; j++) softDot(ctx, x + Math.cos(j * 1.7 + t * 0.2) * 70, y + Math.sin(j * 2.3 + t * 0.25) * 34, 190 * br, w.col('white', 0.1), w.col('white', 0));
    ctx.save(); ctx.globalAlpha *= 0.5; ctx.translate(x, y + 96); ctx.scale(0.36, 0.36);
    P.city(ctx, w, 0, 0, { w: 760 }, env);
    P.player(ctx, w, -40, 6, o.girl || (o.girl = { s: 1.5, young: true, play: 1, face: 1 }), env);
    ctx.restore();
    for (let j = 0; j < 6; j++) { const u = j / 5; softDot(ctx, lerp(x - 190, x - 70, u) + Math.sin(t * 0.6 + j) * 8, lerp(y + 250, y + 110, u * u * 0.4 + u * 0.6), 16 + u * 34, w.col('white', 0.1), w.col('white', 0)); }   // 梦从船上升起来的一缕
  };

  /* 茅屋：谪居浔阳的住处，旁有疏篱 */
  P.hut = function (ctx, w, x, y, o) {
    const s = o.s || 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    softDot(ctx, 0, -40, 150, w.ink(0.1), w.ink(0));
    ctx.fillStyle = w.col('paper', 0.72); ctx.fillRect(-72, -72, 144, 72); ctx.fillStyle = w.ink(0.12); ctx.fillRect(-72, -72, 144, 72);
    mark(ctx, [-72, 0, -72, -72], () => 2.4, w.ink(0.55)); mark(ctx, [72, 0, 72, -72], () => 2.4, w.ink(0.55));
    ctx.fillStyle = w.ink(0.5); ctx.fillRect(-16, -54, 30, 54);
    ctx.fillStyle = w.ink(0.34); ctx.fillRect(34, -52, 24, 22);
    ctx.beginPath(); ctx.moveTo(-104, -64); ctx.quadraticCurveTo(-44, -128, 0, -136); ctx.quadraticCurveTo(44, -128, 104, -64); ctx.quadraticCurveTo(0, -82, -104, -64); ctx.closePath();
    ctx.fillStyle = w.ink(0.46); ctx.fill();
    for (let i = 0; i < 13; i++) { const u = i / 12, tx = lerp(-96, 96, u); mark(ctx, [lerp(-30, 30, u), -128 + Math.abs(u - 0.5) * 30, tx, -66 + Math.abs(u - 0.5) * 6], taper(2.4), w.ink(0.4)); }
    mark(ctx, [-104, -64, -50, -76, 0, -80, 50, -76, 104, -64], swell(2.4), w.ink(0.6));
    for (let i = 0; i < 8; i++) mark(ctx, [116 + i * 20, 0, 118 + i * 20, -36 + (i % 2) * 6], () => 2.2, w.ink(0.5));     // 篱
    mark(ctx, [110, -22, 190, -26, 262, -20], swell(1.6), w.ink(0.44));
    ctx.restore();
  };

  /* 猿：枯枝上挂着一只，长臂，晃晃悠悠（「杜鹃啼血猿哀鸣」） */
  P.ape = function (ctx, w, x, y, o, env) {
    const t = env.t, sw = Math.sin(t * 1.1) * 0.14;
    mark(ctx, [x - 170, y - 14, x - 80, y - 34, x + 10, y - 30, x + 96, y - 52], (tt) => 9 - 6 * tt, w.ink(0.62));
    mark(ctx, [x - 40, y - 33, x - 10, y - 62, x + 6, y - 88], taper(3.4), w.ink(0.55)); mark(ctx, [x + 40, y - 36, x + 70, y - 20], taper(3), w.ink(0.5));
    ctx.save(); ctx.translate(x, y - 30); ctx.rotate(sw);
    mark(ctx, [0, 0, 5, 28, 3, 52], () => 5.4, w.ink(0.74));                      // 挂着的长臂
    softDot(ctx, 5, 84, 40, w.ink(0.2), w.ink(0));
    mark(ctx, [2, 54, 9, 78, 5, 104], (tt) => 24 - 8 * tt, w.ink(0.66));          // 身
    mark(ctx, [8, 62, 26, 84, 22, 108], () => 5, w.ink(0.7));                     // 垂着的另一臂
    mark(ctx, [2, 100, -10, 116, -4, 130], () => 5.4, w.ink(0.7)); mark(ctx, [8, 102, 20, 118, 14, 132], () => 5, w.ink(0.66));
    ctx.fillStyle = w.ink(0.78); ctx.beginPath(); ctx.arc(0, 50, 11, 0, TAU); ctx.fill();
    softDot(ctx, 3.5, 52, 6.5, w.col('paper', 0.85), w.col('paper', 0.1));
    ctx.fillStyle = w.ink(0.9); ctx.beginPath(); ctx.arc(2, 50.5, 1, 0, TAU); ctx.arc(6, 50.5, 1, 0, TAU); ctx.fill();
    ctx.restore();
  };

  /* 门：两扇关着，阶前落叶（「门前冷落鞍马稀」） */
  P.gate = function (ctx, w, x, y, o) {
    ctx.save(); ctx.translate(x, y);
    const g = ctx.createLinearGradient(0, -110, 0, 0); g.addColorStop(0, w.ink(0.26)); g.addColorStop(1, w.ink(0.05));
    ctx.fillStyle = g; ctx.fillRect(-250, -100, 500, 100);
    mark(ctx, [-250, -100, -80, -104, 80, -104, 250, -100], swell(2.2), w.ink(0.44));
    ctx.fillStyle = w.ink(0.5); ctx.fillRect(-46, -128, 92, 128); ctx.fillStyle = w.col('red', 0.3); ctx.fillRect(-46, -128, 92, 128);
    mark(ctx, [0, 0, 0, -128], () => 1.6, w.ink(0.7));
    ctx.fillStyle = w.col('yellow', 0.7); ctx.beginPath(); ctx.arc(-9, -62, 3.4, 0, TAU); ctx.arc(9, -62, 3.4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-86, -124); ctx.quadraticCurveTo(-40, -150, 0, -156); ctx.quadraticCurveTo(40, -150, 86, -124); ctx.quadraticCurveTo(0, -136, -86, -124); ctx.closePath();
    ctx.fillStyle = w.ink(0.6); ctx.fill();
    mark(ctx, [-92, -122, -40, -134, 0, -138, 40, -134, 92, -122], swell(2.4), w.ink(0.62));
    ctx.fillStyle = w.col('orange', 0.6); ctx.beginPath();
    for (let i = 0; i < 9; i++) leafPath(ctx, -120 + i * 31 + noise1(i * 3.3) * 20, 6 + noise1(i * 7.7) * 10, i * 1.9, 9, 3, 0.1);
    ctx.fill();
    ctx.restore();
  };

  /* =====================================================================
   *  转瞬即逝的灵：琵琶声里的那些比喻
   * ===================================================================== */

  /* 声纹：弦上荡出去的一圈一圈 */
  Kinds.notes = {
    z: 78, life: 8, max: 6, zone: 'mid',
    create(e) { e.dir = e.dir || -1; },
    draw(e, ctx, w) {
      const k = clamp(1 - e.age / e.life, 0, 1) * Math.min(1, e.age * 1.5), a0 = e.dir < 0 ? Math.PI * 0.78 : -Math.PI * 0.22;
      ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const u = (e.age * 0.3 + i / 6) % 1;
        ctx.strokeStyle = w.ink(0.36 * (1 - u) * k); ctx.lineWidth = 2.6 * (1 - u) + 0.6;
        ctx.beginPath(); ctx.arc(e.x, e.y, 30 + u * 400, a0, a0 + Math.PI * 0.44); ctx.stroke();
      }
    }
  };

  /* 大珠小珠落玉盘：珠子落下来，在盘上弹几弹，滚出去 */
  Kinds.pearls = {
    z: 77, life: 14, max: 2, zone: 'mid',
    create(e) { e.p = []; e.next = 0.3; e.plate = e.y + 150; },
    update(e, dt, w) {
      e.next -= dt;
      if (e.next <= 0 && e.age < e.life - 4) {
        e.next = 0.12 + Math.random() * 0.3;
        const big = Math.random() < 0.4;
        e.p.push({ x: e.x + (Math.random() - 0.5) * 150, y: e.y - 260 - Math.random() * 80, vx: (Math.random() - 0.5) * 40, vy: 0, r: big ? 10 : 5.5, big, n: 0 });
      }
      for (const p of e.p) {
        p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.y > e.plate - p.r && p.vy > 0 && Math.abs(p.x - e.x) < 132 && p.n < 4) {
          p.y = e.plate - p.r; p.vy *= -0.58; p.vx += (p.x - e.x) * 0.6 + (Math.random() - 0.5) * 60; p.n++;
          w.emit('pearl', { big: p.big });
        }
      }
      if (e.p.length && e.p[0].y > e.plate + 240) e.p = e.p.filter((p) => p.y < e.plate + 240);
    },
    draw(e, ctx, w) {
      const g = ease(e.age / 1.2) * clamp((e.life - e.age) / 2, 0, 1);
      ctx.save(); ctx.globalAlpha *= g; ctx.translate(e.x, e.plate);
      softDot(ctx, 0, 8, 180, w.col('green', 0.14), w.col('green', 0));
      mark(ctx, [-52, 18, 0, 30, 52, 18], swell(4), w.ink(0.4));
      ctx.beginPath(); ctx.ellipse(0, 0, 142, 24, 0, 0, TAU); ctx.fillStyle = w.col('white', 0.9); ctx.fill(); ctx.fillStyle = w.col('green', 0.24); ctx.fill();
      ctx.strokeStyle = w.ink(0.46); ctx.lineWidth = 1.4; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 2, 98, 14, 0, 0, TAU); ctx.strokeStyle = w.ink(0.2); ctx.stroke();
      ctx.restore();
      for (const p of e.p) {
        softDot(ctx, p.x, p.y, p.r * 3.4, w.col('white', 0.46), w.col('white', 0));
        softDot(ctx, p.x, p.y + p.r * 0.2, p.r * 1.4, w.ink(0.22 * (1 - w.nightK)), w.ink(0));
        softDot(ctx, p.x - p.r * 0.25, p.y - p.r * 0.3, p.r * 1.05, w.col('white', 1), w.col('white', 0.12));
      }
    }
  };

  /* 银瓶乍破水浆迸：一只银瓶，颤一颤，炸开 */
  Kinds.vase = {
    z: 77, life: 7, max: 2, zone: 'mid',
    create(e) { e.broke = false; e.sh = []; e.dr = []; },
    update(e, dt, w) {
      if (!e.broke && e.age > 1.3) {
        e.broke = true;
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.8, v = 180 + Math.random() * 260; e.sh.push({ x: e.x, y: e.y - 100, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: Math.random() * TAU, vr: (Math.random() - 0.5) * 9, s: 18 + Math.random() * 24 }); }
        for (let i = 0; i < 80; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, v = 160 + Math.random() * 540; e.dr.push({ x: e.x, y: e.y - 90, vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: 2 + Math.random() * 4 }); }
        w.dye(e.x, e.y - 50, [0.02, 0, 0.3], 90, 0, -320); w.emit('splash', {});
      }
      if (e.broke) {
        for (const q of e.sh) { q.vy += 700 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.r += q.vr * dt; }
        for (const q of e.dr) { q.vy += 700 * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
      }
    },
    draw(e, ctx, w) {
      if (!e.broke) {
        const g = ease(e.age / 0.8), shake = e.age > 0.95 ? Math.sin(e.age * 90) * 3.4 : 0;
        ctx.save(); ctx.translate(e.x + shake, e.y); ctx.scale(g * 1.7, g * 1.7);
        softDot(ctx, 0, -64, 120, w.col('white', 0.3), w.col('white', 0));
        ctx.beginPath(); ctx.moveTo(-12, -130); ctx.lineTo(12, -130); ctx.quadraticCurveTo(8, -106, 26, -86); ctx.bezierCurveTo(48, -58, 40, -10, 18, 0); ctx.lineTo(-18, 0);
        ctx.bezierCurveTo(-40, -10, -48, -58, -26, -86); ctx.quadraticCurveTo(-8, -106, -12, -130); ctx.closePath();
        ctx.fillStyle = w.col('white', 0.95); ctx.fill();
        ctx.save(); ctx.clip(); softDot(ctx, 26, -40, 40, w.ink(0.3), w.ink(0)); softDot(ctx, -20, -70, 16, w.col('white', 1), w.col('white', 0)); ctx.restore();
        mark(ctx, [-12, -130, -10, -106, -30, -80, -42, -40, -18, 0], swell(1.8), w.ink(0.5)); mark(ctx, [12, -130, 10, -106, 30, -80, 42, -40, 18, 0], swell(2.2), w.ink(0.6));
        mark(ctx, [-14, -132, 0, -134, 14, -132], () => 4, w.ink(0.6));
        ctx.restore();
        return;
      }
      const k = clamp(1 - (e.age - 1.3) / 4.6, 0, 1), fl = clamp(1 - (e.age - 1.3) / 0.3, 0, 1);
      if (fl > 0) softDot(ctx, e.x, e.y - 100, 300, w.col('white', 0.7 * fl), w.col('white', 0));
      ctx.fillStyle = w.col('white', 0.92 * k); ctx.strokeStyle = w.ink(0.4 * k); ctx.lineWidth = 0.8;
      for (const q of e.sh) { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.beginPath(); leafPath(ctx, -q.s / 2, 0, 0, q.s, q.s * 0.5, 0.3); ctx.fill(); ctx.stroke(); ctx.restore(); }
      ctx.fillStyle = w.col('white', 0.86 * k); ctx.beginPath();
      for (const q of e.dr) { ctx.moveTo(q.x + q.s, q.y); ctx.arc(q.x, q.y, q.s, 0, TAU); }
      ctx.fill();
      ctx.fillStyle = w.col('blue', 0.3 * k); ctx.fill();
    }
  };

  /* 铁骑突出：几骑从右向左冲过去，伏鞍挺枪 */
  Kinds.riders = {
    z: 76, life: 9, max: 2, zone: 'ground',
    create(e) {
      e.r = []; e.tk = 0;
      for (let i = 0; i < 5; i++) e.r.push({ dx: i * 150 + e.rng() * 60, dy: (i % 2) * 26 - 8, s: 0.9 + e.rng() * 0.25, o: { face: -1, walk: 2.4, tone: 0.72, ph: e.rng() * 6 } });
    },
    update(e, dt, w) {
      e.x -= 430 * dt; e.tk -= dt;
      if (e.tk <= 0 && e.age < 6) { e.tk = 0.17; w.emit('drum', { pan: 0 }); w.stir(e.x, e.y - 20, -320, 0, 70); }
    },
    draw(e, ctx, w) {
      const env = { t: w.t * 1.9, S };
      ctx.globalAlpha *= Math.min(1, e.age * 2);
      for (const r of e.r) {
        const x = e.x + r.dx, y = e.y + r.dy;
        softDot(ctx, x + 70, y - 14, 96, w.ink(0.13), w.ink(0));                  // 尘
        r.o.s = r.s; P.horse(ctx, w, x, y, r.o, env);
        ctx.save(); ctx.translate(x, y); ctx.scale(r.s, r.s);
        mark(ctx, [-4, -70, -14, -98, -28, -116], (t) => 21 - 7 * t, w.ink(0.8));
        ctx.fillStyle = w.ink(0.88); ctx.beginPath(); ctx.arc(-34, -126, 9.5, 0, TAU); ctx.fill();
        mark(ctx, strand(-32, -136, -0.5, 26, w.t * 7 + r.o.ph, 3, 0.1), taper(4.4), w.col('red', 0.85));
        mark(ctx, [44, -84, -40, -112, -126, -140], () => 2.2, w.ink(0.82));
        ctx.fillStyle = w.col('white', 0.95); ctx.beginPath(); leafPath(ctx, -126, -140, Math.PI + 0.31, 26, 4.6, 0); ctx.fill();
        ctx.restore();
      }
    }
  };

  /* 四弦一声如裂帛：一幅白帛横在空中，从一头撕到另一头，上下两半各自卷开 */
  Kinds.silk = {
    z: 78, life: 6.5, max: 2, zone: 'mid',
    create(e) { e.L = e.L || 780; },
    draw(e, ctx, w) {
      const n = 30, h = 30, p = ease((e.age - 0.9) / 0.55), k = ease(e.age / 0.6) * clamp((e.life - e.age) / 1.6, 0, 1);
      const top = [], in1 = [], in2 = [], bot = [];
      for (let i = 0; i <= n; i++) {
        const u = i / n, x = e.x - e.L / 2 + u * e.L, y = e.y + Math.sin(u * 5 + w.t * 1.4) * 14;
        const open = clamp((p * 1.2 - (1 - u)) / 0.45, 0, 1), part = open * (30 + 84 * p * (0.6 + 0.4 * Math.sin(u * 9 + w.t * 3)));
        const jag = open > 0 ? (noise1(i * 3.7 + 2) - 0.5) * 12 * Math.min(1, open * 3) : 0;      // 撕开的毛边
        top.push(x, y - h - part * 0.9); in1.push(x, y - part * 0.9 + jag); in2.push(x, y + part + jag); bot.push(x, y + h + part);
      }
      const band = (A, B, al) => {
        ctx.beginPath(); ctx.moveTo(A[0], A[1]);
        for (let i = 2; i < A.length; i += 2) ctx.lineTo(A[i], A[i + 1]);
        for (let i = B.length - 2; i >= 0; i -= 2) ctx.lineTo(B[i], B[i + 1]);
        ctx.closePath(); ctx.fillStyle = w.col('white', al); ctx.fill();
      };
      ctx.globalAlpha *= k;
      softDot(ctx, e.x, e.y, e.L * 0.5, w.col('white', 0.12), w.col('white', 0));
      band(top, in1, 0.94); band(in2, bot, 0.88);
      mark(ctx, top, swell(1.3), w.ink(0.34)); mark(ctx, bot, swell(1.3), w.ink(0.34));
      for (let j = 1; j < 4; j++) {                                                // 帛上的几道褶
        const f = [];
        for (let i = 0; i <= n; i += 3) { const q = j / 4; f.push(top[i * 2], j < 2 ? lerp(top[i * 2 + 1], in1[i * 2 + 1], q * 2) : lerp(in2[i * 2 + 1], bot[i * 2 + 1], q * 2 - 1)); }
        if (j !== 2) mark(ctx, f, swell(0.9), w.ink(0.12));
      }
      if (p > 0 && p < 1) {                                                        // 裂口：一点白光，几缕断丝
        const i = Math.round((1 - p) * n), x = top[i * 2], y = (in1[i * 2 + 1] + in2[i * 2 + 1]) / 2;
        softDot(ctx, x, y, 80, w.col('white', 0.8), w.col('white', 0));
        for (let j = 0; j < 6; j++) mark(ctx, strand(x, y, (j - 2.5) * 0.45 + 0.2, 46, w.t * 9 + j, 6, 0), taper(1.2), w.col('white', 0.9));
      }
    }
  };

  /* =====================================================================
   *  卷二 · 九段
   * ===================================================================== */
  const put = (kind, x, y, extra) => (sec, S) => S.put(sec, kind, x, y, extra);
  const all = (...fs) => (sec, S, o) => fs.forEach((f) => f(sec, S, o));
  const spawn = (ch, x, y, more) => (sec) => { const e = sec.world.spawn(ch, x, y); if (e && more) Object.assign(e, more); };
  /* 泪要落在水面上（y=800），不是落到卷底 */
  const tears = (x, y) => (sec) => { const e = sec.world.spawn('泪', x, y); if (e) e.fall = 800 - y; };
  /* 找到这一段里某件摆设的选项（好在补字之后改它） */
  const opt = (sec, name, i) => (sec.def.back || []).concat(sec.def.front || []).filter((p) => p[0] === name)[i || 0][3];

  const host = (pose, more) => Object.assign({ s: 0.86, face: -1, pose: pose || 'rest' }, more);
  const guest = (pose, more) => Object.assign({ s: 0.82, face: -1, tone: 0.3, beard: false, pose: pose || 'rest', ph: 2 }, more);

  const SECTIONS = [
    { // ———————————————————— 序：元和十年，予左迁九江郡司马……命曰琵琶行
      name: '卷首', w: 1750, lines: [0, 7], text: { x: 1180, h: 440 },
      back: [['title', 1480, 230, { text: '琵琶行', size: 128, sub: '唐　白居易', seal: '乐天' }]],
      cam: [{ u: 0, z: 1, n: 0.1 }, { u: 1, z: 1, n: 0.14 }]
    },
    { // ———————————————————— 浔阳江头夜送客，枫叶荻花秋瑟瑟。主人下马客在船，举酒欲饮无管弦……别时茫茫江浸月
      name: '江头', w: 2600, lines: [8, 10], text: { x: 2500, h: 440 },
      init: [['草', 2300, 820], ['草', 1760, 824]],
      back: [['rock', 2360, 806, { w: 420, h: 300, seed: 6 }], ['glint', 470, 812, { need: '月' }]],
      front: [
        ['man', 1720, 800, { s: 1.02, pose: 'point' }], ['horse', 1900, 802, { s: 1.06, graze: true, need: '马' }],
        ['reeds', 1520, 818, { w: 260, n: 11, plume: true, need: '花' }], ['reeds', 1330, 824, { w: 200, n: 8, plume: true, need: '花' }],
        ['barge', 1010, 806, { s: 1.2, need: '船', crew: [['sitter', 20, null, guest('cup')]] }]
      ],
      wake: [
        { ch: '夜', key: '星', x: 1960, y: 210, u: 0.2 },                        // 夜送客：星出
        { ch: '枫', key: '枫', x: 2130, y: 400, u: 0.22, then: spawn('枫', 1640, 440) },
        { ch: '花', ctx: '荻花', x: 1440, y: 690, u: 0.36 },                     // 荻花：岸边的荻抽了白穗
        { ch: '马', x: 1900, y: 690, u: 0.38 },                                  // 主人下马
        { ch: '船', x: 1010, y: 640, u: 0.56 },                                  // 客在船
        { ch: '酒', x: 930, y: 728, u: 0.58, then: spawn('酒', 930, 740, { s: 0.62 }) },                        // 举酒欲饮
        { ch: '月', key: '月', x: 470, y: 240, u: 0.74 }                         // 江浸月
      ],
      cam: [{ u: 0, z: 1, n: 0.14 }, { u: 0.1, z: 1, n: 0.24 }, { u: 0.2, z: 1, n: 0.72 }, { u: 0.56, z: 1.1, y: 530, n: 0.8 }, { u: 1, z: 1, n: 0.8 }]
    },
    { // ———————————————————— 忽闻水上琵琶声……移船相近邀相见，添酒回灯重开宴。千呼万唤始出来，犹抱琵琶半遮面
      name: '闻声', w: 2600, lines: [11, 14], text: { x: 2500, h: 440 },
      back: [['lamp', 1648, 772, { s: 1, need: '灯' }]],
      front: [
        ['barge', 1900, 806, { s: 1.2, crew: [['sitter', 70, null, host('rest')], ['sitter', -40, null, guest('rest')]] }],
        ['barge', 1180, 806, { s: 1.1, face: 1, closed: true, slide: -560, need: '船' }],
        ['player', 1300, 770, { s: 1.12, face: 1, veil: true, need: '面' }]
      ],
      wake: [
        { ch: '水', key: '水', x: 900, y: 850, u: 0.3, sound: 'far', then: put('notes', 420, 640, { dir: 1 }) },   // 忽闻水上琵琶声
        { ch: '船', ctx: '移船', x: 1180, y: 640, u: 0.5 },                      // 移船相近
        { ch: '灯', x: 1648, y: 640, u: 0.52 },                                  // 添酒回灯
        { ch: '面', x: 1320, y: 600, u: 0.56 }                                   // 千呼万唤始出来，犹抱琵琶半遮面
      ],
      cam: [{ u: 0, z: 1, n: 0.8 }, { u: 0.3, z: 1, n: 0.8 }, { u: 0.56, z: 1.22, y: 570, n: 0.8 }, { u: 1, z: 1.22, y: 570, n: 0.8 }]
    },
    { // ———————————————————— 转轴拨弦三两声……大弦嘈嘈如急雨，小弦切切如私语。嘈嘈切切错杂弹，大珠小珠落玉盘
      name: '初弹', w: 2800, lines: [15, 20], text: { x: 2700, h: 440 },
      setup(sec) { opt(sec, 'player').play = 0; },
      back: [['lamp', 2262, 772, { s: 1 }]],
      front: [
        ['barge', 2500, 806, { s: 1.2, crew: [['sitter', 70, null, host('rest')], ['sitter', -40, null, guest('rest')]] }],
        ['barge', 1840, 806, { s: 1.1, face: 1 }],
        ['player', 1960, 770, { s: 1.12, face: 1, play: 0 }]
      ],
      wake: [
        { ch: '弦', ctx: '拨弦', x: 1700, y: 560, u: 0.26, sound: 'tune', stay: 4.5, then: all(put('notes', 1900, 690), (sec) => { opt(sec, 'player').play = 1; }) },
        { ch: '雨', key: '雨', x: 1150, y: 260, u: 0.48, sound: 'rain', stay: 5 },        // 大弦嘈嘈如急雨
        { ch: '珠', x: 620, y: 520, u: 0.72, sound: 'pearls', stay: 7, then: put('pearls', 620, 560) }     // 大珠小珠落玉盘
      ],
      cam: [{ u: 0, z: 1.22, y: 570, n: 0.8 }, { u: 0.26, z: 1.22, y: 570, n: 0.8 }, { u: 0.5, z: 1.04, y: 510, n: 0.8 }, { u: 1, z: 1, n: 0.8 }]
    },
    { // ———————————————————— 间关莺语花底滑，幽咽泉流冰下难……银瓶乍破水浆迸，铁骑突出刀枪鸣……四弦一声如裂帛……唯见江心秋月白
      name: '曲终', w: 3500, lines: [21, 26], text: { x: 3400, h: 440 },
      back: [
        ['rock', 2960, 850, { w: 620, h: 80, seed: 5 }], ['glint', 330, 812, { need: '月', n: 12 }],
        ['barge', 900, 800, { s: 0.5, plain: true, alpha: 0.7 }], ['barge', 620, 808, { s: 0.6, alpha: 0.7, face: 1 }], ['barge', 60, 804, { s: 0.55, plain: true, alpha: 0.7 }]
      ],
      wake: [
        { ch: '莺', key: '莺', x: 3010, y: 440, u: 0.12, sound: 'oriole' },      // 间关莺语
        { ch: '花', ctx: '花底', key: '花', x: 2960, y: 700, u: 0.13 },          // 花底滑
        { ch: '泉', key: '泉', x: 2420, y: 730, u: 0.3, sound: 'spring' },       // 幽咽泉流
        { ch: '冰', ctx: '冰泉', key: '冰', x: 2060, y: 836, u: 0.4, stay: 6.5 },           // 冰泉冷涩弦凝绝……此时无声胜有声
        { ch: '瓶', x: 1640, y: 560, u: 0.52, sound: 'burst', stay: 6, then: put('vase', 1640, 700) },     // 银瓶乍破水浆迸
        { ch: '骑', x: 1400, y: 660, u: 0.56, sound: 'riders', stay: 6.5, then: put('riders', 2500, 802) },  // 铁骑突出
        { ch: '刀', key: '剑', x: 1250, y: 430, u: 0.58 },                       // 刀枪鸣
        { ch: '帛', x: 820, y: 500, u: 0.72, sound: 'tear', stay: 6, then: put('silk', 820, 500) },        // 四弦一声如裂帛
        { ch: '月', key: '月', x: 330, y: 230, u: 0.88, sound: 'moon', stay: 6 }          // 唯见江心秋月白
      ],
      cam: [{ u: 0, z: 1, n: 0.8 }, { u: 0.3, z: 1.08, y: 560, n: 0.8 }, { u: 0.56, z: 1.04, y: 520, n: 0.8 }, { u: 0.74, z: 1, n: 0.8 }, { u: 0.9, z: 0.9, y: 450, n: 0.8 }, { u: 1, z: 0.94, y: 470, n: 0.78 }]
    },
    { // ———————————————————— 自言本是京城女……五陵年少争缠头，一曲红绡不知数……血色罗裙翻酒污……秋月春风等闲度
      name: '京城', w: 2900, lines: [27, 33], text: { x: 2800, h: 440 },
      back: [['rock', 1400, 862, { w: 2700, h: 92, seed: 3 }], ['city', 1560, 792, { w: 1300, need: '城' }], ['silks', 1040, 560, { need: '绡' }]],
      front: [
        ['player', 1560, 800, { s: 1.2, face: -1, young: true, play: 1.4 }],
        ['man', 1150, 800, { s: 0.96, face: 1, tone: 0.3, beard: false, pose: 'point' }], ['man', 1050, 806, { s: 1, face: 1, tone: 0.36, beard: false, pose: 'hold', ph: 2 }],
        ['man', 950, 800, { s: 0.94, face: 1, tone: 0.26, beard: false, ph: 4 }], ['sitter', 1320, 802, { s: 1, face: 1, tone: 0.34, pose: 'cup', beard: false }]
      ],
      wake: [
        { ch: '城', ctx: '京城', key: '楼', x: 2120, y: 690, u: 0.3 },           // 本是京城女
        { ch: '绡', x: 1160, y: 500, u: 0.5, sound: 'youth' },                   // 一曲红绡不知数
        { ch: '酒', ctx: '酒污', x: 1240, y: 740, u: 0.54, then: spawn('酒', 1240, 764, { s: 0.8 }) },          // 血色罗裙翻酒污
        { ch: '风', ctx: '春风', key: '风', x: 560, y: 470, u: 0.8, then: all(spawn('花', 420, 700), spawn('花', 760, 710), (sec) => { sec.world.season = '春'; }) }   // 秋月春风等闲度
      ],
      cam: [{ u: 0, z: 0.94, y: 470, n: 0.78 }, { u: 0.08, z: 0.98, n: 0.7 }, { u: 0.2, z: 1, n: 0.1 }, { u: 0.5, z: 1.12, y: 540, n: 0.02 }, { u: 0.9, z: 1, n: 0.08 }, { u: 1, z: 1, n: 0.3 }]
    },
    { // ———————————————————— 门前冷落鞍马稀，老大嫁作商人妇……去来江口守空船，绕船月明江水寒。夜深忽梦少年事，梦啼妆泪红阑干
      name: '飘零', w: 2700, lines: [34, 38], text: { x: 2600, h: 440 },
      back: [
        ['rock', 2330, 858, { w: 900, h: 84, seed: 9 }], ['gate', 2360, 800, {}], ['barge', 1560, 792, { s: 0.42, alpha: 0.5, plain: true }],
        ['glint', 500, 812, { need: '月' }], ['dream', 1180, 420, { need: '梦' }]
      ],
      front: [
        ['horse', 2050, 802, { s: 1, walk: 0.5, tone: 0.42, need: '马' }],
        ['barge', 900, 806, { s: 1.15, face: 1, need: '船', crew: [['player', 40, null, { s: 1, face: 1, idle: true }]] }]
      ],
      wake: [
        { ch: '马', ctx: '鞍马', x: 2050, y: 690, u: 0.16 },                     // 门前冷落鞍马稀
        { ch: '船', ctx: '空船', x: 900, y: 640, u: 0.52 },                      // 去来江口守空船
        { ch: '月', ctx: '月明', key: '月', x: 500, y: 230, u: 0.62 },           // 绕船月明江水寒
        { ch: '梦', ctx: '忽梦', x: 1180, y: 430, u: 0.64, sound: 'dream', stay: 5 },     // 夜深忽梦少年事
        { ch: '泪', x: 950, y: 650, u: 0.66, then: tears(950, 664) }  // 梦啼妆泪红阑干
      ],
      cam: [{ u: 0, z: 1, n: 0.3 }, { u: 0.1, z: 1, n: 0.74 }, { u: 0.6, z: 1.14, y: 540, n: 0.8 }, { u: 1, z: 1, n: 0.8 }]
    },
    { // ———————————————————— 同是天涯沦落人……谪居卧病浔阳城……黄芦苦竹绕宅生……杜鹃啼血猿哀鸣……往往取酒还独倾。岂无山歌与村笛
      name: '天涯', w: 3100, lines: [39, 47], text: { x: 3000, h: 440 },
      back: [
        ['lamp', 2412, 772, { s: 1 }], ['rock', 1150, 860, { w: 1700, h: 90, seed: 7 }], ['rock', 330, 812, { w: 460, h: 560, seed: 4, skew: 0.9 }],
        ['hut', 1240, 800, { s: 1.15 }], ['ape', 610, 420, { need: '猿' }]
      ],
      front: [
        ['barge', 2650, 806, { s: 1.2, crew: [['sitter', 70, null, host('rest')], ['sitter', -40, null, guest('rest')]] }], ['man', 2740, 772, { s: 0.92, pose: 'hold', need: '人' }],
        ['barge', 2000, 806, { s: 1.1, face: 1 }], ['player', 2120, 770, { s: 1.12, face: 1, play: 0 }],
        ['reeds', 1700, 822, { w: 300, n: 12, c: 'yellow', need: '芦' }], ['reeds', 880, 824, { w: 220, n: 8, c: 'yellow', need: '芦' }],
        ['sitter', 1010, 802, { s: 1, face: -1, pose: 'cup' }]
      ],
      wake: [
        { ch: '人', ctx: '沦落人', x: 2560, y: 560, u: 0.14 },                   // 同是天涯沦落人：主人起身一揖
        { ch: '芦', x: 1700, y: 690, u: 0.46 },                                  // 黄芦
        { ch: '竹', ctx: '苦竹', key: '竹', x: 1500, y: 430, u: 0.5 },           // 苦竹绕宅生
        { ch: '鹃', key: '鸟', x: 1000, y: 330, u: 0.6, then: (sec) => sec.world.dye(1000, 360, [0, 0.3, 0], 46, 0, 60) },   // 杜鹃啼血
        { ch: '猿', x: 610, y: 470, u: 0.7, sound: 'ape' },                      // 猿哀鸣
        { ch: '酒', ctx: '取酒', x: 900, y: 740, u: 0.72, then: spawn('酒', 900, 764, { s: 0.8 }) },           // 往往取酒还独倾
        { ch: '山', ctx: '山歌', key: '山', x: 300, y: 540, u: 0.84, sound: 'flute' }   // 岂无山歌与村笛
      ],
      // 主人起身一揖：站着的现出来，坐着的隐去
      tick(sec) { opt(sec, 'barge').crew[0][3].alpha = 1 - ease(opt(sec, 'man')._a || 0); },
      cam: [{ u: 0, z: 1, n: 0.8 }, { u: 0.14, z: 1.12, y: 545, n: 0.8 }, { u: 0.46, z: 1, n: 0.76 }, { u: 0.8, z: 1, n: 0.72 }, { u: 1, z: 1, n: 0.8 }]
    },
    { // ———————————————————— 却坐促弦弦转急。凄凄不似向前声，满座重闻皆掩泣。座中泣下谁最多？江州司马青衫湿
      name: '青衫', w: 2700, lines: [48, 51], text: { x: 2600, h: 440 },
      init: [['月', 620, 230], ['星', 1400, 200]],
      back: [['lamp', 1632, 772, { s: 1 }], ['glint', 620, 812, {}], ['title', 150, 300, { text: '琵琶行终', size: 50, seal: '词源' }]],
      front: [
        ['sitter', 1790, 774, { s: 1.04, face: -1, pose: 'rest' }], ['barge', 1870, 806, { s: 1.2, crew: [['sitter', -56, null, guest('rest')]] }],
        ['barge', 1220, 806, { s: 1.1, face: 1 }], ['player', 1340, 770, { s: 1.12, face: 1, play: 1 }]
      ],
      wake: [
        { ch: '弦', ctx: '促弦', x: 1130, y: 560, u: 0.3, sound: 'urgent', stay: 5, then: all(put('notes', 1280, 690), (sec) => { opt(sec, 'player').play = 2.6; }) },   // 却坐促弦弦转急
        { ch: '泣', ctx: '掩泣', x: 1930, y: 600, u: 0.34, then: all(tears(1926, 690), (sec) => { opt(sec, 'barge').crew[0][3].pose = 'weep'; }) },                       // 满座重闻皆掩泣
        { ch: '衫', x: 1790, y: 600, u: 0.36, sound: 'weep', stay: 8, then: all(tears(1784, 690), (sec) => { opt(sec, 'sitter').pose = 'weep'; }) }                                                                         // 江州司马青衫湿
      ],
      setup(sec) { opt(sec, 'player').play = 1; const h = opt(sec, 'sitter'); h.pose = 'rest'; h.blue = 0; opt(sec, 'barge').crew[0][3].pose = 'rest'; },
      // 青衫：补上「衫」，司马的袍子慢慢洇成青色
      tick(sec, dt) { const o = opt(sec, 'sitter'), on = sec.wake[2].bloomed; o.blue = clamp((o.blue || 0) + (on ? dt / 3 : -dt), 0, 1); },
      cam: [{ u: 0, z: 1, n: 0.8 }, { u: 0.3, z: 1.24, y: 580, n: 0.8 }, { u: 0.4, z: 1.24, y: 580, n: 0.8 }, { u: 0.8, z: 1, n: 0.8 }, { u: 1, z: 1, n: 0.78 }]
    }
  ];

  let L = 0;
  for (const s of SECTIONS) L += s.w;
  const left = [];
  { let r = L; for (const s of SECTIONS) { r -= s.w; left.push(r); } }
  const bank = left[1] + 1560;                              // 浔阳江头的岸：到第二段中间为止，往后一路是江

  MS.Scrolls.pipa = {
    id: 'pipa', title: '琵琶行', label: '卷二 · 琵琶行',
    text: MS.PIPA_TEXT, sections: SECTIONS, linger: 5,       // 开卷先停一停：序在这里
    ground: { from: L + 400, to: bank, y: 800 },
    river: { from: bank + 250, y: 800 },
    mists: [
      { X: left[1] + 30, y: 700, r: 420, a: 0.8 },          // 别时茫茫
      { X: left[3] + 20, y: 560, r: 460, a: 0.8 },
      { X: left[4] + 60, y: 600, r: 640 },                  // 入往事
      { X: left[5] + 60, y: 620, r: 640 },                  // 出往事
      { X: left[6] + 40, y: 640, r: 480, a: 0.85 },
      { X: left[7] + 30, y: 600, r: 460, a: 0.8 }
    ]
  };
})();
