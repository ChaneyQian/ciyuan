/* 词源 · style.js — 世界的画法（风格）
 *   ink   水墨晕染（默认）：宣纸、墨、淡彩
 *   sand  沙画：灯箱上的沙——亮的是透上来的光，暗的是沙；沙厚处近黑，薄处透出琥珀色
 *
 * 换风格只动三处，物象自己的画法一行不改：
 *   1. 调色盘    world.col() 取色时先问这里（Style.pal）
 *   2. 流体成像  fluid.js 的 display 着色器按 fluid.sand 分支：墨的浓淡变成沙粒的疏密
 *   3. 画布后处理 Style.grain()：给 2D 画布上的物象打一层沙粒——漏光的小孔与深浅不匀的粒
 * 界面的纸色、墨色跟着 body 上的类名（style.css 里的变量）走。
 */
(function () {
  'use strict';
  const MS = (window.MS = window.MS || {});

  /* 沙画的调色盘：单色。白昼是灯箱——底是暖光，沙是深褐；各「色」只在深浅上分开，略带一点原来的色相。
   * 夜里灯箱熄了，沙自己泛着月色：底近黑，沙是淡金。           白昼              夜 */
  const SAND = {
    ink:    [[52, 31, 14],     [236, 212, 168]],
    red:    [[118, 48, 18],    [240, 170, 110]],
    green:  [[78, 60, 26],     [190, 196, 150]],
    leaf:   [[92, 70, 28],     [204, 200, 146]],
    yellow: [[186, 128, 48],   [250, 220, 150]],
    pink:   [[170, 104, 66],   [248, 196, 160]],
    orange: [[160, 84, 28],    [246, 180, 110]],
    blue:   [[66, 50, 38],     [176, 184, 190]],
    paper:  [[244, 208, 142],  [14, 11, 12]],
    white:  [[255, 238, 196],  [250, 236, 204]],
    warm:   [[214, 150, 70],   [252, 206, 130]],
    cream:  [[232, 190, 122],  [250, 226, 176]]
  };

  /* 发光之物（日、灯、火、霞、光）在沙画里不是一团深色的沙，而是擦亮的玻璃：把暖色都换成「光」 */
  const GLASS = Object.assign({}, SAND);
  for (const [k, c] of [['red', [255, 228, 172]], ['orange', [255, 240, 200]], ['yellow', [255, 244, 208]], ['warm', [255, 236, 190]], ['pink', [255, 232, 186]], ['cream', [255, 244, 212]]]) GLASS[k] = [c, SAND[k][1]];
  const LUM = { sun: 1, lantern: 1, fire: 1, glow: 1, light: 1 };

  const S = (MS.Style = {
    name: 'ink',
    list: [['ink', '水墨'], ['sand', '沙画']],
    pal: null,                                   // null：用 world.js 里水墨的原色
    label() { return (S.list.find((x) => x[0] === S.name) || S.list[0])[1]; },
    next() { const i = S.list.findIndex((x) => x[0] === S.name); return S.list[(i + 1) % S.list.length][0]; },
    set(name) {
      if (!S.list.some((x) => x[0] === name)) name = 'ink';
      S.name = name;
      S.pal = name === 'sand' ? SAND : null;
      for (const x of S.list) document.body.classList.toggle(x[0], x[0] === name && name !== 'ink');
      return name;
    }
  });

  /* 画一样发光之物之前：先在它四周留一圈沙（亮处要有暗处衬），再把调色盘换成「光」。返回 true 则画完要 leave() */
  S.enter = function (e, ctx, w) {
    if (S.name !== 'sand' || !LUM[e.kind]) return false;
    const day = 1 - w.nightK;
    if (day > 0.02 && (e.kind === 'sun' || e.kind === 'lantern' || e.kind === 'fire')) {
      const c = [e.x, e.y], r = e.kind === 'sun' ? (e.r || 40) : e.kind === 'fire' ? 34 : 26;
      const g = ctx.createRadialGradient(c[0], c[1], r * 0.85, c[0], c[1], r * 2.6);
      g.addColorStop(0, w.ink(0.4 * day)); g.addColorStop(0.4, w.ink(0.17 * day)); g.addColorStop(1, w.ink(0));
      ctx.save(); ctx.globalAlpha *= Math.min(1, e.age / 2); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c[0], c[1], r * 2.6, 0, 6.2832); ctx.fill(); ctx.restore();
    }
    S.pal = GLASS;
    return true;
  };
  S.lit = (kind) => S.name === 'sand' && !!LUM[kind];
  S.leave = function () { S.pal = S.name === 'sand' ? SAND : null; };

  /* ---------- 沙粒 ---------- */
  let holes = null, specks = null, speckKey = '';
  function tile(fn) {
    const c = document.createElement('canvas'); c.width = c.height = 192;
    const g = c.getContext('2d'), im = g.createImageData(192, 192), d = im.data;
    for (let i = 0; i < d.length; i += 4) fn(d, i);
    g.putImageData(im, 0, 0);
    return c;
  }
  /* 在已经画好物象的 2D 画布上打沙粒。ctx 的坐标是 CSS 像素；night 0..1 */
  S.grain = function (ctx, W, H, night) {
    if (S.name !== 'sand') return;
    if (!holes) holes = tile((d, i) => { const r = Math.random(); d[i] = d[i + 1] = d[i + 2] = 0; d[i + 3] = r < 0.26 ? 90 + Math.random() * 165 : r < 0.5 ? Math.random() * 70 : 0; });   // 漏光的孔
    const key = night > 0.5 ? 'n' : 'd';
    if (speckKey !== key) {                                                      // 深浅不匀的粒：有的更暗，有的反光
      speckKey = key;
      const dark = night > 0.5 ? [120, 96, 64] : [26, 14, 6], lite = night > 0.5 ? [255, 244, 214] : [255, 226, 168];
      specks = tile((d, i) => { const r = Math.random(), c = r < 0.16 ? dark : r > 0.9 ? lite : null; if (c) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 50 + Math.random() * 120; } else d[i + 3] = 0; });
    }
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = ctx.createPattern(holes, 'repeat'); ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = ctx.createPattern(specks, 'repeat'); ctx.fillRect(0, 0, W, H);
    ctx.restore();
  };
})();
