/* 墨韵 · main.js — 把纸、字、灵、声接在一起 */
(function () {
  'use strict';
  const MS = window.MS;
  const { clamp } = MS.util;
  MS.FONT_TEXT = '"Noto Serif SC","Songti SC","STSong","SimSun",serif';
  if (!MS.GLYPHS) MS.GLYPHS = {};

  const $ = (id) => document.getElementById(id);
  const inkCanvas = $('ink'), stage = $('stage'), ime = $('ime');
  const ctx = stage.getContext('2d');
  const fluid = new MS.Fluid(inkCanvas);
  const world = new MS.World(fluid);
  const Audio = MS.Audio, Lex = MS.Lex, Glyphs = MS.Glyphs;
  MS.world = world; MS.fluid = fluid;

  const state = {
    W: 1, H: 1, dpr: 1,
    trace: true, sound: false, soundTouched: false, auto: false,
    ink: 0,                      // 0 墨 1 朱 2 青
    seen: new Set(),             // 已经完整溯过源的字
    px: -999, py: -999, down: false, lastMove: 0,
    verse: '', verseT: 0
  };
  const PIG = [[0.42, 0, 0], [0, 0.5, 0], [0, 0, 0.5]];

  /* ---------- 尺寸 ---------- */
  function resize() {
    state.W = window.innerWidth; state.H = window.innerHeight;
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    stage.width = Math.round(state.W * state.dpr); stage.height = Math.round(state.H * state.dpr);
    fluid.resize();
    world.resize(state.W, state.H);
  }
  window.addEventListener('resize', resize);
  resize();
  if (!fluid.ok) document.body.classList.add('no-gl');

  /* ---------- 落字 ---------- */
  function glyphSize() { return clamp(Math.min(state.W, state.H) * 0.22, 120, 230); }
  function commit(ch, x, y, forceMode) {
    const key = Lex.canon[ch], def = key && MS.CHARS[key];
    let mode = forceMode || (!state.trace ? 'plain' : state.seen.has(ch) ? 'quick' : 'full');
    state.seen.add(ch);
    const pan = (x / state.W * 2 - 1) * 0.7;
    Glyphs.add(ch, x, y, {
      mode, size: glyphSize(), world, known: !!def, note: def && key === ch ? def.note : null,
      onStage(idx, n, id) {
        if (idx === 0) Audio.play('tone', { tone: def ? def.tone : '平', i: def ? 2 + (key.charCodeAt(0) % 5) : 3 });
        else Audio.play('stage', { idx });
      },
      onBloom(bx, by) {
        if (!def) return;
        world.spawn(key, bx, by);
        Audio.bloom(def.kind, pan);
        afterSpawn(key);
      }
    });
  }
  MS.commit = commit;

  function afterSpawn(key) {
    const present = world.present();
    refreshDock(key, present);
    if (MS.CHARS[key].kind === 'clear') { showVerse(null); return; }
    const pair = Lex.matchPair(key, present);
    if (pair) { showPair(pair, key); setTimeout(() => Audio.play('pair'), 900); }
    const v = Lex.verseFor(key, present, state.verse);
    if (v && !state.auto) showVerse(v, present);
  }

  /* ---------- 右侧竖题 ---------- */
  const verseEl = $('verse');
  function showVerse(L, present, src) {
    if (!L) { verseEl.classList.add('leaving'); state.verse = ''; return; }
    state.verse = L.text;
    verseEl.classList.remove('leaving');
    verseEl.innerHTML = '';
    let k = 0;
    for (const part of L.text.split('，')) {
      const col = document.createElement('div'); col.className = 'col';
      for (const c of part) {
        const s = document.createElement('span');
        s.textContent = c; s.style.animationDelay = (k++ * 0.09) + 's';
        if (present && Lex.canon[c] && present.has(Lex.canon[c])) s.className = 'hit';
        col.appendChild(s);
      }
      verseEl.appendChild(col);
    }
    const s = document.createElement('div'); s.className = 'src';
    s.textContent = src || ('声律启蒙 · ' + L.rhyme);
    verseEl.appendChild(s);
  }

  /* ---------- 对仗 ---------- */
  const pairEl = $('pair');
  let pairTimer = 0;
  function showPair(p) {
    const parts = p.text.split('对');
    pairEl.innerHTML = '<div class="line"></div><div class="src"></div>';
    const line = pairEl.firstChild;
    line.append(parts[0]); const em = document.createElement('em'); em.textContent = '对'; line.append(em, parts[1]);
    pairEl.lastChild.innerHTML = '对仗已成 · 声律启蒙 · <b></b>'; pairEl.lastChild.querySelector('b').textContent = p.rhyme;
    pairEl.classList.add('show');
    clearTimeout(pairTimer);
    pairTimer = setTimeout(() => pairEl.classList.remove('show'), 5200);
  }

  /* ---------- 字钮 ---------- */
  const dock = $('chars'), buttons = {};
  (function buildDock() {
    for (const [g, label] of MS.GROUPS) {
      const grp = document.createElement('div'); grp.className = 'grp'; grp.setAttribute('aria-label', label);
      for (const ch of MS.CHAR_LIST) {
        const def = MS.CHARS[ch];
        if (def.group !== g) continue;
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = ch;
        const partners = Lex.partners(ch).slice(0, 3).map((p) => p.other).join(' ');
        b.dataset.tip = def.tone + '声' + (partners ? ' · 对 ' + partners : '');
        b.setAttribute('aria-label', ch + '，' + def.tone + '声' + (partners ? '，可对 ' + partners : ''));
        b.addEventListener('click', () => {
          wake();
          const p = world.placeFor(ch);
          commit(ch, p.x, p.y);
          ime.focus({ preventScroll: true });
        });
        buttons[ch] = b; grp.appendChild(b);
      }
      dock.appendChild(grp);
    }
  })();
  function refreshDock(last, present) {
    present = present || world.present();
    const want = new Set();
    if (last) for (const p of Lex.partners(last)) if (!present.has(p.other)) want.add(p.other);
    for (const ch in buttons) {
      buttons[ch].classList.toggle('here', present.has(ch));
      buttons[ch].classList.toggle('dui', want.has(ch));
    }
  }

  /* ---------- 工具钮 ---------- */
  function press(btn, on) { btn.setAttribute('aria-pressed', on ? 'true' : 'false'); }
  function setSound(on) { state.sound = Audio.setEnabled(on); press($('btn-sound'), state.sound); }
  /* 第一次动手时把声音打开（浏览器要求先有用户手势）；用户自己关过就不再自作主张 */
  function wake() { if (!state.soundTouched) { state.soundTouched = true; setSound(true); } }
  $('btn-sound').addEventListener('click', () => { state.soundTouched = true; setSound(!state.sound); });
  $('btn-trace').addEventListener('click', () => { state.trace = !state.trace; press($('btn-trace'), state.trace); });
  $('btn-auto').addEventListener('click', () => { wake(); setAuto(!state.auto); });
  $('btn-shot').addEventListener('click', snapshot);
  document.querySelectorAll('.hint b').forEach((b) => b.addEventListener('click', () => setInk(+b.dataset.ink)));
  function setInk(i) {
    state.ink = i;
    document.querySelectorAll('.hint b').forEach((b) => b.classList.toggle('on', +b.dataset.ink === i));
  }

  /* ---------- 自在：让《声律启蒙》自己写 ---------- */
  const auto = { timer: 0, st: null, si: 0, ci: 0 };
  function setAuto(on) {
    state.auto = on; press($('btn-auto'), on);
    auto.st = null; auto.timer = 0.3;
  }
  function tickAuto(dt) {
    if (!state.auto) return;
    auto.timer -= dt;
    if (auto.timer > 0) return;
    if (!auto.st) {
      auto.st = Lex.randomStanza(); auto.si = 0; auto.ci = 0;
      if (!auto.st) { setAuto(false); return; }
      if (world.ents.length) { world.clear(); refreshDock(); auto.timer = 2.6; return; }
    }
    const st = auto.st, step = st.steps[auto.si];
    if (!step) { auto.st = null; auto.timer = 10; return; }
    if (auto.ci === 0) showVerse({ text: step.text, rhyme: st.rhyme }, new Set(step.chars), '声律启蒙 · ' + st.vol + ' · ' + st.rhyme);
    if (auto.ci < step.chars.length) {
      const ch = step.chars[auto.ci++], p = world.placeFor(ch);
      commit(ch, p.x, p.y, state.trace && !state.seen.has(ch) ? 'full' : 'quick');
      auto.timer = 2.8;
    } else { auto.si++; auto.ci = 0; auto.timer = step.chars.length ? 2.4 : 3.4; }
  }

  /* ---------- 留影 ---------- */
  function snapshot() {
    compose().toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a'), d = new Date(), p = (n) => String(n).padStart(2, '0');
      a.href = URL.createObjectURL(blob);
      a.download = '墨韵-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()) + '.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }, 'image/png');
  }
  /* 把纸、墨、灵合成一张，并钤印落款 */
  function compose() {
    const c = document.createElement('canvas');
    c.width = inkCanvas.width; c.height = inkCanvas.height;
    const g = c.getContext('2d');
    fluid.render();
    if (fluid.ok) g.drawImage(inkCanvas, 0, 0);
    else { g.fillStyle = world.night ? '#080b10' : '#ece6d8'; g.fillRect(0, 0, c.width, c.height); }
    g.drawImage(stage, 0, 0, c.width, c.height);
    // 钤印、落款
    const k = c.width / state.W, s = 40 * k, x = c.width - s - 30 * k, y = c.height - s * 1.9 - 30 * k;
    g.fillStyle = '#b0241e';
    g.beginPath(); g.roundRect ? g.roundRect(x, y, s, s * 1.9, 4 * k) : g.rect(x, y, s, s * 1.9); g.fill();
    g.fillStyle = '#f6ecdc'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = (s * 0.62) + 'px "Ma Shan Zheng","STKaiti","KaiTi",serif';
    g.fillText('墨', x + s / 2, y + s * 0.52); g.fillText('韵', x + s / 2, y + s * 1.36);
    if (state.verse) {
      g.fillStyle = world.night ? 'rgba(226,224,210,.75)' : 'rgba(30,28,26,.72)';
      g.font = (17 * k) + 'px "Ma Shan Zheng","STKaiti","KaiTi",serif';
      g.textAlign = 'right';
      g.fillText(state.verse + '　——《声律启蒙》', x - 16 * k, y + s * 1.55);
    }
    return c;
  }
  MS.compose = compose;

  /* ---------- 笔：指针 ---------- */
  let lastX = 0, lastY = 0, lastT = 0, washT = 0;
  function moveIme(x, y) { ime.style.left = clamp(x, 8, state.W - 30) + 'px'; ime.style.top = clamp(y - 6, 8, state.H - 40) + 'px'; }
  stage.addEventListener('pointerdown', (e) => {
    wake();
    state.down = true; state.px = lastX = e.clientX; state.py = lastY = e.clientY; lastT = performance.now();
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* 无妨 */ }
    moveIme(e.clientX, e.clientY);
    if (e.pointerType === 'mouse') { e.preventDefault(); ime.focus({ preventScroll: true }); }
    if (e.shiftKey) splash(e.clientX, e.clientY);
    else {
      fluid.splat(e.clientX, e.clientY, 0, 0, PIG[state.ink], 15);
      Audio.play('ink', { i: Math.round((1 - e.clientY / state.H) * 9), pan: (e.clientX / state.W * 2 - 1) * 0.7 });
    }
  });
  function splash(x, y) {
    fluid.wash(x, y, 110, 0.72);
    for (let a = 0; a < 8; a++) fluid.splat(x, y, Math.cos(a * 0.785) * 420, Math.sin(a * 0.785) * 420, null, 70);
    const t = performance.now();
    if (t - washT > 260) { washT = t; Audio.play('splash', { pan: (x / state.W * 2 - 1) * 0.7 }); }
  }
  window.addEventListener('pointermove', (e) => {
    const t = performance.now(), dt = Math.max(8, t - lastT) / 1000, x = e.clientX, y = e.clientY;
    const vx = (x - lastX) / dt, vy = (y - lastY) / dt, sp = Math.hypot(vx, vy);
    state.px = x; state.py = y;
    const P = world.pointer;
    P.x = x; P.y = y; P.vx = vx; P.vy = vy; P.moved = 0;
    if (!ime.matches(':focus') || !composing) moveIme(x, y);
    if (state.down) {
      if (e.shiftKey) splash(x, y);
      else {
        const k = clamp(sp / 900, 0.25, 1), p = PIG[state.ink];
        const steps = Math.min(6, Math.ceil(Math.hypot(x - lastX, y - lastY) / 14)) || 1;
        for (let i = 1; i <= steps; i++) {
          const u = i / steps;
          fluid.splat(lastX + (x - lastX) * u, lastY + (y - lastY) * u, vx * 0.9 / steps, vy * 0.9 / steps, [p[0] * k / steps * 1.6, p[1] * k / steps * 1.6, p[2] * k / steps * 1.6], 13 + k * 9);
        }
      }
    } else if (sp > 40 && e.pointerType === 'mouse') {
      fluid.splat(x, y, vx * 0.22, vy * 0.22, null, 34);       // 笔未落，气已动
    }
    lastX = x; lastY = y; lastT = t;
  });
  const up = () => { state.down = false; };
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  window.addEventListener('blur', up);

  /* ---------- 字：键盘与输入法 ---------- */
  let composing = false;
  const isHan = (c) => /[㐀-鿿豈-﫿]/.test(c);
  function typed(text) {
    let n = 0;
    const x0 = state.px > 0 ? state.px : state.W / 2, y0 = state.py > 0 ? state.py : state.H * 0.45, gap = glyphSize() * 0.95;
    const hans = Array.from(text).filter(isHan);
    for (const c of Array.from(text)) {
      if (c === '1' || c === '2' || c === '3') { setInk(+c - 1); continue; }
      if (!isHan(c)) continue;
      // 一次打出一个词：从笔尖起一字排开
      const x = clamp(x0 + (n - (hans.length - 1) / 2) * gap, 60, state.W - 60);
      setTimeout(((ch, xx) => () => commit(ch, xx, y0))(c, x), n * 420);
      n++;
    }
    if (n) wake();
  }
  ime.addEventListener('compositionstart', () => { composing = true; });
  ime.addEventListener('compositionend', (e) => { composing = false; typed(e.data || ime.value); ime.value = ''; });
  ime.addEventListener('input', (e) => {
    if (composing || e.isComposing) return;
    typed(ime.value); ime.value = '';
  });
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (document.activeElement !== ime && !(document.activeElement && document.activeElement.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter' || e.key === 'Tab'))) ime.focus({ preventScroll: true });
  });
  window.addEventListener('paste', (e) => { const t = (e.clipboardData || window.clipboardData).getData('text'); if (t) { e.preventDefault(); typed(t.slice(0, 12)); } });
  if (window.matchMedia('(hover: hover)').matches) ime.focus({ preventScroll: true });

  /* ---------- 主循环 ---------- */
  let last = performance.now(), nightClass = false;
  /* 机器吃力时自动降一档流体精度（墨会重铺一次） */
  const TIERS = [[144, 720, 18], [112, 512, 12], [80, 360, 8]];
  let tier = 0, slowSum = 0, slowN = 0;
  function watchSpeed(ms) {
    if (document.hidden || ms > 250 || tier >= TIERS.length - 1) return;
    slowSum += ms; slowN++;
    if (slowN < 90) return;
    if (slowSum / slowN > 27) {
      tier++;
      fluid.cfg.simRes = TIERS[tier][0]; fluid.cfg.dyeRes = TIERS[tier][1]; fluid.cfg.pressureIters = TIERS[tier][2];
      fluid.vel = null; fluid.resize();
    }
    slowSum = slowN = 0;
  }
  function frame(now) {
    const dt = Math.min(0.034, Math.max(0.001, (now - last) / 1000));
    watchSpeed(now - last);
    last = now;
    tick(dt);
    requestAnimationFrame(frame);
  }
  /* 手动推进若干帧（调试 / 自动化测试用：标签页在后台时浏览器会停掉动画帧） */
  MS.step = function (n, dt) { for (let i = 0; i < (n || 1); i++) tick(dt || 1 / 60); };
  function tick(dt) {
    tickAuto(dt);
    world.update(dt);
    Glyphs.update(dt);
    fluid.step(dt);
    fluid.render();
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    ctx.clearRect(0, 0, state.W, state.H);
    world.draw(ctx);
    Glyphs.draw(ctx);
    // 世界里的事 → 声
    if (world.events.length) {
      for (const ev of world.events) {
        if (ev.x != null) ev.pan = (ev.x / state.W * 2 - 1) * 0.7;
        Audio.play(ev.type, ev);
      }
      world.events.length = 0;
    }
    Audio.tick(dt, world);
    const nc = world.nightK > 0.5;
    if (nc !== nightClass) { nightClass = nc; document.body.classList.toggle('night', nc); document.querySelector('meta[name=theme-color]').content = nc ? '#080b10' : '#ece6d8'; }
  }
  requestAnimationFrame(frame);

  /* ---------- 开卷：题名二字，化入纸中 ---------- */
  function intro() {
    const y = state.H * 0.42, g = glyphSize() * 0.58;
    commit('墨', state.W / 2 - g, y, 'quick');
    setTimeout(() => commit('韵', state.W / 2 + g, y, 'quick'), 380);
    state.seen.delete('墨'); state.seen.delete('韵');
  }
  const start = () => {
    Glyphs.refreshFonts();
    if (state.W > 200 && state.H > 200) intro();
    else window.addEventListener('resize', function once() { if (state.W > 200 && state.H > 200) { window.removeEventListener('resize', once); intro(); } });
  };
  if (document.fonts && document.fonts.load) {
    Promise.race([document.fonts.load('30px "Ma Shan Zheng"', '墨韵'), new Promise((r) => setTimeout(r, 1200))]).then(start, start);
  } else start();
})();
