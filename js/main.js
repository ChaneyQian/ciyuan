/* 词源 · main.js — 把纸、字、灵、声接在一起 */
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
  const Audio = MS.Audio, Lex = MS.Lex, Glyphs = MS.Glyphs, Hand = MS.Hand, Scroll = MS.Scroll;
  MS.world = world; MS.fluid = fluid;
  const Eggs = MS.Eggs || { bind() {}, typed() {}, spawned() { return false; }, update() {}, stop() {} };   // 彩蛋（js/eggs.js）

  const state = {
    W: 1, H: 1, dpr: 1,
    trace: false,                // 溯源：字形从楷书退回甲骨文（默认关）
    hand: false,                 // 手写：在纸上写字，由程序判定
    pinyin: false,               // 拼音：不靠系统输入法，直接敲拼音
    sound: false, soundTouched: false, auto: false,
    ink: 0,                      // 0 墨 1 朱 2 青
    seen: new Set(),             // 已经完整溯过源的字
    px: -999, py: -999, down: false, lastMove: 0,
    verse: '', verseT: 0
  };
  const PIG = [[0.42, 0, 0], [0, 0.5, 0], [0, 0, 0.5]];
  /* 三个开关记在本机，下次打开还是上次的样子 */
  const PREFS = 'ciyuan.prefs';
  try { const p = JSON.parse(localStorage.getItem(PREFS) || '{}'); for (const k of ['trace', 'hand', 'pinyin']) if (typeof p[k] === 'boolean') state[k] = p[k]; } catch (err) { /* 存不了就算了 */ }
  function savePrefs() { try { localStorage.setItem(PREFS, JSON.stringify({ trace: state.trace, hand: state.hand, pinyin: state.pinyin })); } catch (err) { /* 同上 */ } }

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
  function commit(ch, x, y, forceMode, hand) {
    const key = Lex.canon[ch], def = key && MS.CHARS[key];
    let mode = forceMode || (!state.trace ? 'plain' : state.seen.has(ch) ? 'quick' : 'full');
    state.seen.add(ch);
    Eggs.typed(ch);
    const pan = (x / state.W * 2 - 1) * 0.7;
    Glyphs.add(ch, x, y, {
      mode, hand, size: glyphSize(), world, known: !!def, note: def && key === ch ? def.note : null,
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
    const egg = Eggs.spawned(key);                 // 凑齐了某个彩蛋：这时由它来题句
    if (MS.CHARS[key].kind === 'clear') { showVerse(null); return; }
    const pair = Lex.matchPair(key, present);
    if (pair) { showPair(pair, key); setTimeout(() => Audio.play('pair'), 900); }
    const v = Lex.verseFor(key, present, state.verse);
    if (v && !state.auto && !egg) showVerse(v, present);
  }

  /* ---------- 右侧竖题 ---------- */
  const verseEl = $('verse');
  function showVerse(L, present, src, by) {      // src：题句旁的落款；by：留影上的落款（都缺省为《声律启蒙》）
    if (!L) { verseEl.classList.add('leaving'); state.verse = ''; return; }
    state.verse = L.text; state.verseBy = by || '《声律启蒙》';
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
  Eggs.bind({ world, verse: showVerse, auto: () => state.auto });

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
      for (const ch of MS.HOME_LIST) {
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
  $('btn-trace').addEventListener('click', () => { state.trace = !state.trace; applyModes(); });
  $('btn-hand').addEventListener('click', () => { state.hand = !state.hand; applyModes(); });
  $('btn-pinyin').addEventListener('click', () => { state.pinyin = !state.pinyin; applyModes(); ime.focus({ preventScroll: true }); });
  const touchOnly = !window.matchMedia('(hover: hover)').matches;
  function applyModes() {
    press($('btn-trace'), state.trace); press($('btn-hand'), state.hand); press($('btn-pinyin'), state.pinyin);
    Hand.setEnabled(state.hand);
    if (!state.pinyin) pyClear();
    document.body.classList.toggle('hand', state.hand);
    // 纸边的提示跟着模式变
    const parts = [];
    if (state.pinyin) parts.push('拼音已开：直接敲 shan、yue、long');
    else if (!touchOnly) parts.push('键盘直接打字，字会活过来');
    if (state.hand) parts.push('手写已开：在纸上写一个字，停笔即判');
    else parts.push('点字落笔', '拖动落墨');
    if (!touchOnly) parts.push('按住 Shift 泼水');
    const box = $('hint-mode'); box.textContent = '';
    for (const t of parts) { box.append(t); const dot = document.createElement('i'); dot.textContent = '·'; box.appendChild(dot); }
    savePrefs();
  }
  $('btn-auto').addEventListener('click', () => {
    wake();
    if (Scroll.active) { Scroll.auto = !Scroll.auto; press($('btn-auto'), Scroll.auto); } else setAuto(!state.auto);
  });

  /* ---------- 人间词话：手卷 ---------- */
  const volsEl = $('vols');
  for (const id in MS.Scrolls) {
    const v = MS.Scrolls[id], b = document.createElement('button');
    b.type = 'button'; b.setAttribute('role', 'menuitem'); b.textContent = v.label + (v.pending ? '（待续）' : '');
    b.disabled = !!v.pending;
    b.addEventListener('click', () => { volsEl.classList.remove('show'); openScroll(id); });
    volsEl.appendChild(b);
  }
  $('btn-scroll').addEventListener('click', (e) => {
    e.stopPropagation();
    if (Scroll.active) Scroll.close(); else volsEl.classList.toggle('show');
  });
  window.addEventListener('click', () => volsEl.classList.remove('show'));
  function openScroll(id) {
    wake(); setAuto(false); Eggs.stop(true);
    if (!Scroll.open(id, fluid, state.W, state.H)) return;
    Hand.setEnabled(true); pyClear(); Glyphs.list.length = 0;
    $('btn-scroll').textContent = '收卷'; press($('btn-scroll'), true); press($('btn-auto'), false);
    const tag = document.createElement('span'); tag.textContent = '人间词话 · ' + MS.Scrolls[id].label.replace(' · ', ' ');
    $('sbar').prepend(tag);
    Audio.play('season', { ch: '' }); Audio.bloom('mountain', 0);
  }
  Scroll.onClose = () => {
    if (hintOn) { hintOn = false; hintEl.classList.remove('show'); }
    $('btn-scroll').textContent = '词话'; press($('btn-scroll'), false); press($('btn-auto'), state.auto);
    Hand.among = null; fluid.night = world.nightK; applyModes();
  };
  Scroll.onSound = (kind, d) => {
    if (kind === 'event') { if (d.x != null) d.pan = 0; Audio.play(d.type, d); }
    else if (kind === 'bloom') Audio.bloom(d.kind, 0);
    else if (kind === 'touch') { Audio.play('ink', { i: 6, pan: 0 }); Audio.bloom('lotus', 0); }
    else Audio.play(kind, d);
  };
  Scroll.onSection = () => Audio.play('clear');
  /* 出了一道题：手写只在这几个候选里认 */
  Scroll.onBeat = (b, options) => { Hand.among = options; };
  Scroll.onSolve = () => { Hand.among = null; Hand.cancel(); press($('btn-auto'), Scroll.auto); };
  const wrongEl = $('swrong');
  let wrongT = 0;
  Scroll.onWrong = (ch, o, how) => {
    wrongEl.textContent = how === 'hand' ? '认作「' + ch + '」，这里缺的不是它' : '不是「' + ch + '」，再想想';
    wrongEl.classList.add('show'); clearTimeout(wrongT); wrongT = setTimeout(() => wrongEl.classList.remove('show'), 2200);
    Audio.play('stage', { idx: 5 });
  };

  /* 第一次开卷时蒙一层提示：怎么拉动画卷。只出现一次（记在本机），一动就收 */
  const hintEl = $('shint'), HINT = 'ciyuan.scrollHint';
  let hintSeen = false, hintOn = false;
  try { hintSeen = localStorage.getItem(HINT) === '1'; } catch (err) { /* 存不了就每次都提示一下，无妨 */ }
  function showHint() { if (hintSeen || hintOn) return; hintOn = true; hintEl.classList.add('show'); }
  function hideHint() {
    if (!hintOn) return;
    hintOn = false; hintSeen = true; hintEl.classList.remove('show');
    try { localStorage.setItem(HINT, '1'); } catch (err) { /* 同上 */ }
  }
  hintEl.addEventListener('pointerdown', (e) => { e.stopPropagation(); hideHint(); });
  window.addEventListener('wheel', (e) => { if (Scroll.active) { e.preventDefault(); hideHint(); Scroll.wheel((Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * (e.deltaMode ? 30 : 1)); } }, { passive: false });
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
      commit(ch, p.x, p.y);
      auto.timer = 2.8;
    } else { auto.si++; auto.ci = 0; auto.timer = step.chars.length ? 2.4 : 3.4; }
  }

  /* ---------- 留影 ---------- */
  function snapshot() {
    compose().toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a'), d = new Date(), p = (n) => String(n).padStart(2, '0');
      a.href = URL.createObjectURL(blob);
      a.download = '词源-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()) + '.png';
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
    g.fillText('词', x + s / 2, y + s * 0.52); g.fillText('源', x + s / 2, y + s * 1.36);
    if (state.verse && !Scroll.active) {
      g.fillStyle = world.night ? 'rgba(226,224,210,.75)' : 'rgba(30,28,26,.72)';
      g.font = (17 * k) + 'px "Ma Shan Zheng","STKaiti","KaiTi",serif';
      g.textAlign = 'right';
      g.fillText(state.verse + '　——' + (state.verseBy || '《声律启蒙》'), x - 16 * k, y + s * 1.55);
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
    const sm = Scroll.active ? Scroll.pointerDown(e.clientX, e.clientY, e.pointerType === 'touch') : '';
    state.noInk = sm === 'pan' || sm === 'write';
    state.writing = sm === 'write' || (state.hand && !Scroll.active);
    if (sm === 'pan') { /* 拖的是卷子，不落墨 */ }
    else if (e.shiftKey && !Scroll.active) splash(e.clientX, e.clientY);
    else if (state.writing) Hand.down(e.clientX, e.clientY);
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
    if (Scroll.active) Scroll.pointerMove(x, y);
    if (state.down && state.writing) Hand.move(x, y);
    else if (state.down && state.noInk) { /* 拖卷 */ }
    else if (state.down) {
      if (e.shiftKey) splash(x, y);
      else if (state.hand && !Scroll.active) Hand.move(x, y);
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
  const up = () => {
    const traced = Scroll.active && Scroll.pointerUp();
    if (traced) Hand.cancel(); else Hand.up();          // 这一笔是在描古字：不必再当手写去认
    state.down = false; state.noInk = false; state.writing = false;
  };
  /* 手写判定的结果 */
  Hand.onCommit = (ch, cx, cy, pts) => {
    wake();
    if (Scroll.active) { if (!Scroll.answer(ch, 'hand', pts)) Hand.onReject(Hand.strokes.map((s) => s.p)); return; }
    commit(ch, cx, cy, undefined, pts);
  };
  Hand.onReject = (strokes) => {            // 认不出：手迹化成真的墨
    const p = PIG[state.ink];
    for (const s of strokes) for (let i = 0; i < s.length; i += 6) fluid.splat(s[i], s[i + 1], 0, 0, [p[0] * 0.5, p[1] * 0.5, p[2] * 0.5], 9);
  };
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  window.addEventListener('blur', up);

  /* ---------- 字：键盘与输入法 ---------- */
  let composing = false;
  const isHan = (c) => /[㐀-鿿豈-﫿]/.test(c);
  /* 内置拼音：只认 44 个能活的字。字母进缓冲，空格 / 数字选字，整拼唯一时自动落字 */
  const py = { buf: '', list: [], timer: 0, x: 0, y: 0 }, pyEl = $('py');
  function pyRender() {
    if (!py.buf) { pyEl.className = ''; return; }
    pyEl.textContent = '';
    const b = document.createElement('span'); b.className = 'buf'; b.textContent = py.buf; pyEl.appendChild(b);
    if (!py.list.length) { const n = document.createElement('span'); n.className = 'none'; n.textContent = '无此字'; pyEl.appendChild(n); }
    py.list.slice(0, 9).forEach((ch, i) => {
      const c = document.createElement('button'); c.type = 'button';
      const k = document.createElement('i'); k.textContent = i + 1; c.append(k, ch);
      c.addEventListener('click', () => { pyPick(i); ime.focus({ preventScroll: true }); });
      pyEl.appendChild(c);
    });
    pyEl.className = 'show';
    pyEl.style.left = clamp(py.x + 14, 8, state.W - 260) + 'px'; pyEl.style.top = clamp(py.y + 20, 8, state.H - 60) + 'px';
  }
  function pySet(buf) {
    if (!py.buf && buf) { py.x = state.px > 0 ? state.px : state.W / 2; py.y = state.py > 0 ? state.py : state.H * 0.45; }
    py.buf = buf;
    const r = buf ? Lex.pinyin(buf) : { list: [], exact: false };
    py.list = r.list; py.timer = r.exact ? 0.3 : 0;
    pyRender();
  }
  function pyClear() { py.buf = ''; py.list = []; py.timer = 0; pyEl.className = ''; }
  function pyPick(i) {
    const ch = py.list[i], x = py.x, y = py.y;
    if (!ch) return;
    pyClear(); wake(); commit(ch, x, y);
  }
  function typed(text) {
    if (Scroll.active) return;                     // 看卷的时候不落字
    let n = 0;
    const x0 = state.px > 0 ? state.px : state.W / 2, y0 = state.py > 0 ? state.py : state.H * 0.45, gap = glyphSize() * 0.95;
    const hans = Array.from(text).filter(isHan);
    for (const c of Array.from(text)) {
      if (state.pinyin) {
        if (/[a-zA-Z]/.test(c)) { if (py.buf.length < 6) pySet(py.buf + c.toLowerCase()); continue; }
        if (py.buf) {
          if (c === ' ') pyPick(0); else if (/[1-9]/.test(c)) pyPick(+c - 1);
          continue;
        }
      }
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
    if (Scroll.active) { hideHint(); if (Scroll.key(e)) { e.preventDefault(); press($('btn-auto'), Scroll.auto); } return; }
    if (py.buf && !composing) {
      if (e.key === 'Backspace') { e.preventDefault(); pySet(py.buf.slice(0, -1)); return; }
      if (e.key === 'Escape') { e.preventDefault(); pyClear(); return; }
      if (e.key === 'Enter') { e.preventDefault(); pyPick(0); return; }
    }
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
    // 哪一个灵画错了，都不能让整幅画停下来
    try { tick(dt); } catch (err) { if (!frame.warned) { frame.warned = true; console.error(err); } }
    requestAnimationFrame(frame);
  }
  /* 手动推进若干帧（调试 / 自动化测试用：标签页在后台时浏览器会停掉动画帧） */
  MS.step = function (n, dt) { for (let i = 0; i < (n || 1); i++) tick(dt || 1 / 60); };
  function tick(dt) {
    if (Scroll.active) {                           // 手卷：只有一个镜头沿着长卷走
      Scroll.update(dt, state.W, state.H);
      if (Scroll.phase === 'view') showHint(); else if (hintOn && Scroll.phase !== 'open') { hintOn = false; hintEl.classList.remove('show'); }
      Glyphs.update(dt);
      fluid.step(dt); fluid.render();
      ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      ctx.clearRect(0, 0, state.W, state.H);
      Scroll.draw(ctx);
      Hand.update(dt);
      if (Scroll.active) Hand.draw(ctx, Scroll.vol.secs[Math.max(0, Scroll.cur | 0)].world);   // 写在画上的字
      Glyphs.draw(ctx);
      Audio.tick(dt, world);
      const sn = Scroll.active && Scroll.cam.n > 0.5;
      if (sn !== nightClass) { nightClass = sn; document.body.classList.toggle('night', sn); }
      return;
    }
    tickAuto(dt);
    if (py.timer > 0 && (py.timer -= dt) <= 0) pyPick(0);
    Hand.update(dt);
    world.update(dt);
    Eggs.update(dt);
    Glyphs.update(dt);
    fluid.step(dt);
    fluid.render();
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    ctx.clearRect(0, 0, state.W, state.H);
    world.draw(ctx);
    Hand.draw(ctx, world);
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
  applyModes();
  requestAnimationFrame(frame);

  /* ---------- 开卷：题名二字，化入纸中 ---------- */
  function intro() {
    const y = state.H * 0.42, g = glyphSize() * 0.58;
    const mode = state.trace ? 'quick' : 'plain';
    commit('词', state.W / 2 - g, y, mode);
    setTimeout(() => commit('源', state.W / 2 + g, y, mode), 380);
    state.seen.delete('词'); state.seen.delete('源');
  }
  const start = () => {
    Glyphs.refreshFonts(); Hand.refresh();
    if (state.W > 200 && state.H > 200) intro();
    else window.addEventListener('resize', function once() { if (state.W > 200 && state.H > 200) { window.removeEventListener('resize', once); intro(); } });
  };
  if (document.fonts && document.fonts.load) {
    Promise.race([document.fonts.load('30px "Ma Shan Zheng"', '词源'), new Promise((r) => setTimeout(r, 1200))]).then(start, start);
  } else start();
})();
