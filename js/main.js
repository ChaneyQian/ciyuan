/* 词源 · main.js — 把纸、字、灵、声接在一起 */
(function () {
  'use strict';
  const MS = window.MS;
  const { clamp } = MS.util;
  MS.FONT_TEXT = '"Noto Serif SC","Songti SC","STSong","SimSun",serif';
  if (!MS.GLYPHS) MS.GLYPHS = {};

  const $ = (id) => document.getElementById(id);
  /* 浏览器缓存里的 index.html 可能比这份脚本老：新添的几块若不在，就地补上，免得整页停摆 */
  if (!$('side')) document.body.insertAdjacentHTML('beforeend', '<div id="side"><button id="btn-undo" type="button">撤销</button><button id="btn-bake" type="button">固化</button><button id="btn-box" type="button">框选</button><span id="lay-top" class="lay"></span><button id="lay-bg" type="button" class="lay"></button></div>');
  if (!$('btn-box')) $('side').insertAdjacentHTML('beforeend', '<button id="btn-box" type="button">框选</button>');
  if (!$('guide')) document.body.insertAdjacentHTML('beforeend', '<div id="guide"><svg id="guide-svg"></svg><button type="button" id="guide-ok">开始</button></div>');
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
    hand: false,                 // 造字（手写）：在纸上写字，由程序判定
    pinyin: true,                // 拟声（拼音）：不靠系统输入法，直接敲拼音（默认开）
    sound: false, wantSound: true, woke: false,   // 传音（声音）：默认开，但浏览器要等第一下手势才许出声
    auto: false, wantAuto: true,                  // 自在：默认开——进来就看它自己画；你一动笔它就停
    ink: 0,                      // 0 墨 1 朱 2 青
    seen: new Set(),             // 已经完整溯过源的字
    px: -999, py: -999, down: false, lastMove: 0,
    verse: '', verseT: 0
  };
  const PIG = [[0.42, 0, 0], [0, 0.5, 0], [0, 0, 0.5]];
  /* 几个开关记在本机，下次打开还是上次的样子（默认值换过一轮，所以换了个名字存） */
  const PREFS = 'ciyuan.prefs2', KEYS = ['trace', 'hand', 'pinyin', 'wantSound', 'wantAuto'];
  try { const p = JSON.parse(localStorage.getItem(PREFS) || '{}'); for (const k of KEYS) if (typeof p[k] === 'boolean') state[k] = p[k]; } catch (err) { /* 存不了就算了 */ }
  function savePrefs() { try { const o = {}; for (const k of KEYS) o[k] = state[k]; localStorage.setItem(PREFS, JSON.stringify(o)); } catch (err) { /* 同上 */ } }

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
        const before = snap();
        world.spawn(key, bx, by);
        record(before);
        Audio.bloom(def.kind, pan);
        afterSpawn(key);
      }
    });
  }
  MS.commit = commit;

  /* ---------- 撤销 ---------- */
  /* 每做一件会改动画面的事（落字、清除、固化、调远近），先记下做之前的样子 */
  const undo = [];
  function snap() {
    return { ents: new Set(world.ents), dying: new Set(world.ents.filter((e) => e.dying)), marks: world.ents.filter((e) => e.kind === 'mark'), season: world.season, night: world.night };
  }
  function record(b) {
    const added = world.ents.filter((e) => !b.ents.has(e) && e.kind !== 'mark');
    const gone = []; for (const e of b.ents) if (e.kind !== 'mark' && !b.dying.has(e) && (e.dying || world.ents.indexOf(e) < 0)) gone.push(e);
    if (!added.length && !gone.length && b.season === world.season && b.night === world.night) return;
    pushUndo({ added, gone, marks: b.marks, season: b.season, night: b.night });
  }
  function pushUndo(op) { undo.push(op); if (undo.length > 40) undo.shift(); refreshSide(); }
  function doUndo() {
    if (Scroll.active) return;
    const op = undo.pop();
    if (!op) return;
    if (op.scale) { for (const m of op.list) m[0].sc = m[1]; world.resort(); }
    else if (op.move) { for (const m of op.move) { m[0].ox = m[1]; m[0].oy = m[2]; } }
    else if (op.bake) { for (const e of op.bake) e.layer = 1; }
    else {
      for (const e of op.added) { e.dying = true; e.fade = Math.min(e.fade, 0.5); }
      for (const e of op.gone) world.revive(e);
      world.ents = world.ents.filter((e) => e.kind !== 'mark'); for (const m of op.marks) world.ents.unshift(m);
      world.season = op.season; world.night = op.night;
    }
    selClean();
    refreshDock(); refreshSide(); Audio.play('stage', { idx: 3 });
  }
  MS.undo = doUndo;

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
        b.addEventListener('pointerdown', (e) => { if (e.button === 0) dockDrag = { ch, x: e.clientX, y: e.clientY, on: false, touch: e.pointerType === 'touch' }; });
        b.addEventListener('click', () => {
          if (performance.now() < skipClick) return;       // 刚才那一下是拖，不是点
          wake(); yieldAuto();
          const p = world.placeFor(ch);
          commit(ch, p.x, p.y);
          ime.focus({ preventScroll: true });
        });
        b.addEventListener('contextmenu', (e) => { e.preventDefault(); wake(); wipe(ch); });   // 右键（触屏长按）：清掉它化出的东西
        buttons[ch] = b; grp.appendChild(b);
      }
      dock.appendChild(grp);
    }
  })();
  /* 按住字钮不放，拖到画里：松手处落笔成物 */
  let dockDrag = null, skipClick = 0;
  const ghost = document.createElement('div');
  ghost.id = 'ghost'; ghost.setAttribute('aria-hidden', 'true'); document.body.appendChild(ghost);
  const overUI = (x, y) => { const n = document.elementFromPoint(x, y); return !!(n && n.closest && n.closest('.dock, .tools, #side, #vols')); };
  window.addEventListener('pointermove', (e) => {
    const d = dockDrag;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.on) {
      if (Math.hypot(dx, dy) < 8 || (d.touch && -dy < Math.abs(dx))) return;      // 触屏上横着划是翻字钮，往上提才是拖
      d.on = true; ghost.textContent = d.ch; ghost.classList.add('show'); wake();
    }
    ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px';
    ghost.classList.toggle('ok', !overUI(e.clientX, e.clientY));
  });
  const dropDock = (e) => {
    const d = dockDrag;
    dockDrag = null;
    if (!d || !d.on) return;
    ghost.classList.remove('show'); skipClick = performance.now() + 400;
    if (e.type === 'pointerup' && !Scroll.active && !overUI(e.clientX, e.clientY)) { yieldAuto(); commit(d.ch, e.clientX, e.clientY); ime.focus({ preventScroll: true }); }
  };
  window.addEventListener('pointerup', dropDock);
  window.addEventListener('pointercancel', dropDock);
  MS.dragChar = (ch, x, y) => { yieldAuto(); commit(ch, x, y); };

  /* 把某个字在画里化出的东西一次清掉；四时与夜则是把时令、夜色撤回去 */
  function wipe(ch) {
    const def = MS.CHARS[ch], before = snap();
    const unmark = () => { world.ents = world.ents.filter((e) => !(e.kind === 'mark' && e.ch === ch)); };
    if (def.kind === 'season') { if (world.season === ch) { world.season = ''; unmark(); } }
    else if (def.kind === 'night') { if (world.night) { world.night = false; unmark(); } }
    else if (def.kind !== 'day' && def.kind !== 'clear') world.removeChar(ch);
    record(before);
    selClean();
    refreshDock(); Audio.play('stage', { idx: 4 });
  }
  MS.wipe = wipe;
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
  /* 第一次动手时把声音打开（浏览器要求先有用户手势）；用户关过「传音」就不开 */
  function wake() { if (!state.woke) { state.woke = true; if (state.wantSound) setSound(true); } }
  $('btn-sound').addEventListener('click', () => { state.woke = true; state.wantSound = !state.sound; setSound(state.wantSound); savePrefs(); });
  $('btn-trace').addEventListener('click', () => { state.trace = !state.trace; applyModes(); });
  $('btn-hand').addEventListener('click', () => { state.hand = !state.hand; applyModes(); });
  $('btn-pinyin').addEventListener('click', () => { state.pinyin = !state.pinyin; applyModes(); ime.focus({ preventScroll: true }); });
  const touchOnly = !window.matchMedia('(hover: hover)').matches;
  function applyModes() {
    press($('btn-trace'), state.trace); press($('btn-hand'), state.hand); press($('btn-pinyin'), state.pinyin);
    press($('btn-sound'), state.woke ? state.sound : state.wantSound);
    Hand.setEnabled(state.hand);
    if (!state.pinyin) pyClear();
    document.body.classList.toggle('hand', state.hand);
    // 纸边的提示跟着模式变
    const parts = [];
    if (state.pinyin) parts.push('拟声已开：直接敲拼音 shan、yue、long');
    else if (!touchOnly) parts.push('键盘直接打字，字会活过来');
    if (state.hand) parts.push('造字已开：在纸上写一个字，停笔即判');
    else parts.push('点字落笔，或按住拖到画里', '拖动落墨');
    parts.push(touchOnly ? '长按字钮清除' : '右键字钮清除', '点物象后拖动移位、滚轮调远近');
    if (!touchOnly) parts.push('按住 Shift 泼水');
    const box = $('hint-mode'); box.textContent = '';
    for (const t of parts) { box.append(t); const dot = document.createElement('i'); dot.textContent = '·'; box.appendChild(dot); }
    savePrefs();
  }
  $('btn-auto').addEventListener('click', () => {
    wake();
    if (Scroll.active) { Scroll.auto = !Scroll.auto; press($('btn-auto'), Scroll.auto); }
    else { setAuto(!state.auto); state.wantAuto = state.auto; savePrefs(); }
  });
  /* 你一动笔，自在就让位（不改它「默认开」的设定，下次进来它还会自己画） */
  function yieldAuto() { if (state.auto) setAuto(false); }

  /* ---------- 左下角：撤销与图层 ---------- */
  function refreshSide() {
    $('btn-undo').disabled = !undo.length;
    $('lay-top').textContent = '上层 ' + world.count(1);
    $('lay-bg').textContent = '底层 ' + world.count(0) + (world.locked ? ' · 锁' : ' · 开');
    press($('lay-bg'), world.locked);
    $('btn-bake').disabled = !world.count(1);
  }
  $('btn-undo').addEventListener('click', () => { wake(); doUndo(); });
  $('btn-bake').addEventListener('click', () => {            // 固化：上层的物象压进底层
    wake();
    const list = world.bake();
    if (list.length) { pushUndo({ bake: list }); Audio.play('stage', { idx: 2 }); }
    selClean();
    refreshSide();
  });
  $('lay-bg').addEventListener('click', () => { world.locked = !world.locked; selClean(); refreshSide(); });

  /* ---------- 点选 / 框选物象：拖动移位，滚轮调远近 ---------- */
  let sels = [], pick = null, drag = null, sideT = 0;
  function selClean() { if (sels.length) sels = sels.filter((e) => world.pickable(e) && world.ents.indexOf(e) >= 0); }
  function drawSel() {
    selClean();
    if (!sels.length && !drag) return;
    const red = world.nightK > 0.5 ? 'rgba(236,88,68,' : 'rgba(176,36,30,';
    ctx.save();
    ctx.strokeStyle = red + '0.8)'; ctx.lineWidth = 1.4; ctx.setLineDash([7, 9]); ctx.lineDashOffset = -world.t * 16;
    let low = null;
    for (const e of sels) {
      const c = world.centerOf(e), r = 40 * Math.sqrt(e.sc || 1) + 6;
      ctx.beginPath(); ctx.arc(c[0], c[1], r, 0, Math.PI * 2); ctx.stroke();
      if (!low || c[1] + r > low[1]) low = [c[0], c[1] + r, e];
    }
    if (drag && drag.type === 'box') {                     // 正在拉的框
      const x = Math.min(drag.x0, drag.x1), y = Math.min(drag.y0, drag.y1), bw = Math.abs(drag.x1 - drag.x0), bh = Math.abs(drag.y1 - drag.y0);
      ctx.fillStyle = red + '0.06)'; ctx.fillRect(x, y, bw, bh); ctx.strokeRect(x, y, bw, bh);
    }
    ctx.setLineDash([]);
    if (low) {
      const e = low[2];
      ctx.font = '12px ' + MS.FONT_TEXT; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = red + '0.92)';
      ctx.fillText(sels.length > 1 ? '已选 ' + sels.length + ' 样 · 拖动移位 · 滚轮调远近' : (e.ch || '') + ' · 拖动移位 · 滚轮调远近 ' + Math.round((e.sc || 1) * 100) + '%', clamp(low[0], 120, state.W - 120), Math.min(state.H - 20, low[1] + 7));
    }
    ctx.restore();
  }
  function zoomSel(d) {
    const last = undo[undo.length - 1], now = performance.now(), k = Math.exp(-d * 0.0012);
    if (last && last.scale && now - last.at < 1200 && last.list.length === sels.length && last.list.every((m, i) => m[0] === sels[i])) last.at = now;   // 一口气滚的算一步
    else pushUndo({ scale: true, list: sels.map((e) => [e, e.sc || 1]), at: now });
    for (const e of sels) e.sc = clamp((e.sc || 1) * k, 0.3, 2.6);
    world.resort();
  }
  MS.select = (e) => { sels = e ? (Array.isArray(e) ? e.slice() : [e]) : []; };
  MS.selected = () => sels.slice();
  MS.zoom = (d) => { if (sels.length) zoomSel(d); };
  /* 框选开关：开着时在纸上拖是拉框，不是落墨（不开也可以按住 Alt 拖） */
  $('btn-box').addEventListener('click', () => { state.box = !state.box; press($('btn-box'), state.box); document.body.classList.toggle('boxing', state.box); });

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
    wake(); setAuto(false); Eggs.stop(true); sels = []; drag = null;
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
  window.addEventListener('wheel', (e) => {
    const d = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * (e.deltaMode ? 30 : 1);
    if (Scroll.active) { e.preventDefault(); hideHint(); Scroll.wheel(d); }
    else if (sels.length && !guideOn) { e.preventDefault(); zoomSel(d); }                         // 首页：选中了一个物象，滚轮推远拉近
  }, { passive: false });

  /* 第一次进来蒙一层引导：蒙版上给真实的按键开窗，每个键拉一条引线到一句说明。只出现一次（记在本机） */
  const guideEl = $('guide'), guideSvg = $('guide-svg'), GUIDE = 'ciyuan.guide2';     // 引导添了新内容，换个名字让它再出现一次
  const TIPS = {
    'btn-scroll': '把一篇古文演成手卷，补上缺的字，画才往下走',
    'btn-auto': '它自己取《声律启蒙》写成画；你一动笔它就停',
    'btn-trace': '字先从楷书退回甲骨文，再化形',
    'btn-hand': '手写：在纸上写一个字，停笔即认',
    'btn-pinyin': '拼音：直接敲 shan、yue、long 出字',
    'btn-sound': '声音：古琴、古筝、琵琶、笛箫',
    'btn-shot': '存一张画'
  };
  let guideOn = true;
  try { guideOn = localStorage.getItem(GUIDE) !== '1'; } catch (err) { /* 存不了就每次都引导一下 */ }
  function layoutGuide() {
    if (!guideOn) return;
    const W = state.W, H = state.H, NS = 'http://www.w3.org/2000/svg';
    const el = (tag, attrs, text) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (text != null) n.textContent = text; return n; };
    const box = (node, pad) => { const r = node.getBoundingClientRect(); return { x: r.left - pad, y: r.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 }; };
    const rr = (b, r) => 'M' + (b.x + r) + ' ' + b.y + 'h' + (b.w - 2 * r) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + r + 'v' + (b.h - 2 * r) + 'a' + r + ' ' + r + ' 0 0 1 ' + -r + ' ' + r + 'h' + -(b.w - 2 * r) + 'a' + r + ' ' + r + ' 0 0 1 ' + -r + ' ' + -r + 'v' + -(b.h - 2 * r) + 'a' + r + ' ' + r + ' 0 0 1 ' + r + ' ' + -r + 'z';
    guideSvg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    guideSvg.textContent = '';
    const tools = box(document.querySelector('.tools'), 9), dockB = box($('chars'), 9), side = box($('side'), 9);
    const holes = [tools, dockB, side].filter((b) => b.w > 30 && b.h > 20);
    guideSvg.appendChild(el('path', { class: 'veil', 'fill-rule': 'evenodd', d: 'M0 0H' + W + 'V' + H + 'H0Z' + holes.map((b) => rr(b, 14)).join('') }));
    for (const b of holes) guideSvg.appendChild(el('path', { class: 'frame', d: rr(b, 14) }));
    const lead = (pts) => { guideSvg.appendChild(el('polyline', { class: 'lead', points: pts.join(' ') })); guideSvg.appendChild(el('circle', { class: 'dot', cx: pts[0], cy: pts[1], r: 2.8 })); };
    const say = (x, y, anchor, name, text) => {
      const t = el('text', { x, y, 'text-anchor': anchor, 'dominant-baseline': 'middle' });
      if (name) { const k = el('tspan', { class: 'k' }, name + '　'); t.appendChild(k); }
      t.appendChild(document.createTextNode(text));
      guideSvg.appendChild(t);
      return t;
    };
    // 工具钮：分三区（看卷 · 落字的法子 · 声与影），每区一块淡底、一个小题。
    // 说明不排成齐平的一列，而是各自贴着自己那条引线，自左上往右下错落成阶梯；引线互不相交
    const narrow = W < 760, row = narrow ? 21 : 26;
    const rectOf = (id) => { const b = $(id); return b && b.offsetParent ? b.getBoundingClientRect() : null; };
    let y = tools.y + tools.h + (narrow ? 8 : 12);
    for (const [cap, ids] of [['看卷', ['btn-scroll']], ['落字的法子', ['btn-auto', 'btn-trace', 'btn-hand', 'btn-pinyin']], ['声与影', ['btn-sound', 'btn-shot']]]) {
      const before = guideSvg.lastChild, texts = [], yCap = y + row * 0.62;
      y += row * 1.5;
      for (const id of ids) {
        const r = rectOf(id); if (!r) continue;
        const bx = r.left + r.width / 2, tip = narrow ? TIPS[id].replace(/[；，].*$/, '') : TIPS[id];
        const left = bx > tip.length * (narrow ? 12 : 14) + 20;             // 左边放得下就往左写，放不下往右
        lead([bx, r.bottom + 3, bx, y, bx + (left ? -7 : 7), y]);
        texts.push(say(bx + (left ? -12 : 12), y, left ? 'end' : 'start', '', tip));
        y += row;
      }
      if (!texts.length) continue;
      let x0 = 1e9, x1 = -1e9;
      for (const t of texts) { const b = t.getBBox(); x0 = Math.min(x0, b.x); x1 = Math.max(x1, b.x + b.width); }
      const zone = { x: x0 - 14, y: yCap - row * 0.62, w: x1 - x0 + 28, h: y - row * 0.42 - (yCap - row * 0.62) };
      guideSvg.insertBefore(el('path', { class: 'zone', d: rr(zone, 10) }), before.nextSibling);
      guideSvg.appendChild(el('text', { class: 'cap', x: x0, y: yCap, 'dominant-baseline': 'middle' }, cap));
      y += narrow ? 8 : 12;
    }
    // 字钮
    const dx = dockB.x + dockB.w / 2, dy = dockB.y - 34;
    lead([dx, dockB.y - 3, dx, dy + 12]);
    say(dx, dy, 'middle', narrow ? '' : '字钮', narrow ? '点字落笔 · 按住往上拖到画里 · 长按清除' : '点一下落字 · 按住不放拖到画里，松手处落笔 · 右键清掉它化出的东西 · 末一组「四时」改整幅画');
    // 左下角：撤销与图层
    if (side.w > 30) {
      const sx = side.x + side.w / 2, sy = Math.min(side.y, dockB.y) - (narrow ? 22 : 64);
      lead([sx, side.y - 3, sx, sy + 12]);
      say(Math.max(12, side.x + 4), sy, 'start', '', narrow ? '撤销 · 固化 · 框选' : '撤销（Ctrl+Z）· 固化：上层压进底层锁住 · 框选：拉框选中几样');
    }
    // 画面：点选物象，滚轮调远近
    const cx = W * (narrow ? 0.2 : 0.16), cy = Math.min(H * 0.56, dockB.y - 150);
    guideSvg.appendChild(el('circle', { class: 'ring', cx, cy, r: 30 }));
    lead([cx + 30, cy, cx + 58, cy]);
    if (narrow) say(cx + 64, cy, 'start', '', '点一下选中 · 拖动移位 · 滚轮调远近');
    else { say(cx + 64, cy - 10, 'start', '画里的东西', '点一下选中，或框选几样'); say(cx + 64, cy + 11, 'start', '', '拖动移位 · 滚轮推远拉近'); }       // 折成两行，别压到「开始」
  }
  if (guideOn) { guideEl.classList.add('show'); layoutGuide(); setTimeout(layoutGuide, 400); setTimeout(layoutGuide, 1800); }
  window.addEventListener('resize', layoutGuide);
  function closeGuide() {
    if (!guideOn) return;
    guideOn = false; guideEl.classList.remove('show');
    try { localStorage.setItem(GUIDE, '1'); } catch (err) { /* 同上 */ }
    wake();                                               // 关蒙版这一下就是手势：声音从这里开始
    if (state.wantAuto && !Scroll.active) { setAuto(true); auto.timer = 1.4; }
    ime.focus({ preventScroll: true });
  }
  guideEl.addEventListener('click', closeGuide);          // 点哪儿都行
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
    if (sels.length && !Scroll.active) { const keep = sels; sels = []; tick(0.001); sels = keep; }   // 别把选中的圈拍进去
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
    pick = null; drag = null;
    state.sx = e.clientX; state.sy = e.clientY;
    if (!Scroll.active && !e.shiftKey && e.button === 0) {
      const hit = world.hit(e.clientX, e.clientY);
      if (hit && sels.indexOf(hit) >= 0) {                 // 按在选中的上面：拖动，一起挪位
        drag = { type: 'move', x: e.clientX, y: e.clientY, hit, moved: false, from: sels.map((q) => [q, q.ox || 0, q.oy || 0]) };
        return;
      }
      if (state.box || e.altKey) { drag = { type: 'box', x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY }; return; }   // 框选：拉一个框
      if (hit) { pick = hit; return; }                     // 按在一个物象上，先不落墨——抬手时还没拖开，就是点选它
      sels = [];                                           // 点在空处：放开选中的
    }
    firstTouch(e.clientX, e.clientY, sm, e.shiftKey);
  });
  function firstTouch(x, y, sm, shift) {
    if (sm === 'pan') { /* 拖的是卷子，不落墨 */ }
    else if (shift && !Scroll.active) splash(x, y);
    else if (state.writing) Hand.down(x, y);
    else {
      fluid.splat(x, y, 0, 0, PIG[state.ink], 15);
      Audio.play('ink', { i: Math.round((1 - y / state.H) * 9), pan: (x / state.W * 2 - 1) * 0.7 });
    }
  }
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
    if (drag && state.down) {
      if (drag.type === 'box') { drag.x1 = x; drag.y1 = y; }
      else if (drag.moved || Math.hypot(x - state.sx, y - state.sy) > 5) {
        drag.moved = true;
        for (const q of sels) world.nudge(q, x - drag.x, y - drag.y);
        drag.x = x; drag.y = y;
      }
      lastX = x; lastY = y; lastT = t; return;
    }
    if (pick && state.down) {                              // 按在物象上却拖开了：那是落笔，不是点选
      if (Math.hypot(x - state.sx, y - state.sy) < 7) { lastX = x; lastY = y; lastT = t; return; }
      pick = null; firstTouch(state.sx, state.sy, '', false);
    }
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
    if (drag && state.down) {
      if (drag.type === 'move') {
        if (drag.moved) pushUndo({ move: drag.from });
        else sels = sels.filter((q) => q !== drag.hit);    // 没拖：点一下选中的，是放开它
      } else if (Math.abs(drag.x1 - drag.x0) < 6 && Math.abs(drag.y1 - drag.y0) < 6) { const h = world.hit(drag.x1, drag.y1); sels = h ? [h] : []; }
      else sels = world.inBox(drag.x0, drag.y0, drag.x1, drag.y1);
      Audio.play('stage', { idx: 1 });
      drag = null; state.down = false; state.noInk = false; state.writing = false; return;
    }
    if (pick && state.down) { sels = [pick]; pick = null; Audio.play('stage', { idx: 1 }); state.down = false; state.noInk = false; state.writing = false; return; }
    pick = null;
    const traced = Scroll.active && Scroll.pointerUp();
    if (traced) Hand.cancel(); else Hand.up();          // 这一笔是在描古字：不必再当手写去认
    state.down = false; state.noInk = false; state.writing = false;
  };
  /* 手写判定的结果 */
  Hand.onCommit = (ch, cx, cy, pts) => {
    wake();
    if (Scroll.active) { if (!Scroll.answer(ch, 'hand', pts)) Hand.onReject(Hand.strokes.map((s) => s.p)); return; }
    yieldAuto();
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
  /* 拟声（内置拼音）：只认首页能活的字。字母进缓冲，空格 / 数字选字，整拼唯一时自动落字 */
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
    pyClear(); wake(); yieldAuto(); commit(ch, x, y);
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
    if (n) { wake(); yieldAuto(); }
  }
  ime.addEventListener('compositionstart', () => { composing = true; });
  ime.addEventListener('compositionend', (e) => { composing = false; typed(e.data || ime.value); ime.value = ''; });
  ime.addEventListener('input', (e) => {
    if (composing || e.isComposing) return;
    typed(ime.value); ime.value = '';
  });
  window.addEventListener('keydown', (e) => {
    if (guideOn) { closeGuide(); if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); return; } }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 'z' || e.key === 'Z') && !Scroll.active) { e.preventDefault(); doUndo(); return; }   // 撤销
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!Scroll.active && sels.length && !py.buf) {
      if (e.key === 'Escape') { sels = []; return; }
      if (e.key === 'Delete') { const before = snap(); for (const q of sels) q.dying = true; sels = []; record(before); refreshDock(); e.preventDefault(); return; }
    }
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
    drawSel();
    Hand.draw(ctx, world);
    Glyphs.draw(ctx);
    if ((sideT -= dt) <= 0) { sideT = 0.5; refreshSide(); }
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
    if (state.wantAuto && !guideOn) { setAuto(true); auto.timer = 3.4; }      // 默认自在：题名化开之后，它就自己画起来
  };
  if (document.fonts && document.fonts.load) {
    Promise.race([document.fonts.load('30px "Ma Shan Zheng"', '词源'), new Promise((r) => setTimeout(r, 1200))]).then(start, start);
  } else start();
})();
