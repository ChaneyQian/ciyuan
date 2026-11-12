/* 词源 · scroll.js — 人间词话：把一篇古文演成一幅手卷
 *
 * 手卷是从右往左看的。整卷画在一条很长的平面上（高恒为 1000 个单位，宽是各段之和），
 * 只有一个镜头沿着它走，从头到尾不切换——所谓「一镜到底」。换景全靠镜头自己的动作：
 *   平移视差 · 推近拉远 · 升降 · 云雾过场 · 昼夜流转
 * 每一段（section）有自己的一小方天地（一个 MS.World），所以字库里那些会活的字都能直接落进去。
 *
 * 画是看画的人写出来的：
 *   原文里空着一些字（字眼）。镜头走到缺字处就停下，等你把那个字补上——
 *     写 —— 直接在画上写出这个字（手写判定）；
 *     选 —— 在几个候选里点一个；
 *     描 —— 画里有它淡淡的古字，拿笔描出来。
 *   补对了，字溯源、化形，画里多出它说的那样东西，镜头才接着往下走。
 *   「自在」是让它自己写；走过的地方可以用滚轮、方向键回看。
 */
(function () {
  'use strict';
  const MS = window.MS;
  const { clamp, lerp, ease, easeOut, softDot, leafPath, noise1, brushPath, mulberry, TAU } = MS.util;
  const { mark, strand, swell, taper } = MS.ink;
  const VH = 1000;

  const S = (MS.Scroll = {
    active: false, phase: 'idle', u: 0, vol: null, p: 0, pt: 0, auto: false, t: 0, hold: 0, autoT: 0, nudge: 0,
    cam: { x: 0, y: 500, z: 1, n: 0 }, W: 1, H: 1, k: 1, hits: [], ptr: { x: -999, y: -999, down: false, moved: 9 }
  });
  MS.Scrolls = MS.Scrolls || {};
  const P = (S.props = {});             // 可以摆进画里的东西：P.name(ctx, world, x, y, opts, env)

  /* ---------- 开卷 / 收卷 ---------- */
  S.open = function (id, fluid, W, H) {
    const def = MS.Scrolls[id];
    if (!def || S.active) return false;
    S.fluid = fluid; S.W = W; S.H = H;
    const vol = (S.vol = { def, secs: [], keys: [], beats: [], bi: 0, L: 0 });
    let total = 0;
    for (const d of def.sections) total += d.w;
    vol.L = total;
    let right = total;
    for (const d of def.sections) {
      const sec = { def: d, w: d.w, x0: right - d.w, wake: (d.wake || []).map((o) => Object.assign({ done: false, n: 0 }, o)) };
      right -= d.w;
      // 这一段自己的小天地：坐标是段内的，流体的事转给真的流体
      sec.world = new MS.World({
        ok: true, night: 0, tint: [1, 1, 1],
        splat(x, y, vx, vy, pig, r) { const q = S.toScreen(sec.x0 + x, y); fluid.splat(q[0], q[1], vx * S.k, vy * S.k, pig, r * S.k); },
        wash(x, y, r, s) { const q = S.toScreen(sec.x0 + x, y); fluid.wash(q[0], q[1], r * S.k, s); },
        fade() {}
      });
      sec.world.resize(d.w, VH);
      sec.world.feather = Math.min(520, d.w * 0.3);   // 这一段只是长卷的一截：横贯的染色到两头要化开
      for (const it of d.init || []) { const e = sec.world.spawn(it[0], it[1], it[2]); if (e && it[3]) Object.assign(e, it[3]); }
      if (d.setup) d.setup(sec);
      sec.world.events.length = 0;
      for (const pr of (d.back || []).concat(d.front || [])) if (pr[3]) pr[3]._a = pr[3].need ? 0 : 1;
      for (const c of d.cam || []) vol.keys.push({ X: sec.x0 + d.w * (1 - c.u), y: c.y == null ? 500 : c.y, z: c.z || 1, n: c.n || 0 });
      sec.wake.forEach((o, i) => vol.beats.push({ sec, i, o }));
      vol.secs.push(sec);
    }
    if (!vol.keys.length) vol.keys.push({ X: total, y: 500, z: 1, n: 0 });
    vol.keys.sort((a, b) => b.X - a.X);
    buildText(vol);
    S.active = true; S.phase = 'open'; S.u = 0; S.p = S.pt = 0; S.auto = false; S.t = 0; S.cur = -1; S.hold = 0; S.autoT = 0; S.shown = null;
    document.body.classList.add('scrolling');
    return true;
  };
  S.close = function () { if (S.active && S.phase !== 'close') { S.phase = 'close'; S.auto = false; ask.className = ''; } };
  function finish() {
    S.active = false; S.phase = 'idle'; S.vol = null;
    textBox.textContent = ''; bar.textContent = ''; ask.className = '';
    document.body.classList.remove('scrolling');
    if (S.onClose) S.onClose();
  }

  /* ---------- 镜头 ---------- */
  S.toScreen = (X, Y) => [S.W / 2 + (X - S.cam.x) * S.k, S.H / 2 + (Y - S.cam.y) * S.k];
  S.toWorld = (sx, sy) => [S.cam.x + (sx - S.W / 2) / S.k, S.cam.y + (sy - S.H / 2) / S.k];
  function span() { const half = S.W / 2 / (S.H / VH), xmax = S.vol.L - half; return [Math.min(half, xmax), xmax]; }
  /* 镜头中心落在卷上 X 处，相当于走了几成 */
  function pOf(X) { const [xmin, xmax] = span(); return xmax > xmin ? clamp((xmax - X) / (xmax - xmin), 0, 1) : 0; }
  function camera() {
    const vol = S.vol, k0 = S.H / VH, [xmin, xmax] = span(), c = S.cam;
    c.x = lerp(xmax, xmin, S.p);
    // 镜头中心到不了卷的两端（差半个画面），查关键帧时把它的行程摊回整卷，卷尾的那一帧才取得到
    const K = vol.keys, xe = xmax > xmin ? (c.x - xmin) / (xmax - xmin) * vol.L : c.x;
    let a = K[0], b = K[K.length - 1];
    if (xe >= K[0].X) b = a; else if (xe <= b.X) a = b;
    else for (let i = 0; i < K.length - 1; i++) if (xe <= K[i].X && xe >= K[i + 1].X) { a = K[i]; b = K[i + 1]; break; }
    const u = a === b ? 0 : ease((a.X - xe) / (a.X - b.X));
    c.y = lerp(a.y, b.y, u); c.z = lerp(a.z, b.z, u); c.n = lerp(a.n, b.n, u);
    S.k = k0 * c.z;
    const h2 = S.W / 2 / S.k;                      // 推近时别把卷首卷尾之外露出来
    c.x = clamp(c.x, Math.min(h2, vol.L / 2), Math.max(vol.L - h2, vol.L / 2));
  }
  S.secAt = function (X) { for (const s of S.vol.secs) if (X >= s.x0 && X < s.x0 + s.w) return s; return null; };

  /* 往某一段里直接放一个灵（不经字库：一卷自己的东西，如裂帛、银瓶） */
  S.put = function (sec, kind, x, y, extra) {
    const w = sec.world, K = MS.Kinds[kind];
    if (!K) return null;
    const e = Object.assign({ id: w.uid++, kind, ch: '', x, y, age: 0, fade: 1, life: K.life || Infinity, seed: (Math.random() * 1e9) | 0, z: K.z || 50 }, extra);
    e.rng = mulberry(e.seed);
    K.create(e, w);
    w.ents.push(e); w.ents.sort((a, b) => a.z - b.z);
    return e;
  };

  /* ---------- 缺字：画往下走的关口 ---------- */
  S.beat = function () { const v = S.vol; return v && v.bi < v.beats.length ? v.beats[v.bi] : null; };
  /* 当前缺字处镜头该停在哪（走了几成）；全补完了就是卷尾 */
  function gate() {
    const b = S.beat();
    if (!b) return 1;
    return pOf(b.sec.x0 + b.sec.w * (1 - (b.o.u == null ? 1 - b.o.x / b.sec.w : b.o.u)));
  }
  /* 镜头到了缺字处、正等着人落笔 */
  S.waiting = function () { return S.phase === 'view' && !!S.beat() && S.hold <= 0 && Math.abs(S.p - gate()) < 0.004; };
  S.goto = function (i) {
    const sec = S.vol.secs[i]; if (!sec) return;
    S.pt = Math.min(gate(), pOf(sec.x0 + sec.w - S.W / 2 / (S.H / VH) * 0.9));
    S.auto = false;
  };

  /* ---------- 原文：一段一方竖排的题字，缺的字空着 ---------- */
  const textBox = document.createElement('div'); textBox.id = 'st';
  const bar = document.createElement('div'); bar.id = 'sbar';
  const ask = document.createElement('div'); ask.id = 'sq';
  document.body.append(textBox, bar, ask);
  function buildText(vol) {
    textBox.textContent = ''; bar.textContent = '';
    vol.secs.forEach((sec, si) => {
      const d = sec.def;
      if (d.lines) {
        // 先定下每个字眼是原文里的哪一个字（同一个字出现几次时靠 ctx 认）
        const where = {};
        sec.wake.forEach((o, k) => {
          for (let i = d.lines[0]; i <= d.lines[1]; i++) {
            const line = vol.def.text[i];
            let pos = -1;
            if (o.ctx) { const c = line.indexOf(o.ctx); if (c >= 0) pos = c + o.ctx.indexOf(o.ch); }
            else { pos = line.indexOf(o.ch); while (pos >= 0 && where[i + ':' + pos] != null) pos = line.indexOf(o.ch, pos + 1); }
            if (pos >= 0) {
              where[i + ':' + pos] = k;
              const parts = line.split('，'); let acc = 0;        // 这个字所在的那半句，出题用
              for (const part of parts) { if (pos < acc + part.length) { o.clause = part; o.cpos = pos - acc; break; } acc += part.length + 1; }
              return;
            }
          }
        });
        const anchor = document.createElement('div'); anchor.className = 'st-a';
        const blk = document.createElement('div'); blk.className = 'st-b';
        blk.style.height = ((d.text && d.text.h) || 400) / 29 + 'em';
        for (let i = d.lines[0]; i <= d.lines[1]; i++) {
          const col = document.createElement('p');
          [...vol.def.text[i]].forEach((c, pos) => {
            if (c === '，') { col.appendChild(document.createElement('i')); return; }
            const k = where[i + ':' + pos];
            if (k != null) { const b = document.createElement('b'); b.textContent = c; b.className = 'todo'; sec.wake[k].el = b; col.appendChild(b); }
            else col.append(c);
          });
          blk.appendChild(col);
        }
        anchor.appendChild(blk); textBox.appendChild(anchor);
        sec.textEl = anchor;
      }
      const bt = document.createElement('button'); bt.type = 'button'; bt.textContent = d.name;
      bt.addEventListener('click', () => S.goto(si));
      bar.appendChild(bt); sec.barEl = bt;
    });
  }

  /* 出题：半句原文，缺一个字，下面几个候选 */
  function options(b) {
    if (b.o.pick) return b.o.pick;
    const pool = [], seen = new Set([b.o.ch]);
    const add = (c) => { if (!seen.has(c)) { seen.add(c); pool.push(c); } };
    const g = (MS.CHARS[b.o.key || b.o.ch] || {}).group;
    for (const c of MS.CHAR_LIST) if (MS.CHARS[c].group === g) add(c);           // 先取同类的字来混淆
    for (const x of S.vol.beats) add(x.o.ch);
    const r = mulberry(b.o.ch.charCodeAt(0) * 31 + b.i * 7 + 5), out = [b.o.ch];
    const near = pool.slice(0, Math.max(3, Math.min(pool.length, 8)));
    while (out.length < 4 && near.length) out.push(near.splice((r() * near.length) | 0, 1)[0]);
    for (let i = out.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [out[i], out[j]] = [out[j], out[i]]; }
    return (b.o.pick = out);
  }
  function showAsk(b) {
    if (S.shown === b) return;
    S.shown = b;
    for (const x of S.vol.beats) if (x.o.el) x.o.el.classList.toggle('now', x === b);
    if (!b) { ask.className = ''; return; }
    ask.textContent = '';
    const q = document.createElement('p'); q.className = 'q';
    const cl = b.o.clause || b.o.ch, cp = b.o.cpos == null ? 0 : b.o.cpos;
    q.append(cl.slice(0, cp)); const gap = document.createElement('u'); q.appendChild(gap); q.append(cl.slice(cp + 1));
    const row = document.createElement('div'); row.className = 'opts';
    for (const c of options(b)) {
      const bt = document.createElement('button'); bt.type = 'button'; bt.textContent = c;
      bt.addEventListener('click', (ev) => { ev.stopPropagation(); if (!S.answer(c, 'pick')) { bt.disabled = true; bt.classList.add('no'); } });
      row.appendChild(bt);
    }
    const tip = document.createElement('p'); tip.className = 'tip'; tip.textContent = '在画上写出这个字 · 或点选 · 或描画里淡淡的古字';
    ask.append(q, row, tip);
    if (S.onBeat) S.onBeat(b, options(b));
  }

  /* ---------- 补字 ---------- */
  function shapeOf(o) {
    if (o.shape !== undefined) return o.shape;
    const G = MS.GLYPHS || {};
    o.gch = G[o.ch] ? o.ch : (o.key && G[o.key] ? o.key : o.ch);
    return (o.shape = MS.Glyphs.shape(o.gch));
  }
  /* 有人答了一个字（写的、选的）。对了就落成，返回 true */
  S.answer = function (ch, how, pts) {
    const b = S.beat();
    if (!b || S.phase !== 'view') return false;
    if (ch !== b.o.ch) { S.nudge = 1; if (S.onWrong) S.onWrong(ch, b.o, how); return false; }
    solve(b, how, pts);
    return true;
  };
  function solve(b, how, pts) {
    const o = b.o, sec = b.sec;
    o.done = true;
    if (o.el) { o.el.classList.remove('todo', 'now'); o.el.classList.add('done'); }
    // 字落在画里它该在的地方；但镜头推近时那地方可能贴着边，字和字注得留在画心之内
    const gs = clamp(150 * S.k, 90, 220), mg = gs * 0.6 + S.H * 0.06;
    const at = () => { const p = S.toScreen(sec.x0 + o.x, o.y); return [clamp(p[0], mg, S.W - mg), clamp(p[1], mg, S.H - mg - 78)]; };
    const q = at(), def = MS.CHARS[o.key || o.ch];
    const trace = how === 'trace';
    const m = MS.Glyphs.add(trace ? o.gch || o.ch : o.ch, q[0], q[1], {
      mode: trace ? 'full' : 'quick', reverse: trace, anchor: at, hand: pts, size: gs, world: sec.world, known: true,
      note: def && def.note,
      onStage(idx) { if (S.onSound) S.onSound(idx ? 'stage' : 'tone', { idx, tone: def ? def.tone : '平', i: 3 }); },
      onBloom() {
        o.bloomed = true;
        for (const kc of (o.key ? [o.key] : []).concat(o.also || [])) sec.world.spawn(kc, o.x, o.y);
        if (o.then) o.then(sec, S, o);
        if (S.onSound) { if (o.sound) S.onSound('song', { name: o.sound }); else S.onSound('bloom', { kind: def ? def.kind : 'mountain' }); }
      }
    });
    // 等字演完，镜头再往下一处走
    const v = S.vol;
    while (v.bi < v.beats.length && v.beats[v.bi].o.done) v.bi++;
    S.hold = Math.max((m && m.n ? m.tIn + m.n * m.hold + (m.n - 1) * m.tr + m.tOut : 3) * 0.78, o.stay || 0); S.autoT = 0; S.shown = undefined; ask.className = '';
    if (S.onSolve) S.onSolve(o, sec);
  }
  /* 拿笔描画里的古字：墨点盖住它一半以上，就算描成了 */
  function trace(lx, ly, sec) {
    const b = S.beat();
    if (!b || b.sec !== sec || !S.waiting()) return false;
    const o = b.o, R = 46;
    if (Math.abs(lx - o.x) > 130 || Math.abs(ly - o.y) > 130) return false;
    const sh = shapeOf(o); if (!sh) return false;
    if (!o.inked) o.inked = new Uint8Array(sh.pts.length / 2);
    const sz = 160;
    for (let j = 0; j < o.inked.length; j += 2) {
      if (o.inked[j]) continue;
      const dx = o.x + sh.pts[j * 2] * sz - lx, dy = o.y + sh.pts[j * 2 + 1] * sz - ly;
      if (dx * dx + dy * dy < R * R) { o.inked[j] = 1; o.n++; }
    }
    if (o.n > o.inked.length / 2 * 0.52) { solve(b, 'trace'); return 'done'; }
    return true;
  }

  /* ---------- 输入 ---------- */
  /* 返回这一笔算什么：'write' 写字 · 'pan' 拖卷 · 'ink' 只是落墨 */
  S.pointerDown = function (x, y, touch) {
    const p = S.ptr; p.x = x; p.y = y; p.down = true; p.moved = 0; p.travel = 0; p.traced = 0;
    p.mode = S.waiting() ? 'write' : touch ? 'pan' : 'ink';
    return p.mode;
  };
  S.pointerMove = function (x, y) {
    const p = S.ptr;
    if (p.down) {
      p.travel += Math.hypot(x - p.x, y - p.y);
      if (p.mode === 'pan') { if (S.phase === 'view') { S.auto = false; S.pt = clamp(S.pt + (x - p.x) / (S.vol.L * S.H / VH), 0, gate()); } }
      else if (p.mode === 'write') { const q = S.toWorld(x, y), sec = S.secAt(q[0]); if (sec) { const r = trace(q[0] - sec.x0, q[1], sec); if (r) p.traced++; if (r === 'done') p.mode = 'ink'; } }
    }
    p.x = x; p.y = y; p.moved = 0;
  };
  /* 抬笔。返回 true 表示这一笔主要是在描古字（不必再当手写去认） */
  S.pointerUp = function () {
    const p = S.ptr, was = p.down;
    if (was && p.travel < 7) for (let i = S.hits.length - 1; i >= 0; i--) { const h = S.hits[i]; if (Math.hypot(p.x - h.x, p.y - h.y) < h.r) { h.fn(); break; } }
    p.down = false;
    return was && p.traced > 6;
  };
  function push(d) {                     // 往前走不过关口；撞上了就让题目闪一下
    const g = gate(), to = S.pt + d;
    if (to > g + 1e-6 && S.beat()) S.nudge = 1;
    S.pt = clamp(to, 0, g); S.auto = false; S.user = 1;
  }
  S.wheel = function (d) { if (S.phase === 'view') push(d / (S.vol.L * S.H / VH) * 1.1); };
  S.key = function (e) {
    if (S.phase !== 'view') return false;
    const step = S.W * 0.5 / (S.vol.L * S.H / VH);
    if (e.key === 'ArrowLeft' || e.key === 'PageDown') { push(step); return true; }
    if (e.key === 'ArrowRight' || e.key === 'PageUp') { push(-step); return true; }
    if (e.key === ' ') { S.auto = !S.auto; S.autoT = 0; return true; }
    if (e.key === 'Escape') { S.close(); return true; }
    return false;
  };

  /* ---------- 每帧 ---------- */
  S.update = function (dt, W, H) {
    if (!S.active) return;
    S.W = W; S.H = H; S.t += dt;
    const vol = S.vol;
    if (S.phase === 'open') { S.u += dt / 2.4; S.fluid.fade(Math.exp(-dt * 3)); if (S.u >= 1) { S.u = 1; S.phase = 'view'; if (vol.def.linger) S.hold = vol.def.linger; else S.pt = gate(); } }
    else if (S.phase === 'close') { S.u -= dt / 1.5; if (S.u <= 0) { finish(); return; } }
    // 一个字演完了：往下一处缺字走
    if (S.hold > 0 && (S.hold -= dt) <= 0) S.pt = gate();
    // 自在：它自己写
    if (S.auto && S.phase === 'view') {
      if (S.waiting()) { S.autoT += dt; if (S.autoT > 1.5) { S.autoT = 0; solve(S.beat(), 'pick'); } }
      else if (!S.beat() && S.hold <= 0) S.pt = 1;
    }
    S.pt = Math.min(S.pt, gate());
    // 镜头不急：匀着往目标走，快到了再缓下来
    S.user = Math.max(0, (S.user || 0) - dt);
    const dp = S.pt - S.p, vmax = dt * (S.W / (vol.L * S.H / VH)) * (S.user > 0 ? 2.6 : 0.42);   // 自己拉的时候跟手，它自己走的时候从容
    S.p += clamp(dp * Math.min(1, dt * 3), -vmax * 2.2, vmax);
    camera();
    S.fluid.night = S.cam.n; S.fluid.tint = [1, 1, 1];
    S.ptr.moved += dt; S.nudge *= Math.exp(-dt * 4);
    const view = S.W / S.k, wp = S.toWorld(S.ptr.x, S.ptr.y);
    let cur = 0;
    vol.secs.forEach((sec, i) => {
      const mid = sec.x0 + sec.w / 2, near = Math.abs(mid - S.cam.x) < sec.w / 2 + view * 0.75;
      sec.near = near;
      if (S.cam.x >= sec.x0 && S.cam.x < sec.x0 + sec.w) cur = i;
      if (!near) return;
      const w = sec.world;
      w.night = S.cam.n > 0.5;
      const pt = w.pointer, lx = wp[0] - sec.x0;
      if (lx > -200 && lx < sec.w + 200 && S.ptr.moved < 4) { pt.x = lx; pt.y = wp[1]; pt.moved = S.ptr.moved; } else pt.moved = 9;
      // 要等某个字补上才现身的东西：慢慢显出来
      for (const pr of (sec.def.back || []).concat(sec.def.front || [])) {
        const o = pr[3]; if (!o || !o.need) continue;
        const on = sec.wake.some((x) => (x.id || x.ch) === o.need && x.bloomed);
        o._a = clamp((o._a || 0) + (on ? dt / 1.6 : -dt), 0, 1);
      }
      if (sec.def.tick) sec.def.tick(sec, dt, S);
      w.update(dt);
      if (w.events.length) { if (S.onSound) for (const ev of w.events) S.onSound('event', ev); w.events.length = 0; }
    });
    // 题字不随推拉放大缩小，只跟着画左右走，始终贴着上边
    textBox.style.fontSize = 29 * S.H / VH + 'px';
    textBox.style.opacity = S.phase === 'view' ? 1 : ease(S.u * 2 - 1);
    for (const sec of vol.secs) {
      if (!sec.textEl) continue;
      const tx = sec.def.text || {}, q = [S.toScreen(sec.x0 + (tx.x == null ? sec.w - 120 : tx.x), 0)[0], S.H * 0.052 + 18];
      sec.textEl.style.display = sec.near ? '' : 'none';
      if (!sec.near) continue;
      // 段很宽：走到它左半边时，题字贴住右缘跟着走，直到这一段自己把它带出画外
      if (sec.bwAt !== S.H || !sec.bw) { sec.bwAt = S.H; sec.bw = sec.textEl.firstChild.offsetWidth; }
      q[0] = Math.max(Math.min(q[0], S.W - 26), S.toScreen(sec.x0, 0)[0] + sec.bw + 30);
      sec.textEl.style.transform = 'translate(' + q[0].toFixed(1) + 'px,' + q[1].toFixed(1) + 'px)';
    }
    if (cur !== S.cur) { S.cur = cur; vol.secs.forEach((s, i) => s.barEl.classList.toggle('on', i === cur)); if (S.onSection) S.onSection(vol.secs[cur], cur); }
    // 题目：镜头到了才出
    const wait = S.waiting();
    showAsk(wait ? S.beat() : null);
    ask.className = (wait ? 'show' : '') + (S.nudge > 0.3 ? ' nudge' : '');
  };

  /* 远山：两重，各走各的慢（视差） */
  function farHills(ctx, w, f, base, hgt, alpha, seed) {
    const W = S.W, H = S.H, k = S.k, c = S.cam;
    const y0 = H / 2 + (base - c.y) * k * (0.35 + f * 0.65);
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let sx = 0; sx <= W + 12; sx += 12) {
      const X = c.x * f + (sx - W / 2) / k * (0.55 + f * 0.45) + seed * 977;
      const h = (noise1(X * 0.0016 + seed) * 0.62 + noise1(X * 0.0052 + seed * 3) * 0.3 + noise1(X * 0.019) * 0.08);
      ctx.lineTo(sx, y0 - Math.pow(h, 1.5) * hgt * k);
    }
    ctx.lineTo(W, H); ctx.closePath();
    const g = ctx.createLinearGradient(0, y0 - hgt * k, 0, y0 + 60 * k);
    const al = alpha * (1 - S.cam.n * 0.62);
    g.addColorStop(0, w.ink(al)); g.addColorStop(0.55, w.ink(al * 0.55)); g.addColorStop(1, w.ink(0));
    ctx.fillStyle = g; ctx.fill();
  }
  /* 洛川：从某处起，一路流到卷尾 */
  function river(ctx, w, R) {
    const k = S.k, a = S.toScreen(R.from, R.y), b = S.toScreen(0, R.y), W = S.W, H = S.H;
    const x1 = Math.min(W, a[0]), x0 = Math.max(0, b[0] - 400 * k);
    if (x1 <= 0) return;
    const y = a[1];
    const g = ctx.createLinearGradient(0, y - 10 * k, 0, y + 190 * k);
    g.addColorStop(0, w.col('blue', 0)); g.addColorStop(0.25, w.col('blue', 0.085)); g.addColorStop(1, w.col('blue', 0.02));
    ctx.fillStyle = g; ctx.fillRect(x0, y - 10 * k, x1 - x0, H - y + 10 * k);
    ctx.lineCap = 'round';
    for (let j = 0; j < 9; j++) {
      const yy = y + (8 + j * j * 2.6) * k, ph = S.t * (0.5 + j * 0.07) + j * 1.7, amp = (2 + j * 0.5) * k;
      ctx.strokeStyle = w.ink(0.3 - j * 0.022); ctx.lineWidth = Math.max(0.6, 1.15 * k);
      ctx.beginPath();
      let pen = false;
      for (let sx = x0; sx <= x1; sx += 9) {
        const X = S.cam.x + (sx - W / 2) / k, gap = noise1(X * 0.006 + j * 7.3 + S.t * 0.02) < 0.34 + j * 0.03;
        const edge = clamp((a[0] - sx) / (120 * k), 0, 1);
        if (gap || edge < 0.05) { pen = false; continue; }
        const yv = yy + Math.sin(X * 0.02 + ph) * amp;
        if (!pen) { ctx.moveTo(sx, yv); pen = true; } else ctx.lineTo(sx, yv);
      }
      ctx.stroke();
    }
  }
  /* 岸与地：一抹淡墨，上缘提一笔 */
  function ground(ctx, w, G) {
    const k = S.k, a = S.toScreen(G.to, G.y), b = S.toScreen(G.from, G.y), W = S.W, H = S.H;
    if (b[0] < 0 || a[0] > W) return;
    const x0 = Math.max(-40, a[0]), x1 = Math.min(W + 40, b[0]);
    ctx.beginPath();
    let first = true;
    const pts = [];
    for (let sx = x0; sx <= x1 + 1; sx += 14) {
      const X = S.cam.x + (sx - W / 2) / k, e = ease(clamp((sx - a[0]) / (260 * k), 0, 1));
      const y = a[1] + (noise1(X * 0.004 + 9) - 0.5) * 34 * k + (1 - e) * (1 - e) * 250 * k;
      pts.push(sx, y);
      if (first) { ctx.moveTo(sx, y); first = false; } else ctx.lineTo(sx, y);
    }
    ctx.lineTo(x1, H); ctx.lineTo(x0, H); ctx.closePath();
    const g = ctx.createLinearGradient(0, a[1] - 30 * k, 0, a[1] + 230 * k);
    const ga = 1 - S.cam.n * 0.55;
    g.addColorStop(0, w.ink(0.2 * ga)); g.addColorStop(0.4, w.ink(0.1 * ga)); g.addColorStop(1, w.ink(0.03 * ga));
    ctx.fillStyle = g; ctx.fill();
    mark(ctx, pts, swell(2.6 * k), w.ink(0.5));
  }

  S.draw = function (ctx) {
    if (!S.active) return;
    const vol = S.vol, W = S.W, H = S.H, k = S.k, def = vol.def, w0 = vol.secs[Math.max(0, S.cur | 0)].world;
    const open = easeOut(S.u), hw = open * (W / 2 + 40), bh = Math.round(H * 0.052);
    S.hits.length = 0;
    ctx.save();
    ctx.beginPath(); ctx.rect(W / 2 - hw, 0, hw * 2, H); ctx.clip();
    // —— 远景
    farHills(ctx, w0, 0.22, 560, 300, 0.13, 1.7);
    farHills(ctx, w0, 0.45, 640, 240, 0.2, 4.1);
    if (def.ground) ground(ctx, w0, def.ground);
    if (def.river) river(ctx, w0, def.river);
    // —— 各段
    const env = { t: S.t, S, hit(X, Y, r, fn, sec) { const q = S.toScreen(sec.x0 + X, Y); S.hits.push({ x: q[0], y: q[1], r: r * k, fn }); } };
    const cb = S.waiting() ? S.beat() : null;
    const prop = (pr, w) => {
      const o = pr[3] || (pr[3] = { _a: 1 });
      if (o._a <= 0.01) return;
      const sx = S.toScreen(env.sec.x0 + pr[1], 0)[0], far = (520 + (o.w || 0)) * k;      // 画外的不必画
      if (sx < -far || sx > W + far) return;
      if (o._a < 0.99) { ctx.save(); ctx.globalAlpha *= ease(o._a); P[pr[0]](ctx, w, pr[1], pr[2], o, env); ctx.restore(); }
      else P[pr[0]](ctx, w, pr[1], pr[2], o, env);
    };
    for (const sec of vol.secs) {
      if (!sec.near) continue;
      const o = S.toScreen(sec.x0, 0), w = sec.world;
      env.sec = sec;
      ctx.save();
      ctx.translate(o[0], o[1]); ctx.scale(k, k);
      for (const pr of sec.def.back || []) prop(pr, w);
      w.draw(ctx);
      for (const pr of sec.def.front || []) prop(pr, w);
      // 眼下缺的那个字：画里有它淡淡的古形，可以照着描
      if (cb && cb.sec === sec) {
        const it = cb.o, sh = shapeOf(it);
        if (sh) {
          const sz = 160, pulse = 0.5 + 0.5 * Math.sin(S.t * 1.8);
          ctx.globalAlpha = 0.13 + 0.09 * pulse;
          ctx.drawImage(sh.tint(w.nightK > 0.5 ? 'rgb(255,150,130)' : 'rgb(176,36,30)'), it.x - sz / 2, it.y - sz / 2, sz, sz);
          ctx.globalAlpha = 1;
          if (it.n) {
            ctx.fillStyle = w.ink(0.85);
            ctx.beginPath();
            for (let j = 0; j < it.inked.length; j += 2) if (it.inked[j]) { const x = it.x + sh.pts[j * 2] * sz, y = it.y + sh.pts[j * 2 + 1] * sz; ctx.moveTo(x + 2.2, y); ctx.arc(x, y, 2.2, 0, TAU); }
            ctx.fill();
          }
        }
      }
      ctx.restore();
    }
    // —— 近处的云雾：走得比画快，掠过去就是一次过场
    for (const m of def.mists || []) {
      const sx = W / 2 + (m.X - S.cam.x) * k * 1.55, sy = H / 2 + (m.y - S.cam.y) * k;
      if (sx < -m.r * k * 2 || sx > W + m.r * k * 2) continue;
      for (let j = 0; j < 5; j++) {
        const ox = (j - 2) * m.r * 0.55 * k + Math.sin(S.t * 0.2 + j * 2 + m.X) * 30 * k, oy = Math.sin(j * 2.3 + m.X) * m.r * 0.3 * k;
        ctx.save(); ctx.translate(sx + ox, sy + oy); ctx.scale(1, 0.62);
        softDot(ctx, 0, 0, m.r * k, w0.col('paper', m.a || 0.92), w0.col('paper', 0));
        ctx.restore();
      }
    }
    ctx.restore();

    // —— 装裱：上下绫边
    const night = S.cam.n > 0.5;
    for (const y of [0, H - bh]) {
      ctx.fillStyle = night ? 'rgba(30,34,40,0.96)' : 'rgba(205,193,160,0.96)';
      ctx.fillRect(W / 2 - hw, y, hw * 2, bh);
      ctx.fillStyle = night ? 'rgba(226,224,210,0.2)' : 'rgba(60,50,36,0.3)';
      ctx.fillRect(W / 2 - hw, y ? y : bh - 1.2, hw * 2, 1.2);
      ctx.fillStyle = night ? 'rgba(226,224,210,0.07)' : 'rgba(90,70,40,0.1)';
      for (let x = ((W / 2 - S.cam.x * k) % 46 + 46) % 46; x < W; x += 46) if (x > W / 2 - hw && x < W / 2 + hw) { ctx.beginPath(); ctx.arc(x, y + bh / 2, bh * 0.2, 0, TAU); ctx.fill(); }
    }
    // —— 两根轴：开卷时向两边滚开
    if (S.u < 1) {
      for (const sd of [-1, 1]) {
        const x = W / 2 + sd * Math.min(hw, W / 2 + 60), rw = 30;
        const g = ctx.createLinearGradient(x - rw / 2, 0, x + rw / 2, 0);
        g.addColorStop(0, 'rgba(70,48,30,0.98)'); g.addColorStop(0.4, 'rgba(150,112,70,0.98)'); g.addColorStop(1, 'rgba(58,40,26,0.98)');
        ctx.fillStyle = g; ctx.fillRect(x - rw / 2, H * 0.015, rw, H * 0.97);
        ctx.fillStyle = 'rgba(176,36,30,0.95)';
        ctx.fillRect(x - rw * 0.66, 0, rw * 1.32, H * 0.03); ctx.fillRect(x - rw * 0.66, H * 0.97, rw * 1.32, H * 0.03);
        softDot(ctx, x - sd * 20, H / 2, 60, 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0)');
      }
    }
  };

  /* =====================================================================
   *  画中之物（都按水墨来：淡墨晕染作体，要紧处提线，颜色只点一点）
   * ===================================================================== */

  /* 仕女的头面（颈根在 0,-203）与士人的头面（颈根在 0,-170）：坐着的人也用，挪一挪就是 */
  function ladyHead(ctx, w, t, a, wind) {
    const INK = (v) => w.ink(v * a), RED = (v) => w.col('red', v * a), WHITE = (v) => w.col('white', v * a);
    mark(ctx, [1, -203, 2.5, -213], () => 6.5, WHITE(0.98));
    ctx.beginPath(); ctx.ellipse(3.5, -225, 10.5, 13.2, 0.06, 0, TAU); ctx.fillStyle = WHITE(0.98); ctx.fill();
    ctx.strokeStyle = INK(0.42); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.ellipse(3.5, -225, 10.5, 13.2, 0.06, -0.9, 1.9); ctx.stroke();
    ctx.strokeStyle = INK(0.8); ctx.lineWidth = 1.1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(6.4, -227.4); ctx.quadraticCurveTo(9.4, -228.6, 12, -227.2); ctx.moveTo(5.6, -231.6); ctx.quadraticCurveTo(9.4, -233.6, 12.8, -231.4); ctx.stroke();
    ctx.fillStyle = RED(0.85); ctx.beginPath(); ctx.ellipse(10.4, -219.4, 1.8, 1.1, 0, 0, TAU); ctx.fill();
    // 云髻峨峨
    mark(ctx, strand(-7, -228, Math.PI / 2 + 0.3, 64, t * 1.5, 3 * wind, 0.03), taper(8.5), INK(0.8));
    ctx.fillStyle = INK(0.88); ctx.beginPath(); ctx.ellipse(-0.6, -232, 12.2, 9.6, -0.22, 0, TAU); ctx.fill();
    ctx.strokeStyle = INK(0.88); ctx.lineWidth = 4.4;
    ctx.beginPath(); ctx.arc(-5, -250, 8, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(8, -251, 6.6, 0, TAU); ctx.stroke();
    ctx.fillStyle = w.col('yellow', 0.95 * a);            // 金翠首饰
    ctx.beginPath(); ctx.arc(2, -241, 2.2, 0, TAU); ctx.arc(-9, -240, 1.6, 0, TAU); ctx.arc(11, -243, 1.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = w.col('yellow', 0.9 * a); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(11, -244); ctx.lineTo(24, -251); ctx.stroke();
  }
  function manHead(ctx, w, t, a, beard) {
    const INK = (v) => w.ink(v * a), WHITE = (v) => w.col('white', v * a);
    mark(ctx, [0, -170, 1.5, -180], () => 7, WHITE(0.98));
    ctx.beginPath(); ctx.ellipse(2.5, -191, 10.5, 12.5, 0.05, 0, TAU); ctx.fillStyle = WHITE(0.98); ctx.fill();
    ctx.strokeStyle = INK(0.45); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.ellipse(2.5, -191, 10.5, 12.5, 0.05, -0.9, 1.9); ctx.stroke();
    ctx.strokeStyle = INK(0.8); ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(5.5, -193); ctx.lineTo(10.6, -193.4); ctx.moveTo(5, -197); ctx.lineTo(11.2, -197.6); ctx.stroke();
    if (beard) mark(ctx, strand(8, -182, Math.PI / 2 + 0.1, 20, t, 1, 0), taper(5), INK(0.6));
    ctx.fillStyle = INK(0.88); ctx.beginPath(); ctx.ellipse(-1, -198, 11.5, 8.6, -0.2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-8, -203); ctx.lineTo(-5, -222); ctx.lineTo(8, -219); ctx.lineTo(7, -203); ctx.closePath(); ctx.fill();   // 冠
  }
  S.parts = { ladyHead, manHead };

  /* 仕女 / 神女。面朝 face（-1 朝左，即朝卷尾）；衣带向身后飘 */
  P.lady = function (ctx, w, x, y, o, env) {
    const t = env.t + (o.ph || 0), s = o.s || 1, f = o.face || -1, a = o.alpha == null ? 1 : o.alpha;
    if (o._wave) o._wave *= 0.975;
    const wind = 0.65 + 0.35 * Math.sin(t * 0.7) + (o._wave || 0) * 1.6;
    const INK = (v) => w.ink(v * a), RED = (v) => w.col('red', v * a), BLUE = (v) => w.col('blue', v * a), WHITE = (v) => w.col('white', v * a), PAPER = (v) => w.col('paper', v * a);
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 1.1) * (o.float ? 7 : 1.5));
    ctx.rotate(o.rot || 0); ctx.scale(s * f, s);
    ctx.rotate((o.lean || 0) + Math.sin(t * 0.8) * 0.014 + (o._wave || 0) * 0.05);
    if (o.onWater !== false) {                              // 凌波：足下生烟，水纹一圈圈
      softDot(ctx, -14, 4, 84, PAPER(0.85), PAPER(0));
      ctx.strokeStyle = INK(0.26); ctx.lineWidth = 1.2;
      for (let j = 0; j < 3; j++) { const r = 34 + j * 26 + ((t * 9) % 26); ctx.beginPath(); ctx.ellipse(-4, 6, r, r * 0.16, 0, 0, TAU); ctx.globalAlpha = clamp(1 - r / 120, 0, 1); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    // 披帛：几条长带，向身后扬起
    const nr = o.ribbons == null ? 4 : o.ribbons;
    for (let i = 0; i < nr; i++) {
      const u = nr > 1 ? i / (nr - 1) : 0.5;
      const pp = strand(-10 - u * 6, -198 + u * 62, Math.PI - 0.5 + u * 0.78, 150 + (i % 2) * 70 + u * 40, t * 1.9 + i * 1.7, (22 + i * 5) * wind, -0.16 + u * 0.3);
      mark(ctx, pp, (tt) => (15 - i * 1.6) * Math.pow(Math.sin(Math.PI * Math.pow(tt * 0.92 + 0.04, 0.6)), 0.8) + 0.6, i % 2 ? BLUE(0.3) : RED(0.26));
      mark(ctx, pp, taper(1.2), INK(0.26));
    }
    // 曳地的裙裾
    for (let i = 0; i < 4; i++) {
      const pp = strand(-20, -20 + i * 6, Math.PI - 0.03 - i * 0.07, 118 + i * 24, t * 1.6 + i, 8 * wind, -0.02);
      mark(ctx, pp, taper(27 - i * 5), WHITE(0.78));
      mark(ctx, pp, taper(1.5), INK(0.36));
    }
    // 裙
    ctx.beginPath();
    ctx.moveTo(-13, -150); ctx.bezierCurveTo(-22, -100, -40, -42, -54, -2); ctx.quadraticCurveTo(-18, 7, 25, 0); ctx.bezierCurveTo(19, -50, 15, -100, 12, -150); ctx.closePath();
    ctx.fillStyle = WHITE(0.92); ctx.fill();
    ctx.save(); ctx.clip(); softDot(ctx, -40, -34, 54, INK(0.2), INK(0)); softDot(ctx, 16, -60, 30, o.tint ? w.col(o.tint, 0.2 * a) : INK(0.08), INK(0)); ctx.restore();
    mark(ctx, [-13, -150, -24, -100, -46, -30, -54, -2], swell(2.1), INK(0.62));
    mark(ctx, [12, -150, 16, -92, 22, -32, 25, 0], swell(1.6), INK(0.5));
    mark(ctx, [-5, -146, -13, -92, -28, -22], swell(1.3), INK(0.36));
    mark(ctx, [4, -146, 3, -82, 8, -8], swell(1.1), INK(0.28));
    // 后袖
    const bs = strand(-10, -196, Math.PI * 0.64, 84, t * 1.8, 6 * wind, 0.1);
    mark(ctx, bs, (tt) => 12 + 16 * tt, WHITE(0.84)); mark(ctx, bs, swell(1.4), INK(0.4));
    // 上身与腰带
    ctx.beginPath(); ctx.moveTo(-13, -150); ctx.lineTo(-16, -196); ctx.quadraticCurveTo(0, -207, 15, -196); ctx.lineTo(12, -150); ctx.closePath();
    ctx.fillStyle = o.tint ? w.col(o.tint, 0.5 * a) : WHITE(0.94); ctx.fill();
    mark(ctx, [-16, -196, -14, -172, -13, -150], swell(1.5), INK(0.5));
    mark(ctx, [-14, -152, 0, -149, 13, -152], () => 5.5, RED(0.66));
    for (let i = 0; i < 2; i++) mark(ctx, strand(3 + i * 4, -150, Math.PI / 2 + 0.12 - i * 0.2, 74 - i * 14, t * 2 + i, 4 * wind, 0.03), taper(4.6), RED(0.5));
    // 前袖：按姿势
    const arm = { stand: [10, -196, 26, -178, 35, -152, 31, -116], raise: [10, -196, 32, -204, 52, -224, 62, -246], reach: [10, -196, 36, -184, 60, -160, 78, -140], hide: [10, -196, 24, -206, 20, -222, 8, -224] }[o.pose || 'stand'];
    mark(ctx, arm, (tt) => 11 + 19 * tt, WHITE(0.92)); mark(ctx, arm, swell(1.6), INK(0.52));
    if (o.pose === 'raise' || o.pose === 'reach') { const n = arm.length; mark(ctx, strand(arm[n - 2], arm[n - 1], Math.PI / 2 + 0.3, 62, t * 2.2, 5 * wind, 0.05), (tt) => 22 * (1 - tt * 0.6), WHITE(0.8)); }
    // 颈、面
    ctx.save();
    if (o.back) { ctx.translate(3, 0); ctx.scale(-1, 1); ctx.translate(-3, 0); }           // 回眸：只把头转过去
    ladyHead(ctx, w, t, a, wind);
    ctx.restore();
    ctx.restore();
    if (env.hit && !o.noHit) env.hit(x, y - 120 * s, 100 * s, () => { o._wave = 1; if (env.S.onSound) env.S.onSound('touch', {}); }, env.sec);
  };

  /* 士人：宽袍大袖，头上一顶冠 */
  P.man = function (ctx, w, x, y, o, env) {
    const t = env.t + (o.ph || 0), s = o.s || 1, f = o.face || -1, a = o.alpha == null ? 1 : o.alpha, tone = o.tone == null ? 0.44 : o.tone;
    const INK = (v) => w.ink(v * a), WHITE = (v) => w.col('white', v * a);
    ctx.save(); ctx.translate(x, y); ctx.scale(s * f, s); ctx.rotate((o.lean || 0) + Math.sin(t * 0.7) * 0.008);
    softDot(ctx, 0, -70, 80, INK(0.1), INK(0));
    ctx.beginPath(); ctx.moveTo(-17, -168); ctx.bezierCurveTo(-26, -110, -34, -50, -40, 0); ctx.quadraticCurveTo(0, 8, 36, 0); ctx.bezierCurveTo(28, -60, 20, -120, 16, -168); ctx.closePath();
    ctx.fillStyle = INK(tone); ctx.fill();
    mark(ctx, [-17, -168, -28, -100, -40, 0], swell(2.4), INK(0.7)); mark(ctx, [16, -168, 24, -90, 36, 0], swell(1.8), INK(0.55));
    mark(ctx, [-2, -160, -4, -80, -8, -4], swell(1.3), INK(0.4));
    const bs = [-12, -160, -30, -130, -38, -96, -30, -70];
    mark(ctx, bs, (tt) => 14 + 22 * tt, INK(tone * 0.9)); mark(ctx, bs, swell(1.5), INK(0.55));
    const arm = { stand: [12, -160, 28, -134, 30, -100, 22, -74], point: [12, -160, 36, -158, 60, -166, 80, -176], hold: [12, -160, 30, -150, 40, -170, 42, -196] }[o.pose || 'stand'];
    mark(ctx, arm, (tt) => 14 + 20 * tt * (o.pose === 'stand' ? 1 : 0.5), INK(tone)); mark(ctx, arm, swell(1.6), INK(0.6));
    mark(ctx, [-17, -128, 0, -124, 17, -128], () => 5, w.col('red', 0.5 * a));
    manHead(ctx, w, t, a, o.beard !== false);
    ctx.restore();
  };

  /* 马：几笔写意 */
  P.horse = function (ctx, w, x, y, o, env) {
    const t = env.t + (o.ph || 0), s = o.s || 1, f = o.face || -1, walk = o.graze ? 0 : (o.walk == null ? 1 : o.walk), tone = o.tone || 0.5;
    const INK = (v) => w.ink(v);
    ctx.save(); ctx.translate(x, y + Math.abs(Math.sin(t * 5)) * 2 * walk); ctx.scale(s * f, s);
    softDot(ctx, 0, -52, 70, INK(0.1), INK(0));
    for (const [lx, ph] of [[-30, 0], [-18, 2.2], [24, 1.1], [34, 3.3]]) {          // 四蹄
      const sw = Math.sin(t * 5 + ph) * 13 * walk, far = ph > 2;
      mark(ctx, [lx, -42, lx + sw * 0.4, -22, lx + sw, 0], (tt) => 8 - 4.4 * tt, INK(far ? tone * 0.6 : tone * 1.2));
    }
    mark(ctx, strand(-44, -58, Math.PI * 0.62, 50, t * 3, 4 + 6 * walk, 0.1), taper(8), INK(0.7));           // 尾
    mark(ctx, [-44, -56, -14, -64, 22, -61, 42, -54], (tt) => 25 + 11 * Math.sin(Math.PI * tt), INK(tone));  // 身
    const neck = o.graze ? [36, -58, 54, -38, 62, -16] : [34, -62, 50, -90, 60, -108];
    mark(ctx, neck, (tt) => 19 - 8 * tt, INK(tone));
    const nx = neck[4], ny = neck[5];
    mark(ctx, o.graze ? [nx, ny, nx + 6, ny + 12, nx + 4, ny + 20] : [nx, ny, nx + 12, ny + 6, nx + 22, ny + 16], (tt) => 10 - 4 * tt, INK(tone * 1.1));
    for (let i = 0; i < 5; i++) mark(ctx, strand(lerp(neck[0], nx, i / 4) - 3, lerp(neck[1], ny, i / 4) - 4, Math.PI * (o.graze ? 0.9 : 0.75), 15, t * 3 + i, 3, 0.1), taper(4), INK(0.75));
    mark(ctx, [-44, -62, -14, -72, 22, -70, 40, -62], swell(2), INK(0.7));
    ctx.restore();
  };

  /* 车：一轮、一厢、一伞盖 */
  P.cart = function (ctx, w, x, y, o, env) {
    const t = env.t, s = o.s || 1, f = o.face || -1, roll = o.still ? 0 : t * 1.6;
    const INK = (v) => w.ink(v);
    ctx.save(); ctx.translate(x, y); ctx.scale(s * f, s);
    mark(ctx, [10, -52, 60, -56, 118, -62], swell(3), INK(0.6));                     // 辕
    ctx.fillStyle = INK(0.3); ctx.fillRect(-58, -92, 76, 44);
    mark(ctx, [-58, -92, -58, -48, 18, -48, 18, -92], () => 2, INK(0.6));
    mark(ctx, [-24, -92, -24, -168], () => 2.6, INK(0.7));                           // 盖
    ctx.beginPath(); ctx.moveTo(-84, -160); ctx.quadraticCurveTo(-24, -208, 36, -160); ctx.quadraticCurveTo(-24, -172, -84, -160); ctx.fillStyle = INK(0.42); ctx.fill();
    for (let i = 0; i < 7; i++) mark(ctx, strand(-80 + i * 19, -161, Math.PI / 2, 15, t * 3 + i, 2, 0), taper(3), w.col('red', 0.5));
    ctx.strokeStyle = INK(0.72); ctx.lineWidth = 3.4; ctx.beginPath(); ctx.arc(-22, -32, 32, 0, TAU); ctx.stroke();
    ctx.lineWidth = 1.4; ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = roll + i * TAU / 8; ctx.moveTo(-22, -32); ctx.lineTo(-22 + Math.cos(a) * 31, -32 + Math.sin(a) * 31); }
    ctx.stroke();
    ctx.fillStyle = INK(0.8); ctx.beginPath(); ctx.arc(-22, -32, 4.5, 0, TAU); ctx.fill();
    ctx.restore();
  };

  /* 石与岩：墨晕作体，提一道脊线，皴几笔 */
  P.rock = function (ctx, w, x, y, o) {
    const W = o.w || 300, Hh = o.h || 260, sd = o.seed || 1, n = 22, top = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, env2 = Math.pow(Math.sin(Math.PI * clamp(u * (o.skew || 1), 0, 1)), 0.55);
      top.push(x - W / 2 + u * W, y - Hh * env2 * (0.62 + 0.38 * noise1(u * 5.2 + sd * 7)) - (noise1(u * 17 + sd) - 0.5) * 26);
    }
    ctx.beginPath(); ctx.moveTo(x - W / 2, y + 40);
    for (let i = 0; i <= n; i++) ctx.lineTo(top[i * 2], top[i * 2 + 1]);
    ctx.lineTo(x + W / 2, y + 40); ctx.closePath();
    const g = ctx.createLinearGradient(0, y - Hh, 0, y + 40);
    g.addColorStop(0, w.ink(o.tone || 0.5)); g.addColorStop(0.6, w.ink((o.tone || 0.5) * 0.5)); g.addColorStop(1, w.ink(0));
    ctx.fillStyle = g; ctx.fill();
    mark(ctx, top.slice(8, top.length - 8), swell(3.4), w.ink(0.52));
    ctx.strokeStyle = w.ink(0.26); ctx.lineWidth = 1.1; ctx.beginPath();
    for (let i = 2; i < n - 1; i += 2) { const px = top[i * 2], py = top[i * 2 + 1]; ctx.moveTo(px, py + 10); ctx.lineTo(px + (noise1(i + sd) - 0.5) * 22, py + 36 + noise1(i * 3 + sd) * 70); }
    ctx.stroke();
  };

  /* 旄与旗：一竿，一幅长幡 */
  P.banner = function (ctx, w, x, y, o, env) {
    const t = env.t + x * 0.01, h = o.h || 260;
    mark(ctx, [x, y, x + 3, y - h], () => 3, w.ink(0.7));
    for (let i = 0; i < 3; i++) softDot(ctx, x + 3, y - h + 14 + i * 22, 9, w.col(o.c || 'red', 0.6), w.col(o.c || 'red', 0));
    const pp = strand(x + 3, y - h + 6, 0.12, o.len || 150, t * 2.4, 12, 0.1);
    mark(ctx, pp, (tt) => 30 * (1 - tt * 0.7) + 2, w.col(o.c || 'red', 0.36)); mark(ctx, pp, taper(1.6), w.ink(0.4));
  };

  /* 如意云头 */
  P.cloud = function (ctx, w, x, y, o, env) {
    const sc = o.s || 1, t = env.t;
    softDot(ctx, x, y + 4 * sc, 60 * sc, w.ink(0.1), w.ink(0));
    mark(ctx, [x + 22 * sc, y + 10 * sc, x + 50 * sc, y + 16 * sc, x + 84 * sc, y + 10 * sc], taper(6 * sc), w.ink(0.2));
    for (const [dx, dy, r] of [[-22, 4, 15], [2, -8, 20], [26, 5, 14], [-44, 10, 10]]) {
      const cx = x + dx * sc, cy = y + dy * sc + Math.sin(t * 0.9 + dx + x) * 2;
      softDot(ctx, cx, cy, r * sc * 1.3, w.col('paper', 0.9), w.col('paper', 0));
      ctx.strokeStyle = w.ink(0.42); ctx.lineWidth = 1.3 * sc;
      ctx.beginPath(); ctx.arc(cx, cy, r * sc, Math.PI * 0.86, Math.PI * 2.3); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + r * sc * 0.26, cy + r * sc * 0.12, r * sc * 0.52, Math.PI * 0.15, Math.PI * 1.7); ctx.stroke();
    }
  };

  /* 云车：车厢在云上，伞盖垂着流苏 */
  P.cloudCar = function (ctx, w, x, y, o, env) {
    const t = env.t, s = o.s || 1, yy = y + Math.sin(t * 0.8) * 8;
    for (const [dx, dy, sc] of [[-70, 44, 1.5], [40, 52, 1.7], [130, 40, 1.3], [-150, 56, 1.2]]) P.cloud(ctx, w, x + dx * s, yy + dy * s, { s: sc * s }, env);
    ctx.save(); ctx.translate(x, yy); ctx.scale(s, s);
    for (let i = 0; i < 4; i++) mark(ctx, strand(60, -150 + i * 8, 0.1 + i * 0.07, 150 + i * 20, t * 2 + i, 12, 0.06), taper(9 - i), i % 2 ? w.col('blue', 0.3) : w.col('red', 0.3));
    mark(ctx, [0, -30, 0, -190], () => 3, w.ink(0.7));
    ctx.beginPath(); ctx.moveTo(-86, -176); ctx.quadraticCurveTo(0, -236, 86, -176); ctx.quadraticCurveTo(0, -192, -86, -176); ctx.fillStyle = w.col('red', 0.4); ctx.fill();
    mark(ctx, [-86, -176, -40, -204, 0, -212, 40, -204, 86, -176], swell(2), w.ink(0.55));
    for (let i = 0; i < 9; i++) mark(ctx, strand(-80 + i * 20, -177, Math.PI / 2, 20, t * 3 + i, 2.4, 0), taper(3), w.col('yellow', 0.7));
    ctx.restore();
    P.lady(ctx, w, x - 6 * s, yy + 26 * s, Object.assign(o.lady || (o.lady = {}), { s: 0.82 * s, onWater: false, face: o.face || -1, back: o.back, pose: o.pose || 'stand', ribbons: 3 }), env);
    ctx.save(); ctx.translate(x, yy); ctx.scale(s, s);
    ctx.fillStyle = w.ink(0.34); ctx.beginPath(); ctx.moveTo(-74, -64); ctx.lineTo(74, -64); ctx.quadraticCurveTo(66, 4, 0, 10); ctx.quadraticCurveTo(-66, 4, -74, -64); ctx.fill();
    mark(ctx, [-74, -64, 0, -70, 74, -64], swell(3), w.ink(0.66));
    mark(ctx, [-74, -64, -64, -8, 0, 10, 64, -8, 74, -64], swell(2), w.ink(0.5));
    ctx.restore();
  };

  /* 鲸鲵：从水里跃起一道弧 */
  P.whale = function (ctx, w, x, y, o, env) {
    const t = env.t * (o.sp || 0.55) + (o.ph || 0), s = o.s || 1, f = o.face || -1, ph = t % TAU, up = Math.sin(ph);
    if (up < -0.25) return;
    const pts = [], n = 9;
    for (let i = 0; i <= n; i++) { const a = ph - i * 0.16; pts.push(x - f * Math.cos(a) * 150 * s, y - Math.max(-0.3, Math.sin(a)) * 150 * s); }
    softDot(ctx, pts[8], pts[9], 90 * s, w.ink(0.12), w.ink(0));
    mark(ctx, pts, (tt) => (16 + 46 * Math.sin(Math.PI * Math.pow(tt, 0.7))) * s, w.ink(0.52));
    mark(ctx, pts, (tt) => 16 * Math.sin(Math.PI * tt) * s, w.col('paper', 0.5));
    const tx = pts[n * 2], ty = pts[n * 2 + 1], ta = Math.atan2(ty - pts[n * 2 - 1], tx - pts[n * 2 - 2]);
    ctx.fillStyle = w.ink(0.6); ctx.beginPath(); leafPath(ctx, tx, ty, ta + 0.6, 56 * s, 14 * s, 0.2); leafPath(ctx, tx, ty, ta - 0.6, 56 * s, 14 * s, -0.2); ctx.fill();
    ctx.fillStyle = w.col('paper', 0.95); ctx.beginPath(); ctx.arc(pts[2], pts[3] - 6 * s, 3.4 * s, 0, TAU); ctx.fill();
    ctx.strokeStyle = w.ink(0.3); ctx.lineWidth = 1.2;
    for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.ellipse(x - f * Math.cos(ph) * 150 * s, y + 6, (30 + j * 26) * s, (5 + j * 3) * s, 0, 0, TAU); ctx.stroke(); }
  };

  /* 题签与落款 */
  P.title = function (ctx, w, x, y, o) {
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = w.ink(0.9); ctx.font = (o.size || 120) + 'px "Ma Shan Zheng","STKaiti","KaiTi","Kaiti SC",serif';
    [...o.text].forEach((c, i) => ctx.fillText(c, x, y + i * (o.size || 120) * 1.12));
    if (o.sub) { ctx.font = '30px "Ma Shan Zheng","STKaiti","KaiTi",serif'; ctx.fillStyle = w.ink(0.6); [...o.sub].forEach((c, i) => ctx.fillText(c, x - (o.size || 120) * 0.9, y + 40 + i * 36)); }
    if (o.seal) {
      const sy = y + [...o.text].length * (o.size || 120) * 1.12 - 10, n = [...o.seal].length;
      ctx.fillStyle = w.col('red', 0.9); ctx.fillRect(x - 27, sy, 54, 12 + n * 44);
      ctx.fillStyle = 'rgba(246,236,220,0.96)'; ctx.font = '38px "Ma Shan Zheng","STKaiti","KaiTi",serif';
      [...o.seal].forEach((c, i) => ctx.fillText(c, x, sy + 30 + i * 44));
    }
    ctx.restore();
  };
  /* 芦荻：近岸几丛 */
  P.reeds = function (ctx, w, x, y, o, env) {
    const n = o.n || 9, t = env.t;
    for (let i = 0; i < n; i++) {
      const bx = x + (noise1(i * 3.1 + x) - 0.5) * (o.w || 200), h = 70 + noise1(i * 7 + x) * 90, sw = Math.sin(t * 1.2 + i) * 0.06 + w.wind * 0.2;
      const pp = strand(bx, y, -Math.PI / 2 + (noise1(i + x) - 0.5) * 0.4 + sw, h, t + i, 3, 0.05);
      mark(ctx, pp, taper(3.4), o.c ? w.col(o.c, 0.62) : w.ink(0.5));
      const ex = pp[pp.length - 2], ey = pp[pp.length - 1];
      if (o.plume) {                                          // 荻花：梢头一穗白絮，顺风偏着
        const pl = strand(ex, ey, -Math.PI / 2 + 0.9 + sw * 3, 30 + noise1(i + x) * 16, t * 1.6 + i, 4, 0.5);
        mark(ctx, pl, (tt) => 9 * Math.sin(Math.PI * Math.pow(tt, 0.6)) + 1, w.col('white', 0.86));
        mark(ctx, pl, taper(1), w.ink(0.24));
      } else softDot(ctx, ex, ey, 9, w.ink(0.3), w.ink(0));
    }
  };
})();
