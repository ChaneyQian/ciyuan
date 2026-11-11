/* 词源 · fluid.js — 水墨流体（WebGL stable-fluids）
 * 染料贴图的三个通道分别是三种颜料的浓度：R=墨  G=朱  B=青。
 * 显示时按「减色」叠在宣纸上（白昼），或按「发光」叠在夜色上（夜）。
 * 以后做「世界风格切换」时，只需要替换 display 着色器即可（沙画 / 像素 / 皮影）。
 */
(function () {
  'use strict';
  const MS = (window.MS = window.MS || {});

  const VERT = `
    precision highp float;
    attribute vec2 aPosition;
    varying vec2 vUv, vL, vR, vT, vB;
    uniform vec2 texelSize;
    void main () {
      vUv = aPosition * 0.5 + 0.5;
      vL = vUv - vec2(texelSize.x, 0.0);
      vR = vUv + vec2(texelSize.x, 0.0);
      vT = vUv + vec2(0.0, texelSize.y);
      vB = vUv - vec2(0.0, texelSize.y);
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }`;

  const FRAG = {
    clear: `
      precision mediump float;
      varying vec2 vUv;
      uniform sampler2D uTexture;
      uniform float value;
      void main () { gl_FragColor = value * texture2D(uTexture, vUv); }`,

    splat: `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uTarget;
      uniform float aspectRatio;
      uniform vec3 color;
      uniform vec2 point;
      uniform float radius;
      void main () {
        vec2 p = vUv - point;
        p.x *= aspectRatio;
        vec3 s = exp(-dot(p, p) / radius) * color;
        gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + s, 1.0);
      }`,

    // 泼水：把一圈之内的墨冲淡
    wash: `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uTarget;
      uniform float aspectRatio;
      uniform vec2 point;
      uniform float radius;
      uniform float strength;
      void main () {
        vec2 p = vUv - point;
        p.x *= aspectRatio;
        float k = 1.0 - strength * exp(-dot(p, p) / radius);
        gl_FragColor = vec4(texture2D(uTarget, vUv).xyz * k, 1.0);
      }`,

    advection: `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uVelocity;
      uniform sampler2D uSource;
      uniform vec2 texelSize;
      uniform vec2 dyeTexelSize;
      uniform float dt;
      uniform float dissipation;
      uniform float manual;
      vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
        vec2 st = uv / tsize - 0.5;
        vec2 iuv = floor(st);
        vec2 fuv = fract(st);
        vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
        vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
        vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
        vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
        return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
      }
      void main () {
        vec4 result;
        if (manual > 0.5) {
          vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
          result = bilerp(uSource, coord, dyeTexelSize);
        } else {
          vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
          result = texture2D(uSource, coord);
        }
        gl_FragColor = result / (1.0 + dissipation * dt);
      }`,

    divergence: `
      precision mediump float;
      varying highp vec2 vUv, vL, vR, vT, vB;
      uniform sampler2D uVelocity;
      void main () {
        float L = texture2D(uVelocity, vL).x;
        float R = texture2D(uVelocity, vR).x;
        float T = texture2D(uVelocity, vT).y;
        float B = texture2D(uVelocity, vB).y;
        vec2 C = texture2D(uVelocity, vUv).xy;
        if (vL.x < 0.0) L = -C.x;
        if (vR.x > 1.0) R = -C.x;
        if (vT.y > 1.0) T = -C.y;
        if (vB.y < 0.0) B = -C.y;
        gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
      }`,

    curl: `
      precision mediump float;
      varying highp vec2 vUv, vL, vR, vT, vB;
      uniform sampler2D uVelocity;
      void main () {
        float L = texture2D(uVelocity, vL).y;
        float R = texture2D(uVelocity, vR).y;
        float T = texture2D(uVelocity, vT).x;
        float B = texture2D(uVelocity, vB).x;
        gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
      }`,

    vorticity: `
      precision highp float;
      varying vec2 vUv, vL, vR, vT, vB;
      uniform sampler2D uVelocity;
      uniform sampler2D uCurl;
      uniform float curl;
      uniform float dt;
      void main () {
        float L = texture2D(uCurl, vL).x;
        float R = texture2D(uCurl, vR).x;
        float T = texture2D(uCurl, vT).x;
        float B = texture2D(uCurl, vB).x;
        float C = texture2D(uCurl, vUv).x;
        vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
        force /= length(force) + 0.0001;
        force *= curl * C;
        force.y *= -1.0;
        vec2 vel = texture2D(uVelocity, vUv).xy + force * dt;
        gl_FragColor = vec4(clamp(vel, -1000.0, 1000.0), 0.0, 1.0);
      }`,

    pressure: `
      precision mediump float;
      varying highp vec2 vUv, vL, vR, vT, vB;
      uniform sampler2D uPressure;
      uniform sampler2D uDivergence;
      void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        float d = texture2D(uDivergence, vUv).x;
        gl_FragColor = vec4((L + R + B + T - d) * 0.25, 0.0, 0.0, 1.0);
      }`,

    gradient: `
      precision mediump float;
      varying highp vec2 vUv, vL, vR, vT, vB;
      uniform sampler2D uPressure;
      uniform sampler2D uVelocity;
      void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        vec2 v = texture2D(uVelocity, vUv).xy - vec2(R - L, T - B);
        gl_FragColor = vec4(v, 0.0, 1.0);
      }`,

    // 宣纸 + 墨：水墨晕染（原始风格）
    display: `
      precision highp float;
      varying vec2 vUv, vL, vR, vT, vB;
      uniform sampler2D uDye;
      uniform vec2 resolution;
      uniform float night;
      uniform float time;
      uniform vec3 tint;
      float hash (vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }
      float vnoise (vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      void main () {
        vec2 px = gl_FragCoord.xy;
        // 纸纹：横竖帘纹 + 纤维 + 大块的旧色
        float fiber = vnoise(px * vec2(0.9, 0.035)) * 0.5 + vnoise(px * vec2(0.035, 0.9)) * 0.5;
        float grain = hash(px);
        float cloud = vnoise(px * 0.004) * 0.6 + vnoise(px * 0.013) * 0.4;
        float paperTex = (fiber - 0.5) * 0.045 + (grain - 0.5) * 0.028 + (cloud - 0.5) * 0.05;
        vec2 q = vUv - 0.5;
        float vig = smoothstep(0.35, 0.95, length(q * vec2(1.0, 0.85)));

        vec3 d = max(texture2D(uDye, vUv).rgb, 0.0);
        // 墨的边缘比中心深（水渍边），用浓度梯度近似
        vec3 dl = texture2D(uDye, vL).rgb, dr = texture2D(uDye, vR).rgb;
        vec3 dt = texture2D(uDye, vT).rgb, db = texture2D(uDye, vB).rgb;
        float tot = d.r + d.g + d.b;
        float edge = length(vec2((dr.r + dr.g + dr.b) - (dl.r + dl.g + dl.b),
                                 (dt.r + dt.g + dt.b) - (db.r + db.g + db.b)));
        float pool = 1.0 + 0.7 * edge / (0.4 + tot);
        // 墨吃进纸纤维：纸纹调制浓度
        float soak = 1.0 + ((fiber - 0.5) * 0.55 + (grain - 0.5) * 0.25) * mix(1.0, 0.12, night);
        d *= soak * pool;

        // 白昼：减色
        vec3 paper = vec3(0.925, 0.902, 0.848) * tint + paperTex;
        paper *= 1.0 - vig * 0.10;
        vec3 absorb = d.r * vec3(2.9, 2.85, 2.7)
                    + d.g * vec3(0.30, 2.60, 2.50)
                    + d.b * vec3(2.50, 1.05, 0.75);
        vec3 day = paper * exp(-absorb);

        // 夜：淡墨发光
        vec3 bg = vec3(0.030, 0.040, 0.055) + paperTex * 0.16;
        bg *= 1.0 - vig * 0.45;
        vec3 e = 1.0 - exp(-d * 2.2);
        vec3 nightc = bg + e.r * vec3(0.66, 0.68, 0.66)
                         + e.g * vec3(0.86, 0.22, 0.17)
                         + e.b * vec3(0.22, 0.70, 0.72);

        gl_FragColor = vec4(mix(day, nightc, night), 1.0);
      }`
  };

  function Fluid(canvas) {
    this.canvas = canvas;
    this.ok = false;
    this.night = 0;
    this.tint = [1, 1, 1];
    this.cfg = {
      simRes: 144, dyeRes: 720,
      velDissipation: 0.55, dyeDissipation: 0.14,
      pressureIters: 18, curl: 24
    };
    const opts = { alpha: false, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };
    let gl = canvas.getContext('webgl2', opts);
    const gl2 = !!gl;
    if (!gl) gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
    if (!gl) return;
    this.gl = gl;

    let halfFloat, linear = true;
    if (gl2) {
      gl.getExtension('EXT_color_buffer_float');
      gl.getExtension('EXT_color_buffer_half_float');
      halfFloat = gl.HALF_FLOAT;
    } else {
      const hf = gl.getExtension('OES_texture_half_float');
      if (!hf) return;
      halfFloat = hf.HALF_FLOAT_OES;
      linear = !!gl.getExtension('OES_texture_half_float_linear');
    }
    this.fmt = { internal: gl2 ? gl.RGBA16F : gl.RGBA, format: gl.RGBA, type: halfFloat };
    this.linear = linear;
    if (!this._supported()) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    const vs = this._shader(gl.VERTEX_SHADER, VERT);
    this.prog = {};
    for (const k in FRAG) this.prog[k] = this._program(vs, this._shader(gl.FRAGMENT_SHADER, FRAG[k]));
    this.t0 = performance.now();
    this.ok = true;
    this.resize();

    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.ok = false; });
    canvas.addEventListener('webglcontextrestored', () => location.reload());
  }

  Fluid.prototype._shader = function (type, src) {
    const gl = this.gl, s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
    return s;
  };
  Fluid.prototype._program = function (vs, fs) {
    const gl = this.gl, p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, fs);
    gl.bindAttribLocation(p, 0, 'aPosition');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(p));
    const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name); }
    return { p, u };
  };
  Fluid.prototype._supported = function () {
    const gl = this.gl, f = this.fmt;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, f.internal, 4, 4, 0, f.format, f.type, null);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fbo); gl.deleteTexture(tex);
    return ok;
  };
  Fluid.prototype._fbo = function (w, h, filter) {
    const gl = this.gl, f = this.fmt;
    gl.activeTexture(gl.TEXTURE0);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, f.internal, w, h, 0, f.format, f.type, null);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fbo, w, h, tx: 1 / w, ty: 1 / h };
  };
  Fluid.prototype._double = function (w, h, filter) {
    let a = this._fbo(w, h, filter), b = this._fbo(w, h, filter);
    return { get read() { return a; }, get write() { return b; }, swap() { const t = a; a = b; b = t; }, w, h, tx: 1 / w, ty: 1 / h };
  };
  Fluid.prototype._res = function (res) {
    const gl = this.gl;
    let ar = gl.drawingBufferWidth / gl.drawingBufferHeight;
    if (ar < 1) ar = 1 / ar;
    const min = Math.round(res), max = Math.round(res * ar);
    return gl.drawingBufferWidth > gl.drawingBufferHeight ? { w: max, h: min } : { w: min, h: max };
  };

  Fluid.prototype.resize = function () {
    if (!this.gl) return;
    const c = this.canvas, dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(2, Math.floor(c.clientWidth * dpr)), h = Math.max(2, Math.floor(c.clientHeight * dpr));
    if (c.width === w && c.height === h && this.vel) return;
    c.width = w; c.height = h;
    this.cssW = c.clientWidth; this.cssH = c.clientHeight;
    if (!this.ok) return;
    const gl = this.gl, s = this._res(this.cfg.simRes), d = this._res(this.cfg.dyeRes);
    const lin = this.linear ? gl.LINEAR : gl.NEAREST;
    // 窗口变了就重新铺纸（墨迹不保留，简单可靠）
    this.vel = this._double(s.w, s.h, lin);
    this.dye = this._double(d.w, d.h, lin);
    this.div = this._fbo(s.w, s.h, gl.NEAREST);
    this.curlT = this._fbo(s.w, s.h, gl.NEAREST);
    this.prs = this._double(s.w, s.h, gl.NEAREST);
  };

  Fluid.prototype._use = function (name) {
    const pr = this.prog[name];
    this.gl.useProgram(pr.p);
    return pr.u;
  };
  Fluid.prototype._blit = function (target) {
    const gl = this.gl;
    if (target) { gl.viewport(0, 0, target.w, target.h); gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo); }
    else { gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  };
  Fluid.prototype._bind = function (unit, fbo) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, fbo.tex);
    return unit;
  };

  /* x,y 为页面像素；vx,vy 为像素/秒；pig=[墨,朱,青] 浓度；r 为像素半径 */
  Fluid.prototype.splat = function (x, y, vx, vy, pig, r) {
    if (!this.ok) return;
    const gl = this.gl, W = this.cssW, H = this.cssH;
    const px = x / W, py = 1 - y / H, rad = (r / H) * (r / H);
    let u = this._use('splat');
    gl.uniform1f(u.aspectRatio, W / H);
    gl.uniform2f(u.point, px, py);
    gl.uniform1f(u.radius, rad);
    if (vx || vy) {
      gl.uniform1i(u.uTarget, this._bind(0, this.vel.read));
      gl.uniform3f(u.color, vx * this.vel.w / W, -vy * this.vel.h / H, 0);
      this._blit(this.vel.write); this.vel.swap();
    }
    if (pig && (pig[0] || pig[1] || pig[2])) {
      gl.uniform1i(u.uTarget, this._bind(0, this.dye.read));
      gl.uniform3f(u.color, pig[0], pig[1], pig[2]);
      this._blit(this.dye.write); this.dye.swap();
    }
  };

  /* 泼水：冲淡墨色并向外推开 */
  Fluid.prototype.wash = function (x, y, r, strength) {
    if (!this.ok) return;
    const gl = this.gl, W = this.cssW, H = this.cssH;
    const u = this._use('wash');
    gl.uniform1f(u.aspectRatio, W / H);
    gl.uniform2f(u.point, x / W, 1 - y / H);
    gl.uniform1f(u.radius, (r / H) * (r / H));
    gl.uniform1f(u.strength, strength);
    gl.uniform1i(u.uTarget, this._bind(0, this.dye.read));
    this._blit(this.dye.write); this.dye.swap();
  };

  /* 整体褪色（「空」字） */
  Fluid.prototype.fade = function (k) {
    if (!this.ok) return;
    const gl = this.gl, u = this._use('clear');
    gl.uniform1i(u.uTexture, this._bind(0, this.dye.read));
    gl.uniform1f(u.value, k);
    this._blit(this.dye.write); this.dye.swap();
  };

  Fluid.prototype.step = function (dt) {
    if (!this.ok) return;
    const gl = this.gl, c = this.cfg, vel = this.vel;
    gl.disable(gl.BLEND);
    let u = this._use('curl');
    gl.uniform2f(u.texelSize, vel.tx, vel.ty);
    gl.uniform1i(u.uVelocity, this._bind(0, vel.read));
    this._blit(this.curlT);

    u = this._use('vorticity');
    gl.uniform2f(u.texelSize, vel.tx, vel.ty);
    gl.uniform1i(u.uVelocity, this._bind(0, vel.read));
    gl.uniform1i(u.uCurl, this._bind(1, this.curlT));
    gl.uniform1f(u.curl, c.curl);
    gl.uniform1f(u.dt, dt);
    this._blit(vel.write); vel.swap();

    u = this._use('divergence');
    gl.uniform2f(u.texelSize, vel.tx, vel.ty);
    gl.uniform1i(u.uVelocity, this._bind(0, vel.read));
    this._blit(this.div);

    u = this._use('clear');
    gl.uniform1i(u.uTexture, this._bind(0, this.prs.read));
    gl.uniform1f(u.value, 0.8);
    this._blit(this.prs.write); this.prs.swap();

    u = this._use('pressure');
    gl.uniform2f(u.texelSize, vel.tx, vel.ty);
    gl.uniform1i(u.uDivergence, this._bind(0, this.div));
    for (let i = 0; i < c.pressureIters; i++) {
      gl.uniform1i(u.uPressure, this._bind(1, this.prs.read));
      this._blit(this.prs.write); this.prs.swap();
    }

    u = this._use('gradient');
    gl.uniform2f(u.texelSize, vel.tx, vel.ty);
    gl.uniform1i(u.uPressure, this._bind(0, this.prs.read));
    gl.uniform1i(u.uVelocity, this._bind(1, vel.read));
    this._blit(vel.write); vel.swap();

    u = this._use('advection');
    gl.uniform2f(u.texelSize, vel.tx, vel.ty);
    gl.uniform2f(u.dyeTexelSize, vel.tx, vel.ty);
    gl.uniform1f(u.manual, this.linear ? 0 : 1);
    gl.uniform1i(u.uVelocity, this._bind(0, vel.read));
    gl.uniform1i(u.uSource, this._bind(0, vel.read));
    gl.uniform1f(u.dt, dt);
    gl.uniform1f(u.dissipation, c.velDissipation);
    this._blit(vel.write); vel.swap();

    gl.uniform2f(u.dyeTexelSize, this.dye.tx, this.dye.ty);
    gl.uniform1i(u.uVelocity, this._bind(0, vel.read));
    gl.uniform1i(u.uSource, this._bind(1, this.dye.read));
    gl.uniform1f(u.dissipation, c.dyeDissipation);
    this._blit(this.dye.write); this.dye.swap();
  };

  Fluid.prototype.render = function () {
    if (!this.ok) return;
    const gl = this.gl, u = this._use('display');
    gl.uniform2f(u.texelSize, this.dye.tx, this.dye.ty);
    gl.uniform2f(u.resolution, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform1f(u.night, this.night);
    gl.uniform1f(u.time, (performance.now() - this.t0) / 1000);
    gl.uniform3f(u.tint, this.tint[0], this.tint[1], this.tint[2]);
    gl.uniform1i(u.uDye, this._bind(0, this.dye.read));
    this._blit(null);
  };

  MS.Fluid = Fluid;
})();
